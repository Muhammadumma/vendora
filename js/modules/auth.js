import { auth } from '../core/firebase-init.js';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export default {
    init(store) {
        this.store = store;
        this.overlay = document.getElementById('login-overlay');

        // Listen for Firebase Auth State Changes
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('Firebase User Detected:', user.displayName);
                this.showLoading('Syncing data...');
                // Sync Firebase User with Local Store
                this.store.login(user.displayName, 'firebase-session', user.photoURL);
                await this.store.syncWithFirestore();
                this.hideLoading();
                this.checkAuth();
            } else {
                console.log('No Firebase User.');
            }
        });

        // Initial sync if user already in store
        if (this.store.getUser()) {
            this.store.syncWithFirestore();
        }
        this.checkAuth();
    },

    checkAuth() {
        const activeUser = this.store.getUser();
        if (!activeUser) {
            this.showLogin();
        } else if (!activeUser.securityQuestions) {
            this.showSecuritySetup();
        } else {
            this.hideLogin();
        }
    },

    showLogin() {
        this.overlay.classList.remove('hidden');
        this.mode = 'login';
        this.renderAuth();
    },

    showSecuritySetup() {
        this.overlay.classList.remove('hidden');
        this.overlay.innerHTML = `
            <div class="auth-card fade-in">
                <div class="auth-header">
                    <div class="auth-icon-container">
                        <i data-lucide="shield-alert"></i>
                    </div>
                    <h2 class="auth-title">Secure Your Account</h2>
                    <p class="auth-subtitle">Please set up security questions to protect your profile.</p>
                </div>
                
                <div class="auth-form">
                    <div style="margin-bottom: 16px;">
                        <label class="label">Primary Security Question</label>
                        <select id="sec-q1" class="search-input" style="width: 100%; margin-bottom: 8px;">
                            <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                            <option value="What city were you born in?">What city were you born in?</option>
                            <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                        </select>
                        <input type="text" id="sec-a1" placeholder="Your Answer" class="search-input" style="width: 100%;">
                    </div>
                    
                    <div style="margin-bottom: 24px;">
                        <label class="label">Backup Security Question</label>
                        <select id="sec-q2" class="search-input" style="width: 100%; margin-bottom: 8px;">
                            <option value="What was your first car?">What was your first car?</option>
                            <option value="What was the name of your elementary school?">What was the name of your elementary school?</option>
                            <option value="What is your favorite book?">What is your favorite book?</option>
                        </select>
                        <input type="text" id="sec-a2" placeholder="Your Answer" class="search-input" style="width: 100%;">
                    </div>
                </div>
                
                <button id="save-security" class="btn btn-primary auth-submit-btn">
                    Complete Setup
                    <i data-lucide="check" style="width: 18px; height: 18px; margin-left: 8px;"></i>
                </button>
            </div>
        `;
        lucide.createIcons();
        document.getElementById('save-security').addEventListener('click', () => {
            const q1 = document.getElementById('sec-q1').value;
            const a1 = document.getElementById('sec-a1').value.trim().toLowerCase();
            const q2 = document.getElementById('sec-q2').value;
            const a2 = document.getElementById('sec-a2').value.trim().toLowerCase();

            if (a1 && a2) {
                this.store.setSecurityQuestions([
                    { question: q1, answer: a1 },
                    { question: q2, answer: a2 }
                ]);
                this.hideLogin();
                window.location.reload();
            } else {
                alert('Please answer both security questions.');
            }
        });
    },

    renderAuth() {
        const isLogin = this.mode === 'login';
        this.overlay.className = 'auth-overlay';
        this.overlay.innerHTML = `
            <div class="auth-card fade-in">
                <div class="auth-header">
                    <div class="auth-icon-container">
                        <i data-lucide="shield-check"></i>
                    </div>
                    <h2 class="auth-title">Vendora</h2>
                    <p class="auth-subtitle">${isLogin ? 'Welcome back, please enter your details' : 'Begin your professional journey today'}</p>
                </div>
                
                <div class="auth-form">
                    <div class="auth-input-wrapper">
                        <i data-lucide="user" class="auth-input-icon"></i>
                        <input type="text" id="auth-username" placeholder="Username" class="search-input auth-input">
                    </div>

                    ${!isLogin ? `
                        <div style="text-align: left;">
                            <label class="label" style="margin-left: 4px;">Profile Identity</label>
                            <label for="auth-pic" class="auth-file-label">
                                <i data-lucide="camera" style="width: 20px; height: 20px; color: var(--primary-color);"></i>
                                <span style="font-size: 14px; color: var(--text-secondary);">Upload Avatar</span>
                                <input type="file" id="auth-pic" accept="image/*" style="display: none;">
                            </label>
                        </div>
                    ` : ''}

                    <div class="auth-input-wrapper">
                        <i data-lucide="lock" class="auth-input-icon"></i>
                        <input type="password" id="auth-password" placeholder="Password" class="search-input auth-input">
                    </div>
                </div>
                
                <button id="auth-submit" class="btn btn-primary auth-submit-btn">
                    ${isLogin ? 'Sign In' : 'Create Account'}
                    <i data-lucide="arrow-right" style="width: 18px; height: 18px; margin-left: 8px;"></i>
                </button>

                <div style="text-align: center; margin-top: 16px;">
                    <a href="#" id="toggle-auth" class="auth-toggle-link">
                        ${isLogin ? "New here? <span style='color: var(--text-main)'>Create an account</span>" : "Already a member? <span style='color: var(--text-main)'>Login here</span>"}
                    </a>
                </div>

                <div style="margin: 24px 0 16px; display: flex; align-items: center; gap: 8px;">
                    <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
                    <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Or secondary method</span>
                    <div style="flex: 1; height: 1px; background: var(--border-subtle);"></div>
                </div>

                <button id="google-auth" class="btn btn-outline auth-submit-btn" style="border-color: var(--border-color); font-size: 13px; height: 44px;">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" style="width: 16px; margin-right: 8px;">
                    Continue with Google
                </button>
            </div>
        `;

        lucide.createIcons();
        this.attachAuthEvents();
    },

    attachAuthEvents() {
        const submitBtn = document.getElementById('auth-submit');
        const googleBtn = document.getElementById('google-auth');
        const toggleBtn = document.getElementById('toggle-auth');

        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.mode = this.mode === 'login' ? 'register' : 'login';
            this.renderAuth();
        });

        googleBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                this.showLoading('Connecting to Google...');
                // signInWithPopup will trigger onAuthStateChanged
                await signInWithPopup(auth, provider);
            } catch (error) {
                this.hideLoading();
                console.error("Google Auth Error:", error);
                alert("Failed to sign in with Google: " + error.message);
            }
        });

        submitBtn.addEventListener('click', async () => {
            const usernameInput = document.getElementById('auth-username').value;
            const passInput = document.getElementById('auth-password').value;
            let profilePic = null;

            if (this.mode === 'register') {
                const picInput = document.getElementById('auth-pic');
                if (picInput.files[0]) {
                    this.showLoading('Processing Avatar...');
                    profilePic = await this.toBase64(picInput.files[0]);
                }
            }

            if (usernameInput && passInput) {
                this.showLoading(this.mode === 'login' ? 'Signing in...' : 'Creating account...');
                if (this.store.login(usernameInput, passInput, profilePic)) {
                    await this.store.syncWithFirestore();
                    this.hideLoading();
                    this.checkAuth();
                } else {
                    this.hideLoading();
                    alert('Invalid credentials.');
                }
            } else {
                alert('Please provide both username and password.');
            }
        });
    },

    toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    async logout() {
        try {
            await signOut(auth);
            this.store.logout();
        } catch (error) {
            console.error('Logout error:', error);
            this.store.logout(); // Fallback to local logout
        }
    },

    hideLogin() {
        this.overlay.classList.add('hidden');
        this.overlay.innerHTML = '';
        this.overlay.style = ''; // Reset inline styles
    },

    showLoading(text = 'Loading...') {
        let loader = this.overlay.querySelector('.loader-overlay');
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'loader-overlay fade-in';
            this.overlay.appendChild(loader);
        }
        loader.innerHTML = `
            <div class="spinner"></div>
            <div class="loader-text">${text}</div>
        `;
    },

    hideLoading() {
        const loader = this.overlay.querySelector('.loader-overlay');
        if (loader) loader.remove();
    }
}
