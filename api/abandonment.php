<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/abandonment_db.php';

function abandonment_response($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    abandonment_response(405, ['success' => false, 'message' => 'POST required']);
}

$email = strtolower(trim((string) ($_POST['email'] ?? '')));
$phone = trim((string) ($_POST['phone'] ?? ''));
$consent = filter_var($_POST['consent'] ?? false, FILTER_VALIDATE_BOOLEAN);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    abandonment_response(400, ['success' => false, 'message' => 'A valid email is required']);
}

$db = abandonment_db();
if (!$db) {
    abandonment_response(503, ['success' => false, 'message' => 'Reminder storage is unavailable']);
}

if (!$consent) {
    $stmt = $db->prepare("UPDATE abandoned_carts SET status = 'cancelled' WHERE email = ? AND status = 'pending'");
    if (!$stmt) {
        abandonment_response(500, ['success' => false, 'message' => 'Could not update reminder preference']);
    }
    $stmt->bind_param('s', $email);
    $ok = $stmt->execute();
    $stmt->close();
    abandonment_response($ok ? 200 : 500, ['success' => $ok]);
}

$itemsRaw = (string) ($_POST['items'] ?? '');
$items = json_decode($itemsRaw, true);
if (!is_array($items) || !$items) {
    abandonment_response(400, ['success' => false, 'message' => 'A non-empty cart is required']);
}

$url = trim((string) ($_POST['url'] ?? ''));
$parsedUrl = parse_url($url);
$requestHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
$urlHost = strtolower((string) ($parsedUrl['host'] ?? ''));
if (isset($parsedUrl['port'])) {
    $urlHost .= ':' . (int) $parsedUrl['port'];
}
$urlScheme = strtolower((string) ($parsedUrl['scheme'] ?? ''));
if (!in_array($urlScheme, ['http', 'https'], true) || !$urlHost || $urlHost !== $requestHost) {
    $url = ($requestHost ? 'https://' . $requestHost : '') . '/';
}

$stmt = $db->prepare("INSERT INTO abandoned_carts
    (email, phone, items, recovery_url, consent_at, scheduled_at, status, attempts, sent_at, last_error)
    VALUES (?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 'pending', 0, NULL, NULL)
    ON DUPLICATE KEY UPDATE phone = VALUES(phone), items = VALUES(items), recovery_url = VALUES(recovery_url),
    consent_at = NOW(), scheduled_at = DATE_ADD(NOW(), INTERVAL 1 HOUR), status = 'pending',
    attempts = 0, sent_at = NULL, last_error = NULL");

if (!$stmt) {
    abandonment_response(500, ['success' => false, 'message' => 'Could not queue reminder']);
}
$stmt->bind_param('ssss', $email, $phone, $itemsRaw, $url);
$ok = $stmt->execute();
$stmt->close();

abandonment_response($ok ? 200 : 500, ['success' => $ok]);