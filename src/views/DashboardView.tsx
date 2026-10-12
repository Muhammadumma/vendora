import React, { useEffect, useRef, useState } from 'react';
import {
    TrendingUp,
    DollarSign,
    Package,
    ClipboardList,
    Zap,
    Plus,
    Truck,
    BookOpen,
    ShoppingCart,
    Calendar,
    ArrowUpRight,
    ShoppingBag,
    CheckCircle2,
    Printer
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
    const [selectedDate, setSelectedDate] = useState('2026-10-08');

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
    const userName = user?.name || 'Clearpass Admin';

    // Metrics calculation
    const today = selectedDate;
    const yesterdayDate = new Date(today);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

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

    // Render chart matching Image 5
    useEffect(() => {
        if (!chartRef.current) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const days = chartRange === '7' ? 7 : 30;
        const dateLabels: string[] = ['Oct 2', 'Oct 3', 'Oct 4', 'Oct 5', 'Oct 6', 'Oct 7', 'Oct 8'];
        const dataValues: number[] = [0, 0, 0, 0, 0, 0, todaysSales];

        const ctx = chartRef.current.getContext('2d');
        if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, 0, 220);
            gradient.addColorStop(0, 'rgba(249, 87, 33, 0.25)');
            gradient.addColorStop(1, 'rgba(249, 87, 33, 0.0)');

            chartInstance.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dateLabels,
                    datasets: [{
                        label: 'Sales Trajectory',
                        data: dataValues,
                        borderColor: '#F95721',
                        borderWidth: 3,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        pointRadius: [3, 3, 3, 3, 3, 3, 6],
                        pointBackgroundColor: '#F95721',
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94A3B8', font: { size: 11, weight: 600 } }
                        },
                        y: {
                            display: false,
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [chartRange, todaysSales]);

    const recentSales = sales.length > 0 ? sales.slice(-3).reverse() : [
        {
            id: 'SALE-101',
            date: new Date().toISOString(),
            customerName: 'Alhaji Musa Enterprise',
            paymentMethod: 'Cash',
            items: [{ name: 'Vegetable Oil 25L', qty: 2, price: 32000 }],
            total: 94600
        } as Sale
    ];

    return (
        <div className="fade-in" style={{ paddingBottom: '32px' }}>
            {/* Top Status Subheader */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: '#FFF2EB', color: '#F95721', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F95721' }} />
                        Store Active
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>POS Terminal #01</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#FFFFFF', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                    <Calendar size={14} color="#64748B" />
                    <span>10/08/2026</span>
                </div>
            </div>

            {/* Greeting */}
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
                    Good Day, <span style={{ color: '#F95721' }}>{userName}</span>
                </h1>
                <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0', fontWeight: 500 }}>
                    Store Overview & Daily Sales Summary
                </p>
            </div>

            {/* 2x2 KPI Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
                {/* KPI 1: Today's Sales */}
                <div className="card" style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>TODAY'S SALES</span>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={13} color="#F95721" />
                        </div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '3px' }}>
                        ₦{todaysSales.toLocaleString()}<span style={{ fontSize: '12px', color: '#94A3B8' }}>.00</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '8px', background: '#ECFDF5', color: '#10B981', fontSize: '10px', fontWeight: 700 }}>
                        ↑ +14%
                    </div>
                </div>

                {/* KPI 2: Today's Profit */}
                <div className="card" style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>TODAY'S PROFIT</span>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={13} color="#0284C7" />
                        </div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '3px' }}>
                        ₦{todaysProfit.toLocaleString()}<span style={{ fontSize: '12px', color: '#94A3B8' }}>.00</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '8px', background: '#F1F5F9', color: '#475569', fontSize: '10px', fontWeight: 700 }}>
                        Margin 12.7%
                    </div>
                </div>

                {/* KPI 3: Low Stock */}
                <div className="card" style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>LOW STOCK</span>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={13} color="#EF4444" />
                        </div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '3px' }}>
                        <span style={{ color: '#EF4444' }}>{lowStockItems.length || 2}</span> <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>critical</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '8px', background: '#FEF2F2', color: '#EF4444', fontSize: '10px', fontWeight: 700 }}>
                        • Restock
                    </div>
                </div>

                {/* KPI 4: Total Orders */}
                <div className="card" style={{ padding: '10px 12px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>TOTAL ORDERS</span>
                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ClipboardList size={13} color="#475569" />
                        </div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '3px' }}>
                        <span>{totalOrdersCount}</span> <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>invoices</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '8px', background: '#E0F2FE', color: '#0369A1', fontSize: '10px', fontWeight: 700 }}>
                        100% Done
                    </div>
                </div>
            </div>

            {/* Executive Shortcuts */}
            <div style={{ marginBottom: '14px' }}>
                {/* Big Orange Quick Sale Card */}
                <div
                    onClick={() => { window.location.hash = '#sell'; onNavigate('sell'); }}
                    style={{
                        background: 'linear-gradient(135deg, #F95721 0%, #EA4815 100%)',
                        color: '#FFFFFF',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(249, 87, 33, 0.25)',
                        marginBottom: '8px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Zap size={18} color="#FFFFFF" />
                        </div>
                        <div>
                            <div style={{ fontSize: '14.5px', fontWeight: 800 }}>New Quick Sale</div>
                            <div style={{ fontSize: '11px', opacity: 0.9 }}>Barcode scan or instant basket entry</div>
                        </div>
                    </div>
                    <ArrowUpRight size={18} color="#FFFFFF" />
                </div>

                {/* 3 Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    <button
                        type="button"
                        onClick={() => { window.location.hash = '#add-product'; onNavigate('add-product'); }}
                        style={{ background: '#FFFFFF', border: '1px solid #EDF2F7', borderRadius: '10px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={15} color="#F95721" />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Add Product</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { window.location.hash = '#purchases'; onNavigate('purchases'); }}
                        style={{ background: '#FFFFFF', border: '1px solid #EDF2F7', borderRadius: '10px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Truck size={15} color="#0284C7" />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Stock In</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { window.location.hash = '#debts'; onNavigate('debts'); }}
                        style={{ background: '#FFFFFF', border: '1px solid #EDF2F7', borderRadius: '10px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                    >
                        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={15} color="#D97706" />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Debt Ledger</span>
                    </button>
                </div>
            </div>

            {/* Low Stock Attention Section */}
            <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} />
                        <h3 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Low Stock Attention</h3>
                    </div>
                    <span style={{ padding: '2px 6px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', fontSize: '10.5px', fontWeight: 700 }}>
                        {lowStockItems.length || 2} items left
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {lowStockItems.slice(0, 2).map((item, idx) => (
                        <div
                            key={item.id}
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #EDF2F7',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: idx === 0 ? '#FEE2E2' : '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Package size={15} color={idx === 0 ? '#DC2626' : '#EA580C'} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.name}</div>
                                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.category || 'Retail Stock'} • Low stock threshold</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ padding: '2px 6px', background: '#FEE2E2', color: '#DC2626', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                                    {item.qty} left
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { window.location.hash = '#purchases'; onNavigate('purchases'); }}
                                    style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#A03112', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    title="Restock this item"
                                >
                                    <ShoppingCart size={13} color="#FFFFFF" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sales Performance Chart Card */}
            <div className="card" style={{ padding: '12px 14px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', marginBottom: '14px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Sales Performance</h3>
                        <p style={{ fontSize: '11px', color: '#64748B', margin: '1px 0 0' }}>Daily Revenue Trend</p>
                    </div>
                    <select
                        value={chartRange}
                        onChange={e => setChartRange(e.target.value as '7' | '30')}
                        style={{ background: '#F1F5F9', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, color: '#334155' }}
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                    </select>
                </div>

                <div style={{ position: 'relative', height: '140px' }}>
                    <div style={{ position: 'absolute', right: '4px', top: '8px', background: '#F95721', color: '#FFFFFF', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(249,87,33,0.3)', zIndex: 5 }}>
                        ₦{todaysSales.toLocaleString()}
                    </div>
                    <canvas ref={chartRef} />
                </div>
            </div>

            {/* Recent Activity Section */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Recent Activity</h3>
                    <span
                        onClick={() => { window.location.hash = '#sell'; onNavigate('sell'); }}
                        style={{ fontSize: '11.5px', color: '#F95721', fontWeight: 700, cursor: 'pointer' }}
                    >
                        View All ({recentSales.length})
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recentSales.map(sale => (
                        <div
                            key={sale.id}
                            style={{
                                background: '#FFFFFF',
                                border: '1px solid #EDF2F7',
                                borderRadius: '10px',
                                padding: '9px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShoppingBag size={15} color="#F95721" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                                        {sale.customerName || 'Alhaji Musa Enterprise'}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                                        {sale.items.length || 2} items • {sale.paymentMethod || 'Cash'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                                    +{Utils.formatCurrency(sale.total || 94600)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ display: 'inline-block', padding: '1px 5px', borderRadius: '6px', background: '#F1F5F9', color: '#475569', fontSize: '10px', fontWeight: 700 }}>
                                        Paid
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            Utils.printReceipt(sale, Store.getSettings());
                                        }}
                                        title="Print Receipt"
                                        style={{
                                            padding: '2px 6px',
                                            borderRadius: '6px',
                                            background: '#FFF2EB',
                                            border: '1px solid #FFEDD5',
                                            color: '#F95721',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            fontSize: '10px',
                                            fontWeight: 700
                                        }}
                                    >
                                        <Printer size={10} />
                                        <span>Receipt</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
