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
    updateAdminBookingStatus
} from './api.js';
import { formatCurrency } from '../helper.js';
import { bindAdminMobileMenu, enhanceResponsiveTables, renderAdminHeader } from './layout.js';
import { showToast } from '../toast.js';

const app = document.getElementById('app');
const state = {
    admin: null,
    bookings: [],
    selectedBooking: null,
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

function buildBookingsPage() {
    const bookings = state.bookings;
    const selected = state.selectedBooking;
    const adminName = state.admin?.fullName || '';

    return `
        <div class="min-h-screen bg-admin-shell">
            ${renderAdminHeader({ title: 'Bookings management', activeView: 'bookings', adminName })}
            <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <section class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                        <div>
                            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Directory</p>
                            <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Booking records</h2>
                        </div>
                        <form id="bookingFiltersForm" class="mt-5 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[180px_180px_auto] md:items-end">
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Status</span>
                                <select name="status" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500">
                                    <option value="all" ${state.filters.status === 'all' ? 'selected' : ''}>All</option>
                                    <option value="pending_payment" ${state.filters.status === 'pending_payment' ? 'selected' : ''}>Pending payment</option>
                                    <option value="confirmed" ${state.filters.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
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
                            <button id="resetBookingFiltersButton" type="button" class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset</button>
                        </form>
                        <div class="mt-5 overflow-x-auto">
                            <table id="bookingsTable" class="min-w-full divide-y divide-slate-200 text-sm">
                                <thead>
                                    <tr class="text-left text-slate-500">
                                        <th class="pb-3 font-medium">Booking</th>
                                        <th class="pb-3 font-medium">Guest</th>
                                        <th class="pb-3 font-medium">Amount</th>
                                        <th class="pb-3 font-medium">Status</th>
                                        <th class="pb-3 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="bookingRows" class="divide-y divide-slate-100 text-slate-700">
                                    ${bookings.length ? bookings.map((booking) => `
                                        <tr class="${selectedBookingRef() === booking.bookingNumber ? 'bg-brand-50/60' : ''}">
                                            <td class="py-4">
                                                <p class="font-semibold text-slate-900">${escapeHtml(booking.bookingNumber)}</p>
                                                <p class="mt-1 text-xs text-slate-500">${escapeHtml(booking.apartment.name)}</p>
                                            </td>
                                            <td class="py-4">
                                                <p>${escapeHtml(booking.guestName)}</p>
                                                <p class="mt-1 text-xs text-slate-500">${escapeHtml(booking.guestEmail)}</p>
                                            </td>
                                            <td class="py-4">${formatCurrency(booking.totalAmount || 0)}</td>
                                            <td class="py-4">
                                                <div class="space-y-2">
                                                    <div>${statusBadge(booking.status)}</div>
                                                    <div>${paymentBadge(booking.paymentStatus)}</div>
                                                </div>
                                            </td>
                                            <td class="py-4">
                                                <button type="button" data-open-booking="${escapeHtml(booking.bookingNumber)}" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Open</button>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="5" class="py-10 text-center text-slate-500">No bookings found for the current filters.</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </article>
                    <aside class="space-y-6">
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
                                        ${selected.status !== 'cancelled' ? '<button id="cancelBookingButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 sm:w-auto">Cancel booking</button>' : ''}
                                        ${selected.status === 'cancelled' && selected.paymentStatus !== 'paid' ? '<button id="restoreBookingButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-brand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 sm:w-auto">Restore to pending payment</button>' : ''}
                                    </div>
                                </div>
                            ` : '<p class="mt-4 text-sm leading-6 text-slate-600">Choose a booking from the table to review guest information, stay dates, payment state, and available admin actions.</p>'}
                        </article>
                    </aside>
                </section>
            </main>
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
    bindBookingListActions();
    bindDetailActions();
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
    const markPaidButton = document.getElementById('markPaidOnsiteButton');
    const revokeButton = document.getElementById('revokeBookingButton');
    const cancelButton = document.getElementById('cancelBookingButton');
    const restoreButton = document.getElementById('restoreBookingButton');

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
