<?php

function abandonment_load_env() {
    $path = dirname(__DIR__) . '/.env';
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
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
        } elseif (($value[0] ?? '') === "'" && substr($value, -1) === "'") {
            $value = substr($value, 1, -1);
        }

        if (getenv($key) === false) {
            putenv("{$key}={$value}");
        }
    }
}

function abandonment_db() {
    static $connection = null;
    if ($connection instanceof mysqli) {
        return $connection;
    }

    abandonment_load_env();
    mysqli_report(MYSQLI_REPORT_OFF);
    $connection = @new mysqli(
        getenv('DB_HOST') ?: 'localhost',
        getenv('DB_USER') ?: 'root',
        getenv('DB_PASS') ?: '',
        getenv('DB_NAME') ?: 'jersey_sport'
    );

    if ($connection->connect_error) {
        return false;
    }

    $connection->set_charset('utf8mb4');
    $created = $connection->query("CREATE TABLE IF NOT EXISTS abandoned_carts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(150) NOT NULL UNIQUE,
        phone VARCHAR(40) NULL,
        items LONGTEXT NOT NULL,
        recovery_url TEXT NOT NULL,
        consent_at DATETIME NOT NULL,
        scheduled_at DATETIME NOT NULL,
        sent_at DATETIME NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
        last_error TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_abandoned_carts_due (status, scheduled_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    if (!$created) {
        $connection->close();
        $connection = null;
        return false;
    }

    return $connection;
}