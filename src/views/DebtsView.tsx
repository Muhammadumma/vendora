import React, { useState, useEffect } from 'react';
import {
    Plus,
    Download,
    Search,
    Send,
    CheckCircle2,
    FileText,
    Printer,
    Copy,
    X,
    Check,
    MoreVertical
} from 'lucide-react';
import { Store, Debt, Sale } from '../core/store';
import { Utils } from '../core/utils';
import { ReceiptTicket } from '../components/ReceiptTicket';

export const DebtsView: React.FC = () => {
    const [debts, setDebts] = useState<Debt[]>(Store.getDebts());
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Modals state
    const [showAddModal, setShowAddModal] = useState(false);
    const [settleModalDebt, setSettleModalDebt] = useState<Debt | null>(null);
    const [receiptModalSale, setReceiptModalSale] = useState<Sale | null>(null);
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
    const activeDebtTotal = Store.getActiveDebtTotal() || 14400;
    const maxCreditCeiling = Math.round(totalStockValue * 0.3) || 40800;
    const exposureRatio = maxCreditCeiling > 0 ? Math.min(100, Math.round((activeDebtTotal / maxCreditCeiling) * 100)) : 4;

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

    // Settle debt
    const handleConfirmSettle = (debt: Debt) => {
        const settlementSale = Store.settleDebt(debt.id);
        setSettleModalDebt(null);
        setFeedbackMsg(`Settled: ₦${Number(debt.amount).toLocaleString()} from ${debt.debtor}`);
        setTimeout(() => setFeedbackMsg(''), 3500);

        const saleForReceipt = settlementSale || Store.getDebtReceipt(debt);
        setReceiptModalSale(saleForReceipt);
    };

    // View receipt for any debt
    const handleViewReceipt = (debt: Debt) => {
        setOpenMenuId(null);
        const sale = Store.getDebtReceipt(debt);
        setReceiptModalSale(sale);
    };

    // Record new customer debt
    const handleRecordDebt = (e: React.FormEvent) => {
        e.preventDefault();
        const debtorName = debtor.trim();
        const debtAmt = Number(amount);

        if (!debtorName || !debtAmt || debtAmt <= 0) return;

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
            setFeedbackMsg(`Recorded debt of ₦${debtAmt.toLocaleString()} for ${debtorName}`);
            setTimeout(() => setFeedbackMsg(''), 3500);
        } catch (err: any) {
            setFeedbackMsg(err.message || 'Could not save debt.');
        }
    };

    const handleOpenWhatsAppReminder = (debt: Debt) => {
        setOpenMenuId(null);
        const cleanPhone = (debt.phone || '').replace(/[^0-9]/g, '');
        const message = `Hello ${debt.debtor}, this is a gentle reminder from ${Store.getSettings().businessName} regarding your outstanding balance of ₦${Number(debt.amount).toLocaleString()} for ${debt.product}. Due date: ${debt.dueDate ? debt.dueDate.split('T')[0] : 'soon'}. Thank you!`;
        const encoded = encodeURIComponent(message);
        if (cleanPhone) {
            window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
        } else {
            navigator.clipboard.writeText(message);
            setFeedbackMsg('Reminder copied to clipboard');
            setTimeout(() => setFeedbackMsg(''), 2500);
        }
    };

    const handleExportCSV = () => {
        const rows = [
            ['ID', 'Debtor Name', 'Phone', 'Items', 'Balance (₦)', 'Due Date', 'Status'],
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
        Utils.downloadCSV(rows, `Vendora_Debts_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '36px' }}>
            {/* Header: Fixed overlap bug with clean single heading */}
            <div style={{ marginBottom: '14px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Debts</h1>
            </div>

            {/* Success Feedback Banner */}
            {feedbackMsg && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '12.5px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{feedbackMsg}</span>
                </div>
            )}

            {/* Simplified Single Big Metric Box — replaces the 3 cluttered boxes */}
            <div
                className="card"
                style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    marginBottom: '12px'
                }}
            >
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Total Owed
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#DC2626', letterSpacing: '-0.02em', margin: '4px 0 2px' }}>
                    ₦{activeDebtTotal.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                    {exposureRatio}% of Credit Limit Used
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: '#0F172A', color: '#FFFFFF', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                >
                    <Plus size={16} /> Record Debt
                </button>
                <button
                    type="button"
                    onClick={handleExportCSV}
                    style={{ padding: '10px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
                >
                    <Download size={15} /> Export
                </button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                    style={{
                        fontSize: '11.5px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: statusFilter === 'all' ? '#0F172A' : '#FFFFFF',
                        color: statusFilter === 'all' ? '#FFFFFF' : '#334155',
                        border: statusFilter === 'all' ? '1px solid #0F172A' : '1px solid #E2E8F0',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    All
                </button>
                <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('pending')}
                    style={{
                        fontSize: '11.5px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: statusFilter === 'pending' ? '#0F172A' : '#FFFFFF',
                        color: statusFilter === 'pending' ? '#FFFFFF' : '#334155',
                        border: statusFilter === 'pending' ? '1px solid #0F172A' : '1px solid #E2E8F0',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    Pending ({activeDebts.length})
                </button>
                <button
                    type="button"
                    className={`filter-pill ${statusFilter === 'paid' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('paid')}
                    style={{
                        fontSize: '11.5px',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        background: statusFilter === 'paid' ? '#0F172A' : '#FFFFFF',
                        color: statusFilter === 'paid' ? '#FFFFFF' : '#334155',
                        border: statusFilter === 'paid' ? '1px solid #0F172A' : '1px solid #E2E8F0',
                        cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    Paid
                </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
                <input
                    type="text"
                    placeholder="Search debtor or item..."
                    className="search-input"
                    style={{ width: '100%', paddingLeft: '36px', background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', height: '42px', fontSize: '13px' }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            </div>

            {/* Debts List */}
            {filteredDebts.length === 0 ? (
                <div style={{ padding: '32px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No debts recorded.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredDebts.map(d => {
                        const isPaid = d.status === 'Paid' || d.status === 'Settled';
                        const isMenuOpen = openMenuId === d.id;

                        return (
                            <div
                                key={d.id}
                                className="card"
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    background: '#FFFFFF',
                                    border: isPaid ? '1px solid #E2E8F0' : '1px solid #FECACA',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                    position: 'relative'
                                }}
                            >
                                {/* Top Header: Debtor info & Amount + Ellipsis Menu */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                    <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {d.debtor}
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {d.phone ? `${d.phone} · ` : ''}{d.product}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: isPaid ? '#047857' : '#DC2626' }}>
                                            ₦{Number(d.amount).toLocaleString()}
                                        </div>

                                        {/* Three Dots Menu for Secondary Actions (Remind, Receipt) */}
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                type="button"
                                                onClick={() => setOpenMenuId(isMenuOpen ? null : d.id)}
                                                style={{
                                                    background: '#F1F5F9',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '6px',
                                                    color: '#334155',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="More actions"
                                                aria-label="More actions"
                                            >
                                                <MoreVertical size={15} />
                                            </button>

                                            {/* Dropdown Popover */}
                                            {isMenuOpen && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: '32px',
                                                        background: '#FFFFFF',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '10px',
                                                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                                        zIndex: 20,
                                                        minWidth: '130px',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewReceipt(d)}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 12px',
                                                            background: 'none',
                                                            border: 'none',
                                                            textAlign: 'left',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            color: '#334155',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <FileText size={14} /> Receipt
                                                    </button>
                                                    {!isPaid && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenWhatsAppReminder(d)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                background: 'none',
                                                                border: 'none',
                                                                borderTop: '1px solid #F1F5F9',
                                                                textAlign: 'left',
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                color: '#334155',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <Send size={14} /> Remind
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Primary Action: Large Green Settle Button spanning the width of the card */}
                                {!isPaid ? (
                                    <button
                                        type="button"
                                        onClick={() => setSettleModalDebt(d)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '10px',
                                            background: '#059669',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            fontSize: '14px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.22)'
                                        }}
                                    >
                                        <Check size={18} strokeWidth={2.8} />
                                        <span>Settle</span>
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                                            {d.dueDate ? `Due: ${d.dueDate.split('T')[0]}` : ''}
                                        </span>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            background: '#ECFDF5',
                                            color: '#047857'
                                        }}>
                                            Settled
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Record Debt Modal */}
            {showAddModal && (
                <div className="auth-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="auth-card fade-in" onClick={e => e.stopPropagation()} style={{ width: '360px', maxWidth: '92vw', padding: '20px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 14px', color: '#0F172A' }}>Record Debt</h3>
                        <form onSubmit={handleRecordDebt}>
                            <div style={{ marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={debtor}
                                    onChange={e => setDebtor(e.target.value)}
                                    placeholder="Customer Name"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="Phone (Optional)"
                                />
                            </div>

                            <div style={{ marginBottom: '10px' }}>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={product}
                                    onChange={e => setProduct(e.target.value)}
                                    placeholder="Goods / Description"
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                <input
                                    type="number"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="Amount (₦)"
                                    min="1"
                                    required
                                />
                                <input
                                    type="date"
                                    className="search-input"
                                    style={{ width: '100%', height: '40px' }}
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '10px' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px', background: '#0F172A', border: 'none' }}>
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Settle Debt Confirmation Modal */}
            {settleModalDebt && (
                <div className="auth-overlay" onClick={() => setSettleModalDebt(null)}>
                    <div className="auth-card fade-in" onClick={e => e.stopPropagation()} style={{ width: '360px', maxWidth: '92vw', padding: '20px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                                <Check size={24} color="#059669" />
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: '#0F172A' }}>Settle Balance</h3>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>
                                ₦{Number(settleModalDebt.amount).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748B' }}>{settleModalDebt.debtor}</div>
                        </div>

                        {/* Payment method selector */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' }}>
                            {(['Cash', 'Bank', 'POS'] as const).map(ch => (
                                <button
                                    key={ch}
                                    type="button"
                                    onClick={() => setSettlePaymentMethod(ch)}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        border: settlePaymentMethod === ch ? '2px solid #0F172A' : '1px solid #E2E8F0',
                                        background: settlePaymentMethod === ch ? '#0F172A' : '#FFFFFF',
                                        color: settlePaymentMethod === ch ? '#FFFFFF' : '#334155',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {ch}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => handleConfirmSettle(settleModalDebt)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                fontSize: '14px',
                                fontWeight: 700,
                                background: '#059669',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                marginBottom: '8px'
                            }}
                        >
                            <Check size={16} /> Mark as Settled
                        </button>

                        <button
                            type="button"
                            onClick={() => setSettleModalDebt(null)}
                            style={{ width: '100%', padding: '6px', background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receiptModalSale && (
                <div
                    className="auth-overlay no-print receipt-modal-overlay"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setReceiptModalSale(null);
                    }}
                >
                    <div className="receipt-modal-container fade-in" style={{ maxWidth: '400px', width: '92vw' }}>
                        <div className="receipt-modal-header" style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={16} color="#047857" />
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Settlement Receipt</span>
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

                        <div style={{ padding: '12px 14px', maxHeight: '64vh', overflowY: 'auto' }}>
                            <ReceiptTicket
                                sale={receiptModalSale}
                                settings={Store.getSettings()}
                                title="Settlement Confirmed!"
                                isSettlement={true}
                            />
                        </div>

                        <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', gap: '6px' }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    Utils.printReceipt(receiptModalSale, Store.getSettings());
                                    setReceiptStatus('Print dialog opened');
                                    setTimeout(() => setReceiptStatus(''), 2500);
                                }}
                                style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 700, background: '#0F172A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Printer size={14} /> Print
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={async () => {
                                    const ok = await Utils.copyReceiptText(receiptModalSale, Store.getSettings());
                                    if (ok) {
                                        setReceiptStatus('Copied');
                                        setTimeout(() => setReceiptStatus(''), 2500);
                                    }
                                }}
                                style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
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
