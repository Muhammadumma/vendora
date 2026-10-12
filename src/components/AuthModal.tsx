import React, { useState } from 'react';
import {
    ShieldCheck,
    ShieldAlert,
    User,
    Lock,
    Camera,
    ArrowRight,
    Check,
    Sparkles
} from 'lucide-react';
import { Store, UserSession } from '../core/store';

interface AuthModalProps {
    user: UserSession | null;
    onLoginSuccess: (user: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ user, onLoginSuccess }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    // Security question state
    const [q1, setQ1] = useState('What was the name of your first pet?');
    const [a1, setA1] = useState('');
    const [q2, setQ2] = useState('What was your first car?');
    const [a2, setA2] = useState('');

    const isSecuritySetupNeeded = !!user && !user.securityQuestions;

    if (user && !isSecuritySetupNeeded) {
        return null;
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setProfilePic(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!username.trim() || !password) {
            setErrorMsg('Please enter both username and password.');
            return;
        }

        setLoading(true);
        try {
            const success = Store.login(username.trim(), password, profilePic);
            if (success) {
                const loggedIn = Store.getUser();
                if (loggedIn) {
                    onLoginSuccess(loggedIn);
                }
            } else {
                setErrorMsg('Invalid credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDemoLogin = () => {
        Store.login('Demo Admin', 'vendora123');
        const loggedIn = Store.getUser();
        if (loggedIn) {
            onLoginSuccess(loggedIn);
        }
    };

    const handleSecuritySave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!a1.trim() || !a2.trim()) {
            setErrorMsg('Please answer both security questions.');
            return;
        }

        Store.setSecurityQuestions([
            { question: q1, answer: a1.trim().toLowerCase() },
            { question: q2, answer: a2.trim().toLowerCase() }
        ]);
        const updated = Store.getUser();
        if (updated) {
            onLoginSuccess(updated);
        }
    };

    if (isSecuritySetupNeeded) {
        return (
            <div className="auth-overlay">
                <div className="auth-card fade-in">
                    <div className="auth-header">
                        <div className="auth-icon-container">
                            <ShieldAlert size={28} />
                        </div>
                        <h2 className="auth-title">Secure Your Account</h2>
                        <p className="auth-subtitle">Please set up security questions to protect your profile.</p>
                    </div>

                    {errorMsg && (
                        <div style={{ color: 'var(--danger-color)', marginBottom: '12px', fontSize: '13px', textAlign: 'center' }}>
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSecuritySave} className="auth-form">
                        <div style={{ marginBottom: '16px' }}>
                            <label className="label">Primary Security Question</label>
                            <select
                                value={q1}
                                onChange={e => setQ1(e.target.value)}
                                className="search-input"
                                style={{ width: '100%', marginBottom: '8px' }}
                            >
                                <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                                <option value="What city were you born in?">What city were you born in?</option>
                                <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Your Answer"
                                value={a1}
                                onChange={e => setA1(e.target.value)}
                                className="search-input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label className="label">Backup Security Question</label>
                            <select
                                value={q2}
                                onChange={e => setQ2(e.target.value)}
                                className="search-input"
                                style={{ width: '100%', marginBottom: '8px' }}
                            >
                                <option value="What was your first car?">What was your first car?</option>
                                <option value="What was the name of your elementary school?">What was the name of your elementary school?</option>
                                <option value="What is your favorite book?">What is your favorite book?</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Your Answer"
                                value={a2}
                                onChange={e => setA2(e.target.value)}
                                className="search-input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <button type="submit" className="btn btn-primary auth-submit-btn">
                            Complete Setup
                            <Check size={18} style={{ marginLeft: '8px' }} />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-overlay">
            <div className="auth-card fade-in">
                <div className="auth-header">
                    <div
                        className="auth-icon-container"
                        style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px auto',
                            background: '#FFFFFF',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
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
                    <h2 className="auth-title">Vendora</h2>
                    <p className="auth-subtitle">
                        {mode === 'login' ? 'Welcome back, please enter your details' : 'Begin your professional journey today'}
                    </p>
                </div>

                {errorMsg && (
                    <div style={{ color: 'var(--danger-color)', marginBottom: '12px', fontSize: '13px', textAlign: 'center' }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-input-wrapper">
                        <User className="auth-input-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Username"
                            className="search-input auth-input"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    {mode === 'register' && (
                        <div style={{ textAlign: 'left', margin: '8px 0' }}>
                            <label className="label" style={{ marginLeft: '4px' }}>Profile Identity</label>
                            <label htmlFor="auth-pic-input" className="auth-file-label" style={{ cursor: 'pointer' }}>
                                <Camera size={20} style={{ color: 'var(--primary-color)' }} />
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    {profilePic ? 'Avatar Selected ✓' : 'Upload Avatar'}
                                </span>
                                <input
                                    type="file"
                                    id="auth-pic-input"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleFileChange}
                                />
                            </label>
                        </div>
                    )}

                    <div className="auth-input-wrapper">
                        <Lock className="auth-input-icon" size={18} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="search-input auth-input"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary auth-submit-btn"
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                        <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button
                        type="button"
                        onClick={() => {
                            setMode(mode === 'login' ? 'register' : 'login');
                            setErrorMsg('');
                        }}
                        className="auth-toggle-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        {mode === 'login' ? (
                            <>New here? <span style={{ color: 'var(--text-main)', textDecoration: 'underline' }}>Create an account</span></>
                        ) : (
                            <>Already a member? <span style={{ color: 'var(--text-main)', textDecoration: 'underline' }}>Login here</span></>
                        )}
                    </button>
                </div>

                <div style={{ margin: '24px 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Quick Demo Access
                    </span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
                </div>

                <button
                    type="button"
                    onClick={handleDemoLogin}
                    className="btn btn-outline auth-submit-btn"
                    style={{ borderColor: 'var(--border-color)', fontSize: '13px', height: '44px', gap: '8px' }}
                >
                    <Sparkles size={16} style={{ color: 'var(--primary-color)' }} />
                    Instant Demo Login
                </button>
            </div>
        </div>
    );
};
