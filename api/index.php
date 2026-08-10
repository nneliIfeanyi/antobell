<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

/**
 * Convert DB apartment row into API apartment payload.
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function apartmentPayload(array $row): array
{
    $houseRulesRaw = (string)($row['house_rules_json'] ?? '[]');
    $houseRules = json_decode($houseRulesRaw, true);

    return [
        'id' => (string)$row['public_id'],
        'name' => (string)$row['name'],
        'location' => (string)$row['location'],
        'address' => (string)$row['address'],
        'rating' => (float)$row['rating'],
        'pricePerNight' => (float)$row['price_per_night'],
        'bedrooms' => (int)$row['bedrooms'],
        'bathrooms' => (int)$row['bathrooms'],
        'amenities' => [],
        'description' => (string)$row['description'],
        'houseRules' => is_array($houseRules) ? $houseRules : [],
        'gallery' => [],
        'reviews' => [],
        'image' => (string)$row['image_url'],
        'badge' => (string)$row['badge'],
    ];
}

/**
 * Fetch apartments with all nested relations.
 *
 * @param string|null $publicId
 * @param string|null $destination
 * @return array<int, array<string, mixed>>
 */
function fetchApartments(?string $publicId = null, ?string $destination = null): array
{
    $pdo = db();
    $sql = 'SELECT * FROM apartments WHERE is_active = 1';
    $params = [];

    if ($publicId !== null && $publicId !== '') {
        $sql .= ' AND public_id = :public_id';
        $params['public_id'] = $publicId;
    }

    if ($destination !== null && $destination !== '') {
        $sql .= ' AND (LOWER(location) LIKE :destination_location OR LOWER(name) LIKE :destination_name)';
        $normalizedDestination = function_exists('mb_strtolower')
            ? mb_strtolower($destination, 'UTF-8')
            : strtolower($destination);
        $params['destination_location'] = '%' . $normalizedDestination . '%';
        $params['destination_name'] = '%' . $normalizedDestination . '%';
    }

    $sql .= ' ORDER BY rating DESC, id DESC';

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(':' . $key, $value);
    }
    $stmt->execute();

    $rows = $stmt->fetchAll();
    if (!$rows) {
        return [];
    }

    $apartments = [];
    $idByPublicId = [];

    foreach ($rows as $row) {
        $payload = apartmentPayload($row);
        $apartments[$payload['id']] = $payload;
        $idByPublicId[(int)$row['id']] = $payload['id'];
    }

    $internalIds = array_keys($idByPublicId);
    $inClause = implode(',', array_fill(0, count($internalIds), '?'));

    $amenitiesStmt = $pdo->prepare("SELECT apartment_id, amenity FROM apartment_amenities WHERE apartment_id IN ($inClause) ORDER BY id ASC");
    $amenitiesStmt->execute($internalIds);
    foreach ($amenitiesStmt->fetchAll() as $item) {
        $public = $idByPublicId[(int)$item['apartment_id']] ?? null;
        if ($public !== null) {
            $apartments[$public]['amenities'][] = (string)$item['amenity'];
        }
    }

    $galleryStmt = $pdo->prepare("SELECT apartment_id, image_url FROM apartment_gallery WHERE apartment_id IN ($inClause) ORDER BY sort_order ASC, id ASC");
    $galleryStmt->execute($internalIds);
    foreach ($galleryStmt->fetchAll() as $item) {
        $public = $idByPublicId[(int)$item['apartment_id']] ?? null;
        if ($public !== null) {
            $apartments[$public]['gallery'][] = (string)$item['image_url'];
        }
    }

    $reviewsStmt = $pdo->prepare("SELECT apartment_id, reviewer_name, rating, comment FROM apartment_reviews WHERE apartment_id IN ($inClause) ORDER BY id DESC");
    $reviewsStmt->execute($internalIds);
    foreach ($reviewsStmt->fetchAll() as $item) {
        $public = $idByPublicId[(int)$item['apartment_id']] ?? null;
        if ($public !== null) {
            $apartments[$public]['reviews'][] = [
                'name' => (string)$item['reviewer_name'],
                'rating' => (float)$item['rating'],
                'comment' => (string)$item['comment'],
            ];
        }
    }

    foreach ($apartments as $publicIdKey => $apartment) {
        if (empty($apartment['gallery'])) {
            $apartments[$publicIdKey]['gallery'] = [$apartment['image']];
        }
    }

    return array_values($apartments);
}

/**
 * Resolve apartment DB numeric ID from public ID.
 */
