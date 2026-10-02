import FirestoreService from './firestore-service.js';

export const Store = {
    // Initial State
    state: {
        activeSession: JSON.parse(localStorage.getItem('bc_user')) || null,
        products: JSON.parse(localStorage.getItem('bc_products')) || [],
        sales: JSON.parse(localStorage.getItem('bc_sales')) || [],
        purchases: JSON.parse(localStorage.getItem('bc_purchases')) || [],
        debts: JSON.parse(localStorage.getItem('bc_debts')) || [],
        settings: JSON.parse(localStorage.getItem('bc_settings')) || {
            vatEnabled: true,
            vatRate: 15,
            businessName: 'Vendora Marketing',
            businessAddress: '123 Business Street, Lagos',
            businessPhone: '+234 800 000 0000',
            receiptFooter: 'Thank you for your patronage! Goods bought in good condition are not returnable.',
            theme: localStorage.getItem('bc_theme') || 'light'
        },
        isSyncing: false
    },

    // Getters
    getUser() { return this.state.activeSession; },
    getProducts() { return this.state.products; },
    getSales() { return this.state.sales; },
    getPurchases() { return this.state.purchases; },
    getDebts() { return this.state.debts; },
    getSettings() { return this.state.settings; },

    // Financial Helpers
    getTotalStockValue() {
        return this.state.products.reduce((sum, p) => sum + (p.qty * p.buyPrice), 0);
    },
    getActiveDebtTotal() {
        return this.state.debts
            .filter(d => d.status !== 'Paid' && d.status !== 'Settled')
            .reduce((sum, d) => sum + d.amount, 0);
    },

    // P/L Logic Refinement
    calculateSalePL(sale) {
        return sale.items.reduce((acc, item) => {
            const cost = (item.buyPrice || 0) * item.qty;
            const revenue = item.price * item.qty;
            return acc + (revenue - cost);
        }, 0);
    },

    // Firestore Integration
    async syncWithFirestore() {
        if (!this.state.activeSession) return;
        if (this.state.isSyncing) return;

        this.state.isSyncing = true;
        console.log('Syncing with Firestore...');

        return new Promise((resolve) => {
            let itemsSynced = 0;
            const totalToSync = 3; // products, sales, debts

            const checkDone = () => {
                itemsSynced++;
                if (itemsSynced >= totalToSync) {
                    this.state.isSyncing = false;
                    resolve(true);
                }
            };

            // Subscribe to changes (Real-time patching)
            FirestoreService.subscribe('products', (data) => {
                if (data.length >= 0) { // Allow empty arrays
                    this.state.products = data;
                    localStorage.setItem('bc_products', JSON.stringify(data));
                    window.dispatchEvent(new CustomEvent('store-updated', { detail: { key: 'products' } }));
                    if (this.state.isSyncing && itemsSynced < 1) checkDone();
                }
            });

            FirestoreService.subscribe('sales', (data) => {
                if (data.length >= 0) {
                    this.state.sales = data;
                    localStorage.setItem('bc_sales', JSON.stringify(data));
                    window.dispatchEvent(new CustomEvent('store-updated', { detail: { key: 'sales' } }));
                    if (this.state.isSyncing && itemsSynced < 2) checkDone();
                }
            });

            FirestoreService.subscribe('debts', (data) => {
                if (data.length >= 0) {
                    this.state.debts = data;
                    localStorage.setItem('bc_debts', JSON.stringify(data));
                    window.dispatchEvent(new CustomEvent('store-updated', { detail: { key: 'debts' } }));
                    if (this.state.isSyncing && itemsSynced < 3) checkDone();
                }
            });

            // Fallback timeout in case of no collection/data
            setTimeout(() => {
                if (this.state.isSyncing) {
                    this.state.isSyncing = false;
                    resolve(true);
                }
            }, 3000);

            // Trigger one-time migration if needed
            this.migrateToCloud();
        });
    },

    async migrateToCloud() {
        const isMigrated = localStorage.getItem('bc_migrated') === 'true';
        if (isMigrated) return;

        console.log('Performing first-time cloud migration...');

        try {
            for (const p of this.state.products) await FirestoreService.save('products', p.id, p);
            for (const s of this.state.sales) await FirestoreService.save('sales', s.id, s);
            for (const d of this.state.debts) await FirestoreService.save('debts', d.id, d);

            localStorage.setItem('bc_migrated', 'true');
            console.log('Migration complete.');
        } catch (e) {
            console.warn('Cloud migration delayed (waiting for auth/connection).');
        }
    },

    // Actions
    login(username, password, profilePic = null) {
        if (username && password) {
            const existingUser = this.state.activeSession;
            const newUser = {
                name: username,
                password: password,
                role: 'Admin',
                isLoggedIn: true,
                isPro: false,
                profilePic: profilePic || (existingUser && existingUser.name === username ? existingUser.profilePic : null),
                securityQuestions: (existingUser && existingUser.name === username) ? existingUser.securityQuestions : null
            };

            if (password === 'firebase-session' && existingUser && existingUser.name === username && existingUser.password !== 'firebase-session') {
                newUser.password = existingUser.password;
            }

            this.state.activeSession = newUser;
            this._save('bc_user', newUser);

            // Start sync
            this.syncWithFirestore();

            return true;
        }
        return false;
    },

    setSecurityQuestions(questions) {
        if (this.state.activeSession) {
            this.state.activeSession.securityQuestions = questions;
            this._save('bc_user', this.state.activeSession);
            return true;
        }
        return false;
    },

    updatePassword(newPassword) {
        if (this.state.activeSession) {
            this.state.activeSession.password = newPassword;
            this._save('bc_user', this.state.activeSession);
            return true;
        }
        return false;
    },

    logout() {
        this.state.activeSession = null;
        localStorage.removeItem('bc_user');
        localStorage.removeItem('bc_migrated');
        window.location.reload();
    },

    addProduct(product) {
        product.id = product.id || Date.now().toString();
        product.createdAt = product.createdAt || new Date().toISOString();

        const exists = this.state.products.find(p => p.id === product.id);
        if (!exists) {
            this.state.products.push(product);
        }

        this._save('bc_products', this.state.products, 'products', product.id, product);
    },

    updateProduct(id, updates) {
        const index = this.state.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.state.products[index] = { ...this.state.products[index], ...updates };
            this._save('bc_products', this.state.products, 'products', id, this.state.products[index]);
        }
    },

    deleteProduct(id) {
        this.state.products = this.state.products.filter(p => p.id !== id);
        this._save('bc_products', this.state.products);
        FirestoreService.delete('products', id);
    },

    addSale(sale) {
        sale.id = sale.id || 'SALE-' + Date.now();
        sale.date = sale.date || new Date().toISOString();

        sale.items.forEach(item => {
            const product = this.state.products.find(p => p.id === item.productId);
            if (product && !item.buyPrice) {
                item.buyPrice = product.buyPrice;
            }
        });

        // Perfect P/L Calculation for this sale
        sale.profit = this.calculateSalePL(sale);

        if (sale.paymentMethod === 'Debt') {
            const stockValue = this.getTotalStockValue();
            const currentDebt = this.getActiveDebtTotal();
            if ((currentDebt + sale.total) > (stockValue * 0.3)) {
                throw new Error(`Debt Limit Exceeded! active debt cannot exceed 30% of stock value.`);
            }

            this.addDebt({
                debtor: sale.customerName || 'Unknown Customer',
                phone: sale.customerPhone || '',
                product: `Sale #${sale.id.split('-')[1]} (${sale.items.length} items)`,
                amount: sale.total,
                dueDate: sale.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                items: sale.items,
                sourceSaleId: sale.id
            }, true);
        }

        this.state.sales.push(sale);
        this._save('bc_sales', this.state.sales, 'sales', sale.id, sale);

        // Deduct Stock
        sale.items.forEach(item => {
            const product = this.state.products.find(p => p.id === item.productId);
            if (product) {
                product.qty -= item.qty;
                this.updateProduct(product.id, { qty: product.qty });
            }
        });
    },

    addPurchase(purchase) {
        purchase.id = 'PUR-' + Date.now();
        purchase.date = new Date().toISOString();
        this.state.purchases.push(purchase);
        this._save('bc_purchases', this.state.purchases);

        const product = this.state.products.find(p => p.id === purchase.productId);
        if (product) {
            product.qty = Number(product.qty) + Number(purchase.qty);
            product.buyPrice = purchase.buyPrice;
            this.updateProduct(product.id, { qty: product.qty, buyPrice: product.buyPrice });
        }
    },

    addDebt(debt, force = false) {
        if (!force) {
            const stockValue = this.getTotalStockValue();
            const currentDebt = this.getActiveDebtTotal();
            if ((currentDebt + debt.amount) > (stockValue * 0.3)) {
                alert(`Cannot add debt. Limit reached.`);
                return false;
            }
        }

        debt.id = debt.id || 'DEBT-' + Date.now();
        debt.createdAt = debt.createdAt || new Date().toISOString();
        debt.isPermanent = true;
        if (!debt.status) debt.status = 'Pending';

        this.state.debts.push(debt);
        this._save('bc_debts', this.state.debts, 'debts', debt.id, debt);
        return true;
    },

    updateDebt(id, updates) {
        const index = this.state.debts.findIndex(d => d.id === id);
        if (index !== -1) {
            // Handle appending a new overdue reason to the array
            if (updates.newReason) {
                const existing = this.state.debts[index].overdueReasons || [];
                existing.push({ reason: updates.newReason, date: new Date().toISOString() });
                this.state.debts[index].overdueReasons = existing;
                delete updates.newReason;
            }
            this.state.debts[index] = { ...this.state.debts[index], ...updates };
            this._save('bc_debts', this.state.debts, 'debts', id, this.state.debts[index]);
        }
    },

    // Soft-delete: mark as settled and archive
    deleteDebt(id) {
        this.settleDebt(id);
    },

    settleDebt(id) {
        const index = this.state.debts.findIndex(d => d.id === id);
        if (index !== -1) {
            const debt = this.state.debts[index];
            debt.status = 'Paid';
            debt.settledDate = new Date().toISOString();

            const settlementSale = {
                id: 'SETTLE-' + Date.now(),
                date: debt.settledDate,
                customerName: debt.debtor,
                customerPhone: debt.phone,
                paymentMethod: 'Debt Settlement',
                items: [{
                    name: `Debt Settlement: ${debt.product}`,
                    qty: 1,
                    price: debt.amount,
                    buyPrice: 0
                }],
                subtotal: debt.amount,
                vat: 0,
                total: debt.amount,
                isSettlement: true
            };

            this.addSale(settlementSale);
            this.updateDebt(id, { status: 'Paid', settledDate: debt.settledDate });
        }
    },

    updateSettings(newSettings) {
        this.state.settings = { ...this.state.settings, ...newSettings };
        if (newSettings.theme) {
            localStorage.setItem('bc_theme', newSettings.theme);
        }
        this._save('bc_settings', this.state.settings);
    },

    // Global Save with Firestore Support
    _save(localKey, data, firestoreColl = null, firestoreId = null, firestoreData = null) {
        localStorage.setItem(localKey, JSON.stringify(data));

        if (firestoreColl && firestoreId && firestoreData) {
            FirestoreService.save(firestoreColl, firestoreId, firestoreData);
        }
    },

    verifyPassword(inputPassword) {
        const storedUser = this.state.activeSession;
        if (!storedUser) return false;
        return storedUser.password === inputPassword;
    },

    logProductEdit(editRecord) {
        const log = JSON.parse(localStorage.getItem('bc_audit_log')) || [];
        const entry = {
            id: 'LOG-' + Date.now(),
            timestamp: new Date().toISOString(),
            user: this.state.activeSession ? this.state.activeSession.name : 'Unknown',
            ...editRecord
        };
        log.push(entry);
        localStorage.setItem('bc_audit_log', JSON.stringify(log));
    },

    getAuditLog() {
        return JSON.parse(localStorage.getItem('bc_audit_log')) || [];
    },

    downloadBackup() {
        const backup = {
            version: '2.4.1',
            exportedAt: new Date().toISOString(),
            user: this.state.activeSession?.name || 'Unknown',
            products: this.state.products,
            sales: this.state.sales,
            purchases: this.state.purchases,
            debts: this.state.debts,
            settings: this.state.settings,
            auditLog: this.getAuditLog()
        };
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Vendora_Backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }
};
