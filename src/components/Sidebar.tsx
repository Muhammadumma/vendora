import React from 'react';
import {
    LayoutDashboard,
    Package,
    PackagePlus,
    ShoppingCart,
    Truck,
    FileWarning,
    BarChart3,
    Settings as SettingsIcon,
    Menu
} from 'lucide-react';
import { Store, UserSession } from '../core/store';

interface SidebarProps {
    currentRoute: string;
    onNavigate: (route: string) => void;
    user: UserSession | null;
    isMobileOpen: boolean;
    onToggleMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    currentRoute,
    onNavigate,
    user,
    isMobileOpen,
    onToggleMobile
}) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'add-product', label: 'Add Products', icon: PackagePlus },
        { id: 'sell', label: 'Sell', icon: ShoppingCart },
        { id: 'purchases', label: 'Purchases', icon: Truck },
        { id: 'debts', label: 'Debt Manager', icon: FileWarning },
        { id: 'analytics', label: 'AI Analytics', icon: BarChart3 }
    ];

    const handleItemClick = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        window.location.hash = `#${id}`;
        onNavigate(id);
        if (window.innerWidth <= 1024) {
            onToggleMobile();
        }
    };

    return (
        <aside className={`sidebar ${isMobileOpen ? 'active' : ''}`} id="sidebar">
            <div className="sidebar-header">
                <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                        style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            background: '#FFFFFF',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                        }}
                    >
                        <img
                            src="/logo.png"
                            alt="Vendora Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>Royalvazier</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Textile · Kantin Kwari</div>
                    </div>
                </div>
                <button
                    className="mobile-toggle sidebar-toggle-btn"
                    title="Toggle Navigation"
                    onClick={onToggleMobile}
                    type="button"
                >
                    <Menu size={22} />
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentRoute === item.id;
                    return (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            onClick={(e) => handleItemClick(item.id, e)}
                        >
                            <Icon className="icon" size={20} />
                            <span>{item.label}</span>
                        </a>
                    );
                })}

                <div className="nav-divider" style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />

                <a
                    href="#settings"
                    className={`nav-item ${currentRoute === 'settings' ? 'active' : ''}`}
                    onClick={(e) => handleItemClick('settings', e)}
                >
                    <SettingsIcon className="icon" size={20} />
                    <span>Settings</span>
                </a>
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile" id="user-profile-summary">
                    <img
                        id="sidebar-user-avatar"
                        className="avatar"
                        src={user?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0D9488&color=fff`}
                        alt={user?.name || 'User'}
                    />
                    <div className="user-info" style={{ flex: 1 }}>
                        <div className="user-name" id="sidebar-user-name">
                            {user?.name || 'Guest'}
                        </div>
                        <div className="workspace-name" id="sidebar-user-role">
                            {user?.role || 'Shop Manager'}
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.3)'
                    }}
                >
                    <span>v2.4.1 (Stable)</span>
                    <a href="#settings" onClick={(e) => handleItemClick('settings', e)} style={{ color: 'inherit', textDecoration: 'none' }}>
                        &copy; 2026 Vendora
                    </a>
                </div>
            </div>
        </aside>
    );
};
