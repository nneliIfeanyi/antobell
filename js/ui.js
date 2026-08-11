/**
 * UI Components and Presentation Helpers
 *
 * Exposes reusable render functions for the homepage experience, including
 * navigation, cards, skeletons, toasts, and trust sections.
 */

import { escapeHtml, formatCurrency, formatRating, toHomePath, toPagePath } from './helper.js';

/**
 * Render the application shell into the page.
 *
 * @param {HTMLElement} root - Root application container.
 * @param {string} content - HTML content to inject.
 * @returns {void}
 */
export function renderApp(root, content) {
  root.innerHTML = content;
}

/**
 * Render the navbar component.
 *
 * @returns {string} Navbar HTML.
 */
export function renderNavbar() {
  return `
    <header class="sticky top-0 z-50 border-b border-white/70 bg-white/90 backdrop-blur-xl">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="${toHomePath()}" class="flex items-center gap-3 font-semibold text-slate-900">
          <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow">A</span>
          <span class="text-lg tracking-tight">ANTOBELL</span>
        </a>
        <nav class="hidden items-center gap-8 md:flex">
          <a href="${toHomePath('featured')}" class="text-sm font-medium text-slate-600 transition hover:text-slate-900">Featured</a>
          <a href="${toHomePath('why-us')}" class="text-sm font-medium text-slate-600 transition hover:text-slate-900">Why us</a>
          <a href="${toHomePath('testimonials')}" class="text-sm font-medium text-slate-600 transition hover:text-slate-900">Testimonials</a>
        </nav>
        <div class="flex items-center gap-3">
          <a href="${toHomePath('search')}" class="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:inline-flex">Search stays</a>
          <a href="${toPagePath('apartments.html')}" class="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-slate-800">View apartments</a>
          <details class="relative md:hidden">
            <summary class="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50">
              <span class="sr-only">Toggle menu</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 4a1 1 0 100 2h12a1 1 0 100-2H4z" clip-rule="evenodd" />
              </svg>
            </summary>
            <div class="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <a href="${toHomePath('search')}" class="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Search stays</a>
              <a href="${toPagePath('apartments.html')}" class="mt-1 block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">View apartments</a>
              <div class="my-2 border-t border-slate-200"></div>
              <a href="${toHomePath('featured')}" class="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Featured</a>
              <a href="${toHomePath('why-us')}" class="mt-1 block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Why us</a>
              <a href="${toHomePath('testimonials')}" class="mt-1 block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Testimonials</a>
            </div>
          </details>
        </div>
      </div>
    </header>
  `;
}

/**
 * Render the hero section.
 *
 * @returns {string} Hero HTML.
 */
