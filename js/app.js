import Router from './core/router.js';
import { Store } from './core/store.js';
import Auth from './modules/auth.js';

class App {
    constructor() {
        this.store = Store;
        this.router = new Router(this.store);
        this.init();
    }

    init() {
        console.log('Vendora Initializing...');
        Auth.init(this.store);
        this.router.init();

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }

        // Sync Button
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', async () => {
                if (!this.store.getUser()) return;
                const icon = syncBtn.querySelector('i');
                syncBtn.disabled = true;
                syncBtn.title = 'Syncing...';
                if (icon) icon.style.animation = 'spin 1s linear infinite';

                try {
                    await this.store.syncWithFirestore();
                    // Brief flash green
                    syncBtn.style.color = 'var(--success-color)';
                    setTimeout(() => {
                        syncBtn.style.color = '';
                        syncBtn.title = 'Sync with Cloud';
                    }, 1500);
                } catch (e) {
                    console.error('Sync failed:', e);
                    syncBtn.style.color = 'var(--danger-color)';
                    setTimeout(() => { syncBtn.style.color = ''; }, 1500);
                } finally {
                    syncBtn.disabled = false;
                    if (icon) icon.style.animation = '';
                }
            });
        }

        this.applyTheme();
        this.updateUserUI();
        this.initSearch();
        this.initMobileMenu();

        // Initial Icon Render
        this.refreshIcons();

        // Redundancy Render (for late loads)
        setTimeout(() => this.refreshIcons(), 500);
        setTimeout(() => this.refreshIcons(), 2000);
    }

    refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    initMobileMenu() {
        const toggleBtns = document.querySelectorAll('.sidebar-toggle-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        const app = document.getElementById('app');
        const navItems = document.querySelectorAll('.nav-item');

        if (!sidebar || !overlay || !app) {
            console.warn('Sidebar elements missing from DOM');
            return;
        }

        const toggleMenu = (e) => {
            if (e) e.stopPropagation();
            if (window.innerWidth <= 1024) {
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            } else {
                app.classList.toggle('sidebar-collapsed');
            }
        };

        toggleBtns.forEach(btn => {
            btn.addEventListener('click', toggleMenu);
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 1024) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        });
    }

    initSearch() {
        const searchInput = document.getElementById('global-search-input');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(searchTimeout);

            searchTimeout = setTimeout(() => {
                if (query.length >= 2) {
                    window.location.hash = `#search?q=${encodeURIComponent(query)}`;
                }
            }, 400);
        });
    }

    applyTheme() {
        const theme = this.store.getSettings().theme;
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }

    updateUserUI() {
        const sessionUser = this.store.getUser();
        if (sessionUser) {
            const nameEl = document.getElementById('sidebar-user-name');
            const avatarEl = document.getElementById('sidebar-user-avatar');

            if (nameEl) nameEl.innerText = sessionUser.name;
            if (avatarEl && sessionUser.profilePic) {
                avatarEl.src = sessionUser.profilePic;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
