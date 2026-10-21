<?php
header('Content-Type: application/json; charset=utf-8');

$action = $_POST['action'] ?? '';
$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) { @mkdir($dataDir, 0755, true); }
$file = $dataDir . '/discounts.json';
$list = [];
if (file_exists($file)) {
    $raw = file_get_contents($file);
    $list = json_decode($raw, true) ?: [];
}

function save_list($file, $list) {
    file_put_contents($file, json_encode($list, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

if ($action === 'generate') {
    $email = trim($_POST['email'] ?? '');
    $name = trim($_POST['name'] ?? '');
    // generate a short unique code
    $code = strtoupper('J' . bin2hex(random_bytes(3)));
    $id = bin2hex(random_bytes(8));
    $percent = 10;
    $now = time();
    $expires = $now + 30*24*3600; // 30 days

    // store
    $entry = [
        'id' => $id,
        'code' => $code,
        'email' => $email,
        'name' => $name,
        'percent' => $percent,
        'used' => false,
        'created_at' => $now,
        'expires_at' => $expires
    ];
    $list[$id] = $entry;
    save_list($file, $list);
    echo json_encode(['success' => true, 'code' => $code, 'id' => $id, 'percent' => $percent]);
    exit;
}

if ($action === 'validate') {
    $code = trim($_POST['code'] ?? '');
    foreach ($list as $id => $entry) {
        if (strcasecmp($entry['code'], $code) === 0) {
            if (!empty($entry['used'])) {
                echo json_encode(['success' => false, 'message' => 'Code already used']); exit;
            }
            if (!empty($entry['expires_at']) && time() > $entry['expires_at']) {
                echo json_encode(['success' => false, 'message' => 'Code expired']); exit;
            }
            echo json_encode(['success' => true, 'id' => $entry['id'], 'code' => $entry['code'], 'percent' => $entry['percent']]); exit;
        }
    }
    echo json_encode(['success' => false, 'message' => 'Code not found']); exit;
}

if ($action === 'redeem') {
    $code = trim($_POST['code'] ?? '');
    foreach ($list as $id => $entry) {
        if (strcasecmp($entry['code'], $code) === 0) {
            if (!empty($entry['used'])) {
                echo json_encode(['success' => false, 'message' => 'Already redeemed']); exit;
            }
            $list[$id]['used'] = true;
            save_list($file, $list);
            echo json_encode(['success' => true]); exit;
        }
    }
    echo json_encode(['success' => false, 'message' => 'Code not found']); exit;
}

echo json_encode(['success' => false, 'message' => 'Unknown action']);

?>
