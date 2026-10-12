import React, { useState, useEffect } from 'react';
import {
    Plus,
    Download,
    Search,
    Edit2,
    Package,
    AlertTriangle,
    Flame,
    TrendingUp,
    CheckCircle2,
    Lightbulb
} from 'lucide-react';
import { Store, Product } from '../core/store';
import { Utils } from '../core/utils';
import { computeMargin, pluralize } from '../core/csvImporter';

interface InventoryViewProps {
    onNavigate: (route: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onNavigate }) => {
    const [products, setProducts] = useState<Product[]>(Store.getProducts());
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Stock');

    // Modals
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
    const [restockQty, setRestockQty] = useState(10);

    useEffect(() => {
        const update = () => setProducts([...Store.getProducts()]);
        const unsubscribe = Store.subscribe(update);
        return () => unsubscribe();
    }, []);

    // Dynamic calculations directly from products state (invalidates whenever items change)
    const valuation = products.reduce((sum, p) => sum + ((Number(p.qty) || 0) * (Number(p.buyPrice) || 0)), 0);
    const retailValue = products.reduce((sum, p) => sum + ((Number(p.qty) || 0) * (Number(p.sellPrice) || 0)), 0);
    const avgMargin = retailValue > 0 ? (retailValue - valuation) / retailValue : 0;
    const lowStockCount = products.filter(p => (Number(p.qty) || 0) <= (Number(p.threshold) || 5)).length;

    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const categories = [
        `All Stock (${products.length})`,
        `Low & Critical (${lowStockCount})`,
        ...uniqueCategories
    ];

    const filtered = products.filter(p => {
        const query = search.toLowerCase();
        const matchesQuery = p.name.toLowerCase().includes(query) ||
            (p.category || '').toLowerCase().includes(query) ||
            (p.sku || '').toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query);

        let matchesCat = true;
        if (selectedCategory.startsWith('Low & Critical')) {
            matchesCat = (Number(p.qty) || 0) <= (Number(p.threshold) || 5);
        } else if (!selectedCategory.startsWith('All Stock')) {
            matchesCat = p.category === selectedCategory;
        }
        return matchesQuery && matchesCat;
    });

    const handleExportCSV = () => {
        const rows = [
            ['Product Title', 'Category', 'SKU / Barcode ID', 'Stock Quantity', 'Unit Cost (₦)', 'Selling Price (₦)', 'Margin (%)', 'Assigned Supplier', 'Low Stock Alert Threshold'],
            ...products.map(p => {
                const margin = computeMargin(p.buyPrice, p.sellPrice);
                const marginStr = margin !== null ? `${(margin * 100).toFixed(1)}%` : '—';
                return [
                    p.name,
                    p.category,
                    p.sku || p.id,
                    p.qty,
                    p.buyPrice,
                    p.sellPrice,
                    marginStr,
                    p.supplier || 'Direct Wholesaler',
                    p.threshold ?? 5
                ];
            })
        ];
        Utils.downloadCSV(rows, `Stock_Control_Hub_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        Store.updateProduct(editingProduct.id, {
            name: editingProduct.name,
            sku: editingProduct.sku,
            category: editingProduct.category,
            qty: Number(editingProduct.qty),
            buyPrice: Number(editingProduct.buyPrice),
            sellPrice: Number(editingProduct.sellPrice),
            threshold: Number(editingProduct.threshold) || 5,
            supplier: editingProduct.supplier || ''
        });
        setEditingProduct(null);
    };

    const handleConfirmRestock = (e: React.FormEvent) => {
        e.preventDefault();
        if (!restockingProduct) return;
        Store.addPurchase({
            productId: restockingProduct.id,
            productName: restockingProduct.name,
            qty: Number(restockQty),
            buyPrice: restockingProduct.buyPrice,
            totalCost: Number(restockQty) * restockingProduct.buyPrice,
            supplier: restockingProduct.supplier || 'Direct Wholesaler'
        });
        setRestockingProduct(null);
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '36px' }}>
            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                    STOCK CONTROL HUB
                </span>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Inventory Directory</h1>
                <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0' }}>
                    Live stock tracking, retail margins & dynamic pricing rules
                </p>
            </div>

            {/* Top 3 Stat Cards - Dynamic Valuation & Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                {/* Total SKUs */}
                <div className="card" style={{ padding: '8px 10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>Total SKUs</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '2px 0 1px' }}>
                        {products.length}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>Active catalog</div>
                </div>

                {/* Stock Valuation */}
                <div className="card" style={{ padding: '8px 10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>Valuation</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '2px 0 1px' }}>
                        {valuation >= 1000000
                            ? `₦${(valuation / 1000000).toFixed(2)}M`
                            : `₦${valuation.toLocaleString()}`}
                    </div>
                    <div style={{ fontSize: '10px', color: avgMargin >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                        {avgMargin >= 0 ? '+' : ''}{(avgMargin * 100).toFixed(1)}% margin
                    </div>
                </div>

                {/* Low Stock Alert */}
                <div className="card" style={{ padding: '8px 10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>Low Stock</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: lowStockCount > 0 ? '#EF4444' : '#10B981', margin: '2px 0 1px' }}>
                        {lowStockCount}
                    </div>
                    <div style={{ fontSize: '10px', color: lowStockCount > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                        {lowStockCount > 0 ? 'Reorder' : 'Healthy'}
                    </div>
                </div>
            </div>

            {/* Action Buttons: New Product & Export */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => { window.location.hash = '#add-product'; onNavigate('add-product'); }}
                    style={{ padding: '10px 16px', borderRadius: '12px', fontSize: '13.5px', fontWeight: 800 }}
                >
                    <Plus size={16} /> New Product
                </button>
                <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleExportCSV}
                    style={{ padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: '#FFFFFF' }}
                >
                    <Download size={14} /> Export
                </button>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
                <input
                    type="text"
                    placeholder="Search by item name, SKU or barcode..."
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '38px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', height: '44px', fontSize: '13px' }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            </div>

            {/* Filter Pills */}
            <div className="filter-pills-row" style={{ marginBottom: '18px' }}>
                {categories.map(cat => (
                    <button
                        key={cat}
                        type="button"
                        className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Product Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #EDF2F7', color: '#64748B' }}>
                        <Package size={36} color="#CBD5E1" style={{ margin: '0 auto 10px' }} />
                        <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>No products found</h4>
                        <p style={{ fontSize: '13px', margin: 0 }}>Try clearing your search query or onboard products via Batch / CSV.</p>
                    </div>
                ) : (
                    filtered.map((prod, idx) => {
                        const threshold = Number(prod.threshold) || 5;
                        const qty = Number(prod.qty) || 0;
                        const isOut = qty <= 0;
                        const isUrgent = !isOut && (qty <= Math.ceil(threshold / 2) || qty <= 2);
                        const isLow = !isOut && qty <= threshold;
                        const profit = Number(prod.sellPrice) - Number(prod.buyPrice);
                        const marginValue = computeMargin(Number(prod.buyPrice), Number(prod.sellPrice));
                        const marginPercentText = marginValue !== null ? `${(marginValue * 100).toFixed(1)}%` : '—';
                        const displaySKU = prod.sku || prod.id;

                        return (
                            <div
                                key={prod.id}
                                className="card"
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    background: '#FFFFFF',
                                    border: '1px solid #EDF2F7',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                            >
                                {/* Card Top Row: Icon, Title, SKU & Stock Status Badge */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                        <div style={{ width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0, background: idx % 3 === 0 ? '#FFF2EB' : idx % 3 === 1 ? '#FEF2F2' : '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Package size={15} color={idx % 3 === 0 ? '#F95721' : idx % 3 === 1 ? '#DC2626' : '#0284C7'} />
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div
                                                style={{
                                                    fontSize: '13.5px',
                                                    fontWeight: 800,
                                                    color: '#0F172A',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    lineHeight: 1.25
                                                }}
                                                title={prod.name}
                                            >
                                                {prod.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                SKU: {displaySKU}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stock Status Badge */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <span style={{
                                            padding: '2px 7px',
                                            borderRadius: '8px',
                                            fontSize: '10.5px',
                                            fontWeight: 800,
                                            display: 'inline-block',
                                            background: isOut ? '#FEF2F2' : isUrgent ? '#FEF2F2' : isLow ? '#FFF2EB' : '#ECFDF5',
                                            color: isOut ? '#DC2626' : isUrgent ? '#DC2626' : isLow ? '#EA580C' : '#16A34A'
                                        }}>
                                            {isOut
                                                ? '⚠️ Out of stock'
                                                : isUrgent
                                                    ? `⚠️ ${qty} urgent`
                                                    : isLow
                                                        ? `• ${qty} left`
                                                        : `• ${qty} in stock`}
                                        </span>
                                    </div>
                                </div>

                                {/* Warnings banner if imported with warnings */}
                                {prod.warnings && prod.warnings.length > 0 && (
                                    <div style={{ padding: '4px 8px', borderRadius: '6px', background: '#FEF3C7', color: '#92400E', fontSize: '10.5px', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <AlertTriangle size={12} color="#D97706" />
                                        <span>{prod.warnings.join(' • ')}</span>
                                    </div>
                                )}

                                {/* Compact Metrics Ribbon: Selling Price, Cost Price, Margin */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: '#F8FAFC',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    marginBottom: '8px',
                                    fontSize: '11.5px'
                                }}>
                                    <div>
                                        <span style={{ color: '#64748B', fontWeight: 600 }}>Sell: </span>
                                        <strong style={{ color: '#F95721', fontSize: '13.5px' }}>₦{Number(prod.sellPrice).toLocaleString()}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748B', fontWeight: 600 }}>Cost: </span>
                                        <strong style={{ color: '#0F172A' }}>₦{Number(prod.buyPrice).toLocaleString()}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748B', fontWeight: 600 }}>Margin: </span>
                                        <strong style={{ color: profit >= 0 ? '#16A34A' : '#EF4444' }}>{marginPercentText}</strong>
                                    </div>
                                </div>

                                {/* Card Bottom Row: Stock Quantity & Compact Actions */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                                        Stock: <strong style={{ color: '#0F172A' }}>{qty} {pluralize(qty, 'unit')}</strong>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setEditingProduct({ ...prod })}
                                            style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
                                        >
                                            <Edit2 size={12} /> Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setRestockingProduct(prod); setRestockQty(10); }}
                                            style={{ background: '#A03112', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
                                        >
                                            <Plus size={12} /> Restock
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bottom Auto-Reorder Suggestion Card */}
            <div style={{
                background: '#FFF2EB',
                border: '1px solid rgba(249, 87, 33, 0.2)',
                borderRadius: '18px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F95721', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lightbulb size={20} color="#FFFFFF" />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Bulk Inventory Management</div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                            Upload supplier spreadsheets via Batch / CSV to update inventory in bulk.
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => { window.location.hash = '#add-product'; onNavigate('add-product'); }}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 700, borderRadius: '10px', whiteSpace: 'nowrap' }}
                >
                    Batch CSV
                </button>
            </div>

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="auth-overlay">
                    <div className="auth-card fade-in" style={{ width: '420px', maxWidth: '92vw', padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px' }}>Edit Product</h3>
                        <form onSubmit={handleSaveEdit}>
                            <div style={{ marginBottom: '12px' }}>
                                <label className="label">Product Title</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ width: '100%' }}
                                    value={editingProduct.name}
                                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                <div>
                                    <label className="label">SKU</label>
                                    <input
                                        type="text"
                                        className="search-input"
                                        style={{ width: '100%' }}
                                        value={editingProduct.sku || ''}
                                        onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label">Category</label>
                                    <input
                                        type="text"
                                        className="search-input"
                                        style={{ width: '100%' }}
                                        value={editingProduct.category}
                                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                <div>
                                    <label className="label">Stock Qty</label>
                                    <input
                                        type="number"
                                        className="search-input"
                                        style={{ width: '100%' }}
                                        value={editingProduct.qty}
                                        onChange={e => setEditingProduct({ ...editingProduct, qty: Number(e.target.value) })}
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Low Alert Threshold</label>
                                    <input
                                        type="number"
                                        className="search-input"
                                        style={{ width: '100%' }}
                                        value={editingProduct.threshold ?? 5}
                                        onChange={e => setEditingProduct({ ...editingProduct, threshold: Number(e.target.value) })}
                                        min="0"
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                <div>
                                    <label className="label">Cost Price (₦)</label>
                                    <input
                                        type="number"
                                        className="search-input"
                                        style={{ width: '100%' }}
                                        value={editingProduct.buyPrice}
                                        onChange={e => setEditingProduct({ ...editingProduct, buyPrice: Number(e.target.value) })}
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Selling Price (₦)</label>
                                    <input
                                        type="number"
                                        className="search-input"
                                        style={{ width: '100%' }}
                                        value={editingProduct.sellPrice}
                                        onChange={e => setEditingProduct({ ...editingProduct, sellPrice: Number(e.target.value) })}
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setEditingProduct(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Restock Modal */}
            {restockingProduct && (
                <div className="auth-overlay">
                    <div className="auth-card fade-in" style={{ width: '380px', maxWidth: '92vw', padding: '24px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>Restock Inventory</h3>
                        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>{restockingProduct.name}</p>
                        <form onSubmit={handleConfirmRestock}>
                            <div style={{ marginBottom: '16px' }}>
                                <label className="label">Quantity to Add</label>
                                <input
                                    type="number"
                                    className="search-input"
                                    style={{ width: '100%', fontSize: '18px', fontWeight: 800 }}
                                    value={restockQty}
                                    onChange={e => setRestockQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    min="1"
                                    required
                                />
                            </div>
                            <div style={{ padding: '12px', borderRadius: '12px', background: '#F8FAFC', marginBottom: '18px', fontSize: '12px', color: '#475569' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>Unit Cost:</span>
                                    <strong>₦{Number(restockingProduct.buyPrice).toLocaleString()}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Total Purchase Cost:</span>
                                    <strong style={{ color: '#F95721' }}>₦{(restockQty * restockingProduct.buyPrice).toLocaleString()}</strong>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setRestockingProduct(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Confirm Restock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
