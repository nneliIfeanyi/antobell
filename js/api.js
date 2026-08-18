/**
 * API Configuration and Data Access Layer
 *
 * Centralized endpoint configuration and request helpers for the booking app.
 */
// You can change the BASE_URL in the API object to your HTTPS endpoint.
// For example, if your endpoint is "https://api.example.com/", you would modify the BASE_URL like this:
const API = {
    BASE_URL: 'https://api.leadstar.com.ng/antobell/',
    ENDPOINTS: {
        apartments: 'apartments',
        apartment: 'apartments/',
        publicSettings: 'settings/public',
        availability: 'booking/check',
        booking: 'booking/create',
        payment: 'payment',
        bookingById: 'booking/'
    }
};

// const API = {
//     BASE_URL: window.location.pathname.includes('/pages/') ? '../api/' : './api/',
//     ENDPOINTS: {
//         apartments: 'apartments',
//         apartment: 'apartments/',
//         availability: 'booking/check',
//         booking: 'booking/create',
//         payment: 'payment',
//         bookingById: 'booking/'
//     }
// };

/**
 * Build an absolute API URL.
 *
 * @param {string} path - API endpoint path.
 * @returns {string} Full request URL.
 */
export function buildUrl(path) {
    return `${API.BASE_URL}${path}`;
}

/**
 * Perform an HTTP request.
 *
 * @param {string} path - API endpoint path.
 * @param {RequestInit} [options={}] - Fetch options.
 * @returns {Promise<any>} Parsed JSON payload.
 */
export async function request(path, options = {}) {
    const response = await fetch(buildUrl(path), {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok) {
        const message = payload?.message || 'Request failed';
        const requestError = new Error(message);
        requestError.status = response.status;
        requestError.code = payload?.code || null;
        throw requestError;
    }

    if (payload && payload.success === false) {
        const requestError = new Error(payload.message || 'API request failed');
        requestError.status = response.status;
        requestError.code = payload?.code || null;
        throw requestError;
    }

    return payload;
}

/**
 * Fetch all active apartments.
 *
 * @returns {Promise<Array>} Active apartment list.
 */
export async function getApartments() {
    const data = await request(API.ENDPOINTS.apartments);
    return Array.isArray(data?.data) ? data.data : [];
}

/**
 * Fetch the apartments selected for the homepage.
 *
 * @returns {Promise<Array>} Featured apartment list.
 */
export async function getFeaturedApartments() {
    const data = await request(`${API.ENDPOINTS.apartments}?featured=1`);
    return Array.isArray(data?.data) ? data.data : [];
}

/**
 * Search apartments by query.
 *
 * @param {Object} criteria - Search criteria.
 * @param {string} criteria.destination - Destination text.
 * @param {string} criteria.checkIn - Check-in date.
 * @param {string} criteria.checkOut - Check-out date.
 * @param {string} criteria.guests - Guest count.
 * @returns {Promise<Array>} Matching apartments.
 */
export async function searchApartments(criteria) {
    const query = new URLSearchParams();
    const destination = String(criteria?.destination || '').trim();
    const checkIn = String(criteria?.checkIn || '').trim();
    const checkOut = String(criteria?.checkOut || '').trim();

    if (destination) {
        query.set('destination', destination);
    }

    if (checkIn && checkOut) {
        query.set('checkIn', checkIn);
        query.set('checkOut', checkOut);
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const data = await request(`${API.ENDPOINTS.apartments}${suffix}`);
    return Array.isArray(data?.data) ? data.data : [];
}

/**
 * Fetch a single apartment from the local mock dataset.
 *
 * @param {string} apartmentId - Apartment identifier.
 * @returns {Promise<Object|null>} Matching apartment or null.
 */
export async function getApartmentById(apartmentId) {
    try {
        const data = await request(`${API.ENDPOINTS.apartment}${encodeURIComponent(apartmentId)}`);
        return data?.data || null;
    } catch (error) {
        return null;
    }
}

/**
 * Search apartments with filter constraints.
 *
 * @param {Object} filters - Search filter state.
 * @param {string} filters.destination - Destination keyword.
 * @param {number} filters.maxPrice - Maximum nightly price.
 * @param {number} filters.bedrooms - Minimum bedroom count.
 * @param {number} filters.bathrooms - Minimum bathroom count.
 * @param {string[]} filters.amenities - Required amenities.
 * @param {number} filters.rating - Minimum rating.
 * @returns {Promise<Array>} Filtered apartments.
 */
export async function searchApartmentsWithFilters(filters = {}) {
    const apartments = await searchApartments(filters);
    const maxPrice = Number(filters.maxPrice || 1000);
    const bedrooms = Number(filters.bedrooms || 0);
    const bathrooms = Number(filters.bathrooms || 0);
    const rating = Number(filters.rating || 0);
    const requiredAmenities = Array.isArray(filters.amenities) ? filters.amenities : [];

    return apartments.filter((apartment) => {
        const priceMatches = Number(apartment.pricePerNight || 0) <= maxPrice;
        const bedroomMatches = Number(apartment.bedrooms || 0) >= bedrooms;
        const bathroomMatches = Number(apartment.bathrooms || 0) >= bathrooms;
        const ratingMatches = Number(apartment.rating || 0) >= rating;
        const amenityMatches = requiredAmenities.every((amenity) => (apartment.amenities || []).includes(amenity));

        return priceMatches && bedroomMatches && bathroomMatches && ratingMatches && amenityMatches;
    });
}

/**
 * Get apartments similar to the current apartment.
 *
 * @param {Object} apartment - Selected apartment.
 * @returns {Promise<Array>} Similar apartments.
 */
export async function getSimilarApartments(apartment) {
    const apartments = await getApartments();
    return apartments.filter((item) => item.id !== apartment?.id).slice(0, 3);
}

/**
 * Check whether an apartment is available for the selected dates.
 *
 * @param {Object} payload - Availability payload.
 * @returns {Promise<Object>} Availability result.
 */
export async function checkBookingAvailability(payload) {
    const data = await request(API.ENDPOINTS.availability, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    return data?.data || { available: false };
}

/**
 * Create a booking draft on the backend.
 *
 * @param {Object} payload - Booking payload.
 * @returns {Promise<Object>} Booking result.
 */
export async function createBooking(payload) {
    const data = await request(API.ENDPOINTS.booking, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    return data?.data || null;
}

/**
 * Process a booking payment.
 *
 * @param {Object} payload - Payment payload.
 * @returns {Promise<Object>} Payment result.
 */
export async function processPayment(payload) {
    const data = await request(API.ENDPOINTS.payment, {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    return data?.data || null;
}

/**
 * Fetch a booking by booking number or numeric ID.
 *
 * @param {string} bookingRef - Booking number or ID.
 * @returns {Promise<Object|null>} Booking details.
 */
export async function getBookingById(bookingRef) {
    try {
        const data = await request(`${API.ENDPOINTS.bookingById}${encodeURIComponent(bookingRef)}`);
        return data?.data || null;
    } catch (error) {
        return null;
    }
}

/**
 * Fetch public-facing site settings (testimonials and booking policy).
 *
 * @returns {Promise<Object>} Public settings payload.
 */
export async function getPublicSettings() {
    const data = await request(API.ENDPOINTS.publicSettings);
    return data?.data || { unpaidRevokeHours: 3, testimonials: [] };
}

export default API;
