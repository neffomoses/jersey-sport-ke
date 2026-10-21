<?php
// Simple protected orders API
// Usage: /api/orders.php?token=YOUR_SECRET

header('Content-Type: application/json; charset=utf-8');

function json_response($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

// Load .env if present
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

$expectedToken = getenv('ORDERS_API_TOKEN') ?: '';
$token = $_GET['token'] ?? '';

if (!$expectedToken || !$token || !hash_equals($expectedToken, $token)) {
    json_response(401, ['success' => false, 'message' => 'Unauthorized']);
}

$host = 'localhost';
$user = 'root';
$password = '';
$database = 'jersey_sport';

$mysqli = @new mysqli($host, $user, $password, $database);
if (!$mysqli || $mysqli->connect_error) {
    json_response(500, ['success' => false, 'message' => 'Database connection failed']);
}

// Ensure table exists (same schema as submit_order.php)
$mysqli->query("CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(130) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    items TEXT NOT NULL,
    total VARCHAR(80) NOT NULL,
    message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

$res = $mysqli->query('SELECT id, customer_name, email, phone, items, total, message, created_at FROM orders ORDER BY id DESC LIMIT 50');

$out = [];
if ($res) {
    while ($row = $res->fetch_assoc()) {
        // items is stored as JSON string from frontend
        $itemsDecoded = null;
        $raw = $row['items'] ?? '';
        $try = json_decode($raw, true);
        if (is_array($try)) $itemsDecoded = $try;

        $out[] = [
            'id' => (int)$row['id'],
            'customer_name' => $row['customer_name'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'items_raw' => $raw,
            'items' => $itemsDecoded,
            'total' => $row['total'],
            'message' => $row['message'],
            'created_at' => $row['created_at']
        ];
    }
}

$mysqli->close();

json_response(200, ['success' => true, 'orders' => $out]);

