<?php

declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
// Database configuration
// first check if on production server, if so use the production database credentials.
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
    define('DB_HOST', 'localhost');
    define('DB_PORT', '8080');
    define('DB_NAME', 'leadstar_antobell_booking');
    define('DB_USER', 'leadstar_antobell_booking');
    define('DB_PASS', 'Avalanche@25');
} else {
    // Use local database credentials
    define('DB_HOST', 'localhost');
    define('DB_PORT', '3306');
    define('DB_NAME', 'antobell_booking');
    define('DB_USER', 'root');
    define('DB_PASS', '');
}

/**
 * Return a singleton PDO connection.
 */
function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

/**
 * Output a JSON response and terminate.
 *
 * @param int $statusCode
 * @param array<string, mixed> $payload
 */
function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Read JSON body from request.
 *
 * @return array<string, mixed>
 */
function jsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
