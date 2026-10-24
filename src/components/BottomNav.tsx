import React from 'react';
import {
    LayoutDashboard,
    Package,
    FileWarning,
    TrendingUp
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
                <LayoutDashboard size={20} />
                <span>Home</span>
            </button>

            <button
                type="button"
                className={`nav-tab ${currentRoute === 'inventory' ? 'active' : ''}`}
                onClick={() => {
                    window.location.hash = '#inventory';
                    onNavigate('inventory');
                }}
            >
                <Package size={20} />
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
                <FileWarning size={20} />
                <span>Debts</span>
            </button>

            <button
                type="button"
                className={`nav-tab ${currentRoute === 'analytics' ? 'active' : ''}`}
                onClick={() => {
                    window.location.hash = '#analytics';
                    onNavigate('analytics');
                }}
            >
                <TrendingUp size={20} />
                <span>Reports</span>
            </button>
        </nav>
    );
};
