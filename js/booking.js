/**
 * Checkout Controller
 *
 * Collects user information after stay selection, presents a review step,
 * then finalizes the booking and redirects to the success screen.
 */

import { checkBookingAvailability, createBooking, getApartmentById } from './api.js';
import { toPagePath } from './helper.js';
import { showToast } from './toast.js';
import {
    renderApp,
    renderBookingSummaryCard,
    renderEmptyState,
    renderErrorState,
    renderFooter,
    renderNavbar,
    renderCheckoutSectionHeader
} from './ui.js';

const app = document.getElementById('app');
const params = new URLSearchParams(window.location.search);
const apartmentId = params.get('apartmentId') || params.get('id') || 'apt-101';

/**
 * Calculate number of nights between check-in and check-out dates.
 *
 * @param {string} checkIn - Check-in date string.
 * @param {string} checkOut - Check-out date string.
 * @returns {number} Number of nights.
 */
function calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) {
        return 1;
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end.getTime() - start.getTime();

    if (Number.isNaN(diff) || diff <= 0) {
        return 1;
    }

    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Read the current stay details from storage or the URL.
 *
 * @returns {Object} Stay details.
 */
function getStayDetails() {
    const storedDraft = window.sessionStorage.getItem('bookingDraft');

    if (storedDraft) {
        try {
            const parsedDraft = JSON.parse(storedDraft);
            const checkIn = parsedDraft.checkIn || params.get('checkIn') || '';
            const checkOut = parsedDraft.checkOut || params.get('checkOut') || '';

            return {
                apartmentId: parsedDraft.apartmentId || apartmentId,
                checkIn,
                checkOut,
                guests: parsedDraft.guests || params.get('guests') || '2',
                nights: calculateNights(checkIn, checkOut)
            };
        } catch (error) {
            // Fall through to URL-based state when the draft cannot be parsed.
        }
    }

    const checkIn = params.get('checkIn') || '';
    const checkOut = params.get('checkOut') || '';

    return {
        apartmentId,
        checkIn,
        checkOut,
        guests: params.get('guests') || '2',
        nights: calculateNights(checkIn, checkOut)
    };
}

/**
 * Validate selected stay values.
 *
 * @param {Object} stay - Stay details.
 * @returns {{isValid: boolean, message: string}} Validation result.
 */
function validateStay(stay) {
    if (!stay.checkIn || !stay.checkOut) {
        return { isValid: false, message: 'Select check-in and check-out dates on apartment details before continuing.' };
    }

    if (new Date(stay.checkOut) <= new Date(stay.checkIn)) {
        return { isValid: false, message: 'Check-out must be after check-in.' };
    }

    return { isValid: true, message: '' };
}

/**
 * Build the checkout page markup.
 *
 * @param {Object} apartment - Apartment data object.
 * @param {Object} stay - Stay details.
 * @returns {string} Checkout page HTML.
 */
function buildCheckoutPage(apartment, stay) {
    return `
        ${renderNavbar()}
        <main class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div class="space-y-10">
                <div class="max-w-4xl space-y-5">
                    <div class="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-sm">
                        <span class="h-2 w-2 rounded-full bg-brand-600"></span>
                        Secure checkout
                    </div>
                    <div>
                        <span class="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Checkout</span>
                        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Complete your details, then review your booking.</h1>
                        <p class="mt-3 max-w-3xl text-slate-600">Your stay details were already captured on the apartment page. Provide your contact info, then confirm everything before final submission.</p>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-3">
                        <div id="stepCardUser" class="rounded-[1.25rem] border border-brand-200 bg-brand-50 px-4 py-3 shadow-sm">
                            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Step 1</p>
                            <p class="mt-1 text-sm font-medium text-brand-900">User information</p>
                        </div>
                        <div id="stepCardReview" class="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step 2</p>
                            <p class="mt-1 text-sm font-medium text-slate-900">Review booking</p>
                        </div>
                        <div id="stepCardSubmit" class="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Step 3</p>
                            <p class="mt-1 text-sm font-medium text-slate-900">Final submission</p>
                        </div>
                    </div>
                </div>
                <div class="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft lg:p-8">
                        <div id="userInfoStep">
                            ${renderCheckoutSectionHeader('User information', 'Fill in your details. If you already have an account, you can log in or register first.')}
                            <div class="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                                <p class="text-sm font-medium text-slate-800">Have an account?</p>
                                <p class="mt-1 text-sm text-slate-600">Choose an option below, or continue as a guest.</p>
                                <div class="mt-4 flex flex-col gap-3 sm:flex-row">
                                    <button id="loginOptionButton" type="button" class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Login</button>
                                    <button id="registerOptionButton" type="button" class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Register</button>
                                </div>
                            </div>
                            <form id="userInfoForm" class="mt-6 space-y-5">
                                <div class="grid gap-5 sm:grid-cols-2">
                                    <label class="block space-y-2">
                                        <span class="text-sm font-medium text-slate-700">Full name</span>
                                        <input name="fullName" type="text" placeholder="Enter your full name" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" required aria-label="Full name" />
                                    </label>
                                    <label class="block space-y-2">
                                        <span class="text-sm font-medium text-slate-700">Email</span>
                                        <input name="email" type="email" placeholder="name@example.com" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" required aria-label="Email address" />
                                    </label>
                                </div>
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Phone</span>
                                    <input name="phone" type="tel" placeholder="+234 801 234 5678" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" required aria-label="Phone number" />
                                </label>
                                <label class="block space-y-2">
                                    <span class="text-sm font-medium text-slate-700">Special requests</span>
                                    <textarea name="specialRequests" rows="4" placeholder="Let us know if you have arrival preferences or accessibility needs." class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" aria-label="Special requests"></textarea>
                                </label>
                                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p class="max-w-xl text-sm leading-6 text-slate-500">You will review your booking details before final submission.</p>
                                    <button id="continueToReviewButton" type="submit" class="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700">Continue to review</button>
                                </div>
                            </form>
                        </div>
                        <div id="reviewStep" class="hidden">
                            ${renderCheckoutSectionHeader('Review your booking', 'Confirm the booking information and your contact details before final submission.')}
                            <div class="mt-6 space-y-5">
                                <div class="rounded-[1.5rem] border border-slate-200 p-5">
                                    <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Booking information</p>
                                    <div class="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-slate-700">
                                        <div>
                                            <p class="text-slate-500">Apartment</p>
                                            <p class="mt-1 font-medium text-slate-900">${apartment.name}</p>
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Guests</p>
                                            <p class="mt-1 font-medium text-slate-900">${stay.guests}</p>
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Check-in</p>
                                            <p class="mt-1 font-medium text-slate-900">${stay.checkIn}</p>
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Check-out</p>
                                            <p class="mt-1 font-medium text-slate-900">${stay.checkOut}</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="rounded-[1.5rem] border border-slate-200 p-5">
                                    <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">User information</p>
                                    <div class="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-slate-700">
                                        <div>
                                            <p class="text-slate-500">Full name</p>
                                            <p id="reviewFullName" class="mt-1 font-medium text-slate-900">-</p>
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Email</p>
                                            <p id="reviewEmail" class="mt-1 font-medium text-slate-900">-</p>
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Phone</p>
                                            <p id="reviewPhone" class="mt-1 font-medium text-slate-900">-</p>
                                        </div>
                                        <div>
                                            <p class="text-slate-500">Special requests</p>
                                            <p id="reviewSpecialRequests" class="mt-1 font-medium text-slate-900">None</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                                    After submission, your booking will be held for onsite payment.
                                </div>
                                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <button id="backToUserInfoButton" type="button" class="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Back</button>
                                    <button id="finalSubmitButton" type="button" class="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70">Submit booking</button>
                                </div>
                            </div>
                        </div>
                    </section>
                    <div>
                        ${renderBookingSummaryCard(apartment, stay)}
                    </div>
                </div>
            </div>
        </main>
        ${renderFooter()}
    `;
}

/**
 * Read any previously entered user info.
 *
 * @returns {Object|null} Saved user draft.
 */
function getUserDraft() {
    const raw = window.sessionStorage.getItem('guestDraft');

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

/**
 * Validate user information form.
 *
 * @param {HTMLFormElement} form - User information form.
 * @returns {{isValid: boolean, message: string}} Validation result.
 */
function validateUserInfo(form) {
    const formData = new FormData(form);
    const fullName = String(formData.get('fullName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();

    if (!fullName || !email || !phone) {
        return { isValid: false, message: 'Please complete full name, email, and phone.' };
    }

    return { isValid: true, message: '' };
}

/**
 * Toggle between the user information and review steps.
 *
 * @param {'user' | 'review'} step - Active step.
 * @returns {void}
 */
function setActiveStep(step) {
    const userInfoStep = document.getElementById('userInfoStep');
    const reviewStep = document.getElementById('reviewStep');

    const stepCardUser = document.getElementById('stepCardUser');
    const stepCardReview = document.getElementById('stepCardReview');
    const stepCardSubmit = document.getElementById('stepCardSubmit');

    if (!userInfoStep || !reviewStep || !stepCardUser || !stepCardReview || !stepCardSubmit) {
        return;
    }

    const activeClasses = ['border-brand-200', 'bg-brand-50'];
    const inactiveClasses = ['border-slate-200', 'bg-white'];

    const makeActive = (element) => {
        element.classList.remove(...inactiveClasses);
        element.classList.add(...activeClasses);
    };

    const makeInactive = (element) => {
        element.classList.remove(...activeClasses);
        element.classList.add(...inactiveClasses);
    };

    if (step === 'user') {
        userInfoStep.classList.remove('hidden');
        reviewStep.classList.add('hidden');
        makeActive(stepCardUser);
        makeInactive(stepCardReview);
        makeInactive(stepCardSubmit);
        return;
    }

    userInfoStep.classList.add('hidden');
    reviewStep.classList.remove('hidden');
    makeInactive(stepCardUser);
    makeActive(stepCardReview);
    makeActive(stepCardSubmit);
}

/**
 * Fill review panel user information.
 *
 * @param {Object} userInfo - User details.
 * @returns {void}
 */
function updateReviewDetails(userInfo) {
    const reviewFullName = document.getElementById('reviewFullName');
    const reviewEmail = document.getElementById('reviewEmail');
    const reviewPhone = document.getElementById('reviewPhone');
    const reviewSpecialRequests = document.getElementById('reviewSpecialRequests');

    if (reviewFullName) {
        reviewFullName.textContent = userInfo.fullName;
    }

    if (reviewEmail) {
        reviewEmail.textContent = userInfo.email;
    }

    if (reviewPhone) {
        reviewPhone.textContent = userInfo.phone;
    }

    if (reviewSpecialRequests) {
        reviewSpecialRequests.textContent = userInfo.specialRequests || 'None';
    }
}

/**
 * Persist checkout draft for success page.
 *
 * @param {Object} checkoutDraft - Draft details.
 * @returns {void}
 */
function persistCheckoutDraft(checkoutDraft) {
    window.sessionStorage.setItem('checkoutDraft', JSON.stringify(checkoutDraft));
}

/**
 * Bind interactions for checkout steps and final submission.
 *
 * @param {Object} apartment - Apartment data object.
 * @param {Object} stay - Stay details.
 * @returns {void}
 */
function bindCheckoutFlow(apartment, stay) {
    const userInfoForm = document.getElementById('userInfoForm');
    const backToUserInfoButton = document.getElementById('backToUserInfoButton');
    const finalSubmitButton = document.getElementById('finalSubmitButton');
    const loginOptionButton = document.getElementById('loginOptionButton');
    const registerOptionButton = document.getElementById('registerOptionButton');

    if (!userInfoForm || !backToUserInfoButton || !finalSubmitButton) {
        return;
    }

    const savedUserDraft = getUserDraft();
    if (savedUserDraft) {
        userInfoForm.elements.fullName.value = savedUserDraft.fullName || '';
        userInfoForm.elements.email.value = savedUserDraft.email || '';
        userInfoForm.elements.phone.value = savedUserDraft.phone || '';
        userInfoForm.elements.specialRequests.value = savedUserDraft.specialRequests || '';
    }

    let activeUserInfo = savedUserDraft || null;

    if (loginOptionButton) {
        loginOptionButton.addEventListener('click', () => {
            showToast('Login flow will be connected next. You can continue as guest for now.', 'success');
        });
    }

    if (registerOptionButton) {
        registerOptionButton.addEventListener('click', () => {
            showToast('Register flow will be connected next. You can continue as guest for now.', 'success');
        });
    }

    userInfoForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const validation = validateUserInfo(userInfoForm);
        if (!validation.isValid) {
            showToast(validation.message, 'error');
            return;
        }

        const formData = new FormData(userInfoForm);
        activeUserInfo = {
            fullName: String(formData.get('fullName') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            phone: String(formData.get('phone') || '').trim(),
            specialRequests: String(formData.get('specialRequests') || '').trim()
        };

        window.sessionStorage.setItem('guestDraft', JSON.stringify(activeUserInfo));
        updateReviewDetails(activeUserInfo);
        setActiveStep('review');
    });

    backToUserInfoButton.addEventListener('click', () => {
        setActiveStep('user');
    });

    finalSubmitButton.addEventListener('click', async () => {
        if (!activeUserInfo) {
            showToast('Please complete your user information first.', 'error');
            setActiveStep('user');
            return;
        }

        finalSubmitButton.disabled = true;
        const originalText = finalSubmitButton.textContent;
        finalSubmitButton.textContent = 'Submitting booking...';

        try {
            const availability = await checkBookingAvailability({
                apartmentId: stay.apartmentId,
                checkIn: stay.checkIn,
                checkOut: stay.checkOut
            });

            if (!availability?.available) {
                showToast('Selected dates are no longer available. Please return and choose different dates.', 'error');
                finalSubmitButton.disabled = false;
                finalSubmitButton.textContent = originalText;
                setActiveStep('user');
                return;
            }

            const createdBooking = await createBooking({
                apartmentId: stay.apartmentId,
                guestName: activeUserInfo.fullName,
                guestEmail: activeUserInfo.email,
                guestPhone: activeUserInfo.phone,
                specialRequests: activeUserInfo.specialRequests,
                checkIn: stay.checkIn,
                checkOut: stay.checkOut,
                guests: Number(stay.guests || 1)
            });

            const dueAt = new Date(Date.now() + (12 * 60 * 60 * 1000)).toISOString();
            persistCheckoutDraft({
                apartmentId: stay.apartmentId,
                apartmentName: apartment.name,
                fullName: activeUserInfo.fullName,
                email: activeUserInfo.email,
                phone: activeUserInfo.phone,
                specialRequests: activeUserInfo.specialRequests,
                checkIn: stay.checkIn,
                checkOut: stay.checkOut,
                guests: String(stay.guests || '2'),
                nights: stay.nights,
                bookingNumber: createdBooking?.bookingNumber || '',
                subtotal: Number(createdBooking?.subtotal || 0),
                taxes: Number(createdBooking?.taxes || 0),
                fees: Number(createdBooking?.fees || 0),
                totalAmount: Number(createdBooking?.totalAmount || 0),
                paymentDueAt: dueAt
            });

            window.sessionStorage.removeItem('guestDraft');
            window.location.href = toPagePath('booking-success.html', `apartmentId=${encodeURIComponent(stay.apartmentId)}&bookingNumber=${encodeURIComponent(createdBooking?.bookingNumber || '')}`);
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unable to submit booking. Please try again.', 'error');
            finalSubmitButton.disabled = false;
            finalSubmitButton.textContent = originalText;
        }
    });
}

/**
 * Initialize checkout page.
 *
 * @returns {Promise<void>} Initialization promise.
 */
async function initBooking() {
    const stay = getStayDetails();
    const stayValidation = validateStay(stay);

    if (!stayValidation.isValid) {
        renderApp(app, `${renderNavbar()}<main class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">${renderEmptyState('Booking details missing', `${stayValidation.message}`)}</main>${renderFooter()}`);
        return;
    }

    const apartment = await getApartmentById(stay.apartmentId);

    if (!apartment) {
        renderApp(app, `${renderNavbar()}<main class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">${renderEmptyState('Booking unavailable', 'The selected apartment could not be loaded.')}</main>${renderFooter()}`);
        return;
    }

    document.title = `Checkout | ${apartment.name}`;
    renderApp(app, buildCheckoutPage(apartment, stay));
    bindCheckoutFlow(apartment, stay);
}

initBooking().catch(() => {
    if (app) {
        app.innerHTML = `${renderNavbar()}<main class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">${renderErrorState('Checkout unavailable', 'Please refresh the page and try again.')}</main>${renderFooter()}`;
    }
});
