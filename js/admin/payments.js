/**
 * Admin payments controller.
 */

import {
    getAdminPayment,
    getAdminPayments,
    getCurrentAdmin,
    logoutAdmin
} from './api.js';
import { formatCurrency } from '../helper.js';
import { bindAdminMobileMenu, enhanceResponsiveTables, renderAdminHeader } from './layout.js';
import { showToast } from '../toast.js';

const app = document.getElementById('app');
const PAYMENT_PAGE_SIZE = 10;
const state = {
    admin: null,
    payments: [],
    selectedPayment: null,
    search: '',
    page: 1,
    totals: {
        today: 0,
        week: 0,
        month: 0
    },
    filters: {
        status: 'all',
        provider: 'all'
    }
};

function adminLoginPath() {
    return './login.html';
}

function adminDashboardPath() {
    return './index.html';
}

function adminBookingsPath() {
    return './bookings.html';
}

function adminApartmentsPath() {
    return './apartments.html';
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

function paymentStatusBadge(status) {
    const styles = {
        successful: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        initiated: 'border-amber-200 bg-amber-50 text-amber-700',
        failed: 'border-rose-200 bg-rose-50 text-rose-700',
    };

    const className = styles[status] || 'border-slate-200 bg-slate-100 text-slate-700';
    return `<span class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${className}">${escapeHtml(String(status || 'unknown'))}</span>`;
}

function bookingStatusBadge(status) {
    const styles = {
        pending_payment: 'border-amber-200 bg-amber-50 text-amber-700',
        confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        cancelled: 'border-rose-200 bg-rose-50 text-rose-700',
        pending: 'border-slate-200 bg-slate-100 text-slate-700',
    };

    const className = styles[status] || styles.pending;
    return `<span class="inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${className}">${escapeHtml(String(status || '').replace('_', ' '))}</span>`;
}

function selectedPaymentRef() {
    return state.selectedPayment?.transactionRef || '';
}

function filteredPayments() {
    const search = state.search.trim().toLowerCase();
    if (!search) {
        return state.payments;
    }

    return state.payments.filter((payment) => String(payment.booking?.bookingNumber || '').toLowerCase().includes(search));
}

function paginatedPayments() {
    const filtered = filteredPayments();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAYMENT_PAGE_SIZE));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAYMENT_PAGE_SIZE;

    return {
        rows: filtered.slice(start, start + PAYMENT_PAGE_SIZE),
        total: filtered.length,
        totalPages,
        start: filtered.length ? start + 1 : 0,
        end: Math.min(start + PAYMENT_PAGE_SIZE, filtered.length)
    };
}

