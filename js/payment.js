/**
 * Payment Controller
 *
 * Processes a simulated payment against the backend and then redirects to
 * the booking success page with the backend booking number.
 */

import { processPayment } from './api.js';
import { toPagePath } from './helper.js';
import { showToast } from './toast.js';

const params = new URLSearchParams(window.location.search);
const apartmentId = params.get('apartmentId') || '';

/**
 * Read persisted checkout draft.
 *
 * @returns {Object|null} Checkout draft.
 */
function getCheckoutDraft() {
    const raw = window.sessionStorage.getItem('checkoutDraft');
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

/**
 * Update status copy on the page.
 *
 * @param {string} text - Message to show.
 * @param {'neutral' | 'success' | 'error'} type - Visual status type.
 * @returns {void}
 */
function setStatus(text, type = 'neutral') {
    const status = document.getElementById('paymentStatus');
    if (!status) {
        return;
    }

    status.textContent = text;
    status.classList.remove('text-slate-600', 'text-emerald-700', 'text-rose-700');

    if (type === 'success') {
        status.classList.add('text-emerald-700');
        return;
    }

    if (type === 'error') {
        status.classList.add('text-rose-700');
        return;
    }

    status.classList.add('text-slate-600');
}

/**
 * Initialize payment behavior.
 *
 * @returns {void}
 */
function initPayment() {
    const confirmButton = document.getElementById('confirmPaymentButton');
    const draft = getCheckoutDraft();

    if (!confirmButton || !draft?.bookingNumber) {
        setStatus('Missing booking draft. Please return to checkout and try again.', 'error');
        showToast('Missing booking draft. Please return to checkout and try again.', 'error');
        if (confirmButton) {
            confirmButton.setAttribute('disabled', 'disabled');
        }
        return;
    }

    confirmButton.addEventListener('click', async () => {
        confirmButton.setAttribute('disabled', 'disabled');
        const originalText = confirmButton.textContent;
        confirmButton.textContent = 'Processing payment...';
        setStatus('Contacting payment endpoint...', 'neutral');

        try {
            const payment = await processPayment({
                bookingNumber: draft.bookingNumber,
                amount: draft.totalAmount,
                currency: 'NGN',
                provider: 'manual-test'
            });

            setStatus('Payment successful. Redirecting to confirmation...', 'success');
            showToast('Payment successful. Redirecting to confirmation...', 'success');

            if (payment?.transactionRef) {
                window.sessionStorage.setItem('paymentTransactionRef', payment.transactionRef);
            }

            window.setTimeout(() => {
                window.location.href = toPagePath('booking-success.html', `apartmentId=${encodeURIComponent(apartmentId)}&bookingNumber=${encodeURIComponent(draft.bookingNumber)}`);
            }, 700);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Payment failed. Try again.';
            setStatus(errorMessage, 'error');
            showToast(errorMessage, 'error');
            confirmButton.removeAttribute('disabled');
            confirmButton.textContent = originalText;
        }
    });
}

initPayment();
