/**
 * Shared admin layout utilities for navigation and responsive table behavior.
 */

function navLinkClass(isActive) {
    if (isActive) {
        return 'inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow';
    }

    return 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50';
}

function navLinksMarkup(activeView) {
    const links = [
        { key: 'dashboard', label: 'Dashboard', href: './index.html' },
        { key: 'bookings', label: 'Bookings', href: './bookings.html' },
        { key: 'payments', label: 'Payments', href: './payments.html' },
        { key: 'apartments', label: 'Apartments', href: './apartments.html' }
    ];

    return links.map((link) => {
        const active = activeView === link.key;
        return `<a href="${link.href}" class="${navLinkClass(active)}" data-admin-menu-close>${link.label}</a>`;
    }).join('');
}

/**
 * Render the standardized admin page header.
 *
 * @param {{title: string, activeView: string, adminName?: string}} config - Header config.
 * @returns {string} Header markup.
 */
export function renderAdminHeader(config) {
    const title = String(config?.title || 'Admin');
    const activeView = String(config?.activeView || 'dashboard');
    const adminName = String(config?.adminName || '').trim();
    const signedInMarkup = adminName
        ? `
            <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Signed in</p>
                <p class="mt-1 text-sm font-medium text-slate-900">${adminName}</p>
            </div>
        `
        : '';

    return `
        <header class="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
            <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <p class="text-sm font-semibold uppercase tracking-[0.22em] text-brand-700">ANTOBELL Admin</p>
                        <h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">${title}</h1>
                    </div>
                    <button type="button" class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 md:hidden" data-admin-menu-toggle aria-expanded="false" aria-controls="adminMobileMenu" aria-label="Toggle admin menu">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 4a1 1 0 100 2h12a1 1 0 100-2H4z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>

                <div class="mt-5 hidden items-start justify-between gap-4 md:flex">
                    <nav class="flex flex-wrap gap-3">
                        ${navLinksMarkup(activeView)}
                    </nav>
                    <div class="flex items-center gap-3">
                        ${signedInMarkup}
                        <button type="button" data-admin-logout class="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Logout</button>
                    </div>
                </div>

                <div id="adminMobileMenu" class="mt-4 hidden rounded-2xl border border-slate-200 bg-white p-3 md:hidden" data-admin-menu-panel>
                    <nav class="grid gap-2">
                        ${navLinksMarkup(activeView)}
                    </nav>
                    <div class="mt-3 border-t border-slate-200 pt-3">
                        ${adminName ? `<p class="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Signed in as ${adminName}</p>` : ''}
                        <button type="button" data-admin-logout class="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Logout</button>
                    </div>
                </div>
            </div>
        </header>
    `;
}

/**
 * Bind mobile menu toggle interactions.
 */
export function bindAdminMobileMenu() {
    const toggleButton = document.querySelector('[data-admin-menu-toggle]');
    const menuPanel = document.querySelector('[data-admin-menu-panel]');

    if (!(toggleButton instanceof HTMLButtonElement) || !(menuPanel instanceof HTMLElement)) {
        return;
    }

    const setExpanded = (isExpanded) => {
        toggleButton.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        menuPanel.classList.toggle('hidden', !isExpanded);
    };

    setExpanded(false);

    toggleButton.addEventListener('click', () => {
        const expanded = toggleButton.getAttribute('aria-expanded') === 'true';
        setExpanded(!expanded);
    });

    menuPanel.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
            return;
        }

        if (target.closest('[data-admin-menu-close]')) {
            setExpanded(false);
        }
    });
}

/**
 * Convert plain tables into mobile-first stacked cards while preserving desktop table layout.
 *
 * @param {string} selector - CSS selector for tables to transform.
 */
export function enhanceResponsiveTables(selector = 'table') {
    const tables = document.querySelectorAll(selector);

    tables.forEach((table) => {
        if (!(table instanceof HTMLTableElement)) {
            return;
        }

        const tableHead = table.querySelector('thead');
        const body = table.querySelector('tbody');
        if (!tableHead || !body) {
            return;
        }

        const labels = Array.from(tableHead.querySelectorAll('th')).map((heading) => heading.textContent?.trim() || 'Item');

        table.classList.add('w-full');
        tableHead.classList.add('hidden', 'md:table-header-group');
        body.classList.add('block', 'space-y-3', 'md:table-row-group', 'md:space-y-0');

        const rows = Array.from(body.querySelectorAll('tr'));
        rows.forEach((row) => {
            if (!(row instanceof HTMLTableRowElement)) {
                return;
            }

            const cells = Array.from(row.children).filter((cell) => cell instanceof HTMLTableCellElement);
            if (!cells.length) {
                return;
            }

            const singleMessageRow = cells.length === 1 && cells[0].hasAttribute('colspan');

            row.classList.add('block', 'rounded-2xl', 'border', 'border-slate-200', 'p-3', 'md:table-row', 'md:rounded-none', 'md:border-0', 'md:p-0');

            if (singleMessageRow) {
                cells[0].classList.add('block', 'w-full', 'py-5', 'text-center', 'md:table-cell', 'md:py-10');
                return;
            }

            cells.forEach((cell, index) => {
                if (!(cell instanceof HTMLTableCellElement)) {
                    return;
                }

                cell.classList.add('block', 'border-b', 'border-slate-100', 'py-2.5', 'last:border-b-0', 'md:table-cell', 'md:border-b-0', 'md:py-4');

                if (!cell.querySelector(':scope > .admin-cell-label')) {
                    const label = document.createElement('span');
                    label.className = 'admin-cell-label mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:hidden';
                    label.textContent = labels[index] || 'Field';
                    cell.prepend(label);
                }
            });
        });
    });
}
