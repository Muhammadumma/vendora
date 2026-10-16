import React, { useState } from 'react';
import {
    ShieldAlert,
    User,
    Lock,
    Mail,
    Eye,
    EyeOff,
    Camera,
    ArrowRight,
    Check,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    KeyRound
} from 'lucide-react';
import { Store, UserSession } from '../core/store';
import { FirebaseAuthService } from '../core/firebase';

interface AuthModalProps {
    user: UserSession | null;
    onLoginSuccess: (user: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ user, onLoginSuccess }) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>('login');
    const [emailOrUsername, setEmailOrUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [profilePic, setProfilePic] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    // Security question state (optional setup)
    const [q1, setQ1] = useState('What was the name of your first pet?');
    const [a1, setA1] = useState('');
    const [q2, setQ2] = useState('What was your first car?');
    const [a2, setA2] = useState('');

    // Firebase-authenticated users don't need in-app security questions
    const isFirebaseUser = user?.authProvider === 'firebase-email' || user?.authProvider === 'firebase-google';
    const isSecuritySetupNeeded = !!user && !user.securityQuestions && !isFirebaseUser;

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

    // 1. Google Sign In
    const handleGoogleSignIn = async () => {
        setErrorMsg('');
        setSuccessMsg('');
        setLoading(true);

        try {
            const fbUser = await FirebaseAuthService.loginWithGoogle();
            const session = Store.loginWithFirebaseUser(fbUser, 'firebase-google');
            await Store.restoreFromCloud();
            onLoginSuccess(session);
        } catch (err: any) {
            console.error('Google Sign-In Error:', err);
            setErrorMsg(FirebaseAuthService.getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    // 2. Email / Password Submit (Sign In or Register)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!emailOrUsername.trim()) {
            setErrorMsg('Please enter your email or username.');
            return;
        }

        if (mode === 'forgot-password') {
            setLoading(true);
            try {
                await FirebaseAuthService.resetPassword(emailOrUsername.trim());
                setSuccessMsg('Password reset email sent! Please check your inbox.');
            } catch (err: any) {
                setErrorMsg(FirebaseAuthService.getErrorMessage(err));
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!password) {
            setErrorMsg('Please enter your password.');
            return;
        }

        setLoading(true);

        if (mode === 'register') {
            try {
                const fbUser = await FirebaseAuthService.registerWithEmail(
                    emailOrUsername.trim(),
                    password,
                    displayName.trim() || undefined,
                    profilePic
                );
                const session = Store.loginWithFirebaseUser(fbUser, 'firebase-email');
                await Store.restoreFromCloud();
                onLoginSuccess(session);
            } catch (err: any) {
                console.error('Registration Error:', err);
                setErrorMsg(FirebaseAuthService.getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        } else {
            // mode === 'login'
            try {
                const fbUser = await FirebaseAuthService.loginWithEmail(emailOrUsername.trim(), password);
                const session = Store.loginWithFirebaseUser(fbUser, 'firebase-email');
                await Store.restoreFromCloud();
                onLoginSuccess(session);
            } catch (err: any) {
                console.error('Sign-In Error:', err);
                setErrorMsg(FirebaseAuthService.getErrorMessage(err));
            } finally {
                setLoading(false);
            }
        }
    };

    // 4. Security Questions setup handler
    const handleSecuritySave = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!a1.trim() || !a2.trim()) {
            setErrorMsg('Please answer both security questions.');
            return;
        }

        const saved = Store.setSecurityQuestions([
            { question: q1, answer: a1.trim().toLowerCase() },
            { question: q2, answer: a2.trim().toLowerCase() }
        ]);

        if (saved) {
            const updated = Store.getUser();
            if (updated) {
                onLoginSuccess({ ...updated });
            }
        } else {
            setErrorMsg('Could not save. Please log in again and retry.');
        }
    };

    // 5. Skip security setup
    const handleSkipSecurity = () => {
        Store.setSecurityQuestions([
            { question: 'Default Verification', answer: 'verified' }
        ]);
        const updated = Store.getUser();
        if (updated) {
            onLoginSuccess({ ...updated });
        }
    };

    // View: Security Question Setup
    if (isSecuritySetupNeeded) {
        return (
            <div className="auth-overlay">
                <div className="auth-card fade-in">
                    <div className="auth-header">
                        <div className="auth-icon-container" style={{ background: 'var(--primary-color)' }}>
                            <ShieldAlert size={28} color="#FFFFFF" />
                        </div>
                        <h2 className="auth-title">Secure Your Account</h2>
                        <p className="auth-subtitle">Configure security questions to protect your store profile.</p>
                    </div>

                    {errorMsg && (
                        <div className="auth-alert-box error">
                            <AlertCircle size={16} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSecuritySave} className="auth-form" style={{ marginBottom: '16px' }}>
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

                        <button type="submit" className="btn btn-primary auth-submit-btn" style={{ marginBottom: '12px' }}>
                            Save & Continue
                            <Check size={18} style={{ marginLeft: '8px' }} />
                        </button>

                        <button
                            type="button"
                            onClick={handleSkipSecurity}
                            className="btn btn-outline"
                            style={{ width: '100%', height: '44px', fontSize: '13px', border: '1px solid var(--border-color)' }}
                        >
                            Skip for Now
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // View: Main Login / Register / Password Reset
    return (
        <div className="auth-overlay" style={{
            background: 'rgba(15, 23, 42, 0.92)',
            backdropFilter: 'blur(12px)'
        }}>
            <div className="auth-card fade-in" style={{ maxWidth: '420px', width: '92vw', borderRadius: '20px', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
                <div className="auth-header" style={{ marginBottom: '20px' }}>
                    <div
                        style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '14px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 12px auto',
                            background: '#FFFFFF',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                            border: '1px solid #E2E8F0'
                        }}
                    >
                        <img
                            src="/logo.png"
                            alt="Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                        />
                    </div>
                    <h2 className="auth-title" style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>Royalvazier</h2>
                    <p className="auth-subtitle" style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                        {mode === 'login' && 'Sign in to manage your business'}
                        {mode === 'register' && 'Create your administrator account'}
                        {mode === 'forgot-password' && 'Enter your email to reset your password'}
                    </p>
                </div>

                {errorMsg && (
                    <div className="auth-alert-box error">
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="auth-alert-box success">
                        <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* Google Sign In Button (Shown on login and register) */}
                {mode !== 'forgot-password' && (
                    <>
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="auth-google-btn"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                />
                            </svg>
                            <span>{mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
                        </button>

                        <div className="auth-divider">
                            <div className="auth-divider-line" />
                            <span className="auth-divider-text">or with email</span>
                            <div className="auth-divider-line" />
                        </div>
                    </>
                )}

                {/* Email / Password Form */}
                <form onSubmit={handleSubmit} className="auth-form" style={{ gap: '14px', marginBottom: '16px' }}>
                    {mode === 'register' && (
                        <div className="auth-input-wrapper">
                            <User className="auth-input-icon" size={18} />
                            <input
                                type="text"
                                placeholder="Full Name / Display Name"
                                className="search-input auth-input"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="auth-input-wrapper">
                        <Mail className="auth-input-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Email Address or Username"
                            className="search-input auth-input"
                            value={emailOrUsername}
                            onChange={e => setEmailOrUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
                    </div>

                    {mode !== 'forgot-password' && (
                        <div className="auth-input-wrapper">
                            <Lock className="auth-input-icon" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                className="search-input auth-input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                style={{ paddingRight: '44px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '4px'
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    )}

                    {mode === 'register' && (
                        <div style={{ textAlign: 'left' }}>
                            <label className="label" style={{ marginLeft: '4px', fontSize: '12px' }}>
                                Optional Profile Avatar
                            </label>
                            <label htmlFor="auth-pic-input" className="auth-file-label" style={{ cursor: 'pointer' }}>
                                <Camera size={18} style={{ color: 'var(--primary-color)' }} />
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
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

                    {mode === 'login' && (
                        <div style={{ textAlign: 'right', marginTop: '-4px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('forgot-password');
                                    setErrorMsg('');
                                    setSuccessMsg('');
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '12px',
                                    color: 'var(--primary-color)',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary auth-submit-btn"
                        disabled={loading}
                        style={{ height: '48px', marginBottom: '0' }}
                    >
                        {loading
                            ? 'Authenticating...'
                            : mode === 'login'
                            ? 'Sign In with Email'
                            : mode === 'register'
                            ? 'Create Account'
                            : 'Send Reset Link'}
                        <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                    </button>
                </form>

                {/* Mode Toggles */}
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    {mode === 'login' && (
                        <button
                            type="button"
                            onClick={() => {
                                setMode('register');
                                setErrorMsg('');
                                setSuccessMsg('');
                            }}
                            className="auth-toggle-link"
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            Don't have an account? <span style={{ textDecoration: 'underline' }}>Create one</span>
                        </button>
                    )}

                    {mode === 'register' && (
                        <button
                            type="button"
                            onClick={() => {
                                setMode('login');
                                setErrorMsg('');
                                setSuccessMsg('');
                            }}
                            className="auth-toggle-link"
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            Already registered? <span style={{ textDecoration: 'underline' }}>Sign in here</span>
                        </button>
                    )}

                    {mode === 'forgot-password' && (
                        <button
                            type="button"
                            onClick={() => {
                                setMode('login');
                                setErrorMsg('');
                                setSuccessMsg('');
                            }}
                            className="auth-toggle-link"
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            Back to <span style={{ textDecoration: 'underline' }}>Sign In</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
