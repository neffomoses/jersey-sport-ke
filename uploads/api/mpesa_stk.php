<?php
// M-Pesa STK Push endpoint (Safaricom Daraja integration)
// Expects POST: phone, amount, account_reference, transaction_desc, items
// Configure credentials in .env: MPESA_ENV (sandbox|production), MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL

header('Content-Type: application/json; charset=utf-8');

function json_response($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

// load simple .env if present
function load_dotenv($path = null) {
    $path = $path ?: __DIR__ . '/../.env';
    if (!is_readable($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) continue;
        [$k, $v] = $parts;
        $k = trim($k);
        $v = trim($v);
        if (($v[0] ?? '') === '"' && substr($v, -1) === '"') $v = substr($v, 1, -1);
        if (($v[0] ?? '') === "'" && substr($v, -1) === "'") $v = substr($v, 1, -1);
        putenv("$k=$v");
        $_ENV[$k] = $v;
        $_SERVER[$k] = $v;
    }
}
load_dotenv();

$env = getenv('MPESA_ENV') ?: 'sandbox';
$consumerKey = getenv('MPESA_CONSUMER_KEY') ?: '';
$consumerSecret = getenv('MPESA_CONSUMER_SECRET') ?: '';
$shortcode = getenv('MPESA_SHORTCODE') ?: '';
$passkey = getenv('MPESA_PASSKEY') ?: '';
$callbackUrl = getenv('MPESA_CALLBACK_URL') ?: ( (isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? 'example.com') . '/api/mpesa_callback.php' );

$phone = trim($_POST['phone'] ?? '');
$amount = trim($_POST['amount'] ?? '');
$accountReference = trim($_POST['account_reference'] ?? '');
$transactionDesc = trim($_POST['transaction_desc'] ?? 'Payment');
$items = $_POST['items'] ?? '';

if (!$phone || !$amount || !$shortcode || !$passkey || !$consumerKey || !$consumerSecret) {
    json_response(400, ['success' => false, 'message' => 'Missing configuration or required parameters']);
}

// Daraja URLs
if ($env === 'production') {
    $oauthUrl = 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    $stkUrl = 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
} else {
    $oauthUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    $stkUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
}

// Get access token
$ch = curl_init($oauthUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_USERPWD, $consumerKey . ':' . $consumerSecret);
curl_setopt($ch, CURLOPT_HTTPHEADER, [ 'Content-Type: application/json' ]);
$res = curl_exec($ch);
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($httpcode !== 200) {
    json_response(500, ['success' => false, 'message' => 'Failed to obtain OAuth token']);
}
$tok = json_decode($res, true);
$accessToken = $tok['access_token'] ?? null;
if (!$accessToken) json_response(500, ['success' => false, 'message' => 'Invalid OAuth response']);

// Prepare STK payload
$timestamp = date('YmdHis');
$password = base64_encode($shortcode . $passkey . $timestamp);

$body = [
    'BusinessShortCode' => $shortcode,
    'Password' => $password,
    'Timestamp' => $timestamp,
    'TransactionType' => 'CustomerPayBillOnline',
    'Amount' => (int)$amount,
    'PartyA' => $phone,
    'PartyB' => $shortcode,
    'PhoneNumber' => $phone,
    'CallBackURL' => $callbackUrl,
    'AccountReference' => $accountReference,
    'TransactionDesc' => $transactionDesc
];

$ch = curl_init($stkUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [ 'Content-Type: application/json', 'Authorization: Bearer ' . $accessToken ]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
$res2 = curl_exec($ch);
$httpcode2 = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$errno = curl_errno($ch);
$errstr = curl_error($ch);
curl_close($ch);

if ($errno) {
    file_put_contents(__DIR__ . '/../mpesa_errors.log', date('c') . " | curl_error: $errstr\n", FILE_APPEND | LOCK_EX);
    json_response(500, ['success' => false, 'message' => 'Network error when contacting M-Pesa']);
}

$resp = json_decode($res2, true);
// Save raw response for debugging
file_put_contents(__DIR__ . '/../mpesa_requests.log', date('c') . " | request=" . json_encode($body) . " | response=" . $res2 . "\n", FILE_APPEND | LOCK_EX);

if ($httpcode2 >= 200 && $httpcode2 < 300) {
    // Persist outgoing STK record to DB when possible
    $checkoutReqId = $resp['CheckoutRequestID'] ?? ($resp['ResponseDescription'] ?? null);
    try {
        $host = 'localhost';
        $user = 'root';
        $password = '';
        $database = 'jersey_sport';
        $mysqli = @new mysqli($host, $user, $password, $database);
        if ($mysqli && !$mysqli->connect_error) {
            $mysqli->set_charset('utf8mb4');
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

            $stmt = $mysqli->prepare('INSERT INTO mpesa_payments (checkout_request_id, merchant_request_id, phone, amount, account_reference, items, status, mpesa_response) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            if ($stmt) {
                $merchantReq = $resp['MerchantRequestID'] ?? null;
                $amt = is_numeric($body['Amount']) ? (float)$body['Amount'] : null;
                $itemsToStore = is_string($items) ? $items : json_encode($items);
                $respJson = json_encode($resp, JSON_UNESCAPED_UNICODE);
                $status = 'pending';
                $stmt->bind_param('ssssssss', $checkoutReqId, $merchantReq, $phone, $amt, $accountReference, $itemsToStore, $status, $respJson);
                $stmt->execute();
                $stmt->close();
            }
            $mysqli->close();
        }
    } catch (Exception $e) {
        file_put_contents(__DIR__ . '/../mpesa_errors.log', date('c') . " | DB write error: " . $e->getMessage() . "\n", FILE_APPEND | LOCK_EX);
    }

    // Success - return provider response to client
    json_response(200, ['success' => true, 'response' => $resp]);
}

json_response(500, ['success' => false, 'message' => 'M-Pesa rejected request', 'response' => $resp]);
