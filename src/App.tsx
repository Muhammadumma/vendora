import React, { useState, useEffect } from 'react';
import { Store, UserSession } from './core/store';
import { FirebaseAuthService } from './core/firebase';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';

import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { AddProductView } from './views/AddProductView';
import { SellView } from './views/SellView';
import { PurchasesView } from './views/PurchasesView';
import { DebtsView } from './views/DebtsView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { SearchResultsView } from './views/SearchResultsView';

export const App: React.FC = () => {
    const [currentRoute, setCurrentRoute] = useState<string>('dashboard');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
    const [user, setUser] = useState<UserSession | null>(Store.getUser());
    const [isSyncing, setIsSyncing] = useState<boolean>(false);





    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1);
            const [base, queryStr] = hash.split('?');
            const route = base || 'dashboard';
            setCurrentRoute(route);

            if (route === 'search') {
                const params = new URLSearchParams(queryStr || '');
                setSearchQuery(params.get('q') || '');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Theme sync
    useEffect(() => {
        const theme = Store.getSettings().theme;
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    }, []);

    // Initial mount restore if user is already in session
    useEffect(() => {
        const u = Store.getUser();
        if (u?.uid) {
            Store.restoreFromCloud().catch(e => console.warn('Mount restore:', e));
        }
    }, []);

    // Store & Firebase Auth update listener
    useEffect(() => {
        const unsubscribe = Store.subscribe(() => {
            setUser(Store.getUser());
            setIsSyncing(Store.state.isSyncing);
        });

        // Sync with Firebase Auth state
        const unsubAuth = FirebaseAuthService.onAuthStateChange(async (fbUser) => {
            if (fbUser) {
                const current = Store.getUser();
                if (!current || current.uid !== fbUser.uid) {
                    const provider = fbUser.providerData?.[0]?.providerId === 'google.com' ? 'firebase-google' : 'firebase-email';
                    Store.clearAllData();
                    const session = Store.loginWithFirebaseUser(fbUser, provider);
                    setUser(session);
                    await Store.restoreFromCloud();
                } else if (Store.getProducts().length === 0) {
                    await Store.restoreFromCloud();
                }
            } else {
                if (Store.getUser()) {
                    Store.logout();
                    setUser(null);
                }
            }
        });

        return () => {
            unsubscribe();
            unsubAuth();
        };
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        // Pull latest from cloud and push memory updates
        await Store.restoreFromCloud();
        await Store.syncWithFirestore();
        setIsSyncing(false);
    };

    const handleLogout = async () => {
        Store.logout();
        setUser(null);
    };

    const pageTitles: Record<string, string> = {
        'dashboard': 'Dashboard',
        'sell': 'Point of Sale',
        'add-product': 'Bulk Product Entry',
        'inventory': 'Inventory Management',
        'purchases': 'Purchasing & Restock',
        'reports': 'Reports & Analytics',
        'analytics': 'AI Analytics',
        'debts': 'Debt & Receivables Manager',
        'settings': 'System Settings',
        'search': 'Global Search'
    };

    const renderActiveView = () => {
        switch (currentRoute) {
            case 'dashboard':
                return <DashboardView onNavigate={setCurrentRoute} />;
            case 'inventory':
                return <InventoryView onNavigate={setCurrentRoute} />;
            case 'add-product':
                return <AddProductView onNavigate={setCurrentRoute} />;
            case 'sell':
                return <SellView />;
            case 'purchases':
                return <PurchasesView />;
            case 'debts':
                return <DebtsView />;
            case 'analytics':
                return <AnalyticsView onNavigate={setCurrentRoute} />;
            case 'settings':
                return <SettingsView />;
            case 'search':
                return <SearchResultsView query={searchQuery} onNavigate={setCurrentRoute} />;
            default:
                return <DashboardView onNavigate={setCurrentRoute} />;
        }
    };

    return (
        <div id="app" className="app-container">
            <Sidebar
                currentRoute={currentRoute}
                onNavigate={setCurrentRoute}
                user={user}
                isMobileOpen={isMobileOpen}
                onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
            />

            <div
                id="sidebar-overlay"
                className={`sidebar-overlay ${isMobileOpen ? 'active' : ''}`}
                onClick={() => setIsMobileOpen(false)}
            />

            <main className="main-layout">
                <TopBar
                    title={pageTitles[currentRoute] || 'Vendora'}
                    onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
                    onSync={handleSync}
                    isSyncing={isSyncing}
                    onLogout={handleLogout}
                    onSearch={setSearchQuery}
                />

                <div id="content-workspace" className="content-workspace">
                    {renderActiveView()}
                </div>

                <BottomNav
                    currentRoute={currentRoute}
                    onNavigate={setCurrentRoute}
                    onToggleMenu={() => setIsMobileOpen(!isMobileOpen)}
                />
            </main>

            <AuthModal
                user={user}
                onLoginSuccess={(loggedInUser) => setUser({ ...loggedInUser })}
            />
        </div>
    );
};
