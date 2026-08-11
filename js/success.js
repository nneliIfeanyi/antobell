/**
 * Booking Success Controller
 *
 * Renders the final confirmation screen, surfaces the booking number and stay
 * details, and provides next-step actions after checkout.
 */

import { getApartmentById, getPublicSettings } from './api.js';
import { formatCurrency, formatRating, toHomePath, toPagePath } from './helper.js';
import { renderApp, renderEmptyState, renderErrorState, renderFooter, renderNavbar } from './ui.js';

const app = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const apartmentId = params.get('apartmentId') || 'apt-101';
const bookingNumberFromQuery = params.get('bookingNumber') || '';

/**
 * Generate a display-friendly booking number.
 *
 * @returns {string} Booking number string.
 */
function generateBookingNumber() {
  return `AST-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
}

/**
 * Read the confirmed booking draft from storage.
 *
 * @returns {Object|null} Booking draft or null.
 */
function getBookingDraft() {
  const checkoutDraft = window.sessionStorage.getItem('checkoutDraft');

  if (!checkoutDraft) {
    return null;
  }

  try {
    return JSON.parse(checkoutDraft);
  } catch (error) {
    return null;
  }
}

/**
 * Format an ISO date string for local display.
 *
 * @param {string} isoDate - ISO date string.
 * @returns {string} Formatted date and time.
 */
function formatDateTime(isoDate, unpaidRevokeHours = 3) {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return `Within ${unpaidRevokeHours} hours`;
  }

  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(parsed);
}

/**
 * Build the success page markup.
 *
 * @param {Object} apartment - Apartment data object.
 * @param {Object} bookingDraft - Booking draft data.
 * @param {string} bookingNumber - Booking number.
 * @returns {string} Success page HTML.
 */
function buildSuccessPage(apartment, bookingDraft, bookingNumber, unpaidRevokeHours) {
  const guests = Number(bookingDraft.guests || 2);
  const paymentDueAt = bookingDraft.paymentDueAt || new Date(Date.now() + (Number(unpaidRevokeHours || 3) * 60 * 60 * 1000)).toISOString();

  return `
    ${renderNavbar()}
    <main class="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section class="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-soft">
        <div class="bg-hero-pattern px-6 py-10 text-center sm:px-10 sm:py-14">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600 shadow-soft animate-popIn">✓</div>
          <h1 class="mt-6 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Booking received and reserved</h1>
          <p class="mt-3 text-slate-600">Your reservation hold is active. Complete onsite payment within ${unpaidRevokeHours} hours to keep this booking.</p>
        </div>
        <div class="grid gap-8 px-6 py-8 sm:px-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div class="space-y-6">
            <div class="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Booking number</p>
              <p class="mt-2 text-2xl font-semibold text-slate-900">${bookingNumber}</p>
              <p class="mt-2 text-sm text-slate-500">Keep this number for your records and future support requests.</p>
            </div>
            <div class="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6">
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">Payment deadline</p>
              <p class="mt-2 text-xl font-semibold text-rose-900">${formatDateTime(paymentDueAt, unpaidRevokeHours)}</p>
              <p class="mt-2 text-sm text-rose-800">If payment is not made onsite within ${unpaidRevokeHours} hours, this booking will be revoked automatically.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-[1.5rem] border border-slate-200 p-5">
                <p class="text-sm text-slate-500">Apartment</p>
                <p class="mt-2 text-lg font-semibold text-slate-900">${apartment.name}</p>
                <p class="mt-1 text-sm text-slate-600">${apartment.location}</p>
              </div>
              <div class="rounded-[1.5rem] border border-slate-200 p-5">
                <p class="text-sm text-slate-500">Guest count</p>
                <p class="mt-2 text-lg font-semibold text-slate-900">${guests} guests</p>
                <p class="mt-1 text-sm text-slate-600">Rating ${formatRating(apartment.rating)} • ${formatCurrency(apartment.pricePerNight)} / night</p>
              </div>
              <div class="rounded-[1.5rem] border border-slate-200 p-5">
                <p class="text-sm text-slate-500">Check-in</p>
                <p class="mt-2 text-lg font-semibold text-slate-900">${bookingDraft.checkIn || 'Pending'}</p>
              </div>
              <div class="rounded-[1.5rem] border border-slate-200 p-5">
                <p class="text-sm text-slate-500">Check-out</p>
                <p class="mt-2 text-lg font-semibold text-slate-900">${bookingDraft.checkOut || 'Pending'}</p>
              </div>
            </div>
          </div>
          <aside class="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
            <img src="${apartment.image}" alt="${apartment.name}" class="h-52 w-full rounded-[1.25rem] object-cover" loading="lazy" />
            <h2 class="mt-5 text-xl font-semibold text-slate-900">What happens next</h2>
            <ul class="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>• Visit the property reception to make onsite payment.</li>
              <li>• Bring your booking number and a valid ID for verification.</li>
              <li>• Complete payment before the deadline to avoid revocation.</li>
            </ul>
          </aside>
        </div>
        <div class="flex flex-col gap-3 border-t border-slate-200 px-6 py-6 sm:flex-row sm:px-10">
          <a href="${toPagePath('apartments.html')}" class="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700">Browse more apartments</a>
          <a href="${toHomePath()}" class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Return home</a>
        </div>
      </section>
    </main>
    ${renderFooter()}
  `;
}

/**
 * Initialize the success page.
 *
 * @returns {Promise<void>} Initialization promise.
 */
async function initSuccessPage() {
  const bookingDraft = getBookingDraft();

  if (!bookingDraft) {
    renderApp(app, `${renderNavbar()}<main class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">${renderEmptyState('No booking found', 'Complete the checkout flow to view your confirmation.')}</main>${renderFooter()}`);
    return;
  }

  const apartment = await getApartmentById(bookingDraft.apartmentId || apartmentId);
  if (!apartment) {
    renderApp(app, `${renderNavbar()}<main class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">${renderErrorState('Confirmation unavailable', 'We could not load the reserved apartment.')}</main>${renderFooter()}`);
    return;
  }

  let unpaidRevokeHours = 3;
  try {
    const settings = await getPublicSettings();
    unpaidRevokeHours = Number(settings?.unpaidRevokeHours || 3);
  } catch (error) {
    unpaidRevokeHours = 3;
  }

  const bookingNumber = bookingNumberFromQuery || bookingDraft.bookingNumber || generateBookingNumber();
  document.title = `Booking Success | ${apartment.name}`;
  window.sessionStorage.setItem('bookingNumber', bookingNumber);
  renderApp(app, buildSuccessPage(apartment, bookingDraft, bookingNumber, unpaidRevokeHours));
  window.sessionStorage.removeItem('bookingDraft');
  window.sessionStorage.removeItem('checkoutDraft');
}

initSuccessPage().catch(() => {
  if (app) {
    app.innerHTML = `${renderNavbar()}<main class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">${renderErrorState('Confirmation unavailable', 'Please refresh the page and try again.')}</main>${renderFooter()}`;
  }
});
