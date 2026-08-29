/**
 * Apartment Details Controller
 *
 * Loads apartment data from the local API layer, renders the detail layout,
 * and manages gallery switching plus the booking call to action.
 */

import { getApartmentById, getSimilarApartments } from './api.js';
import { toPagePath } from './helper.js';
import { showToast } from './toast.js';
import {
    renderApp,
    renderApartmentAmenities,
    renderApartmentDetailHero,
    renderApartmentRules,
    renderApartmentThumbnails,
    renderBookingCard,
    renderCompactApartmentCard,
    renderEmptyState,
    renderErrorState,
    renderFooter,
    renderNavbar,
    renderSectionHeader
} from './ui.js';

const app = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const apartmentId = params.get('id') || 'apt-101';

/**
 * Build the apartment detail page markup.
 *
 * @param {Object} apartment - Apartment data object.
 * @param {Array<Object>} similarApartments - Related apartments.
 * @returns {string} Apartment detail page HTML.
 */
function buildApartmentPage(apartment, similarApartments) {
    return `
        ${renderNavbar()}
        <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div class="space-y-10">
                ${renderApartmentDetailHero(apartment)}
                <section class="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <div class="space-y-8">
                        <div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                            ${renderSectionHeader('Apartment information', 'Everything you need to know before booking your stay.')}
                            <div class="mt-6 space-y-6">
                                <div>
                                    <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Description</h3>
                                    <p class="mt-3 text-base leading-8 text-slate-600">${apartment.description}</p>
                                </div>
                                <div>
                                    <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Amenities</h3>
                                    <div class="mt-4">${renderApartmentAmenities(apartment.amenities)}</div>
                                </div>
                                <div>
                                    <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">House rules</h3>
                                    <div class="mt-4">${renderApartmentRules(apartment.houseRules)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        ${renderBookingCard(apartment)}
                    </div>
                </section>
                <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
                    ${renderSectionHeader('Similar apartments', 'Other premium stays that match this location and standard.')}
                    <div class="mt-6 grid gap-5 lg:grid-cols-3">
                        ${similarApartments.map((item) => renderCompactApartmentCard(item)).join('')}
                    </div>
                </section>
            </div>
        </main>
        ${renderFooter()}
    `;
}

/**
 * Sync the gallery thumbnails with the main detail image.
 *
 * @param {Object} apartment - Apartment data object.
 * @returns {void}
 */
function bindGallery(apartment) {
    const thumbnailRegion = document.getElementById('detailThumbnails');
    const mainImage = document.getElementById('detailMainImage');

    if (!thumbnailRegion || !mainImage) {
        return;
    }

    thumbnailRegion.innerHTML = renderApartmentThumbnails(apartment);

    thumbnailRegion.querySelectorAll('[data-gallery-image]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextImage = button.getAttribute('data-gallery-image');
            if (!nextImage) {
                return;
            }

            mainImage.src = nextImage;
            thumbnailRegion.querySelectorAll('button').forEach((thumb) => thumb.classList.remove('ring-2', 'ring-brand-500'));
            button.classList.add('ring-2', 'ring-brand-500');
        });
    });
}

/**
 * Initialize the booking button behavior.
 *
 * @returns {void}
 */
function bindBookingCard() {
    const bookingForm = document.getElementById('bookingCardForm');
    if (!bookingForm) {
        return;
    }

    bookingForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const checkInInput = bookingForm.querySelector('input[name="checkIn"]');
        const checkOutInput = bookingForm.querySelector('input[name="checkOut"]');
        const guestsInput = bookingForm.querySelector('select[name="guests"]');

        const checkIn = String(checkInInput?.value || '').trim();
        const checkOut = String(checkOutInput?.value || '').trim();
        const guests = String(guestsInput?.value || '2').trim();
        const today = new Date().toISOString().slice(0, 10);

        if (!checkIn || !checkOut) {
            showToast('Please select check-in and check-out dates before continuing.', 'error');
            return;
        }

        if (checkIn < today) {
            showToast('Check-in cannot be earlier than today.', 'error');
            return;
        }

        if (new Date(checkOut) <= new Date(checkIn)) {
            showToast('Check-out must be after check-in.', 'error');
            return;
        }

        const stay = {
            apartmentId,
            checkIn,
            checkOut,
            guests
        };

        try {
            window.sessionStorage.setItem('bookingDraft', JSON.stringify(stay));
        } catch (error) {
            // Continue with query-string handoff if session storage is unavailable.
        }

        const query = new URLSearchParams();
        query.set('apartmentId', stay.apartmentId);
        query.set('checkIn', stay.checkIn);
        query.set('checkOut', stay.checkOut);
        query.set('guests', stay.guests);
        window.location.href = toPagePath('checkout.html', query.toString());
    });
}

/**
 * Initialize the apartment page.
 *
 * @returns {Promise<void>} Initialization promise.
 */
async function initApartmentPage() {
    const apartment = await getApartmentById(apartmentId);

    if (!apartment) {
        renderApp(app, `${renderNavbar()}<main class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">${renderEmptyState('Apartment not found', 'The apartment you are looking for is not available.')}</main>${renderFooter()}`);
        return;
    }

    const similarApartments = await getSimilarApartments(apartment);
    document.title = `${apartment.name} | ANTOBELL`;
    renderApp(app, buildApartmentPage(apartment, similarApartments));
    bindGallery(apartment);
    bindBookingCard();
}

initApartmentPage().catch(() => {
    if (app) {
        app.innerHTML = `${renderNavbar()}<main class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">${renderErrorState('Apartment unavailable', 'Please refresh the page and try again.')}</main>${renderFooter()}`;
    }
});
