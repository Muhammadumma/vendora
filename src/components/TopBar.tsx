import React, { useState } from 'react';
import { Menu, RefreshCw, LogOut, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Store } from '../core/store';

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
    const [syncMessage, setSyncMessage] = useState<string | null>(null);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchValue(val);
        if (val.trim().length >= 2) {
            window.location.hash = `#search?q=${encodeURIComponent(val.trim())}`;
            onSearch(val.trim());
        }
    };

    const handleSyncClick = async () => {
        setSyncMessage(null);
        await onSync();
        if (Store.state.lastSyncError) {
            setSyncMessage(Store.state.lastSyncError);
            setTimeout(() => setSyncMessage(null), 6000);
        } else {
            setSyncSuccess(true);
            setSyncMessage('Cloud sync complete!');
            setTimeout(() => {
                setSyncSuccess(false);
                setSyncMessage(null);
            }, 3000);
        }
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
                    title="Royalvazier Textile — Kantin Kwari Kano"
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
                {syncMessage && (
                    <div
                        style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: syncSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: syncSuccess ? 'var(--success-color)' : 'var(--danger-color)',
                            border: `1px solid ${syncSuccess ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                            maxWidth: '260px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}
                        title={syncMessage}
                    >
                        {syncSuccess ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        <span>{syncMessage}</span>
                    </div>
                )}
                <button
                    className="icon-btn"
                    id="sync-btn"
                    title={isSyncing ? "Syncing..." : "Sync with Cloud"}
                    onClick={handleSyncClick}
                    disabled={isSyncing}
                    style={{ color: syncSuccess ? 'var(--success-color)' : Store.state.lastSyncError ? 'var(--danger-color)' : undefined }}
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
