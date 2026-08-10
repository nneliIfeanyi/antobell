/**
 * Shared toast notification helper.
 */

import { renderToast } from './ui.js';

const TOAST_DURATION_MS = 3200;

/**
 * Ensure there is a toast region in the current page.
 *
 * @returns {HTMLElement} Toast region element.
 */
function ensureToastRegion() {
    let region = document.getElementById('toastRegion');

    if (!region) {
        region = document.createElement('div');
        region.id = 'toastRegion';
        region.className = 'pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-3';
        document.body.appendChild(region);
    }

    return region;
}

/**
 * Show a toast message.
 *
 * @param {string} message - Toast message text.
 * @param {'success'|'error'} [type='success'] - Toast type.
 * @returns {void}
 */
export function showToast(message, type = 'success') {
    const toastRegion = ensureToastRegion();
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const toastWrapper = document.createElement('div');

    toastWrapper.id = toastId;
    toastWrapper.innerHTML = renderToast(message, type);
    toastRegion.appendChild(toastWrapper);

    window.setTimeout(() => {
        toastWrapper.classList.add('transition', 'duration-300', 'opacity-0', 'translate-y-2');
    }, TOAST_DURATION_MS - 300);

    window.setTimeout(() => {
        toastWrapper.remove();
    }, TOAST_DURATION_MS);
}
