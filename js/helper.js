/**
 * Helper Utilities
 *
 * Provides reusable utility functions for formatting, accessibility, and UI state
 * management used throughout the booking frontend.
 */

/**
 * Format a number as currency.
 *
 * @param {number} value - Numeric price value.
 * @param {string} [currency='NGN'] - Currency code.
 * @returns {string} Formatted currency string.
 */
export function formatCurrency(value, currency = 'NGN') {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0
    }).format(value);
}

/**
 * Format a numeric rating to one decimal place.
 *
 * @param {number} rating - Apartment rating.
 * @returns {string} Normalized rating text.
 */
export function formatRating(rating) {
    return Number(rating || 0).toFixed(1);
}

/**
 * Safely escape HTML content.
 *
 * @param {string} value - Raw string value.
 * @returns {string} Escaped HTML string.
 */
export function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

/**
 * Create a debounced function wrapper.
 *
 * @param {Function} callback - Function to debounce.
 * @param {number} delay - Delay in milliseconds.
 * @returns {Function} Debounced function.
 */
export function debounce(callback, delay = 300) {
    let timeoutId;

    return (...args) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => callback(...args), delay);
    };
}

/**
 * Generate a simple unique identifier for UI state.
 *
 * @param {string} prefix - ID prefix.
 * @returns {string} Generated identifier.
 */
export function createId(prefix = 'id') {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Determine whether the current page is inside the pages directory.
 *
 * @returns {boolean} True when the active page lives under /pages.
 */
export function isSubPage() {
    return window.location.pathname.includes('/pages/');
}

/**
 * Build a link to the home page.
 *
 * @param {string} [anchor=''] - Optional anchor target.
 * @returns {string} Home URL.
 */
export function toHomePath(anchor = '') {
    const homePath = isSubPage() ? '../index.html' : './index.html';
    return anchor ? `${homePath}#${anchor}` : homePath;
}

/**
 * Build a link to a page under the pages directory.
 *
 * @param {string} pageName - Page filename.
 * @param {string} [query=''] - Optional query string without the leading question mark.
 * @returns {string} Page URL.
 */
export function toPagePath(pageName, query = '') {
    const basePath = isSubPage() ? '../pages' : './pages';
    return `${basePath}/${pageName}${query ? `?${query}` : ''}`;
}
