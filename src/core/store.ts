import { FirebaseSync, FirebaseAuthService } from './firebase';

export interface UserSession {
    uid?: string;
    email?: string;
    name: string;
    password?: string;
    role: string;
    isLoggedIn: boolean;
    isPro?: boolean;
    authProvider?: 'firebase-email' | 'firebase-google' | 'demo' | 'local';
    profilePic?: string | null;
    securityQuestions?: { question: string; answer: string }[] | null;
}

export interface Product {
    id: string;
    sku?: string;
    name: string;
    category: string;
    qty: number;
    buyPrice: number;
    sellPrice: number;
    supplier?: string;
    threshold?: number;
    warnings?: string[];
    createdAt?: string;
}

export interface SaleItem {
    productId?: string;
    name: string;
    qty: number;
    price: number;
    buyPrice?: number;
}

export interface Sale {
    id: string;
    date: string;
    customerName?: string;
    customerPhone?: string;
    paymentMethod: string;
    items: SaleItem[];
    subtotal?: number;
    vat?: number;
    total: number;
    profit?: number;
    dueDate?: string;
    isSettlement?: boolean;
}

export interface Purchase {
    id: string;
    productId: string;
    productName: string;
    qty: number;
    buyPrice: number;
    totalCost: number;
    supplier?: string;
    date: string;
}

export interface Debt {
    id: string;
    debtor: string;
    phone: string;
    product: string;
    amount: number;
    dueDate: string;
    status: 'Pending' | 'Overdue' | 'Paid' | 'Settled';
    createdAt: string;
    settledDate?: string;
    isPermanent?: boolean;
    items?: SaleItem[];
    sourceSaleId?: string;
    overdueReasons?: { reason: string; date: string }[];
}

export interface Settings {
    vatEnabled: boolean;
    vatRate: number;
    businessName: string;
    parentCompany?: string;
    rcNumber?: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail?: string;
    receiptFooter: string;
    theme: string;
    businessLogo?: string;
    socials?: {
        instagram?: string;
        facebook?: string;
        twitter?: string;
    };
}

const defaultRoyalvazierSettings: Settings = {
    vatEnabled: true,
    vatRate: 7.5,
    businessName: 'Royalvazier Textile',
    parentCompany: 'Royalvazier Global Services Ltd',
    rcNumber: 'RC9636293',
    businessAddress: 'No:15 Gidan Baba Dan Baffa Beside Jumma’at Mosque opp. Ganduje Building Kantin Kwari market Kano',
    businessPhone: '+2348137098824 / +2349060042040',
    businessEmail: 'info@royalvazier.com.ng',
    receiptFooter: 'Wholesale & Retail Fabrics Across Nigeria • Goods bought in good condition are not returnable',
    theme: localStorage.getItem('bc_theme') || 'light',
    businessLogo: '/royalvazier-logo.png',
    socials: {
        instagram: '@royalvazier_textile',
        facebook: 'Royalvazier Global Services Ltd',
        twitter: '@royalvaziertex'
    }
};

type Listener = () => void;

class StoreClass {
    private listeners: Set<Listener> = new Set();

    public state = {
        activeSession: (JSON.parse(localStorage.getItem('bc_user') || 'null')) as UserSession | null,
        products: (JSON.parse(localStorage.getItem('bc_products') || '[]')) as Product[],
        sales: (JSON.parse(localStorage.getItem('bc_sales') || '[]')) as Sale[],
        purchases: (JSON.parse(localStorage.getItem('bc_purchases') || '[]')) as Purchase[],
        debts: (JSON.parse(localStorage.getItem('bc_debts') || '[]')) as Debt[],
        settings: (() => {
            const saved = JSON.parse(localStorage.getItem('bc_settings') || 'null');
            if (!saved || saved.businessName === 'Vendora Marketing' || saved.businessName === 'VENDORA RETAIL') {
                localStorage.setItem('bc_settings', JSON.stringify(defaultRoyalvazierSettings));
                return defaultRoyalvazierSettings;
            }
            return { ...defaultRoyalvazierSettings, ...saved, businessLogo: saved.businessLogo || '/royalvazier-logo.png' };
        })() as Settings,
        isSyncing: false,
        lastSyncTimestamp: null as string | null,
        lastSyncError: null as string | null
    };

