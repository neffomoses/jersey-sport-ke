<?php
header('Content-Type: application/json; charset=utf-8');

function json_response($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function load_dotenv($path = null) {
    $path = $path ?: __DIR__ . '/.env';
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        [$key, $value] = $parts;
        $key = trim($key);
        $value = trim($value);

        if (($value[0] ?? '') === '"' && substr($value, -1) === '"') {
            $value = substr($value, 1, -1);
        }
        if (($value[0] ?? '') === "'" && substr($value, -1) === "'") {
            $value = substr($value, 1, -1);
        }

        putenv("{$key}={$value}");
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
}

function safe_string($value) {
    return trim((string) ($value ?? ''));
}

function format_ksh($amount) {
    $num = is_numeric($amount) ? (float) $amount : 0;
    return 'KSH ' . number_format($num, 0, '.', ',');
}

load_dotenv();

$data = $_POST;
$name = safe_string($data['name'] ?? '');
$email = safe_string($data['email'] ?? '');
$phone = safe_string($data['phone'] ?? '');
$message = safe_string($data['message'] ?? '');
$itemsRaw = safe_string($data['items'] ?? '');
$totalRaw = safe_string($data['total'] ?? '');
$paymentOption = safe_string($data['payment_option'] ?? 'full');
$depositRaw = safe_string($data['deposit'] ?? '');

if ($name === '' || $email === '' || $phone === '' || $itemsRaw === '') {
    json_response(400, ['success' => false, 'message' => 'Missing required fields.']);
}

$items = json_decode($itemsRaw, true);
if (!is_array($items)) {
    json_response(400, ['success' => false, 'message' => 'Invalid cart payload.']);
}

if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
    require_once __DIR__ . '/api/abandonment_db.php';
    $recoveryDb = abandonment_db();
    if ($recoveryDb) {
        $suppress = $recoveryDb->prepare("UPDATE abandoned_carts SET status = 'converted' WHERE email = ? AND status = 'pending'");
        if ($suppress) {
            $suppress->bind_param('s', $email);
            $suppress->execute();
            $suppress->close();
        }
    }
}

$total = is_numeric($totalRaw) ? (float) $totalRaw : 0.0;
$computedTotal = 0.0;
foreach ($items as $item) {
    $unitPrice = isset($item['unit_price']) ? (float) $item['unit_price'] : 0.0;
    $qty = isset($item['qty']) ? max(1, (int) $item['qty']) : 1;
    $computedTotal += $unitPrice * $qty;
}
if ($computedTotal > 0) {
    $total = $computedTotal;
}

$ownerEmail = getenv('OWNER_EMAIL') ?: 'info@jerseysportke.fit';
$subject = 'New jersey order from ' . $name;

$printedNames = [];
$deliveryLocations = [];
foreach ($items as $item) {
    $printedNames[] = (string) ($item['printed_name'] ?? $item['player_name'] ?? 'N/A');
    $deliveryLocations[] = (string) ($item['delivery_location'] ?? 'N/A');
}

$itemRows = '';
foreach ($items as $index => $item) {
    $nameValue = (string) ($item['name'] ?? 'Jersey');
    $sizeValue = (string) ($item['size'] ?? 'N/A');
    $printedValue = (string) ($item['printed_name'] ?? $item['player_name'] ?? 'N/A');
    $locationValue = (string) ($item['delivery_location'] ?? 'N/A');
    $qty = isset($item['qty']) ? max(1, (int) $item['qty']) : 1;
    $unitPrice = isset($item['unit_price']) ? (float) $item['unit_price'] : 0.0;
    $lineTotal = $unitPrice * $qty;
    $notes = (string) ($item['notes'] ?? '');

    $itemRows .= '<tr style="border-bottom:1px solid #eee;">';
    $itemRows .= '<td>' . htmlspecialchars($nameValue) . '</td>';
    $itemRows .= '<td align="center">' . htmlspecialchars($sizeValue) . '</td>';
    $itemRows .= '<td align="center">' . htmlspecialchars($printedValue) . '</td>';
    $itemRows .= '<td align="center">' . htmlspecialchars($locationValue) . '</td>';
    $itemRows .= '<td align="center">' . $qty . '</td>';
    $itemRows .= '<td align="right">' . htmlspecialchars(format_ksh($unitPrice)) . '</td>';
    $itemRows .= '<td align="right">' . htmlspecialchars(format_ksh($lineTotal)) . '</td>';
    $itemRows .= '<td>' . nl2br(htmlspecialchars($notes)) . '</td>';
    $itemRows .= '</tr>';
}

$htmlBody = <<<'HTML'
<html>
  <body style="font-family:Arial,Helvetica,sans-serif; color:#222; line-height:1.5;">
    <h2>New Jersey Order</h2>
    <p><strong>Customer:</strong> %CUSTOMER_NAME%</p>
    <p><strong>Email:</strong> %CUSTOMER_EMAIL%</p>
    <p><strong>Phone:</strong> %CUSTOMER_PHONE%</p>
    <p><strong>Delivery notes:</strong><br>%DELIVERY_NOTES%</p>
    <p><strong>Name(s) to print:</strong> %PRINTED_NAMES%</p>
    <p><strong>Delivery location(s):</strong> %DELIVERY_LOCATIONS%</p>
    <h3>Items</h3>
    <table style="width:100%; border-collapse:collapse;">
      <thead>
        <tr>
          <th align="left">Item</th>
          <th>Size</th>
          <th>Name to print</th>
          <th>Delivery location</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Line total</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        %ITEM_ROWS%
      </tbody>
    </table>
    <p style="font-size:1.1rem;"><strong>Total:</strong> %TOTAL%</p>
    <p><strong>Payment option:</strong> %PAYMENT_OPTION%</p>
    <p><strong>Deposit:</strong> %DEPOSIT%</p>
    <p><strong>Important:</strong> This order includes jersey size, printed name, delivery destination, customer phone, and customer email.</p>
    <hr>
    <p>Order received at %DATE_TIME%</p>
  </body>
