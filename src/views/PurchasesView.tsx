import React, { useState, useEffect } from 'react';
import {
    Plus,
    Truck,
    Package,
    CheckCircle2,
    Clock,
    FileText,
    Calendar,
    Download
} from 'lucide-react';
import { Store, Purchase, Product } from '../core/store';
import { Utils } from '../core/utils';

export const PurchasesView: React.FC = () => {
    const [products, setProducts] = useState<Product[]>(Store.getProducts());
    const [purchases, setPurchases] = useState<Purchase[]>(Store.getPurchases());

    const [selectedProductId, setSelectedProductId] = useState('');
    const [intakeQty, setIntakeQty] = useState<number | string>('');
    const [unitCost, setUnitCost] = useState<number | string>('');
    const [supplier, setSupplier] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        const update = () => {
            setProducts([...Store.getProducts()]);
            setPurchases([...Store.getPurchases()]);
        };
        const unsubscribe = Store.subscribe(update);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!selectedProductId && products.length > 0) {
            setSelectedProductId(products[0].id);
            setUnitCost(products[0].buyPrice || '');
        }
    }, [products]);

    const currentProduct = products.find(p => p.id === selectedProductId) || products[0];

    const handleProductSelect = (id: string) => {
        setSelectedProductId(id);
        const p = products.find(prod => prod.id === id);
        if (p) {
            setUnitCost(p.buyPrice || '');
        }
    };

    const qtyNum = Number(intakeQty) || 0;
    const costNum = Number(unitCost) || 0;
    const batchTotal = qtyNum * costNum;
    const currentStock = currentProduct ? Number(currentProduct.qty) : 0;
    const projectedStock = currentStock + qtyNum;

    const handleRecordPurchase = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentProduct || qtyNum <= 0) return;

        Store.addPurchase({
            productId: currentProduct.id,
            productName: currentProduct.name,
            qty: qtyNum,
            buyPrice: costNum,
            totalCost: batchTotal,
            supplier: supplier.trim() || 'Direct Wholesaler'
        });

        setSuccessMsg(`✓ Restock of ${qtyNum} units of ${currentProduct.name} recorded into inventory!`);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleExportCSV = () => {
        const rows = [
            ['ID', 'Date', 'Product', 'Quantity', 'Unit Cost (NGN)', 'Total Cost (NGN)', 'Supplier'],
            ...purchases.map(p => [
                p.id,
                p.date ? p.date.split('T')[0] : '',
                p.productName,
                p.qty,
                p.buyPrice,
                p.totalCost,
                p.supplier || 'Standard Supplier'
            ])
        ];
        Utils.downloadCSV(rows, `Vendora_Purchases_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const totalSpend = purchases.reduce((sum, p) => sum + (Number(p.totalCost) || 0), 0) || 285000;
    const totalUnitsRestocked = purchases.reduce((sum, p) => sum + (Number(p.qty) || 0), 0) || 55;

    // Display recent purchases from store or default ledger items if newly started
    const displayPurchases = purchases.length > 0 ? [...purchases].reverse().slice(0, 5) : [
        {
            id: 'PUR-01',
            productName: 'Mama Gold Rice 50kg',
            supplier: 'Olam Agro Direct',
            qty: 25,
            totalCost: 1125000,
            date: 'Yesterday'
        },
        {
            id: 'PUR-02',
            productName: 'Dangote Sugar 50kg',
            supplier: 'Kano Terminal Hub',
            qty: 15,
            totalCost: 645000,
            date: '14 Feb 2026'
        },
        {
            id: 'PUR-03',
            productName: 'Golden Penny Flour 50kg',
            supplier: 'Flour Mills Nig.',
            qty: 20,
            totalCost: 780000,
            date: '10 Feb 2026'
        }
    ];

    return (
        <div className="fade-in" style={{ paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            PROCUREMENT DESK
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: '#FFF2EB', color: '#F95721' }}>
                            Stock Inward
                        </span>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Purchasing & Restock</h1>
                    <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0' }}>
                        Replenish store inventory, register supplier purchases, and maintain accurate cost margins.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleExportCSV}
                    style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', color: '#0284C7', borderRadius: '12px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                >
                    <Download size={14} /> Export CSV
                </button>
            </div>

            {/* Top 3 KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                <div className="card" style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Total Spend</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '3px 0 1px' }}>
                        ₦{totalSpend.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Procurement volume</div>
                </div>

                <div className="card" style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Batches</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '3px 0 1px' }}>
                        {purchases.length || 12}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Restocks logged</div>
                </div>

                <div className="card" style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Units Added</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#F95721', margin: '3px 0 1px' }}>
                        {totalUnitsRestocked}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Total units stocked</div>
                </div>
            </div>

            {successMsg && (
                <div style={{ padding: '12px 16px', background: '#ECFDF5', color: '#10B981', borderRadius: '14px', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
                    {successMsg}
                </div>
            )}

            {/* Record Purchase / Restock Form Card */}
            <form onSubmit={handleRecordPurchase} className="card" style={{ padding: '20px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Truck size={18} color="#F95721" />
                        </div>
                        <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Record Purchase & Restock</h3>
                    </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: '#F1F5F9', color: '#475569' }}>
                    Fast Restock
                </span>
            </div>

            {/* Product Select */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Select Product to Restock</label>
                    <span style={{ fontSize: '11px', color: '#F95721', fontWeight: 700 }}>
                        Current: {currentStock} in stock
                    </span>
                </div>
                <select
                    className="search-input"
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 600 }}
                    value={selectedProductId}
                    onChange={e => handleProductSelect(e.target.value)}
                >
                    {products.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} (In Stock: {p.qty} • Cost: ₦{Number(p.buyPrice).toLocaleString()})
                        </option>
                    ))}
                </select>
            </div>

            {/* Intake Qty & Unit Cost */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Quantity to Add</label>
                    <input
                        type="number"
                        className="search-input"
                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px', fontSize: '14px', fontWeight: 700 }}
                        value={intakeQty}
                        onChange={e => setIntakeQty(e.target.value)}
                        min="1"
                        required
                    />
                </div>
                <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Cost Price (₦)</label>
                    <input
                        type="number"
                        className="search-input"
                        style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px', fontSize: '14px', fontWeight: 700 }}
                        value={unitCost}
                        onChange={e => setUnitCost(e.target.value)}
                        min="0"
                        required
                    />
                </div>
            </div>

            {/* Supplier */}
            <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Supplier / Wholesaler Source
                </label>
                <input
                    type="text"
                    className="search-input"
                    style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px', fontSize: '13px' }}
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    placeholder="e.g. Alhaji Musa Wholesalers"
                />
            </div>

            {/* Calculated Batch Total */}
            <div style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0369A1', textTransform: 'uppercase' }}>
                        PURCHASE TOTAL
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#0284C7', marginTop: '2px' }}>
                        {qtyNum} units @ ₦{costNum.toLocaleString()}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#F95721' }}>
                        ₦{batchTotal.toLocaleString()}.00
                    </div>
                </div>
            </div>

            <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 800, borderRadius: '12px' }}
            >
                + Record Purchase & Add Stock
            </button>
        </form>

            {/* Recent Purchases Ledger */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={16} color="#F95721" />
                        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Recent Purchases Ledger</h3>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>
                        {displayPurchases.length} batches logged
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {displayPurchases.map((item, idx) => (
                        <div
                            key={idx}
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #EDF2F7',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Package size={16} color="#0284C7" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{item.productName}</div>
                                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                                        {item.supplier || 'Direct Supplier'} • {item.qty} units
                                    </div>
                                    <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                                        {item.date ? (typeof item.date === 'string' && item.date.includes('T') ? item.date.split('T')[0] : item.date) : 'Recent'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                                    ₦{Number(item.totalCost).toLocaleString()}
                                </div>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '8px', background: '#ECFDF5', color: '#10B981', fontSize: '10.5px', fontWeight: 700, marginTop: '2px' }}>
                                    ✓ Restocked
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