export function renderHero() {
  return `
    <section class="relative overflow-hidden bg-hero-pattern">
      <div class="absolute inset-0 opacity-20">
        <div class="absolute left-6 top-6 h-24 w-24 rounded-full bg-brand-200 blur-3xl"></div>
        <div class="absolute right-10 top-24 h-32 w-32 rounded-full bg-cyan-200 blur-3xl"></div>
      </div>
      <div class="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-24">
        <div class="relative z-10 flex flex-col justify-center animate-fadeUp">
          <span class="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-medium text-brand-700 shadow-sm">
            Comfort<i class="bi bi-dot"></i> Elegance <i class="bi bi-dot"></i> Home
          </span>
          <h1 class="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Find a modern apartment that feels like home.
          </h1>
          <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Book verified stays with polished search, transparent pricing, and a booking flow designed to feel calm, fast, and trustworthy.
          </p>
          <!-- <div class="mt-10 flex flex-wrap gap-4 text-sm text-slate-600">
            <div class="rounded-2xl bg-white px-4 py-3 shadow-soft">Verified apartments</div>
            <div class="rounded-2xl bg-white px-4 py-3 shadow-soft">Instant confirmation</div>
            <div class="rounded-2xl bg-white px-4 py-3 shadow-soft">24/7 support</div>
          </div> --> 
        </div>
        <div class="relative z-10 animate-fadeUp lg:pt-8" style="animation-delay: 120ms;">
          <div class="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-soft">
            <div id="heroSlidesViewport" class="relative h-[28rem] w-full">
              <article data-hero-slide class="absolute inset-0 transition-opacity duration-700 opacity-100">
                <img data-hero-image src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80" alt="Luxury apartment interior" class="h-full w-full object-cover" loading="eager" />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent"></div>
                <div class="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p data-hero-badge class="inline-flex rounded-full border border-white/45 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">Signature Stay</p>
                  <h3 data-hero-name class="mt-3 text-2xl font-semibold tracking-tight">The Horizon Suites</h3>
                  <p data-hero-meta class="mt-1 text-sm text-slate-100/90">Victoria Island, Lagos • From NGN 160,000/night</p>
                </div>
              </article>
              <article data-hero-slide class="absolute inset-0 transition-opacity duration-700 opacity-0 pointer-events-none">
                <img data-hero-image src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80" alt="Modern living room with city lighting" class="h-full w-full object-cover" loading="lazy" />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent"></div>
                <div class="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p data-hero-badge class="inline-flex rounded-full border border-white/45 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">Top Rated</p>
                  <h3 data-hero-name class="mt-3 text-2xl font-semibold tracking-tight">Azure Residences</h3>
                  <p data-hero-meta class="mt-1 text-sm text-slate-100/90">Ikoyi, Lagos • From NGN 210,000/night</p>
                </div>
              </article>
              <article data-hero-slide class="absolute inset-0 transition-opacity duration-700 opacity-0 pointer-events-none">
                <img data-hero-image src="https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1600&q=80" alt="Luxury apartment with bright interior" class="h-full w-full object-cover" loading="lazy" />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent"></div>
                <div class="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p data-hero-badge class="inline-flex rounded-full border border-white/45 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">Guest Favorite</p>
                  <h3 data-hero-name class="mt-3 text-2xl font-semibold tracking-tight">Palm Court Apartment</h3>
                  <p data-hero-meta class="mt-1 text-sm text-slate-100/90">Lekki Phase 1 • From NGN 135,000/night</p>
                </div>
              </article>
              <article data-hero-slide class="absolute inset-0 transition-opacity duration-700 opacity-0 pointer-events-none">
                <img data-hero-image src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80" alt="Stylish apartment kitchen and lounge" class="h-full w-full object-cover" loading="lazy" />
                <div class="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent"></div>
                <div class="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p data-hero-badge class="inline-flex rounded-full border border-white/45 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">Executive Pick</p>
                  <h3 data-hero-name class="mt-3 text-2xl font-semibold tracking-tight">Marina Sky Loft</h3>
                  <p data-hero-meta class="mt-1 text-sm text-slate-100/90">Eko Atlantic • From NGN 245,000/night</p>
                </div>
              </article>
              <div class="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
                <span id="heroSlideCounter" class="rounded-full border border-white/50 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">01 / 04</span>
              </div>
              <div class="absolute inset-x-0 bottom-4 flex items-center justify-between px-4 sm:px-5">
                <div class="flex items-center gap-2" id="heroDots">
                  <button type="button" data-hero-dot="0" class="h-2.5 w-7 rounded-full bg-white" aria-label="Go to hero slide 1"></button>
                  <button type="button" data-hero-dot="1" class="h-2.5 w-2.5 rounded-full bg-white/55" aria-label="Go to hero slide 2"></button>
                  <button type="button" data-hero-dot="2" class="h-2.5 w-2.5 rounded-full bg-white/55" aria-label="Go to hero slide 3"></button>
                  <button type="button" data-hero-dot="3" class="h-2.5 w-2.5 rounded-full bg-white/55" aria-label="Go to hero slide 4"></button>
                </div>
                <div class="flex items-center gap-2">
                  <button type="button" id="heroPrev" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-white/20 text-white backdrop-blur transition hover:bg-white/30" aria-label="Previous slide">
                    <i class="bi bi-chevron-left" aria-hidden="true"></i>
                  </button>
                  <button type="button" id="heroNext" class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/55 bg-white/20 text-white backdrop-blur transition hover:bg-white/30" aria-label="Next slide">
                    <i class="bi bi-chevron-right" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="-mt-16 ml-auto w-full max-w-sm rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-soft backdrop-blur-xl animate-float">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-slate-500">Curated spotlight</p>
                <p class="mt-1 text-3xl font-semibold text-slate-900">4 select stays</p>
              </div>
              <div class="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Trusted</div>
            </div>
            <div class="mt-4 h-2 w-full rounded-full bg-slate-100">
              <div class="h-2 w-[88%] rounded-full bg-brand-600"></div>
            </div>
            <p class="mt-4 text-sm leading-6 text-slate-600">Explore standout apartments in motion, then jump into details or browse the full list.</p>
            <a href="${toPagePath('apartments.html')}" class="mt-5 inline-flex items-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Browse all apartments</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render the search bar component.
 *
 * @returns {string} Search bar HTML.
 */
export function renderSearchBar() {
  return `
  <section id="search" class="relative -mt-8 z-20 mx-auto max-w-7xl scroll-mt-28 px-4 sm:px-6 lg:px-8">
      <div class="rounded-[2rem] border border-white/80 bg-white p-4 shadow-soft lg:p-5">
        <form id="homeSearchForm" class="grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto]">
          <label class="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Location</span>
            <input name="destination" type="text" placeholder="Lagos, Abuja, Accra" class="bg-transparent text-sm outline-none placeholder:text-slate-400" aria-label="Destination" />
          </label>
          <label class="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Check-in</span>
            <input name="checkIn" type="date" class="bg-transparent text-sm outline-none" aria-label="Check-in date" />
          </label>
          <label class="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Check-out</span>
            <input name="checkOut" type="date" class="bg-transparent text-sm outline-none" aria-label="Check-out date" />
          </label>
          <label class="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <span class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Guests</span>
            <select name="guests" class="bg-transparent text-sm outline-none" aria-label="Guests">
              <option value="1">1 Guest</option>
              <option value="2" selected>2 Guests</option>
              <option value="3">3 Guests</option>
              <option value="4">4 Guests</option>
              <option value="5">5+ Guests</option>
            </select>
          </label>
          <button type="submit" id="searchButton" class="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-6 py-4 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70">
            Search stays
          </button>
        </form>
      </div>
    </section>
  `;
}

/**
 * Render a skeleton apartment card.
 *
 * @returns {string} Skeleton HTML.
 */
export function renderApartmentSkeleton() {
  return `
    <div class="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-soft animate-pulse">
      <div class="h-60 bg-slate-200"></div>
      <div class="space-y-4 p-5">
        <div class="h-4 w-24 rounded bg-slate-200"></div>
        <div class="h-6 w-3/4 rounded bg-slate-200"></div>
        <div class="h-4 w-1/2 rounded bg-slate-200"></div>
        <div class="flex items-center justify-between">
          <div class="h-8 w-24 rounded-full bg-slate-200"></div>
          <div class="h-10 w-28 rounded-full bg-slate-200"></div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render an apartment card.
 *
 * @param {Object} apartment - Apartment data object.
 * @returns {string} Card HTML.
 */
export function renderApartmentCard(apartment) {
  return `
    <article class="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-glow">
      <div class="relative">
        <img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.name)}" class="h-60 w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        <span class="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">${escapeHtml(apartment.badge)}</span>
      </div>
      <div class="space-y-4 p-5">
        <div>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-xl font-semibold text-slate-900">${escapeHtml(apartment.name)}</h3>
              <p class="mt-1 text-sm text-slate-500">${escapeHtml(apartment.location)}</p>
            </div>
            <div class="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">★ ${formatRating(apartment.rating)}</div>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.18em] text-slate-500">From</p>
            <p class="text-2xl font-semibold text-slate-900">${formatCurrency(apartment.pricePerNight)}</p>
            <p class="text-sm text-slate-500">per night</p>
          </div>
          <a href="${toPagePath('apartment.html', `id=${encodeURIComponent(apartment.id)}`)}" class="inline-flex items-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">View details</a>
        </div>
      </div>
    </article>
  `;
}

/**
 * Render a compact apartment card for horizontal or dense layouts.
 *
 * @param {Object} apartment - Apartment data object.
 * @returns {string} Compact card HTML.
 */
export function renderCompactApartmentCard(apartment) {
  return `
    <article class="flex flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-soft sm:flex-row">
      <img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.name)}" class="h-52 w-full object-cover sm:h-auto sm:w-56" loading="lazy" />
      <div class="flex flex-1 flex-col justify-between gap-5 p-5">
        <div>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(apartment.name)}</h3>
              <p class="mt-1 text-sm text-slate-500">${escapeHtml(apartment.location)}</p>
            </div>
            <span class="rounded-2xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">★ ${formatRating(apartment.rating)}</span>
          </div>
          <p class="mt-4 max-h-16 overflow-hidden text-sm leading-6 text-slate-600">${escapeHtml((apartment.description || 'A premium stay with modern comfort and thoughtful details.'))}</p>
        </div>
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-2xl font-semibold text-slate-900">${formatCurrency(apartment.pricePerNight)}</p>
            <p class="text-sm text-slate-500">per night</p>
          </div>
          <a href="${toPagePath('apartment.html', `id=${encodeURIComponent(apartment.id)}`)}" class="inline-flex items-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">View details</a>
        </div>
      </div>
    </article>
  `;
}

/**
 * Render the featured apartments section shell.
 *
 * @returns {string} Featured section HTML.
 */
export function renderFeaturedSection() {
  return `
  <section id="featured" class="mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span class="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Featured apartments</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Handpicked stays with premium comfort.</h2>
        </div>
        <p class="max-w-2xl text-slate-600">Browse top-rated apartments with elegant interiors, transparent pricing, and seamless booking flow.</p>
      </div>
      <div id="featuredGrid" class="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4"></div>
    </section>
  `;
}

/**
 * Render the reasons-to-book section.
 *
 * @returns {string} Why us HTML.
 */
export function renderWhyChooseUs() {
  const items = [
    { title: 'Secure Booking', description: 'Protected payments and a clear confirmation flow.', iconClass: 'bi-shield-lock' },
    { title: 'Best Prices', description: 'Transparent rates with no surprise fees at checkout.', iconClass: 'bi-cash-stack' },
    { title: 'Verified Apartments', description: 'Curated listings that meet quality and trust standards.', iconClass: 'bi-patch-check' },
    { title: '24/7 Support', description: 'Helpful support whenever your travel plans need it.', iconClass: 'bi-headset' }
  ];

  return `
    <section id="why-us" class="scroll-mt-28 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
          <span class="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Why choose us</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">A booking experience designed to feel calm and reliable.</h2>
        </div>
        <div class="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          ${items.map((item) => `
            <article class="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl text-brand-700 shadow-sm">
                <i class="bi ${item.iconClass}" aria-hidden="true"></i>
              </div>
              <h3 class="mt-5 text-lg font-semibold text-slate-900">${item.title}</h3>
              <p class="mt-2 text-sm leading-6 text-slate-600">${item.description}</p>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

/**
 * Render the testimonials section.
 *
 * @returns {string} Testimonials HTML.
 */
export function renderTestimonials(items = null) {
  const testimonials = Array.isArray(items) && items.length
    ? items
    : [
      {
        name: 'Maya Chen',
        role: 'Frequent traveler',
        quote: 'The booking flow feels premium and clear. I found a stay in less than a minute.'
      },
      {
        name: 'Omar Reed',
        role: 'Business traveler',
        quote: 'It looks polished, loads quickly, and the pricing is easy to trust.'
      },
      {
        name: 'Sofia Alvarez',
        role: 'Weekend planner',
        quote: 'The layout is calm and intuitive. It feels like a real hospitality brand.'
      }
    ];

  return `
    <section id="testimonials" class="mx-auto max-w-7xl scroll-mt-28 px-4 py-20 sm:px-6 lg:px-8">
      <div>
        <div>
          <span class="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Testimonials</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Loved by guests who value ease and quality.</h2>
        </div>
      </div>
      <div class="mt-10 grid gap-6 lg:grid-cols-3">
        ${testimonials.map((testimonial) => `
          <blockquote class="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-soft">
            <p class="text-base leading-7 text-slate-700">“${testimonial.quote}”</p>
            <footer class="mt-6 flex items-center gap-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700">${testimonial.name.charAt(0)}</div>
              <div>
                <div class="font-semibold text-slate-900">${testimonial.name}</div>
                <div class="text-sm text-slate-500">${testimonial.role}</div>
              </div>
            </footer>
          </blockquote>
        `).join('')}
      </div>
    </section>
  `;
}

/**
 * Render the footer.
 *
 * @returns {string} Footer HTML.
 */
export function renderFooter() {
  const currentYear = new Date().getFullYear();

  return `
    <footer class="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div class="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <div class="flex items-center gap-3 font-semibold text-white">
            <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white">A</span>
            <span>ANTOBELL</span>
          </div>
          <p class="mt-2 inline-flex max-w-full truncate rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand-200">ANTOBELL SUITE</p>
          <p class="mt-4 max-w-md text-sm leading-6 text-slate-400">Premium apartment booking with a clean UI, reliable flow, and thoughtful guest experience.</p>
        </div>
        <div class="space-y-3">
          <h3 class="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Explore</h3>
          <div class="space-y-2 text-sm">
            <a href="${toHomePath('featured')}" class="block transition hover:text-white">Featured apartments</a>
            <a href="${toHomePath('why-us')}" class="block transition hover:text-white">Why choose us</a>
            <a href="${toHomePath('testimonials')}" class="block transition hover:text-white">Testimonials</a>
          </div>
        </div>
        <div class="space-y-3">
          <h3 class="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Support</h3>
          <a href="mailto:help@antobell.com" class="flex items-center gap-2 text-sm leading-6 text-slate-400 transition hover:text-white">
            <i class="bi bi-envelope" aria-hidden="true"></i>
            <span>help@antobell.com</span>
          </a>
          <a href="tel:+15550192026" class="flex items-center gap-2 text-sm leading-6 text-slate-400 transition hover:text-white">
            <i class="bi bi-telephone" aria-hidden="true"></i>
            <span>+1 (555) 019-2026</span>
          </a>
          <a href="https://wa.me/2348012345678" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm leading-6 text-slate-400 transition hover:text-white">
            <i class="bi bi-whatsapp" aria-hidden="true"></i>
            <span>WhatsApp: +234 801 234 5678</span>
          </a>
        </div>
      </div>
      <div class="border-t border-slate-800/80">
        <p class="mx-auto max-w-7xl px-4 py-5 text-center text-sm text-slate-400 sm:px-6 lg:px-8">ANTOBELL &copy; ${currentYear}. All rights reserved.</p>
      </div>
    </footer>
  `;
}

/**
 * Render an empty state.
 *
 * @param {string} title - Empty state title.
 * @param {string} description - Empty state message.
 * @returns {string} Empty state HTML.
 */
export function renderEmptyState(title, description) {
  return `
    <div class="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
      <h3 class="text-xl font-semibold text-slate-900">${escapeHtml(title)}</h3>
      <p class="mt-3 text-slate-600">${escapeHtml(description)}</p>
    </div>
  `;
}

/**
 * Render an error state.
 *
 * @param {string} title - Error state title.
 * @param {string} description - Error state message.
 * @returns {string} Error state HTML.
 */
export function renderErrorState(title, description) {
  return `
    <div class="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-10 text-center shadow-soft">
      <h3 class="text-xl font-semibold text-rose-900">${escapeHtml(title)}</h3>
      <p class="mt-3 text-rose-700">${escapeHtml(description)}</p>
    </div>
  `;
}

/**
 * Render a search results header.
 *
 * @param {number} count - Number of results.
 * @returns {string} Header HTML.
 */
export function renderSearchResultsHeader(count) {
  return `
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span class="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">Search results</span>
        <h1 id="searchResultsCount" class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">${count} apartments available</h1>
        <p class="mt-3 max-w-2xl text-slate-600">Refine your stay with price, bedrooms, bathrooms, amenities, and guest rating filters.</p>
      </div>
    </div>
  `;
}

/**
 * Render the search filters panel.
 *
 * @returns {string} Filters HTML.
 */
export function renderSearchFilters() {
  const amenities = ['Wi-Fi', 'Pool', 'Kitchen', 'Gym', 'Parking', 'Workspace'];

  return `
    <aside class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-soft lg:sticky lg:top-24">
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-lg font-semibold text-slate-900">Filters</h2>
        <button type="button" id="clearFiltersButton" class="text-sm font-medium text-brand-700 transition hover:text-brand-800">Clear all</button>
      </div>
      <form id="filterForm" class="mt-6 space-y-6">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-slate-700">Price max</span>
          <input name="maxPrice" type="range" min="100" max="500" value="300" class="w-full accent-brand-600" aria-label="Maximum price" />
        </label>
        <label class="block space-y-2">
          <span class="text-sm font-medium text-slate-700">Bedrooms</span>
          <select name="bedrooms" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500">
            <option value="0">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
          </select>
        </label>
        <label class="block space-y-2">
          <span class="text-sm font-medium text-slate-700">Bathrooms</span>
          <select name="bathrooms" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500">
            <option value="0">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
          </select>
        </label>
        <label class="block space-y-2">
          <span class="text-sm font-medium text-slate-700">Rating</span>
          <select name="rating" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500">
            <option value="0">Any</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
          </select>
        </label>
        <div class="space-y-3">
          <span class="text-sm font-medium text-slate-700">Amenities</span>
          <div class="grid grid-cols-2 gap-3">
            ${amenities.map((amenity) => `
              <label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input type="checkbox" name="amenities" value="${amenity}" class="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <span>${amenity}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <button type="submit" class="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Apply filters</button>
      </form>
    </aside>
  `;
}

/**
 * Render pagination controls.
 *
 * @param {number} currentPage - Active page number.
 * @param {number} totalPages - Total page count.
 * @returns {string} Pagination HTML.
 */
export function renderPagination(currentPage, totalPages) {
  const previousDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return `
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-slate-500">Page ${currentPage} of ${totalPages}</p>
      <div class="flex items-center gap-3">
        <button type="button" data-page-action="previous" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" ${previousDisabled ? 'disabled' : ''}>Previous</button>
        <button type="button" data-page-action="next" class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" ${nextDisabled ? 'disabled' : ''}>Next</button>
      </div>
    </div>
  `;
}

/**
 * Render the apartment detail hero section.
 *
 * @param {Object} apartment - Apartment data object.
 * @returns {string} Detail hero HTML.
 */
export function renderApartmentDetailHero(apartment) {
  return `
    <section class="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
      <div class="space-y-4">
        <div class="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
          <img id="detailMainImage" src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.name)}" class="h-[24rem] w-full object-cover sm:h-[32rem]" loading="eager" />
        </div>
        <div id="detailThumbnails" class="grid grid-cols-4 gap-3"></div>
      </div>
      <div class="space-y-6">
        <div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <span class="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Apartment details</span>
          <h1 class="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">${escapeHtml(apartment.name)}</h1>
          <p class="mt-3 text-slate-500">${escapeHtml(apartment.address || apartment.location)}</p>
          <div class="mt-5 flex flex-wrap items-center gap-3 text-sm">
            <span class="rounded-full bg-amber-50 px-3 py-2 font-semibold text-amber-700">★ ${formatRating(apartment.rating)}</span>
            <span class="rounded-full bg-slate-100 px-3 py-2 text-slate-700">${escapeHtml(apartment.location)}</span>
            <span class="rounded-full bg-slate-100 px-3 py-2 text-slate-700">${apartment.bedrooms} bedrooms</span>
            <span class="rounded-full bg-slate-100 px-3 py-2 text-slate-700">${apartment.bathrooms} bathrooms</span>
          </div>
          <p class="mt-6 text-base leading-8 text-slate-600">${escapeHtml(apartment.description || 'Premium apartment with thoughtful amenities and a polished guest experience.')}</p>
        </div>
      </div>
    </section>
  `;
}

/**
 * Render apartment thumbnails.
 *
 * @param {Object} apartment - Apartment data object.
 * @returns {string} Thumbnail HTML.
 */
export function renderApartmentThumbnails(apartment) {
  const gallery = Array.isArray(apartment.gallery) && apartment.gallery.length ? apartment.gallery : [apartment.image];

  return gallery.map((image, index) => `
      <button type="button" data-gallery-image="${escapeHtml(image)}" class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${index === 0 ? 'ring-2 ring-brand-500' : ''}">
        <img src="${escapeHtml(image)}" alt="${escapeHtml(apartment.name)} thumbnail ${index + 1}" class="h-24 w-full object-cover" loading="lazy" />
      </button>
    `).join('');
}

/**
 * Render apartment amenity chips.
 *
 * @param {Array<string>} amenities - Amenity list.
 * @returns {string} Amenity markup.
 */
export function renderApartmentAmenities(amenities = []) {
  return `
    <div class="flex flex-wrap gap-3">
      ${amenities.map((amenity) => `<span class="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">${escapeHtml(amenity)}</span>`).join('')}
    </div>
  `;
}

/**
 * Render apartment house rules.
 *
 * @param {Array<string>} rules - House rule list.
 * @returns {string} Rules markup.
 */
export function renderApartmentRules(rules = []) {
  return `
    <ul class="space-y-3 text-sm text-slate-600">
      ${rules.map((rule) => `<li class="flex items-start gap-3"><span class="mt-1 h-2 w-2 rounded-full bg-brand-600"></span><span>${escapeHtml(rule)}</span></li>`).join('')}
    </ul>
  `;
}

/**
 * Render apartment reviews.
 *
 * @param {Array<Object>} reviews - Review list.
 * @returns {string} Reviews markup.
 */
export function renderApartmentReviews(reviews = []) {
  return `
    <div class="space-y-4">
      ${reviews.map((review) => `
        <article class="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <div class="flex items-center justify-between gap-4">
            <h4 class="font-semibold text-slate-900">${escapeHtml(review.name)}</h4>
            <span class="rounded-full bg-white px-3 py-1 text-sm font-semibold text-amber-700">★ ${formatRating(review.rating)}</span>
          </div>
          <p class="mt-3 text-sm leading-6 text-slate-600">${escapeHtml(review.comment)}</p>
        </article>
      `).join('')}
    </div>
  `;
}

/**
 * Render the booking card for the apartment detail page.
 *
 * @param {Object} apartment - Apartment data object.
 * @returns {string} Booking card HTML.
 */
export function renderBookingCard(apartment) {
  return `
    <aside class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft lg:sticky lg:top-24">
      <div class="flex items-end justify-between gap-4">
        <div>
          <p class="text-sm text-slate-500">Price per night</p>
          <p class="mt-1 text-3xl font-semibold text-slate-900">${formatCurrency(apartment.pricePerNight)}</p>
        </div>
        <span class="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">Available now</span>
      </div>
      <form id="bookingCardForm" class="mt-6 space-y-4">
        <label class="block space-y-2">
          <span class="text-sm font-medium text-slate-700">Check-in</span>
          <input name="checkIn" type="date" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" required aria-label="Check-in date" />
        </label>
        <label class="block space-y-2">
          <span class="text-sm font-medium text-slate-700">Check-out</span>
          <input name="checkOut" type="date" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" required aria-label="Check-out date" />
        </label>
        <label class="block space-y-2">
          <span class="text-sm font-medium text-slate-700">Guests</span>
          <select name="guests" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-500" aria-label="Guests">
            <option value="1">1 Guest</option>
            <option value="2" selected>2 Guests</option>
            <option value="3">3 Guests</option>
            <option value="4">4 Guests</option>
            <option value="5">5+ Guests</option>
          </select>
        </label>
        <div class="space-y-3 rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600">
          <div class="flex items-center justify-between">
            <span>Subtotal</span>
            <span>${formatCurrency(apartment.pricePerNight)}</span>
          </div>
          <div class="flex items-center justify-between">
            <span>Taxes</span>
            <span>${formatCurrency(Math.round(apartment.pricePerNight * 0.12))}</span>
          </div>
          <div class="flex items-center justify-between font-semibold text-slate-900">
            <span>Grand total</span>
            <span>${formatCurrency(Math.round(apartment.pricePerNight * 1.12))}</span>
          </div>
        </div>
        <button type="submit" class="inline-flex w-full items-center justify-center rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700">Book now</button>
      </form>
    </aside>
  `;
}

/**
 * Render a section title and supporting text.
 *
 * @param {string} title - Section title.
 * @param {string} description - Supporting text.
 * @returns {string} Section header HTML.
 */
export function renderSectionHeader(title, description) {
  return `
    <div class="max-w-3xl">
      <h2 class="text-2xl font-semibold tracking-tight text-slate-900">${escapeHtml(title)}</h2>
      <p class="mt-3 text-slate-600">${escapeHtml(description)}</p>
    </div>
  `;
}

/**
 * Render the booking summary card for checkout.
 *
 * @param {Object} apartment - Apartment data object.
 * @param {Object} stay - Selected stay details.
 * @returns {string} Booking summary card HTML.
 */
export function renderBookingSummaryCard(apartment, stay = {}) {
  const subtotal = Number(apartment.pricePerNight || 0) * Number(stay.nights || 1);
  const taxes = Math.round(subtotal * 0.12);
  const fees = 25;
  const grandTotal = subtotal + taxes + fees;

  return `
    <aside class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft lg:sticky lg:top-24">
      <div class="overflow-hidden rounded-[1.5rem] bg-slate-100">
        <img src="${escapeHtml(apartment.image)}" alt="${escapeHtml(apartment.name)}" class="h-40 w-full object-cover" loading="lazy" />
      </div>
      <div class="mt-5">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Booking summary</p>
        <h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">${escapeHtml(apartment.name)}</h2>
        <p class="mt-2 text-sm text-slate-500">${escapeHtml(apartment.address || apartment.location)}</p>
      </div>
      <div class="mt-6 space-y-4 rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600">
        <div class="flex items-center justify-between">
          <span>Check-in</span>
          <span>${escapeHtml(stay.checkIn || 'Select date')}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Check-out</span>
          <span>${escapeHtml(stay.checkOut || 'Select date')}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Guests</span>
          <span>${escapeHtml(String(stay.guests || 2))}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Subtotal</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Taxes</span>
          <span>${formatCurrency(taxes)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span>Fees</span>
          <span>${formatCurrency(fees)}</span>
        </div>
        <div class="flex items-center justify-between border-t border-slate-200 pt-4 text-base font-semibold text-slate-900">
          <span>Grand total</span>
          <span>${formatCurrency(grandTotal)}</span>
        </div>
      </div>
      <p class="mt-5 text-sm leading-6 text-slate-500">Your booking details are protected and can be reviewed before payment confirmation.</p>
    </aside>
  `;
}

/**
 * Render a booking checkout page section title.
 *
 * @param {string} title - Section title.
 * @param {string} description - Supporting text.
 * @returns {string} Checkout section header HTML.
 */
export function renderCheckoutSectionHeader(title, description) {
  return renderSectionHeader(title, description);
}

/**
 * Render a toast notification.
 *
 * @param {string} message - Toast message.
 * @param {string} [type='success'] - Toast type.
 * @returns {string} Toast HTML.
 */
export function renderToast(message, type = 'success') {
  const tone = type === 'error' ? 'bg-rose-600' : 'bg-emerald-600';
  return `
    <div class="pointer-events-auto inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-soft ${tone}">
      <span>${type === 'error' ? '!' : '✓'}</span>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}
