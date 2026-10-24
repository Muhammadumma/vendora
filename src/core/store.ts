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
    owner?: string;
    vendor?: string;
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
    paidTo?: string;
}

export interface Sale {
    id: string;
    date: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
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
    theme: 'light',
    businessLogo: '/royalvazier-logo.png',
    socials: {
        instagram: '@royalvazier_textile',
        facebook: 'Royalvazier Global Services Ltd',
        twitter: '@royalvaziertex'
    }
};

function loadInitialSession(): UserSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem('vendora_active_session');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.uid) return parsed;
        }
    } catch (e) {
        // ignore
    }
    return null;
}

function loadFromStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed !== undefined && parsed !== null) return parsed;
        }
    } catch (e) {
        console.warn(`Failed to read ${key} from storage:`, e);
    }
    return fallback;
}

type Listener = () => void;

class StoreClass {
    private listeners: Set<Listener> = new Set();

    public state = {
        activeSession: loadInitialSession(),
        products: loadFromStorage<Product[]>('bc_products', []),
        sales: loadFromStorage<Sale[]>('bc_sales', []),
        purchases: loadFromStorage<Purchase[]>('bc_purchases', []),
        debts: loadFromStorage<Debt[]>('bc_debts', []),
        settings: { ...defaultRoyalvazierSettings, ...loadFromStorage<Partial<Settings>>('bc_settings', {}) } as Settings,
        isSyncing: false,
        lastSyncTimestamp: loadFromStorage<string | null>('bc_last_sync', null),
        lastSyncError: null as string | null
    };

    private autoSyncTimer: any = null;
    private _auditLog: any[] = [];
    private _cloudUnsubs: (() => void)[] = [];

    constructor() {
        const initial = this.state.activeSession;
        if (initial?.uid) {
            this.initCloudSync(initial.uid);
        }
    }

    initCloudSync(uid: string) {
        if (!uid) return;
        this.stopCloudSync();
        console.log('[Store] Initializing live Firestore sync for:', uid);
        this._cloudUnsubs = FirebaseSync.subscribeToUserData(uid, {
            onProducts: (products) => {
                if (products.length === 0 && this.state.products.length > 0) {
                    FirebaseSync.syncProductsBatch(this.state.products, uid).catch(e => console.warn(e));
                    return;
                }
                this.state.products = products;
                this._save('bc_products', products);
                this.notify();
            },
            onSales: (sales) => {
                if (sales.length === 0 && this.state.sales.length > 0) {
                    FirebaseSync.syncSalesBatch(this.state.sales, uid).catch(e => console.warn(e));
                    return;
                }
                this.state.sales = sales;
                this._save('bc_sales', sales);
                this.notify();
            },
            onDebts: (debts) => {
                if (debts.length === 0 && this.state.debts.length > 0) {
                    FirebaseSync.syncDebtsBatch(this.state.debts, uid).catch(e => console.warn(e));
                    return;
                }
                this.state.debts = debts;
                this._save('bc_debts', debts);
                this.notify();
            },
            onPurchases: (purchases) => {
                if (purchases.length === 0 && this.state.purchases.length > 0) {
                    FirebaseSync.syncPurchasesBatch(this.state.purchases, uid).catch(e => console.warn(e));
                    return;
                }
                this.state.purchases = purchases;
                this._save('bc_purchases', purchases);
                this.notify();
            },
            onSettings: (settings) => {
                this.state.settings = { ...this.state.settings, ...settings };
                this._save('bc_settings', this.state.settings);
                this.notify();
            }
        });
    }

    stopCloudSync() {
        if (this._cloudUnsubs.length > 0) {
            this._cloudUnsubs.forEach(unsub => unsub());
            this._cloudUnsubs = [];
        }
    }

