/**
 * Admin apartments controller.
 */

import {
    createAdminApartment,
    deactivateAdminApartment,
    getAdminApartment,
    getAdminApartments,
    getCurrentAdmin,
    hardDeleteAdminApartment,
    logoutAdmin,
    updateAdminApartment
} from './api.js';
import { formatCurrency } from '../helper.js';
import { bindAdminMobileMenu, enhanceResponsiveTables, renderAdminHeader } from './layout.js';
import { showToast } from '../toast.js';

const app = document.getElementById('app');
const APARTMENT_FILTER_DEBOUNCE_MS = 300;
const state = {
    admin: null,
    apartments: [],
    filters: {
        search: '',
        active: 'all'
    },
    selectedApartment: null,
    modal: null,
    filterDebounceId: null
};

function adminLoginPath() {
    return './login.html';
}

function adminDashboardPath() {
    return './index.html';
}

function adminPaymentsPath() {
    return './payments.html';
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function statusBadge(isActive) {
    if (isActive) {
        return '<span class="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Active</span>';
    }

    return '<span class="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Inactive</span>';
}

function collectListFromText(text) {
    return String(text || '')
        .split(/\r\n|\r|\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function apartmentPayloadFromForm(form) {
    return {
        publicId: String(form.elements.publicId.value || '').trim() || undefined,
        name: String(form.elements.name.value || '').trim(),
        badge: String(form.elements.badge.value || '').trim(),
        location: String(form.elements.location.value || '').trim(),
        address: String(form.elements.address.value || '').trim(),
        description: String(form.elements.description.value || '').trim(),
        imageUrl: String(form.elements.imageUrl.value || '').trim(),
        pricePerNight: Number(form.elements.pricePerNight.value || 0),
        rating: Number(form.elements.rating.value || 0),
        bedrooms: Number(form.elements.bedrooms.value || 0),
        bathrooms: Number(form.elements.bathrooms.value || 0),
        isActive: String(form.elements.isActive.value || '1') === '1',
        isFeatured: form.elements.isFeatured.checked,
        amenities: collectListFromText(form.elements.amenities.value),
        houseRules: collectListFromText(form.elements.houseRules.value),
        gallery: collectListFromText(form.elements.gallery.value),
    };
}

function selectedPublicId() {
    return state.selectedApartment?.publicId || '';
}

function imagePreviewMarkup(imageUrl, apartmentName) {
    if (!imageUrl) {
        return `
            <div class="flex h-44 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                Add an image URL to preview the apartment cover.
            </div>
        `;
    }

    return `
        <div class="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
            <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(apartmentName || 'Apartment preview')}" class="h-44 w-full object-cover" />
        </div>
    `;
}

function buildModalMarkup() {
    if (!state.modal) {
        return '';
    }

    return `
        <div id="adminModalOverlay" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4">
            <div class="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                <p class="text-sm font-semibold uppercase tracking-[0.2em] ${state.modal.variant === 'danger' ? 'text-rose-700' : 'text-brand-700'}">${escapeHtml(state.modal.eyebrow)}</p>
                <h2 class="mt-3 text-2xl font-semibold tracking-tight text-slate-900">${escapeHtml(state.modal.title)}</h2>
                <p class="mt-3 text-sm leading-6 text-slate-600">${escapeHtml(state.modal.message)}</p>
                ${state.modal.requiresText ? `
                    <label class="mt-5 block space-y-2">
                        <span class="text-sm font-medium text-slate-700">Type ${escapeHtml(state.modal.expectedText)} to continue</span>
                        <input id="adminModalConfirmText" type="text" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" />
                    </label>
                ` : ''}
                <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button id="adminModalCancelButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">Cancel</button>
                    <button id="adminModalConfirmButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl ${state.modal.variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-600 hover:bg-brand-700'} px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto">${escapeHtml(state.modal.confirmLabel)}</button>
                </div>
            </div>
        </div>
    `;
}

function buildApartmentsPage() {
    const admin = state.admin;
    const apartments = state.apartments;
    const selected = state.selectedApartment;
    const selectedImageUrl = selected?.imageUrl || '';
    const selectedName = selected?.name || '';

    return `
        <div class="min-h-screen bg-admin-shell">
            ${renderAdminHeader({ title: 'Apartments management', activeView: 'apartments', adminName: admin?.fullName || '' })}
            <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <section class="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
                    <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Editor</p>
                                <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Create or update apartment</h2>
                                <p class="mt-2 text-sm text-slate-600">Select an apartment from the list to edit it, or create a new one.</p>
                            </div>
                            <div class="w-full shrink-0 sm:w-40">${imagePreviewMarkup(selectedImageUrl, selectedName)}</div>
                        </div>
                        <form id="apartmentForm" class="mt-6 space-y-4">
                            <input type="hidden" name="publicId" value="${escapeHtml(selected?.publicId || '')}" />
                            <div class="grid gap-4 sm:grid-cols-2">
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Name</span>
                                    <input name="name" type="text" value="${escapeHtml(selected?.name || '')}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                                </label>
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Badge</span>
                                    <input name="badge" type="text" value="${escapeHtml(selected?.badge || '')}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" />
                                </label>
                            </div>
                            <div class="grid gap-4 sm:grid-cols-2">
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Location</span>
                                    <input name="location" type="text" value="${escapeHtml(selected?.location || '')}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                                </label>
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Address</span>
                                    <input name="address" type="text" value="${escapeHtml(selected?.address || '')}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                                </label>
                            </div>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Description</span>
                                <textarea name="description" rows="3" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required>${escapeHtml(selected?.description || '')}</textarea>
                            </label>
                            <div class="grid gap-4 sm:grid-cols-2">
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Image URL</span>
                                    <input id="apartmentImageUrlInput" name="imageUrl" type="url" value="${escapeHtml(selected?.imageUrl || '')}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                                </label>
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Price per night (NGN)</span>
                                    <input name="pricePerNight" type="number" min="1" step="1" value="${escapeHtml(String(selected?.pricePerNight || ''))}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                                </label>
                            </div>
                            <div id="apartmentImagePreview" class="hidden sm:block"></div>
                            <div class="grid gap-4 sm:grid-cols-4">
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Rating</span>
                                    <input name="rating" type="number" min="0" max="5" step="0.1" value="${escapeHtml(String(selected?.rating || ''))}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                                </label>
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Bedrooms</span>
                                    <input name="bedrooms" type="number" min="1" step="1" value="${escapeHtml(String(selected?.bedrooms || ''))}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                                </label>
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Bathrooms</span>
                                    <input name="bathrooms" type="number" min="1" step="1" value="${escapeHtml(String(selected?.bathrooms || ''))}" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500" required />
                                </label>
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Status</span>
                                    <select name="isActive" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500">
                                        <option value="1" ${selected?.isActive !== false ? 'selected' : ''}>Active</option>
                                        <option value="0" ${selected?.isActive === false ? 'selected' : ''}>Inactive</option>
                                    </select>
                                </label>
                                <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                    <input name="isFeatured" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" ${selected?.isFeatured ? 'checked' : ''} />
                                    <span>
                                        <span class="block text-sm font-medium text-slate-700">Feature on homepage</span>
                                        <span class="mt-1 block text-xs text-slate-500">Only four active apartments can be featured.</span>
                                    </span>
                                </label>
                            </div>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Amenities (one per line)</span>
                                <textarea name="amenities" rows="3" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500">${escapeHtml((selected?.amenities || []).join('\n'))}</textarea>
                            </label>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">House rules (one per line)</span>
                                <textarea name="houseRules" rows="3" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500">${escapeHtml((selected?.houseRules || []).join('\n'))}</textarea>
                            </label>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Gallery URLs (one per line)</span>
                                <textarea name="gallery" rows="3" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-brand-500">${escapeHtml((selected?.gallery || []).join('\n'))}</textarea>
                            </label>
                            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                                <button id="saveApartmentButton" type="submit" class="inline-flex w-full items-center justify-center rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto">${selected ? 'Update apartment' : 'Create apartment'}</button>
                                <button id="resetApartmentFormButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">Reset</button>
                                ${selected ? '<button id="deactivateApartmentButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 sm:w-auto">Deactivate</button>' : ''}
                                ${selected ? '<button id="hardDeleteApartmentButton" type="button" class="inline-flex w-full items-center justify-center rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 sm:w-auto">Hard delete</button>' : ''}
                            </div>
                        </form>
                    </article>
                    <article class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Inventory</p>
                                <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Apartments list</h2>
                            </div>
                            <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Signed in as ${escapeHtml(admin?.fullName || '')}</div>
                        </div>
                        <form id="apartmentFiltersForm" class="mt-5 grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Search</span>
                                <input name="search" type="text" value="${escapeHtml(state.filters.search)}" placeholder="Search by name, location, or public ID" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500" />
                            </label>
                            <label class="block space-y-2">
                                <span class="text-sm font-medium text-slate-700">Status</span>
                                <select name="active" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-500">
                                    <option value="all" ${state.filters.active === 'all' ? 'selected' : ''}>All</option>
                                    <option value="1" ${state.filters.active === '1' ? 'selected' : ''}>Active</option>
                                    <option value="0" ${state.filters.active === '0' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </label>
                            <button id="resetApartmentFiltersButton" type="button" class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Reset</button>
                        </form>
                        <div class="mt-5 flex items-center justify-between text-sm text-slate-500">
                            <p>${apartments.length} apartment${apartments.length === 1 ? '' : 's'} shown</p>
                        </div>
                        <div class="mt-5 overflow-x-auto">
                            <table class="min-w-full divide-y divide-slate-200 text-sm">
                                <thead>
                                    <tr class="text-left text-slate-500">
                                        <th class="pb-3 font-medium">Apartment</th>
                                        <th class="pb-3 font-medium">Price</th>
                                        <th class="pb-3 font-medium">Rating</th>
                                        <th class="pb-3 font-medium">Status</th>
                                        <th class="pb-3 font-medium">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-slate-700" id="apartmentRows">
                                    ${apartments.length ? apartments.map((apartment) => `
                                        <tr class="${selectedPublicId() === apartment.publicId ? 'bg-brand-50/60' : ''}">
                                            <td class="py-4">
                                                <p class="font-semibold text-slate-900">${escapeHtml(apartment.name)}</p>
                                                <p class="mt-1 text-xs text-slate-500">${escapeHtml(apartment.publicId)} • ${escapeHtml(apartment.location)}</p>
                                            </td>
                                            <td class="py-4">${formatCurrency(apartment.pricePerNight || 0)}</td>
                                            <td class="py-4">${Number(apartment.rating || 0).toFixed(1)}</td>
                                            <td class="py-4"><div class="space-y-2">${statusBadge(apartment.isActive)}${apartment.isFeatured ? '<span class="block text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Featured</span>' : ''}</div></td>
                                            <td class="py-4">
                                                <button type="button" data-edit-apartment="${escapeHtml(apartment.publicId)}" class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">Edit</button>
                                            </td>
                                        </tr>
                                    `).join('') : `
                                        <tr>
                                            <td colspan="5" class="py-10 text-center text-slate-500">No apartments found for the current filters.</td>
                                        </tr>
                                    `}
                                </tbody>
                            </table>
                        </div>
                    </article>
                </section>
            </main>
            ${buildModalMarkup()}
        </div>
    `;
}

function updateImagePreview() {
    const preview = document.getElementById('apartmentImagePreview');
    const imageInput = document.getElementById('apartmentImageUrlInput');
    const nameInput = document.querySelector('#apartmentForm input[name="name"]');

    if (!preview || !(imageInput instanceof HTMLInputElement)) {
        return;
    }

    preview.innerHTML = imagePreviewMarkup(imageInput.value.trim(), nameInput instanceof HTMLInputElement ? nameInput.value.trim() : 'Apartment preview');
}

function openModal(config) {
    state.modal = config;
    renderPage();
}

function closeModal() {
    state.modal = null;
    renderPage();
}

function resetApartmentSelection() {
    state.selectedApartment = null;
}

function renderPage() {
    if (!app) {
        return;
    }

    app.innerHTML = buildApartmentsPage();
    bindAdminMobileMenu();
    enhanceResponsiveTables('main table');
    bindTopActions();
    bindFilterControls();
    bindApartmentFormActions();
    bindApartmentListActions();
    bindImagePreview();
    bindModalActions();
    updateImagePreview();
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

function clearApartmentFilterDebounce() {
    if (state.filterDebounceId) {
        window.clearTimeout(state.filterDebounceId);
        state.filterDebounceId = null;
    }
}

async function applyApartmentFilters(filterForm) {
    state.filters.search = String(filterForm.elements.search.value || '').trim();
    state.filters.active = String(filterForm.elements.active.value || 'all');
    await refreshApartmentsList();
    renderPage();
}

function bindFilterControls() {
    const filterForm = document.getElementById('apartmentFiltersForm');
    const resetFiltersButton = document.getElementById('resetApartmentFiltersButton');

    if (filterForm instanceof HTMLFormElement) {
        filterForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            clearApartmentFilterDebounce();
            await applyApartmentFilters(filterForm);
        });

        filterForm.addEventListener('change', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLSelectElement)) {
                return;
            }

            clearApartmentFilterDebounce();
            await applyApartmentFilters(filterForm);
        });

        const searchInput = filterForm.elements.search;
        if (searchInput instanceof HTMLInputElement) {
            searchInput.addEventListener('input', () => {
                clearApartmentFilterDebounce();
                state.filterDebounceId = window.setTimeout(async () => {
                    state.filterDebounceId = null;
                    await applyApartmentFilters(filterForm);
                }, APARTMENT_FILTER_DEBOUNCE_MS);
            });
        }
    }

    if (resetFiltersButton instanceof HTMLButtonElement) {
        resetFiltersButton.addEventListener('click', async () => {
            clearApartmentFilterDebounce();
            state.filters.search = '';
            state.filters.active = 'all';
            await refreshApartmentsList();
            renderPage();
        });
    }
}

