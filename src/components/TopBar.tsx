import React, { useState } from 'react';
import { Menu, RefreshCw, LogOut } from 'lucide-react';

interface TopBarProps {
    title: string;
    onToggleMobile: () => void;
    onSync: () => Promise<void>;
    isSyncing: boolean;
    onLogout: () => void;
    onSearch: (q: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
    title,
    onToggleMobile,
    onSync,
    isSyncing,
    onLogout,
    onSearch
}) => {
    const [searchValue, setSearchValue] = useState('');
    const [syncSuccess, setSyncSuccess] = useState(false);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchValue(val);
        if (val.trim().length >= 2) {
            window.location.hash = `#search?q=${encodeURIComponent(val.trim())}`;
            onSearch(val.trim());
        }
    };

    const handleSyncClick = async () => {
        await onSync();
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 1500);
    };

    return (
        <header className="top-bar">
            <div className="page-header-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                    className="icon-btn hide-desktop sidebar-toggle-btn"
                    title="Open Menu"
                    onClick={onToggleMobile}
                    type="button"
                >
                    <Menu size={22} />
                </button>
                {/* App Brand Icon - WhatsApp size (38px) */}
                <div
                    className="app-brand-icon-wrapper"
                    title="Vendora — Stock Control Hub"
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
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)'
                    }}
                >
                    <img
                        src="/logo.png"
                        alt="App Icon"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                    />
                </div>
                <h1 className="page-title" id="page-title">{title}</h1>
            </div>
            <div className="top-actions">
                <div className="search-container">
                    <input
                        type="text"
                        id="global-search-input"
                        placeholder="Search everything..."
                        className="search-input"
                        value={searchValue}
                        onChange={handleSearchChange}
                    />
                </div>
                <button
                    className="icon-btn"
                    id="sync-btn"
                    title={isSyncing ? "Syncing..." : "Sync with Cloud"}
                    onClick={handleSyncClick}
                    disabled={isSyncing}
                    style={{ color: syncSuccess ? 'var(--success-color)' : undefined }}
                    type="button"
                >
                    <RefreshCw
                        className={`icon ${isSyncing ? 'spin-anim' : ''}`}
                        size={20}
                        style={isSyncing ? { animation: 'spin 1s linear infinite' } : undefined}
                    />
                </button>
                <button
                    className="icon-btn"
                    id="logout-btn"
                    title="Logout"
                    onClick={onLogout}
                    type="button"
                >
                    <LogOut className="icon" size={20} />
                </button>
            </div>
        </header>
    );
};
