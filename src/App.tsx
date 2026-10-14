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

    // Initial default demo data seeding for Royalvazier Textile
    useEffect(() => {
        const migrated = localStorage.getItem('rv_textile_seeded_v1');
        const existingProducts = Store.getProducts();
        const hasOldGroceryData = existingProducts.some(p => p.name.includes('Flour') || p.name.includes('Indomie'));

        if (!migrated || existingProducts.length === 0 || hasOldGroceryData) {
            localStorage.removeItem('bc_products');
            Store.state.products = [];

            Store.addProduct({
                name: 'Swiss Voile Cotton Lace (10 Yards)',
                sku: 'RVT-SWISS-10Y',
                category: 'Lace & Voile',
                qty: 28,
                buyPrice: 42000,
                sellPrice: 52000,
                supplier: 'Royalvazier Direct Imports',
                threshold: 5
            });
            Store.addProduct({
                name: 'Atiku Super Soft Brocade (5 Yards)',
                sku: 'RVT-ATIKU-05Y',
                category: 'Brocade & Shadda',
                qty: 45,
                buyPrice: 18000,
                sellPrice: 24500,
                supplier: 'Kantin Kwari Direct Wholesaler',
                threshold: 8
            });
            Store.addProduct({
                name: 'Getzner Magnum Gold Jacquard (10 Yards)',
                sku: 'RVT-GETZ-10Y',
                category: 'Brocade & Shadda',
                qty: 12,
                buyPrice: 85000,
                sellPrice: 105000,
                supplier: 'Getzner Textil Austria',
                threshold: 3
            });
            Store.addProduct({
                name: 'Senator Cashmere Wool Blend (4 Yards)',
                sku: 'RVT-SEN-04Y',
                category: 'Suitings & Senator',
                qty: 36,
                buyPrice: 14000,
                sellPrice: 19500,
                supplier: 'Royalvazier Mills',
                threshold: 6
            });
            Store.addProduct({
                name: 'Ankara Real Dutch Wax (6 Yards)',
                sku: 'RVT-ANK-06Y',
                category: 'Ankara Wax',
                qty: 54,
                buyPrice: 12000,
                sellPrice: 16500,
                supplier: 'Vlisco Premium Line',
                threshold: 10
            });
            Store.addProduct({
                name: 'George Hand-Cut Beaded Silk (5 Yards)',
                sku: 'RVT-GEO-05Y',
                category: 'Lace & Voile',
                qty: 8,
                buyPrice: 55000,
                sellPrice: 72000,
                supplier: 'Royalvazier Exclusive Collection',
                threshold: 3
            });

            // Sample sale
            localStorage.removeItem('bc_sales');
            Store.state.sales = [];
            Store.addSale({
                customerName: 'Alhaji Sanusi Dantata',
                customerPhone: '0803 555 1234',
                paymentMethod: 'Bank',
                items: [
                    { name: 'Swiss Voile Cotton Lace (10 Yards)', qty: 2, price: 52000, buyPrice: 42000 },
                    { name: 'Atiku Super Soft Brocade (5 Yards)', qty: 3, price: 24500, buyPrice: 18000 }
                ],
                total: 177500
            });

            // Sample debt
            localStorage.removeItem('bc_debts');
            Store.state.debts = [];
            Store.addDebt({
                debtor: 'Hajiya Maryam Kano Fabrics',
                phone: '0802 999 4455',
                product: '2 Bales Ankara Real Dutch Wax (6 Yards)',
                amount: 33000,
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
            }, true);

            localStorage.setItem('rv_textile_seeded_v1', 'true');
        }
    }, []);

    // Listen for route changes in hash
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

    // Store & Firebase Auth update listener
    useEffect(() => {
        const unsubscribe = Store.subscribe(() => {
            setUser(Store.getUser());
            setIsSyncing(Store.state.isSyncing);
        });

        // Sync with Firebase Auth state
        const unsubAuth = FirebaseAuthService.onAuthStateChange((fbUser) => {
            if (fbUser) {
                const current = Store.getUser();
                if (!current || current.uid !== fbUser.uid) {
                    const provider = fbUser.providerData?.[0]?.providerId === 'google.com' ? 'firebase-google' : 'firebase-email';
                    const session = Store.loginWithFirebaseUser(fbUser, provider);
                    setUser(session);
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