function bindImagePreview() {
    const imageInput = document.getElementById('apartmentImageUrlInput');
    const nameInput = document.querySelector('#apartmentForm input[name="name"]');

    if (imageInput instanceof HTMLInputElement) {
        imageInput.addEventListener('input', updateImagePreview);
    }

    if (nameInput instanceof HTMLInputElement) {
        nameInput.addEventListener('input', updateImagePreview);
    }
}

function bindApartmentFormActions() {
    const form = document.getElementById('apartmentForm');
    const saveButton = document.getElementById('saveApartmentButton');
    const resetButton = document.getElementById('resetApartmentFormButton');
    const deactivateButton = document.getElementById('deactivateApartmentButton');
    const hardDeleteButton = document.getElementById('hardDeleteApartmentButton');

    if (!(form instanceof HTMLFormElement) || !(saveButton instanceof HTMLButtonElement)) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const payload = apartmentPayloadFromForm(form);
        const publicId = String(form.elements.publicId.value || '').trim();

        saveButton.setAttribute('disabled', 'disabled');
        const originalText = saveButton.textContent;
        saveButton.textContent = publicId ? 'Updating...' : 'Creating...';

        try {
            const result = publicId
                ? await updateAdminApartment(publicId, payload)
                : await createAdminApartment(payload);

            state.selectedApartment = result?.apartment || null;
            showToast(publicId ? 'Apartment updated successfully.' : 'Apartment created successfully.', 'success');
            await refreshApartmentsList();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unable to save apartment.', 'error');
        } finally {
            saveButton.removeAttribute('disabled');
            saveButton.textContent = originalText;
            renderPage();
        }
    });

    if (resetButton instanceof HTMLButtonElement) {
        resetButton.addEventListener('click', () => {
            resetApartmentSelection();
            renderPage();
        });
    }

    if (deactivateButton instanceof HTMLButtonElement) {
        deactivateButton.addEventListener('click', () => {
            const publicId = selectedPublicId();
            if (!publicId) {
                showToast('Select an apartment to deactivate.', 'error');
                return;
            }

            openModal({
                action: 'deactivate',
                publicId,
                title: 'Deactivate apartment',
                eyebrow: 'Confirmation required',
                message: 'This will remove the apartment from active listings but keep its records available for later recovery.',
                confirmLabel: 'Deactivate apartment',
                variant: 'warning',
                requiresText: false,
                expectedText: ''
            });
        });
    }

    if (hardDeleteButton instanceof HTMLButtonElement) {
        hardDeleteButton.addEventListener('click', () => {
            const publicId = selectedPublicId();
            if (!publicId) {
                showToast('Select an apartment to hard delete.', 'error');
                return;
            }

            openModal({
                action: 'hard-delete',
                publicId,
                title: 'Hard delete apartment',
                eyebrow: 'Danger zone',
                message: 'Hard delete permanently removes this apartment record. Guardrails will block this if the apartment is still active or has booking records.',
                confirmLabel: 'Hard delete permanently',
                variant: 'danger',
                requiresText: true,
                expectedText: publicId
            });
        });
    }
}