    private autoSyncTimer: any = null;

    queueAutoSync() {
        // Debounce sync and avoid looping if a sync is already running
        if (this.state.isSyncing) return;
        if (this.autoSyncTimer) clearTimeout(this.autoSyncTimer);
        this.autoSyncTimer = setTimeout(() => {
            if (!this.state.isSyncing) {
                this.syncWithFirestore().catch(err => console.warn('Auto cloud sync notice:', err));
            }
        }, 3000);
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(fn => fn());
    }

    // Getters
    getUser() { return this.state.activeSession; }
    getProducts() { return this.state.products; }
    getSales() { return this.state.sales; }
    getPurchases() { return this.state.purchases; }
    getDebts() { return this.state.debts; }
    getSettings() { return this.state.settings; }

    getTotalStockValue() {
        return this.state.products.reduce((sum, p) => sum + ((Number(p.qty) || 0) * (Number(p.buyPrice) || 0)), 0);
    }

    getTotalRetailValue() {
        return this.state.products.reduce((sum, p) => sum + ((Number(p.qty) || 0) * (Number(p.sellPrice) || 0)), 0);
    }

    getAverageMargin() {
        const costVal = this.getTotalStockValue();
        const retailVal = this.getTotalRetailValue();
        return retailVal > 0 ? (retailVal - costVal) / retailVal : 0;
    }

    getActiveDebtTotal() {
        return this.state.debts
            .filter(d => d.status !== 'Paid' && d.status !== 'Settled')
            .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    }

    calculateSalePL(sale: Sale) {
        return sale.items.reduce((acc, item) => {
            const cost = (Number(item.buyPrice) || 0) * (Number(item.qty) || 0);
            const revenue = (Number(item.price) || 0) * (Number(item.qty) || 0);
            return acc + (revenue - cost);
        }, 0);
    }

    // Auth
    login(username: string, password?: string, profilePic: string | null = null, extra?: Partial<UserSession>): boolean {
        if (!username) return false;
        const existing = this.state.activeSession;
        const user: UserSession = {
            uid: extra?.uid,
            name: username,
            email: extra?.email || (username.includes('@') ? username : undefined),
            password: password || '123456',
            role: extra?.role || 'Admin',
            isLoggedIn: true,
            isPro: true,
            authProvider: extra?.authProvider || 'local',
            profilePic: profilePic || extra?.profilePic || (existing && existing.name === username ? existing.profilePic : null),
            securityQuestions: (existing && existing.name === username) ? existing.securityQuestions : [
                { question: 'Account Security', answer: 'verified' }
            ]
        };
        this.state.activeSession = user;
        this._save('bc_user', user);
        this.notify();
        return true;
    }

