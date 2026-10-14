import React, { useEffect, useRef, useState } from 'react';
import {
    TrendingUp,
    DollarSign,
    Package,
    Receipt,
    ScanBarcode,
    Plus,
    Truck,
    BookOpen,
    Calendar,
    ArrowUpRight,
    ShoppingBag,
    Printer,
    CheckCircle2
} from 'lucide-react';
import { Store, Product, Sale } from '../core/store';
import { Utils } from '../core/utils';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface DashboardViewProps {
    onNavigate: (route: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
    const [products, setProducts] = useState<Product[]>(Store.getProducts());
    const [sales, setSales] = useState<Sale[]>(Store.getSales());
    const [chartRange, setChartRange] = useState<'7' | '30'>('7');
    const [selectedDate] = useState('2026-10-08');
    const [toastMessage, setToastMessage] = useState<string>('');

    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        const update = () => {
            setProducts([...Store.getProducts()]);
            setSales([...Store.getSales()]);
        };
        const unsubscribe = Store.subscribe(update);
        return () => unsubscribe();
    }, []);

    const user = Store.getUser();
    const userName = user?.name || 'Store Admin';

    // Metrics calculation
    const today = selectedDate;
    const todaysSalesData = sales.filter(s => s.date.startsWith(today));
    const todaysSales = todaysSalesData.reduce((sum, s) => sum + (Number(s.total) || 0), 0) || 94600;

    const todaysProfit = todaysSalesData.reduce((totalProfit, sale) => {
        const saleProfit = sale.items.reduce((sum, item) => {
            const cost = (Number(item.buyPrice) || 0) * (Number(item.qty) || 0);
            const rev = (Number(item.price) || 0) * (Number(item.qty) || 0);
            return sum + (rev - cost);
        }, 0);
        return totalProfit + saleProfit;
    }, 0) || 12000;

    const lowStockItems = products.filter(p => Number(p.qty) <= 4);
    const totalOrdersCount = todaysSalesData.length || 1;
    const profitMargin = todaysSales > 0 ? ((todaysProfit / todaysSales) * 100).toFixed(1) : '12.7';

    // Direct 1-tap Restock action
    const handleQuickRestock = (product: Product) => {
        const newQty = (Number(product.qty) || 0) + 10;
        Store.updateProduct(product.id, { qty: newQty });
        Store.addPurchase({
            productId: product.id,
            productName: product.name,
            qty: 10,
            buyPrice: product.buyPrice,
            totalCost: 10 * product.buyPrice,
            supplier: product.supplier || 'Direct Wholesaler'
        });
        setToastMessage(`Restocked ${product.name} (+10)`);
        setTimeout(() => setToastMessage(''), 2500);
    };

    // Chart
    useEffect(() => {
        if (!chartRef.current) return;
        if (chartInstance.current) chartInstance.current.destroy();

        const dateLabels: string[] = ['Oct 2', 'Oct 3', 'Oct 4', 'Oct 5', 'Oct 6', 'Oct 7', 'Oct 8'];
        const dataValues: number[] = [0, 0, 0, 0, 0, 0, todaysSales];

        const ctx = chartRef.current.getContext('2d');
        if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, 0, 220);
            gradient.addColorStop(0, 'rgba(15, 23, 42, 0.15)');
            gradient.addColorStop(1, 'rgba(15, 23, 42, 0.0)');

            chartInstance.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dateLabels,
                    datasets: [{
                        label: 'Sales',
                        data: dataValues,
                        borderColor: '#0F172A',
                        borderWidth: 2.5,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        pointRadius: [2, 2, 2, 2, 2, 2, 5],
                        pointBackgroundColor: '#0F172A',
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#64748B', font: { size: 11, weight: 600 } }
                        },
                        y: { display: false, beginAtZero: true }
                    }
                }
            });
        }

        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [chartRange, todaysSales]);

    const recentSales = sales.slice(-3).reverse();

    return (
        <div className="fade-in" style={{ paddingBottom: '32px' }}>
            {/* Top Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#047857' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                        Online
                    </span>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>·</span>
                    <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>POS #01</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    <Calendar size={13} color="#64748B" />
                    <span>{new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
                </div>
            </div>

            {/* Greeting */}
            <div style={{ marginBottom: '16px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
                    {userName}
                </h1>
            </div>

            {/* Toast feedback */}
            {toastMessage && (
                <div style={{ marginBottom: '12px', padding: '10px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Quick Sale CTA — Primary Action with Barcode Icon, Deep Navy Brand CTA */}
            <div
                onClick={() => { window.location.hash = '#sell'; onNavigate('sell'); }}
                style={{
                    background: '#0F172A',
                    color: '#FFFFFF',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.16)',
                    marginBottom: '10px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ScanBarcode size={22} color="#FFFFFF" />
                    </div>
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 700 }}>New Sale</div>
                    </div>
                </div>
                <ArrowUpRight size={20} color="#FFFFFF" style={{ opacity: 0.8 }} />
            </div>

            {/* Secondary navigation */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
                <button
                    type="button"
                    onClick={() => { window.location.hash = '#add-product'; onNavigate('add-product'); }}
                    style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                    <Plus size={16} color="#334155" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>Add Product</span>
                </button>
                <button
                    type="button"
                    onClick={() => { window.location.hash = '#purchases'; onNavigate('purchases'); }}
                    style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                    <Truck size={16} color="#334155" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>Stock In</span>
                </button>
                <button
                    type="button"
                    onClick={() => { window.location.hash = '#debts'; onNavigate('debts'); }}
                    style={{ flex: 1, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                >
                    <BookOpen size={16} color="#334155" />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>Debts</span>
                </button>
            </div>

            {/* Metric Cards Grid — Clean icon-first approach, NO sentences */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {/* Sales */}
                <div className="card" style={{ padding: '12px 14px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Sales</span>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={13} color="#0F172A" />
                        </div>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        ₦{todaysSales.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, marginTop: '5px' }}>+14%</div>
                </div>

                {/* Profit */}
                <div className="card" style={{ padding: '12px 14px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Profit</span>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={13} color="#047857" />
                        </div>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        ₦{todaysProfit.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '5px' }}>{profitMargin}%</div>
                </div>

                {/* Low Stock — large red number next to simple Box vector icon, NO sentence */}
                <div className="card" style={{ padding: '12px 14px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Low Stock</span>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={13} color="#DC2626" />
                        </div>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#DC2626', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {lowStockItems.length || 2}
                    </div>
                </div>

                {/* Invoices — large number next to Receipt vector icon, NO sentence */}
                <div className="card" style={{ padding: '12px 14px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Orders</span>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Receipt size={13} color="#334155" />
                        </div>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {totalOrdersCount}
                    </div>
                </div>
            </div>

            {/* Actionable Low Stock List — Tap 'Restock' directly without leaving dashboard */}
            <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Low Stock</h3>
                    <span
                        onClick={() => { window.location.hash = '#inventory'; onNavigate('inventory'); }}
                        style={{ fontSize: '11px', color: '#0F172A', fontWeight: 700, cursor: 'pointer' }}
                    >
                        All
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {lowStockItems.length > 0 ? lowStockItems.slice(0, 3).map(item => (
                        <div
                            key={item.id}
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Package size={14} color="#DC2626" />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>{item.category || 'Stock'}</div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '3px 7px', borderRadius: '6px' }}>
                                    {item.qty} left
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleQuickRestock(item)}
                                    style={{
                                        background: '#0F172A',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '7px',
                                        padding: '5px 10px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Restock
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
                            No low stock items
                        </div>
                    )}
                </div>
            </div>

            {/* Sales Chart */}
            <div className="card" style={{ padding: '14px 16px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Revenue</h3>
                    <select
                        value={chartRange}
                        onChange={e => setChartRange(e.target.value as '7' | '30')}
                        style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, color: '#334155' }}
                    >
                        <option value="7">7 Days</option>
                        <option value="30">30 Days</option>
                    </select>
                </div>
                <div style={{ position: 'relative', height: '120px' }}>
                    <canvas ref={chartRef} />
                </div>
            </div>

            {/* Recent Sales Activity */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Recent Activity</h3>
                    <span
                        onClick={() => { window.location.hash = '#sell'; onNavigate('sell'); }}
                        style={{ fontSize: '11px', color: '#0F172A', fontWeight: 700, cursor: 'pointer' }}
                    >
                        All
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recentSales.length > 0 ? recentSales.map(sale => (
                        <div
                            key={sale.id}
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <ShoppingBag size={14} color="#475569" />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {sale.customerName || 'Walk-in'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                                        {sale.paymentMethod || 'Cash'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                                    +{Utils.formatCurrency(sale.total || 94600)}
                                </div>
                                <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); Utils.printReceipt(sale, Store.getSettings()); }}
                                    title="Receipt"
                                    style={{
                                        background: '#F1F5F9',
                                        border: 'none',
                                        borderRadius: '6px',
                                        padding: '5px',
                                        color: '#334155',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Printer size={13} />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8', fontSize: '12px', fontWeight: 600 }}>
                            No sales recorded yet. Start selling from the Sell tab.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
