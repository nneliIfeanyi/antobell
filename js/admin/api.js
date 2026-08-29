/**
 * Admin API client.
 */
/**
 * Admin API source configuration.
 *
 * How to switch:
 * - Use local API: set MODE to 'local'
 * - Use live HTTPS API: set MODE to 'live'
 */
const ADMIN_API_CONFIG = {
    MODE: 'live', // 'local' or 'live'
    LIVE_BASE_URL: 'https://api.leadstar.com.ng/antobell/admin.php'
};

function adminApiBaseUrl() {
    if (ADMIN_API_CONFIG.MODE === 'live') {
        return ADMIN_API_CONFIG.LIVE_BASE_URL;
    }

    if (window.location.pathname.includes('/pages/admin/')) {
        return '../../api/admin.php';
    }

    return './api/admin.php';
}

/**
 * Perform an admin API request.
 *
 * @param {string} route - Admin route string.
 * @param {RequestInit} [options={}] - Fetch options.
 * @returns {Promise<any>} Parsed response payload.
 */
export async function adminRequest(route, options = {}) {
    const normalizedRoute = route.replace(/^\/+/, '');
    const separatorIndex = normalizedRoute.indexOf('?');
    const routePath = separatorIndex >= 0 ? normalizedRoute.slice(0, separatorIndex) : normalizedRoute;
    const routeQuery = separatorIndex >= 0 ? normalizedRoute.slice(separatorIndex + 1) : '';
    const baseUrl = adminApiBaseUrl();

    const url = new URL(baseUrl, window.location.href);
    url.searchParams.set('route', routePath);

    if (routeQuery) {
        const extraParams = new URLSearchParams(routeQuery);
        extraParams.forEach((value, key) => {
            url.searchParams.set(key, value);
        });
    }

    const requestHeaders = {
        ...(options.headers || {})
    };

    // Avoid forcing Content-Type on requests without body to reduce unnecessary CORS preflight noise.
    if (options.body !== undefined && options.body !== null && !('Content-Type' in requestHeaders)) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    let response;
    try {
        response = await fetch(url.toString(), {
            // 'include' is needed when MODE='live' and auth cookies come from another origin.
            credentials: url.origin === window.location.origin ? 'same-origin' : 'include',
            ...options,
            headers: requestHeaders
        });
    } catch (error) {
        const requestError = new Error('Unable to reach live admin API. Check CORS (Access-Control-Allow-Credentials with non-wildcard origin), HTTPS, and network availability.');
        requestError.status = 0;
        throw requestError;
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok || payload?.success === false) {
        const message = payload?.message || 'Admin request failed.';
        const requestError = new Error(message);
        requestError.status = response.status;
        throw requestError;
    }

    return payload?.data ?? null;
}

export function loginAdmin(credentials) {
    return adminRequest('auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
    });
}

export function logoutAdmin() {
    return adminRequest('auth/logout', {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export function getCurrentAdmin() {
    return adminRequest('auth/me');
}

export function changeAdminPassword(payload) {
    return adminRequest('auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function getDashboardSummary() {
    return adminRequest('dashboard/summary');
}

export function getPendingPaymentBookings() {
    return adminRequest('bookings/pending-payment');
}

export function getAdminBookings(params = {}) {
    const query = new URLSearchParams();

    if (params.search) {
        query.set('search', String(params.search));
    }

    if (params.status) {
        query.set('status', String(params.status));
    }

    if (params.paymentStatus) {
        query.set('paymentStatus', String(params.paymentStatus));
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return adminRequest(`bookings${suffix}`);
}

export function getAdminBooking(bookingRef) {
    return adminRequest(`bookings/${encodeURIComponent(String(bookingRef))}`);
}

export function updateAdminBookingStatus(bookingRef, status) {
    return adminRequest(`bookings/${encodeURIComponent(String(bookingRef))}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
}

export function checkOutBookingNow(bookingRef) {
    return adminRequest(`bookings/${encodeURIComponent(String(bookingRef))}/check-out-now`, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export function updateAdminBookingCheckoutDate(bookingRef, newCheckOut, reason = '') {
    return adminRequest(`bookings/${encodeURIComponent(String(bookingRef))}/checkout-date`, {
        method: 'PATCH',
        body: JSON.stringify({ newCheckOut, reason })
    });
}

export function getAdminPayments(params = {}) {
    const query = new URLSearchParams();

    if (params.search) {
        query.set('search', String(params.search));
    }

    if (params.status) {
        query.set('status', String(params.status));
    }

    if (params.provider) {
        query.set('provider', String(params.provider));
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return adminRequest(`payments${suffix}`);
}

export function getAdminPayment(paymentRef) {
    return adminRequest(`payments/${encodeURIComponent(String(paymentRef))}`);
}

export function markBookingPaidOnsite(bookingRef) {
    return adminRequest(`bookings/${encodeURIComponent(String(bookingRef))}/mark-paid-onsite`, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export function revokeOverdueUnpaidBooking(bookingRef) {
    return adminRequest(`bookings/${encodeURIComponent(String(bookingRef))}/revoke-overdue-unpaid`, {
        method: 'POST',
        body: JSON.stringify({})
    });
}

export function getAdminApartments(params = {}) {
    const query = new URLSearchParams();

    if (params.search) {
        query.set('search', String(params.search));
    }

    if (params.active === 0 || params.active === 1) {
        query.set('active', String(params.active));
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return adminRequest(`apartments${suffix}`);
}

export function getAdminApartment(publicId) {
    return adminRequest(`apartments/${encodeURIComponent(String(publicId))}`);
}

export function createAdminApartment(payload) {
    return adminRequest('apartments', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function updateAdminApartment(publicId, payload) {
    return adminRequest(`apartments/${encodeURIComponent(String(publicId))}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });
}

export function deactivateAdminApartment(publicId) {
    return adminRequest(`apartments/${encodeURIComponent(String(publicId))}`, {
        method: 'DELETE',
        body: JSON.stringify({})
    });
}

export function hardDeleteAdminApartment(publicId, confirmationText) {
    return adminRequest(`apartments/${encodeURIComponent(String(publicId))}/hard-delete`, {
        method: 'POST',
        body: JSON.stringify({ confirmationText })
    });
}

export function getAdminSettingsBundle() {
    return adminRequest('settings');
}

export function updateUnpaidRevokeHours(hours) {
    return adminRequest('settings/unpaid-window', {
        method: 'POST',
        body: JSON.stringify({ hours })
    });
}

export function createAdminUser(payload) {
    return adminRequest('settings/admin-users', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function updateAdminUserPassword(adminUserId, payload) {
    return adminRequest(`settings/admin-users/${encodeURIComponent(String(adminUserId))}/password`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function createAdminTestimonial(payload) {
    return adminRequest('settings/testimonials', {
        method: 'POST',
        body: JSON.stringify(payload)
    });
}

export function updateAdminTestimonial(testimonialId, payload) {
    return adminRequest(`settings/testimonials/${encodeURIComponent(String(testimonialId))}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
    });
}

export function deleteAdminTestimonial(testimonialId) {
    return adminRequest(`settings/testimonials/${encodeURIComponent(String(testimonialId))}`, {
        method: 'DELETE',
        body: JSON.stringify({})
    });
}