    loginWithFirebaseUser(
        fbUser: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null },
        provider: 'firebase-email' | 'firebase-google' = 'firebase-email'
    ): UserSession {
        const name = fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Royal Admin');
        const user: UserSession = {
            uid: fbUser.uid,
            name: name,
            email: fbUser.email || undefined,
            role: 'Admin',
            isLoggedIn: true,
            isPro: true,
            authProvider: provider,
            profilePic: fbUser.photoURL || null,
            securityQuestions: [
                { question: 'Account Security', answer: 'firebase-verified' }
            ]
        };
        this.state.activeSession = user;
        this._save('bc_user', user);
        this.notify();
        return user;
    }

    setSecurityQuestions(questions: { question: string; answer: string }[]) {
        if (this.state.activeSession) {
            this.state.activeSession.securityQuestions = questions;
            this._save('bc_user', this.state.activeSession);
            this.notify();
            return true;
        }
        return false;
    }

    updatePassword(newPassword: string) {
        if (this.state.activeSession) {
            this.state.activeSession.password = newPassword;
            this._save('bc_user', this.state.activeSession);
            this.notify();
            return true;
        }
        return false;
    }

    verifyPassword(input: string) {
        if (!this.state.activeSession?.password) return true;
        return this.state.activeSession.password === input;
    }

    logout() {
        this.state.activeSession = null;
        localStorage.removeItem('bc_user');
        localStorage.removeItem('bc_migrated');
        FirebaseAuthService.logout().catch(e => console.warn(e));
        this.notify();
    }

    // Products
    addProduct(product: Partial<Product> & { name: string }) {
        const generatedId = product.id || (product.sku ? `prod-${product.sku}` : Date.now().toString());
        const newProd: Product = {
            id: generatedId,
            sku: product.sku ? String(product.sku).trim() : undefined,
            name: product.name,
            category: product.category || 'General',
            qty: Number.isFinite(Number(product.qty)) ? Number(product.qty) : 0,
            buyPrice: Number.isFinite(Number(product.buyPrice)) ? Number(product.buyPrice) : 0,
            sellPrice: Number.isFinite(Number(product.sellPrice)) ? Number(product.sellPrice) : 0,
            supplier: product.supplier || '',
            threshold: Number.isInteger(Number(product.threshold)) ? Number(product.threshold) : 5,
            warnings: Array.isArray(product.warnings) ? product.warnings : [],
            createdAt: product.createdAt || new Date().toISOString()
        };

        const existingIndex = this.state.products.findIndex(p => 
            p.id === newProd.id || (newProd.sku && p.sku && p.sku.toLowerCase() === newProd.sku.toLowerCase())
        );
        if (existingIndex !== -1) {
            this.state.products[existingIndex] = { ...this.state.products[existingIndex], ...newProd };
        } else {
            this.state.products.push(newProd);
        }

        this._save('bc_products', this.state.products);
        this.notify();
        FirebaseSync.syncProduct(newProd).catch(e => console.warn("Firestore product sync:", e));
        this.queueAutoSync();
        return newProd;
    }

    addProductsBatch(productsList: (Partial<Product> & { name: string })[]) {
        const added: Product[] = [];
        for (const item of productsList) {
            const addedItem = this.addProduct(item);
            added.push(addedItem);
        }
        FirebaseSync.syncProductsBatch(added).catch(e => console.warn("Firestore batch product sync:", e));
        this.queueAutoSync();
        return added;
    }

    updateProduct(id: string, updates: Partial<Product>) {
        const index = this.state.products.findIndex(p => p.id === id);
        if (index !== -1) {
            this.state.products[index] = { ...this.state.products[index], ...updates };
            this._save('bc_products', this.state.products);
            this.notify();
            FirebaseSync.syncProduct(this.state.products[index]).catch(e => console.warn("Firestore product update sync:", e));
            this.queueAutoSync();
        }
    }

    deleteProduct(id: string) {
        this.state.products = this.state.products.filter(p => p.id !== id);
        this._save('bc_products', this.state.products);
        this.notify();
        FirebaseSync.deleteProduct(id).catch(e => console.warn("Firestore product delete sync:", e));
        this.queueAutoSync();
    }

    // Sales
    addSale(saleData: Partial<Sale> & { items: SaleItem[]; total: number }) {
        const sale: Sale = {
            id: saleData.id || 'SALE-' + Date.now(),
            date: saleData.date || new Date().toISOString(),
            customerName: saleData.customerName || 'Walk-in Customer',
            customerPhone: saleData.customerPhone || '',
            paymentMethod: saleData.paymentMethod || 'Cash',
            items: saleData.items,
            subtotal: saleData.subtotal ?? saleData.total,
            vat: saleData.vat || 0,
            total: saleData.total,
            dueDate: saleData.dueDate,
            isSettlement: saleData.isSettlement
        };

        // Attach cost price if missing
        sale.items.forEach(item => {
            const prod = this.state.products.find(p => p.id === item.productId || p.name === item.name);
            if (prod && item.buyPrice === undefined) {
                item.buyPrice = prod.buyPrice;
            }
        });

        sale.profit = this.calculateSalePL(sale);

        if (sale.paymentMethod === 'Debt') {
            const stockValue = this.getTotalStockValue();
            const currentDebt = this.getActiveDebtTotal();
            if ((currentDebt + sale.total) > (stockValue * 0.3) && stockValue > 0) {
                throw new Error(`Debt Limit Exceeded! Active debt cannot exceed 30% of total inventory value.`);
            }

            this.addDebt({
                debtor: sale.customerName || 'Customer',
                phone: sale.customerPhone || '',
                product: `Sale #${sale.id.split('-')[1] || sale.id} (${sale.items.length} items)`,
                amount: sale.total,
                dueDate: sale.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                items: sale.items,
                sourceSaleId: sale.id
            }, true);
        }

        this.state.sales.push(sale);
        this._save('bc_sales', this.state.sales);

        // Deduct inventory stock
        if (!sale.isSettlement) {
            sale.items.forEach(item => {
                const prod = this.state.products.find(p => p.id === item.productId || p.name === item.name);
                if (prod) {
                    prod.qty = Math.max(0, (Number(prod.qty) || 0) - (Number(item.qty) || 0));
                    this.updateProduct(prod.id, { qty: prod.qty });
                }
            });
        }

        this.notify();
        FirebaseSync.syncSale(sale).catch(e => console.warn("Firestore sale sync:", e));
        this.queueAutoSync();
        return sale;
    }

    // Purchases
    addPurchase(purchaseData: { productId: string; productName: string; qty: number; buyPrice: number; totalCost: number; supplier?: string }) {
        const purchase: Purchase = {
            id: 'PUR-' + Date.now(),
            date: new Date().toISOString(),
            productId: purchaseData.productId,
            productName: purchaseData.productName,
            qty: Number(purchaseData.qty),
            buyPrice: Number(purchaseData.buyPrice),
            totalCost: Number(purchaseData.totalCost),
            supplier: purchaseData.supplier || 'Standard Supplier'
        };

        this.state.purchases.push(purchase);
        this._save('bc_purchases', this.state.purchases);

        // Increment product stock
        const prod = this.state.products.find(p => p.id === purchase.productId);
        if (prod) {
            prod.qty = (Number(prod.qty) || 0) + purchase.qty;
            prod.buyPrice = purchase.buyPrice;
            this.updateProduct(prod.id, { qty: prod.qty, buyPrice: prod.buyPrice });
        }

        this.notify();
        FirebaseSync.syncPurchase(purchase).catch(e => console.warn("Firestore purchase sync:", e));
        this.queueAutoSync();
        return purchase;
    }

    // Debts
    addDebt(debtData: Partial<Debt> & { debtor: string; amount: number }, force = false): boolean {
        if (!force) {
            const stockValue = this.getTotalStockValue();
            const currentDebt = this.getActiveDebtTotal();
            if ((currentDebt + debtData.amount) > (stockValue * 0.3) && stockValue > 0) {
                throw new Error(`Debt Limit Exceeded! Active debt cannot exceed 30% of total inventory value.`);
            }
        }

        const debt: Debt = {
            id: debtData.id || 'DEBT-' + Date.now(),
            debtor: debtData.debtor,
            phone: debtData.phone || '',
            product: debtData.product || 'Unspecified goods',
            amount: Number(debtData.amount),
            dueDate: debtData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            status: debtData.status || 'Pending',
            createdAt: debtData.createdAt || new Date().toISOString(),
            isPermanent: true,
            items: debtData.items,
            sourceSaleId: debtData.sourceSaleId,
            overdueReasons: debtData.overdueReasons || []
        };

        this.state.debts.push(debt);
        this._save('bc_debts', this.state.debts);
        this.notify();
        FirebaseSync.syncDebt(debt).catch(e => console.warn("Firestore debt sync:", e));
        this.queueAutoSync();
        return true;
    }

    updateDebt(id: string, updates: Partial<Debt> & { newReason?: string }) {
        const index = this.state.debts.findIndex(d => d.id === id);
        if (index !== -1) {
            if (updates.newReason) {
                const reasons = this.state.debts[index].overdueReasons || [];
                reasons.push({ reason: updates.newReason, date: new Date().toISOString() });
                this.state.debts[index].overdueReasons = reasons;
                delete updates.newReason;
            }
            this.state.debts[index] = { ...this.state.debts[index], ...updates };
            this._save('bc_debts', this.state.debts);
            this.notify();
            FirebaseSync.syncDebt(this.state.debts[index]).catch(e => console.warn("Firestore debt update sync:", e));
            this.queueAutoSync();
        }
    }

    settleDebt(id: string): Sale | null {
        const index = this.state.debts.findIndex(d => d.id === id);
        if (index !== -1) {
            const debt = this.state.debts[index];
            debt.status = 'Paid';
            debt.settledDate = new Date().toISOString();

            const settlementSale: Sale = {
                id: 'SETTLE-' + Date.now(),
                date: debt.settledDate,
                customerName: debt.debtor,
                customerPhone: debt.phone,
                paymentMethod: 'Debt Settlement',
                items: debt.items && debt.items.length > 0 ? debt.items : [{
                    name: `Debt Settlement: ${debt.product}`,
                    qty: 1,
                    price: debt.amount,
                    buyPrice: 0
                }],
                subtotal: debt.amount,
                vat: 0,
                total: debt.amount,
                profit: debt.amount,
                isSettlement: true
            };

            debt.sourceSaleId = settlementSale.id;
            this.state.sales.push(settlementSale);
            this._save('bc_sales', this.state.sales);
            this._save('bc_debts', this.state.debts);
            this.notify();
            FirebaseSync.syncDebt(debt).catch(e => console.warn("Firestore debt settle sync:", e));
            FirebaseSync.syncSale(settlementSale).catch(e => console.warn("Firestore settlement sale sync:", e));
            this.queueAutoSync();
            return settlementSale;
        }
        return null;
    }

    getDebtReceipt(debt: Debt): Sale {
        if (debt.sourceSaleId) {
            const found = this.state.sales.find(s => s.id === debt.sourceSaleId);
            if (found) return found;
        }
        return {
            id: debt.id,
            date: debt.settledDate || debt.createdAt,
            customerName: debt.debtor,
            customerPhone: debt.phone,
            paymentMethod: debt.status === 'Paid' ? 'Debt Settlement (Paid)' : 'Credit Sale (Pending)',
            items: debt.items && debt.items.length > 0 ? debt.items : [{
                name: debt.product || 'Items on Credit',
                qty: 1,
                price: debt.amount,
                buyPrice: 0
            }],
            subtotal: debt.amount,
            vat: 0,
            total: debt.amount,
            profit: 0
        };
    }

    deleteDebt(id: string) {
        this.settleDebt(id);
    }

    // Settings
    updateSettings(newSettings: Partial<Settings>) {
        this.state.settings = { ...this.state.settings, ...newSettings };
        if (newSettings.theme) {
            localStorage.setItem('bc_theme', newSettings.theme);
        }
        this._save('bc_settings', this.state.settings);
        this.notify();
        FirebaseSync.syncSettings(this.state.settings).catch(e => console.warn("Firestore settings sync:", e));
        this.queueAutoSync();
    }

    // Audit Log
    logProductEdit(record: any) {
        const log = JSON.parse(localStorage.getItem('bc_audit_log') || '[]');
        log.push({
            id: 'LOG-' + Date.now(),
            timestamp: new Date().toISOString(),
            user: this.state.activeSession ? this.state.activeSession.name : 'Unknown',
            ...record
        });
        localStorage.setItem('bc_audit_log', JSON.stringify(log));
    }

    getAuditLog() {
        return JSON.parse(localStorage.getItem('bc_audit_log') || '[]');
    }

    // Messages & Reminders
    recordMessage(msg: { text: string; recipient?: string; type?: string; [key: string]: any }) {
        const message = {
            id: 'MSG-' + Date.now(),
            ...msg,
            timestamp: new Date().toISOString()
        };
        FirebaseSync.syncMessage(message).catch(e => console.warn("Firestore message sync notice:", e));
        return message;
    }

    // Backup & Restore
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
        a.download = `RoyalVazier_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    restoreBackup(jsonString: string): boolean {
        try {
            const data = JSON.parse(jsonString);
            if (data.products && Array.isArray(data.products)) {
                this.state.products = data.products;
                this._save('bc_products', data.products);
            }
            if (data.sales && Array.isArray(data.sales)) {
                this.state.sales = data.sales;
                this._save('bc_sales', data.sales);
            }
            if (data.purchases && Array.isArray(data.purchases)) {
                this.state.purchases = data.purchases;
                this._save('bc_purchases', data.purchases);
            }
            if (data.debts && Array.isArray(data.debts)) {
                this.state.debts = data.debts;
                this._save('bc_debts', data.debts);
            }
            if (data.settings) {
                this.state.settings = { ...this.state.settings, ...data.settings };
                this._save('bc_settings', this.state.settings);
            }
            this.notify();
            return true;
        } catch (e) {
            console.error('Backup restore failed:', e);
            return false;
        }
    }

    clearAllData() {
        this.state.products = [];
        this.state.sales = [];
        this.state.purchases = [];
        this.state.debts = [];
        this._save('bc_products', []);
        this._save('bc_sales', []);
        this._save('bc_purchases', []);
        this._save('bc_debts', []);
        this.notify();
    }

    async syncWithFirestore(): Promise<{ success: boolean; timestamp?: string; error?: string }> {
        if (this.state.isSyncing) {
            return { success: false, error: 'Sync already in progress' };
        }
        this.state.isSyncing = true;
        this.state.lastSyncError = null;
        this.notify();

        // Safety fallback timer: guarantee isSyncing resets after 30s max
        const safetyTimer = setTimeout(() => {
            if (this.state.isSyncing) {
                this.state.isSyncing = false;
                this.notify();
            }
        }, 30000);

        try {
            const result = await FirebaseSync.pushStoreSnapshot({
                products: this.state.products,
                sales: this.state.sales,
                debts: this.state.debts,
                purchases: this.state.purchases,
                settings: this.state.settings
            });
            if (result.success) {
                this.state.lastSyncTimestamp = result.timestamp || new Date().toISOString();
                this.state.lastSyncError = null;
            } else {
                this.state.lastSyncError = result.error || 'Sync failed';
            }
            return result;
        } catch (err: any) {
            this.state.lastSyncError = err.message || 'Sync failed';
            return { success: false, error: err.message };
        } finally {
            clearTimeout(safetyTimer);
            this.state.isSyncing = false;
            this.notify();
        }
    }

    async restoreFromCloud(): Promise<{ success: boolean; error?: string }> {
        this.state.isSyncing = true;
        this.notify();
        try {
            const result = await FirebaseSync.pullStoreSnapshot();
            if (!result.success || !result.data) {
                this.state.isSyncing = false;
                this.notify();
                return { success: false, error: result.error || 'No cloud data found.' };
            }
            this.restoreBackup(JSON.stringify(result.data));
            this.state.isSyncing = false;
            this.notify();
            return { success: true };
        } catch (err: any) {
            this.state.isSyncing = false;
            this.notify();
            return { success: false, error: err.message };
        }
    }

    private _save(key: string, data: any) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.warn('Storage save failed:', e);
        }
    }
}

export const Store = new StoreClass();
