CREATE DATABASE IF NOT EXISTS antobell_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE antobell_booking;

CREATE TABLE IF NOT EXISTS apartments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    public_id VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(180) NOT NULL,
    address VARCHAR(220) NOT NULL,
    description TEXT NOT NULL,
    house_rules_json TEXT NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    bedrooms TINYINT UNSIGNED NOT NULL,
    bathrooms TINYINT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    badge VARCHAR(80) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS apartment_amenities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    apartment_id INT UNSIGNED NOT NULL,
    amenity VARCHAR(80) NOT NULL,
    CONSTRAINT fk_apartment_amenities_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    INDEX idx_apartment_amenities_apartment (apartment_id)
);

CREATE TABLE IF NOT EXISTS apartment_gallery (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    apartment_id INT UNSIGNED NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    sort_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT fk_apartment_gallery_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    INDEX idx_apartment_gallery_apartment (apartment_id)
);

CREATE TABLE IF NOT EXISTS apartment_reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    apartment_id INT UNSIGNED NOT NULL,
    reviewer_name VARCHAR(120) NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apartment_reviews_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
    INDEX idx_apartment_reviews_apartment (apartment_id)
);

CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_number VARCHAR(40) NOT NULL UNIQUE,
    apartment_id INT UNSIGNED NOT NULL,
    guest_name VARCHAR(140) NOT NULL,
    guest_email VARCHAR(180) NOT NULL,
    guest_phone VARCHAR(40) NOT NULL,
    special_requests TEXT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests TINYINT UNSIGNED NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    taxes DECIMAL(10,2) NOT NULL,
    fees DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'pending_payment', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending_payment',
    payment_status ENUM('unpaid', 'paid', 'failed') NOT NULL DEFAULT 'unpaid',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_apartment FOREIGN KEY (apartment_id) REFERENCES apartments(id),
    INDEX idx_bookings_apartment (apartment_id),
    INDEX idx_bookings_dates (check_in, check_out)
);

CREATE TABLE IF NOT EXISTS payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    provider VARCHAR(80) NOT NULL DEFAULT 'manual-test',
    transaction_ref VARCHAR(80) NOT NULL UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'NGN',
    status ENUM('initiated', 'successful', 'failed') NOT NULL DEFAULT 'successful',
    paid_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_payments_booking (booking_id)
);

CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(140) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    session_token_hash CHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_sessions_user FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
    INDEX idx_admin_sessions_user (admin_user_id),
    INDEX idx_admin_sessions_expiry (expires_at)
);

INSERT INTO admin_users (full_name, email, password_hash, is_active)
VALUES ('ANTOBELL Admin', 'admin@antobell.local', '$2y$10$c4AlS4YsM2LsYrB1G0TuMu/JOR/xcRMgo.jvxrDapx5jDwHmolCAa', 1)
ON DUPLICATE KEY UPDATE
full_name = VALUES(full_name),
password_hash = VALUES(password_hash),
is_active = VALUES(is_active);

