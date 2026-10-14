import React, { useState } from 'react';
import {
    Shield,
    Store as StoreIcon,
    Phone,
    MapPin,
    FileText,
    Receipt,
    Sun,
    Moon,
    Lock,
    Eye,
    EyeOff,
    Download,
    Upload,
    Check,
    CheckCircle2,
    Save,
    Smartphone,
    FileSpreadsheet,
    Database,
    Sparkles,
    Trash2,
    RefreshCw,
    Cloud,
    CloudUpload,
    CloudDownload,
    Wifi
} from 'lucide-react';
import { Store, Settings } from '../core/store';
import { ExportService } from '../core/exportService';

export const SettingsView: React.FC = () => {
    const [settings, setSettings] = useState<Settings>(Store.getSettings());
    const [savedMsg, setSavedMsg] = useState('');
    const [exportMsg, setExportMsg] = useState('');
    const [hapticClick, setHapticClick] = useState(true);
    const [cloudMsg, setCloudMsg] = useState('');
    const [cloudLoading, setCloudLoading] = useState<'push' | 'pull' | null>(null);

    // Password credentials state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [credMsg, setCredMsg] = useState('');

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 3 * 1024 * 1024) {
            setSavedMsg('Logo image exceeds maximum 3MB limit.');
            setTimeout(() => setSavedMsg(''), 3500);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setSettings(prev => ({ ...prev, businessLogo: dataUrl }));
            Store.updateSettings({ businessLogo: dataUrl });
            setSavedMsg('✓ Logo uploaded successfully! Now mounted on all receipts & reports.');
            setTimeout(() => setSavedMsg(''), 4000);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setSettings(prev => ({ ...prev, businessLogo: undefined }));
        Store.updateSettings({ businessLogo: undefined });
        setSavedMsg('✓ Logo reset to default royal shop crest.');
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const runExport = async (action: () => void | Promise<void>, label: string) => {
        try {
            setExportMsg(`Exporting ${label}...`);
            await action();
            setExportMsg(`✓ ${label} downloaded successfully!`);
            setTimeout(() => setExportMsg(''), 3500);
        } catch (err: any) {
            setExportMsg(`Export failed: ${err.message || 'Unknown error'}`);
            setTimeout(() => setExportMsg(''), 3500);
        }
    };

    const handleSaveSettings = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        Store.updateSettings(settings);
        setSavedMsg('✓ Shop parameters successfully synced!');
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const handleThemeChange = (theme: 'light' | 'dark') => {
        setSettings(prev => ({ ...prev, theme }));
        Store.updateSettings({ theme });
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }
    };

    const handleUpdateCredentials = (e: React.FormEvent) => {
        e.preventDefault();
        setCredMsg('');

        if (!Store.verifyPassword(currentPassword)) {
            setCredMsg('Current master password does not match.');
            return;
        }

        if (newPassword.length < 4) {
            setCredMsg('New password must be at least 4 characters.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setCredMsg('Passwords do not match.');
            return;
        }

        Store.updatePassword(newPassword);
        setCredMsg('✓ Master credentials updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setCredMsg(''), 3000);
    };

    const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                const ok = Store.restoreBackup(content);
                if (ok) {
                    alert('Backup restored successfully!');
                    setSettings(Store.getSettings());
                } else {
                    alert('Invalid backup file.');
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#F95721', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Settings & Parameters
                </span>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>System Configuration</h1>
                <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0' }}>
                    Tune shop details, print rules, tax ledger and cloud recovery
                </p>
            </div>

            {/* Admin Badge Card */}
            <div className="card" style={{ padding: '14px 16px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={20} color="#F95721" />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>admin@clearpass.edu.ng</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>Store Administrator</div>
                    </div>
                </div>
                <span style={{ padding: '3px 8px', borderRadius: '10px', background: '#F0F9FF', color: '#0284C7', fontSize: '11px', fontWeight: 700 }}>
                    Secured
                </span>
            </div>

            {savedMsg && (
                <div style={{ padding: '12px 16px', background: '#ECFDF5', color: '#10B981', borderRadius: '12px', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
                    {savedMsg}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveSettings}>
                {/* Section 1: Store Identity & Paper Receipts */}
                <div className="card" style={{ padding: '18px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            STORE IDENTITY & PAPER RECEIPTS
                        </span>
                        <Receipt size={16} color="#64748B" />
                    </div>

                    {/* Logo Monogram */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: '#FFFFFF', border: '2px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                            <img
                                src={settings.businessLogo || '/royalvazier-logo.png'}
                                alt="Store Logo"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                                }}
                            />
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Store Logo & Receipt Crest</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>Appears on header, sidebar and printed receipts</div>
                        </div>
                    </div>

                    {/* Shop Name */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Business / Brand Name *
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="search-input"
                                style={{ width: '100%', paddingLeft: '38px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '44px', fontSize: '13px', fontWeight: 600 }}
                                value={settings.businessName}
                                onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                                required
                            />
                            <StoreIcon size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                        </div>
                    </div>

                    {/* Parent Company & RC Number */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                                Parent Company
                            </label>
                            <input
                                type="text"
                                className="search-input"
                                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '44px', fontSize: '13px', fontWeight: 600, padding: '0 12px' }}
                                value={settings.parentCompany || ''}
                                onChange={e => setSettings({ ...settings, parentCompany: e.target.value })}
                                placeholder="Royalvazier Global Services Ltd"
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                                Corporate RC Number
                            </label>
                            <input
                                type="text"
                                className="search-input"
                                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '44px', fontSize: '13px', fontWeight: 600, padding: '0 12px' }}
                                value={settings.rcNumber || ''}
                                onChange={e => setSettings({ ...settings, rcNumber: e.target.value })}
                                placeholder="RC9636293"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Corporate Email
                        </label>
                        <input
                            type="email"
                            className="search-input"
                            style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '44px', fontSize: '13px', fontWeight: 600, padding: '0 12px' }}
                            value={settings.businessEmail || ''}
                            onChange={e => setSettings({ ...settings, businessEmail: e.target.value })}
                            placeholder="info@royalvazier.com.ng"
                        />
                    </div>

                    {/* Phone */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Official Hotline / WhatsApp
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="search-input"
                                style={{ width: '100%', paddingLeft: '38px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '44px', fontSize: '13px', fontWeight: 600 }}
                                value={settings.businessPhone}
                                onChange={e => setSettings({ ...settings, businessPhone: e.target.value })}
                            />
                            <Phone size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                        </div>
                    </div>

                    {/* Address */}
                    <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Physical Storefront Address
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="search-input"
                                style={{ width: '100%', paddingLeft: '38px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '44px', fontSize: '13px', fontWeight: 600 }}
                                value={settings.businessAddress}
                                onChange={e => setSettings({ ...settings, businessAddress: e.target.value })}
                            />
                            <MapPin size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                        </div>
                    </div>

                    {/* Footer Message */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Thermal Receipt Footer Message</label>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Max 80 ch</span>
                        </div>
                        <textarea
                            className="search-input"
                            style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', minHeight: '64px' }}
                            value={settings.receiptFooter}
                            onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })}
                        />
                    </div>
                </div>

                {/* Section 2: Fiscal & Value Added Tax */}
                <div className="card" style={{ padding: '18px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            FISCAL & VALUE ADDED TAX
                        </span>
                        <FileText size={16} color="#64748B" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Value Added Tax (VAT)</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>Calculate and append statutory sales tax at checkout</div>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={settings.vatEnabled}
                                onChange={e => setSettings({ ...settings, vatEnabled: e.target.checked })}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>

                    {settings.vatEnabled && (
                        <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Applicable VAT Rate</label>
                                <span style={{ padding: '1px 6px', background: '#FFF2EB', color: '#F95721', borderRadius: '8px', fontSize: '10px', fontWeight: 800 }}>
                                    Automated
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700 }}>%</span>
                                <input
                                    type="number"
                                    className="search-input"
                                    style={{ width: '80px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '6px 10px', fontSize: '14px', fontWeight: 700 }}
                                    value={settings.vatRate}
                                    onChange={e => setSettings({ ...settings, vatRate: Number(e.target.value) })}
                                    step="0.5"
                                />
                            </div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px' }}>
                                Item pricing is automatically computed with inclusive VAT during item scanning.
                            </div>
                        </div>
                    )}
                </div>

                {/* Section 3: Display & Sensory Workspace */}
                <div className="card" style={{ padding: '18px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            DISPLAY & SENSORY WORKSPACE
                        </span>
                        <Sun size={16} color="#64748B" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#F1F5F9', padding: '4px', borderRadius: '14px', marginBottom: '16px' }}>
                        <button
                            type="button"
                            onClick={() => handleThemeChange('light')}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                border: 'none',
                                background: settings.theme === 'light' ? '#FFFFFF' : 'transparent',
                                color: settings.theme === 'light' ? '#F95721' : '#64748B',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: settings.theme === 'light' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                            }}
                        >
                            <Sun size={16} /> Light View
                        </button>
                        <button
                            type="button"
                            onClick={() => handleThemeChange('dark')}
                            style={{
                                padding: '10px',
                                borderRadius: '10px',
                                border: 'none',
                                background: settings.theme === 'dark' ? '#FFFFFF' : 'transparent',
                                color: settings.theme === 'dark' ? '#F95721' : '#64748B',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: settings.theme === 'dark' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                            }}
                        >
                            <Moon size={16} /> Night Mode
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Smartphone size={18} color="#64748B" />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Barcode Haptic Click</div>
                                <div style={{ fontSize: '12px', color: '#64748B' }}>Vibrate phone upon successful scan</div>
                            </div>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={hapticClick}
                                onChange={e => setHapticClick(e.target.checked)}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                </div>

                {/* Section 4: Access Guard & Credentials */}
                <div className="card" style={{ padding: '18px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            ACCESS GUARD & CREDENTIALS
                        </span>
                        <Lock size={16} color="#64748B" />
                    </div>

                    {credMsg && (
                        <div style={{ padding: '10px 14px', borderRadius: '10px', fontSize: '13px', marginBottom: '12px', background: credMsg.includes('✓') ? '#ECFDF5' : '#FEF2F2', color: credMsg.includes('✓') ? '#10B981' : '#DC2626', fontWeight: 600 }}>
                            {credMsg}
                        </div>
                    )}

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Existing Master Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="search-input"
                                style={{ width: '100%', paddingRight: '40px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '44px', fontSize: '13px' }}
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="••••••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            New Secure Password
                        </label>
                        <input
                            type="password"
                            className="search-input"
                            style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '44px', fontSize: '13px' }}
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Min. 8 alphanumeric characters"
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Confirm Master Password
                        </label>
                        <input
                            type="password"
                            className="search-input"
                            style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', height: '44px', fontSize: '13px' }}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Re-type matching password"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleUpdateCredentials}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: '#F1F5F9', color: '#0F172A', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <RefreshCw size={15} /> Update Credentials
                    </button>
                </div>

                {/* Section 5: Disaster Recovery & Cold Storage */}
                <div className="card" style={{ padding: '18px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            DISASTER RECOVERY & COLD STORAGE
                        </span>
                        <Database size={16} color="#64748B" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Database size={20} color="#0F172A" />
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Encrypted Data Snapshot</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>Export offline catalog, ledger logs, debt registers</div>
                        </div>
                    </div>

                    {/* Cloud Sync Status */}
                    {cloudMsg && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            marginBottom: '12px',
                            background: cloudMsg.startsWith('✓') ? '#ECFDF5' : cloudMsg.startsWith('✗') ? '#FEF2F2' : '#EFF6FF',
                            color: cloudMsg.startsWith('✓') ? '#065F46' : cloudMsg.startsWith('✗') ? '#DC2626' : '#1D4ED8',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Cloud size={14} />
                            <span>{cloudMsg}</span>
                        </div>
                    )}

                    {/* Firebase Cloud Sync Row */}
                    <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <Wifi size={14} color="#0284C7" />
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Firebase Cloud Sync</span>
                            <span style={{ fontSize: '10px', background: '#0284C7', color: '#FFF', borderRadius: '999px', padding: '1px 7px', fontWeight: 700 }}>LIVE</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', marginBottom: '12px' }}>
                            Push all data to Firestore or restore from your latest cloud snapshot.
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <button
                                type="button"
                                disabled={cloudLoading !== null}
                                onClick={async () => {
                                    setCloudLoading('push');
                                    setCloudMsg('Syncing to Firebase cloud...');
                                    const result = await Store.syncWithFirestore();
                                    setCloudLoading(null);
                                    if (result.success) {
                                        setCloudMsg(`✓ Synced to cloud at ${new Date(result.timestamp || '').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`);
                                    } else {
                                        setCloudMsg(`✗ Sync failed: ${result.error || 'Network error'}`);
                                    }
                                    setTimeout(() => setCloudMsg(''), 5000);
                                }}
                                style={{
                                    padding: '10px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: cloudLoading === 'push' ? '#7DD3FC' : '#0284C7',
                                    color: '#FFFFFF',
                                    fontSize: '12.5px',
                                    fontWeight: 800,
                                    cursor: cloudLoading !== null ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '3px',
                                    opacity: cloudLoading !== null && cloudLoading !== 'push' ? 0.5 : 1
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {cloudLoading === 'push' ? <RefreshCw size={14} /> : <Upload size={14} />}
                                    {cloudLoading === 'push' ? 'Syncing...' : 'Backup Now'}
                                </span>
                                <span style={{ fontSize: '10px', opacity: 0.85 }}>Push to Firestore</span>
                            </button>

                            <button
                                type="button"
                                disabled={cloudLoading !== null}
                                onClick={async () => {
                                    if (!window.confirm('This will overwrite ALL local data with the latest cloud backup. Are you sure?')) return;
                                    setCloudLoading('pull');
                                    setCloudMsg('Pulling from Firebase cloud...');
                                    const result = await Store.restoreFromCloud();
                                    setCloudLoading(null);
                                    if (result.success) {
                                        setCloudMsg('✓ Local data restored from cloud backup!');
                                        setSettings(Store.getSettings());
                                    } else {
                                        setCloudMsg(`✗ Restore failed: ${result.error || 'No snapshot found'}`);
                                    }
                                    setTimeout(() => setCloudMsg(''), 5000);
                                }}
                                style={{
                                    padding: '10px',
                                    borderRadius: '10px',
                                    border: '1px solid #BAE6FD',
                                    background: cloudLoading === 'pull' ? '#E0F2FE' : '#F0F9FF',
                                    color: '#0284C7',
                                    fontSize: '12.5px',
                                    fontWeight: 800,
                                    cursor: cloudLoading !== null ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '3px',
                                    opacity: cloudLoading !== null && cloudLoading !== 'pull' ? 0.5 : 1
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {cloudLoading === 'pull' ? <RefreshCw size={14} /> : <Download size={14} />}
                                    {cloudLoading === 'pull' ? 'Restoring...' : 'Restore Cloud'}
                                </span>
                                <span style={{ fontSize: '10px', opacity: 0.85 }}>Pull from Firestore</span>
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '12px', color: '#64748B' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F95721' }} />
                        <span>Local JSON Backup</span> • <span>Download as cold storage file</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                        <button
                            type="button"
                            onClick={() => Store.downloadBackup()}
                            style={{ padding: '12px', borderRadius: '12px', border: 'none', background: '#A03112', color: '#FFFFFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Download size={14} /> Export JSON</span>
                            <span style={{ fontSize: '10px', opacity: 0.8 }}>Compact ledger file</span>
                        </button>

                        <label
                            htmlFor="restore-file-input"
                            style={{ padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#F1F5F9', color: '#0F172A', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Upload size={14} /> Restore File</span>
                            <span style={{ fontSize: '10px', color: '#64748B' }}>Import cold database</span>
                            <input
                                type="file"
                                id="restore-file-input"
                                accept=".json"
                                style={{ display: 'none' }}
                                onChange={handleRestoreFile}
                            />
                        </label>
                    </div>
                </div>

                {/* Bottom Save Button */}
                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                    <Check size={18} /> Save Shop Parameters
                </button>
            </form>
        </div>
    );
};