function findApartmentInternalId(string $publicId): ?int
{
    $stmt = db()->prepare('SELECT id FROM apartments WHERE public_id = :public_id AND is_active = 1 LIMIT 1');
    $stmt->execute(['public_id' => $publicId]);
    $row = $stmt->fetch();

    return $row ? (int)$row['id'] : null;
}

/**
 * Generate booking number.
 */
function generateBookingNumber(): string
{
    return sprintf('AST-%s-%s', strtoupper(substr(bin2hex(random_bytes(3)), 0, 4)), date('ymdHis'));
}

/**
 * Check whether an apartment already has an overlapping booking.
 *
 * @param int $apartmentId Internal apartment ID.
 * @param string $checkIn ISO date string.
 * @param string $checkOut ISO date string.
 * @param bool $lockRows Whether to lock matching rows for update.
 * @return bool True when a conflicting booking exists.
 */
function hasBookingConflict(int $apartmentId, string $checkIn, string $checkOut, bool $lockRows = false): bool
{
    $sql =
        'SELECT id
         FROM bookings
         WHERE apartment_id = :apartment_id
           AND status <> "cancelled"
                     AND NOT (check_out <= :check_in_end OR check_in >= :check_out_start)
         LIMIT 1';

    if ($lockRows) {
        $sql .= ' FOR UPDATE';
    }

    $stmt = db()->prepare($sql);
    $stmt->execute([
        'apartment_id' => $apartmentId,
        'check_in_end' => $checkIn,
        'check_out_start' => $checkOut,
    ]);

    return (bool)$stmt->fetch();
}

