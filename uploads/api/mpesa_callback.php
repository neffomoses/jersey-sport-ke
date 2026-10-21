<?php
header('Content-Type: application/json; charset=utf-8');

function json_response($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
file_put_contents(__DIR__ . '/../mpesa_callbacks.log', date('c') . " | raw=" . $raw . "\n", FILE_APPEND | LOCK_EX);

$data = json_decode($raw, true);
if (!$data) {
    // Not JSON — respond 400
    json_response(400, ['success' => false, 'message' => 'Invalid JSON']);
}

// Expect STK callback under Body->stkCallback
$stk = $data['Body']['stkCallback'] ?? null;
if (!$stk) {
    json_response(200, ['success' => true, 'message' => 'No stkCallback present']);
}

$merchantRequestID = $stk['MerchantRequestID'] ?? null;
$checkoutRequestID = $stk['CheckoutRequestID'] ?? null;
$resultCode = $stk['ResultCode'] ?? null;
$resultDesc = $stk['ResultDesc'] ?? null;

// Extract metadata (amount, receipt, phone)
$amount = null;
$mpesaReceipt = null;
$transDate = null;
$phone = null;
if (!empty($stk['CallbackMetadata']['Item']) && is_array($stk['CallbackMetadata']['Item'])) {
    foreach ($stk['CallbackMetadata']['Item'] as $it) {
        $name = $it['Name'] ?? '';
        if ($name === 'Amount') $amount = $it['Value'];
        if ($name === 'MpesaReceiptNumber') $mpesaReceipt = $it['Value'];
        if ($name === 'TransactionDate') $transDate = $it['Value'];
        if ($name === 'PhoneNumber') $phone = $it['Value'];
    }
}

// Save callback into mpesa_payments record if exists
try {
    $host = 'localhost';
    $user = 'root';
    $password = '';
    $database = 'jersey_sport';
    $mysqli = @new mysqli($host, $user, $password, $database);
    if ($mysqli && !$mysqli->connect_error) {
        $mysqli->set_charset('utf8mb4');
        // ensure payments table exists
        $mysqli->query("CREATE TABLE IF NOT EXISTS mpesa_payments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            checkout_request_id VARCHAR(200) DEFAULT NULL,
            merchant_request_id VARCHAR(200) DEFAULT NULL,
            phone VARCHAR(40) DEFAULT NULL,
            amount DECIMAL(12,2) DEFAULT NULL,
            account_reference VARCHAR(120) DEFAULT NULL,
            items TEXT DEFAULT NULL,
            status VARCHAR(40) DEFAULT 'pending',
            receipt VARCHAR(120) DEFAULT NULL,
            mpesa_response LONGTEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NULL DEFAULT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        // attempt to find payment by checkout_request_id or merchant_request_id
        $foundId = null;
        if ($checkoutRequestID) {
            $q = $mysqli->prepare('SELECT id FROM mpesa_payments WHERE checkout_request_id = ? LIMIT 1');
            $q->bind_param('s', $checkoutRequestID);
            $q->execute();
            $q->bind_result($foundId);
            $q->fetch();
            $q->close();
        }
        if (!$foundId && $merchantRequestID) {
            $q = $mysqli->prepare('SELECT id FROM mpesa_payments WHERE merchant_request_id = ? LIMIT 1');
            $q->bind_param('s', $merchantRequestID);
            $q->execute();
            $q->bind_result($foundId);
            $q->fetch();
            $q->close();
        }

        // Update record or insert a new one
        $respJson = json_encode($data, JSON_UNESCAPED_UNICODE);
        if ($foundId) {
            $status = ($resultCode === 0) ? 'success' : 'failed';
            $stmt = $mysqli->prepare('UPDATE mpesa_payments SET status = ?, receipt = ?, amount = ?, phone = ?, mpesa_response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            if ($stmt) {
                $stmt->bind_param('ssddsi', $status, $mpesaReceipt, $amount, $phone, $respJson, $foundId);
                $stmt->execute();
                $stmt->close();
            }
        } else {
            // insert best-effort record
            $stmt = $mysqli->prepare('INSERT INTO mpesa_payments (checkout_request_id, merchant_request_id, phone, amount, status, receipt, mpesa_response) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $status = ($resultCode === 0) ? 'success' : 'failed';
            if ($stmt) {
                $stmt->bind_param('sssdsss', $checkoutRequestID, $merchantRequestID, $phone, $amount, $status, $mpesaReceipt, $respJson);
                $stmt->execute();
                $foundId = $stmt->insert_id;
                $stmt->close();
            }
        }

        // Try to match an order by phone + amount + recent time (best-effort)
        if ($phone && $amount) {
            $matchStmt = $mysqli->prepare('SELECT id, total, email FROM orders WHERE phone LIKE ? ORDER BY created_at DESC LIMIT 10');
            $likePhone = '%' . $phone . '%';
            if ($matchStmt) {
                $matchStmt->bind_param('s', $likePhone);
                $matchStmt->execute();
                $res = $matchStmt->get_result();
                while ($row = $res->fetch_assoc()) {
                    $orderId = $row['id'];
                    $orderTotal = floatval(str_replace(',', '', $row['total']));
                    // if exact match or within small difference, consider it the order
                    if (abs($orderTotal - floatval($amount)) < 1.0 || floatval($amount) < $orderTotal) {
                        // ensure orders table has payment_status and paid_at / deposit_amount
                        @mysqli_query($mysqli, "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(40) DEFAULT NULL");
                        @mysqli_query($mysqli, "ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP NULL DEFAULT NULL");

                        if (floatval($amount) >= $orderTotal) {
                            $upd = $mysqli->prepare('UPDATE orders SET payment_status = ?, deposit_amount = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?');
                            $statusVal = 'paid';
                            $depositStore = (string)$amount;
                            if ($upd) { $upd->bind_param('ssi', $statusVal, $depositStore, $orderId); $upd->execute(); $upd->close(); }
                        } else {
                            $upd = $mysqli->prepare('UPDATE orders SET payment_status = ?, deposit_amount = ? WHERE id = ?');
                            $statusVal = 'deposit_paid';
                            $depositStore = (string)$amount;
                            if ($upd) { $upd->bind_param('ssi', $statusVal, $depositStore, $orderId); $upd->execute(); $upd->close(); }
                        }

                        // append to orders.log
                        file_put_contents(__DIR__ . '/../orders.log', date('c') . " | mpesa_callback: matched order {$orderId} amount={$amount} receipt={$mpesaReceipt}\n", FILE_APPEND | LOCK_EX);

                        // send a confirmation email to site owner and customer (if email present) using PHPMailer when available
                        try {
                            // fetch order details
                            $ordStmt = $mysqli->prepare('SELECT customer_name, email, phone, items, total FROM orders WHERE id = ? LIMIT 1');
                            if ($ordStmt) {
                                $ordStmt->bind_param('i', $orderId);
                                $ordStmt->execute();
                                $ordRes = $ordStmt->get_result();
                                if ($ordRow = $ordRes->fetch_assoc()) {
                                    $custName = $ordRow['customer_name'];
                                    $custEmail = $ordRow['email'];
                                    $custPhone = $ordRow['phone'];
                                    $custItems = $ordRow['items'];
                                    $custTotal = $ordRow['total'];

                                    $owner = getenv('OWNER_EMAIL') ?: 'info@jerseysportke.fit';
                                    $subjectOwner = "Payment received for Order #{$orderId} | KSH {$amount}";
                                    $bodyOwner = "<html><body style=\"font-family:Arial,Helvetica,sans-serif;color:#222\">";
                                    $bodyOwner .= "<h2>Payment Received</h2>";
                                    $bodyOwner .= "<p><strong>Order ID:</strong> {$orderId}</p>";
                                    $bodyOwner .= "<p><strong>Customer:</strong> " . htmlspecialchars($custName) . "</p>";
                                    $bodyOwner .= "<p><strong>Email:</strong> " . htmlspecialchars($custEmail) . "</p>";
                                    $bodyOwner .= "<p><strong>Phone:</strong> " . htmlspecialchars($custPhone) . "</p>";
                                    $bodyOwner .= "<p><strong>Paid Amount:</strong> KSH " . htmlspecialchars((string)$amount) . "</p>";
                                    $bodyOwner .= "<p><strong>Mpesa Receipt:</strong> " . htmlspecialchars($mpesaReceipt) . "</p>";
                                    $bodyOwner .= "<h3>Order Items</h3>" . (is_string($custItems) ? ('<pre>' . htmlspecialchars($custItems) . '</pre>') : '');
                                    $bodyOwner .= "<p>Logged at " . date('Y-m-d H:i:s') . "</p>";
                                    $bodyOwner .= "</body></html>";

                                    $subjectCust = "Payment confirmation — Order #{$orderId}";
                                    $bodyCust = "<html><body style=\"font-family:Arial,Helvetica,sans-serif;color:#222\">";
                                    $bodyCust .= "<h2>Payment Received</h2>";
                                    $bodyCust .= "<p>Hi " . htmlspecialchars($custName) . ",</p>";
                                    $bodyCust .= "<p>We have received your payment of <strong>KSH " . htmlspecialchars((string)$amount) . "</strong> (Mpesa Receipt: <strong>" . htmlspecialchars($mpesaReceipt) . "</strong>) for Order <strong>#{$orderId}</strong>. Thank you!</p>";
                                    $bodyCust .= "<h3>Order Summary</h3>" . (is_string($custItems) ? ('<pre>' . htmlspecialchars($custItems) . '</pre>') : '');
                                    $bodyCust .= "<p>We will prepare and arrange delivery as per your order details.</p>";
                                    $bodyCust .= "<p>If you have questions, reply to this email or call us on the number listed on the site.</p>";
                                    $bodyCust .= "</body></html>";

                                    // Prefer PHPMailer SMTP if configured and available
                                    $smtpHost = getenv('SMTP_HOST') ?: getenv('MAIL_HOST');
                                    $vendorAutoload = __DIR__ . '/../vendor/autoload.php';
                                    $mailSentOwner = false;
                                    $mailSentCust = false;

                                    if ($smtpHost && is_readable($vendorAutoload)) {
                                        try {
                                            require_once $vendorAutoload;
                                            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

                                            $smtpPort = getenv('SMTP_PORT') ?: getenv('MAIL_PORT') ?: 587;
                                            $smtpUser = getenv('SMTP_USER') ?: getenv('MAIL_USER') ?: '';
                                            $smtpPass = getenv('SMTP_PASS') ?: getenv('MAIL_PASS') ?: '';
                                            $smtpSecureEnv = getenv('SMTP_SECURE') ?: getenv('MAIL_ENCRYPTION');

                                            $smtpPortInt = (int)$smtpPort;
                                            if ($smtpSecureEnv) {
                                                $smtpSecure = strtolower($smtpSecureEnv);
                                            } else {
                                                if ($smtpPortInt === 465) {
                                                    $smtpSecure = 'ssl';
                                                } elseif (in_array($smtpPortInt, [587, 2525], true)) {
                                                    $smtpSecure = 'tls';
                                                } else {
                                                    $smtpSecure = '';
                                                }
                                            }

                                            $mail->isSMTP();
                                            $mail->Host = $smtpHost;
                                            $mail->SMTPAuth = (bool)$smtpUser;
                                            if ($smtpUser) {
                                                $mail->Username = $smtpUser;
                                                $mail->Password = $smtpPass;
                                            }
                                            $mail->SMTPAutoTLS = true;
                                            if ($smtpSecure) $mail->SMTPSecure = $smtpSecure;
                                            $mail->Port = $smtpPortInt;

                                            if (strtolower(getenv('SMTP_ALLOW_SELF_SIGNED') ?: 'false') === 'true') {
                                                $mail->SMTPOptions = [
                                                    'ssl' => [
                                                        'verify_peer' => false,
                                                        'verify_peer_name' => false,
                                                        'allow_self_signed' => true,
                                                    ],
                                                ];
                                            }

                                            $from = getenv('MAIL_FROM_ADDRESS') ?: 'no-reply@jerseysport.local';
                                            $fromName = getenv('MAIL_FROM_NAME') ?: 'Jersey Sport';

                                            $mail->setFrom($from, $fromName);
                                            // Send to owner
                                            $mail->addAddress($owner);
                                            if ($custEmail) $mail->addReplyTo($custEmail);
                                            $mail->isHTML(true);
                                            $mail->Subject = $subjectOwner;
                                            $mail->Body = $bodyOwner;
                                            $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $bodyOwner));
                                            $mail->send();
                                            $mailSentOwner = true;

                                            // Send to customer (if present)
                                            if ($custEmail) {
                                                $mail->clearAddresses();
                                                $mail->clearReplyTos();
                                                $mail->addAddress($custEmail);
                                                $mail->addReplyTo($owner);
                                                $mail->Subject = $subjectCust;
                                                $mail->Body = $bodyCust;
                                                $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $bodyCust));
                                                $mail->send();
                                                $mailSentCust = true;
                                            }
                                        } catch (\Exception $e) {
                                            file_put_contents(__DIR__ . '/../email.log', date('c') . " | PHPMailer error: " . $e->getMessage() . "\n", FILE_APPEND | LOCK_EX);
                                        }
                                    } else {
                                        // fallback to mail()
                                        $headers = [];
                                        $headers[] = 'MIME-Version: 1.0';
                                        $headers[] = 'Content-type: text/html; charset=utf-8';
                                        $headers[] = 'From: Jersey Sport <no-reply@jerseysport.local>';
                                        if ($custEmail) $headers[] = 'Reply-To: ' . $custEmail;
                                        @mail($owner, $subjectOwner, $bodyOwner, implode("\r\n", $headers));
                                        if ($custEmail) {
                                            $custHeaders = $headers;
                                            $custHeaders[] = 'Reply-To: ' . $owner;
                                            @mail($custEmail, $subjectCust, $bodyCust, implode("\r\n", $custHeaders));
                                        }
                                    }
                                }
                                $ordStmt->close();
                            }
                        } catch (Exception $e) {
                            file_put_contents(__DIR__ . '/../mpesa_errors.log', date('c') . " | email error: " . $e->getMessage() . "\n", FILE_APPEND | LOCK_EX);
                        }
                        break;
                    }
                }
                $matchStmt->close();
            }
        }

        $mysqli->close();
    }
} catch (Exception $e) {
    file_put_contents(__DIR__ . '/../mpesa_errors.log', date('c') . " | callback DB error: " . $e->getMessage() . "\n", FILE_APPEND | LOCK_EX);
}

json_response(200, ['success' => true]);
