import React from 'react';
import { Sale, Settings } from '../core/store';

interface RoyalReceiptProps {
    sale: Sale;
    settings: Settings;
    cashierName?: string;
}

export const RoyalReceipt: React.FC<RoyalReceiptProps> = ({
    sale,
    settings,
    cashierName = 'Authorized Signatory'
}) => {
    const dateObj = sale.date ? new Date(sale.date) : new Date();
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = dateObj.getFullYear();
    const formattedDate = `${day} · ${month} · ${year}`;
    const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const storeName = settings.businessName || 'VENDORA TEXTILE & RETAIL';
    // Calculate initials for crest and seal
    const words = storeName.trim().split(/\s+/).filter(Boolean);
    const initials = words.length >= 2 
        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
        : (words[0] ? words[0].substring(0, 2).toUpperCase() : 'VR');

    const isPendingDebt = sale.paymentMethod?.toLowerCase().includes('pending') || sale.paymentMethod?.toLowerCase().includes('debt') && !sale.isSettlement;
    const sealText = isPendingDebt ? 'CREDIT' : 'PAID';

    const subtotal = Number(sale.subtotal) || Number(sale.total) || 0;
    const vat = Number(sale.vat) || 0;
    const total = Number(sale.total) || 0;
    const discount = subtotal > total ? subtotal - total : 0;

    return (
        <div className="rv-wrap">
            <div className="rv-receipt">
                <div className="rv-frame">
                    <span className="rv-c1"></span>
                    <span className="rv-c2"></span>

                    {/* Head / Brand */}
                    <div className="rv-head">
                        {settings.businessLogo ? (
                            <div style={{ width: '46px', height: '46px', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img
                                    src={settings.businessLogo}
                                    alt={storeName}
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                                />
                            </div>
                        ) : (
                            <svg viewBox="0 0 64 64" aria-label="Store crest" style={{ width: '46px', height: '46px', display: 'block', margin: '0 auto 3px' }}>
                                <defs>
                                    <linearGradient id="rv-gold-grad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0" stopColor="#FFE9A8" />
                                        <stop offset="0.5" stopColor="#C9A227" />
                                        <stop offset="1" stopColor="#8C6A1A" />
                                    </linearGradient>
                                </defs>
                                <circle cx="32" cy="32" r="30" fill="#0A0A0A" stroke="url(#rv-gold-grad)" strokeWidth="2" />
                                <circle cx="32" cy="32" r="25" fill="none" stroke="url(#rv-gold-grad)" strokeWidth="0.6" strokeDasharray="1.5 2" />
                                <path d="M19 24l5 4 8-9 8 9 5-4-3 11H22z" fill="url(#rv-gold-grad)" />
                                <text x="32" y="50" textAnchor="middle" fontFamily="Cinzel,serif" fontWeight="700" fontSize="14" fill="url(#rv-gold-grad)" letterSpacing="1">
                                    {initials}
                                </text>
                            </svg>
                        )}
                        <div className="rv-brand">{storeName}</div>
                        <div className="rv-sub">OFFICIAL TRANSACTION RECORD</div>
                    </div>

                    {/* Receipt Ribbon */}
                    <div className="rv-orn"><b>RECEIPT</b></div>

                    {/* Metadata Grid */}
                    <div className="rv-meta">
                        <div>
                            <div className="rv-l">RECEIPT NO.</div>
                            <div className="rv-v rv-m">{sale.id}</div>
                        </div>
                        <div>
                            <div className="rv-l">DATE</div>
                            <div className="rv-v rv-m">{formattedDate}</div>
                        </div>
                        <div>
                            <div className="rv-l">TIME</div>
                            <div className="rv-v rv-m">{formattedTime}</div>
                        </div>
                        <div>
                            <div className="rv-l">SERVED BY</div>
                            <div className="rv-v">{cashierName}</div>
                        </div>
                    </div>

                    {/* Customer Box */}
                    <div className="rv-cust">
                        <div className="rv-l">BILLED TO</div>
                        <div className="rv-n">{sale.customerName || 'Walk-in Customer'}</div>
                        <div className="rv-d">
                            {sale.customerPhone ? `${sale.customerPhone} · Direct Counter` : 'Walk-in Counter · Immediate Fulfillment'}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="rv-row rv-th">
                        <div>ITEM</div>
                        <div>QTY</div>
                        <div>AMOUNT</div>
                    </div>

                    {sale.items && sale.items.length > 0 ? (
                        sale.items.map((it, idx) => {
                            const lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 1);
                            const itemCode = it.productId || `ITEM-0${idx + 1}`;
                            return (
                                <div key={idx} className="rv-row rv-it">
                                    <div>
                                        <div className="rv-a">{it.name}</div>
                                        <div className="rv-s">{itemCode} · ₦{Number(it.price || 0).toLocaleString()}</div>
                                    </div>
                                    <div>{it.qty}</div>
                                    <div>₦{lineTotal.toLocaleString()}</div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="rv-row rv-it">
                            <div>
                                <div className="rv-a">General Retail Order</div>
                                <div className="rv-s">RVT-STD</div>
                            </div>
                            <div>1</div>
                            <div>₦{total.toLocaleString()}</div>
                        </div>
                    )}

                    {/* Financial Summary */}
                    <div className="rv-t">
                        <p>
                            <span>Subtotal</span>
                            <span>₦{subtotal.toLocaleString()}</span>
                        </p>
                        {discount > 0 && (
                            <p className="rv-d">
                                <span>Discount</span>
                                <span>−₦{discount.toLocaleString()}</span>
                            </p>
                        )}
                        {vat > 0 && (
                            <p>
                                <span>VAT (Statutory)</span>
                                <span>₦{vat.toLocaleString()}</span>
                            </p>
                        )}
                        <p>
                            <span>Payment Method</span>
                            <span style={{ textTransform: 'capitalize' }}>{sale.paymentMethod || 'Cash'}</span>
                        </p>
                        <div className="rv-grand">
                            <div className="rv-l">TOTAL</div>
                            <div className="rv-amt">₦{total.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Foot / Authentic Stamp & Signature */}
                    <div className="rv-foot">
                        <div className="rv-seal">
                            <div>
                                <b>{initials}</b>
                                <i>{sealText}</i>
                            </div>
                        </div>
                        <div className="rv-sig">{cashierName}</div>
                        <div className="rv-sl"></div>
                        <div className="rv-role">AUTHORIZED SIGNATORY</div>

                        <div className="rv-bar"></div>
                        <div className="rv-bn">* {sale.id} *</div>

                        <div className="rv-addr">
                            <b>STORE LOCATION</b>
                            {settings.businessAddress || 'Official Retail Location'}
                            {settings.businessPhone && ` · Tel: ${settings.businessPhone}`}
                        </div>

                        <div className="rv-thx">
                            <span>{settings.receiptFooter || 'Thank you for your patronage!'}</span>
                        </div>
                        <div className="rv-rc">RETAIN RECEIPT FOR YOUR RECORDS</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
