import React, { useState, useEffect } from 'react';
import {
    Plus,
    Download,
    Search,
    Edit2,
    Package,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react';
import { Store, Product } from '../core/store';
import { Utils } from '../core/utils';
import { computeMargin } from '../core/csvImporter';

interface InventoryViewProps {
    onNavigate: (route: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ onNavigate }) => {
    const [products, setProducts] = useState<Product[]>(Store.getProducts());
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // Modals
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
    const [restockQty, setRestockQty] = useState(10);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        const update = () => setProducts([...Store.getProducts()]);
        const unsubscribe = Store.subscribe(update);
        return () => unsubscribe();
    }, []);

    const valuation = products.reduce((sum, p) => sum + ((Number(p.qty) || 0) * (Number(p.buyPrice) || 0)), 0);
    const lowStockCount = products.filter(p => (Number(p.qty) || 0) <= (Number(p.threshold) || 5)).length;

    // Simplified filter names (no "(2)", no lengthy subtitles)
    const simplifyCategory = (cat: string) => {
        if (!cat) return 'Other';
        if (cat.toLowerCase().includes('grain') || cat.toLowerCase().includes('baking')) return 'Grains';
        if (cat.toLowerCase().includes('oil') || cat.toLowerCase().includes('fat')) return 'Oils';
        if (cat.toLowerCase().includes('package') || cat.toLowerCase().includes('food')) return 'Packaged';
        if (cat.toLowerCase().includes('dairy') || cat.toLowerCase().includes('milk')) return 'Dairy';
        return cat.split(' ')[0];
    };

    const uniqueRawCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    const categoryMap: Record<string, string> = {};
    uniqueRawCategories.forEach(raw => {
        categoryMap[simplifyCategory(raw)] = raw;
    });

    const filterOptions = ['All', 'Low Stock', ...Object.keys(categoryMap)];

    const filtered = products.filter(p => {
        const query = search.toLowerCase();
        const matchesQuery = p.name.toLowerCase().includes(query) ||
            (p.category || '').toLowerCase().includes(query) ||
            (p.sku || '').toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query);

        let matchesCat = true;
        if (selectedCategory === 'Low Stock') {
            matchesCat = (Number(p.qty) || 0) <= (Number(p.threshold) || 5);
        } else if (selectedCategory !== 'All') {
            matchesCat = simplifyCategory(p.category) === selectedCategory;
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
        Utils.downloadCSV(rows, `Vendora_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
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
        setToastMessage(`Updated ${editingProduct.name}`);
        setTimeout(() => setToastMessage(''), 2500);
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
        setToastMessage(`Restocked ${restockingProduct.name} (+${restockQty})`);
        setTimeout(() => setToastMessage(''), 2500);
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '36px' }}>
            {/* Header: Single short title */}
            <div style={{ marginBottom: '14px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Inventory</h1>
            </div>

            {/* Toast feedback */}
            {toastMessage && (
                <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Top Stat Cards — Clean and compact */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
                <div className="card" style={{ padding: '8px 10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Catalog</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                        {products.length}
                    </div>
                </div>

                <div className="card" style={{ padding: '8px 10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Valuation</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>
                        {valuation >= 1000000 ? `₦${(valuation / 1000000).toFixed(1)}M` : `₦${valuation.toLocaleString()}`}
                    </div>
                </div>

                <div className="card" style={{ padding: '8px 10px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>Low Stock</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: lowStockCount > 0 ? '#DC2626' : '#047857', margin: '2px 0 0' }}>
                        {lowStockCount}
                    </div>
                </div>
            </div>

            {/* Actions: New Product (Brand Dark Navy) & Export */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <button
                    type="button"
                    onClick={() => { window.location.hash = '#add-product'; onNavigate('add-product'); }}
                    style={{ padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: '#0F172A', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', justifyContent: 'center' }}
                >
                    <Plus size={16} /> New Product
                </button>
                <button
                    type="button"
                    onClick={handleExportCSV}
                    style={{ padding: '10px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', justifyContent: 'center' }}
                >
                    <Download size={15} /> Export
                </button>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                    type="text"
                    placeholder="Search inventory..."
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '36px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', height: '42px', fontSize: '13px' }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            </div>

            {/* Filter Pills — Small, concise labels without counts */}
            <div className="filter-pills-row" style={{ marginBottom: '14px', display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {filterOptions.map(cat => (
                    <button
                        key={cat}
                        type="button"
                        className={`filter-pill ${selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                            fontSize: '11.5px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: selectedCategory === cat ? '#0F172A' : '#FFFFFF',
                            color: selectedCategory === cat ? '#FFFFFF' : '#334155',
                            border: selectedCategory === cat ? '1px solid #0F172A' : '1px solid #E2E8F0',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Redesigned Product Cards: No text labels (Sell, Cost, Margin, Stock). Whole card clickable */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', color: '#64748B' }}>
                        <Package size={32} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>No items found</div>
                    </div>
                ) : (
                    filtered.map((prod) => {
                        const threshold = Number(prod.threshold) || 5;
                        const qty = Number(prod.qty) || 0;
                        const isOut = qty <= 0;
                        const isLow = !isOut && qty <= threshold;
                        const marginValue = computeMargin(Number(prod.buyPrice), Number(prod.sellPrice));
                        const marginPercentText = marginValue !== null ? `${Math.round(marginValue * 100)}%` : '—';

                        return (
                            <div
                                key={prod.id}
                                className="card"
                                onClick={() => setRestockingProduct(prod)}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.15s ease'
                                }}
                            >
                                {/* Top Row: Product Name + Stock Number Badge on Top Right */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div
                                            style={{
                                                fontSize: '14px',
                                                fontWeight: 800,
                                                color: '#0F172A',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                lineHeight: 1.3
                                            }}
                                            title={prod.name}
                                        >
                                            {prod.name}
                                        </div>
                                    </div>

                                    {/* Top Right: Small badge with stock number (e.g., '16 Left' or 'Out') */}
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        flexShrink: 0,
                                        background: isOut ? '#FEF2F2' : isLow ? '#FEF2F2' : '#F1F5F9',
                                        color: isOut ? '#DC2626' : isLow ? '#DC2626' : '#334155'
                                    }}>
                                        {isOut ? 'Out' : `${qty} Left`}
                                    </span>
                                </div>

                                {/* Price / Cost / Margin Row — NO text labels */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                    <div>
                                        {/* Main Text: Selling Price in large, bold text */}
                                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                                            ₦{Number(prod.sellPrice).toLocaleString()}
                                        </div>
                                        {/* Sub-text: Cost in small, gray text below the price */}
                                        <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>
                                            ₦{Number(prod.buyPrice).toLocaleString()}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {/* Small green pill badge for Margin percentage */}
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#047857',
                                            background: '#ECFDF5',
                                            padding: '2px 8px',
                                            borderRadius: '6px'
                                        }}>
                                            {marginPercentText}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setEditingProduct({ ...prod }); }}
                                            style={{ background: '#F1F5F9', border: 'none', borderRadius: '6px', padding: '5px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            title="Edit"
                                        >
                                            <Edit2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Quick Restock Modal (triggered by clicking card) */}
            {restockingProduct && (
                <div className="auth-overlay" onClick={() => setRestockingProduct(null)}>
                    <div className="auth-card fade-in" onClick={e => e.stopPropagation()} style={{ width: '360px', maxWidth: '92vw', padding: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: '#0F172A' }}>Restock</h3>
                        <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 16px' }}>{restockingProduct.name}</p>

                        <form onSubmit={handleConfirmRestock}>
                            <div style={{ marginBottom: '16px' }}>
                                <input
                                    type="number"
                                    min="1"
                                    className="search-input"
                                    style={{ width: '100%', fontSize: '16px', fontWeight: 700, textAlign: 'center', height: '44px' }}
                                    value={restockQty}
                                    onChange={e => setRestockQty(Number(e.target.value) || 1)}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setRestockingProduct(null)}
                                    style={{ flex: 1, padding: '10px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1, padding: '10px', background: '#0F172A', border: 'none' }}
                                >
                                    Confirm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="auth-overlay" onClick={() => setEditingProduct(null)}>
                    <div className="auth-card fade-in" onClick={e => e.stopPropagation()} style={{ width: '400px', maxWidth: '92vw', padding: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 14px', color: '#0F172A' }}>Edit Item</h3>
                        <form onSubmit={handleSaveEdit}>
                            <div style={{ marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="Product Name"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={editingProduct.name}
                                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                <input
                                    type="number"
                                    placeholder="Sell Price (₦)"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={editingProduct.sellPrice}
                                    onChange={e => setEditingProduct({ ...editingProduct, sellPrice: Number(e.target.value) })}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder="Cost Price (₦)"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={editingProduct.buyPrice}
                                    onChange={e => setEditingProduct({ ...editingProduct, buyPrice: Number(e.target.value) })}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="number"
                                    placeholder="Stock Qty"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={editingProduct.qty}
                                    onChange={e => setEditingProduct({ ...editingProduct, qty: Number(e.target.value) })}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Category"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={editingProduct.category}
                                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setEditingProduct(null)}
                                    style={{ flex: 1, padding: '10px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1, padding: '10px', background: '#0F172A', border: 'none' }}
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
