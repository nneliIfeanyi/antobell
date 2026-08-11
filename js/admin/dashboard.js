/**
 * Admin dashboard controller.
 */

import {
    getCurrentAdmin,
    getDashboardSummary,
    getPendingPaymentBookings,
    logoutAdmin,
    markBookingPaidOnsite,
    revokeOverdueUnpaidBooking
} from './api.js';
import { formatCurrency } from '../helper.js';
import { bindAdminMobileMenu, enhanceResponsiveTables, renderAdminHeader } from './layout.js';
import { showToast } from '../toast.js';

const app = document.getElementById('app');

function adminLoginPath() {
    return './login.html';
}

function adminApartmentsPath() {
    return './apartments.html';
}

function adminBookingsPath() {
    return './bookings.html';
}

function adminPaymentsPath() {
    return './payments.html';
}

function adminSettingsPath() {
    return './settings.html';
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

function buildDashboardPage(admin, summaryData, queueData) {
    const summary = summaryData?.summary || {};
    const recentBookings = Array.isArray(summaryData?.recentBookings) ? summaryData.recentBookings : [];
    const pendingBookings = Array.isArray(queueData?.bookings) ? queueData.bookings : [];

    return `
        <div class="min-h-screen bg-admin-shell">
            ${renderAdminHeader({ title: 'Operations dashboard', activeView: 'dashboard', adminName: admin.fullName })}
            <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <article class="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
                        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Active apartments</p>
                        <p class="mt-3 text-3xl font-semibold text-slate-900">${summary.activeApartments || 0}</p>
                    </article>
                    <article class="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
                        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Total bookings</p>
                        <p class="mt-3 text-3xl font-semibold text-slate-900">${summary.totalBookings || 0}</p>
                    </article>
                    <article class="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 shadow-soft">
                        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Pending payment</p>
                        <p class="mt-3 text-3xl font-semibold text-amber-950">${summary.pendingPaymentBookings || 0}</p>
                    </article>
                    <article class="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft">
                        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Confirmed</p>
                        <p class="mt-3 text-3xl font-semibold text-emerald-950">${summary.confirmedBookings || 0}</p>
                    </article>
                    <article class="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 shadow-soft">
                        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">Unpaid</p>
                        <p class="mt-3 text-3xl font-semibold text-rose-950">${summary.unpaidBookings || 0}</p>
                    </article>
                </section>
                <section class="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                        <div class="flex items-center justify-between gap-4">
                            <div>
                                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Recent bookings</p>
                                <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Latest reservation activity</h2>
                            </div>
                        </div>
                        <div class="mt-6 overflow-x-auto">
                            <table id="recentBookingsTable" class="min-w-full divide-y divide-slate-200 text-sm">
                                <thead>
                                    <tr class="text-left text-slate-500">
                                        <th class="pb-3 font-medium">Booking</th>
                                        <th class="pb-3 font-medium">Guest</th>
                                        <th class="pb-3 font-medium">Amount</th>
                                        <th class="pb-3 font-medium">Status</th>
                                        <th class="pb-3 font-medium">Created</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-slate-700">
                                    ${recentBookings.length ? recentBookings.map((booking) => `
                                        <tr>
                                            <td class="py-4 font-medium text-slate-900">${booking.bookingNumber}</td>
                                            <td class="py-4">${booking.guestName}</td>
                                            <td class="py-4">${formatCurrency(booking.totalAmount || 0)}</td>
                                            <td class="py-4"><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">${booking.status.replace('_', ' ')}</span></td>
                                            <td class="py-4">${booking.createdAt}</td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="5" class="py-8 text-center text-slate-500">No bookings yet.</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </article>
                    <aside class="space-y-6">
                        <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                            <div class="flex items-start justify-between gap-3">
                                <div>
                                    <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Bookings queue</p>
                                    <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Pending onsite payment</h2>
                                </div>
                                <span class="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">${pendingBookings.length} open</span>
                            </div>
                            <div class="mt-4 space-y-3" id="pendingQueueList">
                                ${pendingBookings.length ? pendingBookings.map((booking) => `
                                    <article class="rounded-2xl border ${booking.isOverdue ? 'border-rose-200 bg-rose-50/70' : 'border-slate-200 bg-slate-50'} p-4">
                                        <div class="flex items-start justify-between gap-3">
                                            <div>
                                                <p class="text-sm font-semibold text-slate-900">${booking.bookingNumber}</p>
                                                <p class="mt-1 text-xs uppercase tracking-[0.18em] ${booking.isOverdue ? 'text-rose-700' : 'text-slate-500'}">${booking.isOverdue ? 'Overdue' : 'Awaiting payment'}</p>
                                            </div>
                                            <div class="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                                                ${booking.isOverdue ? `<button type="button" data-revoke-overdue="${booking.bookingNumber}" class="inline-flex items-center justify-center rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700">Revoke</button>` : ''}
                                                <button type="button" data-mark-paid="${booking.bookingNumber}" class="inline-flex items-center justify-center rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700">Mark paid</button>
                                            </div>
                                        </div>
                                        <div class="mt-3 space-y-1 text-xs text-slate-600">
                                            <p><span class="font-semibold text-slate-800">Guest:</span> ${booking.guestName}</p>
                                            <p><span class="font-semibold text-slate-800">Apartment:</span> ${booking.apartment.name}</p>
                                            <p><span class="font-semibold text-slate-800">Amount:</span> ${formatCurrency(booking.totalAmount || 0)}</p>
                                            <p><span class="font-semibold text-slate-800">Due:</span> ${formatDateTime(booking.paymentDueAt)}</p>
                                        </div>
                                    </article>
                                `).join('') : `
                                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No pending-payment bookings in queue.</div>
                                `}
                            </div>
                            <a href="${adminSettingsPath()}" class="mt-5 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Open site settings</a>
                        </article>
                    </aside>
                </section>
            </main>
        </div>
    `;
}

function bindLogout() {
    const logoutButtons = document.querySelectorAll('[data-admin-logout]');
    if (!logoutButtons.length) {
        return;
    }

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

function bindPendingQueueActions() {
    const queueList = document.getElementById('pendingQueueList');
    if (!queueList) {
        return;
    }

    queueList.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const button = target.closest('[data-mark-paid]');
        const revokeButton = target.closest('[data-revoke-overdue]');

        if (button instanceof HTMLButtonElement) {
            const bookingRef = String(button.getAttribute('data-mark-paid') || '').trim();
            if (!bookingRef) {
                return;
            }

            button.setAttribute('disabled', 'disabled');
            const originalText = button.textContent;
            button.textContent = 'Confirming...';

            try {
                await markBookingPaidOnsite(bookingRef);
                showToast(`Booking ${bookingRef} marked as paid onsite.`, 'success');
                await refreshDashboard();
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to mark booking as paid.', 'error');
                button.removeAttribute('disabled');
                button.textContent = originalText;
            }
            return;
        }

        if (revokeButton instanceof HTMLButtonElement) {
            const bookingRef = String(revokeButton.getAttribute('data-revoke-overdue') || '').trim();
            if (!bookingRef) {
                return;
            }

            revokeButton.setAttribute('disabled', 'disabled');
            const originalText = revokeButton.textContent;
            revokeButton.textContent = 'Revoking...';

            try {
                await revokeOverdueUnpaidBooking(bookingRef);
                showToast(`Booking ${bookingRef} revoked for overdue onsite payment.`, 'success');
                await refreshDashboard();
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to revoke booking.', 'error');
                revokeButton.removeAttribute('disabled');
                revokeButton.textContent = originalText;
            }
        }
    });
}

async function refreshDashboard() {
    const meData = await getCurrentAdmin();
    const summaryData = await getDashboardSummary();
    const queueData = await getPendingPaymentBookings();
    const admin = meData?.admin;

    if (!admin) {
        window.location.href = adminLoginPath();
        return;
    }

    if (app) {
        app.innerHTML = buildDashboardPage(admin, summaryData, queueData);
        bindAdminMobileMenu();
        enhanceResponsiveTables('#recentBookingsTable');
        bindLogout();
        bindPendingQueueActions();
    }
}

async function initDashboard() {
    try {
        document.title = 'Admin Dashboard | ANTOBELL';
        await refreshDashboard();
    } catch (error) {
        window.location.href = adminLoginPath();
    }
}

initDashboard();