</html>
HTML;

$htmlBody = str_replace('%CUSTOMER_NAME%', htmlspecialchars($name), $htmlBody);
$htmlBody = str_replace('%CUSTOMER_EMAIL%', htmlspecialchars($email), $htmlBody);
$htmlBody = str_replace('%CUSTOMER_PHONE%', htmlspecialchars($phone), $htmlBody);
$htmlBody = str_replace('%DELIVERY_NOTES%', nl2br(htmlspecialchars($message)), $htmlBody);
$htmlBody = str_replace('%PRINTED_NAMES%', htmlspecialchars(implode(' | ', $printedNames)), $htmlBody);
$htmlBody = str_replace('%DELIVERY_LOCATIONS%', htmlspecialchars(implode(' | ', $deliveryLocations)), $htmlBody);
$htmlBody = str_replace('%ITEM_ROWS%', $itemRows, $htmlBody);
$htmlBody = str_replace('%TOTAL%', htmlspecialchars(format_ksh($total)), $htmlBody);
$htmlBody = str_replace('%PAYMENT_OPTION%', htmlspecialchars($paymentOption ?: 'full'), $htmlBody);
$htmlBody = str_replace('%DEPOSIT%', htmlspecialchars($depositRaw !== '' ? format_ksh($depositRaw) : 'None'), $htmlBody);
$htmlBody = str_replace('%DATE_TIME%', htmlspecialchars(date('Y-m-d H:i:s')), $htmlBody);

$headers = [
    'MIME-Version: 1.0',
    'Content-type: text/html; charset=utf-8',
    'From: Jersey Sport <no-reply@jerseysport.local>',
    'Reply-To: ' . $email,
];

$mailSent = false;

$smtpHost = getenv('SMTP_HOST') ?: getenv('MAIL_HOST');
if ($smtpHost && is_readable(__DIR__ . '/vendor/autoload.php')) {
    try {
        require_once __DIR__ . '/vendor/autoload.php';
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $smtpPort = getenv('SMTP_PORT') ?: getenv('MAIL_PORT') ?: 587;
        $smtpUser = getenv('SMTP_USER') ?: getenv('MAIL_USER') ?: '';
        $smtpPass = getenv('SMTP_PASS') ?: getenv('MAIL_PASS') ?: '';
        $smtpSecure = getenv('SMTP_SECURE') ?: getenv('MAIL_ENCRYPTION') ?: '';

        $mail->isSMTP();
        $mail->Host = $smtpHost;
        $mail->SMTPAuth = $smtpUser !== '';
        if ($smtpUser !== '') {
            $mail->Username = $smtpUser;
            $mail->Password = $smtpPass;
        }
        if ($smtpSecure !== '') {
            $mail->SMTPSecure = strtolower($smtpSecure);
        }
        $mail->Port = (int) $smtpPort;
        $mail->SMTPAutoTLS = true;
        $mail->setFrom(getenv('MAIL_FROM_ADDRESS') ?: 'no-reply@jerseysport.local', getenv('MAIL_FROM_NAME') ?: 'Jersey Sport');
        $mail->addAddress($ownerEmail);
        $mail->addReplyTo($email);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = strip_tags($htmlBody);
        $mail->send();
        $mailSent = true;
    } catch (Throwable $e) {
        $mailSent = false;
        file_put_contents(__DIR__ . '/email.log', date('c') . ' | SMTP error: ' . $e->getMessage() . "\n", FILE_APPEND | LOCK_EX);
    }
} else {
    try {
        $mailSent = mail($ownerEmail, $subject, $htmlBody, implode("\r\n", $headers));
    } catch (Throwable $e) {
        $mailSent = false;
        file_put_contents(__DIR__ . '/email.log', date('c') . ' | mail() error: ' . $e->getMessage() . "\n", FILE_APPEND | LOCK_EX);
    }
}

$logLine = date('c') . " | name={$name} | email={$email} | phone={$phone} | total={$total}\n";
file_put_contents(__DIR__ . '/orders.log', $logLine . 'items=' . $itemsRaw . "\n", FILE_APPEND | LOCK_EX);

$jsonResponse = [
    'success' => true,
    'email_sent' => $mailSent,
    'message' => 'Order accepted.'
];

if (!$mailSent) {
    file_put_contents(__DIR__ . '/email.log', date('c') . " | email failed to {$ownerEmail} | customer={$name} | email={$email} | phone={$phone}\n" . 'items=' . $itemsRaw . "\n", FILE_APPEND | LOCK_EX);
    $jsonResponse['success'] = true;
    $jsonResponse['message'] = 'Order received but email sending failed.';
}

json_response(200, $jsonResponse);
?>