function bindApartmentListActions() {
    const rows = document.getElementById('apartmentRows');
    if (!rows) {
        return;
    }

    rows.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        const button = target.closest('[data-edit-apartment]');
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }

        const publicId = String(button.getAttribute('data-edit-apartment') || '').trim();
        if (!publicId) {
            return;
        }

        button.setAttribute('disabled', 'disabled');
        const originalText = button.textContent;
        button.textContent = 'Loading...';

        try {
            const result = await getAdminApartment(publicId);
            if (!result?.apartment) {
                throw new Error('Apartment detail unavailable.');
            }
            state.selectedApartment = result.apartment;
            renderPage();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unable to load apartment details.', 'error');
            button.removeAttribute('disabled');
            button.textContent = originalText;
        }
    });
}

function bindModalActions() {
    if (!state.modal) {
        return;
    }

    const cancelButton = document.getElementById('adminModalCancelButton');
    const confirmButton = document.getElementById('adminModalConfirmButton');

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            closeModal();
        });
    }

    if (confirmButton) {
        confirmButton.addEventListener('click', async () => {
            const modal = state.modal;
            if (!modal) {
                return;
            }

            const confirmInput = document.getElementById('adminModalConfirmText');
            const confirmationText = confirmInput instanceof HTMLInputElement ? confirmInput.value.trim() : '';

            if (modal.requiresText && confirmationText !== modal.expectedText) {
                showToast(`Type ${modal.expectedText} exactly to continue.`, 'error');
                return;
            }

            confirmButton.setAttribute('disabled', 'disabled');
            const originalText = confirmButton.textContent;
            confirmButton.textContent = modal.action === 'hard-delete' ? 'Deleting...' : 'Processing...';

            try {
                if (modal.action === 'deactivate') {
                    await deactivateAdminApartment(modal.publicId);
                    showToast('Apartment deactivated.', 'success');
                }

                if (modal.action === 'hard-delete') {
                    await hardDeleteAdminApartment(modal.publicId, confirmationText);
                    showToast('Apartment hard deleted successfully.', 'success');
                }

                resetApartmentSelection();
                state.modal = null;
                await refreshApartmentsList();
            } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to complete this action.', 'error');
                confirmButton.removeAttribute('disabled');
                confirmButton.textContent = originalText;
            }
        });
    }
}

