import React from 'react';
import { Sale, Settings } from '../core/store';
import { Utils } from '../core/utils';

interface ReceiptTicketProps {
    sale: Sale;
    settings?: Settings;
    title?: string;
    isSettlement?: boolean;
}

export const ReceiptTicket: React.FC<ReceiptTicketProps> = ({
    sale,
    settings,
    title,
    isSettlement = false
}) => {
    const storeSettings = settings || {
        businessName: 'Royalvazier Textile',
        parentCompany: 'Royalvazier Global Services Ltd',
        rcNumber: 'RC9636293',
        businessAddress: 'No:15 Gidan Baba Dan Baffa Beside Jumma’at Mosque opp. Ganduje Building Kantin Kwari market Kano',
        businessPhone: '+2348137098824 / +2349060042040',
        businessEmail: 'info@royalvazier.com.ng',
        businessLogo: '/royalvazier-logo.png',
        receiptFooter: 'Wholesale & Retail Fabrics Across Nigeria • Goods bought in good condition are not returnable'
    };

    const dateObj = sale.date ? new Date(sale.date) : new Date();
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
    const formattedTime = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const isDebt = String(sale.paymentMethod || '').toLowerCase().includes('debt') && !isSettlement;
    const formattedDueDate = sale.dueDate 
        ? new Date(sale.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'In 7 days';

    const displayTitle = title || (isSettlement 
        ? 'Debt Settlement Confirmed!' 
        : isDebt 
            ? 'Credit Sale Issued' 
            : 'Your order is confirmed!');

    const displaySubtitle = isSettlement
        ? 'Debt Balance Settled & Cleared'
        : isDebt
            ? `Payment Pending · Due: ${formattedDueDate}`
            : 'Official Sales Receipt & Proof of Payment';

    const subtotal = Number(sale.subtotal) || Number(sale.total) || 0;
    const vat = Number(sale.vat) || 0;
    const total = Number(sale.total) || 0;
    const discount = subtotal > total ? subtotal - total : 0;

    // Serrated edge paths (30 teeth across 360 width)
    const topSerratedPath = "M0,10 L6,0 L12,10 L18,0 L24,10 L30,0 L36,10 L42,0 L48,10 L54,0 L60,10 L66,0 L72,10 L78,0 L84,10 L90,0 L96,10 L102,0 L108,10 L114,0 L120,10 L126,0 L132,10 L138,0 L144,10 L150,0 L156,10 L162,0 L168,10 L174,0 L180,10 L186,0 L192,10 L198,0 L204,10 L210,0 L216,10 L222,0 L228,10 L234,0 L240,10 L246,0 L252,10 L258,0 L264,10 L270,0 L276,10 L282,0 L288,10 L294,0 L300,10 L306,0 L312,10 L318,0 L324,10 L330,0 L336,10 L342,0 L348,10 L354,0 L360,10 Z";
    const bottomSerratedPath = "M0,0 L6,10 L12,0 L18,10 L24,0 L30,10 L36,0 L42,10 L48,0 L54,10 L60,0 L66,10 L72,0 L78,10 L84,0 L90,10 L96,0 L102,10 L108,0 L114,10 L120,0 L126,10 L132,0 L138,10 L144,0 L150,10 L156,0 L162,10 L168,0 L174,10 L180,0 L186,10 L192,0 L198,10 L204,0 L210,10 L216,0 L222,10 L228,0 L234,10 L240,0 L246,10 L252,0 L258,10 L264,0 L270,10 L276,0 L282,10 L288,0 L294,10 L300,0 L306,10 L312,0 L318,10 L324,0 L330,10 L336,0 L342,10 L348,0 L354,10 L360,0 Z";

    const barcodeSvg = Utils.generateBarcodeSVG(sale.id);

    return (
        <div className="ticket-outer-wrapper" style={{ width: '100%', maxWidth: '380px', margin: '0 auto', filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.12))' }}>
            {/* Top Serrated Edge */}
            <div style={{ width: '100%', height: '10px', lineHeight: 0, overflow: 'hidden' }}>
                <svg viewBox="0 0 360 10" preserveAspectRatio="none" style={{ width: '100%', height: '10px', display: 'block' }}>
                    <path d={topSerratedPath} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.75" />
                </svg>
            </div>

            {/* Main Receipt Body */}
            <div 
                className="ticket-paper-content" 
                style={{ 
                    background: '#FFFFFF', 
                    padding: '16px 20px 18px', 
                    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                    color: '#0F172A',
                    borderLeft: '1px solid #E2E8F0',
                    borderRight: '1px solid #E2E8F0'
                }}
            >
                {/* Top Meta Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' }}>
                        Order: #{sale.id.replace(/^SALE-/, '')}
                    </span>
                    <span>
                        {formattedDate} · {formattedTime}
                    </span>
                </div>

                {/* Brand / Logo Section */}
                <div style={{ textAlign: 'center', marginTop: '14px', marginBottom: '14px' }}>
                    <div style={{ width: '56px', height: '56px', margin: '0 auto 8px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #F1F5F9', boxShadow: '0 4px 10px rgba(0,0,0,0.06)' }}>
                        <img
                            src={storeSettings.businessLogo || '/royalvazier-logo.png'}
                            alt="Royalvazier Textile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = '/logo.png';
                            }}
                        />
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                        {storeSettings.businessName || 'Royalvazier Textile'}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#8C6A1A', letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '2px' }}>
                        {storeSettings.parentCompany || 'Royalvazier Global Services Ltd'} · {storeSettings.rcNumber || 'RC9636293'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        Kantin Kwari Market, Kano
                    </div>

                    <div style={{ marginTop: '12px', fontSize: '18px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                        {displayTitle}
                    </div>
                    <div style={{ fontSize: '11px', color: isDebt ? '#D97706' : '#059669', fontWeight: 700, marginTop: '2px' }}>
                        {displaySubtitle}
                    </div>
                </div>

                {/* Customer Information Strip */}
                <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '8px 12px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', border: '1px solid #F1F5F9' }}>
                    <div>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>{isDebt ? 'Debtor: ' : 'Billed to: '}</span>
                        <strong style={{ color: '#0F172A' }}>{sale.customerName || 'Walk-in Customer'}</strong>
                        {sale.customerPhone && (
                            <div style={{ fontSize: '10.5px', color: '#64748B', marginTop: '1px' }}>
                                Tel: {sale.customerPhone}
                            </div>
                        )}
                        {isDebt && (
                            <div style={{ fontSize: '10px', color: '#B45309', fontWeight: 700, marginTop: '2px' }}>
                                Due Date: {formattedDueDate}
                            </div>
                        )}
                    </div>
                    <span 
                        style={{ 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            background: isDebt ? '#FEF3C7' : '#DCFCE7', 
                            color: isDebt ? '#B45309' : '#15803D', 
                            fontSize: '10px', 
                            fontWeight: 800, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.04em',
                            border: isDebt ? '1px solid #FDE68A' : '1px solid #BBF7D0'
                        }}
                    >
                        {isDebt ? 'UNPAID CREDIT' : isSettlement ? 'SETTLED' : String(sale.paymentMethod || 'Cash').toUpperCase()}
                    </span>
                </div>

                {/* Section Title */}
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    PAYMENT SUMMARY
                </div>

                {/* Table Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 85px', gap: '8px', paddingBottom: '6px', borderBottom: '1px solid #E2E8F0', fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <div>ITEMS</div>
                    <div style={{ textAlign: 'center' }}>QUANTITY</div>
                    <div style={{ textAlign: 'right' }}>PRICE</div>
                </div>

                {/* Items List */}
                <div style={{ margin: '4px 0 10px' }}>
                    {sale.items && sale.items.length > 0 ? (
                        sale.items.map((it, idx) => {
                            const lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 1);
                            return (
                                <div 
                                    key={idx} 
                                    style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: '1fr 50px 85px', 
                                        gap: '8px', 
                                        padding: '7px 0', 
                                        alignItems: 'center',
                                        borderBottom: idx === sale.items.length - 1 ? 'none' : '1px dashed #F1F5F9'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>
                                            {it.name}
                                        </div>
                                        <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '1px' }}>
                                            ₦{Number(it.price || 0).toLocaleString()} each
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center', fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                                        {it.qty}
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>
                                        ₦{lineTotal.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 85px', gap: '8px', padding: '7px 0', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>Retail Order</div>
                                <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>Standard checkout</div>
                            </div>
                            <div style={{ textAlign: 'center', fontSize: '12.5px', fontWeight: 700 }}>1</div>
                            <div style={{ textAlign: 'right', fontSize: '12.5px', fontWeight: 800 }}>₦{total.toLocaleString()}</div>
                        </div>
                    )}
                </div>

                {/* Subtotals & Taxes */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748B', marginBottom: '4px' }}>
                        <span>Subtotal</span>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>₦{subtotal.toLocaleString()}</span>
                    </div>
                    {vat > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748B', marginBottom: '4px' }}>
                            <span>VAT (7.5%)</span>
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>₦{vat.toLocaleString()}</span>
                        </div>
                    )}
                    {discount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#DC2626', marginBottom: '4px' }}>
                            <span>Discount</span>
                            <span style={{ fontWeight: 700 }}>−₦{discount.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {/* Grand Total Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>
                        {isDebt ? 'BALANCE DUE' : 'TOTAL'}
                    </span>
                    <span style={{ fontSize: '26px', fontWeight: 800, color: isDebt ? '#D97706' : '#059669', letterSpacing: '-0.02em' }}>
                        ₦{total.toLocaleString()}
                    </span>
                </div>

                {/* Barcode & Store Details */}
                <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                    <div 
                        style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}
                        dangerouslySetInnerHTML={{ __html: barcodeSvg }}
                    />
                    <div style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#64748B', letterSpacing: '2px', marginTop: '4px', fontWeight: 600 }}>
                        * {sale.id} *
                    </div>

                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '10px', lineHeight: 1.45 }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>Selling Quality Textiles in Bulk & Retail Nationwide</div>
                        <div>No:15 Gidan Baba Dan Baffa, Kantin Kwari market, Kano</div>
                        <div>Hotline: +234 813 709 8824 · +234 906 004 2040</div>
                        <div style={{ fontSize: '9px', color: '#94A3B8', marginTop: '3px' }}>
                            Goods bought in good condition are not returnable
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Serrated Edge */}
            <div style={{ width: '100%', height: '10px', lineHeight: 0, overflow: 'hidden' }}>
                <svg viewBox="0 0 360 10" preserveAspectRatio="none" style={{ width: '100%', height: '10px', display: 'block' }}>
                    <path d={bottomSerratedPath} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.75" />
                </svg>
            </div>
        </div>
    );
};
