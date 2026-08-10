<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/config.php';

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This job must be run from the command line.\n");
    exit(1);
}

try {
    $pdo = db();
    $stmt = $pdo->prepare(
        'UPDATE bookings
         SET status = "cancelled",
             updated_at = NOW()
         WHERE status = "pending_payment"
           AND payment_status = "unpaid"
           AND DATE_ADD(created_at, INTERVAL 12 HOUR) <= NOW()'
    );
    $stmt->execute();

    $result = [
        'success' => true,
        'job' => 'revoke_overdue_bookings',
        'revokedCount' => $stmt->rowCount(),
        'ranAt' => gmdate('c'),
    ];

    fwrite(STDOUT, json_encode($result, JSON_UNESCAPED_SLASHES) . PHP_EOL);
    exit(0);
} catch (Throwable $error) {
    $result = [
        'success' => false,
        'job' => 'revoke_overdue_bookings',
        'message' => $error->getMessage(),
        'ranAt' => gmdate('c'),
    ];

    fwrite(STDERR, json_encode($result, JSON_UNESCAPED_SLASHES) . PHP_EOL);
    exit(1);
}
