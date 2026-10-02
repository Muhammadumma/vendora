export default class Router {
    constructor(store) {
        this.store = store;
        this.routes = {
            'dashboard': () => import('../modules/dashboard.js'),
            'sell': () => import('../modules/sales.js'),
            'add-product': () => import('../modules/addProduct.js'),
            'inventory': () => import('../modules/inventory.js'),
            'purchases': () => import('../modules/purchases.js'),
            'reports': () => import('../modules/reports.js'),
            'analytics': () => import('../modules/analytics.js'),
            'debts': () => import('../modules/debts.js'),
            'settings': () => import('../modules/settings.js'),
            'search': () => import('../modules/searchResults.js')
        };
        this.contentArea = document.getElementById('content-workspace');
        this.pageTitle = document.getElementById('page-title');
    }

    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        if (!window.location.hash) {
            window.location.hash = '#dashboard';
        } else {
            this.handleRoute();
        }
    }

    async handleRoute() {
        // Auth Check
        if (!this.store.getUser()) {
            // If not logged in, force Login Module Overlay
            // We'll handle this in App.js or Auth module, but for standard routing:
            // Note: In a real app we might redirect to #login, 
            // but here we are using an overlay strategy for Auth.
            // We will trigger a global event or check in App render.
        }

        const [routeBase, queryStr] = window.location.hash.slice(1).split('?');
        const hash = routeBase || 'dashboard';
        const queryParams = new URLSearchParams(queryStr || '');
        const q = queryParams.get('q') || '';

        // Update Sidebar
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.remove('active');
            if (el.getAttribute('href') === `#${hash}`) {
                el.classList.add('active');
            }
        });

        if (this.routes[hash]) {
            try {
                const module = await this.routes[hash]();
                if (module.default && typeof module.default.render === 'function') {
                    this.contentArea.innerHTML = '';

                    const content = hash === 'search'
                        ? module.default.render(this.store, q)
                        : module.default.render(this.store);

                    this.contentArea.appendChild(content);

                    const pageTitles = {
                        'dashboard': 'Dashboard', 'sell': 'Point of Sale', 'add-product': 'Add Products',
                        'inventory': 'Inventory', 'purchases': 'Purchases', 'reports': 'Reports',
                        'analytics': 'AI Analytics', 'debts': 'Debt Manager', 'settings': 'Settings',
                        'search': 'Search Results'
                    };
                    this.pageTitle.innerText = pageTitles[hash] || hash.charAt(0).toUpperCase() + hash.slice(1);

                    if (typeof module.default.afterRender === 'function') {
                        module.default.afterRender(this.store);
                    }

                    // Initialize Icons
                    if (window.lucide) {
                        window.lucide.createIcons();
                    }
                }
            } catch (e) {
                console.error('Route error:', e);
                this.contentArea.innerHTML = `<div class="card"><h3>Error</h3><p>${e.message}</p></div>`;
            }
        }
    }
}
