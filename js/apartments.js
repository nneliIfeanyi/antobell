/**
 * Apartments Listing Controller
 *
 * Boots a dedicated page for all available apartments, separate from
 * the search-results experience.
 */

import { getApartments } from './api.js';
import {
    renderApp,
    renderApartmentSkeleton,
    renderCompactApartmentCard,
    renderEmptyState,
    renderErrorState,
    renderFooter,
    renderNavbar,
    renderPagination
} from './ui.js';

const app = document.getElementById('app');
const PAGE_SIZE = 6;
const state = {
    apartments: [],
    currentPage: 1
};

/**
 * Build the dedicated apartments page shell.
 *
 * @returns {string} Full page markup.
 */
function buildApartmentsPage() {
    return `
    ${renderNavbar()}
    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <section class="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur-xl">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span class="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Apartments</span>
            <h1 id="apartmentsCount" class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Available apartments</h1>
            <p class="mt-3 max-w-2xl text-slate-600">Browse all currently available stays in one place.</p>
          </div>
        </div>
        <section class="mt-8 space-y-6">
          <div id="apartmentsMeta" class="flex items-center justify-between gap-4 text-sm text-slate-500"></div>
          <div id="apartmentsGrid" class="grid gap-6"></div>
          <div id="paginationArea"></div>
        </section>
      </section>
    </main>
    ${renderFooter()}
  `;
}

/**
 * Get visible results for the active page.
 *
 * @returns {Array} Visible apartment slice.
 */
function getVisibleApartments() {
    const startIndex = (state.currentPage - 1) * PAGE_SIZE;
    return state.apartments.slice(startIndex, startIndex + PAGE_SIZE);
}

/**
 * Compute total pages for available apartments.
 *
 * @returns {number} Total pages.
 */
function getTotalPages() {
    return Math.max(1, Math.ceil(state.apartments.length / PAGE_SIZE));
}

/**
 * Update page metadata and total count text.
 *
 * @returns {void}
 */
function updateMeta() {
    const apartmentsMeta = document.getElementById('apartmentsMeta');
    const apartmentsCount = document.getElementById('apartmentsCount');

    if (apartmentsCount) {
        apartmentsCount.textContent = `${state.apartments.length} apartments available`;
    }

    if (!apartmentsMeta) {
        return;
    }

    apartmentsMeta.innerHTML = `
      <span>All active listings</span>
      <span>Page ${state.currentPage} of ${getTotalPages()}</span>
    `;
}

/**
 * Render loading skeletons while apartments are fetched.
 *
 * @returns {void}
 */
function renderLoadingGrid() {
    const apartmentsGrid = document.getElementById('apartmentsGrid');
    const paginationArea = document.getElementById('paginationArea');

    if (!apartmentsGrid || !paginationArea) {
        return;
    }

    apartmentsGrid.innerHTML = Array.from({ length: PAGE_SIZE }, () => renderApartmentSkeleton()).join('');
    paginationArea.innerHTML = '';
}

/**
 * Render apartments and pagination.
 *
 * @returns {void}
 */
function renderApartments() {
    const apartmentsGrid = document.getElementById('apartmentsGrid');
    const paginationArea = document.getElementById('paginationArea');

    if (!apartmentsGrid || !paginationArea) {
        return;
    }

    if (!state.apartments.length) {
        apartmentsGrid.innerHTML = renderEmptyState('No apartments available', 'Please check back soon for new listings.');
        paginationArea.innerHTML = '';
        updateMeta();
        return;
    }

    const visibleApartments = getVisibleApartments();
    apartmentsGrid.innerHTML = visibleApartments.map((apartment) => renderCompactApartmentCard(apartment)).join('');
    paginationArea.innerHTML = renderPagination(state.currentPage, getTotalPages());
    updateMeta();
    bindPaginationButtons();
}

/**
 * Bind pagination controls.
 *
 * @returns {void}
 */
function bindPaginationButtons() {
    const paginationArea = document.getElementById('paginationArea');

    if (!paginationArea) {
        return;
    }

    paginationArea.querySelectorAll('[data-page-action]').forEach((button) => {
        button.addEventListener('click', () => {
            const action = button.getAttribute('data-page-action');
            const totalPages = getTotalPages();

            if (action === 'previous' && state.currentPage > 1) {
                state.currentPage -= 1;
            }

            if (action === 'next' && state.currentPage < totalPages) {
                state.currentPage += 1;
            }

            renderApartments();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

/**
 * Load all available apartments.
 *
 * @returns {Promise<void>} Load promise.
 */
async function loadApartments() {
    renderLoadingGrid();

    try {
        const apartments = await getApartments();
        state.apartments = Array.isArray(apartments) ? apartments : [];
        state.currentPage = 1;
        renderApartments();
    } catch (error) {
        const apartmentsGrid = document.getElementById('apartmentsGrid');
        const paginationArea = document.getElementById('paginationArea');

        if (!apartmentsGrid || !paginationArea) {
            return;
        }

        apartmentsGrid.innerHTML = renderErrorState('Apartments unavailable', 'We could not load apartments right now. Please try again in a moment.');
        paginationArea.innerHTML = '';
    }
}

/**
 * Initialize dedicated apartments page.
 *
 * @returns {Promise<void>} Initialization promise.
 */
async function initApartmentsPage() {
    document.title = 'Available Apartments | ANTOBELL';
    renderApp(app, buildApartmentsPage());
    await loadApartments();
}

initApartmentsPage().catch(() => {
    if (app) {
        app.innerHTML = renderErrorState('Apartments page unavailable', 'Please refresh the page and try again.');
    }
});
