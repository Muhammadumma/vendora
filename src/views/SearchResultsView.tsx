import React from 'react';
import { Search, Package, ShoppingCart, FileWarning, Truck } from 'lucide-react';
import { Store } from '../core/store';
import { Utils } from '../core/utils';

interface SearchResultsViewProps {
    query: string;
    onNavigate: (route: string) => void;
}

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({ query, onNavigate }) => {
    const q = (query || '').toLowerCase().trim();

    const products = Store.getProducts().filter(p =>
        p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q)
    );

    const sales = Store.getSales().filter(s =>
        (s.customerName || '').toLowerCase().includes(q) ||
        s.items.some(it => it.name.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
    );

    const debts = Store.getDebts().filter(d =>
        d.debtor.toLowerCase().includes(q) ||
        (d.phone || '').includes(q) ||
        d.product.toLowerCase().includes(q)
    );

    const purchases = Store.getPurchases().filter(pur =>
        pur.productName.toLowerCase().includes(q) ||
        (pur.supplier || '').toLowerCase().includes(q)
    );

    const totalResults = products.length + sales.length + debts.length + purchases.length;

    return (
        <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '28px' }}>
                <h2 className="page-title" style={{ fontSize: '28px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={24} style={{ color: 'var(--primary-color)' }} />
                    Search Results for "{query}"
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Found {totalResults} matching record{totalResults === 1 ? '' : 's'} across your entire database.
                </p>
            </div>

            {totalResults === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <Search size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>No matches found</h3>
                    <p style={{ fontSize: '14px' }}>Try searching for a product name, customer name, or transaction ID.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Products */}
                    {products.length > 0 && (
                        <div className="card">
                            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={18} style={{ color: 'var(--primary-color)' }} />
                                Products ({products.length})
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                                {products.map(p => (
                                    <div
                                        key={p.id}
                                        style={{ padding: '12px', background: 'var(--bg-body)', borderRadius: '10px', cursor: 'pointer' }}
                                        onClick={() => { window.location.hash = '#inventory'; onNavigate('inventory'); }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.category}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px', fontWeight: 700 }}>
                                            <span>{Utils.formatCurrency(p.sellPrice)}</span>
                                            <span style={{ color: p.qty < 5 ? 'var(--danger-color)' : 'var(--success-color)' }}>{p.qty} in stock</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sales */}
                    {sales.length > 0 && (
                        <div className="card">
                            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShoppingCart size={18} style={{ color: 'var(--primary-color)' }} />
                                Sales Transactions ({sales.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {sales.map(s => (
                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-body)', borderRadius: '8px', fontSize: '14px' }}>
                                        <div>
                                            <span style={{ fontWeight: 600 }}>{s.customerName}</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>{s.id} • {s.items.length} item(s)</span>
                                        </div>
                                        <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                                            {Utils.formatCurrency(s.total)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Debts */}
                    {debts.length > 0 && (
                        <div className="card">
                            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileWarning size={18} style={{ color: 'var(--warning-color)' }} />
                                Debt Records ({debts.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {debts.map(d => (
                                    <div
                                        key={d.id}
                                        style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-body)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                                        onClick={() => { window.location.hash = '#debts'; onNavigate('debts'); }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 600 }}>{d.debtor}</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>{d.product}</span>
                                        </div>
                                        <div style={{ fontWeight: 700, color: 'var(--danger-color)' }}>
                                            {Utils.formatCurrency(d.amount)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Purchases */}
                    {purchases.length > 0 && (
                        <div className="card">
                            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Truck size={18} style={{ color: 'var(--primary-color)' }} />
                                Purchases & Restocks ({purchases.length})
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {purchases.map(pur => (
                                    <div key={pur.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-body)', borderRadius: '8px', fontSize: '14px' }}>
                                        <div>
                                            <span style={{ fontWeight: 600 }}>{pur.productName}</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>Supplier: {pur.supplier}</span>
                                        </div>
                                        <div style={{ fontWeight: 700 }}>
                                            {Utils.formatCurrency(pur.totalCost)} (+{pur.qty} units)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