async function refreshApartmentsList() {
    const params = {};

    if (state.filters.active === '1' || state.filters.active === '0') {
        params.active = Number(state.filters.active);
    }

    const apartmentsData = await getAdminApartments(params);
    const allApartments = Array.isArray(apartmentsData?.apartments) ? apartmentsData.apartments : [];

    const searchTerm = String(state.filters.search || '').trim().toLowerCase();
    if (searchTerm !== '') {
        state.apartments = allApartments.filter((item) => {
            const name = String(item?.name || '').toLowerCase();
            const location = String(item?.location || '').toLowerCase();
            const publicId = String(item?.publicId || '').toLowerCase();
            return name.includes(searchTerm) || location.includes(searchTerm) || publicId.includes(searchTerm);
        });
    } else {
        state.apartments = allApartments;
    }

    if (state.selectedApartment) {
        const selectedInList = state.apartments.find((item) => item.publicId === state.selectedApartment.publicId);
        if (selectedInList) {
            const detailData = await getAdminApartment(selectedInList.publicId);
            state.selectedApartment = detailData?.apartment || selectedInList;
        } else {
            state.selectedApartment = null;
        }
    }

    renderPage();
}

async function refreshApartmentsPage() {
    const meData = await getCurrentAdmin();
    state.admin = meData?.admin || null;

    if (!state.admin) {
        window.location.href = adminLoginPath();
        return;
    }

    await refreshApartmentsList();
}

async function initApartmentsPage() {
    try {
        document.title = 'Admin Apartments | ANTOBELL';
        await refreshApartmentsPage();
    } catch (error) {
        window.location.href = adminLoginPath();
    }
}

initApartmentsPage();
