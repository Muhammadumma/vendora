import React from 'react';
import { Store, User } from 'lucide-react';
import { UserSession } from '../core/store';

interface AppHeaderProps {
    user: UserSession | null;
    onOpenSettings: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ user, onOpenSettings }) => {
    const email = user?.name
        ? `${user.name.toLowerCase().replace(/\s+/g, '')}@clearpass.edu.ng`
        : 'admin@clearpass.edu.ng';

    return (
        <header className="app-top-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="brand-logo-badge" style={{ overflow: 'hidden' }}>
                    <img
                        src="/logo.png"
                        alt="Vendora Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                    />
                    <Store size={22} color="#FFFFFF" />
                </div>
                <div>
                    <div className="brand-title-row">
                        <span className="brand-name">Vendora</span>
                    </div>
                    <div className="brand-subtext">{email}</div>
                </div>
            </div>

            <div
                className="user-avatar-circle"
                onClick={onOpenSettings}
                title="Account Settings"
            >
                <User size={20} color="#FFFFFF" />
            </div>
        </header>
    );
};
