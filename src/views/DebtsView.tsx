import React, { useState, useEffect } from 'react';
import {
    Shield,
    Plus,
    Download,
    AlertTriangle,
    Search,
    Store as StoreIcon,
    ShoppingBag,
    Phone,
    MessageSquare,
    Send,
    CheckCircle2,
    FileText,
    Printer,
    Copy,
    Share2,
    X,
    Check,
    Calendar,
    Clock,
    CreditCard
} from 'lucide-react';
import { Store, Debt, Sale } from '../core/store';
import { Utils } from '../core/utils';

export const DebtsView: React.FC = () => {
    const [debts, setDebts] = useState<Debt[]>(Store.getDebts());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
    
    // Modals state
    const [showAddModal, setShowAddModal] = useState(false);
    const [settleModalDebt, setSettleModalDebt] = useState<Debt | null>(null);
    const [receiptModalSale, setReceiptModalSale] = useState<Sale | null>(null);
    const [remindModalDebt, setRemindModalDebt] = useState<Debt | null>(null);
    const [reminderText, setReminderText] = useState('');
    const [settlePaymentMethod, setSettlePaymentMethod] = useState<'Cash' | 'Bank' | 'POS'>('Cash');
    
    // Add debt form state
    const [debtor, setDebtor] = useState('');
    const [phone, setPhone] = useState('');
    const [product, setProduct] = useState('');
    const [amount, setAmount] = useState<number | string>('');
    const [dueDate, setDueDate] = useState(() => {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek.toISOString().split('T')[0];
    });

    // Feedback message
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [receiptStatus, setReceiptStatus] = useState('');

    useEffect(() => {
        const update = () => setDebts([...Store.getDebts()]);
        const unsubscribe = Store.subscribe(update);
        return () => unsubscribe();
    }, []);

    const totalStockValue = Store.getTotalStockValue() || 136000;
    const activeDebtTotal = Store.getActiveDebtTotal() || 0;
    const maxCreditCeiling = Math.round(totalStockValue * 0.3) || 40800;
    const exposureRatio = maxCreditCeiling > 0 ? Math.min(100, Math.round((activeDebtTotal / maxCreditCeiling) * 100)) : 0;
    const remainingBuffer = Math.max(0, maxCreditCeiling - activeDebtTotal);

    const activeDebts = debts.filter(d => d.status !== 'Paid' && d.status !== 'Settled');

    const filteredDebts = debts.filter(d => {
        const q = search.trim().toLowerCase();
        const matchesQuery = !q ||
            d.debtor.toLowerCase().includes(q) ||
            (d.phone || '').includes(q) ||
            (d.product || '').toLowerCase().includes(q) ||
            d.id.toLowerCase().includes(q);

        const isPaid = d.status === 'Paid' || d.status === 'Settled';
        let matchesStatus = true;
        if (statusFilter === 'pending') matchesStatus = !isPaid;
        if (statusFilter === 'paid') matchesStatus = isPaid;

        return matchesQuery && matchesStatus;
    });

    // Settle debt without blocked window.confirm
    const handleConfirmSettle = (debt: Debt) => {
        const settlementSale = Store.settleDebt(debt.id);
        setSettleModalDebt(null);
        setFeedbackMsg(`✓ Balance of ₦${Number(debt.amount).toLocaleString()} from ${debt.debtor} marked as settled!`);
        setTimeout(() => setFeedbackMsg(''), 4000);

        // Immediately open receipt so user can view/print
        const saleForReceipt = settlementSale || Store.getDebtReceipt(debt);
        setReceiptModalSale(saleForReceipt);
    };

    // View receipt for any debt
    const handleViewReceipt = (debt: Debt) => {
        const sale = Store.getDebtReceipt(debt);
        setReceiptModalSale(sale);
    };

    // Record new customer debt
    const handleRecordDebt = (e: React.FormEvent) => {
        e.preventDefault();
        const debtorName = debtor.trim();
        const debtAmt = Number(amount);

        if (!debtorName) {
            setFeedbackMsg('Customer name is required.');
            return;
        }
        if (!debtAmt || debtAmt <= 0) {
            setFeedbackMsg('Enter a valid debt amount.');
            return;
        }

        try {
            Store.addDebt({
                debtor: debtorName,
                phone: phone.trim(),
                product: product.trim() || 'Items taken on credit',
                amount: debtAmt,
                dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }, true);

            setShowAddModal(false);
            setDebtor('');
            setPhone('');
            setProduct('');
            setAmount('');
            setFeedbackMsg(`✓ Debt of ₦${debtAmt.toLocaleString()} recorded for ${debtorName}!`);
            setTimeout(() => setFeedbackMsg(''), 4000);
        } catch (err: any) {
            setFeedbackMsg(err.message || 'Could not save debt.');
        }
    };

    // Send reminder via note or WhatsApp
    const handleSendReminder = (e: React.FormEvent) => {
        e.preventDefault();
        if (remindModalDebt && reminderText.trim()) {
            Store.updateDebt(remindModalDebt.id, {
                newReason: `Reminder logged: ${reminderText.trim()}`
            });
            setRemindModalDebt(null);
            setFeedbackMsg(`✓ Reminder note saved for ${remindModalDebt.debtor}!`);
            setTimeout(() => setFeedbackMsg(''), 3000);
            setReminderText('');
        }
    };

    const handleOpenWhatsAppReminder = (debt: Debt) => {
        const cleanPhone = (debt.phone || '').replace(/[^0-9]/g, '');
        const message = `Hello ${debt.debtor}, this is a gentle reminder from ${Store.getSettings().businessName} regarding your outstanding balance of ₦${Number(debt.amount).toLocaleString()} for ${debt.product}. Due date: ${debt.dueDate ? debt.dueDate.split('T')[0] : 'soon'}. Thank you!`;
        const encoded = encodeURIComponent(message);
        if (cleanPhone) {
            window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
        } else {
            navigator.clipboard.writeText(message);
            setFeedbackMsg('✓ Reminder message copied to clipboard!');
            setTimeout(() => setFeedbackMsg(''), 3000);
        }
    };

    const handleExportCSV = () => {
        const rows = [
            ['ID', 'Debtor Name', 'Phone', 'Items / Description', 'Balance Payable (₦)', 'Due Date', 'Status'],
            ...debts.map(d => [
                d.id,
                d.debtor,
                d.phone || '',
                d.product || '',
                d.amount,
                d.dueDate ? d.dueDate.split('T')[0] : '',
                d.status
            ])
        ];
        Utils.downloadCSV(rows, `Customer_Debts_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
        setFeedbackMsg('✓ Customer debt ledger exported to CSV!');
        setTimeout(() => setFeedbackMsg(''), 3000);
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '36px' }}>
            {/* Header */}
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Customer Debts</h1>
                    <span style={{ padding: '2px 7px', borderRadius: '8px', background: '#FEF2F2', color: '#DC2626', fontSize: '10px', fontWeight: 800 }}>
                        Limit: 30% · Margin ₦{remainingBuffer.toLocaleString()}
                    </span>
                </div>
                <p style={{ color: '#64748B', fontSize: '11.5px', margin: 0 }}>
                    Track unpaid balances and settle debts with instant receipts.
                </p>
            </div>

            {/* Success / Alert Banner */}
            {feedbackMsg && (
                <div style={{ padding: '8px 12px', borderRadius: '10px', background: '#DCFCE7', border: '1px solid #86EFAC', color: '#15803D', fontSize: '12px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={14} />
                    <span>{feedbackMsg}</span>
                </div>
            )}

            {/* Quick Action Buttons - OPay Style Compact */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAddModal(true)}
                    style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, background: '#00B875', borderColor: '#00B875', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                    <Plus size={14} /> Record Debt
                </button>
                <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleExportCSV}
                    style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                    <Download size={13} /> Export Report
                </button>
            </div>

            {/* Compact 3-Column Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                {/* Metric 1 */}
                <div className="card" style={{ padding: '8px 6px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                        Unpaid Debt
                    </div>
                    <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#DC2626', margin: '2px 0 1px' }}>
                        ₦{activeDebtTotal.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                        {activeDebts.length} pending
                    </div>
                </div>

                {/* Metric 2 */}
                <div className="card" style={{ padding: '8px 6px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                        Credit Limit
                    </div>
                    <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', margin: '2px 0 1px' }}>
                        ₦{maxCreditCeiling.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                        30% limit
                    </div>
                </div>

                {/* Metric 3 */}
                <div className="card" style={{ padding: '8px 6px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                        Credit Used
                    </div>
                    <div style={{ fontSize: '15.5px', fontWeight: 800, color: exposureRatio > 80 ? '#DC2626' : '#F95721', margin: '2px 0 1px' }}>
                        {exposureRatio}%
                    </div>
                    <div style={{ fontSize: '10px', color: '#16A34A', fontWeight: 600 }}>
                        {remainingBuffer > 0 ? 'Safe' : 'Limit reached'}
                    </div>
                </div>
            </div>

            {/* Filter Pills & Search */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                    style={{ fontSize: '11px', padding: '4px 9px' }}
                >
                    All ({debts.length})
                </button>
                <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('pending')}
                    style={{ fontSize: '11px', padding: '4px 9px' }}
                >
                    Pending ({activeDebts.length})
                </button>
                <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'paid' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('paid')}
                    style={{ fontSize: '11px', padding: '4px 9px' }}
                >
                    Paid ({debts.length - activeDebts.length})
                </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
                <input
                    type="text"
                    placeholder="Search debtor name, phone, or goods..."
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '34px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', height: '36px', fontSize: '12px' }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '11px' }} />
            </div>

            {/* Debt Records List */}
            {filteredDebts.length === 0 ? (
                <div style={{ padding: '30px 20px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                    <p style={{ color: '#64748B', fontSize: '14px', margin: '0 0 12px' }}>
                        {debts.length === 0 ? 'No customer debts recorded yet.' : 'No debts match your filter.'}
                    </p>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                        style={{ fontSize: '13px', padding: '8px 16px' }}
                    >
                        + Record First Debt
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredDebts.map(d => {
                        const isPaid = d.status === 'Paid' || d.status === 'Settled';

                        return (
                            <div
                                key={d.id}
                                className="card"
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    background: '#FFFFFF',
                                    border: isPaid ? '1px solid #E2E8F0' : '1px solid #FECACA',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                }}
                            >
                                {/* OPay Payout Item Main Row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                        <div style={{ width: '28px', height: '28px', minWidth: '28px', borderRadius: '50%', background: isPaid ? '#DCFCE7' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <StoreIcon size={14} color={isPaid ? '#16A34A' : '#DC2626'} />
                                        </div>
                                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {d.debtor}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {d.phone ? `${d.phone} · ` : ''}{d.product || 'Items on credit'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right', marginLeft: '10px' }}>
                                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: isPaid ? '#16A34A' : '#DC2626' }}>
                                            ₦{Number(d.amount).toLocaleString()}.00
                                        </div>
                                        <span style={{
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            fontSize: '9.5px',
                                            fontWeight: 800,
                                            background: isPaid ? '#DCFCE7' : '#FEE2E2',
                                            color: isPaid ? '#15803D' : '#DC2626',
                                            display: 'inline-block'
                                        }}>
                                            {isPaid ? 'PAID' : 'PENDING'}
                                        </span>
                                    </div>
                                </div>

                                {/* OPay Payout Action Strip */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '5px', borderTop: '1px dashed #F1F5F9' }}>
                                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                                        {d.dueDate ? `Due: ${d.dueDate.split('T')[0]}` : ''}
                                    </div>

                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleViewReceipt(d)}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                border: '1px solid #CBD5E1',
                                                background: '#FFFFFF',
                                                color: '#334155',
                                                fontSize: '10.5px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px'
                                            }}
                                            title="View / Print Receipt"
                                        >
                                            <FileText size={11} color="#00B875" />
                                            <span>Receipt</span>
                                        </button>

                                        {!isPaid && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenWhatsAppReminder(d)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #BAE6FD',
                                                        background: '#F0F9FF',
                                                        color: '#0284C7',
                                                        fontSize: '10.5px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px'
                                                    }}
                                                    title="Send WhatsApp or copy notice"
                                                >
                                                    <Send size={10} />
                                                    <span>Remind</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setSettleModalDebt(d)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '10.5px',
                                                        fontWeight: 800,
                                                        background: '#00B875',
                                                        color: '#FFFFFF',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '3px'
                                                    }}
                                                >
                                                    <CheckCircle2 size={11} />
                                                    <span>Settle</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Record Debt Modal - Compact OPay Form */}
            {showAddModal && (
                <div className="auth-overlay">
                    <div className="auth-card fade-in" style={{ width: '360px', maxWidth: '92vw', padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Plus size={14} color="#00B875" />
                                </div>
                                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Record Customer Debt</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#64748B' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleRecordDebt}>
                            <div style={{ marginBottom: '8px' }}>
                                <label className="label" style={{ fontSize: '11px', marginBottom: '3px' }}>Customer Name *</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ width: '100%', height: '34px', fontSize: '12px', padding: '6px 10px' }}
                                    value={debtor}
                                    onChange={e => setDebtor(e.target.value)}
                                    placeholder="e.g. Mama Chinedu"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <label className="label" style={{ fontSize: '11px', marginBottom: '3px' }}>Customer Phone (Optional)</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ width: '100%', height: '34px', fontSize: '12px', padding: '6px 10px' }}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="0803 000 0000"
                                />
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <label className="label" style={{ fontSize: '11px', marginBottom: '3px' }}>Goods / Description *</label>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ width: '100%', height: '34px', fontSize: '12px', padding: '6px 10px' }}
                                    value={product}
                                    onChange={e => setProduct(e.target.value)}
                                    placeholder="e.g. 2 Cartons Indomie"
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                                <div>
                                    <label className="label" style={{ fontSize: '11px', marginBottom: '3px' }}>Amount (₦) *</label>
                                    <input
                                        type="number"
                                        className="search-input"
                                        style={{ width: '100%', height: '34px', fontSize: '12px', padding: '6px 10px' }}
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="14400"
                                        min="1"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label" style={{ fontSize: '11px', marginBottom: '3px' }}>Due Date *</label>
                                    <input
                                        type="date"
                                        className="search-input"
                                        style={{ width: '100%', height: '34px', fontSize: '12px', padding: '6px 8px' }}
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ fontSize: '12px', padding: '7px 16px', fontWeight: 800, background: '#00B875', borderColor: '#00B875' }}>
                                    Save Debt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* OPay Payout Style Settle Debt Confirmation Modal */}
            {settleModalDebt && (
                <div className="auth-overlay">
                    <div className="auth-card fade-in" style={{ width: '360px', maxWidth: '92vw', padding: '16px' }}>
                        {/* Top Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle2 size={15} color="#00B875" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '14.5px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                                        Settle Customer Debt
                                    </h3>
                                    <span style={{ fontSize: '10.5px', color: '#64748B' }}>OPay Payout Settlement</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettleModalDebt(null)}
                                style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: '#64748B' }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* OPay Highlight Amount Card */}
                        <div style={{
                            background: '#F0FDF4',
                            border: '1px solid #86EFAC',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            textAlign: 'center',
                            marginBottom: '10px'
                        }}>
                            <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Payout Amount Due
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: '2px 0' }}>
                                ₦{Number(settleModalDebt.amount).toLocaleString()}.00
                            </div>
                            <div style={{ fontSize: '11px', color: '#15803D', fontWeight: 700 }}>
                                Customer: {settleModalDebt.debtor}
                            </div>
                        </div>

                        {/* OPay Transaction Breakdown Slip */}
                        <div style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            marginBottom: '10px',
                            fontSize: '11.5px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                <span>Customer</span>
                                <strong style={{ color: '#0F172A' }}>{settleModalDebt.debtor}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                <span>Phone</span>
                                <span style={{ color: '#0F172A' }}>{settleModalDebt.phone || 'No phone'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                <span>Goods Taken</span>
                                <span style={{ color: '#0F172A', maxWidth: '170px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {settleModalDebt.product}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                <span>Due Date</span>
                                <span style={{ color: '#0F172A' }}>
                                    {settleModalDebt.dueDate ? settleModalDebt.dueDate.split('T')[0] : 'N/A'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', paddingTop: '4px', borderTop: '1px dashed #CBD5E1' }}>
                                <span>Payout Fee</span>
                                <span style={{ color: '#16A34A', fontWeight: 700 }}>₦0.00 (Free)</span>
                            </div>
                        </div>

                        {/* Payment Method Selector */}
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                                Payment Channel
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                                {(['Cash', 'Bank', 'POS'] as const).map(ch => (
                                    <button
                                        key={ch}
                                        type="button"
                                        onClick={() => setSettlePaymentMethod(ch)}
                                        style={{
                                            padding: '6px',
                                            borderRadius: '8px',
                                            border: settlePaymentMethod === ch ? '2px solid #00B875' : '1px solid #CBD5E1',
                                            background: settlePaymentMethod === ch ? '#ECFDF5' : '#FFFFFF',
                                            color: settlePaymentMethod === ch ? '#00B875' : '#334155',
                                            fontWeight: 800,
                                            fontSize: '11.5px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {ch}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* OPay Full Width Confirm Button */}
                        <button
                            type="button"
                            onClick={() => handleConfirmSettle(settleModalDebt)}
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 800,
                                background: '#00B875',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 6px rgba(0, 184, 117, 0.25)',
                                marginBottom: '6px'
                            }}
                        >
                            <Check size={16} /> Confirm Settlement & Issue Receipt
                        </button>

                        <button
                            type="button"
                            onClick={() => setSettleModalDebt(null)}
                            style={{
                                width: '100%',
                                padding: '6px',
                                background: 'transparent',
                                border: 'none',
                                color: '#64748B',
                                fontSize: '11.5px',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Complete Authentic Receipt Modal */}
            {receiptModalSale && (
                <div
                    className="auth-overlay no-print receipt-modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setReceiptModalSale(null);
                    }}
                >
                    <div className="receipt-modal-container fade-in" style={{ maxWidth: '420px', width: '92vw' }}>
                        {/* Header */}
                        <div className="receipt-modal-header" style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <FileText size={16} color="#F95721" />
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Debt & Payment Receipt</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReceiptModalSale(null)}
                                style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: '#64748B' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {receiptStatus && (
                            <div style={{ margin: '8px 16px 0', padding: '8px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: '10px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>
                                {receiptStatus}
                            </div>
                        )}

                        {/* Thermal Paper View */}
                        <div style={{ padding: '14px 18px', maxHeight: '58vh', overflowY: 'auto' }}>
                            <div
                                style={{
                                    background: '#FFFFFF',
                                    border: '1px dashed #CBD5E1',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    color: '#0F172A',
                                    lineHeight: 1.4
                                }}
                                dangerouslySetInnerHTML={{
                                    __html: Utils.generateReceiptPrintContent(receiptModalSale, Store.getSettings())
                                }}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    Utils.printReceipt(receiptModalSale, Store.getSettings());
                                    setReceiptStatus('🖨️ Opening print dialog...');
                                    setTimeout(() => setReceiptStatus(''), 3000);
                                }}
                                style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Printer size={14} /> Print
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => {
                                    Utils.downloadReceipt(receiptModalSale, Store.getSettings());
                                    setReceiptStatus('✓ Receipt HTML file saved');
                                    setTimeout(() => setReceiptStatus(''), 3000);
                                }}
                                style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 700, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Download size={14} /> Download
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={async () => {
                                    const ok = await Utils.copyReceiptText(receiptModalSale, Store.getSettings());
                                    if (ok) {
                                        setReceiptStatus('✓ Copied to clipboard');
                                        setTimeout(() => setReceiptStatus(''), 3000);
                                    }
                                }}
                                style={{ padding: '10px 8px', fontSize: '12px', fontWeight: 700, background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Copy size={14} /> Copy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
