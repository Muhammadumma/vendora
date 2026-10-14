import React from 'react';
import {
    LayoutDashboard,
    Package,
    Plus,
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

            {/* Standardized Center Action Button: Strictly "New Sale" */}
            <button
                type="button"
                className="nav-center-action-btn"
                title="New Sale"
                aria-label="New Sale"
                onClick={() => {
                    window.location.hash = '#sell';
                    onNavigate('sell');
                }}
                style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: currentRoute === 'sell' ? '#0F172A' : '#1E293B',
                    color: '#FFFFFF',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.28)',
                    cursor: 'pointer',
                    transform: 'translateY(-10px)',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                    flexShrink: 0
                }}
            >
                <Plus size={24} strokeWidth={2.5} color="#FFFFFF" />
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
