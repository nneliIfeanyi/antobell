/**
 * Admin settings controller.
 */

import {
    createAdminTestimonial,
    createAdminUser,
    getAdminSettingsBundle,
    getCurrentAdmin,
    logoutAdmin,
    updateAdminTestimonial,
    updateAdminUserPassword,
    updateUnpaidRevokeHours,
    deleteAdminTestimonial,
} from './api.js';
import { bindAdminMobileMenu, renderAdminHeader } from './layout.js';
import { showToast } from '../toast.js';

const app = document.getElementById('app');

const state = {
    admin: null,
    settings: {
        unpaidRevokeHours: 3,
    },
    adminUsers: [],
    testimonials: [],
    editTestimonialId: null,
};

function adminLoginPath() {
    return './login.html';
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function buildSettingsPage() {
    const adminName = state.admin?.fullName || '';
    const unpaidRevokeHours = Number(state.settings.unpaidRevokeHours || 3);

    return `
        <div class="min-h-screen bg-admin-shell">
            ${renderAdminHeader({ title: 'Site settings', activeView: 'settings', adminName })}
            <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <section class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Booking policy</p>
                        <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Unpaid revoke window</h2>
                        <p class="mt-2 text-sm text-slate-600">This value controls backend overdue checks and the client success-page deadline messaging.</p>
                        <form id="revokeWindowForm" class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                            <label class="block w-full max-w-xs space-y-2">
                                <span class="text-sm font-medium text-slate-700">Hours</span>
                                <input name="hours" type="number" min="1" max="72" step="1" value="${escapeHtml(String(unpaidRevokeHours))}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                            </label>
                            <button id="saveRevokeWindowButton" type="submit" class="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700">Save setting</button>
                        </form>
                    </article>

                    <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Access</p>
                        <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Add admin user</h2>
                        <form id="createAdminUserForm" class="mt-5 space-y-3">
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Full name</span>
                                <input name="fullName" type="text" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                            </label>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Email</span>
                                <input name="email" type="email" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                            </label>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Password</span>
                                <input name="password" type="password" minlength="10" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                            </label>
                            <button id="createAdminUserButton" type="submit" class="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700">Create admin user</button>
                        </form>
                    </article>
                </section>

                <section class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                    <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Users</p>
                    <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Admin users</h2>
                    <div class="mt-5 space-y-3">
                        ${state.adminUsers.length ? state.adminUsers.map((user) => `
                            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                    <div>
                                        <p class="text-sm font-semibold text-slate-900">${escapeHtml(user.fullName)}</p>
                                        <p class="text-xs text-slate-600">${escapeHtml(user.email)}${user.lastLoginAt ? ` • Last login ${escapeHtml(user.lastLoginAt)}` : ''}</p>
                                    </div>
                                    <form class="flex w-full max-w-md items-end gap-2" data-user-password-form="${user.id}">
                                        <label class="block flex-1 space-y-1">
                                            <span class="text-xs font-medium text-slate-600">New password</span>
                                            <input name="newPassword" type="password" minlength="10" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" required />
                                        </label>
                                        <button type="submit" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Update password</button>
                                    </form>
                                </div>
                            </article>
                        `).join('') : '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No admin users found.</div>'}
                    </div>
                </section>

                <section class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                    <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Homepage</p>
                    <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Testimonials</h2>
                    <form id="testimonialForm" class="mt-5 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                        <label class="block space-y-2">
                            <span class="text-sm font-medium text-slate-700">Name</span>
                            <input name="name" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                        </label>
                        <label class="block space-y-2">
                            <span class="text-sm font-medium text-slate-700">Role</span>
                            <input name="role" type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                        </label>
                        <label class="block space-y-2 md:col-span-2">
                            <span class="text-sm font-medium text-slate-700">Quote</span>
                            <textarea name="quote" rows="3" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500" required></textarea>
                        </label>
                        <label class="block space-y-2">
                            <span class="text-sm font-medium text-slate-700">Sort order</span>
                            <input name="sortOrder" type="number" min="1" step="1" value="1" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                        </label>
                        <label class="block space-y-2">
                            <span class="text-sm font-medium text-slate-700">Status</span>
                            <select name="isActive" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500">
                                <option value="1" selected>Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </label>
                        <div class="md:col-span-2 flex flex-col gap-2 sm:flex-row">
                            <button id="saveTestimonialButton" type="submit" class="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700">Save testimonial</button>
                            <button id="resetTestimonialFormButton" type="button" class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset</button>
                        </div>
                    </form>
                    <div class="mt-5 space-y-3">
                        ${state.testimonials.length ? state.testimonials.map((testimonial) => `
                            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p class="text-sm font-semibold text-slate-900">${escapeHtml(testimonial.name)} <span class="text-xs font-medium text-slate-500">(${escapeHtml(testimonial.role)})</span></p>
                                        <p class="mt-1 text-sm text-slate-700">${escapeHtml(testimonial.quote)}</p>
                                        <p class="mt-2 text-xs text-slate-500">Sort ${testimonial.sortOrder} • ${testimonial.isActive ? 'Active' : 'Inactive'}</p>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button type="button" data-edit-testimonial="${testimonial.id}" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">Edit</button>
                                        <button type="button" data-delete-testimonial="${testimonial.id}" class="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">Delete</button>
                                    </div>
                                </div>
                            </article>
                        `).join('') : '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No testimonials yet.</div>'}
                    </div>
                </section>
            </main>
        </div>
    `;
}

function bindTopActions() {
    const logoutButtons = document.querySelectorAll('[data-admin-logout]');
    logoutButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        button.addEventListener('click', async () => {
            button.setAttribute('disabled', 'disabled');
            try {
                await logoutAdmin();
                window.location.href = adminLoginPath();
            } catch (error) {
                button.removeAttribute('disabled');
                showToast(error instanceof Error ? error.message : 'Unable to log out.', 'error');
            }
        });
    });
}

