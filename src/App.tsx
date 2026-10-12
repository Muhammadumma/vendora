import React, { useState, useEffect } from 'react';
import { Store, UserSession } from './core/store';
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

    // Initial default demo data seeding if store is completely empty
    useEffect(() => {
        if (Store.getProducts().length === 0) {
            Store.addProduct({
                name: 'Golden Penny Flour 50kg',
                sku: 'SKU-GP-FLOUR50',
                category: 'Grains & Baking',
                qty: 18,
                buyPrice: 32000,
                sellPrice: 36500,
                supplier: 'Golden Penny Flour Mills',
                threshold: 5
            });
            Store.addProduct({
                name: 'Dangote Sugar 50kg',
                sku: 'SKU-DG-SUGAR50',
                category: 'Grains & Baking',
                qty: 12,
                buyPrice: 41000,
                sellPrice: 45000,
                supplier: 'Dangote Sugar Refinery',
                threshold: 4
            });
            Store.addProduct({
                name: 'Vegetable Oil 25L',
                sku: 'SKU-8921-VGOIL',
                category: 'Oils & Fats',
                qty: 4,
                buyPrice: 28500,
                sellPrice: 32000,
                supplier: 'Grand Cereals Hub',
                threshold: 5
            });
            Store.addProduct({
                name: 'Indomie Super Pack (Carton)',
                sku: 'SKU-IND-PACK',
                category: 'Packaged Foods',
                qty: 24,
                buyPrice: 6200,
                sellPrice: 7200,
                supplier: 'Dufil Prima Foods',
                threshold: 6
            });
            Store.addProduct({
                name: 'Peak Milk Powder 400g (x6)',
                sku: 'SKU-PEAK-MILK',
                category: 'Dairy',
                qty: 2,
                buyPrice: 11000,
                sellPrice: 12800,
                supplier: 'FrieslandCampina WAMCO',
                threshold: 4
            });

            // Sample sale
            Store.addSale({
                customerName: 'Alhaji Musa Enterprise',
                customerPhone: '0803 123 4567',
                paymentMethod: 'Cash',
                items: [
                    { name: 'Golden Penny Flour 50kg', qty: 2, price: 36500, buyPrice: 32000 },
                    { name: 'Indomie Super Pack (Carton)', qty: 3, price: 7200, buyPrice: 6200 }
                ],
                total: 94600
            });

            // Sample debt
            Store.addDebt({
                debtor: 'Mama Chinedu Provisions',
                phone: '0812 987 6543',
                product: '2 Cartons Indomie Noodles',
                amount: 14400,
                dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
            }, true);
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

    // Store update listener
    useEffect(() => {
        const unsubscribe = Store.subscribe(() => {
            setUser(Store.getUser());
            setIsSyncing(Store.state.isSyncing);
        });
        return () => unsubscribe();
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        await Store.syncWithFirestore();
        setIsSyncing(false);
    };

    const handleLogout = () => {
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
                onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
            />
        </div>
    );
};
