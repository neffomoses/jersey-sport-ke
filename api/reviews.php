<?php
header('Content-Type: application/json; charset=utf-8');

function review_response($code, $payload) {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$reviewsFile = __DIR__ . '/../reviews.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $reviews = [];
    if (is_readable($reviewsFile)) {
        $decoded = json_decode((string) file_get_contents($reviewsFile), true);
        if (is_array($decoded)) {
            $reviews = array_values(array_filter($decoded, static function ($review) {
                return ($review['status'] ?? '') === 'approved';
            }));
        }
    }
    review_response(200, ['success' => true, 'reviews' => $reviews]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    review_response(405, ['success' => false, 'message' => 'Method not allowed.']);
}

if (!empty($_POST['website'])) {
    review_response(400, ['success' => false, 'message' => 'Unable to submit review.']);
}

$name = trim((string) ($_POST['name'] ?? ''));
$rating = (int) ($_POST['rating'] ?? 0);
$reviewText = trim((string) ($_POST['review'] ?? ''));
$email = trim((string) ($_POST['email'] ?? ''));

if ($name === '' || strlen($name) > 80 || $rating < 1 || $rating > 5 || $reviewText === '' || strlen($reviewText) > 1200) {
    review_response(400, ['success' => false, 'message' => 'Enter your name, a rating from 1 to 5, and a review of up to 1,200 characters.']);
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    review_response(400, ['success' => false, 'message' => 'Enter a valid email address or leave it blank.']);
}

$reviews = [];
if (is_readable($reviewsFile)) {
    $decoded = json_decode((string) file_get_contents($reviewsFile), true);
    if (is_array($decoded)) {
        $reviews = $decoded;
    }
}

$reviews[] = [
    'id' => bin2hex(random_bytes(8)),
    'name' => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
    'email' => $email,
    'rating' => $rating,
    'review' => htmlspecialchars($reviewText, ENT_QUOTES, 'UTF-8'),
    'status' => 'approved',
    'created_at' => date('c')
];

$json = json_encode($reviews, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($json === false || file_put_contents($reviewsFile, $json . PHP_EOL, LOCK_EX) === false) {
    review_response(500, ['success' => false, 'message' => 'The review could not be saved.']);
}

review_response(201, ['success' => true, 'message' => 'Thank you. Your review is now visible.']);