    queueAutoSync() {
        if (!this.state.activeSession?.isLoggedIn || !this.state.activeSession?.uid) return;
        if (this.state.isSyncing) return;
        if (this.autoSyncTimer) clearTimeout(this.autoSyncTimer);
        this.autoSyncTimer = setTimeout(() => {
            if (!this.state.isSyncing && this.state.activeSession?.isLoggedIn && this.state.activeSession?.uid) {
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
        try { sessionStorage.setItem('vendora_active_session', JSON.stringify(user)); } catch (e) { }
        this.notify();
        return true;
    }

    loginWithFirebaseUser(
        fbUser: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null },
        provider: 'firebase-email' | 'firebase-google' = 'firebase-email'
    ): UserSession {
        // If switching user, reset state
        if (this.state.activeSession && this.state.activeSession.uid !== fbUser.uid) {
            this.clearAllData();
        }
        const name = fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Admin');
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
        try { sessionStorage.setItem('vendora_active_session', JSON.stringify(user)); } catch (e) { }
        this.notify();
        this.initCloudSync(user.uid);
        return user;
    }

    setSecurityQuestions(questions: { question: string; answer: string }[]) {
        if (this.state.activeSession) {
            this.state.activeSession.securityQuestions = questions;
            try { sessionStorage.setItem('vendora_active_session', JSON.stringify(this.state.activeSession)); } catch (e) { }
            this.notify();
            return true;
        }
        return false;
    }

    updatePassword(newPassword: string) {
        if (this.state.activeSession) {
            this.state.activeSession.password = newPassword;
            try { sessionStorage.setItem('vendora_active_session', JSON.stringify(this.state.activeSession)); } catch (e) { }
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
        this.stopCloudSync();
        this.state.activeSession = null;
        try { sessionStorage.removeItem('vendora_active_session'); } catch (e) { }
        this.clearAllData();
        FirebaseAuthService.logout().catch(e => console.warn(e));
        this.notify();
    }

    // Products
    addProduct(product: Partial<Product> & { name: string }) {
        const cleanSku = product.sku ? String(product.sku).trim() : undefined;
        const generatedId = product.id || (cleanSku ? `prod-${cleanSku.replace(/\s+/g, '-').toLowerCase()}` : `prod-${Date.now()}`);
        const newProd: Product = {
            id: generatedId,
            sku: cleanSku,
            name: product.name.trim(),
            category: (product.category || 'General').trim(),
            qty: Math.max(0, Number.isFinite(Number(product.qty)) ? Number(product.qty) : 0),
            buyPrice: Math.max(0, Number.isFinite(Number(product.buyPrice)) ? Number(product.buyPrice) : 0),
            sellPrice: Math.max(0, Number.isFinite(Number(product.sellPrice)) ? Number(product.sellPrice) : 0),
            supplier: (product.supplier || '').trim(),
            owner: (product.owner || product.vendor || 'In-House (Direct)').trim(),
            vendor: (product.vendor || product.owner || 'In-House (Direct)').trim(),
            threshold: Math.max(0, Number.isInteger(Number(product.threshold)) ? Number(product.threshold) : 5),
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
            const sanitizedUpdates: Partial<Product> = { ...updates };
            if (updates.name !== undefined) sanitizedUpdates.name = String(updates.name).trim();
            if (updates.category !== undefined) sanitizedUpdates.category = String(updates.category).trim();
            if (updates.qty !== undefined) sanitizedUpdates.qty = Math.max(0, Number(updates.qty) || 0);
            if (updates.buyPrice !== undefined) sanitizedUpdates.buyPrice = Math.max(0, Number(updates.buyPrice) || 0);
            if (updates.sellPrice !== undefined) sanitizedUpdates.sellPrice = Math.max(0, Number(updates.sellPrice) || 0);
            if (updates.threshold !== undefined) sanitizedUpdates.threshold = Math.max(0, Number(updates.threshold) || 5);
            if (updates.owner !== undefined) sanitizedUpdates.owner = String(updates.owner).trim();
            if (updates.vendor !== undefined) sanitizedUpdates.vendor = String(updates.vendor).trim();
            if (updates.supplier !== undefined) sanitizedUpdates.supplier = String(updates.supplier).trim();

            this.state.products[index] = { ...this.state.products[index], ...sanitizedUpdates };
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
            customerName: (saleData.customerName || 'Walk-in Customer').trim(),
            customerPhone: (saleData.customerPhone || '').trim(),
            customerAddress: (saleData.customerAddress || '').trim(),
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
            if (stockValue > 0 && (currentDebt + sale.total) > (stockValue * 0.3)) {
                throw new Error(`Debt Limit Exceeded! Active debt (₦${(currentDebt + sale.total).toLocaleString()}) cannot exceed 30% of total inventory value (₦${Math.round(stockValue * 0.3).toLocaleString()}).`);
            }

            const itemSummary = sale.items && sale.items.length > 0
                ? sale.items.map(it => `${it.name} (x${it.qty})`).join(', ')
                : `Sale #${sale.id.replace(/^SALE-/, '')}`;

            this.addDebt({
                debtor: sale.customerName || 'Customer',
                phone: sale.customerPhone || '',
                product: itemSummary,
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

    updateSale(id: string, updates: Partial<Sale>) {
        const idx = this.state.sales.findIndex(s => s.id === id);
        if (idx !== -1) {
            this.state.sales[idx] = { ...this.state.sales[idx], ...updates };
            this._save('bc_sales', this.state.sales);
            this.notify();
            FirebaseSync.syncSale(this.state.sales[idx]).catch(e => console.warn("Firestore sale update sync:", e));
            this.queueAutoSync();
            return this.state.sales[idx];
        }
        return null;
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
            if (stockValue > 0 && (currentDebt + debtData.amount) > (stockValue * 0.3)) {
                throw new Error(`Debt Limit Exceeded! Active debt cannot exceed 30% of total inventory value.`);
            }
        }

        const debt: Debt = {
            id: debtData.id || 'DEBT-' + Date.now(),
            debtor: debtData.debtor.trim(),
            phone: (debtData.phone || '').trim(),
            product: debtData.product || 'Unspecified goods',
            amount: Math.max(0, Number(debtData.amount) || 0),
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

    settleDebt(id: string, paymentMethod: string = 'Cash'): Sale | null {
        const index = this.state.debts.findIndex(d => d.id === id);
        if (index !== -1) {
            const debt = this.state.debts[index];
            debt.status = 'Paid';
            debt.settledDate = new Date().toISOString();

            // Check if there was an existing source sale recorded when credit was issued
            const existingSaleIndex = debt.sourceSaleId
                ? this.state.sales.findIndex(s => s.id === debt.sourceSaleId)
                : -1;

            let settlementSale: Sale;

            if (existingSaleIndex !== -1) {
                // Update the existing sale with payment confirmation
                const existingSale = this.state.sales[existingSaleIndex];
                existingSale.paymentMethod = `Debt Cleared (${paymentMethod})`;
                existingSale.dueDate = undefined;
                this._save('bc_sales', this.state.sales);
                FirebaseSync.syncSale(existingSale).catch(e => console.warn("Firestore sale sync:", e));

                // Generate a settlement receipt (zero additional profit, marked settlement to prevent double counting)
                settlementSale = {
                    id: 'SETTLE-' + Date.now(),
                    date: debt.settledDate,
                    customerName: debt.debtor,
                    customerPhone: debt.phone,
                    paymentMethod: `Debt Settlement (${paymentMethod})`,
                    items: debt.items && debt.items.length > 0 ? debt.items : [{
                        name: `Debt Cleared: ${debt.product}`,
                        qty: 1,
                        price: debt.amount,
                        buyPrice: 0
                    }],
                    subtotal: debt.amount,
                    vat: 0,
                    total: debt.amount,
                    profit: 0,
                    isSettlement: true
                };
            } else {
                // Standalone debt created without a prior POS sale.
                // Now entering sales ledger as realized revenue.
                settlementSale = {
                    id: 'SETTLE-' + Date.now(),
                    date: debt.settledDate,
                    customerName: debt.debtor,
                    customerPhone: debt.phone,
                    paymentMethod: `Debt Settlement (${paymentMethod})`,
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
                this.state.sales.push(settlementSale);
                this._save('bc_sales', this.state.sales);
                FirebaseSync.syncSale(settlementSale).catch(e => console.warn("Firestore settlement sale sync:", e));
            }

            debt.sourceSaleId = debt.sourceSaleId || settlementSale.id;
            this._save('bc_debts', this.state.debts);
            this.notify();
            FirebaseSync.syncDebt(debt).catch(e => console.warn("Firestore debt settle sync:", e));
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
        const isPaid = debt.status === 'Paid' || debt.status === 'Settled';
        return {
            id: debt.id,
            date: debt.settledDate || debt.createdAt,
            customerName: debt.debtor,
            customerPhone: debt.phone,
            paymentMethod: isPaid ? 'Debt Settlement (Paid)' : 'Credit Sale (Pending)',
            dueDate: debt.dueDate,
            items: debt.items && debt.items.length > 0 ? debt.items : [{
                name: debt.product || 'Items on Credit',
                qty: 1,
                price: debt.amount,
                buyPrice: 0
            }],
            subtotal: debt.amount,
            vat: 0,
            total: debt.amount,
            profit: 0,
            isSettlement: isPaid
        };
    }

    deleteDebt(id: string) {
        this.settleDebt(id);
    }

    // Settings
    updateSettings(newSettings: Partial<Settings>) {
        this.state.settings = { ...this.state.settings, ...newSettings };
        this.notify();
        FirebaseSync.syncSettings(this.state.settings).catch(e => console.warn("Firestore settings sync:", e));
        this.queueAutoSync();
    }

    // Audit Log (in-memory only)
    logProductEdit(record: any) {
        this._auditLog.push({
            id: 'LOG-' + Date.now(),
            timestamp: new Date().toISOString(),
            user: this.state.activeSession ? this.state.activeSession.name : 'Unknown',
            ...record
        });
    }

    getAuditLog() {
        return [...this._auditLog];
    }

    // Messages & Reminders
    recordMessage(msg: { text: string; recipient?: string; type?: string;[key: string]: any }) {
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

    restoreBackup(jsonString: string, preserveLocalIfEmpty = false): boolean {
        try {
            const data = JSON.parse(jsonString);
            if (Array.isArray(data.products) && (data.products.length > 0 || !preserveLocalIfEmpty || this.state.products.length === 0)) {
                this.state.products = data.products;
            }
            if (Array.isArray(data.sales) && (data.sales.length > 0 || !preserveLocalIfEmpty || this.state.sales.length === 0)) {
                this.state.sales = data.sales;
            }
            if (Array.isArray(data.purchases) && (data.purchases.length > 0 || !preserveLocalIfEmpty || this.state.purchases.length === 0)) {
                this.state.purchases = data.purchases;
            }
            if (Array.isArray(data.debts) && (data.debts.length > 0 || !preserveLocalIfEmpty || this.state.debts.length === 0)) {
                this.state.debts = data.debts;
            }
            if (data.settings) {
                this.state.settings = { ...defaultRoyalvazierSettings, ...data.settings };
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
        this.state.settings = { ...defaultRoyalvazierSettings };
        this.state.lastSyncTimestamp = null;
        this.state.lastSyncError = null;
        if (this.autoSyncTimer) {
            clearTimeout(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('bc_products');
                localStorage.removeItem('bc_sales');
                localStorage.removeItem('bc_purchases');
                localStorage.removeItem('bc_debts');
                localStorage.removeItem('bc_settings');
                localStorage.removeItem('bc_last_sync');
            }
        } catch (e) {
            console.warn('Failed to clear local storage:', e);
        }
        this.notify();
    }

    async syncWithFirestore(): Promise<{ success: boolean; timestamp?: string; error?: string }> {
        const uid = this.state.activeSession?.uid;
        if (!uid) {
            return { success: false, error: 'User is not signed in. Cannot sync without an account.' };
        }
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
            }, uid);
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

    /**
     * Complete 100% Data Transfer to Firestore Cloud Database
     * Transfers all products, sales, debts, purchases, settings, and snapshots.
     */
    async transferToCloud(): Promise<{
        success: boolean;
        timestamp?: string;
        stats?: {
            products: number;
            sales: number;
            debts: number;
            purchases: number;
            settings: boolean;
            snapshot: boolean;
        };
        error?: string;
    }> {
        const uid = this.state.activeSession?.uid;
        if (!uid) {
            return { success: false, error: 'User is not signed in. Please sign in to transfer data to the cloud.' };
        }
        if (this.state.isSyncing) {
            return { success: false, error: 'Transfer already in progress. Please wait a moment.' };
        }
        this.state.isSyncing = true;
        this.state.lastSyncError = null;
        this.notify();

        const safetyTimer = setTimeout(() => {
            if (this.state.isSyncing) {
                this.state.isSyncing = false;
                this.notify();
            }
        }, 35000);

        try {
            const result = await FirebaseSync.transferAllDataToCloud({
                products: this.state.products,
                sales: this.state.sales,
                debts: this.state.debts,
                purchases: this.state.purchases,
                settings: this.state.settings
            }, uid);
            if (result.success) {
                this.state.lastSyncTimestamp = result.timestamp || new Date().toISOString();
                this.state.lastSyncError = null;
            } else {
                this.state.lastSyncError = result.error || 'Transfer failed';
            }
            return result;
        } catch (err: any) {
            this.state.lastSyncError = err.message || 'Transfer failed';
            return { success: false, error: err.message };
        } finally {
            clearTimeout(safetyTimer);
            this.state.isSyncing = false;
            this.notify();
        }
    }

    async restoreFromCloud(): Promise<{ success: boolean; error?: string }> {
        const uid = this.state.activeSession?.uid;
        if (!uid) {
            return { success: false, error: 'No user account found to restore.' };
        }
        this.state.isSyncing = true;
        this.notify();
        try {
            this.initCloudSync(uid);
            const result = await FirebaseSync.pullStoreSnapshot(uid);
            if (result.success && result.data) {
                this.restoreBackup(JSON.stringify(result.data), true);
            }
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
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, JSON.stringify(data));
            }
        } catch (e) {
            console.warn(`Storage save failed for ${key}:`, e);
        }
    }
}

export const Store = new StoreClass();
