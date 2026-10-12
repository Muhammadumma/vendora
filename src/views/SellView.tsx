import React, { useState, useEffect } from 'react';
import {
    Scan,
    Search,
    Banknote,
    Building2,
    CreditCard,
    FileWarning,
    Minus,
    Plus,
    Printer,
    CheckCircle2,
    Package,
    ChevronUp,
    ChevronDown,
    Zap,
    User,
    Phone,
    Download,
    Copy,
    Share2,
    Check,
    X
} from 'lucide-react';
import { Store, Product, SaleItem, Sale } from '../core/store';
import { Utils } from '../core/utils';

export const SellView: React.FC = () => {
    const [products, setProducts] = useState<Product[]>(Store.getProducts());
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Items');
    const [cart, setCart] = useState<SaleItem[]>([
        { productId: 'p1', name: 'Vegetable Oil 25L', qty: 1, price: 32000, buyPrice: 28500 },
        { productId: 'p2', name: 'Peak Milk Powder 400g', qty: 1, price: 12800, buyPrice: 11000 }
    ]);
    const [isCartExpanded, setIsCartExpanded] = useState(true);
    const [customerName, setCustomerName] = useState('Ibrahim Musa');
    const [customerPhone, setCustomerPhone] = useState('0803 452 9811');
    const [paymentChannel, setPaymentChannel] = useState<'Cash' | 'Bank' | 'POS' | 'Debt'>('Cash');
    const [completedSale, setCompletedSale] = useState<Sale | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const update = () => setProducts([...Store.getProducts()]);
        const unsubscribe = Store.subscribe(update);
        return () => unsubscribe();
    }, []);

    // Dynamic categories from all registered products
    const uniqueProductCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const categories = ['All Items', ...uniqueProductCategories];

    const filteredProducts = products.filter(p => {
        const q = search.trim().toLowerCase();
        const matchesQuery = !q ||
            p.name.toLowerCase().includes(q) ||
            (p.sku || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q);
        const matchesCategory = selectedCategory === 'All Items' ||
            (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
        return matchesQuery && matchesCategory;
    });

    const addToCart = (prod: Product) => {
        if (Number(prod.qty) <= 0) return;
        setCart(prev => {
            const existing = prev.find(i => i.productId === prod.id || i.name === prod.name);
            if (existing) {
                return prev.map(i => i.productId === prod.id || i.name === prod.name
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
        setCart(prev => {
            return prev.map(item => {
                if (item.name === name) {
                    const newQty = item.qty + delta;
                    if (newQty <= 0) return null as any;
                    return { ...item, qty: newQty };
                }
                return item;
            }).filter(Boolean);
        });
    };

    // Calculations
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const vatRate = 7.5;
    const vat = Math.round(subtotal * (vatRate / 100));
    const grandTotal = subtotal + vat;
    const [printStatus, setPrintStatus] = useState('');

    const handleChargeAndPrint = () => {
        if (cart.length === 0) {
            setErrorMsg('Current order is empty. Select items to charge.');
            return;
        }

        try {
            const sale = Store.addSale({
                customerName: customerName.trim() || 'Walk-in Customer',
                customerPhone: customerPhone.trim(),
                paymentMethod: paymentChannel,
                items: [...cart],
                subtotal,
                vat,
                total: grandTotal
            });

            setCompletedSale(sale);
            setCart([]);
            setErrorMsg('');
            setPrintStatus('🖨️ Opening print dialog... (Ready for 80mm thermal or standard printer)');

            // Actively trigger physical / thermal print job immediately
            Utils.printReceipt(sale, Store.getSettings());
            setTimeout(() => setPrintStatus(''), 4500);
        } catch (err: any) {
            setErrorMsg(err.message || 'Cannot complete sale.');
        }
    };

    const handleReprint = () => {
        if (completedSale) {
            setPrintStatus('🖨️ Opening print dialog... (Thermal 80mm / Standard)');
            Utils.printReceipt(completedSale, Store.getSettings());
            setTimeout(() => setPrintStatus(''), 4500);
        }
    };

    const handleCopyReceipt = async () => {
        if (completedSale) {
            const ok = await Utils.copyReceiptText(completedSale, Store.getSettings());
            if (ok) {
                setPrintStatus('✓ Receipt text copied to clipboard (Bluetooth/POS ready)');
                setTimeout(() => setPrintStatus(''), 3500);
            }
        }
    };

    const handleShareWhatsApp = () => {
        if (completedSale) {
            Utils.shareReceiptWhatsApp(completedSale, Store.getSettings());
        }
    };

    const handleDownloadReceipt = () => {
        if (completedSale) {
            Utils.downloadReceipt(completedSale, Store.getSettings());
            setPrintStatus('✓ Receipt HTML file saved');
            setTimeout(() => setPrintStatus(''), 3000);
        }
    };

    return (
        <div className="fade-in sell-view-page" style={{ paddingBottom: '140px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '16px' }}>🧾</span>
                    </div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Express Register</h1>
                </div>
                <div style={{ padding: '4px 10px', background: '#F1F5F9', color: '#475569', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F95721' }} />
                    Register #01
                </div>
            </div>

            {/* Search Bar with Barcode Scan */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Search products by SKU or name..."
                        className="search-input"
                        style={{ width: '100%', paddingLeft: '38px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', height: '46px', fontSize: '14px' }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                </div>
                <button
                    type="button"
                    style={{ width: '46px', height: '46px', borderRadius: '14px', background: '#F0F9FF', border: '1px solid #BAE6FD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    title="Scan Barcode"
                >
                    <Scan size={20} color="#0284C7" />
                </button>
            </div>

            {/* Category Filter Pills */}
            <div className="filter-pills-row" style={{ marginBottom: '14px', overflowX: 'auto', display: 'flex', gap: '8px', paddingBottom: '4px' }}>
                {categories.map((cat) => {
                    const count = cat === 'All Items'
                        ? products.length
                        : products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
                    return (
                        <button
                            key={cat}
                            type="button"
                            className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat)}
                            style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}
                        >
                            {cat} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Complete Product Catalog Grid - Shows ALL products */}
            <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Items for Sale
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#FFF2EB', color: '#F95721', fontSize: '11px', fontWeight: 800 }}>
                            Showing all {filteredProducts.length} of {products.length}
                        </span>
                    </div>
                    {(search || selectedCategory !== 'All Items') && (
                        <button
                            type="button"
                            onClick={() => { setSearch(''); setSelectedCategory('All Items'); }}
                            style={{ background: 'none', border: 'none', color: '#F95721', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                            Show All ({products.length})
                        </button>
                    )}
                </div>

                {filteredProducts.length === 0 ? (
                    <div style={{ padding: '24px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                        <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 10px' }}>No items match your search.</p>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => { setSearch(''); setSelectedCategory('All Items'); }}
                            style={{ fontSize: '12px', padding: '6px 14px' }}
                        >
                            Reset filters & show all {products.length} items
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '2px' }}>
                        {filteredProducts.map(prod => {
                            const inCart = cart.find(i => i.productId === prod.id || i.name === prod.name);
                            const isOutOfStock = Number(prod.qty) <= 0;

                            return (
                                <div
                                    key={prod.id}
                                    onClick={() => !isOutOfStock && addToCart(prod)}
                                    style={{
                                        background: isOutOfStock ? '#F8FAFC' : '#FFFFFF',
                                        border: inCart ? '1.5px solid #F95721' : '1px solid #EDF2F7',
                                        borderRadius: '12px',
                                        padding: '10px',
                                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: inCart ? '0 2px 6px rgba(249,87,33,0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                                        opacity: isOutOfStock ? 0.6 : 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        position: 'relative'
                                    }}
                                >
                                    {inCart && (
                                        <span style={{ position: 'absolute', top: '6px', right: '6px', background: '#F95721', color: '#FFFFFF', borderRadius: '8px', fontSize: '10px', fontWeight: 800, padding: '1px 5px' }}>
                                            {inCart.qty}
                                        </span>
                                    )}

                                    <div>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: inCart ? '#F95721' : '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                                            <Package size={14} color={inCart ? '#FFFFFF' : '#F95721'} />
                                        </div>
                                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.25, marginBottom: '4px', wordBreak: 'break-word' }}>
                                            {prod.name}
                                        </div>
                                        <div style={{ fontSize: '10.5px', color: '#64748B', display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                            {prod.sku && <span style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: '4px' }}>{prod.sku}</span>}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#F95721' }}>
                                            ₦{Number(prod.sellPrice).toLocaleString()}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                            <span style={{ fontSize: '10.5px', fontWeight: 600, color: isOutOfStock ? '#EF4444' : '#64748B' }}>
                                                {isOutOfStock ? '0 in stock' : `${prod.qty} left`}
                                            </span>
                                            <button
                                                type="button"
                                                disabled={isOutOfStock}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart(prod);
                                                }}
                                                style={{
                                                    background: inCart ? '#F95721' : '#FFF2EB',
                                                    color: inCart ? '#FFFFFF' : '#F95721',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '2px 7px',
                                                    fontSize: '10.5px',
                                                    fontWeight: 800,
                                                    cursor: isOutOfStock ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                + Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Current Order Accordion Card */}
            <div id="current-order-card" className="card" style={{ padding: '16px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '16px' }}>
                <div
                    onClick={() => setIsCartExpanded(!isCartExpanded)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{ fontSize: '18px' }}>🛍️</span>
                            {cart.length > 0 && (
                                <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#F95721', color: '#FFFFFF', borderRadius: '10px', fontSize: '10px', fontWeight: 800, width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {cart.length}
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Current Order</span>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>({cart.length} items)</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '17px', fontWeight: 800, color: '#F95721' }}>
                            ₦{grandTotal.toLocaleString()}.00
                        </span>
                        {isCartExpanded ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
                    </div>
                </div>

                {isCartExpanded && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                        {cart.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: '13px' }}>
                                Your basket is empty. Select products above to ring up.
                            </div>
                        ) : (
                            cart.map(item => (
                                <div
                                    key={item.name}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 0',
                                        borderBottom: '1px solid #F8FAFC'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Package size={16} color="#F95721" />
                                        </div>
                                        <div style={{ minWidth: 0, paddingRight: '8px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748B' }}>
                                                ₦{item.price.toLocaleString()}.00 × {item.qty}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                                            ₦{(item.price * item.qty).toLocaleString()}.00
                                        </div>
                                        <div className="stepper-control">
                                            <button type="button" className="stepper-btn" onClick={() => updateQty(item.name, -1)}>
                                                <Minus size={12} />
                                            </button>
                                            <span className="stepper-value">{item.qty}</span>
                                            <button type="button" className="stepper-btn" onClick={() => updateQty(item.name, 1)}>
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Customer Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
                <div>
                    <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Customer</label>
                    <input
                        type="text"
                        className="search-input"
                        style={{ width: '100%', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', fontWeight: 600 }}
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        placeholder="Customer name"
                    />
                </div>
                <div>
                    <label style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Phone (Optional)</label>
                    <input
                        type="text"
                        className="search-input"
                        style={{ width: '100%', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 12px', fontSize: '13px', fontWeight: 600 }}
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        placeholder="0803 000 0000"
                    />
                </div>
            </div>

            {/* Payment Channel Selector */}
            <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        SELECT PAYMENT CHANNEL
                    </span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>Touch to switch</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={() => setPaymentChannel('Cash')}
                        style={{
                            padding: '12px 6px',
                            borderRadius: '14px',
                            border: 'none',
                            background: paymentChannel === 'Cash' ? '#F95721' : '#F0F9FF',
                            color: paymentChannel === 'Cash' ? '#FFFFFF' : '#0369A1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '12px',
                            boxShadow: paymentChannel === 'Cash' ? '0 4px 10px rgba(249,87,33,0.25)' : 'none'
                        }}
                    >
                        <Banknote size={18} />
                        <span>Cash</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setPaymentChannel('Bank')}
                        style={{
                            padding: '12px 6px',
                            borderRadius: '14px',
                            border: 'none',
                            background: paymentChannel === 'Bank' ? '#F95721' : '#F0F9FF',
                            color: paymentChannel === 'Bank' ? '#FFFFFF' : '#0369A1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '12px',
                            boxShadow: paymentChannel === 'Bank' ? '0 4px 10px rgba(249,87,33,0.25)' : 'none'
                        }}
                    >
                        <Building2 size={18} />
                        <span>Bank</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setPaymentChannel('POS')}
                        style={{
                            padding: '12px 6px',
                            borderRadius: '14px',
                            border: 'none',
                            background: paymentChannel === 'POS' ? '#F95721' : '#F0F9FF',
                            color: paymentChannel === 'POS' ? '#FFFFFF' : '#0369A1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '12px',
                            boxShadow: paymentChannel === 'POS' ? '0 4px 10px rgba(249,87,33,0.25)' : 'none'
                        }}
                    >
                        <CreditCard size={18} />
                        <span>POS</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setPaymentChannel('Debt')}
                        style={{
                            padding: '12px 6px',
                            borderRadius: '14px',
                            border: 'none',
                            background: paymentChannel === 'Debt' ? '#F95721' : '#F0F9FF',
                            color: paymentChannel === 'Debt' ? '#FFFFFF' : '#0369A1',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '12px',
                            position: 'relative',
                            boxShadow: paymentChannel === 'Debt' ? '0 4px 10px rgba(249,87,33,0.25)' : 'none'
                        }}
                    >
                        <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#FEE2E2', color: '#DC2626', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '6px' }}>
                            KYC
                        </span>
                        <FileWarning size={18} />
                        <span>Debt</span>
                    </button>
                </div>
            </div>

            {/* Order Totals Card */}
            <div className="card" style={{ padding: '16px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>₦{subtotal.toLocaleString()}.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748B', marginBottom: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        VAT (7.5%)
                        <span style={{ padding: '1px 5px', background: '#F1F5F9', color: '#475569', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>FIRS</span>
                    </span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>₦{vat.toLocaleString()}.00</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Grand Total</div>
                        <div style={{ fontSize: '11px', color: '#94A3B8' }}>Payable in NGN</div>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#F95721', letterSpacing: '-0.02em' }}>
                        ₦{grandTotal.toLocaleString()}.00
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#EF4444', borderRadius: '12px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
                    {errorMsg}
                </div>
            )}

            {/* Big Prominent Action Button */}
            <button
                type="button"
                className="btn btn-primary"
                onClick={handleChargeAndPrint}
                disabled={cart.length === 0}
                style={{
                    width: '100%',
                    padding: '18px 24px',
                    fontSize: '17px',
                    fontWeight: 800,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    marginBottom: '14px'
                }}
            >
                <Printer size={22} color="#FFFFFF" />
                <span>Charge ₦{grandTotal.toLocaleString()}.00 & Print Receipt</span>
            </button>

            {/* Mobile Sticky Checkout Dock - Always at thumb reach on mobile view */}
            <div className="mobile-checkout-dock">
                <div 
                    className="mobile-dock-cart-summary"
                    onClick={() => {
                        setIsCartExpanded(true);
                        const el = document.getElementById('current-order-card');
                        el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                >
                    <div style={{ position: 'relative', marginRight: '10px' }}>
                        <span style={{ fontSize: '22px' }}>🛍️</span>
                        {cart.length > 0 && (
                            <span className="mobile-cart-badge">
                                {cart.length}
                            </span>
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                            {cart.length === 0 ? 'Basket Empty' : `${cart.length} Item${cart.length !== 1 ? 's' : ''}`}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#F95721', lineHeight: 1.1 }}>
                            ₦{grandTotal.toLocaleString()}.00
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-primary mobile-dock-charge-btn"
                    onClick={handleChargeAndPrint}
                    disabled={cart.length === 0}
                    title={cart.length === 0 ? 'Add items to ring up' : 'Charge order and print thermal slip'}
                >
                    <Printer size={18} />
                    <span>{cart.length === 0 ? 'Select Items' : `Charge ₦${grandTotal.toLocaleString()}`}</span>
                </button>
            </div>

            {/* Premium Authentic Thermal Receipt Modal - Mobile Optimized Sheet */}
            {completedSale && (
                <div 
                    className="auth-overlay no-print receipt-modal-overlay" 
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setCompletedSale(null);
                    }}
                >
                    <div className="receipt-modal-container fade-in">
                        {/* Modal Header & Quick Dismiss */}
                        <div className="receipt-modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={16} color="#15803D" />
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Transaction Completed</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCompletedSale(null)}
                                style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#64748B', display: 'flex', alignItems: 'center' }}
                                title="Close (Esc)"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Status Feedback Banner */}
                        {printStatus && (
                            <div style={{ margin: '10px 18px 0', padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '12px', fontSize: '12.5px', fontWeight: 700, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <CheckCircle2 size={16} />
                                <span>{printStatus}</span>
                            </div>
                        )}

                        {/* Scrollable Receipt Slip Body */}
                        <div className="receipt-modal-body">
                            <div 
                                style={{ 
                                    background: '#FAFAFA', 
                                    border: '1px dashed #CBD5E1', 
                                    borderRadius: '12px', 
                                    padding: '20px 16px',
                                    fontFamily: "'Courier New', Courier, monospace, -apple-system, sans-serif",
                                    color: '#0F172A',
                                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)'
                                }}
                            >
                                {/* Store Brand Header */}
                                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#0F172A', marginBottom: '2px' }}>
                                        {Store.getSettings().businessName || 'VENDORA RETAIL'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>
                                        {Store.getSettings().businessAddress || 'Official Retail Outlet'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                                        Tel: {Store.getSettings().businessPhone || '+234 800 000 0000'}
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px dashed #94A3B8', margin: '10px 0' }} />

                                {/* Receipt Metadata */}
                                <div style={{ fontSize: '11.5px', color: '#334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span><strong>RECEIPT #:</strong> {completedSale.id}</span>
                                        <span>{new Date(completedSale.date).toLocaleDateString('en-GB')} {new Date(completedSale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span><strong>CASHIER:</strong> POS-01</span>
                                        <span><strong>PAY:</strong> {String(completedSale.paymentMethod).toUpperCase()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span><strong>CUSTOMER:</strong> {completedSale.customerName}</span>
                                        {completedSale.customerPhone && <span>{completedSale.customerPhone}</span>}
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px dashed #94A3B8', margin: '10px 0' }} />

                                {/* Items Breakdown Table */}
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        <span>ITEM DESCRIPTION</span>
                                        <span>AMOUNT</span>
                                    </div>
                                    {completedSale.items.map((it, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12.5px', margin: '4px 0' }}>
                                            <div style={{ wordBreak: 'break-word', paddingRight: '8px' }}>
                                                <div style={{ fontWeight: 700, color: '#0F172A' }}>{it.name}</div>
                                                <div style={{ fontSize: '11px', color: '#64748B' }}>{it.qty} x ₦{Number(it.price || 0).toLocaleString()}</div>
                                            </div>
                                            <div style={{ fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap' }}>
                                                ₦{(it.price * it.qty).toLocaleString()}.00
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ borderTop: '1px dashed #94A3B8', margin: '10px 0' }} />

                                {/* Financial Summary */}
                                <div style={{ fontSize: '12px', color: '#334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span>Subtotal:</span>
                                        <span>₦{(completedSale.subtotal || 0).toLocaleString()}.00</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span>VAT (7.5%):</span>
                                        <span>₦{(completedSale.vat || 0).toLocaleString()}.00</span>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px dashed #0F172A', borderBottom: '1px dashed #0F172A', padding: '6px 0', margin: '8px 0', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                                    <span>TOTAL DUE:</span>
                                    <span style={{ color: '#F95721' }}>₦{completedSale.total.toLocaleString()}.00</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#334155' }}>
                                    <span>Payment Status:</span>
                                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#DCFCE7', color: '#166534', fontWeight: 800, fontSize: '11px' }}>
                                        PAID IN FULL
                                    </span>
                                </div>

                                <div style={{ borderTop: '1px dashed #94A3B8', margin: '12px 0 8px' }} />

                                {/* Return Policy & Barcode */}
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '10.5px', color: '#64748B', lineHeight: '1.4', marginBottom: '8px' }}>
                                        {Store.getSettings().receiptFooter || 'Thank you for your patronage! Goods bought in good condition are not returnable.'}
                                    </div>
                                    <div dangerouslySetInnerHTML={{ __html: Utils.generateBarcodeSVG(completedSale.id) }} />
                                    <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '2px', color: '#0F172A', marginTop: '4px' }}>
                                        * {completedSale.id} *
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Core Action Buttons Docked at the Bottom */}
                        <div className="receipt-modal-footer">
                            <button
                                type="button"
                                className="btn btn-primary receipt-primary-print-btn"
                                onClick={handleReprint}
                            >
                                <Printer size={18} />
                                <span>Print Receipt (Thermal 80mm / A4)</span>
                            </button>

                            <div className="receipt-secondary-actions-grid">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleDownloadReceipt}
                                    title="Download Standalone HTML Receipt"
                                >
                                    <Download size={14} />
                                    <span>Save HTML</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleCopyReceipt}
                                    title="Copy formatted plain text receipt for Bluetooth POS"
                                >
                                    <Copy size={14} />
                                    <span>Copy Text</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={handleShareWhatsApp}
                                    title="Send receipt details to customer WhatsApp"
                                >
                                    <Share2 size={14} />
                                    <span>WhatsApp</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                className="receipt-dismiss-btn"
                                onClick={() => setCompletedSale(null)}
                            >
                                Done / Start Next Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

