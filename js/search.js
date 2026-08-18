/**
 * Search Results Controller
 *
 * Boots the search-results page, applies filter logic, manages pagination,
 * and renders responsive apartment cards with loading, empty, and error states.
 */

import { searchApartments } from './api.js';
import { showToast } from './toast.js';
import {
    renderApp,
    renderApartmentSkeleton,
    renderCompactApartmentCard,
    renderEmptyState,
    renderErrorState,
    renderFooter,
    renderNavbar,
    renderPagination,
    renderSearchResultsHeader
} from './ui.js';

const app = document.getElementById('app');
const PAGE_SIZE = 4;
const DEFAULT_FILTERS = {
    destination: '',
    checkIn: '',
    checkOut: '',
};
const state = {
    filters: { ...DEFAULT_FILTERS },
    results: [],
    currentPage: 1,
    isLoading: true,
    error: null
};

/**
 * Build the search page shell.
 *
 * @returns {string} Complete search page HTML.
 */
function buildSearchPage() {
    return `
    ${renderNavbar()}
    <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div class="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur-xl">
        ${renderSearchResultsHeader(state.results.length)}
                <div class="mt-8">
                    <section class="space-y-6">
            <div id="searchMeta" class="flex items-center justify-between gap-4 text-sm text-slate-500"></div>
            <div id="resultsGrid" class="grid gap-6"></div>
            <div id="paginationArea"></div>
          </section>
        </div>
      </div>
    </main>
    ${renderFooter()}
    <div id="toastRegion" class="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-3"></div>
  `;
}

/**
 * Read initial filters from the current URL.
 *
 * @returns {Object} Initial filter values.
 */
function getFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return {
        destination: params.get('destination') || '',
        checkIn: params.get('checkIn') || '',
        checkOut: params.get('checkOut') || ''
    };
}

/**
 * Get the current page slice of results.
 *
 * @returns {Array} Visible apartments for the current page.
 */
function getVisibleResults() {
    const startIndex = (state.currentPage - 1) * PAGE_SIZE;
    return state.results.slice(startIndex, startIndex + PAGE_SIZE);
}

/**
 * Return the total number of pages.
 *
 * @returns {number} Page count.
 */
function getTotalPages() {
    return Math.max(1, Math.ceil(state.results.length / PAGE_SIZE));
}

/**
 * Update the search results header and metadata.
 *
 * @returns {void}
 */
function updateSearchMeta() {
    const searchMeta = document.getElementById('searchMeta');
    const searchResultsCount = document.getElementById('searchResultsCount');

    if (searchResultsCount) {
        searchResultsCount.textContent = `${state.results.length} apartments available`;
    }

    if (!searchMeta) {
        return;
    }

    const locationText = state.filters.destination ? `for ${state.filters.destination}` : 'for all destinations';
    searchMeta.innerHTML = `
    <span>${state.results.length} matches ${locationText}</span>
    <span>Page ${state.currentPage} of ${getTotalPages()}</span>
  `;
}

/**
 * Render loading skeletons for the search grid.
 *
 * @returns {void}
 */
function renderLoadingGrid() {
    const resultsGrid = document.getElementById('resultsGrid');
    const paginationArea = document.getElementById('paginationArea');
    if (!resultsGrid || !paginationArea) {
        return;
    }

    resultsGrid.innerHTML = Array.from({ length: PAGE_SIZE }, () => renderApartmentSkeleton()).join('');
    paginationArea.innerHTML = '';
}

/**
 * Render the visible search results.
 *
 * @returns {void}
 */
function renderResults() {
    const resultsGrid = document.getElementById('resultsGrid');
    const paginationArea = document.getElementById('paginationArea');
    if (!resultsGrid || !paginationArea) {
        return;
    }

    const visibleResults = getVisibleResults();

    if (!state.results.length) {
        resultsGrid.innerHTML = renderEmptyState('No apartments found', 'Try searching for another destination or check back later.');
        paginationArea.innerHTML = '';
        updateSearchMeta();
        return;
    }

    resultsGrid.innerHTML = visibleResults.map((apartment) => renderCompactApartmentCard(apartment)).join('');
    paginationArea.innerHTML = renderPagination(state.currentPage, getTotalPages());
    updateSearchMeta();
    bindPaginationButtons();
}

/**
 * Bind pagination button events.
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

            renderResults();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

/**
 * Apply filters from the search form.
 *
 * @returns {Promise<void>} Filter application promise.
 */
async function loadResults() {
    if ((state.filters.checkIn && !state.filters.checkOut) || (!state.filters.checkIn && state.filters.checkOut)) {
        showToast('Please provide both check-in and check-out dates to check availability.', 'error');
        return;
    }

    if (state.filters.checkIn && state.filters.checkOut && new Date(state.filters.checkOut) <= new Date(state.filters.checkIn)) {
        showToast('Check-out must be after check-in.', 'error');
        return;
    }

    state.isLoading = true;
    state.error = null;
    renderLoadingGrid();

    try {
        state.results = await searchApartments(state.filters);
        state.currentPage = 1;
        state.isLoading = false;
        renderResults();
    } catch (error) {
        state.isLoading = false;
        state.error = error instanceof Error ? error.message : 'Unable to load search results.';
        const resultsGrid = document.getElementById('resultsGrid');
        const paginationArea = document.getElementById('paginationArea');

        if (resultsGrid && paginationArea) {
            resultsGrid.innerHTML = renderErrorState('Search failed', 'We could not load apartments right now. Please try again in a moment.');
            paginationArea.innerHTML = '';
        }
    }
}

/**
 * Set the page title based on the current filters.
 *
 * @returns {void}
 */
function updateDocumentTitle() {
    const destination = state.filters.destination ? ` in ${state.filters.destination}` : '';
    document.title = `Search Results${destination} | ANTOBELL`;
}

/**
 * Initialize the search page.
 *
 * @returns {Promise<void>} Initialization promise.
 */
async function initSearchPage() {
    state.filters = getFiltersFromUrl();
    updateDocumentTitle();
    renderApp(app, buildSearchPage());
    await loadResults();
}

initSearchPage().catch(() => {
    if (app) {
        app.innerHTML = renderErrorState('Search page unavailable', 'Please refresh the page and try again.');
    }
});
