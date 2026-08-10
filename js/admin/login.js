/**
 * Admin login page controller.
 */

import { loginAdmin, getCurrentAdmin } from './api.js';
import { showToast } from '../toast.js';

const app = document.getElementById('app');

function adminDashboardPath() {
    return './index.html';
}

function buildLoginPage() {
    return `
        <main class="relative min-h-screen overflow-hidden bg-admin-grid">
            <div class="absolute inset-0 opacity-50">
                <div class="absolute left-8 top-10 h-28 w-28 rounded-full bg-brand-500/20 blur-3xl"></div>
                <div class="absolute bottom-12 right-10 h-36 w-36 rounded-full bg-cyan-400/15 blur-3xl"></div>
            </div>
            <div class="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
                <div class="grid w-full gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
                    <section class="space-y-6">
                        <span class="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">Admin access</span>
                        <div>
                            <h1 class="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">Manage ANTOBELL operations from a dedicated admin workspace.</h1>
                        </div>
                        <div class="grid gap-4 sm:grid-cols-3">
                            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Scope</p>
                                <p class="mt-2 text-sm text-slate-100">Single admin auth</p>
                            </div>
                            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sessions</p>
                                <p class="mt-2 text-sm text-slate-100">Cookie-backed access</p>
                            </div>
                            <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                                <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Next</p>
                                <p class="mt-2 text-sm text-slate-100">Bookings operations</p>
                            </div>
                        </div>
                    </section>
                    <section class="rounded-[2rem] border border-white/10 bg-white/95 p-7 text-slate-900 shadow-soft backdrop-blur sm:p-8">
                        <div>
                            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">ANTOBELL Admin</p>
                            <h2 class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
                        </div>
                        <form id="adminLoginForm" class="mt-8 space-y-5">
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Email</span>
                                <input name="email" type="email" value="admin@antobell.local" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" required aria-label="Admin email" />
                            </label>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Password</span>
                                <input name="password" type="password" value="ChangeMe123!" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" required aria-label="Admin password" />
                            </label>
                            <button id="adminLoginButton" type="submit" class="inline-flex w-full items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70">Enter dashboard</button>
                        </form>
                       
                    </section>
                </div>
            </div>
        </main>
    `;
}

function bindLoginForm() {
    const form = document.getElementById('adminLoginForm');
    const button = document.getElementById('adminLoginButton');

    if (!form || !button) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = 'Signing in...';

        const formData = new FormData(form);

        try {
            await loginAdmin({
                email: String(formData.get('email') || '').trim(),
                password: String(formData.get('password') || '')
            });
            window.location.href = adminDashboardPath();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unable to sign in.', 'error');
            button.disabled = false;
            button.textContent = originalText;
        }
    });
}

async function initLoginPage() {
    try {
        await getCurrentAdmin();
        window.location.href = adminDashboardPath();
        return;
    } catch (error) {
        // Continue to login form when no valid session exists.
    }

    document.title = 'Admin Login | ANTOBELL';
    if (app) {
        app.innerHTML = buildLoginPage();
        bindLoginForm();
    }
}

initLoginPage().catch(() => {
    if (app) {
        app.innerHTML = buildLoginPage();
        bindLoginForm();
    }
});
