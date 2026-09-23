/**
 * Admin bookings controller.
 */

import {
    getAdminBooking,
    getAdminBookings,
    getCurrentAdmin,
    logoutAdmin,
    markBookingPaidOnsite,
    revokeOverdueUnpaidBooking,
    checkOutBookingNow,
    updateAdminBookingCheckoutDate,
    updateAdminBookingStatus
} from './api.js';
import { formatCurrency } from '../helper.js';
import { bindAdminMobileMenu, enhanceResponsiveTables, renderAdminHeader } from './layout.js';
import { showToast } from '../toast.js';

const app = document.getElementById('app');
const BOOKING_PAGE_SIZE = 10;
const state = {
    admin: null,
    bookings: [],
    selectedBooking: null,
    search: '',
    page: 1,
    filters: {
        status: 'all',
        paymentStatus: 'all'
    }
};

function adminLoginPath() {
    return './login.html';
}

function adminDashboardPath() {
    return './index.html';
}

function adminApartmentsPath() {
    return './apartments.html';
}

function adminPaymentsPath() {
    return './payments.html';
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value || '-';
    }

    return new Intl.DateTimeFormat('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date);
}

function statusBadge(status) {
    const styles = {
        pending_payment: 'border-amber-200 bg-amber-50 text-amber-700',
        confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        checked_out: 'border-sky-200 bg-sky-50 text-sky-700',
        cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
        pending: 'border-slate-200 bg-slate-100 text-slate-700',
    };

    const className = styles[status] || styles.pending;
    return `<span class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${className}">${escapeHtml(String(status || '').replace('_', ' '))}</span>`;
}

function paymentBadge(status) {
    const styles = {
        unpaid: 'border-rose-200 bg-rose-50 text-rose-700',
        paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        failed: 'border-amber-200 bg-amber-50 text-amber-700',
    };

    const className = styles[status] || 'border-slate-200 bg-slate-100 text-slate-700';
    return `<span class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${className}">${escapeHtml(String(status || 'unknown'))}</span>`;
}

function selectedBookingRef() {
    return state.selectedBooking?.bookingNumber || '';
}

function filteredBookings() {
    const search = state.search.trim().toLowerCase();
    if (!search) {
        return state.bookings;
    }

    return state.bookings.filter((booking) => String(booking.bookingNumber || '').toLowerCase().includes(search));
}

