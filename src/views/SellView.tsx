import React, { useState, useEffect } from 'react';
import {
    ScanBarcode,
    Search,
    Banknote,
    Landmark,
    CreditCard,
    Clock,
    Minus,
    Plus,
    Printer,
    CheckCircle2,
    Package,
    ShoppingBag,
    ChevronUp,
    ChevronDown,
    User,
    Phone,
    Download,
    Copy,
    Share2,
    Check,
    X,
    Calendar,
    AlertCircle,
    MapPin,
    FileText,
    History,
    Receipt,
    Image as ImageIcon
} from 'lucide-react';
import { Store, Product, SaleItem, Sale } from '../core/store';
import { Utils } from '../core/utils';
import { ReceiptTicket } from '../components/ReceiptTicket';

export const SellView: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'sell' | 'history'>('sell');
    const [historySearch, setHistorySearch] = useState('');
    const [historyFilter, setHistoryFilter] = useState<'all' | 'today' | 'week'>('all');
    const [sales, setSales] = useState<Sale[]>(Store.getSales());
    const [historyReceipt, setHistoryReceipt] = useState<Sale | null>(null);
    const [products, setProducts] = useState<Product[]>(Store.getProducts());
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [isCartExpanded, setIsCartExpanded] = useState(true);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [paymentChannel, setPaymentChannel] = useState<'Cash' | 'Bank' | 'POS' | 'Debt'>('Cash');
    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [printStatus, setPrintStatus] = useState('');
    const [scanBanner, setScanBanner] = useState('');

    // Debtor Required Form state
    const [showDebtModal, setShowDebtModal] = useState(false);
    const [debtPrintAfter, setDebtPrintAfter] = useState(false);
    const [debtorName, setDebtorName] = useState('');
    const [debtorPhone, setDebtorPhone] = useState('');
    const [debtorDueDate, setDebtorDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    const [debtorStall, setDebtorStall] = useState('');
    const [debtorNotes, setDebtorNotes] = useState('');
    const [debtorError, setDebtorError] = useState('');

    // External / Non-Inventory Receipt Modal state
    const [showExtReceiptModal, setShowExtReceiptModal] = useState(false);
    const [extBuyerName, setExtBuyerName] = useState('');
    const [extBuyerPhone, setExtBuyerPhone] = useState('');
    const [extBuyerAddress, setExtBuyerAddress] = useState('');
    const [extItemName, setExtItemName] = useState('');
    const [extItemQty, setExtItemQty] = useState(1);
    const [extItemPrice, setExtItemPrice] = useState('');
    const [extItemCostPrice, setExtItemCostPrice] = useState('');
    const [extPaymentMethod, setExtPaymentMethod] = useState<'Cash' | 'Bank' | 'POS' | 'Debt'>('Cash');
    const [extDueDate, setExtDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    });
    const [extVendorNote, setExtVendorNote] = useState('');
    const [extError, setExtError] = useState('');

    // Modal Buyer In-place Edit state
    const [modalBuyerName, setModalBuyerName] = useState('');
    const [modalBuyerPhone, setModalBuyerPhone] = useState('');
    const [modalBuyerAddress, setModalBuyerAddress] = useState('');

    useEffect(() => {
        if (completedSale) {
            setModalBuyerName(completedSale.customerName || '');
            setModalBuyerPhone(completedSale.customerPhone || '');
            setModalBuyerAddress(completedSale.customerAddress || '');
        }
    }, [completedSale?.id]);

    useEffect(() => {
        const update = () => {
            setProducts([...Store.getProducts()]);
            setSales([...Store.getSales()]);
        };
        const unsubscribe = Store.subscribe(update);
        return () => unsubscribe();
    }, []);

    // Unique categories for dropdown selector
    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const categories = ['All', ...uniqueCategories];

    const filteredProducts = products.filter(p => {
        const q = search.trim().toLowerCase();
        const matchesQuery = !q ||
            p.name.toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q);
        const matchesCategory = selectedCategory === 'All' ||
            (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
        return matchesQuery && matchesCategory;
    });

    const addToCart = (prod: Product) => {
        const availableStock = Number(prod.qty) || 0;
        if (availableStock <= 0) {
            setErrorMsg(`"${prod.name}" is currently out of stock.`);
            return;
        }
        setCart(prev => {
            const existing = prev.find(i => i.productId === prod.id || i.name === prod.name);
            if (existing) {
                if (existing.qty >= availableStock) {
                    setErrorMsg(`Cannot add more: only ${availableStock} units available in stock.`);
                    return prev;
                }
                return prev.map(i => (i.productId === prod.id || i.name === prod.name)
                    ? { ...i, qty: i.qty + 1 }
                    : i
                );
            }
            return [...prev, {
                productId: prod.id,
                name: prod.name,
                qty: 1,
                price: prod.sellPrice,
                buyPrice: prod.buyPrice
            }];
        });
        setErrorMsg('');
    };

    const updateQty = (name: string, delta: number) => {
        const prod = products.find(p => p.name === name);
        const availableStock = prod ? Number(prod.qty) : 9999;
        setCart(prev => {
            return prev.map(item => {
                if (item.name === name) {
                    const newQty = item.qty + delta;
                    if (newQty <= 0) return null as any;
                    if (delta > 0 && newQty > availableStock) {
                        setErrorMsg(`Cannot add more: only ${availableStock} units available in stock.`);
                        return item;
                    }
                    return { ...item, qty: newQty };
                }
                return item;
            }).filter(Boolean);
        });
    };

    // Quick Barcode Scan Simulation (adds the first matching or in-stock item)
    const handleQuickScan = () => {
        const available = products.find(p => Number(p.qty) > 0);
        if (available) {
            addToCart(available);
            setScanBanner(`Scanned: ${available.name}`);
            setTimeout(() => setScanBanner(''), 2500);
        }
    };

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    // VAT is internal only on owner profit (not billed on top to customer)
    const grandTotal = subtotal;
    const vat = 0;

    const setDueDaysPreset = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        setDebtorDueDate(d.toISOString().split('T')[0]);
    };

    // Charge action: printAfter = false (Instant charge) | printAfter = true (Charge & Print)
    const handleCheckoutClick = (printAfter: boolean = false) => {
        if (cart.length === 0) {
            setErrorMsg('Basket is empty.');
            return;
        }

        if (paymentChannel === 'Debt') {
            setDebtPrintAfter(printAfter);
            setDebtorName(customerName !== 'Walk-in Customer' ? customerName : '');
            setDebtorPhone(customerPhone || '');
            setDebtorError('');
            setShowDebtModal(true);
            return;
        }

        handleProcessSale(customerName, customerPhone, paymentChannel, undefined, printAfter, customerAddress);
    };

    const handleProcessSale = (name: string, phone: string, method: string, dueDate?: string, printAfter: boolean = false, address: string = '') => {
        try {
            const sale = Store.addSale({
                customerName: name.trim() || 'Walk-in Customer',
                customerPhone: phone.trim(),
                customerAddress: address.trim(),
                paymentMethod: method,
                dueDate: dueDate,
                items: [...cart],
                subtotal,
                vat: 0,
                total: grandTotal
            });

            setCompletedSale(sale);
            setCart([]);
            setErrorMsg('');
            setShowDebtModal(false);

            if (printAfter) {
                setPrintStatus('Receipt ready for printing');
                Utils.printReceipt(sale, Store.getSettings());
                setTimeout(() => setPrintStatus(''), 4000);
            }
        } catch (err: any) {
            if (method === 'Debt') {
                setDebtorError(err.message || 'Cannot record debt sale.');
            } else {
                setErrorMsg(err.message || 'Cannot complete sale.');
            }
        }
    };

    const handleConfirmDebtorForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!debtorName.trim()) {
            setDebtorError('Debtor full name is required.');
            return;
        }
        if (!debtorPhone.trim() || debtorPhone.trim().replace(/\D/g, '').length < 8) {
            setDebtorError('Valid debtor phone number is required (min 8 digits).');
            return;
        }
        if (!debtorDueDate) {
            setDebtorError('Payment due date is required.');
            return;
        }

        handleProcessSale(debtorName, debtorPhone.trim(), 'Debt', debtorDueDate, debtPrintAfter, debtorStall.trim());
    };

    const handleUpdateModalBuyer = () => {
        if (!completedSale) return;
        const updated = Store.updateSale(completedSale.id, {
            customerName: modalBuyerName.trim() || 'Walk-in Customer',
            customerPhone: modalBuyerPhone.trim(),
            customerAddress: modalBuyerAddress.trim()
        });
        if (updated) {
            setCompletedSale({ ...updated });
            setPrintStatus('✓ Buyer details updated on receipt!');
            setTimeout(() => setPrintStatus(''), 3000);
        }
    };

    const handleCreateExternalReceipt = (e: React.FormEvent) => {
        e.preventDefault();
        if (!extBuyerName.trim()) {
            setExtError('Buyer Name is required for this receipt.');
            return;
        }
        if (!extBuyerPhone.trim() || extBuyerPhone.replace(/\D/g, '').length < 8) {
            setExtError('Valid Buyer Phone Number is required to share via WhatsApp.');
            return;
        }
        if (!extItemName.trim()) {
            setExtError('Product / Item description is required.');
            return;
        }
        const priceNum = Number(extItemPrice);
        if (!priceNum || priceNum <= 0) {
            setExtError('Valid selling price is required.');
            return;
        }
        const qtyNum = Math.max(1, Number(extItemQty) || 1);
        const costNum = Number(extItemCostPrice) || 0;
        const total = priceNum * qtyNum;

        try {
            const sale = Store.addSale({
                customerName: extBuyerName.trim(),
                customerPhone: extBuyerPhone.trim(),
                customerAddress: extBuyerAddress.trim(),
                paymentMethod: extPaymentMethod,
                dueDate: extPaymentMethod === 'Debt' ? extDueDate : undefined,
                items: [{
                    productId: `ext-${Date.now()}`,
                    name: extItemName.trim() + (extVendorNote.trim() ? ` [${extVendorNote.trim()}]` : ''),
                    qty: qtyNum,
                    price: priceNum,
                    buyPrice: costNum
                }],
                subtotal: total,
                vat: 0,
                total: total
            });

            // Reset external form
            setExtBuyerName('');
            setExtBuyerPhone('');
            setExtBuyerAddress('');
            setExtItemName('');
            setExtItemQty(1);
            setExtItemPrice('');
            setExtItemCostPrice('');
            setExtVendorNote('');
            setExtError('');
            setShowExtReceiptModal(false);

            // Pop open receipt modal directly!
            setCompletedSale(sale);
        } catch (err: any) {
            setExtError(err.message || 'Failed to generate receipt.');
        }
    };

    const handleReprint = () => {
        if (completedSale) {
            setPrintStatus('Receipt ready');
            Utils.printReceipt(completedSale, Store.getSettings());
            setTimeout(() => setPrintStatus(''), 4000);
        }
    };

    const handleCopyReceipt = async () => {
        if (completedSale) {
            const ok = await Utils.copyReceiptText(completedSale, Store.getSettings());
            if (ok) {
                setPrintStatus('Receipt text copied');
                setTimeout(() => setPrintStatus(''), 3000);
            }
        }
    };

    const handleShareWhatsApp = async () => {
        if (completedSale) {
            let activeSale = completedSale;
            // Auto-save any edited buyer fields in the modal before sharing
            if (
                modalBuyerName.trim() !== (completedSale.customerName || '') ||
                modalBuyerPhone.trim() !== (completedSale.customerPhone || '') ||
                modalBuyerAddress.trim() !== (completedSale.customerAddress || '')
            ) {
                const updated = Store.updateSale(completedSale.id, {
                    customerName: modalBuyerName.trim() || 'Walk-in Customer',
                    customerPhone: modalBuyerPhone.trim(),
                    customerAddress: modalBuyerAddress.trim()
                });
                if (updated) {
                    activeSale = { ...updated };
                    setCompletedSale(activeSale);
                }
            }

            setPrintStatus('Sharing receipt with buyer details to WhatsApp...');
            const res = await Utils.shareReceiptWhatsApp(activeSale, Store.getSettings());
            if (res?.message) {
                setPrintStatus(res.message);
                setTimeout(() => setPrintStatus(''), 7000);
            }
        }
    };

    const handleDownloadImage = async () => {
        if (completedSale) {
            setPrintStatus('Saving receipt image (PNG)...');
            await Utils.downloadReceiptImage(completedSale, Store.getSettings());
            setPrintStatus('✓ Receipt image downloaded (PNG)');
            setTimeout(() => setPrintStatus(''), 4000);
        }
    };

    const handleDownloadReceipt = () => {
        if (completedSale) {
            Utils.downloadReceipt(completedSale, Store.getSettings());
            setPrintStatus('Receipt saved (HTML)');
            setTimeout(() => setPrintStatus(''), 3000);
        }
    };

    const handleDownloadPDF = async () => {
        if (completedSale) {
            setPrintStatus('Generating PDF...');
            try {
                await Utils.downloadReceiptPDF(completedSale, Store.getSettings());
                setPrintStatus('Receipt downloaded (PDF)');
            } catch (e: any) {
                console.warn('PDF download fallback:', e);
                Utils.downloadReceipt(completedSale, Store.getSettings());
                setPrintStatus('Receipt saved (HTML)');
            }
            setTimeout(() => setPrintStatus(''), 3000);
        }
    };

    // Filter sales for history tab (local calendar day safe)
    const nowLocal = new Date();
    const isSameDay = (dStr: string) => {
        try {
            const d = new Date(dStr);
            return d.getFullYear() === nowLocal.getFullYear() && d.getMonth() === nowLocal.getMonth() && d.getDate() === nowLocal.getDate();
        } catch {
            return false;
        }
    };
    const weekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filteredSales = [...sales].reverse().filter(s => {
        const q = historySearch.trim().toLowerCase();
        const matchQ = !q ||
            (s.customerName || '').toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q) ||
            (s.paymentMethod || '').toLowerCase().includes(q);
        const matchDate =
            historyFilter === 'today' ? isSameDay(s.date) :
            historyFilter === 'week' ? new Date(s.date).getTime() >= weekAgoMs :
            true;
        return matchQ && matchDate;
    });

    return (
        <div className="fade-in sell-view-page" style={{ paddingBottom: '90px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Sell</h1>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>POS #01</span>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', background: '#F1F5F9', padding: '3px', borderRadius: '12px', marginBottom: '16px' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('sell')}
                    style={{
                        padding: '9px',
                        borderRadius: '9px',
                        border: 'none',
                        background: activeTab === 'sell' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'sell' ? '#F95721' : '#64748B',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: activeTab === 'sell' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <ShoppingBag size={14} /> New Sale
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '9px',
                        borderRadius: '9px',
                        border: 'none',
                        background: activeTab === 'history' ? '#FFFFFF' : 'transparent',
                        color: activeTab === 'history' ? '#F95721' : '#64748B',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <History size={14} /> History
                    {sales.length > 0 && (
                        <span style={{ background: '#F95721', color: '#FFF', borderRadius: '10px', fontSize: '10px', fontWeight: 800, padding: '1px 6px', marginLeft: '2px' }}>
                            {sales.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ─── HISTORY TAB ─── */}
            {activeTab === 'history' && (
                <div>
                    {/* Search + Filter */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search by customer or sale ID..."
                                className="search-input"
                                style={{ width: '100%', paddingLeft: '36px', height: '40px', fontSize: '13px' }}
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                            />
                            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                        </div>
                        <select
                            value={historyFilter}
                            onChange={e => setHistoryFilter(e.target.value as any)}
                            style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '0 10px', fontSize: '12px', fontWeight: 700, color: '#334155', height: '40px', cursor: 'pointer' }}
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                        </select>
                    </div>

                    {/* Summary Strip */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                        {[
                            { label: 'Total Sales', value: filteredSales.length },
                            { label: 'Revenue', value: `₦${filteredSales.reduce((s, x) => s + (Number(x.total) || 0), 0).toLocaleString()}` },
                            { label: 'Profit', value: `₦${filteredSales.reduce((s, x) => s + (Number(x.profit) || 0), 0).toLocaleString()}` }
                        ].map(m => (
                            <div key={m.label} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 10px 8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{m.label}</div>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{m.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Sales List */}
                    {filteredSales.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#F8FAFC', borderRadius: '14px', border: '1px dashed #CBD5E1' }}>
                            <Receipt size={28} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#94A3B8' }}>No sales found</div>
                            <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>Complete a sale to see it here</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {filteredSales.map(sale => (
                                <div
                                    key={sale.id}
                                    style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '12px 14px' }}
                                >
                                    {/* Top row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div style={{ flex: 1, minWidth: 0, marginRight: '10px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {sale.customerName || 'Walk-in Customer'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                                                {sale.date ? sale.date.split('T')[0] : ''} &nbsp;·&nbsp;
                                                {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                                                ₦{Number(sale.total).toLocaleString()}
                                            </div>
                                            <span style={{
                                                display: 'inline-block',
                                                marginTop: '3px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                padding: '2px 7px',
                                                borderRadius: '8px',
                                                background: sale.paymentMethod === 'Debt' ? '#FEF2F2' : sale.paymentMethod === 'Cash' ? '#F0FDF4' : '#EFF6FF',
                                                color: sale.paymentMethod === 'Debt' ? '#DC2626' : sale.paymentMethod === 'Cash' ? '#15803D' : '#1D4ED8'
                                            }}>
                                                {sale.paymentMethod}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Profit row */}
                                    {sale.profit !== undefined && (
                                        <div style={{ fontSize: '11.5px', color: Number(sale.profit) >= 0 ? '#10B981' : '#DC2626', fontWeight: 700, marginBottom: '8px' }}>
                                            Profit: ₦{Number(sale.profit).toLocaleString()}
                                        </div>
                                    )}

                                    {/* Items preview */}
                                    <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '10px', lineHeight: 1.5 }}>
                                        {sale.items.slice(0, 3).map((item, i) => (
                                            <span key={i}>
                                                {item.name} ×{item.qty}{i < Math.min(sale.items.length, 3) - 1 ? ', ' : ''}
                                            </span>
                                        ))}
                                        {sale.items.length > 3 && <span style={{ color: '#94A3B8' }}> +{sale.items.length - 3} more</span>}
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => Utils.shareReceiptWhatsApp(sale, Store.getSettings())}
                                            style={{ padding: '8px', background: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                        >
                                            <Share2 size={13} /> WhatsApp Image
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => Utils.downloadReceiptImage(sale, Store.getSettings())}
                                            style={{ padding: '8px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                        >
                                            <ImageIcon size={13} /> Save Image
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => Utils.printReceipt(sale, Store.getSettings())}
                                            style={{ flex: 1, padding: '7px', background: '#0F172A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                        >
                                            <Printer size={12} /> Print
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => Utils.copyReceiptText(sale, Store.getSettings())}
                                            style={{ flex: 1, padding: '7px', background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                        >
                                            <Copy size={12} /> Copy Text
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── SELL TAB ─── */}
            {activeTab === 'sell' && (
            <>

            {/* Scan Feedback Banner */}
            {scanBanner && (
                <div style={{ marginBottom: '10px', padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{scanBanner}</span>
                </div>
            )}

            {/* Top Bar: Barcode Scanner + External Receipt Button */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <button
                    type="button"
                    onClick={handleQuickScan}
                    style={{
                        padding: '13px 10px',
                        borderRadius: '12px',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.16)'
                    }}
                >
                    <ScanBarcode size={18} strokeWidth={2.2} />
                    <span>Scan Barcode</span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setExtError('');
                        setShowExtReceiptModal(true);
                    }}
                    style={{
                        padding: '13px 10px',
                        borderRadius: '12px',
                        background: '#047857',
                        color: '#FFFFFF',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(4, 120, 87, 0.22)'
                    }}
                    title="Generate a receipt for external or non-inventory products"
                >
                    <Receipt size={18} strokeWidth={2.2} />
                    <span>External Receipt</span>
                </button>
            </div>

            {/* Search Input + Compact Category Dropdown (No horizontal scroll tabs) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Search items or SKU..."
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '36px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', height: '44px', fontSize: '13px' }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                </div>
                <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '0 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#334155',
                        height: '44px',
                        cursor: 'pointer'
                    }}
                >
                    {categories.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>

            {/* Product Catalog Grid — Entire Card Clickable to Add 1 Unit Instantly */}
            <div style={{ marginBottom: '16px' }}>
                {filteredProducts.length === 0 ? (
                    <div style={{ padding: '24px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                        No items found.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
                        {filteredProducts.map(prod => {
                            const inCart = cart.find(i => i.productId === prod.id || i.name === prod.name);
                            const isOutOfStock = Number(prod.qty) <= 0;

                            return (
                                <div
                                    key={prod.id}
                                    onClick={() => !isOutOfStock && addToCart(prod)}
                                    style={{
                                        background: isOutOfStock ? '#F8FAFC' : '#FFFFFF',
                                        border: inCart ? '2px solid #0F172A' : '1px solid #E2E8F0',
                                        borderRadius: '12px',
                                        padding: '10px',
                                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.12s ease',
                                        opacity: isOutOfStock ? 0.5 : 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        position: 'relative'
                                    }}
                                >
                                    {inCart && (
                                        <span style={{ position: 'absolute', top: '6px', right: '6px', background: '#0F172A', color: '#FFFFFF', borderRadius: '6px', fontSize: '11px', fontWeight: 800, padding: '1px 6px' }}>
                                            {inCart.qty}
                                        </span>
                                    )}

                                    <div>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: inCart ? '#0F172A' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                            <Package size={14} color={inCart ? '#FFFFFF' : '#334155'} />
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', lineHeight: 1.25, marginBottom: '4px' }}>
                                            {prod.name}
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '8px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                                            ₦{Number(prod.sellPrice).toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: isOutOfStock ? '#DC2626' : '#64748B', marginTop: '2px' }}>
                                            {isOutOfStock ? 'Out' : `${prod.qty} left`}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Current Order Drawer / Accordion Card */}
            <div className="card" style={{ padding: '14px 16px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
                <div
                    onClick={() => setIsCartExpanded(!isCartExpanded)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShoppingBag size={18} color="#0F172A" />
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Basket</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>({cart.length})</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                            ₦{grandTotal.toLocaleString()}
                        </span>
                        {isCartExpanded ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                    </div>
                </div>

                {isCartExpanded && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: '13px' }}>
                                Basket is empty. Tap items to add.
                            </div>
                        ) : (
                            cart.map(item => (
                                <div
                                    key={item.name}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 0',
                                        borderBottom: '1px solid #F8FAFC'
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                                            ₦{item.price.toLocaleString()} × {item.qty}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                                            ₦{(item.price * item.qty).toLocaleString()}
                                        </div>
                                        <div className="stepper-control">
                                            <button type="button" className="stepper-btn" onClick={() => updateQty(item.name, -1)}>
                                                <Minus size={11} />
                                            </button>
                                            <span className="stepper-value">{item.qty}</span>
                                            <button type="button" className="stepper-btn" onClick={() => updateQty(item.name, 1)}>
                                                <Plus size={11} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Customer Inputs: Name, Phone, Address */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ position: 'relative' }}>
                    <User size={15} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 10px 10px 34px', fontSize: '13px', fontWeight: 500 }}
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Customer Name"
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <Phone size={15} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 10px 10px 34px', fontSize: '13px', fontWeight: 500 }}
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="Phone"
                    />
                </div>
            </div>
            <div style={{ position: 'relative', marginBottom: '14px' }}>
                <MapPin size={15} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                    type="text"
                    style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 10px 10px 34px', fontSize: '13px', fontWeight: 500 }}
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder="Address (optional — for receipt)"
                />
            </div>

            {/* Payment Methods: Distinct Vector Icons Only, NO text labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
                <button
                    type="button"
                    title="Cash"
                    aria-label="Cash"
                    onClick={() => setPaymentChannel('Cash')}
                    style={{
                        padding: '12px 0',
                        borderRadius: '12px',
                        border: 'none',
                        background: paymentChannel === 'Cash' ? '#0F172A' : '#F1F5F9',
                        color: paymentChannel === 'Cash' ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <Banknote size={20} />
                </button>

                <button
                    type="button"
                    title="Bank Transfer"
                    aria-label="Bank Transfer"
                    onClick={() => setPaymentChannel('Bank')}
                    style={{
                        padding: '12px 0',
                        borderRadius: '12px',
                        border: 'none',
                        background: paymentChannel === 'Bank' ? '#0F172A' : '#F1F5F9',
                        color: paymentChannel === 'Bank' ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <Landmark size={20} />
                </button>

                <button
                    type="button"
                    title="POS Terminal"
                    aria-label="POS Terminal"
                    onClick={() => setPaymentChannel('POS')}
                    style={{
                        padding: '12px 0',
                        borderRadius: '12px',
                        border: 'none',
                        background: paymentChannel === 'POS' ? '#0F172A' : '#F1F5F9',
                        color: paymentChannel === 'POS' ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <CreditCard size={20} />
                </button>

                <button
                    type="button"
                    title="Debt Ledger"
                    aria-label="Debt Ledger"
                    onClick={() => setPaymentChannel('Debt')}
                    style={{
                        padding: '12px 0',
                        borderRadius: '12px',
                        border: 'none',
                        background: paymentChannel === 'Debt' ? '#B45309' : '#F1F5F9',
                        color: paymentChannel === 'Debt' ? '#FFFFFF' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <Clock size={20} />
                </button>
            </div>

            {errorMsg && (
                <div style={{ padding: '8px 12px', background: '#FEF2F2', color: '#DC2626', borderRadius: '10px', fontSize: '12px', marginBottom: '12px', fontWeight: 600 }}>
                    {errorMsg}
                </div>
            )}

            {/* Split Charge Button — ONLY ONE main button in the UI, floating bar completely removed */}
            <div
                style={{
                    display: 'flex',
                    width: '100%',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: cart.length === 0 
                        ? '#E2E8F0' 
                        : (paymentChannel === 'Debt' ? '#B45309' : '#0F172A'),
                    boxShadow: cart.length === 0 
                        ? 'none' 
                        : (paymentChannel === 'Debt' ? '0 4px 14px rgba(180, 83, 9, 0.35)' : '0 4px 14px rgba(15, 23, 42, 0.20)'),
                    marginBottom: '16px'
                }}
            >
                {/* Main Action: Instant Charge or Record Debt */}
                <button
                    type="button"
                    onClick={() => handleCheckoutClick(false)}
                    disabled={cart.length === 0}
                    style={{
                        flex: 1,
                        padding: '16px 20px',
                        fontSize: '16px',
                        fontWeight: 700,
                        background: 'transparent',
                        color: cart.length === 0 ? '#94A3B8' : '#FFFFFF',
                        border: 'none',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    {paymentChannel === 'Debt' && <Clock size={18} />}
                    <span>{paymentChannel === 'Debt' ? `Record Debt · ₦${grandTotal.toLocaleString()}` : `Charge ₦${grandTotal.toLocaleString()}`}</span>
                </button>

                {/* Split Action: Dedicated Printer Button */}
                <button
                    type="button"
                    onClick={() => handleCheckoutClick(true)}
                    disabled={cart.length === 0}
                    title={paymentChannel === 'Debt' ? "Record Debt & Print Receipt" : "Charge & Print"}
                    aria-label="Charge and Print Receipt"
                    style={{
                        width: '56px',
                        padding: '16px 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        color: cart.length === 0 ? '#94A3B8' : '#FFFFFF',
                        border: 'none',
                        borderLeft: cart.length === 0 ? '1px solid #CBD5E1' : '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                >
                    <Printer size={18} />
                </button>
            </div>

            {/* Debtor Required Form Modal */}
            {showDebtModal && (
                <div 
                    className="auth-overlay no-print"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowDebtModal(false);
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        zIndex: 9999
                    }}
                >
                    <div 
                        className="fade-in"
                        style={{
                            width: '100%',
                            maxWidth: '460px',
                            background: '#FFFFFF',
                            borderRadius: '20px',
                            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
                        }}
                    >
                        {/* Header */}
                        <div 
                            style={{
                                padding: '20px 24px 16px',
                                borderBottom: '1px solid #F1F5F9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#FFFBEB'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div 
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: '#FEF3C7',
                                        border: '1px solid #FDE68A',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#B45309'
                                    }}
                                >
                                    <Clock size={22} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#78350F', letterSpacing: '-0.01em' }}>
                                        Debtor Required Form
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#92400E', fontWeight: 500, marginTop: '2px' }}>
                                        Mandatory debtor profile for credit sale approval
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDebtModal(false)}
                                aria-label="Close"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#92400E',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Credit Amount Highlight */}
                        <div 
                            style={{
                                padding: '14px 24px',
                                background: '#F8FAFC',
                                borderBottom: '1px solid #E2E8F0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B', fontWeight: 700 }}>
                                    Total Credit Amount
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: '#B45309' }}>
                                    ₦{grandTotal.toLocaleString()}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span 
                                    style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '4px 10px',
                                        background: '#FEF3C7',
                                        color: '#92400E',
                                        borderRadius: '999px',
                                        border: '1px solid #FDE68A'
                                    }}
                                >
                                    {cart.reduce((sum, item) => sum + item.qty, 0)} {cart.reduce((sum, item) => sum + item.qty, 0) === 1 ? 'item' : 'items'}
                                </span>
                            </div>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleConfirmDebtorForm} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {debtorError && (
                                <div 
                                    style={{
                                        padding: '10px 14px',
                                        background: '#FEF2F2',
                                        border: '1px solid #FECACA',
                                        borderRadius: '10px',
                                        color: '#DC2626',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <AlertCircle size={16} />
                                    <span>{debtorError}</span>
                                </div>
                            )}

                            {/* Debtor Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Debtor Full Name <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Alhaji Mustapha Bello"
                                        value={debtorName}
                                        onChange={(e) => setDebtorName(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '11px 12px 11px 36px',
                                            border: '1.5px solid #E2E8F0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#0F172A',
                                            outline: 'none',
                                            background: '#FFFFFF',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Debtor Phone */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Phone Number (Active & Reachable) <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                    <input
                                        type="tel"
                                        required
                                        placeholder="0803 123 4567"
                                        value={debtorPhone}
                                        onChange={(e) => setDebtorPhone(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '11px 12px 11px 36px',
                                            border: '1.5px solid #E2E8F0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#0F172A',
                                            outline: 'none',
                                            background: '#FFFFFF',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Due Date & Presets */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Repayment Due Date <span style={{ color: '#DC2626' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                    {[
                                        { label: '+7 Days', days: 7 },
                                        { label: '+14 Days', days: 14 },
                                        { label: '+30 Days', days: 30 },
                                        { label: '+60 Days', days: 60 }
                                    ].map((preset) => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + preset.days);
                                        const val = d.toISOString().split('T')[0];
                                        const isSelected = debtorDueDate === val;
                                        return (
                                            <button
                                                key={preset.days}
                                                type="button"
                                                onClick={() => setDueDaysPreset(preset.days)}
                                                style={{
                                                    flex: 1,
                                                    padding: '7px 0',
                                                    fontSize: '11.5px',
                                                    fontWeight: 700,
                                                    borderRadius: '8px',
                                                    border: isSelected ? '1.5px solid #B45309' : '1px solid #E2E8F0',
                                                    background: isSelected ? '#FEF3C7' : '#F8FAFC',
                                                    color: isSelected ? '#92400E' : '#475569',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                    <input
                                        type="date"
                                        required
                                        value={debtorDueDate}
                                        onChange={(e) => setDebtorDueDate(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '11px 12px 11px 36px',
                                            border: '1.5px solid #E2E8F0',
                                            borderRadius: '10px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#0F172A',
                                            outline: 'none',
                                            background: '#FFFFFF',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Market Stall / Shop Location (Optional) */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Market Stall / Shop Line <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                    <input
                                        type="text"
                                        placeholder="e.g. Shop B-12, Kantin Kwari Market"
                                        value={debtorStall}
                                        onChange={(e) => setDebtorStall(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '11px 12px 11px 36px',
                                            border: '1.5px solid #E2E8F0',
                                            borderRadius: '10px',
                                            fontSize: '13.5px',
                                            color: '#0F172A',
                                            outline: 'none',
                                            background: '#FFFFFF',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Collateral / Guarantor Notes (Optional) */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Guarantor / Remarks <span style={{ color: '#94A3B8', fontWeight: 400 }}>(Optional)</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <FileText size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#94A3B8' }} />
                                    <textarea
                                        rows={2}
                                        placeholder="e.g. Known buyer in textile line, guarantor Mallam Bashir"
                                        value={debtorNotes}
                                        onChange={(e) => setDebtorNotes(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 36px',
                                            border: '1.5px solid #E2E8F0',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                            color: '#0F172A',
                                            outline: 'none',
                                            background: '#FFFFFF',
                                            resize: 'none',
                                            fontFamily: 'inherit',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Form Buttons */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowDebtModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '13px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid #CBD5E1',
                                        background: '#FFFFFF',
                                        color: '#475569',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 2,
                                        padding: '13px 18px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: '#B45309',
                                        color: '#FFFFFF',
                                        fontSize: '14px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 12px rgba(180, 83, 9, 0.28)'
                                    }}
                                >
                                    {debtPrintAfter ? <Printer size={18} /> : <Check size={18} />}
                                    <span>{debtPrintAfter ? 'Record & Print Receipt' : 'Confirm & Record Debt'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {/* External / Non-Inventory Product Receipt Modal */}
            {showExtReceiptModal && (
                <div
                    className="auth-overlay no-print"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowExtReceiptModal(false);
                    }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        zIndex: 9999
                    }}
                >
                    <div
                        className="fade-in"
                        style={{
                            background: '#FFFFFF',
                            width: '100%',
                            maxWidth: '460px',
                            maxHeight: '92vh',
                            overflowY: 'auto',
                            borderRadius: '18px',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #E2E8F0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#F8FAFC'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: '#DCFCE7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#15803D'
                                    }}
                                >
                                    <Receipt size={20} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                                        Generate External Receipt
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                                        Record sale for product not in your store inventory
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowExtReceiptModal(false)}
                                aria-label="Close"
                                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '6px' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleCreateExternalReceipt} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {extError && (
                                <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', color: '#DC2626', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertCircle size={16} />
                                    <span>{extError}</span>
                                </div>
                            )}

                            {/* Section 1: Required Buyer Details */}
                            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={13} color="#059669" />
                                    <span>Buyer Details (Required for Receipt)</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            Buyer Full Name <span style={{ color: '#DC2626' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Alhaji Mustapha"
                                            value={extBuyerName}
                                            onChange={(e) => setExtBuyerName(e.target.value)}
                                            style={{ width: '100%', padding: '9px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            WhatsApp Phone <span style={{ color: '#DC2626' }}>*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            required
                                            placeholder="0803 123 4567"
                                            value={extBuyerPhone}
                                            onChange={(e) => setExtBuyerPhone(e.target.value)}
                                            style={{ width: '100%', padding: '9px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                        Delivery / Stall Address <span style={{ color: '#94A3B8' }}>(optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Shop 4B Kantin Kwari Market"
                                        value={extBuyerAddress}
                                        onChange={(e) => setExtBuyerAddress(e.target.value)}
                                        style={{ width: '100%', padding: '9px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            {/* Section 2: External Item Details */}
                            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Package size={13} color="#059669" />
                                    <span>Product & Pricing</span>
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                        Item Description <span style={{ color: '#DC2626' }}>*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. White Guinea Brocade (10 yards)"
                                        value={extItemName}
                                        onChange={(e) => setExtItemName(e.target.value)}
                                        style={{ width: '100%', padding: '9px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            Quantity <span style={{ color: '#DC2626' }}>*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            required
                                            value={extItemQty}
                                            onChange={(e) => setExtItemQty(Math.max(1, Number(e.target.value) || 1))}
                                            style={{ width: '100%', padding: '9px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            Sell Price (₦) <span style={{ color: '#DC2626' }}>*</span>
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min={1}
                                            placeholder="e.g. 15000"
                                            value={extItemPrice}
                                            onChange={(e) => setExtItemPrice(e.target.value)}
                                            style={{ width: '100%', padding: '9px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF', color: '#0F172A', fontWeight: 700, boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            Cost Price (₦) <span style={{ color: '#94A3B8' }}>(optional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Paid to owner"
                                            value={extItemCostPrice}
                                            onChange={(e) => setExtItemCostPrice(e.target.value)}
                                            style={{ width: '100%', padding: '9px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                            Vendor Note <span style={{ color: '#94A3B8' }}>(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Alhaji Sani Stall 4"
                                            value={extVendorNote}
                                            onChange={(e) => setExtVendorNote(e.target.value)}
                                            style={{ width: '100%', padding: '9px 10px', border: '1px solid #CBD5E1', borderRadius: '8px', fontSize: '13px', background: '#FFFFFF', color: '#0F172A', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Payment Method */}
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Payment Method
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                    {(['Cash', 'Bank', 'POS', 'Debt'] as const).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setExtPaymentMethod(method)}
                                            style={{
                                                padding: '10px 0',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: extPaymentMethod === method ? '#0F172A' : '#F1F5F9',
                                                color: extPaymentMethod === method ? '#FFFFFF' : '#475569',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {method === 'Debt' ? 'Credit' : method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {extPaymentMethod === 'Debt' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#B45309', marginBottom: '4px' }}>
                                        Repayment Due Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={extDueDate}
                                        onChange={(e) => setExtDueDate(e.target.value)}
                                        style={{ width: '100%', padding: '9px 10px', border: '1.5px solid #FDE68A', borderRadius: '8px', fontSize: '13px', background: '#FFFBEB', color: '#92400E', boxSizing: 'border-box' }}
                                    />
                                </div>
                            )}

                            {/* Summary bar */}
                            <div style={{ padding: '10px 14px', background: '#F1F5F9', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Total Receipt Amount</span>
                                <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                                    ₦{((Number(extItemPrice) || 0) * (Number(extItemQty) || 1)).toLocaleString()}
                                </span>
                            </div>

                            {/* Submit & Cancel Buttons */}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowExtReceiptModal(false)}
                                    style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#047857', color: '#FFFFFF', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(4, 120, 87, 0.28)' }}
                                >
                                    <Receipt size={17} />
                                    <span>Generate & Record Receipt</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {completedSale && (
                <div 
                    className="auth-overlay no-print receipt-modal-overlay" 
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setCompletedSale(null);
                    }}
                >
                    <div className="receipt-modal-container fade-in">
                        <div className="receipt-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div 
                                    style={{ 
                                        width: '28px', 
                                        height: '28px', 
                                        borderRadius: '50%', 
                                        background: completedSale.paymentMethod === 'Debt' ? '#FEF3C7' : '#DCFCE7', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center' 
                                    }}
                                >
                                    {completedSale.paymentMethod === 'Debt' ? (
                                        <Clock size={16} color="#B45309" />
                                    ) : (
                                        <Check size={16} color="#15803D" />
                                    )}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                                    {completedSale.paymentMethod === 'Debt' ? 'Credit Sale Recorded' : 'Sale Completed'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCompletedSale(null)}
                                style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {printStatus && (
                            <div style={{ margin: '10px 18px 0', padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '12px', fontSize: '12.5px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <CheckCircle2 size={16} />
                                <span>{printStatus}</span>
                            </div>
                        )}

                        {/* Interactive Buyer & WhatsApp Details Bar */}
                        <div style={{ margin: '10px 14px 4px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Buyer Details (On Receipt)
                                </span>
                                {modalBuyerPhone && (
                                    <span style={{ fontSize: '10.5px', color: '#16A34A', fontWeight: 700 }}>
                                        ✓ WhatsApp Ready
                                    </span>
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px' }}>
                                <input
                                    type="text"
                                    placeholder="Buyer Name"
                                    value={modalBuyerName}
                                    onChange={(e) => setModalBuyerName(e.target.value)}
                                    style={{ padding: '8px 10px', fontSize: '12.5px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600 }}
                                />
                                <input
                                    type="tel"
                                    placeholder="WhatsApp Phone (080...)"
                                    value={modalBuyerPhone}
                                    onChange={(e) => setModalBuyerPhone(e.target.value)}
                                    style={{ padding: '8px 10px', fontSize: '12.5px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A', fontWeight: 600 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Buyer Address / Stall (optional)"
                                    value={modalBuyerAddress}
                                    onChange={(e) => setModalBuyerAddress(e.target.value)}
                                    style={{ flex: 1, padding: '8px 10px', fontSize: '12px', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#0F172A' }}
                                />
                                <button
                                    type="button"
                                    onClick={handleUpdateModalBuyer}
                                    style={{ padding: '8px 12px', fontSize: '11.5px', fontWeight: 700, borderRadius: '8px', background: '#0F172A', color: '#FFFFFF', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                    Update Receipt
                                </button>
                            </div>
                        </div>

                        <div className="receipt-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '10px 14px' }}>
                            <ReceiptTicket 
                                sale={completedSale} 
                                settings={Store.getSettings()} 
                            />
                        </div>

                        {/* Streamlined Modal Actions: Share to WhatsApp & Download PDF (Highlighted unused buttons removed) */}
                        <div className="receipt-modal-footer" style={{ padding: '14px 18px', background: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                type="button"
                                className="btn"
                                onClick={handleShareWhatsApp}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    fontSize: '15px',
                                    fontWeight: 800,
                                    background: '#16A34A',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.28)'
                                }}
                                title="Send receipt directly to WhatsApp"
                            >
                                <Share2 size={18} />
                                <span>Share to WhatsApp</span>
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleDownloadPDF}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    background: '#F8FAFC',
                                    color: '#334155',
                                    border: '1px solid #CBD5E1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    borderRadius: '10px',
                                    cursor: 'pointer'
                                }}
                            >
                                <FileText size={15} />
                                <span>Download PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </>
            )}
        </div>
    );
};
