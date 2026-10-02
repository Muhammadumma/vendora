export default {
    render(store) {
        const settings = store.getSettings();
        const sessionUser = store.getUser();
        const container = document.createElement('div');
        container.className = 'fade-in';

        container.innerHTML = `
            <h2 class="page-title" style="margin-bottom: 24px;">Settings & Profile</h2>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px;">
                <!-- General Settings -->
                <div class="card">
                    <h3 style="margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="settings" style="width: 20px; color: var(--primary-color);"></i>
                        General Configuration
                    </h3>
                    <div style="margin-bottom: 16px;">
                        <label class="label">Business Name</label>
                        <input type="text" id="set-name" class="search-input" value="${settings.businessName}" style="width: 100%;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label class="label">Business Address</label>
                        <input type="text" id="set-address" class="search-input" value="${settings.businessAddress}" style="width: 100%;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label class="label">Business Phone</label>
                        <input type="text" id="set-phone" class="search-input" value="${settings.businessPhone}" style="width: 100%;">
                    </div>

                    <div style="margin-bottom: 16px;">
                        <label class="label">Receipt Footer Note</label>
                        <textarea id="set-footer" class="search-input" style="width: 100%; height: 60px;">${settings.receiptFooter}</textarea>
                    </div>

                    <div style="margin-bottom: 16px; display: flex; align-items: center; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
                            <input type="checkbox" id="set-vat-enabled" ${settings.vatEnabled ? 'checked' : ''}>
                            Enable VAT
                        </label>
                        <div style="flex: 1;">
                            <label class="label" style="font-size: 12px;">VAT Rate (%)</label>
                            <input type="number" id="set-vat-rate" class="search-input" value="${settings.vatRate}" style="width: 100%;">
                        </div>
                    </div>

                    <div style="margin-bottom: 24px;">
                        <label class="label">Theme</label>
                        <select id="set-theme" class="search-input" style="width: 100%;">
                            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Standard Light</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Professional Dark Green</option>
                        </select>
                    </div>

                    <button class="btn btn-primary" id="save-settings" style="width: 100%;">Save Preferences</button>
                </div>

                <!-- Security Section -->
                <div class="card">
                    <h3 style="margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="shield-lock" style="width: 20px; color: var(--warning-color);"></i>
                        Security & Security Questions
                    </h3>
                    <div id="password-section">
                        <button class="btn btn-outline" id="change-pw-trigger" style="width: 100%; border-color: var(--warning-color); color: var(--warning-color);">
                            Change Password
                        </button>
                    </div>
                    
                    <div id="verify-section" class="hidden" style="margin-top: 16px;">
                        <p style="font-size: 13px; margin-bottom: 12px; color: var(--text-secondary);">Verify your identity to proceed:</p>
                        <div id="security-questions-list"></div>
                        <button class="btn btn-primary" id="verify-security" style="width: 100%; margin-top: 12px;">Verify Identity</button>
                    </div>

                    <div id="new-password-section" class="hidden" style="margin-top: 16px;">
                        <label class="label">New Password</label>
                        <input type="password" id="new-pw" class="search-input" style="width: 100%; margin-bottom: 12px;">
                        <button class="btn btn-success" id="save-new-pw" style="width: 100%;">Update Password</button>
                    </div>
                </div>

                <!-- System & Credits Section -->
                <div class="card" style="grid-column: 1 / -1; border-top: 4px solid var(--primary-color);">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px;">
                        <div>
                            <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                                <i data-lucide="info" style="width: 20px; color: var(--primary-color);"></i>
                                About Vendora
                            </h3>
                            <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 20px;">
                                Vendora is a next-generation shop management ecosystem built for speed, security, and simplicity. 
                                As a premier product of <strong>Kowa Guru Technology Ltd</strong>, we are committed to providing the best-in-class tools for business growth and financial transparency.
                            </p>
                            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                <a href="https://kowaguru.com" target="_blank" class="btn btn-outline" style="flex: 1; font-size: 13px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <i data-lucide="globe" style="width: 16px;"></i> Website
                                </a>
                                <button class="btn btn-outline" id="submit-feedback-trigger" style="flex: 1; font-size: 13px;">
                                    <i data-lucide="message-square" style="width: 16px;"></i> Feedback
                                </button>
                                <button class="btn btn-outline" id="backup-btn" style="flex: 1; font-size: 13px; border-color: var(--primary-color); color: var(--primary-color);">
                                    <i data-lucide="download" style="width: 16px;"></i> Backup
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                                <i data-lucide="award" style="width: 20px; color: var(--primary-color);"></i>
                                Technical Credentials
                            </h3>
                            <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px;">
                                <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--primary-color); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 20px;">
                                    MA
                                </div>
                                <div>
                                    <h4 style="margin: 0; font-size: 16px; color: var(--text-main);">Auwal Abubakar (Albani)</h4>
                                    <p style="margin: 4px 0 0; font-size: 13px; color: var(--text-muted);">Lead Systems Architect</p>
                                </div>
                            </div>
                            <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
                                Engineered with excellence as a premier shop management solution. 
                                Built under the strategic direction of <strong>CEO Aliyu Yahaya</strong> and technical collaboration with <strong>Adam Mukhtar</strong>.
                            </p>
                            <div style="margin-top: 16px; padding: 12px; border-radius: 8px; background: var(--bg-body); font-size: 11px; color: var(--text-muted);">
                                Certified Deployment — SIWES Final Project, Jigawa Poly.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Hidden Feedback Section -->
                <div id="feedback-section" class="card hidden" style="grid-column: 1 / -1; background: var(--bg-body);">
                    <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="message-square" style="width: 20px; color: var(--success-color);"></i>
                        Send Feedback
                    </h3>
                    <textarea id="feedback-text" class="search-input" placeholder="How can we improve Vendora?" style="width: 100%; min-height: 100px; margin-bottom: 12px; resize: vertical;"></textarea>
                    <div style="display: flex; justify-content: flex-end; gap: 12px;">
                        <button class="btn btn-outline" id="cancel-feedback">Cancel</button>
                        <button class="btn btn-success" id="submit-feedback">Submit Feedback</button>
                    </div>
                    <p id="feedback-msg" style="font-size: 12px; margin-top: 8px; color: var(--success-color);" class="hidden">Thank you! Your feedback is noted.</p>
                </div>
            </div>
        `;

        lucide.createIcons();

        // Logic
        setTimeout(() => {
            // General Settings
            container.querySelector('#save-settings').addEventListener('click', () => {
                const newTheme = container.querySelector('#set-theme').value;
                store.updateSettings({
                    businessName: container.querySelector('#set-name').value,
                    businessAddress: container.querySelector('#set-address').value,
                    businessPhone: container.querySelector('#set-phone').value,
                    receiptFooter: container.querySelector('#set-footer').value,
                    vatEnabled: container.querySelector('#set-vat-enabled').checked,
                    vatRate: Number(container.querySelector('#set-vat-rate').value),
                    theme: newTheme
                });

                if (window.app && typeof window.app.applyTheme === 'function') {
                    window.app.applyTheme();
                }
                alert('Settings Saved! ⚙️');
            });

            // Feedback Toggle
            const fbTrigger = container.querySelector('#submit-feedback-trigger');
            const fbSection = container.querySelector('#feedback-section');
            const fbCancel = container.querySelector('#cancel-feedback');

            // Backup Download
            const backupBtn = container.querySelector('#backup-btn');
            if (backupBtn) {
                backupBtn.addEventListener('click', () => {
                    store.downloadBackup();
                });
            }

            fbTrigger.addEventListener('click', () => {
                fbSection.classList.toggle('hidden');
                fbSection.scrollIntoView({ behavior: 'smooth' });
            });

            fbCancel.addEventListener('click', () => {
                fbSection.classList.add('hidden');
            });

            // Feedback Submission
            container.querySelector('#submit-feedback').addEventListener('click', async () => {
                const text = container.querySelector('#feedback-text').value;
                if (text.trim()) {
                    // Save to Firestore
                    await FirestoreService.save('feedback', 'FB-' + Date.now(), {
                        message: text,
                        user: sessionUser.name,
                        date: new Date().toISOString()
                    });

                    container.querySelector('#feedback-text').value = '';
                    const msg = container.querySelector('#feedback-msg');
                    msg.classList.remove('hidden');
                    setTimeout(() => {
                        msg.classList.add('hidden');
                        fbSection.classList.add('hidden');
                    }, 2000);
                }
            });

            // Security Flow
            const trigger = container.querySelector('#change-pw-trigger');
            const verifySection = container.querySelector('#verify-section');
            const questionsList = container.querySelector('#security-questions-list');
            const verifyBtn = container.querySelector('#verify-security');
            const newPwSection = container.querySelector('#new-password-section');

            trigger.addEventListener('click', () => {
                if (!sessionUser.securityQuestions) {
                    alert('Please log out and log in again to set up security questions first.');
                    return;
                }
                trigger.classList.add('hidden');
                verifySection.classList.remove('hidden');

                questionsList.innerHTML = sessionUser.securityQuestions.map((q, i) => `
                    <div style="margin-bottom: 12px;">
                        <label class="label" style="font-size: 12px;">${q.question}</label>
                        <input type="text" class="search-input security-answer" data-index="${i}" placeholder="Your Answer" style="width: 100%;">
                    </div>
                `).join('');
            });

            verifyBtn.addEventListener('click', () => {
                const answers = Array.from(container.querySelectorAll('.security-answer'));
                const allCorrect = answers.every(input => {
                    const idx = input.dataset.index;
                    return input.value.trim().toLowerCase() === sessionUser.securityQuestions[idx].answer;
                });

                if (allCorrect) {
                    verifySection.classList.add('hidden');
                    newPwSection.classList.remove('hidden');
                } else {
                    alert('Incorrect security answers. Please try again.');
                }
            });

            container.querySelector('#save-new-pw').addEventListener('click', () => {
                const newPw = container.querySelector('#new-pw').value;
                if (newPw.length >= 4) {
                    store.updatePassword(newPw);
                    alert('Password updated successfully!');
                    newPwSection.classList.add('hidden');
                    trigger.classList.remove('hidden');
                } else {
                    alert('Password too short.');
                }
            });

        }, 0);

        return container;
    }
}
