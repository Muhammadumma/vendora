import React from 'react';
import {
    LayoutDashboard,
    ShoppingCart,
    Plus,
    Package,
    FileWarning
} from 'lucide-react';

interface BottomNavProps {
    currentRoute: string;
    onNavigate: (route: string) => void;
    onToggleMenu?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentRoute, onNavigate }) => {
    return (
        <nav className="bottom-nav-bar" id="mobile-bottom-nav">
            <button
                type="button"
                className={`nav-tab ${currentRoute === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                    window.location.hash = '#dashboard';
                    onNavigate('dashboard');
                }}
            >
                <LayoutDashboard size={24} />
                <span>Dashboard</span>
            </button>

            <button
                type="button"
                className={`nav-tab ${currentRoute === 'sell' ? 'active' : ''}`}
                onClick={() => {
                    window.location.hash = '#sell';
                    onNavigate('sell');
                }}
            >
                <ShoppingCart size={24} />
                <span>POS Sell</span>
            </button>

            {/* Elevated Center Add Button */}
            <button
                type="button"
                className={`nav-tab nav-tab-highlight ${currentRoute === 'add-product' ? 'active' : ''}`}
                onClick={() => {
                    window.location.hash = '#add-product';
                    onNavigate('add-product');
                }}
                title="Add New Merchandise"
            >
                <div className="nav-tab-highlight-circle">
                    <Plus size={24} strokeWidth={2.5} />
                </div>
                <span>Add</span>
            </button>

            <button
                type="button"
                className={`nav-tab ${currentRoute === 'inventory' ? 'active' : ''}`}
                onClick={() => {
                    window.location.hash = '#inventory';
                    onNavigate('inventory');
                }}
            >
                <Package size={24} />
                <span>Stock</span>
            </button>

            <button
                type="button"
                className={`nav-tab ${currentRoute === 'debts' ? 'active' : ''}`}
                onClick={() => {
                    window.location.hash = '#debts';
                    onNavigate('debts');
                }}
            >
                <FileWarning size={24} />
                <span>Debts</span>
            </button>
        </nav>
    );
};