function paginatedBookings() {
    const filtered = filteredBookings();
    const totalPages = Math.max(1, Math.ceil(filtered.length / BOOKING_PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * BOOKING_PAGE_SIZE;

    return {
        rows: filtered.slice(start, start + BOOKING_PAGE_SIZE),
        total: filtered.length,
        totalPages,
        start: filtered.length ? start + 1 : 0,
        end: Math.min(start + BOOKING_PAGE_SIZE, filtered.length)
    };
}

function calculateDateDifferenceDays(startDate, endDate) {
    if (!startDate || !endDate) {
        return 0;
    }

    const start = new Date(String(startDate));
    const end = new Date(String(endDate));

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return 0;
    }

    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function buildExtendStayModal(booking) {
    const nightlyRate = Number(booking?.apartment?.pricePerNight ?? 0);
    const currentCheckOut = booking?.checkOut || '';
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4';

    modal.innerHTML = `
        <div class="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Extend stay</p>
                    <h3 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">${escapeHtml(booking?.bookingNumber || 'Booking')}</h3>
                </div>
                <button type="button" data-close-extend-modal class="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">✕</button>
            </div>

            <div class="mt-5 space-y-4">
                <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p>Current checkout: <strong>${escapeHtml(currentCheckOut || '—')}</strong></p>
                    <p class="mt-1">Nightly rate: <strong>${formatCurrency(nightlyRate)}</strong></p>
                </div>

                <label class="block space-y-2 text-sm font-medium text-slate-700">
                    <span>New checkout date</span>
                    <input id="extendStayDateInput" type="date" value="${escapeHtml(currentCheckOut)}" min="${escapeHtml(currentCheckOut)}" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500" required />
                </label>

                <label class="block space-y-2 text-sm font-medium text-slate-700">
                    <span>Reason</span>
                    <textarea id="extendStayReasonInput" rows="3" placeholder="Guest requested a longer stay" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500"></textarea>
                </label>

                <div class="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
                    <p class="font-medium">Estimated extension charge</p>
                    <p id="extendStayEstimate" class="mt-1 text-lg font-semibold">${formatCurrency(0)}</p>
                </div>
            </div>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button type="button" data-close-extend-modal class="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                <button id="confirmExtendStayButton" type="button" class="rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Confirm extension</button>
            </div>
        </div>
    `;

    const dateInput = modal.querySelector('#extendStayDateInput');
    const reasonInput = modal.querySelector('#extendStayReasonInput');
    const estimateLabel = modal.querySelector('#extendStayEstimate');

    const updateEstimate = () => {
        const newDate = String(dateInput.value || '').trim();
        if (!newDate || !currentCheckOut) {
            estimateLabel.textContent = formatCurrency(0);
            return;
        }

        const extraDays = calculateDateDifferenceDays(currentCheckOut, newDate);
        const extraCharge = extraDays * nightlyRate;
        estimateLabel.textContent = `${formatCurrency(extraCharge)} (${extraDays} night${extraDays === 1 ? '' : 's'})`;
    };

    dateInput.addEventListener('input', updateEstimate);
    updateEstimate();

    const closeModal = () => modal.remove();
    modal.querySelectorAll('[data-close-extend-modal]').forEach((button) => {
        button.addEventListener('click', closeModal);
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    const confirmButton = modal.querySelector('#confirmExtendStayButton');
    confirmButton.addEventListener('click', async () => {
        const nextDate = String(dateInput.value || '').trim();
        if (!nextDate) {
            showToast('Please select a new checkout date.', 'error');
            return;
        }

        const reason = String(reasonInput.value || '').trim() || 'Admin extended stay';
        confirmButton.setAttribute('disabled', 'disabled');
        confirmButton.textContent = 'Updating...';

        try {
            const response = await updateAdminBookingCheckoutDate(booking.bookingNumber, nextDate, reason);
            closeModal();
            showToast(`Stay extended: ${response?.updatedCheckOut || nextDate}.`, 'success');
            await refreshBookingsList();
            const detail = await getAdminBooking(booking.bookingNumber);
            state.selectedBooking = detail?.booking || null;
            renderPage();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unable to extend stay.', 'error');
            confirmButton.removeAttribute('disabled');
            confirmButton.textContent = 'Confirm extension';
        }
    });

    document.body.appendChild(modal);
}

function buildBookingsPage() {
    const bookings = state.bookings;
    const pagination = paginatedBookings();
    const selected = state.selectedBooking;
    const adminName = state.admin?.fullName || '';

    return `
        <div class="min-h-screen bg-admin-shell">
            ${renderAdminHeader({ title: 'Bookings management', activeView: 'bookings', adminName })}
            <main class="min-w-0 px-4 py-8 sm:px-6 lg:ml-64 lg:px-8 2xl:px-10">
                <section>
                    <article class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
                        <div>
                            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Reservations workspace</p>
                            <div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 class="text-3xl font-semibold tracking-tight text-slate-900">Booking records</h2><p class="mt-2 text-sm text-slate-600">Review guest stays, payment state, and operational actions.</p></div><span class="text-sm text-slate-500">${pagination.total} booking${pagination.total === 1 ? '' : 's'} shown</span></div>
                        </div>
                        <form id="bookingFiltersForm" class="mt-5 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(198px,0.9fr)_180px_180px_auto] md:items-end">
                            <label class="block space-y-2"><span class="text-sm font-medium text-slate-700">Search booking reference</span><input id="bookingSearchInput" name="search" type="search" value="${escapeHtml(state.search)}" placeholder="e.g. AST-03C7-260923154152" autocomplete="off" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500" /></label>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Status</span>
                                <select name="status" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500">
                                    <option value="all" ${state.filters.status === 'all' ? 'selected' : ''}>All</option>
                                    <option value="pending_payment" ${state.filters.status === 'pending_payment' ? 'selected' : ''}>Pending payment</option>
                                    <option value="confirmed" ${state.filters.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="checked_out" ${state.filters.status === 'checked_out' ? 'selected' : ''}>Checked out</option>
                                    <option value="cancelled" ${state.filters.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </label>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Payment</span>
                                <select name="paymentStatus" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500">
                                    <option value="all" ${state.filters.paymentStatus === 'all' ? 'selected' : ''}>All</option>
                                    <option value="unpaid" ${state.filters.paymentStatus === 'unpaid' ? 'selected' : ''}>Unpaid</option>
                                    <option value="paid" ${state.filters.paymentStatus === 'paid' ? 'selected' : ''}>Paid</option>
                                    <option value="failed" ${state.filters.paymentStatus === 'failed' ? 'selected' : ''}>Failed</option>
                                </select>
                            </label>
                            <button id="resetBookingFiltersButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset</button>
                        </form>
                        <div class="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                            <table id="bookingsTable" class="min-w-[900px] w-full divide-y divide-slate-200 text-sm">
                                <thead>
                                    <tr class="text-left text-slate-500">
                                        <th class="pb-3 font-medium">Booking</th>
                                        <th class="pb-3 font-medium">Guest</th>
                                        <th class="pb-3 font-medium">Stay dates</th>
                                        <th class="pb-3 font-medium">Amount</th>
                                        <th class="pb-3 font-medium">Status</th>
                                        <th class="pb-3 text-right font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="bookingRows" class="divide-y divide-slate-100 text-slate-700">
                                    ${pagination.rows.length ? pagination.rows.map((booking) => `
                                        <tr class="${selectedBookingRef() === booking.bookingNumber ? 'bg-brand-50/60' : ''}">
                                            <td class="py-4">
                                                <p class="font-semibold text-slate-900">${escapeHtml(booking.bookingNumber)}</p>
                                                <p class="mt-1 text-xs text-slate-500">${escapeHtml(booking.apartment.name)}</p>
                                            </td>
                                            <td class="py-4">
                                                <p>${escapeHtml(booking.guestName)}</p>
                                                <p class="mt-1 text-xs text-slate-500">${escapeHtml(booking.guestEmail)}</p>
                                            </td>
                                            <td class="whitespace-nowrap py-4">
                                                <p class="font-medium text-slate-900">${escapeHtml(booking.checkIn || '-')}</p>
                                                <p class="mt-1 text-xs text-slate-500">to ${escapeHtml(booking.checkOut || '-')}</p>
                                            </td>
                                            <td class="py-4">${formatCurrency(booking.totalAmount || 0)}</td>
                                            <td class="py-4">
                                                <div class="space-y-2">
                                                    <div>${statusBadge(booking.status)}</div>
                                                    <div>${paymentBadge(booking.paymentStatus)}</div>
                                                </div>
                                            </td>
                                            <td class="py-4 text-right">
                                                <button type="button" data-open-booking="${escapeHtml(booking.bookingNumber)}" class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">Open</button>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="6" class="py-10 text-center text-slate-500">No bookings found for the current filters.</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                        <div class="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing ${pagination.start}-${pagination.end} of ${pagination.total}</span><div class="flex items-center gap-2"><button id="previousBookingPageButton" type="button" ${state.page <= 1 ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button><span>Page ${state.page} of ${pagination.totalPages}</span><button id="nextBookingPageButton" type="button" ${state.page >= pagination.totalPages ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button></div></div>
                    </article>
                    <aside class="hidden">
                        <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Details</p>
                            <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">${selected ? escapeHtml(selected.bookingNumber) : 'Select a booking'}</h2>
                            ${selected ? `
                                <div class="mt-5 space-y-4 text-sm text-slate-700">
                                    <div class="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p class="text-slate-500">Guest</p>
                                            <p class="mt-1 font-medium text-slate-900">${escapeHtml(selected.guestName)}</p>
                                            <p class="text-slate-600">${escapeHtml(selected.guestEmail)}</p>
                                            <p class="text-slate-600">${escapeHtml(selected.guestPhone)}</p>
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Apartment</p>
                                            <p class="mt-1 font-medium text-slate-900">${escapeHtml(selected.apartment.name)}</p>
                                            <p class="text-slate-600">${escapeHtml(selected.apartment.location)}</p>
                                        </div>
                                    </div>
                                    <div class="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p class="text-slate-500">Stay</p>
                                            <p class="mt-1">${escapeHtml(selected.checkIn)} to ${escapeHtml(selected.checkOut)}</p>
                                            <p>${escapeHtml(String(selected.guests))} guests</p>
                                            ${selected.actualCheckOut ? `<p class="mt-2 font-medium text-sky-700">Checked out: ${escapeHtml(formatDateTime(selected.actualCheckOut))}</p>` : ''}
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Amounts</p>
                                            <p class="mt-1">Subtotal: ${formatCurrency(selected.subtotal || 0)}</p>
                                            <p>Taxes: ${formatCurrency(selected.taxes || 0)}</p>
                                            <p>Fees: ${formatCurrency(selected.fees || 0)}</p>
                                            <p class="font-semibold text-slate-900">Total: ${formatCurrency(selected.totalAmount || 0)}</p>
                                        </div>
                                    </div>
                                    <div class="rounded-[1.5rem] border ${selected.isOverdue ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'} p-4">
                                        <p class="font-medium text-slate-900">Status</p>
                                        <div class="mt-3 flex flex-wrap gap-2">
                                            ${statusBadge(selected.status)}
                                            ${paymentBadge(selected.paymentStatus)}
                                        </div>
                                        <p class="mt-3 text-sm ${selected.isOverdue ? 'text-rose-700' : 'text-slate-600'}">Payment due: ${formatDateTime(selected.paymentDueAt || '')}</p>
                                    </div>
                                    <div>
                                        <p class="text-slate-500">Special requests</p>
                                        <p class="mt-1 text-slate-700">${escapeHtml(selected.specialRequests || 'None')}</p>
                                    </div>
                                    <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                        ${selected.paymentStatus === 'unpaid' && selected.status === 'pending_payment' ? '<button id="markPaidOnsiteButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700 sm:w-auto">Mark paid onsite</button>' : ''}
                                        ${selected.paymentStatus === 'unpaid' && selected.status === 'pending_payment' && selected.isOverdue ? '<button id="revokeBookingButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 sm:w-auto">Revoke overdue booking</button>' : ''}
                                        ${selected.status === 'confirmed' && selected.paymentStatus === 'paid' ? '<button id="checkOutNowButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 sm:w-auto">Check out now</button>' : ''}
                                        ${selected.status === 'confirmed' && selected.paymentStatus === 'paid' ? '<button id="extendStayButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 sm:w-auto">Extend stay</button>' : ''}
                                        ${selected.status !== 'cancelled' ? '<button id="cancelBookingButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 sm:w-auto">Cancel booking</button>' : ''}
                                        ${selected.status === 'cancelled' && selected.paymentStatus !== 'paid' ? '<button id="restoreBookingButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 sm:w-auto">Restore to pending payment</button>' : ''}
                                    </div>
                                </div>
                            ` : '<p class="mt-4 text-sm leading-6 text-slate-600">Choose a booking from the table to review guest information, stay dates, payment state, and available admin actions.</p>'}
                        </article>
                    </aside>
                </section>
            </main>
            ${selected ? bookingDetailsModalMarkup(selected) : ''}
        </div>
    `;
}

function bookingDetailsModalMarkup(booking) {
    return `
        <div id="bookingDetailsModal" class="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 px-4 py-6 sm:py-10">
            <div class="mx-auto w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
                <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Booking details</p><h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">${escapeHtml(booking.bookingNumber)}</h2></div><button id="closeBookingDetailsButton" type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Close booking details">&times;</button></div>
                <div class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Guest</p><p class="mt-2 font-semibold text-slate-900">${escapeHtml(booking.guestName)}</p><p class="text-sm text-slate-600">${escapeHtml(booking.guestEmail)}</p><p class="text-sm text-slate-600">${escapeHtml(booking.guestPhone)}</p></div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Apartment</p><p class="mt-2 font-semibold text-slate-900">${escapeHtml(booking.apartment.name)}</p><p class="text-sm text-slate-600">${escapeHtml(booking.apartment.location)}</p></div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stay</p><p class="mt-2 text-sm text-slate-700">${escapeHtml(booking.checkIn)} to ${escapeHtml(booking.checkOut)}</p><p class="text-sm text-slate-700">${escapeHtml(String(booking.guests))} guests</p>${booking.actualCheckOut ? `<p class="mt-2 text-sm font-medium text-sky-700">Checked out: ${escapeHtml(formatDateTime(booking.actualCheckOut))}</p>` : ''}</div>
                </div>
                <div class="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]"><div class="rounded-2xl border ${booking.isOverdue ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'} p-4"><p class="font-medium text-slate-900">Status</p><div class="mt-3 flex flex-wrap gap-2">${statusBadge(booking.status)}${paymentBadge(booking.paymentStatus)}</div><p class="mt-3 text-sm ${booking.isOverdue ? 'text-rose-700' : 'text-slate-600'}">Payment due: ${formatDateTime(booking.paymentDueAt || '')}</p></div><div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><p class="font-medium text-slate-900">Amounts</p><p class="mt-2">Subtotal: ${formatCurrency(booking.subtotal || 0)}</p><p>Taxes: ${formatCurrency(booking.taxes || 0)}</p><p>Fees: ${formatCurrency(booking.fees || 0)}</p><p class="font-semibold text-slate-900">Total: ${formatCurrency(booking.totalAmount || 0)}</p></div></div>
                <div class="mt-5"><p class="text-sm text-slate-500">Special requests</p><p class="mt-1 text-sm text-slate-700">${escapeHtml(booking.specialRequests || 'None')}</p></div>
                <div class="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:flex-wrap sm:justify-end">${booking.paymentStatus === 'unpaid' && booking.status === 'pending_payment' ? '<button id="markPaidOnsiteButton" type="button" class="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Mark paid onsite</button>' : ''}${booking.paymentStatus === 'unpaid' && booking.status === 'pending_payment' && booking.isOverdue ? '<button id="revokeBookingButton" type="button" class="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Revoke overdue booking</button>' : ''}${booking.status === 'confirmed' && booking.paymentStatus === 'paid' ? '<button id="checkOutNowButton" type="button" class="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100">Check out now</button><button id="extendStayButton" type="button" class="rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Extend stay</button>' : ''}${booking.status !== 'cancelled' ? '<button id="cancelBookingButton" type="button" class="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">Cancel booking</button>' : ''}${booking.status === 'cancelled' && booking.paymentStatus !== 'paid' ? '<button id="restoreBookingButton" type="button" class="rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Restore to pending payment</button>' : ''}<button id="closeBookingDetailsButtonBottom" type="button" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button></div>
            </div>
        </div>
    `;
}

function renderPage() {
    if (!app) {
        return;
    }

    app.innerHTML = buildBookingsPage();
    bindAdminMobileMenu();
    enhanceResponsiveTables('#bookingsTable');
    bindTopActions();
    bindFilterControls();
    bindBookingSearchAndPagination();
    bindBookingListActions();
    bindDetailActions();
    bindBookingDetailsModal();
}

function bindBookingSearchAndPagination() {
    const searchInput = document.getElementById('bookingSearchInput');
    const previousButton = document.getElementById('previousBookingPageButton');
    const nextButton = document.getElementById('nextBookingPageButton');

    searchInput?.addEventListener('input', () => {
        state.search = searchInput.value;
        state.page = 1;
        renderPage();
        const refreshedInput = document.getElementById('bookingSearchInput');
        if (refreshedInput instanceof HTMLInputElement) {
            refreshedInput.focus();
            refreshedInput.setSelectionRange(refreshedInput.value.length, refreshedInput.value.length);
        }
    });

    previousButton?.addEventListener('click', () => {
        if (state.page > 1) {
            state.page -= 1;
            renderPage();
        }
    });

    nextButton?.addEventListener('click', () => {
        const totalPages = Math.max(1, Math.ceil(filteredBookings().length / BOOKING_PAGE_SIZE));
        if (state.page < totalPages) {
            state.page += 1;
            renderPage();
        }
    });
}

function bindBookingDetailsModal() {
    const modal = document.getElementById('bookingDetailsModal');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    const close = () => {
        state.selectedBooking = null;
        renderPage();
    };

    document.querySelectorAll('#closeBookingDetailsButton, #closeBookingDetailsButtonBottom').forEach((button) => button.addEventListener('click', close));
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            close();
        }
    });
}

function bindTopActions() {
    const logoutButtons = document.querySelectorAll('[data-admin-logout]');

    logoutButtons.forEach((logoutButton) => {
        if (!(logoutButton instanceof HTMLButtonElement)) {
            return;
        }

        logoutButton.addEventListener('click', async () => {
            logoutButton.setAttribute('disabled', 'disabled');
            try {
                await logoutAdmin();
                window.location.href = adminLoginPath();
            } catch (error) {
                logoutButton.removeAttribute('disabled');
                showToast(error instanceof Error ? error.message : 'Unable to log out.', 'error');
            }
        });
    });

    if (!logoutButtons.length) {
        return;
    }
}

async function applyBookingFilters(filterForm) {
    state.filters.status = String(filterForm.elements.status.value || 'all');
    state.filters.paymentStatus = String(filterForm.elements.paymentStatus.value || 'all');
    state.page = 1;
    await refreshBookingsList();
    renderPage();
}

function bindFilterControls() {
    const filterForm = document.getElementById('bookingFiltersForm');
    const resetButton = document.getElementById('resetBookingFiltersButton');

    if (filterForm instanceof HTMLFormElement) {
        filterForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await applyBookingFilters(filterForm);
        });

        filterForm.addEventListener('change', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLSelectElement)) {
                return;
            }

            await applyBookingFilters(filterForm);
        });
    }

    if (resetButton instanceof HTMLButtonElement) {
        resetButton.addEventListener('click', async () => {
            state.filters.status = 'all';
            state.filters.paymentStatus = 'all';
            state.search = '';
            state.page = 1;
            await refreshBookingsList();
            renderPage();
        });
    }
}

function bindBookingListActions() {
    const bookingRows = document.getElementById('bookingRows');
    if (!bookingRows) {
        return;
    }

    bookingRows.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const button = target.closest('[data-open-booking]');
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        const bookingRef = String(button.getAttribute('data-open-booking') || '').trim();
        if (!bookingRef) {
            return;
        }

        button.setAttribute('disabled', 'disabled');
        const originalText = button.textContent;
        button.textContent = 'Loading...';

        try {
            const data = await getAdminBooking(bookingRef);
            state.selectedBooking = data?.booking || null;
            renderPage();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unable to load booking details.', 'error');
            button.removeAttribute('disabled');
            button.textContent = originalText;
        }
    });
}

async function runBookingAction(action) {
    const bookingRef = selectedBookingRef();
    if (!bookingRef) {
        return;
    }

    if (action === 'paid') {
        await markBookingPaidOnsite(bookingRef);
        showToast(`Booking ${bookingRef} marked as paid onsite.`, 'success');
    }

    if (action === 'revoke') {
        await revokeOverdueUnpaidBooking(bookingRef);
        showToast(`Booking ${bookingRef} revoked for overdue onsite payment.`, 'success');
    }

    if (action === 'cancel') {
        await updateAdminBookingStatus(bookingRef, 'cancelled');
        showToast(`Booking ${bookingRef} cancelled.`, 'success');
    }

    if (action === 'checkout-now') {
        await checkOutBookingNow(bookingRef);
        showToast(`Booking ${bookingRef} marked as checked out.`, 'success');
    }

    if (action === 'extend') {
        if (!state.selectedBooking) {
            return;
        }

        buildExtendStayModal(state.selectedBooking);
        return;
    }

    if (action === 'restore') {
        await updateAdminBookingStatus(bookingRef, 'pending_payment');
        showToast(`Booking ${bookingRef} restored to pending payment.`, 'success');
    }

    await refreshBookingsList();
    if (bookingRef) {
        const detail = await getAdminBooking(bookingRef);
        state.selectedBooking = detail?.booking || null;
    }
    renderPage();
}

function bindDetailActions() {
    const detailsRoot = document.getElementById('bookingDetailsModal') || document;
    const markPaidButton = detailsRoot.querySelector('#markPaidOnsiteButton');
    const revokeButton = detailsRoot.querySelector('#revokeBookingButton');
    const checkOutNowButton = detailsRoot.querySelector('#checkOutNowButton');
    const extendStayButton = detailsRoot.querySelector('#extendStayButton');
    const cancelButton = detailsRoot.querySelector('#cancelBookingButton');
    const restoreButton = detailsRoot.querySelector('#restoreBookingButton');

    if (markPaidButton) {
        markPaidButton.addEventListener('click', async () => {
            markPaidButton.setAttribute('disabled', 'disabled');
            try {
                await runBookingAction('paid');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to mark booking as paid.', 'error');
                markPaidButton.removeAttribute('disabled');
            }
        });
    }

    if (revokeButton) {
        revokeButton.addEventListener('click', async () => {
            revokeButton.setAttribute('disabled', 'disabled');
            try {
                await runBookingAction('revoke');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to revoke booking.', 'error');
                revokeButton.removeAttribute('disabled');
            }
        });
    }

    if (checkOutNowButton) {
        checkOutNowButton.addEventListener('click', async () => {
            checkOutNowButton.setAttribute('disabled', 'disabled');
            try {
                await runBookingAction('checkout-now');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to check out booking.', 'error');
                checkOutNowButton.removeAttribute('disabled');
            }
        });
    }

    if (extendStayButton) {
        extendStayButton.addEventListener('click', async () => {
            extendStayButton.setAttribute('disabled', 'disabled');
            try {
                await runBookingAction('extend');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to extend booking stay.', 'error');
                extendStayButton.removeAttribute('disabled');
            }
        });
    }

    if (cancelButton) {
        cancelButton.addEventListener('click', async () => {
            cancelButton.setAttribute('disabled', 'disabled');
            try {
                await runBookingAction('cancel');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to cancel booking.', 'error');
                cancelButton.removeAttribute('disabled');
            }
        });
    }

    if (restoreButton) {
        restoreButton.addEventListener('click', async () => {
            restoreButton.setAttribute('disabled', 'disabled');
            try {
                await runBookingAction('restore');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to restore booking.', 'error');
                restoreButton.removeAttribute('disabled');
            }
        });
    }
}

async function refreshBookingsList() {
    const params = {};

    if (state.filters.status !== 'all') {
        params.status = state.filters.status;
    }

    if (state.filters.paymentStatus !== 'all') {
        params.paymentStatus = state.filters.paymentStatus;
    }

    const bookingsData = await getAdminBookings(params);
    state.bookings = Array.isArray(bookingsData?.bookings) ? bookingsData.bookings : [];

    if (state.selectedBooking) {
        const selectedInList = state.bookings.find((booking) => booking.bookingNumber === state.selectedBooking.bookingNumber);
        state.selectedBooking = selectedInList || null;
    }
}

async function refreshBookingsPage() {
    const meData = await getCurrentAdmin();
    state.admin = meData?.admin || null;

    if (!state.admin) {
        window.location.href = adminLoginPath();
        return;
    }

    await refreshBookingsList();
    renderPage();
}

async function initBookingsPage() {
    try {
        document.title = 'Admin Bookings | ANTOBELL';
        await refreshBookingsPage();
    } catch (error) {
        window.location.href = adminLoginPath();
    }
}

initBookingsPage();