function buildPaymentsPageLegacy() {
    const payments = state.payments;
    const selected = state.selectedPayment;
    const adminName = state.admin?.fullName || '';

    return `
        <div class="min-h-screen bg-admin-shell">
            ${renderAdminHeader({ title: 'Payments history', activeView: 'payments', adminName })}
            <main class="min-w-0 px-4 py-8 sm:px-6 lg:ml-64 lg:px-8 2xl:px-10">
                <section class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                        <div>
                            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Ledger</p>
                            <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Payment records</h2>
                        </div>
                        <form id="paymentFiltersForm" class="mt-5 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-[180px_180px_auto] md:items-end">
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Status</span>
                                <select name="status" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500">
                                    <option value="all" ${state.filters.status === 'all' ? 'selected' : ''}>All</option>
                                    <option value="successful" ${state.filters.status === 'successful' ? 'selected' : ''}>Successful</option>
                                    <option value="initiated" ${state.filters.status === 'initiated' ? 'selected' : ''}>Initiated</option>
                                    <option value="failed" ${state.filters.status === 'failed' ? 'selected' : ''}>Failed</option>
                                </select>
                            </label>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Provider</span>
                                <select name="provider" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500">
                                    <option value="all" ${state.filters.provider === 'all' ? 'selected' : ''}>All</option>
                                    <option value="onsite-admin" ${state.filters.provider === 'onsite-admin' ? 'selected' : ''}>Onsite admin</option>
                                    <option value="manual-test" ${state.filters.provider === 'manual-test' ? 'selected' : ''}>Manual test</option>
                                </select>
                            </label>
                            <button id="resetPaymentFiltersButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset</button>
                        </form>
                        <div class="mt-5 overflow-x-auto">
                            <table id="paymentsTable" class="min-w-full divide-y divide-slate-200 text-sm">
                                <thead>
                                    <tr class="text-left text-slate-500">
                                        <th class="pb-3 font-medium">Transaction</th>
                                        <th class="pb-3 font-medium">Booking</th>
                                        <th class="pb-3 font-medium">Amount</th>
                                        <th class="pb-3 font-medium">Status</th>
                                        <th class="pb-3 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="paymentRows" class="divide-y divide-slate-100 text-slate-700">
                                    ${payments.length ? payments.map((payment) => `
                                        <tr class="${selectedPaymentRef() === payment.transactionRef ? 'bg-brand-50/60' : ''}">
                                            <td class="py-4">
                                                <p class="font-semibold text-slate-900">${escapeHtml(payment.transactionRef)}</p>
                                                <p class="mt-1 text-xs text-slate-500">${escapeHtml(payment.provider)}</p>
                                            </td>
                                            <td class="py-4">
                                                <p>${escapeHtml(payment.booking.bookingNumber)}</p>
                                                <p class="mt-1 text-xs text-slate-500">${escapeHtml(payment.booking.guestName)}</p>
                                            </td>
                                            <td class="py-4">${formatCurrency(payment.amount || 0)}</td>
                                            <td class="py-4">${paymentStatusBadge(payment.status)}</td>
                                            <td class="py-4">
                                                <button type="button" data-open-payment="${escapeHtml(payment.transactionRef)}" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Open</button>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="5" class="py-10 text-center text-slate-500">No payments found for the current filters.</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </article>
                    <aside class="space-y-6">
                        <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Details</p>
                            <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">${selected ? escapeHtml(selected.transactionRef) : 'Select a payment'}</h2>
                            ${selected ? `
                                <div class="mt-5 space-y-4 text-sm text-slate-700">
                                    <div class="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p class="text-slate-500">Provider</p>
                                            <p class="mt-1 font-medium text-slate-900">${escapeHtml(selected.provider)}</p>
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Status</p>
                                            <div class="mt-1">${paymentStatusBadge(selected.status)}</div>
                                        </div>
                                    </div>
                                    <div class="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <p class="text-slate-500">Amount</p>
                                            <p class="mt-1 font-medium text-slate-900">${formatCurrency(selected.amount || 0)} ${escapeHtml(selected.currency || '')}</p>
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Paid at</p>
                                            <p class="mt-1 text-slate-900">${escapeHtml(formatDateTime(selected.paidAt || selected.createdAt || ''))}</p>
                                        </div>
                                    </div>
                                    <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                        <p class="font-medium text-slate-900">Booking</p>
                                        <p class="mt-2 text-slate-900">${escapeHtml(selected.booking.bookingNumber)}</p>
                                        <div class="mt-3 flex flex-wrap gap-2">
                                            ${bookingStatusBadge(selected.booking.status)}
                                            ${bookingStatusBadge(selected.booking.paymentStatus)}
                                        </div>
                                        <p class="mt-3 text-slate-700">${escapeHtml(selected.booking.guestName)}</p>
                                        <p class="text-slate-600">${escapeHtml(selected.booking.guestEmail)}</p>
                                    </div>
                                    <div>
                                        <p class="text-slate-500">Apartment</p>
                                        <p class="mt-1 text-slate-900">${escapeHtml(selected.apartment.name)}</p>
                                    </div>
                                </div>
                            ` : '<p class="mt-4 text-sm leading-6 text-slate-600">Choose a payment from the ledger to inspect its transaction reference, provider, booking, and guest context.</p>'}
                        </article>
                    </aside>
                </section>
            </main>
        </div>
    `;
}

function paymentDetailsModalMarkup(payment) {
    return `
        <div id="paymentDetailsModal" class="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 px-4 py-6 sm:py-10">
            <div class="mx-auto w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
                <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Payment details</p><h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">${escapeHtml(payment.transactionRef)}</h2></div><button id="closePaymentDetailsButton" type="button" class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Close payment details">&times;</button></div>
                <div class="mt-6 grid gap-5 sm:grid-cols-2">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Transaction</p><p class="mt-2 font-semibold text-slate-900">${escapeHtml(payment.transactionRef)}</p><p class="mt-1 text-sm text-slate-600">Provider: ${escapeHtml(payment.provider)}</p><div class="mt-3">${paymentStatusBadge(payment.status)}</div></div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Amount</p><p class="mt-2 text-2xl font-semibold text-slate-900">${formatCurrency(payment.amount || 0)}</p><p class="mt-1 text-sm text-slate-600">${escapeHtml(payment.currency || '')} · ${escapeHtml(formatDateTime(payment.paidAt || payment.createdAt || ''))}</p></div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Booking</p><p class="mt-2 font-semibold text-slate-900">${escapeHtml(payment.booking.bookingNumber)}</p><div class="mt-3 flex flex-wrap gap-2">${bookingStatusBadge(payment.booking.status)}${bookingStatusBadge(payment.booking.paymentStatus)}</div></div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Guest and apartment</p><p class="mt-2 font-semibold text-slate-900">${escapeHtml(payment.booking.guestName)}</p><p class="text-sm text-slate-600">${escapeHtml(payment.booking.guestEmail)}</p><p class="mt-2 text-sm text-slate-700">${escapeHtml(payment.apartment.name)}</p></div>
                </div>
                <div class="mt-6 flex justify-end border-t border-slate-200 pt-5"><button id="closePaymentDetailsButtonBottom" type="button" class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button></div>
            </div>
        </div>
    `;
}

function buildPaymentsPage() {
    const payments = state.payments;
    const pagination = paginatedPayments();
    const adminName = state.admin?.fullName || '';

    return `
        <div class="min-h-screen bg-admin-shell">
            ${renderAdminHeader({ title: 'Payments history', activeView: 'payments', adminName })}
            <main class="min-w-0 px-4 py-8 sm:px-6 lg:ml-64 lg:px-8 2xl:px-10">
                <div class="grid gap-4 md:grid-cols-3">
                    <article class="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft"><p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Payments today</p><p class="mt-3 text-3xl font-semibold text-emerald-950">${formatCurrency(state.totals.today)}</p><p class="mt-2 text-sm text-emerald-800">Successful payments received today</p></article>
                    <article class="rounded-[1.75rem] border border-brand-200 bg-brand-50 p-5 shadow-soft"><p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">This week</p><p class="mt-3 text-3xl font-semibold text-brand-950">${formatCurrency(state.totals.week)}</p><p class="mt-2 text-sm text-brand-800">Successful payments since Monday</p></article>
                    <article class="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-soft"><p class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">This month</p><p class="mt-3 text-3xl font-semibold text-amber-950">${formatCurrency(state.totals.month)}</p><p class="mt-2 text-sm text-amber-800">Successful payments this month</p></article>
                </div>
                <section class="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:p-7">
                    <div><p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Ledger</p><div class="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 class="text-3xl font-semibold tracking-tight text-slate-900">Payment records</h2><p class="mt-2 text-sm text-slate-600">Inspect transaction references, providers, bookings, and guest context.</p></div><span class="text-sm text-slate-500">${pagination.total} payment${pagination.total === 1 ? '' : 's'} shown</span></div></div>
                    <form id="paymentFiltersForm" class="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(198px,0.9fr)_180px_180px_auto] md:items-end"><label class="block space-y-2"><span class="text-sm font-medium text-slate-700">Search booking reference</span><input id="paymentSearchInput" name="search" type="search" value="${escapeHtml(state.search)}" placeholder="e.g. AST-03C7-260923154152" autocomplete="off" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500" /></label><label class="block space-y-2"><span class="text-sm font-medium text-slate-700">Status</span><select name="status" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500"><option value="all" ${state.filters.status === 'all' ? 'selected' : ''}>All</option><option value="successful" ${state.filters.status === 'successful' ? 'selected' : ''}>Successful</option><option value="initiated" ${state.filters.status === 'initiated' ? 'selected' : ''}>Initiated</option><option value="failed" ${state.filters.status === 'failed' ? 'selected' : ''}>Failed</option></select></label><label class="block space-y-2"><span class="text-sm font-medium text-slate-700">Provider</span><select name="provider" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500"><option value="all" ${state.filters.provider === 'all' ? 'selected' : ''}>All</option><option value="onsite-admin" ${state.filters.provider === 'onsite-admin' ? 'selected' : ''}>Onsite admin</option><option value="manual-test" ${state.filters.provider === 'manual-test' ? 'selected' : ''}>Manual test</option></select></label><button id="resetPaymentFiltersButton" type="button" class="inline-flex w-1/4 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset</button></form>
                    <div class="mt-6 overflow-x-auto rounded-2xl border border-slate-200"><table id="paymentsTable" class="min-w-[900px] w-full divide-y divide-slate-200 text-sm"><thead><tr class="text-left text-slate-500"><th class="px-5 py-3 font-medium">Transaction</th><th class="px-5 py-3 font-medium">Booking</th><th class="px-5 py-3 font-medium">Amount</th><th class="px-5 py-3 font-medium">Status</th><th class="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody id="paymentRows" class="divide-y divide-slate-100 text-slate-700">${pagination.rows.length ? pagination.rows.map((payment) => `<tr class="transition hover:bg-slate-50"><td class="px-5 py-4"><p class="font-semibold text-slate-900">${escapeHtml(payment.transactionRef)}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(payment.provider)}</p></td><td class="px-5 py-4"><p>${escapeHtml(payment.booking.bookingNumber)}</p><p class="mt-1 text-xs text-slate-500">${escapeHtml(payment.booking.guestName)}</p></td><td class="px-5 py-4 font-medium">${formatCurrency(payment.amount || 0)}</td><td class="px-5 py-4">${paymentStatusBadge(payment.status)}</td><td class="px-5 py-4 text-right"><button type="button" data-open-payment="${escapeHtml(payment.transactionRef)}" class="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">Open</button></td></tr>`).join('') : '<tr><td colspan="5" class="px-5 py-10 text-center text-slate-500">No payments found for the current filters.</td></tr>'}</tbody></table></div>
                    <div class="mt-4 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Showing ${pagination.start}-${pagination.end} of ${pagination.total}</span><div class="flex items-center gap-2"><button id="previousPaymentPageButton" type="button" ${state.page <= 1 ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button><span>Page ${state.page} of ${pagination.totalPages}</span><button id="nextPaymentPageButton" type="button" ${state.page >= pagination.totalPages ? 'disabled' : ''} class="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button></div></div>
                </section>
            </main>
            ${state.selectedPayment ? paymentDetailsModalMarkup(state.selectedPayment) : ''}
        </div>
    `.replace('w-1/4', 'w-full');
}

function renderPage() {
    if (!app) {
        return;
    }

    app.innerHTML = buildPaymentsPage();
    bindAdminMobileMenu();
    enhanceResponsiveTables('#paymentsTable');
    bindTopActions();
    bindFilterControls();
    bindPaymentSearchAndPagination();
    bindPaymentListActions();
    bindPaymentDetailsModal();
}

function bindPaymentSearchAndPagination() {
    const searchInput = document.getElementById('paymentSearchInput');
    const previousButton = document.getElementById('previousPaymentPageButton');
    const nextButton = document.getElementById('nextPaymentPageButton');

    searchInput?.addEventListener('input', () => {
        state.search = searchInput.value;
        state.page = 1;
        renderPage();
        const refreshedInput = document.getElementById('paymentSearchInput');
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
        const totalPages = Math.max(1, Math.ceil(filteredPayments().length / PAYMENT_PAGE_SIZE));
        if (state.page < totalPages) {
            state.page += 1;
            renderPage();
        }
    });
}

function bindPaymentDetailsModal() {
    const modal = document.getElementById('paymentDetailsModal');
    if (!(modal instanceof HTMLElement)) {
        return;
    }

    const close = () => {
        state.selectedPayment = null;
        renderPage();
    };

    document.querySelectorAll('#closePaymentDetailsButton, #closePaymentDetailsButtonBottom').forEach((button) => button.addEventListener('click', close));
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
}

async function applyPaymentFilters(filterForm) {
    state.filters.status = String(filterForm.elements.status.value || 'all');
    state.filters.provider = String(filterForm.elements.provider.value || 'all');
    state.page = 1;
    await refreshPaymentsList();
    renderPage();
}

function bindFilterControls() {
    const filterForm = document.getElementById('paymentFiltersForm');
    const resetButton = document.getElementById('resetPaymentFiltersButton');

    if (filterForm instanceof HTMLFormElement) {
        filterForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await applyPaymentFilters(filterForm);
        });

        filterForm.addEventListener('change', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLSelectElement)) {
                return;
            }

            await applyPaymentFilters(filterForm);
        });
    }

    if (resetButton instanceof HTMLButtonElement) {
        resetButton.addEventListener('click', async () => {
            state.filters.status = 'all';
            state.filters.provider = 'all';
            state.search = '';
            state.page = 1;
            await refreshPaymentsList();
            renderPage();
        });
    }
}

function bindPaymentListActions() {
    const paymentRows = document.getElementById('paymentRows');
    if (!paymentRows) {
        return;
    }

    paymentRows.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const button = target.closest('[data-open-payment]');
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        const paymentRef = String(button.getAttribute('data-open-payment') || '').trim();
        if (!paymentRef) {
            return;
        }

        button.setAttribute('disabled', 'disabled');
        const originalText = button.textContent;
        button.textContent = 'Loading...';

        try {
            const data = await getAdminPayment(paymentRef);
            state.selectedPayment = data?.payment || null;
            renderPage();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unable to load payment details.', 'error');
            button.removeAttribute('disabled');
            button.textContent = originalText;
        }
    });
}

async function refreshPaymentsList() {
    const params = {};

    if (state.filters.status !== 'all') {
        params.status = state.filters.status;
    }

    if (state.filters.provider !== 'all') {
        params.provider = state.filters.provider;
    }

    const paymentsData = await getAdminPayments(params);
    state.payments = Array.isArray(paymentsData?.payments) ? paymentsData.payments : [];
    state.totals = {
        today: Number(paymentsData?.totals?.today || 0),
        week: Number(paymentsData?.totals?.week || 0),
        month: Number(paymentsData?.totals?.month || 0)
    };

    if (state.selectedPayment) {
        const selectedInList = state.payments.find((payment) => payment.transactionRef === state.selectedPayment.transactionRef);
        state.selectedPayment = selectedInList || null;
    }
}

async function refreshPaymentsPage() {
    const meData = await getCurrentAdmin();
    state.admin = meData?.admin || null;

    if (!state.admin) {
        window.location.href = adminLoginPath();
        return;
    }

    await refreshPaymentsList();
    renderPage();
}

async function initPaymentsPage() {
    try {
        document.title = 'Admin Payments | ANTOBELL';
        await refreshPaymentsPage();
    } catch (error) {
        window.location.href = adminLoginPath();
    }
}

initPaymentsPage();
