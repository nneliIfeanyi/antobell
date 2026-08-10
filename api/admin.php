<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

const ADMIN_SESSION_COOKIE = 'antobell_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 43200;

/**
 * Return the application base path for cookie scoping.
 */
function adminCookiePath(): string
{
    $scriptName = str_replace('\\', '/', (string)($_SERVER['SCRIPT_NAME'] ?? '/api/admin.php'));
    $basePath = dirname(dirname($scriptName));

    if ($basePath === '\\' || $basePath === '/' || $basePath === '.') {
        return '/';
    }

    return rtrim($basePath, '/') . '/';
}

/**
 * Set the admin session cookie.
 */
function setAdminSessionCookie(string $token, int $expiresAtUnix): void
{
    setcookie(ADMIN_SESSION_COOKIE, $token, [
        'expires' => $expiresAtUnix,
        'path' => adminCookiePath(),
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/**
 * Clear the admin session cookie.
 */
function clearAdminSessionCookie(): void
{
    setcookie(ADMIN_SESSION_COOKIE, '', [
        'expires' => time() - 3600,
        'path' => adminCookiePath(),
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/**
 * Generate a random admin session token.
 */
function generateAdminSessionToken(): string
{
    return bin2hex(random_bytes(32));
}

/**
 * Hash a session token for storage.
 */
function hashAdminSessionToken(string $token): string
{
    return hash('sha256', $token);
}

/**
 * Return the client IP address.
 */
function clientIpAddress(): ?string
{
    $address = trim((string)($_SERVER['REMOTE_ADDR'] ?? ''));
    return $address !== '' ? $address : null;
}

/**
 * Return the request user agent.
 */
function clientUserAgent(): ?string
{
    $agent = trim((string)($_SERVER['HTTP_USER_AGENT'] ?? ''));
    return $agent !== '' ? substr($agent, 0, 255) : null;
}

/**
 * Normalize an admin payload for responses.
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function adminPayload(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'fullName' => (string)$row['full_name'],
        'email' => (string)$row['email'],
        'lastLoginAt' => isset($row['last_login_at']) ? (string)$row['last_login_at'] : null,
    ];
}

/**
 * Create a new admin session and return the raw token.
 */
function createAdminSession(int $adminUserId): string
{
    $token = generateAdminSessionToken();
    $tokenHash = hashAdminSessionToken($token);
    $expiresAtUnix = time() + ADMIN_SESSION_TTL_SECONDS;
    $expiresAt = gmdate('Y-m-d H:i:s', $expiresAtUnix);

    $stmt = db()->prepare(
        'INSERT INTO admin_sessions (admin_user_id, session_token_hash, ip_address, user_agent, last_seen_at, expires_at)
         VALUES (:admin_user_id, :session_token_hash, :ip_address, :user_agent, NOW(), :expires_at)'
    );
    $stmt->execute([
        'admin_user_id' => $adminUserId,
        'session_token_hash' => $tokenHash,
        'ip_address' => clientIpAddress(),
        'user_agent' => clientUserAgent(),
        'expires_at' => $expiresAt,
    ]);

    setAdminSessionCookie($token, $expiresAtUnix);

    return $token;
}

/**
 * Return the current admin session row when authenticated.
 *
 * @return array<string, mixed>|null
 */
function currentAdminSession(): ?array
{
    $token = trim((string)($_COOKIE[ADMIN_SESSION_COOKIE] ?? ''));
    if ($token === '') {
        return null;
    }

    $stmt = db()->prepare(
        'SELECT
            s.id AS session_id,
            s.admin_user_id,
            s.expires_at,
            u.id,
            u.full_name,
            u.email,
            u.is_active,
            u.last_login_at
         FROM admin_sessions s
         JOIN admin_users u ON u.id = s.admin_user_id
         WHERE s.session_token_hash = :session_token_hash
           AND s.revoked_at IS NULL
           AND s.expires_at > NOW()
           AND u.is_active = 1
         LIMIT 1'
    );
    $stmt->execute([
        'session_token_hash' => hashAdminSessionToken($token),
    ]);

    $row = $stmt->fetch();
    if (!$row) {
        clearAdminSessionCookie();
        return null;
    }

    $touch = db()->prepare('UPDATE admin_sessions SET last_seen_at = NOW() WHERE id = :id');
    $touch->execute(['id' => (int)$row['session_id']]);

    return $row;
}

/**
 * Require an authenticated admin session.
 *
 * @return array<string, mixed>
 */
function requireAdminSession(): array
{
    $session = currentAdminSession();
    if ($session === null) {
        respond(401, ['success' => false, 'message' => 'Admin authentication required.']);
    }

    return $session;
}

/**
 * Revoke the current admin session.
 */
function revokeCurrentAdminSession(): void
{
    $token = trim((string)($_COOKIE[ADMIN_SESSION_COOKIE] ?? ''));
    if ($token !== '') {
        $stmt = db()->prepare(
            'UPDATE admin_sessions
             SET revoked_at = NOW()
             WHERE session_token_hash = :session_token_hash
               AND revoked_at IS NULL'
        );
        $stmt->execute([
            'session_token_hash' => hashAdminSessionToken($token),
        ]);
    }

    clearAdminSessionCookie();
}

/**
 * Normalize array-like input into a clean string list.
 *
 * @param mixed $value
 * @return array<int, string>
 */
function normalizeStringList(mixed $value): array
{
    if (is_string($value)) {
        $parts = preg_split('/\r\n|\r|\n|,/', $value) ?: [];
        $value = $parts;
    }

    if (!is_array($value)) {
        return [];
    }

    $clean = [];
    foreach ($value as $item) {
        $text = trim((string)$item);
        if ($text !== '') {
            $clean[] = $text;
        }
    }

    return array_values(array_unique($clean));
}

/**
 * Build admin apartment payload.
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function adminApartmentPayload(array $row): array
{
    $houseRules = json_decode((string)($row['house_rules_json'] ?? '[]'), true);

    return [
        'id' => (int)$row['id'],
        'publicId' => (string)$row['public_id'],
        'name' => (string)$row['name'],
        'location' => (string)$row['location'],
        'address' => (string)$row['address'],
        'description' => (string)$row['description'],
        'houseRules' => is_array($houseRules) ? $houseRules : [],
        'rating' => (float)$row['rating'],
        'pricePerNight' => (float)$row['price_per_night'],
        'bedrooms' => (int)$row['bedrooms'],
        'bathrooms' => (int)$row['bathrooms'],
        'imageUrl' => (string)$row['image_url'],
        'badge' => (string)$row['badge'],
        'isActive' => (int)$row['is_active'] === 1,
        'createdAt' => (string)$row['created_at'],
        'updatedAt' => (string)$row['updated_at'],
    ];
}

/**
 * Fetch a single apartment detail payload for admin.
 */
function fetchAdminApartmentByPublicId(string $publicId): ?array
{
    $stmt = db()->prepare('SELECT * FROM apartments WHERE public_id = :public_id LIMIT 1');
    $stmt->execute(['public_id' => $publicId]);
    $row = $stmt->fetch();

    if (!$row) {
        return null;
    }

    $payload = adminApartmentPayload($row);
    $internalId = (int)$row['id'];

    $amenitiesStmt = db()->prepare('SELECT amenity FROM apartment_amenities WHERE apartment_id = :apartment_id ORDER BY id ASC');
    $amenitiesStmt->execute(['apartment_id' => $internalId]);
    $payload['amenities'] = array_map(static fn(array $item): string => (string)$item['amenity'], $amenitiesStmt->fetchAll());

    $galleryStmt = db()->prepare('SELECT image_url FROM apartment_gallery WHERE apartment_id = :apartment_id ORDER BY sort_order ASC, id ASC');
    $galleryStmt->execute(['apartment_id' => $internalId]);
    $payload['gallery'] = array_map(static fn(array $item): string => (string)$item['image_url'], $galleryStmt->fetchAll());

    return $payload;
}

/**
 * Replace amenities for an apartment.
 *
 * @param int $apartmentId
 * @param array<int, string> $amenities
 */
function replaceApartmentAmenities(int $apartmentId, array $amenities): void
{
    $deleteStmt = db()->prepare('DELETE FROM apartment_amenities WHERE apartment_id = :apartment_id');
    $deleteStmt->execute(['apartment_id' => $apartmentId]);

    if ($amenities === []) {
        return;
    }

    $insertStmt = db()->prepare('INSERT INTO apartment_amenities (apartment_id, amenity) VALUES (:apartment_id, :amenity)');
    foreach ($amenities as $amenity) {
        $insertStmt->execute([
            'apartment_id' => $apartmentId,
            'amenity' => $amenity,
        ]);
    }
}

/**
 * Replace gallery images for an apartment.
 *
 * @param int $apartmentId
 * @param array<int, string> $gallery
 */
function replaceApartmentGallery(int $apartmentId, array $gallery): void
{
    $deleteStmt = db()->prepare('DELETE FROM apartment_gallery WHERE apartment_id = :apartment_id');
    $deleteStmt->execute(['apartment_id' => $apartmentId]);

    if ($gallery === []) {
        return;
    }

    $insertStmt = db()->prepare('INSERT INTO apartment_gallery (apartment_id, image_url, sort_order) VALUES (:apartment_id, :image_url, :sort_order)');
    foreach (array_values($gallery) as $index => $imageUrl) {
        $insertStmt->execute([
            'apartment_id' => $apartmentId,
            'image_url' => $imageUrl,
            'sort_order' => $index + 1,
        ]);
    }
}

/**
 * Generate an apartment public id.
 */
function generateApartmentPublicId(): string
{
    return sprintf('apt-%04d', random_int(1000, 9999));
}

/**
 * Build admin booking payload.
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function adminBookingPayload(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'bookingNumber' => (string)$row['booking_number'],
        'guestName' => (string)$row['guest_name'],
        'guestEmail' => (string)$row['guest_email'],
        'guestPhone' => (string)$row['guest_phone'],
        'specialRequests' => (string)($row['special_requests'] ?? ''),
        'checkIn' => (string)$row['check_in'],
        'checkOut' => (string)$row['check_out'],
        'guests' => (int)$row['guests'],
        'subtotal' => (float)$row['subtotal'],
        'taxes' => (float)$row['taxes'],
        'fees' => (float)$row['fees'],
        'totalAmount' => (float)$row['total_amount'],
        'status' => (string)$row['status'],
        'paymentStatus' => (string)$row['payment_status'],
        'createdAt' => (string)$row['created_at'],
        'updatedAt' => (string)$row['updated_at'],
        'paymentDueAt' => isset($row['payment_due_at']) ? (string)$row['payment_due_at'] : null,
        'isOverdue' => isset($row['is_overdue']) ? (int)$row['is_overdue'] === 1 : false,
        'apartment' => [
            'id' => (string)$row['apartment_public_id'],
            'name' => (string)$row['apartment_name'],
            'location' => (string)$row['apartment_location'],
            'image' => (string)$row['apartment_image'],
        ],
    ];
}

/**
 * Fetch a single booking detail for admin.
 */
function fetchAdminBookingByRef(string $bookingRef): ?array
{
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
            b.updated_at,
            DATE_ADD(b.created_at, INTERVAL 12 HOUR) AS payment_due_at,
            CASE WHEN b.payment_status = "unpaid" AND b.status = "pending_payment" AND NOW() > DATE_ADD(b.created_at, INTERVAL 12 HOUR) THEN 1 ELSE 0 END AS is_overdue,
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

    $row = $stmt->fetch();
    return $row ? adminBookingPayload($row) : null;
}

/**
 * Build admin payment payload.
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function adminPaymentPayload(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'provider' => (string)$row['provider'],
        'transactionRef' => (string)$row['transaction_ref'],
        'amount' => (float)$row['amount'],
        'currency' => (string)$row['currency'],
        'status' => (string)$row['status'],
        'paidAt' => isset($row['paid_at']) ? (string)$row['paid_at'] : null,
        'createdAt' => (string)$row['created_at'],
        'booking' => [
            'id' => (int)$row['booking_id'],
            'bookingNumber' => (string)$row['booking_number'],
            'status' => (string)$row['booking_status'],
            'paymentStatus' => (string)$row['booking_payment_status'],
            'guestName' => (string)$row['guest_name'],
            'guestEmail' => (string)$row['guest_email'],
        ],
        'apartment' => [
            'id' => (string)$row['apartment_public_id'],
            'name' => (string)$row['apartment_name'],
        ],
    ];
}

/**
 * Fetch single payment detail for admin.
 */
function fetchAdminPaymentByRef(string $paymentRef): ?array
{
    $stmt = db()->prepare(
        'SELECT
            p.id,
            p.booking_id,
            p.provider,
            p.transaction_ref,
            p.amount,
            p.currency,
            p.status,
            p.paid_at,
            p.created_at,
            b.booking_number,
            b.status AS booking_status,
            b.payment_status AS booking_payment_status,
            b.guest_name,
            b.guest_email,
            a.public_id AS apartment_public_id,
            a.name AS apartment_name
         FROM payments p
         JOIN bookings b ON b.id = p.booking_id
         JOIN apartments a ON a.id = b.apartment_id
         WHERE p.transaction_ref = :payment_ref OR p.id = :payment_id
         LIMIT 1'
    );
    $stmt->execute([
        'payment_ref' => $paymentRef,
        'payment_id' => ctype_digit($paymentRef) ? (int)$paymentRef : 0,
    ]);

    $row = $stmt->fetch();
    return $row ? adminPaymentPayload($row) : null;
}

try {
    $route = trim((string)($_GET['route'] ?? ''), '/');
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $segments = $route === '' ? [] : explode('/', $route);

    if ($segments === []) {
        respond(200, [
            'success' => true,
            'message' => 'ANTOBELL admin API is running.',
            'routes' => [
                'POST admin.php?route=auth/login',
                'POST admin.php?route=auth/logout',
                'GET admin.php?route=auth/me',
                'POST admin.php?route=auth/change-password',
                'GET admin.php?route=dashboard/summary',
                'GET admin.php?route=bookings/pending-payment',
                'GET admin.php?route=bookings',
                'GET admin.php?route=bookings/{bookingRef}',
                'PATCH admin.php?route=bookings/{bookingRef}/status',
                'GET admin.php?route=payments',
                'GET admin.php?route=payments/{paymentRef}',
                'POST admin.php?route=bookings/{bookingRef}/mark-paid-onsite',
                'POST admin.php?route=bookings/{bookingRef}/revoke-overdue-unpaid',
                'GET admin.php?route=apartments',
                'GET admin.php?route=apartments/{publicId}',
                'POST admin.php?route=apartments',
                'PATCH admin.php?route=apartments/{publicId}',
                'DELETE admin.php?route=apartments/{publicId}',
                'POST admin.php?route=apartments/{publicId}/hard-delete',
            ],
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'apartments' && count($segments) === 1) {
        requireAdminSession();

        $search = trim((string)($_GET['search'] ?? ''));
        $active = trim((string)($_GET['active'] ?? ''));

        $sql = 'SELECT * FROM apartments WHERE 1=1';
        $params = [];

        if ($search !== '') {
            $sql .= ' AND (LOWER(name) LIKE :search OR LOWER(location) LIKE :search OR LOWER(public_id) LIKE :search)';
            $normalized = function_exists('mb_strtolower') ? mb_strtolower($search, 'UTF-8') : strtolower($search);
            $params['search'] = '%' . $normalized . '%';
        }

        if ($active === '1' || $active === '0') {
            $sql .= ' AND is_active = :is_active';
            $params['is_active'] = (int)$active;
        }

        $sql .= ' ORDER BY updated_at DESC, id DESC LIMIT 200';

        $stmt = db()->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $apartments = array_map(static function (array $row): array {
            return adminApartmentPayload($row);
        }, $rows);

        respond(200, [
            'success' => true,
            'data' => [
                'apartments' => $apartments,
            ],
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'apartments' && count($segments) === 2) {
        requireAdminSession();
        $publicId = trim((string)$segments[1]);

        if ($publicId === '') {
            respond(422, ['success' => false, 'message' => 'Apartment publicId is required.']);
        }

        $apartment = fetchAdminApartmentByPublicId($publicId);
        if ($apartment === null) {
            respond(404, ['success' => false, 'message' => 'Apartment not found.']);
        }

        respond(200, [
            'success' => true,
            'data' => [
                'apartment' => $apartment,
            ],
        ]);
    }

    if ($method === 'POST' && $segments[0] === 'apartments' && count($segments) === 1) {
        requireAdminSession();
        $input = jsonBody();

        $name = trim((string)($input['name'] ?? ''));
        $location = trim((string)($input['location'] ?? ''));
        $address = trim((string)($input['address'] ?? ''));
        $description = trim((string)($input['description'] ?? ''));
        $badge = trim((string)($input['badge'] ?? ''));
        $imageUrl = trim((string)($input['imageUrl'] ?? ''));
        $pricePerNight = (float)($input['pricePerNight'] ?? 0);
        $rating = (float)($input['rating'] ?? 0);
        $bedrooms = (int)($input['bedrooms'] ?? 0);
        $bathrooms = (int)($input['bathrooms'] ?? 0);
        $isActive = isset($input['isActive']) ? ((bool)$input['isActive'] ? 1 : 0) : 1;

        $houseRules = normalizeStringList($input['houseRules'] ?? []);
        $amenities = normalizeStringList($input['amenities'] ?? []);
        $gallery = normalizeStringList($input['gallery'] ?? []);

        if ($name === '' || $location === '' || $address === '' || $description === '' || $imageUrl === '') {
            respond(422, ['success' => false, 'message' => 'Name, location, address, description, and imageUrl are required.']);
        }

        if ($pricePerNight <= 0 || $rating < 0 || $rating > 5 || $bedrooms <= 0 || $bathrooms <= 0) {
            respond(422, ['success' => false, 'message' => 'Invalid apartment numeric values supplied.']);
        }

        $pdo = db();
        $pdo->beginTransaction();

        $publicId = trim((string)($input['publicId'] ?? ''));
        if ($publicId === '') {
            do {
                $publicId = generateApartmentPublicId();
                $existsStmt = $pdo->prepare('SELECT id FROM apartments WHERE public_id = :public_id LIMIT 1');
                $existsStmt->execute(['public_id' => $publicId]);
                $exists = (bool)$existsStmt->fetch();
            } while ($exists);
        } else {
            $existsStmt = $pdo->prepare('SELECT id FROM apartments WHERE public_id = :public_id LIMIT 1');
            $existsStmt->execute(['public_id' => $publicId]);
            if ($existsStmt->fetch()) {
                $pdo->rollBack();
                respond(409, ['success' => false, 'message' => 'Apartment publicId already exists.']);
            }
        }

        $insertStmt = $pdo->prepare(
            'INSERT INTO apartments
                (public_id, name, location, address, description, house_rules_json, rating, price_per_night, bedrooms, bathrooms, image_url, badge, is_active)
             VALUES
                (:public_id, :name, :location, :address, :description, :house_rules_json, :rating, :price_per_night, :bedrooms, :bathrooms, :image_url, :badge, :is_active)'
        );
        $insertStmt->execute([
            'public_id' => $publicId,
            'name' => $name,
            'location' => $location,
            'address' => $address,
            'description' => $description,
            'house_rules_json' => json_encode($houseRules, JSON_UNESCAPED_UNICODE),
            'rating' => $rating,
            'price_per_night' => $pricePerNight,
            'bedrooms' => $bedrooms,
            'bathrooms' => $bathrooms,
            'image_url' => $imageUrl,
            'badge' => $badge !== '' ? $badge : 'New listing',
            'is_active' => $isActive,
        ]);

        $apartmentId = (int)$pdo->lastInsertId();
        replaceApartmentAmenities($apartmentId, $amenities);
        replaceApartmentGallery($apartmentId, $gallery !== [] ? $gallery : [$imageUrl]);

        $pdo->commit();

        $apartment = fetchAdminApartmentByPublicId($publicId);
        respond(201, [
            'success' => true,
            'data' => [
                'apartment' => $apartment,
            ],
        ]);
    }

    if ($method === 'PATCH' && $segments[0] === 'apartments' && count($segments) === 2) {
        requireAdminSession();
        $publicId = trim((string)$segments[1]);
        $input = jsonBody();

        if ($publicId === '') {
            respond(422, ['success' => false, 'message' => 'Apartment publicId is required.']);
        }

        $pdo = db();
        $pdo->beginTransaction();

        $findStmt = $pdo->prepare('SELECT * FROM apartments WHERE public_id = :public_id LIMIT 1 FOR UPDATE');
        $findStmt->execute(['public_id' => $publicId]);
        $existing = $findStmt->fetch();

        if (!$existing) {
            $pdo->rollBack();
            respond(404, ['success' => false, 'message' => 'Apartment not found.']);
        }

        $name = array_key_exists('name', $input) ? trim((string)$input['name']) : (string)$existing['name'];
        $location = array_key_exists('location', $input) ? trim((string)$input['location']) : (string)$existing['location'];
        $address = array_key_exists('address', $input) ? trim((string)$input['address']) : (string)$existing['address'];
        $description = array_key_exists('description', $input) ? trim((string)$input['description']) : (string)$existing['description'];
        $badge = array_key_exists('badge', $input) ? trim((string)$input['badge']) : (string)$existing['badge'];
        $imageUrl = array_key_exists('imageUrl', $input) ? trim((string)$input['imageUrl']) : (string)$existing['image_url'];
        $pricePerNight = array_key_exists('pricePerNight', $input) ? (float)$input['pricePerNight'] : (float)$existing['price_per_night'];
        $rating = array_key_exists('rating', $input) ? (float)$input['rating'] : (float)$existing['rating'];
        $bedrooms = array_key_exists('bedrooms', $input) ? (int)$input['bedrooms'] : (int)$existing['bedrooms'];
        $bathrooms = array_key_exists('bathrooms', $input) ? (int)$input['bathrooms'] : (int)$existing['bathrooms'];
        $isActive = array_key_exists('isActive', $input) ? ((bool)$input['isActive'] ? 1 : 0) : (int)$existing['is_active'];

        $houseRules = array_key_exists('houseRules', $input)
            ? normalizeStringList($input['houseRules'])
            : (json_decode((string)$existing['house_rules_json'], true) ?: []);

        if ($name === '' || $location === '' || $address === '' || $description === '' || $imageUrl === '') {
            $pdo->rollBack();
            respond(422, ['success' => false, 'message' => 'Name, location, address, description, and imageUrl are required.']);
        }

        if ($pricePerNight <= 0 || $rating < 0 || $rating > 5 || $bedrooms <= 0 || $bathrooms <= 0) {
            $pdo->rollBack();
            respond(422, ['success' => false, 'message' => 'Invalid apartment numeric values supplied.']);
        }

        $updateStmt = $pdo->prepare(
            'UPDATE apartments
             SET name = :name,
                 location = :location,
                 address = :address,
                 description = :description,
                 house_rules_json = :house_rules_json,
                 rating = :rating,
                 price_per_night = :price_per_night,
                 bedrooms = :bedrooms,
                 bathrooms = :bathrooms,
                 image_url = :image_url,
                 badge = :badge,
                 is_active = :is_active,
                 updated_at = NOW()
             WHERE id = :id'
        );
        $updateStmt->execute([
            'name' => $name,
            'location' => $location,
            'address' => $address,
            'description' => $description,
            'house_rules_json' => json_encode($houseRules, JSON_UNESCAPED_UNICODE),
            'rating' => $rating,
            'price_per_night' => $pricePerNight,
            'bedrooms' => $bedrooms,
            'bathrooms' => $bathrooms,
            'image_url' => $imageUrl,
            'badge' => $badge,
            'is_active' => $isActive,
            'id' => (int)$existing['id'],
        ]);

        if (array_key_exists('amenities', $input)) {
            $amenities = normalizeStringList($input['amenities']);
            replaceApartmentAmenities((int)$existing['id'], $amenities);
        }

        if (array_key_exists('gallery', $input)) {
            $gallery = normalizeStringList($input['gallery']);
            replaceApartmentGallery((int)$existing['id'], $gallery !== [] ? $gallery : [$imageUrl]);
        }

        $pdo->commit();

        $apartment = fetchAdminApartmentByPublicId($publicId);
        respond(200, [
            'success' => true,
            'data' => [
                'apartment' => $apartment,
            ],
        ]);
    }

    if ($method === 'DELETE' && $segments[0] === 'apartments' && count($segments) === 2) {
        requireAdminSession();
        $publicId = trim((string)$segments[1]);

        if ($publicId === '') {
            respond(422, ['success' => false, 'message' => 'Apartment publicId is required.']);
        }

        $stmt = db()->prepare('UPDATE apartments SET is_active = 0, updated_at = NOW() WHERE public_id = :public_id LIMIT 1');
        $stmt->execute(['public_id' => $publicId]);

        if ($stmt->rowCount() === 0) {
            respond(404, ['success' => false, 'message' => 'Apartment not found.']);
        }

        respond(200, [
            'success' => true,
            'data' => [
                'publicId' => $publicId,
                'status' => 'deactivated',
            ],
        ]);
    }

    if ($method === 'POST' && $segments[0] === 'apartments' && count($segments) === 3 && ($segments[2] ?? '') === 'hard-delete') {
        requireAdminSession();
        $publicId = trim((string)$segments[1]);
        $input = jsonBody();
        $confirmationText = trim((string)($input['confirmationText'] ?? ''));

        if ($publicId === '') {
            respond(422, ['success' => false, 'message' => 'Apartment publicId is required.']);
        }

        if ($confirmationText !== $publicId) {
            respond(422, ['success' => false, 'message' => 'Confirmation text must exactly match the apartment publicId.']);
        }

        $pdo = db();
        $pdo->beginTransaction();

        $findStmt = $pdo->prepare('SELECT id, public_id, is_active FROM apartments WHERE public_id = :public_id LIMIT 1 FOR UPDATE');
        $findStmt->execute(['public_id' => $publicId]);
        $apartment = $findStmt->fetch();

        if (!$apartment) {
            $pdo->rollBack();
            respond(404, ['success' => false, 'message' => 'Apartment not found.']);
        }

        if ((int)$apartment['is_active'] === 1) {
            $pdo->rollBack();
            respond(409, ['success' => false, 'message' => 'Deactivate this apartment before attempting hard delete.']);
        }

        $bookingCountStmt = $pdo->prepare('SELECT COUNT(*) FROM bookings WHERE apartment_id = :apartment_id');
        $bookingCountStmt->execute(['apartment_id' => (int)$apartment['id']]);
        $bookingCount = (int)$bookingCountStmt->fetchColumn();

        if ($bookingCount > 0) {
            $pdo->rollBack();
            respond(409, ['success' => false, 'message' => 'Hard delete blocked because this apartment has booking records.']);
        }

        $deleteStmt = $pdo->prepare('DELETE FROM apartments WHERE id = :id LIMIT 1');
        $deleteStmt->execute(['id' => (int)$apartment['id']]);

        $pdo->commit();

        respond(200, [
            'success' => true,
            'data' => [
                'publicId' => $publicId,
                'status' => 'hard_deleted',
            ],
        ]);
    }

    if ($method === 'POST' && $segments[0] === 'auth' && ($segments[1] ?? '') === 'login') {
        $input = jsonBody();
        $email = trim((string)($input['email'] ?? ''));
        $password = (string)($input['password'] ?? '');

        if ($email === '' || $password === '') {
            respond(422, ['success' => false, 'message' => 'Email and password are required.']);
        }

        $stmt = db()->prepare(
            'SELECT id, full_name, email, password_hash, is_active, last_login_at
             FROM admin_users
             WHERE email = :email
             LIMIT 1'
        );
        $stmt->execute(['email' => $email]);
        $admin = $stmt->fetch();

        if (!$admin || !(bool)$admin['is_active'] || !password_verify($password, (string)$admin['password_hash'])) {
            respond(401, ['success' => false, 'message' => 'Invalid admin credentials.']);
        }

        $updateLogin = db()->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = :id');
        $updateLogin->execute(['id' => (int)$admin['id']]);
        createAdminSession((int)$admin['id']);

        $refreshedAdmin = [
            'id' => (int)$admin['id'],
            'full_name' => (string)$admin['full_name'],
            'email' => (string)$admin['email'],
            'last_login_at' => gmdate('Y-m-d H:i:s'),
        ];

        respond(200, [
            'success' => true,
            'data' => [
                'admin' => adminPayload($refreshedAdmin),
            ],
        ]);
    }

    if ($method === 'POST' && $segments[0] === 'auth' && ($segments[1] ?? '') === 'logout') {
        revokeCurrentAdminSession();
        respond(200, ['success' => true, 'message' => 'Admin logged out successfully.']);
    }

    if ($method === 'GET' && $segments[0] === 'auth' && ($segments[1] ?? '') === 'me') {
        $session = requireAdminSession();
        respond(200, [
            'success' => true,
            'data' => [
                'admin' => adminPayload($session),
            ],
        ]);
    }

    if ($method === 'POST' && $segments[0] === 'auth' && ($segments[1] ?? '') === 'change-password') {
        $session = requireAdminSession();
        $input = jsonBody();

        $currentPassword = (string)($input['currentPassword'] ?? '');
        $newPassword = (string)($input['newPassword'] ?? '');
        $confirmPassword = (string)($input['confirmPassword'] ?? '');

        if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
            respond(422, ['success' => false, 'message' => 'Current password, new password, and confirmation are required.']);
        }

        if ($newPassword !== $confirmPassword) {
            respond(422, ['success' => false, 'message' => 'New password and confirmation do not match.']);
        }

        if (strlen($newPassword) < 10) {
            respond(422, ['success' => false, 'message' => 'New password must be at least 10 characters long.']);
        }

        $adminStmt = db()->prepare('SELECT id, password_hash FROM admin_users WHERE id = :id AND is_active = 1 LIMIT 1');
        $adminStmt->execute(['id' => (int)$session['admin_user_id']]);
        $admin = $adminStmt->fetch();

        if (!$admin) {
            respond(404, ['success' => false, 'message' => 'Admin user not found.']);
        }

        if (!password_verify($currentPassword, (string)$admin['password_hash'])) {
            respond(401, ['success' => false, 'message' => 'Current password is incorrect.']);
        }

        if (password_verify($newPassword, (string)$admin['password_hash'])) {
            respond(422, ['success' => false, 'message' => 'New password must be different from current password.']);
        }

        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);

        $updateStmt = db()->prepare('UPDATE admin_users SET password_hash = :password_hash, updated_at = NOW() WHERE id = :id');
        $updateStmt->execute([
            'password_hash' => $newHash,
            'id' => (int)$session['admin_user_id'],
        ]);

        // Keep the current session active and revoke all other active sessions.
        $revokeStmt = db()->prepare(
            'UPDATE admin_sessions
             SET revoked_at = NOW()
             WHERE admin_user_id = :admin_user_id
               AND id <> :current_session_id
               AND revoked_at IS NULL'
        );
        $revokeStmt->execute([
            'admin_user_id' => (int)$session['admin_user_id'],
            'current_session_id' => (int)$session['session_id'],
        ]);

        respond(200, [
            'success' => true,
            'message' => 'Password updated successfully.',
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'dashboard' && ($segments[1] ?? '') === 'summary') {
        requireAdminSession();

        $summaryStmt = db()->query(
            'SELECT
                (SELECT COUNT(*) FROM apartments WHERE is_active = 1) AS active_apartments,
                (SELECT COUNT(*) FROM bookings) AS total_bookings,
                (SELECT COUNT(*) FROM bookings WHERE status = "pending_payment") AS pending_payment_bookings,
                (SELECT COUNT(*) FROM bookings WHERE status = "confirmed") AS confirmed_bookings,
                (SELECT COUNT(*) FROM bookings WHERE payment_status = "unpaid") AS unpaid_bookings'
        );
        $summary = $summaryStmt->fetch() ?: [];

        $recentStmt = db()->query(
            'SELECT booking_number, guest_name, total_amount, status, created_at
             FROM bookings
             ORDER BY created_at DESC
             LIMIT 5'
        );
        $recentBookings = array_map(static function (array $booking): array {
            return [
                'bookingNumber' => (string)$booking['booking_number'],
                'guestName' => (string)$booking['guest_name'],
                'totalAmount' => (float)$booking['total_amount'],
                'status' => (string)$booking['status'],
                'createdAt' => (string)$booking['created_at'],
            ];
        }, $recentStmt->fetchAll());

        respond(200, [
            'success' => true,
            'data' => [
                'summary' => [
                    'activeApartments' => (int)($summary['active_apartments'] ?? 0),
                    'totalBookings' => (int)($summary['total_bookings'] ?? 0),
                    'pendingPaymentBookings' => (int)($summary['pending_payment_bookings'] ?? 0),
                    'confirmedBookings' => (int)($summary['confirmed_bookings'] ?? 0),
                    'unpaidBookings' => (int)($summary['unpaid_bookings'] ?? 0),
                ],
                'recentBookings' => $recentBookings,
            ],
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'bookings' && ($segments[1] ?? '') === 'pending-payment') {
        requireAdminSession();

        $queueStmt = db()->query(
            'SELECT
                b.booking_number,
                b.guest_name,
                b.guest_email,
                b.guest_phone,
                b.check_in,
                b.check_out,
                b.guests,
                b.total_amount,
                b.status,
                b.payment_status,
                b.created_at,
                DATE_ADD(b.created_at, INTERVAL 12 HOUR) AS payment_due_at,
                CASE WHEN NOW() > DATE_ADD(b.created_at, INTERVAL 12 HOUR) THEN 1 ELSE 0 END AS is_overdue,
                a.public_id AS apartment_public_id,
                a.name AS apartment_name
             FROM bookings b
             JOIN apartments a ON a.id = b.apartment_id
             WHERE b.status = "pending_payment"
               AND b.payment_status = "unpaid"
             ORDER BY is_overdue DESC, payment_due_at ASC, b.created_at ASC
             LIMIT 100'
        );

        $bookings = array_map(static function (array $row): array {
            return [
                'bookingNumber' => (string)$row['booking_number'],
                'guestName' => (string)$row['guest_name'],
                'guestEmail' => (string)$row['guest_email'],
                'guestPhone' => (string)$row['guest_phone'],
                'checkIn' => (string)$row['check_in'],
                'checkOut' => (string)$row['check_out'],
                'guests' => (int)$row['guests'],
                'totalAmount' => (float)$row['total_amount'],
                'status' => (string)$row['status'],
                'paymentStatus' => (string)$row['payment_status'],
                'createdAt' => (string)$row['created_at'],
                'paymentDueAt' => (string)$row['payment_due_at'],
                'isOverdue' => (int)$row['is_overdue'] === 1,
                'apartment' => [
                    'id' => (string)$row['apartment_public_id'],
                    'name' => (string)$row['apartment_name'],
                ],
            ];
        }, $queueStmt->fetchAll());

        respond(200, [
            'success' => true,
            'data' => [
                'bookings' => $bookings,
            ],
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'bookings' && count($segments) === 1) {
        requireAdminSession();

        $search = trim((string)($_GET['search'] ?? ''));
        $status = trim((string)($_GET['status'] ?? ''));
        $paymentStatus = trim((string)($_GET['paymentStatus'] ?? ''));

        $sql =
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
                b.updated_at,
                DATE_ADD(b.created_at, INTERVAL 12 HOUR) AS payment_due_at,
                CASE WHEN b.payment_status = "unpaid" AND b.status = "pending_payment" AND NOW() > DATE_ADD(b.created_at, INTERVAL 12 HOUR) THEN 1 ELSE 0 END AS is_overdue,
                a.public_id AS apartment_public_id,
                a.name AS apartment_name,
                a.location AS apartment_location,
                a.image_url AS apartment_image
             FROM bookings b
             JOIN apartments a ON a.id = b.apartment_id
             WHERE 1=1';
        $params = [];

        if ($search !== '') {
            $sql .= ' AND (
                LOWER(b.booking_number) LIKE :search
                OR LOWER(b.guest_name) LIKE :search
                OR LOWER(b.guest_email) LIKE :search
                OR LOWER(b.guest_phone) LIKE :search
                OR LOWER(a.name) LIKE :search
            )';
            $normalized = function_exists('mb_strtolower') ? mb_strtolower($search, 'UTF-8') : strtolower($search);
            $params['search'] = '%' . $normalized . '%';
        }

        if (in_array($status, ['pending', 'pending_payment', 'confirmed', 'cancelled'], true)) {
            $sql .= ' AND b.status = :status';
            $params['status'] = $status;
        }

        if (in_array($paymentStatus, ['unpaid', 'paid', 'failed'], true)) {
            $sql .= ' AND b.payment_status = :payment_status';
            $params['payment_status'] = $paymentStatus;
        }

        $sql .= ' ORDER BY b.created_at DESC, b.id DESC LIMIT 200';
        $stmt = db()->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->execute();

        $bookings = array_map(static fn(array $row): array => adminBookingPayload($row), $stmt->fetchAll());

        respond(200, [
            'success' => true,
            'data' => [
                'bookings' => $bookings,
            ],
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'payments' && count($segments) === 1) {
        requireAdminSession();

        $search = trim((string)($_GET['search'] ?? ''));
        $status = trim((string)($_GET['status'] ?? ''));
        $provider = trim((string)($_GET['provider'] ?? ''));

        $sql =
            'SELECT
                p.id,
                p.booking_id,
                p.provider,
                p.transaction_ref,
                p.amount,
                p.currency,
                p.status,
                p.paid_at,
                p.created_at,
                b.booking_number,
                b.status AS booking_status,
                b.payment_status AS booking_payment_status,
                b.guest_name,
                b.guest_email,
                a.public_id AS apartment_public_id,
                a.name AS apartment_name
             FROM payments p
             JOIN bookings b ON b.id = p.booking_id
             JOIN apartments a ON a.id = b.apartment_id
             WHERE 1=1';
        $params = [];

        if ($search !== '') {
            $sql .= ' AND (
                LOWER(p.transaction_ref) LIKE :search
                OR LOWER(b.booking_number) LIKE :search
                OR LOWER(b.guest_name) LIKE :search
                OR LOWER(b.guest_email) LIKE :search
                OR LOWER(a.name) LIKE :search
            )';
            $normalized = function_exists('mb_strtolower') ? mb_strtolower($search, 'UTF-8') : strtolower($search);
            $params['search'] = '%' . $normalized . '%';
        }

        if (in_array($status, ['initiated', 'successful', 'failed'], true)) {
            $sql .= ' AND p.status = :status';
            $params['status'] = $status;
        }

        if ($provider !== '') {
            $sql .= ' AND LOWER(p.provider) = :provider';
            $params['provider'] = function_exists('mb_strtolower') ? mb_strtolower($provider, 'UTF-8') : strtolower($provider);
        }

        $sql .= ' ORDER BY COALESCE(p.paid_at, p.created_at) DESC, p.id DESC LIMIT 200';
        $stmt = db()->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->execute();

        $payments = array_map(static fn(array $row): array => adminPaymentPayload($row), $stmt->fetchAll());

        respond(200, [
            'success' => true,
            'data' => [
                'payments' => $payments,
            ],
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'payments' && count($segments) === 2) {
        requireAdminSession();
        $paymentRef = trim((string)$segments[1]);

        if ($paymentRef === '') {
            respond(422, ['success' => false, 'message' => 'Payment reference is required.']);
        }

        $payment = fetchAdminPaymentByRef($paymentRef);
        if ($payment === null) {
            respond(404, ['success' => false, 'message' => 'Payment not found.']);
        }

        respond(200, [
            'success' => true,
            'data' => [
                'payment' => $payment,
            ],
        ]);
    }

    if ($method === 'GET' && $segments[0] === 'bookings' && count($segments) === 2) {
        requireAdminSession();
        $bookingRef = trim((string)$segments[1]);

        if ($bookingRef === '') {
            respond(422, ['success' => false, 'message' => 'Booking reference is required.']);
        }

        $booking = fetchAdminBookingByRef($bookingRef);
        if ($booking === null) {
            respond(404, ['success' => false, 'message' => 'Booking not found.']);
        }

        respond(200, [
            'success' => true,
            'data' => [
                'booking' => $booking,
            ],
        ]);
    }

    if ($method === 'PATCH' && $segments[0] === 'bookings' && count($segments) === 3 && ($segments[2] ?? '') === 'status') {
        requireAdminSession();
        $bookingRef = trim((string)$segments[1]);
        $input = jsonBody();
        $nextStatus = trim((string)($input['status'] ?? ''));

        if ($bookingRef === '' || !in_array($nextStatus, ['pending_payment', 'cancelled'], true)) {
            respond(422, ['success' => false, 'message' => 'Valid booking reference and status are required.']);
        }

        $pdo = db();
        $pdo->beginTransaction();

        $bookingStmt = $pdo->prepare(
            'SELECT id, booking_number, status, payment_status
             FROM bookings
             WHERE booking_number = :booking_ref OR id = :booking_id
             LIMIT 1
             FOR UPDATE'
        );
        $bookingStmt->execute([
            'booking_ref' => $bookingRef,
            'booking_id' => ctype_digit($bookingRef) ? (int)$bookingRef : 0,
        ]);
        $booking = $bookingStmt->fetch();

        if (!$booking) {
            $pdo->rollBack();
            respond(404, ['success' => false, 'message' => 'Booking not found.']);
        }

        if ((string)$booking['payment_status'] === 'paid' && $nextStatus !== 'cancelled') {
            $pdo->rollBack();
            respond(409, ['success' => false, 'message' => 'Paid bookings cannot be moved back to pending payment.']);
        }

        $updateStmt = $pdo->prepare('UPDATE bookings SET status = :status, updated_at = NOW() WHERE id = :id');
        $updateStmt->execute([
            'status' => $nextStatus,
            'id' => (int)$booking['id'],
        ]);

        $pdo->commit();

        $updatedBooking = fetchAdminBookingByRef((string)$booking['booking_number']);
        respond(200, [
            'success' => true,
            'data' => [
                'booking' => $updatedBooking,
            ],
        ]);
    }

    if ($method === 'POST' && $segments[0] === 'bookings' && count($segments) === 3 && ($segments[2] ?? '') === 'mark-paid-onsite') {
        requireAdminSession();
        $bookingRef = trim((string)$segments[1]);

        if ($bookingRef === '') {
            respond(422, ['success' => false, 'message' => 'Booking reference is required.']);
        }

        $pdo = db();
        $pdo->beginTransaction();

        $bookingStmt = $pdo->prepare(
            'SELECT id, booking_number, total_amount, status, payment_status
             FROM bookings
             WHERE booking_number = :booking_ref OR id = :booking_id
             LIMIT 1
             FOR UPDATE'
        );
        $bookingStmt->execute([
            'booking_ref' => $bookingRef,
            'booking_id' => ctype_digit($bookingRef) ? (int)$bookingRef : 0,
        ]);
        $booking = $bookingStmt->fetch();

        if (!$booking) {
            $pdo->rollBack();
            respond(404, ['success' => false, 'message' => 'Booking not found.']);
        }

        if ((string)$booking['payment_status'] === 'paid') {
            $pdo->commit();
            respond(200, [
                'success' => true,
                'data' => [
                    'bookingNumber' => (string)$booking['booking_number'],
                    'status' => 'already_paid',
                ],
            ]);
        }

        if ((string)$booking['status'] === 'cancelled') {
            $pdo->rollBack();
            respond(409, ['success' => false, 'message' => 'Cancelled booking cannot be marked as paid.']);
        }

        $transactionRef = sprintf('ONS-%s-%s', date('YmdHis'), strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)));

        $insertPayment = $pdo->prepare(
            'INSERT INTO payments (booking_id, provider, transaction_ref, amount, currency, status, paid_at)
             VALUES (:booking_id, "onsite-admin", :transaction_ref, :amount, "NGN", "successful", NOW())'
        );
        $insertPayment->execute([
            'booking_id' => (int)$booking['id'],
            'transaction_ref' => $transactionRef,
            'amount' => (float)$booking['total_amount'],
        ]);

        $updateBooking = $pdo->prepare('UPDATE bookings SET payment_status = "paid", status = "confirmed" WHERE id = :id');
        $updateBooking->execute(['id' => (int)$booking['id']]);

        $pdo->commit();

        respond(200, [
            'success' => true,
            'data' => [
                'bookingNumber' => (string)$booking['booking_number'],
                'transactionRef' => $transactionRef,
                'status' => 'confirmed',
            ],
        ]);
    }

    if ($method === 'POST' && $segments[0] === 'bookings' && count($segments) === 3 && ($segments[2] ?? '') === 'revoke-overdue-unpaid') {
        requireAdminSession();
        $bookingRef = trim((string)$segments[1]);

        if ($bookingRef === '') {
            respond(422, ['success' => false, 'message' => 'Booking reference is required.']);
        }

        $pdo = db();
        $pdo->beginTransaction();

        $bookingStmt = $pdo->prepare(
            'SELECT id, booking_number, status, payment_status, created_at,
                    DATE_ADD(created_at, INTERVAL 12 HOUR) AS payment_due_at
             FROM bookings
             WHERE booking_number = :booking_ref OR id = :booking_id
             LIMIT 1
             FOR UPDATE'
        );
        $bookingStmt->execute([
            'booking_ref' => $bookingRef,
            'booking_id' => ctype_digit($bookingRef) ? (int)$bookingRef : 0,
        ]);
        $booking = $bookingStmt->fetch();

        if (!$booking) {
            $pdo->rollBack();
            respond(404, ['success' => false, 'message' => 'Booking not found.']);
        }

        if ((string)$booking['status'] === 'cancelled') {
            $pdo->commit();
            respond(200, [
                'success' => true,
                'data' => [
                    'bookingNumber' => (string)$booking['booking_number'],
                    'status' => 'already_cancelled',
                ],
            ]);
        }

        if ((string)$booking['payment_status'] === 'paid') {
            $pdo->rollBack();
            respond(409, ['success' => false, 'message' => 'Paid booking cannot be revoked as unpaid overdue.']);
        }

        if ((string)$booking['status'] !== 'pending_payment' || (string)$booking['payment_status'] !== 'unpaid') {
            $pdo->rollBack();
            respond(409, ['success' => false, 'message' => 'Only pending unpaid bookings can be revoked by this action.']);
        }

        $isOverdue = strtotime((string)$booking['payment_due_at']) < time();
        if (!$isOverdue) {
            $pdo->rollBack();
            respond(409, ['success' => false, 'message' => 'Booking is not overdue yet and cannot be revoked.']);
        }

        $updateBooking = $pdo->prepare('UPDATE bookings SET status = "cancelled", updated_at = NOW() WHERE id = :id');
        $updateBooking->execute(['id' => (int)$booking['id']]);

        $pdo->commit();

        respond(200, [
            'success' => true,
            'data' => [
                'bookingNumber' => (string)$booking['booking_number'],
                'status' => 'revoked_overdue',
            ],
        ]);
    }

    respond(404, ['success' => false, 'message' => 'Admin route not found.']);
} catch (Throwable $error) {
    respond(500, [
        'success' => false,
        'message' => 'Server error',
        'error' => $error->getMessage(),
    ]);
}
