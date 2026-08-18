/**
 * Homepage Controller
 *
 * Boots the landing page, renders the reusable UI sections, and manages search
 * interactions, loading states, and toast feedback for the first booking screen.
 */

import { getFeaturedApartments, getPublicSettings, searchApartments } from './api.js';
import {
    renderApp,
    renderApartmentCard,
    renderApartmentSkeleton,
    renderEmptyState,
    renderFeaturedSection,
    renderFooter,
    renderHero,
    renderNavbar,
    renderSearchBar,
    renderTestimonials,
    renderWhyChooseUs
} from './ui.js';
import { toPagePath } from './helper.js';
import { showToast } from './toast.js';

const app = document.getElementById('app');
const HERO_AUTOPLAY_MS = 5000;

/**
 * Build the homepage markup.
 *
 * @returns {string} Complete homepage HTML.
 */
function buildHomePage(testimonials = []) {
    return `
    ${renderNavbar()}
    <main>
      ${renderHero()}
      ${renderSearchBar()}
      ${renderFeaturedSection()}
      ${renderWhyChooseUs()}
            ${renderTestimonials(testimonials)}
    </main>
    ${renderFooter()}
    <div id="toastRegion" class="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-3"></div>
  `;
}

/**
 * Update the featured grid with a list of apartments.
 *
 * @param {Array} apartments - Apartment list.
 * @returns {void}
 */
function renderApartments(apartments) {
    const featuredGrid = document.getElementById('featuredGrid');
    if (!featuredGrid) {
        return;
    }

    if (!apartments.length) {
        featuredGrid.innerHTML = renderEmptyState('No apartments found', 'Try a different destination or clear your search filters.');
        return;
    }

    featuredGrid.innerHTML = apartments.map((apartment) => renderApartmentCard(apartment)).join('');
}

/**
 * Show loading skeletons while data is being prepared.
 *
 * @returns {void}
 */
function renderLoadingState() {
    const featuredGrid = document.getElementById('featuredGrid');
    if (!featuredGrid) {
        return;
    }

    featuredGrid.innerHTML = Array.from({ length: 4 }, () => renderApartmentSkeleton()).join('');
}

/**
 * Attach homepage form handling.
 *
 * @returns {void}
 */
function bindSearchForm() {
    const form = document.getElementById('homeSearchForm');
    const searchButton = document.getElementById('searchButton');

    if (!form || !searchButton) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const destination = String(formData.get('destination') || '').trim();
        const checkIn = String(formData.get('checkIn') || '').trim();
        const checkOut = String(formData.get('checkOut') || '').trim();

        if (!destination) {
            showToast('Please provide Location before searching.', 'error');
            return;
        }

        if (!checkIn || !checkOut) {
            showToast('Please provide both check-in and check-out dates before searching.', 'error');
            return;
        }

        if (checkIn && checkOut && new Date(checkOut) <= new Date(checkIn)) {
            showToast('Check-out must be after check-in.', 'error');
            return;
        }

        searchButton.disabled = true;
        const originalText = searchButton.textContent;
        searchButton.textContent = 'Checking availability...';

        try {
            const availableApartments = await searchApartments({
                destination,
                checkIn,
                checkOut
            });

            if (!availableApartments.length) {
                showToast(`No active apartments are free in ${destination} for the selected dates.`, 'error');
                return;
            }

            const query = new URLSearchParams({
                destination,
                checkIn,
                checkOut
            });

            window.location.href = toPagePath('search.html', query.toString());
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unable to check availability right now.', 'error');
        } finally {
            searchButton.disabled = false;
            searchButton.textContent = originalText;
        }
    });
}

/**
 * Bind hero slideshow controls and autoplay behavior.
 *
 * @returns {void}
 */
function bindHeroSlider() {
    const slides = Array.from(document.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(document.querySelectorAll('[data-hero-dot]'));
    const previousButton = document.getElementById('heroPrev');
    const nextButton = document.getElementById('heroNext');
    const counter = document.getElementById('heroSlideCounter');

    if (!slides.length) {
        return;
    }

    let currentIndex = 0;
    const totalSlides = slides.length;
    let autoplayId;

    const updateCounter = () => {
        if (!counter) {
            return;
        }

        const current = String(currentIndex + 1).padStart(2, '0');
        const total = String(totalSlides).padStart(2, '0');
        counter.textContent = `${current} / ${total}`;
    };

    const updateSlides = (index) => {
        currentIndex = (index + totalSlides) % totalSlides;

        slides.forEach((slide, slideIndex) => {
            const isActive = slideIndex === currentIndex;
            slide.classList.toggle('opacity-100', isActive);
            slide.classList.toggle('opacity-0', !isActive);
            slide.classList.toggle('pointer-events-none', !isActive);
        });

        dots.forEach((dot, dotIndex) => {
            const isActive = dotIndex === currentIndex;
            dot.classList.toggle('w-7', isActive);
            dot.classList.toggle('w-2.5', !isActive);
            dot.classList.toggle('bg-white', isActive);
            dot.classList.toggle('bg-white/55', !isActive);
        });

        updateCounter();
    };

    const startAutoplay = () => {
        autoplayId = window.setInterval(() => {
            updateSlides(currentIndex + 1);
        }, HERO_AUTOPLAY_MS);
    };

    const resetAutoplay = () => {
        if (autoplayId) {
            window.clearInterval(autoplayId);
        }
        startAutoplay();
    };

    previousButton?.addEventListener('click', () => {
        updateSlides(currentIndex - 1);
        resetAutoplay();
    });

    nextButton?.addEventListener('click', () => {
        updateSlides(currentIndex + 1);
        resetAutoplay();
    });

    dots.forEach((dot, dotIndex) => {
        dot.addEventListener('click', () => {
            updateSlides(dotIndex);
            resetAutoplay();
        });
    });

    updateSlides(0);
    startAutoplay();
}

/**
 * Initialize the homepage.
 *
 * @returns {Promise<void>} Initialization promise.
 */
async function initHomePage() {
    let publicSettings = { testimonials: [] };

    try {
        publicSettings = await getPublicSettings();
    } catch (error) {
        publicSettings = { testimonials: [] };
    }

    renderApp(app, buildHomePage(Array.isArray(publicSettings.testimonials) ? publicSettings.testimonials : []));
    bindSearchForm();
    bindHeroSlider();
    renderLoadingState();

    const apartments = await getFeaturedApartments();
    renderApartments(apartments.slice(0, 4));
}

initHomePage().catch(() => {
    if (app) {
        app.innerHTML = renderEmptyState('Something went wrong', 'The homepage could not be loaded. Please refresh the page.');
    }
});