function hydrateTestimonialForm(testimonial) {
    const form = document.getElementById('testimonialForm');
    if (!(form instanceof HTMLFormElement)) {
        return;
    }

    form.elements.name.value = testimonial?.name || '';
    form.elements.role.value = testimonial?.role || '';
    form.elements.quote.value = testimonial?.quote || '';
    form.elements.sortOrder.value = testimonial ? String(testimonial.sortOrder || 1) : '1';
    form.elements.isActive.value = testimonial && testimonial.isActive === false ? '0' : '1';

    state.editTestimonialId = testimonial ? testimonial.id : null;

    const button = document.getElementById('saveTestimonialButton');
    if (button instanceof HTMLButtonElement) {
        button.textContent = state.editTestimonialId ? 'Update testimonial' : 'Save testimonial';
    }
}

function bindRevokeWindowForm() {
    const form = document.getElementById('revokeWindowForm');
    const button = document.getElementById('saveRevokeWindowButton');

    if (!(form instanceof HTMLFormElement) || !(button instanceof HTMLButtonElement)) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const hours = Number(form.elements.hours.value || 0);
        if (!Number.isFinite(hours) || hours < 1 || hours > 72) {
            showToast('Hours must be between 1 and 72.', 'error');
            return;
        }

        button.setAttribute('disabled', 'disabled');
        const text = button.textContent;
        button.textContent = 'Saving...';

        try {
            const data = await updateUnpaidRevokeHours(hours);
            state.settings.unpaidRevokeHours = Number(data?.unpaidRevokeHours || hours);
            showToast('Unpaid revoke window updated.', 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unable to update setting.', 'error');
        } finally {
            button.removeAttribute('disabled');
            button.textContent = text;
        }
    });
}

function bindAdminUserForms() {
    const createForm = document.getElementById('createAdminUserForm');
    const createButton = document.getElementById('createAdminUserButton');

    if (createForm instanceof HTMLFormElement && createButton instanceof HTMLButtonElement) {
        createForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const fullName = String(createForm.elements.fullName.value || '').trim();
            const email = String(createForm.elements.email.value || '').trim();
            const password = String(createForm.elements.password.value || '');

            if (!fullName || !email || password.length < 10) {
                showToast('Provide name, email, and a password of at least 10 characters.', 'error');
                return;
            }

            createButton.setAttribute('disabled', 'disabled');
            const text = createButton.textContent;
            createButton.textContent = 'Creating...';

            try {
                const data = await createAdminUser({ fullName, email, password });
                state.adminUsers = Array.isArray(data?.adminUsers) ? data.adminUsers : state.adminUsers;
                createForm.reset();
                renderPage();
                showToast('Admin user created.', 'success');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to create admin user.', 'error');
                createButton.removeAttribute('disabled');
                createButton.textContent = text;
            }
        });
    }

    const passwordForms = document.querySelectorAll('[data-user-password-form]');
    passwordForms.forEach((form) => {
        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const userId = Number(form.getAttribute('data-user-password-form') || 0);
            const newPassword = String(form.elements.newPassword.value || '');

            if (userId <= 0 || newPassword.length < 10) {
                showToast('Password must be at least 10 characters.', 'error');
                return;
            }

            const submitButton = form.querySelector('button[type="submit"]');
            if (!(submitButton instanceof HTMLButtonElement)) {
                return;
            }

            submitButton.setAttribute('disabled', 'disabled');
            const text = submitButton.textContent;
            submitButton.textContent = 'Updating...';

            try {
                const data = await updateAdminUserPassword(userId, { newPassword });
                state.adminUsers = Array.isArray(data?.adminUsers) ? data.adminUsers : state.adminUsers;
                renderPage();
                showToast('Admin user password updated.', 'success');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to update password.', 'error');
                submitButton.removeAttribute('disabled');
                submitButton.textContent = text;
            }
        });
    });
}