INSERT INTO apartments
(public_id, name, location, address, description, house_rules_json, rating, price_per_night, bedrooms, bathrooms, image_url, badge)
VALUES
('apt-101', 'Luma Residence', 'Downtown Dubai, UAE', '128 Marina Vista, Downtown Dubai', 'A bright, contemporary apartment with soft textures, skyline views, and a calm premium atmosphere for business and leisure travelers.', '["No smoking", "No pets", "Quiet hours after 10 PM"]', 4.9, 189.00, 2, 2, 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80', 'Popular choice'),
('apt-102', 'Harbor Light Suites', 'Vancouver, Canada', '44 Harbour Crescent, Coal Harbour', 'An airy waterfront stay with generous living space and refined finishes for longer trips.', '["No smoking", "No parties", "Check-in after 3 PM"]', 4.8, 214.00, 3, 2, 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80', 'New listing'),
('apt-103', 'Solstice Loft', 'Barcelona, Spain', '18 Passeig del Sol, Eixample', 'A stylish loft with natural light, a private balcony, and a warm design language for a memorable city stay.', '["No smoking", "No loud music", "Self check-in only"]', 4.9, 165.00, 1, 1, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', 'Best value'),
('apt-104', 'The Crest Apartments', 'Singapore', '72 Orchard Skyline Road, Central', 'A premium high-rise apartment with upscale amenities, ideal for guests who want comfort and access.', '["No smoking", "No pets", "Visitor registration required"]', 4.7, 238.00, 2, 3, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', 'Verified host')
ON DUPLICATE KEY UPDATE
name = VALUES(name),
location = VALUES(location),
address = VALUES(address),
description = VALUES(description),
house_rules_json = VALUES(house_rules_json),
rating = VALUES(rating),
price_per_night = VALUES(price_per_night),
bedrooms = VALUES(bedrooms),
bathrooms = VALUES(bathrooms),
image_url = VALUES(image_url),
badge = VALUES(badge),
is_active = 1;

INSERT INTO apartment_amenities (apartment_id, amenity)
SELECT a.id, t.amenity
FROM apartments a
JOIN (
    SELECT 'apt-101' AS public_id, 'Wi-Fi' AS amenity UNION ALL
    SELECT 'apt-101', 'Pool' UNION ALL
    SELECT 'apt-101', 'Kitchen' UNION ALL
    SELECT 'apt-101', 'Gym' UNION ALL
    SELECT 'apt-102', 'Wi-Fi' UNION ALL
    SELECT 'apt-102', 'Workspace' UNION ALL
    SELECT 'apt-102', 'Washer' UNION ALL
    SELECT 'apt-102', 'Parking' UNION ALL
    SELECT 'apt-103', 'Wi-Fi' UNION ALL
    SELECT 'apt-103', 'Kitchen' UNION ALL
    SELECT 'apt-103', 'Balcony' UNION ALL
    SELECT 'apt-103', 'Air conditioning' UNION ALL
    SELECT 'apt-104', 'Wi-Fi' UNION ALL
    SELECT 'apt-104', 'Gym' UNION ALL
    SELECT 'apt-104', 'Pool' UNION ALL
    SELECT 'apt-104', 'Parking'
) t ON t.public_id = a.public_id
WHERE NOT EXISTS (
    SELECT 1
    FROM apartment_amenities aa
    WHERE aa.apartment_id = a.id AND aa.amenity = t.amenity
);

INSERT INTO apartment_gallery (apartment_id, image_url, sort_order)
SELECT a.id, t.image_url, t.sort_order
FROM apartments a
JOIN (
    SELECT 'apt-101' AS public_id, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80' AS image_url, 1 AS sort_order UNION ALL
    SELECT 'apt-101', 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1600&q=80', 2 UNION ALL
    SELECT 'apt-101', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80', 3 UNION ALL
    SELECT 'apt-101', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80', 4 UNION ALL
    SELECT 'apt-102', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80', 1 UNION ALL
    SELECT 'apt-102', 'https://images.unsplash.com/photo-1560448075-bb3d2f8b4a5b?auto=format&fit=crop&w=1600&q=80', 2 UNION ALL
    SELECT 'apt-102', 'https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1600&q=80', 3 UNION ALL
    SELECT 'apt-102', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80', 4 UNION ALL
    SELECT 'apt-103', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80', 1 UNION ALL
    SELECT 'apt-103', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80', 2 UNION ALL
    SELECT 'apt-103', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80', 3 UNION ALL
    SELECT 'apt-103', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80', 4 UNION ALL
    SELECT 'apt-104', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80', 1 UNION ALL
    SELECT 'apt-104', 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80', 2 UNION ALL
    SELECT 'apt-104', 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1600&q=80', 3 UNION ALL
    SELECT 'apt-104', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80', 4
) t ON t.public_id = a.public_id
WHERE NOT EXISTS (
    SELECT 1
    FROM apartment_gallery g
    WHERE g.apartment_id = a.id
      AND g.image_url = t.image_url
);

INSERT INTO apartment_reviews (apartment_id, reviewer_name, rating, comment)
SELECT a.id, t.reviewer_name, t.rating, t.comment
FROM apartments a
JOIN (
    SELECT 'apt-101' AS public_id, 'Daniel K.' AS reviewer_name, 5.0 AS rating, 'Everything felt polished and easy from arrival to checkout.' AS comment UNION ALL
    SELECT 'apt-101', 'Aisha M.', 5.0, 'Beautiful interiors and a booking flow that felt trustworthy.' UNION ALL
    SELECT 'apt-102', 'Lina R.', 4.9, 'Great location and a smooth process from search to confirmation.' UNION ALL
    SELECT 'apt-102', 'Marcus T.', 5.0, 'Spacious, quiet, and exactly as described.' UNION ALL
    SELECT 'apt-103', 'Nora S.', 5.0, 'The apartment felt elevated and intimate at the same time.' UNION ALL
    SELECT 'apt-103', 'Ethan P.', 4.8, 'Excellent balance of comfort, design, and location.' UNION ALL
    SELECT 'apt-104', 'Sophia L.', 4.8, 'Very polished and comfortable. The process was seamless.' UNION ALL
    SELECT 'apt-104', 'Adam J.', 4.7, 'Great amenities and a very professional booking experience.'
) t ON t.public_id = a.public_id
WHERE NOT EXISTS (
    SELECT 1
    FROM apartment_reviews r
    WHERE r.apartment_id = a.id
      AND r.reviewer_name = t.reviewer_name
      AND r.comment = t.comment
);