try {
    $route = trim((string)($_GET['route'] ?? ''), '/');
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $segments = $route === '' ? [] : explode('/', $route);

    if ($segments === []) {
        respond(200, [
            'success' => true,
            'message' => 'ANTOBELL API is running.',
            'routes' => [
                'GET /apartments',
                'GET /apartments/{id}',
                'POST /booking/check',
                'POST /booking/create',
                'POST /payment',
                'GET /booking/{id}',
            ],
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'apartments' && count($segments) === 1) {
        $destination = isset($_GET['destination']) ? trim((string)$_GET['destination']) : null;
        $checkIn = isset($_GET['checkIn']) ? trim((string)$_GET['checkIn']) : '';
        $checkOut = isset($_GET['checkOut']) ? trim((string)$_GET['checkOut']) : '';

        if (($checkIn !== '' && $checkOut === '') || ($checkIn === '' && $checkOut !== '')) {
            respond(422, ['success' => false, 'message' => 'Both checkIn and checkOut are required for availability filtering.']);
        }

        if ($checkIn !== '' && $checkOut !== '' && strtotime($checkOut) <= strtotime($checkIn)) {
            respond(422, ['success' => false, 'message' => 'checkOut must be after checkIn.']);
        }

        $apartments = fetchApartments(null, $destination);

        if ($checkIn !== '' && $checkOut !== '') {
            $availableApartments = [];

            foreach ($apartments as $apartment) {
                $internalId = findApartmentInternalId((string)$apartment['id']);
                if ($internalId === null) {
                    continue;
                }

                if (!hasBookingConflict($internalId, $checkIn, $checkOut)) {
                    $availableApartments[] = $apartment;
                }
            }

            $apartments = $availableApartments;
        }

        respond(200, ['success' => true, 'data' => $apartments]);
    }

    if ($method === 'GET' && $segments[0] === 'apartments' && count($segments) === 2) {
        $apartmentId = trim((string)$segments[1]);
        $apartments = fetchApartments($apartmentId, null);

        if (!$apartments) {
            respond(404, ['success' => false, 'message' => 'Apartment not found.']);
        }

        respond(200, ['success' => true, 'data' => $apartments[0]]);
    }

    if ($method === 'POST' && $segments[0] === 'booking' && ($segments[1] ?? '') === 'check') {
        $input = jsonBody();
        $apartmentId = trim((string)($input['apartmentId'] ?? ''));
        $checkIn = trim((string)($input['checkIn'] ?? ''));
        $checkOut = trim((string)($input['checkOut'] ?? ''));

        if ($apartmentId === '' || $checkIn === '' || $checkOut === '') {
            respond(422, ['success' => false, 'message' => 'apartmentId, checkIn, and checkOut are required.']);
        }

        $internalId = findApartmentInternalId($apartmentId);
        if ($internalId === null) {
            respond(404, ['success' => false, 'message' => 'Apartment not found.']);
        }

        if (strtotime($checkOut) <= strtotime($checkIn)) {
            respond(422, ['success' => false, 'message' => 'checkOut must be after checkIn.']);
        }

        $isAvailable = !hasBookingConflict($internalId, $checkIn, $checkOut);

        respond(200, [
            'success' => true,
            'data' => [
                'apartmentId' => $apartmentId,
                'checkIn' => $checkIn,
                'checkOut' => $checkOut,
                'available' => $isAvailable,
            ],
        ]);
    }

    if ($method === 'POST' && $segments[0] === 'booking' && ($segments[1] ?? '') === 'create') {
        $input = jsonBody();
        $apartmentId = trim((string)($input['apartmentId'] ?? ''));
        $guestName = trim((string)($input['guestName'] ?? ''));
        $guestEmail = trim((string)($input['guestEmail'] ?? ''));
        $guestPhone = trim((string)($input['guestPhone'] ?? ''));
        $checkIn = trim((string)($input['checkIn'] ?? ''));
        $checkOut = trim((string)($input['checkOut'] ?? ''));
        $guests = (int)($input['guests'] ?? 1);
        $specialRequests = trim((string)($input['specialRequests'] ?? ''));

        if ($apartmentId === '' || $guestName === '' || $guestEmail === '' || $guestPhone === '' || $checkIn === '' || $checkOut === '') {
            respond(422, ['success' => false, 'message' => 'Missing required booking fields.']);
        }

        if (strtotime($checkOut) <= strtotime($checkIn)) {
            respond(422, ['success' => false, 'message' => 'checkOut must be after checkIn.']);
        }

        $internalId = findApartmentInternalId($apartmentId);
        if ($internalId === null) {
            respond(404, ['success' => false, 'message' => 'Apartment not found.']);
        }

        $pdo = db();
        $pdo->beginTransaction();

        $busy = hasBookingConflict($internalId, $checkIn, $checkOut, true);

        if ($busy) {
            $pdo->rollBack();
            respond(409, ['success' => false, 'message' => 'Apartment is not available for the selected dates.']);
        }

        $priceStmt = $pdo->prepare('SELECT price_per_night FROM apartments WHERE id = :id LIMIT 1 FOR UPDATE');
        $priceStmt->execute(['id' => $internalId]);
        $priceRow = $priceStmt->fetch();
        if (!$priceRow) {
            $pdo->rollBack();
            respond(404, ['success' => false, 'message' => 'Apartment pricing not found.']);
        }

        $nights = max(1, (int)round((strtotime($checkOut) - strtotime($checkIn)) / 86400));
        $subtotal = (float)$priceRow['price_per_night'] * $nights;
        $taxes = round($subtotal * 0.12, 2);
        $fees = 25.00;
        $total = $subtotal + $taxes + $fees;

        $bookingNumber = generateBookingNumber();

        $insert = $pdo->prepare(
            'INSERT INTO bookings
                (booking_number, apartment_id, guest_name, guest_email, guest_phone, special_requests, check_in, check_out, guests, subtotal, taxes, fees, total_amount, status, payment_status)
             VALUES
                (:booking_number, :apartment_id, :guest_name, :guest_email, :guest_phone, :special_requests, :check_in, :check_out, :guests, :subtotal, :taxes, :fees, :total_amount, "pending_payment", "unpaid")'
        );
        $insert->execute([
            'booking_number' => $bookingNumber,
            'apartment_id' => $internalId,
            'guest_name' => $guestName,
            'guest_email' => $guestEmail,
            'guest_phone' => $guestPhone,
            'special_requests' => $specialRequests !== '' ? $specialRequests : null,
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => max(1, $guests),
            'subtotal' => $subtotal,
            'taxes' => $taxes,
            'fees' => $fees,
            'total_amount' => $total,
        ]);

        $pdo->commit();

        respond(201, [
            'success' => true,
            'data' => [
                'bookingNumber' => $bookingNumber,
                'apartmentId' => $apartmentId,
                'checkIn' => $checkIn,
                'checkOut' => $checkOut,
                'guests' => max(1, $guests),
                'subtotal' => $subtotal,
                'taxes' => $taxes,
                'fees' => $fees,
                'totalAmount' => $total,
                'status' => 'pending_payment',
            ],
        ]);
    }

    if ($method === 'POST' && $segments[0] === 'payment' && count($segments) === 1) {
        $input = jsonBody();
        $bookingRef = trim((string)($input['bookingNumber'] ?? ''));

        if ($bookingRef === '') {
            $bookingRef = trim((string)($input['bookingId'] ?? ''));
        }

        if ($bookingRef === '') {
            respond(422, ['success' => false, 'message' => 'bookingNumber or bookingId is required.']);
        }

        $bookingStmt = db()->prepare(
            'SELECT id, booking_number, total_amount, payment_status, status
             FROM bookings
             WHERE booking_number = :booking_ref OR id = :booking_id
             LIMIT 1'
        );
        $bookingStmt->execute([
            'booking_ref' => $bookingRef,
            'booking_id' => ctype_digit($bookingRef) ? (int)$bookingRef : 0,
        ]);
        $booking = $bookingStmt->fetch();

        if (!$booking) {
            respond(404, ['success' => false, 'message' => 'Booking not found.']);
        }

        if ((string)$booking['payment_status'] === 'paid') {
            respond(200, [
                'success' => true,
                'data' => [
                    'bookingNumber' => (string)$booking['booking_number'],
                    'status' => 'already_paid',
                ],
            ]);
        }

        $amount = isset($input['amount']) ? (float)$input['amount'] : (float)$booking['total_amount'];
        $transactionRef = sprintf('TRX-%s-%s', date('YmdHis'), strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)));

        $insertPayment = db()->prepare(
            'INSERT INTO payments (booking_id, provider, transaction_ref, amount, currency, status, paid_at)
             VALUES (:booking_id, :provider, :transaction_ref, :amount, :currency, "successful", NOW())'
        );
        $insertPayment->execute([
            'booking_id' => (int)$booking['id'],
            'provider' => trim((string)($input['provider'] ?? 'manual-test')),
            'transaction_ref' => $transactionRef,
            'amount' => $amount,
            'currency' => trim((string)($input['currency'] ?? 'NGN')),
        ]);

        $updateBooking = db()->prepare('UPDATE bookings SET payment_status = "paid", status = "confirmed" WHERE id = :id');
        $updateBooking->execute(['id' => (int)$booking['id']]);

        respond(200, [
            'success' => true,
            'data' => [
                'bookingNumber' => (string)$booking['booking_number'],
                'transactionRef' => $transactionRef,
                'status' => 'successful',
            ],
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'booking' && count($segments) === 2) {
        $bookingRef = trim((string)$segments[1]);

        $stmt = db()->prepare(
            'SELECT
                b.id,
                b.booking_number,
                b.guest_name,
                b.guest_email,
                b.guest_phone,
                b.special_requests,
                b.check_in,
                b.check_out,
                b.guests,
                b.subtotal,
                b.taxes,
                b.fees,
                b.total_amount,
                b.status,
                b.payment_status,
                b.created_at,
                a.public_id AS apartment_public_id,
                a.name AS apartment_name,
                a.location AS apartment_location,
                a.image_url AS apartment_image
             FROM bookings b
             JOIN apartments a ON a.id = b.apartment_id
             WHERE b.booking_number = :booking_ref OR b.id = :booking_id
             LIMIT 1'
        );
        $stmt->execute([
            'booking_ref' => $bookingRef,
            'booking_id' => ctype_digit($bookingRef) ? (int)$bookingRef : 0,
        ]);

        $booking = $stmt->fetch();
        if (!$booking) {
            respond(404, ['success' => false, 'message' => 'Booking not found.']);
        }

        respond(200, [
            'success' => true,
            'data' => [
                'bookingNumber' => (string)$booking['booking_number'],
                'guestName' => (string)$booking['guest_name'],
                'guestEmail' => (string)$booking['guest_email'],
                'guestPhone' => (string)$booking['guest_phone'],
                'specialRequests' => (string)($booking['special_requests'] ?? ''),
                'checkIn' => (string)$booking['check_in'],
                'checkOut' => (string)$booking['check_out'],
                'guests' => (int)$booking['guests'],
                'subtotal' => (float)$booking['subtotal'],
                'taxes' => (float)$booking['taxes'],
                'fees' => (float)$booking['fees'],
                'totalAmount' => (float)$booking['total_amount'],
                'status' => (string)$booking['status'],
                'paymentStatus' => (string)$booking['payment_status'],
                'createdAt' => (string)$booking['created_at'],
                'apartment' => [
                    'id' => (string)$booking['apartment_public_id'],
                    'name' => (string)$booking['apartment_name'],
                    'location' => (string)$booking['apartment_location'],
                    'image' => (string)$booking['apartment_image'],
                ],
            ],
        ]);
    }

    respond(404, ['success' => false, 'message' => 'Route not found.']);
} catch (Throwable $error) {
    respond(500, [
        'success' => false,
        'message' => 'Server error',
        'error' => $error->getMessage(),
    ]);
}
