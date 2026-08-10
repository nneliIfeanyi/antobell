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
const state = {
    admin: null,
    payments: [],
    selectedPayment: null,
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

function buildPaymentsPage() {
    const payments = state.payments;
    const selected = state.selectedPayment;
    const adminName = state.admin?.fullName || '';

    return `
        <div class="min-h-screen bg-admin-shell">
            ${renderAdminHeader({ title: 'Payments history', activeView: 'payments', adminName })}
            <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
                            <button id="resetPaymentFiltersButton" type="button" class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset</button>
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

function renderPage() {
    if (!app) {
        return;
    }

    app.innerHTML = buildPaymentsPage();
    bindAdminMobileMenu();
    enhanceResponsiveTables('#paymentsTable');
    bindTopActions();
    bindFilterControls();
    bindPaymentListActions();
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