function bindTestimonialForms() {
    const form = document.getElementById('testimonialForm');
    const saveButton = document.getElementById('saveTestimonialButton');
    const resetButton = document.getElementById('resetTestimonialFormButton');

    if (form instanceof HTMLFormElement && saveButton instanceof HTMLButtonElement) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const payload = {
                name: String(form.elements.name.value || '').trim(),
                role: String(form.elements.role.value || '').trim(),
                quote: String(form.elements.quote.value || '').trim(),
                sortOrder: Number(form.elements.sortOrder.value || 1),
                isActive: String(form.elements.isActive.value || '1') === '1',
            };

            if (!payload.name || !payload.role || !payload.quote) {
                showToast('Name, role, and quote are required.', 'error');
                return;
            }

            saveButton.setAttribute('disabled', 'disabled');
            const text = saveButton.textContent;
            saveButton.textContent = state.editTestimonialId ? 'Updating...' : 'Saving...';

            try {
                const data = state.editTestimonialId
                    ? await updateAdminTestimonial(state.editTestimonialId, payload)
                    : await createAdminTestimonial(payload);

                state.testimonials = Array.isArray(data?.testimonials) ? data.testimonials : state.testimonials;
                state.editTestimonialId = null;
                renderPage();
                showToast('Testimonial saved.', 'success');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to save testimonial.', 'error');
                saveButton.removeAttribute('disabled');
                saveButton.textContent = text;
            }
        });
    }

    if (resetButton instanceof HTMLButtonElement) {
        resetButton.addEventListener('click', () => {
            hydrateTestimonialForm(null);
        });
    }

    const editButtons = document.querySelectorAll('[data-edit-testimonial]');
    editButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        button.addEventListener('click', () => {
            const id = Number(button.getAttribute('data-edit-testimonial') || 0);
            const testimonial = state.testimonials.find((item) => Number(item.id) === id) || null;
            if (!testimonial) {
                return;
            }

            hydrateTestimonialForm(testimonial);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    const deleteButtons = document.querySelectorAll('[data-delete-testimonial]');
    deleteButtons.forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        button.addEventListener('click', async () => {
            const id = Number(button.getAttribute('data-delete-testimonial') || 0);
            if (id <= 0) {
                return;
            }

            button.setAttribute('disabled', 'disabled');
            const text = button.textContent;
            button.textContent = 'Deleting...';

            try {
                const data = await deleteAdminTestimonial(id);
                state.testimonials = Array.isArray(data?.testimonials) ? data.testimonials : state.testimonials;
                if (state.editTestimonialId === id) {
                    state.editTestimonialId = null;
                }
                renderPage();
                showToast('Testimonial deleted.', 'success');
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to delete testimonial.', 'error');
                button.removeAttribute('disabled');
                button.textContent = text;
            }
        });
    });
}

function renderPage() {
    if (!app) {
        return;
    }

    app.innerHTML = buildSettingsPage();
    bindAdminMobileMenu();
    bindTopActions();
    bindRevokeWindowForm();
    bindAdminUserForms();
    bindTestimonialForms();

    if (!state.editTestimonialId) {
        hydrateTestimonialForm(null);
    }
}

async function refreshSettingsPage() {
    const meData = await getCurrentAdmin();
    state.admin = meData?.admin || null;

    if (!state.admin) {
        window.location.href = adminLoginPath();
        return;
    }

    const bundle = await getAdminSettingsBundle();
    state.settings.unpaidRevokeHours = Number(bundle?.settings?.unpaidRevokeHours || 3);
    state.adminUsers = Array.isArray(bundle?.adminUsers) ? bundle.adminUsers : [];
    state.testimonials = Array.isArray(bundle?.testimonials) ? bundle.testimonials : [];
    renderPage();
}

async function initSettingsPage() {
    try {
        document.title = 'Admin Settings | ANTOBELL';
        await refreshSettingsPage();
    } catch (error) {
        window.location.href = adminLoginPath();
    }
}

initSettingsPage();
