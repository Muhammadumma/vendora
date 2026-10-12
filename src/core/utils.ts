export const Utils = {
    formatCurrency(amount: number | string): string {
        const num = Number(amount) || 0;
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(num);
    },

    formatDate(isoString?: string): string {
        if (!isoString) return '';
        try {
            return new Date(isoString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return isoString;
        }
    },

    formatTimeAgo(dateString?: string): string {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

            if (diffInSeconds < 60) return 'just now';
            if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
            if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
            if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

            return date.toLocaleDateString();
        } catch {
            return dateString;
        }
    },

    generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    },

    downloadCSV(rows: (string | number)[][], filename: string): void {
        if (!rows || !rows.length) return;

        const content = rows.map(row =>
            row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    parseCSV(text: string): Record<string, string>[] {
        const result: Record<string, string>[] = [];
        const lines = text.split(/\r\n|\n/);
        if (lines.length < 2) return result;

        const headers = lines[0]
            .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
            .map(h => h.trim().toLowerCase().replace(/^"|"$/g, '').replace(/""/g, '"'));

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const obj: Record<string, string> = {};
            const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

            headers.forEach((header, j) => {
                let val = currentline[j] ? currentline[j].trim() : '';
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1).replace(/""/g, '"');
                }
                obj[header] = val;
            });
            result.push(obj);
        }
        return result;
    },

    convertToCSV(data: any[]): string {
        if (!data || !data.length) return '';
        const headers = Object.keys(data[0]);
        const csvRows: string[] = [];
        csvRows.push(headers.join(','));

        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                return `"${String(val ?? '').replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    },

    downloadFile(content: string, fileName: string, contentType: string): void {
        const file = new Blob([content], { type: contentType });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    },


    generateBarcodeSVG(code: string): string {
        const safeCode = (code || '0001').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'REC01';
        let x = 12;
        const bars: string[] = [];
        
        // Lead-in guard bars
        bars.push(`<rect x="${x}" y="0" width="2" height="34" fill="#000000" />`); x += 4;
        bars.push(`<rect x="${x}" y="0" width="1" height="34" fill="#000000" />`); x += 3;
        bars.push(`<rect x="${x}" y="0" width="2.5" height="34" fill="#000000" />`); x += 5;

        for (let i = 0; i < safeCode.length; i++) {
            const charCode = safeCode.charCodeAt(i);
            const w1 = ((charCode % 3) + 1) * 0.9;
            const w2 = (((charCode * 2) % 3) + 1) * 0.9;
            const w3 = (((charCode * 5) % 4) + 1.2);
            bars.push(`<rect x="${x.toFixed(1)}" y="0" width="${w1.toFixed(1)}" height="30" fill="#000000" />`); x += w1 + 2;
            bars.push(`<rect x="${x.toFixed(1)}" y="0" width="${w2.toFixed(1)}" height="30" fill="#000000" />`); x += w2 + 1.5;
            bars.push(`<rect x="${x.toFixed(1)}" y="0" width="${w3.toFixed(1)}" height="30" fill="#000000" />`); x += w3 + 2.5;
        }

        // Tail guard bars
        bars.push(`<rect x="${x.toFixed(1)}" y="0" width="2.5" height="34" fill="#000000" />`); x += 5;
        bars.push(`<rect x="${x.toFixed(1)}" y="0" width="1" height="34" fill="#000000" />`); x += 3;
        bars.push(`<rect x="${x.toFixed(1)}" y="0" width="2" height="34" fill="#000000" />`); x += 4;

        const totalWidth = Math.max(Math.ceil(x + 12), 220);
        return `<svg width="${totalWidth}" height="36" viewBox="0 0 ${totalWidth} 36" style="display:block;margin:0 auto;" xmlns="http://www.w3.org/2000/svg">${bars.join('')}</svg>`;
    },

    generateReceiptPrintContent(sale: any, settings?: any): string {
        const storeSettings = settings || {
            businessName: 'VENDORA RETAIL',
            businessAddress: '123 Commercial Avenue, Lagos, Nigeria',
            businessPhone: '+234 800 000 0000',
            receiptFooter: 'Thank you for your patronage! Goods bought in good condition are not returnable.'
        };

        const storeName = storeSettings.businessName || 'ROYALVAZIER TEXTILE';
        const words = storeName.trim().split(/\s+/).filter(Boolean);
        const initials = words.length >= 2
            ? `${words[0][0]}${words[1][0]}`.toUpperCase()
            : (words[0] ? words[0].substring(0, 2).toUpperCase() : 'RV');

        const dateObj = sale.date ? new Date(sale.date) : new Date();
        const day = dateObj.getDate().toString().padStart(2, '0');
        const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const year = dateObj.getFullYear();
        const formattedDate = `${day} · ${month} · ${year}`;
        const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const items = sale.items || [];
        const itemsRows = items.map((it: any, idx: number) => {
            const lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 1);
            const itemCode = it.productId || it.sku || `RVT-${String(idx + 1).padStart(3, '0')}`;
            return `
                <div class="row it">
                    <div>
                        <div class="a">${it.name || 'Item'}</div>
                        <div class="s">${itemCode} · ₦${Number(it.price || 0).toLocaleString()}</div>
                    </div>
                    <div>${it.qty || 1}</div>
                    <div>₦${lineTotal.toLocaleString()}</div>
                </div>
            `;
        }).join('');

        const subtotal = Number(sale.subtotal) || Number(sale.total) || 0;
        const vat = Number(sale.vat) || 0;
        const total = Number(sale.total) || 0;
        const discount = subtotal > total ? subtotal - total : 0;

        const isPendingDebt = String(sale.paymentMethod || '').toLowerCase().includes('pending') ||
                              String(sale.paymentMethod || '').toLowerCase().includes('debt') && !sale.isSettlement;
        const sealText = isPendingDebt ? 'CREDIT' : 'PAID';

        const logoHtml = storeSettings.businessLogo
            ? `<img src="${storeSettings.businessLogo}" alt="${storeName}" style="width:46px;height:46px;display:block;margin:0 auto 3px;object-fit:contain;border-radius:4px;" />`
            : `<svg viewBox="0 0 64 64" aria-label="Royal crest" style="width:46px;height:46px;display:block;margin:0 auto 3px;">
                <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8"/><stop offset=".5" stop-color="#C9A227"/><stop offset="1" stop-color="#8C6A1A"/></linearGradient></defs>
                <circle cx="32" cy="32" r="30" fill="#0A0A0A" stroke="url(#g)" stroke-width="2"/>
                <circle cx="32" cy="32" r="25" fill="none" stroke="url(#g)" stroke-width=".6" stroke-dasharray="1.5 2"/>
                <path d="M19 24l5 4 8-9 8 9 5-4-3 11H22z" fill="url(#g)"/>
                <text x="32" y="50" text-anchor="middle" font-family="Cinzel,serif" font-weight="700" font-size="14" fill="url(#g)" letter-spacing="1">${initials}</text>
               </svg>`;

        const cashierName = 'Authorized Signatory';

        return `
            <div class="wrap">
                <div class="receipt">
                    <div class="frame">
                        <span class="c1"></span><span class="c2"></span>

                        <div class="head">
                            ${logoHtml}
                            <div class="brand">${storeName}</div>
                            <div class="sub">EXCLUSIVE RETAIL</div>
                        </div>

                        <div class="orn"><b>RECEIPT</b></div>

                        <div class="meta">
                            <div><div class="l">RECEIPT NO.</div><div class="v m">${sale.id}</div></div>
                            <div><div class="l">DATE</div><div class="v m">${formattedDate}</div></div>
                            <div><div class="l">TIME</div><div class="v m">${formattedTime}</div></div>
                            <div><div class="l">SERVED BY</div><div class="v">${cashierName}</div></div>
                        </div>

                        <div class="cust">
                            <div class="l">BILLED TO</div>
                            <div class="n">${sale.customerName || 'Walk-in Customer'}</div>
                            <div class="d">${sale.customerPhone ? `${sale.customerPhone} · Direct Counter` : 'Walk-in Counter · Immediate Fulfillment'}</div>
                        </div>

                        <div class="row th"><div>ITEM</div><div>QTY</div><div>AMOUNT</div></div>
                        ${itemsRows || `<div class="row it"><div><div class="a">General Order</div><div class="s">RVT-STD</div></div><div>1</div><div>₦${total.toLocaleString()}</div></div>`}

                        <div class="t">
                            <p><span>Subtotal</span><span>₦${subtotal.toLocaleString()}</span></p>
                            ${discount > 0 ? `<p class="d"><span>Discount</span><span>−₦${discount.toLocaleString()}</span></p>` : ''}
                            ${vat > 0 ? `<p><span>VAT (Statutory)</span><span>₦${vat.toLocaleString()}</span></p>` : ''}
                            <p><span>Payment Mode</span><span>${String(sale.paymentMethod || 'Cash').toUpperCase()}</span></p>
                            <div class="grand"><div class="l">TOTAL</div><div class="amt">₦${total.toLocaleString()}</div></div>
                        </div>

                        <div class="foot">
                            <div class="seal"><div><b>${initials}</b><i>${sealText}</i></div></div>
                            <div class="sig">${cashierName}</div>
                            <div class="sl"></div>
                            <div class="role">AUTHORIZED SIGNATORY</div>
                            <div class="bar"></div>
                            <div class="bn">* ${sale.id} *</div>
                            <div class="addr">
                                <b>STORE LOCATION</b>
                                ${storeSettings.businessAddress || 'Official Retail Location'}${storeSettings.businessPhone ? ` · Tel: ${storeSettings.businessPhone}` : ''}
                            </div>
                            <div class="thx"><span>${storeSettings.receiptFooter || 'Thank you for your patronage!'}</span></div>
                            <div class="rc">RETAIN RECEIPT FOR YOUR RECORDS</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    generateReceiptHTML(sale: any, settings?: any): string {
        const bodyContent = Utils.generateReceiptPrintContent(sale, settings);
        const storeSettings = settings || {};
        const storeName = storeSettings.businessName || 'Royalvazier Textile';
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${storeName} — Receipt #${sale.id}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Cormorant+Garamond:ital,wght@0,600;1,500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--g1:#FFE9A8;--g2:#E5B94E;--g3:#C9A227;--gd:#8C6A1A;--ink:#0A0A0A;--paper:#F8F2E2;--muted:#6B6250}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#060608;display:grid;place-items:center;padding:16px 8px;min-height:100vh;font-family:'Cormorant Garamond',Georgia,serif;color:var(--ink);
background:radial-gradient(500px 360px at 15% 0,rgba(229,185,78,.14),transparent 60%),radial-gradient(500px 360px at 95% 100%,rgba(201,162,39,.1),transparent 60%),#060608}
.wrap{filter:drop-shadow(0 18px 28px rgba(201,162,39,.35));animation:rise .7s cubic-bezier(.2,.8,.2,1);display:flex;justify-content:center}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.receipt{width:290px;position:relative;padding:14px 12px;background:
radial-gradient(circle at 50% 42%,rgba(201,162,39,.09) 0 38%,transparent 39%),
repeating-linear-gradient(45deg,rgba(140,106,26,.035) 0 1px,transparent 1px 5px),
linear-gradient(180deg,#FBF6E7,#EEE3C8);
-webkit-mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/10px 51% repeat-x,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/10px 51% repeat-x;
mask:conic-gradient(from -45deg at bottom,#0000,#000 1deg 89deg,#0000 90deg) bottom/10px 51% repeat-x,conic-gradient(from 135deg at top,#0000,#000 1deg 89deg,#0000 90deg) top/10px 51% repeat-x}
.frame{position:relative;padding:12px 11px;border:1px solid var(--g3);outline:1px solid rgba(140,106,26,.35);outline-offset:3px}
.frame::before,.frame::after,.c1,.c2{content:"◆";position:absolute;font-size:7px;color:var(--g3);background:#F5EDD6;line-height:1;padding:1px}
.frame::before{top:-5px;left:-5px}.frame::after{top:-5px;right:-5px}
.c1{bottom:-5px;left:-5px}.c2{bottom:-5px;right:-5px}
.head{text-align:center}
.head svg,.head img{width:46px;height:46px;display:block;margin:0 auto 3px;object-fit:contain}
.brand{font-family:'Cinzel',serif;font-weight:700;font-size:13px;letter-spacing:4px;
background:linear-gradient(180deg,#B8901F,#6E5010 55%,#C9A227);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{font-family:'Cinzel',serif;font-size:6px;letter-spacing:5px;color:var(--gd);margin-top:1px}
.orn{display:flex;align-items:center;gap:6px;margin:8px 0 6px;color:var(--g3);font-size:6px}
.orn::before,.orn::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--g3),transparent)}
.orn b{font-family:'Cinzel',serif;font-size:7px;letter-spacing:5px;color:var(--gd)}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin-bottom:8px}
.l{font-family:'Cinzel',serif;font-size:5.5px;letter-spacing:2px;color:var(--gd);font-weight:700}
.v{font-size:10px;font-weight:600;margin-top:0}
.m{font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:500}
.cust{border:1px solid rgba(140,106,26,.35);background:rgba(245,215,122,.12);padding:6px 8px;margin-bottom:8px}
.cust .n{font-size:12px;font-weight:600;line-height:1.1}
.cust .d{font-family:'JetBrains Mono',monospace;font-size:6.5px;color:var(--muted);margin-top:2px;line-height:1.5}
.row{display:grid;grid-template-columns:1fr 20px 62px;gap:4px;align-items:center}
.th{padding:4px 0;border-top:1px solid var(--g3);border-bottom:1px solid var(--g3)}
.th div{font-family:'Cinzel',serif;font-size:5.5px;letter-spacing:2px;color:var(--gd);font-weight:700}
.th div:nth-child(n+2),.it div:nth-child(n+2){text-align:right}
.it{padding:5px 0;border-bottom:1px dashed rgba(140,106,26,.3)}
.it .a{font-size:11px;font-weight:600;line-height:1.1}
.it .s{font-family:'JetBrains Mono',monospace;font-size:5.5px;color:var(--muted);letter-spacing:1px}
.it div:nth-child(n+2){font-family:'JetBrains Mono',monospace;font-size:8.5px}
.t{margin-top:6px}
.t p{display:flex;justify-content:space-between;font-size:10px;color:var(--muted);padding:1.5px 0}
.t p span:last-child{font-family:'JetBrains Mono',monospace;font-size:8.5px;color:var(--ink)}
.t .d span:last-child{color:#8C1D2C}
.grand{position:relative;overflow:hidden;margin-top:6px;padding:7px 9px;display:flex;justify-content:space-between;align-items:center;
background:linear-gradient(180deg,#141414,#000);border:1px solid var(--g3);outline:1px solid rgba(0,0,0,.6);outline-offset:-3px}
.grand::after{content:"";position:absolute;top:0;bottom:0;width:40px;left:-60px;background:linear-gradient(100deg,transparent,rgba(255,233,168,.35),transparent);animation:sh 3.5s infinite}
@keyframes sh{to{left:130%}}
.grand .l{color:var(--g2);font-size:6.5px;letter-spacing:3px}
.grand .amt{font-size:19px;font-weight:700;line-height:1;background:linear-gradient(180deg,#FFF3C4,#E5B94E);-webkit-background-clip:text;background-clip:text;color:transparent}
.foot{text-align:center;margin-top:9px;padding-top:8px;border-top:1px solid rgba(140,106,26,.3)}
.seal{width:40px;height:40px;margin:0 auto 4px;border-radius:50%;display:grid;place-items:center;transform:rotate(-6deg);position:relative;
background:radial-gradient(circle at 35% 30%,#FFF3C4,var(--g1) 30%,var(--g2) 60%,var(--g3) 85%,var(--gd));
box-shadow:0 4px 10px -3px rgba(140,106,26,.8),inset 0 2px 2px rgba(255,255,255,.7),inset 0 -2px 4px rgba(140,106,26,.6)}
.seal::before{content:"";position:absolute;inset:4px;border-radius:50%;border:1px dashed rgba(140,106,26,.55)}
.seal b{font-family:'Cinzel',serif;font-size:10px;line-height:1}
.seal i{display:block;font:700 4px 'Cinzel',serif;letter-spacing:1.5px;color:var(--gd);font-style:normal;text-align:center}
.sig{font-style:italic;font-size:11px}
.sl{width:80px;height:1px;background:rgba(140,106,26,.5);margin:1px auto}
.role{font-family:'Cinzel',serif;font-size:5px;letter-spacing:2px;color:var(--gd);font-weight:700}
.bar{height:18px;margin:7px 10px 2px;background:repeating-linear-gradient(90deg,var(--ink) 0 1px,transparent 1px 2px,var(--ink) 2px 4px,transparent 4px 5px,var(--ink) 5px 6px,transparent 6px 8px)}
.bn{font-family:'JetBrains Mono',monospace;font-size:6.5px;letter-spacing:3px;color:var(--muted)}
.addr{font-size:9px;color:var(--muted);line-height:1.35;margin-top:6px}
.addr b{display:block;font-family:'Cinzel',serif;font-size:6px;letter-spacing:2px;color:var(--gd)}
.thx{font-style:italic;font-size:11px;margin-top:6px}.thx span{color:var(--g3)}
.rc{font-family:'JetBrains Mono',monospace;font-size:6px;letter-spacing:2px;color:var(--muted);margin-top:3px}
.acts{width:290px;margin:12px auto 0;display:grid;grid-template-columns:1fr 1fr;gap:6px}
.btn{padding:8px;border:1px solid rgba(201,162,39,.5);background:rgba(201,162,39,.06);color:var(--g1);font:700 8px 'Cinzel',serif;letter-spacing:3px;cursor:pointer;border-radius:2px;transition:.25s}
.btn:hover{background:var(--g2);color:var(--ink)}
.full{grid-column:1/-1}
@media print{@page{size:80mm auto;margin:0}body{background:#fff;padding:0;display:block}.acts{display:none}.wrap{filter:none;animation:none}.receipt{width:100%}.grand::after{display:none}}
</style>
</head>
<body>
<div>
${bodyContent}
<div class="acts">
    <button class="btn full" onclick="window.print()">PRINT RECEIPT</button>
</div>
</div>
</body>
</html>`;
    },

    mountReceiptForPrint(sale: any, settings?: any): HTMLElement {
        let printContainer = document.getElementById('vendora-receipt-print-area');
        if (!printContainer) {
            printContainer = document.createElement('div');
            printContainer.id = 'vendora-receipt-print-area';
            document.body.appendChild(printContainer);
        }
        printContainer.innerHTML = Utils.generateReceiptPrintContent(sale, settings);
        return printContainer;
    },

    printReceipt(sale: any, settings?: any): boolean {
        if (!sale) return false;
        try {
            // 1. Mount into dedicated print element for 100% reliable @media print
            Utils.mountReceiptForPrint(sale, settings);

            // 2. Prepare iframe document if possible
            try {
                let iframe = document.getElementById('receipt-print-frame') as HTMLIFrameElement;
                if (!iframe) {
                    iframe = document.createElement('iframe');
                    iframe.id = 'receipt-print-frame';
                    iframe.style.position = 'fixed';
                    iframe.style.top = '0';
                    iframe.style.left = '0';
                    iframe.style.width = '1px';
                    iframe.style.height = '1px';
                    iframe.style.border = '0';
                    iframe.style.opacity = '0.01';
                    iframe.style.pointerEvents = 'none';
                    document.body.appendChild(iframe);
                }
                const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
                if (frameDoc) {
                    frameDoc.open();
                    frameDoc.write(Utils.generateReceiptHTML(sale, settings));
                    frameDoc.close();
                }
            } catch (frameErr) {
                console.warn('Iframe setup notice:', frameErr);
            }

            // 3. Trigger native window print
            setTimeout(() => {
                try {
                    window.focus();
                    window.print();
                } catch (printErr) {
                    console.warn('Window print failed, fallback to iframe:', printErr);
                    const iframe = document.getElementById('receipt-print-frame') as HTMLIFrameElement;
                    iframe?.contentWindow?.focus();
                    iframe?.contentWindow?.print();
                }
            }, 60);

            return true;
        } catch (err) {
            console.error('Failed to trigger receipt printing:', err);
            return false;
        }
    },

    generateReceiptPlainText(sale: any, settings?: any): string {
        const storeSettings = settings || {
            businessName: 'VENDORA RETAIL',
            businessAddress: '123 Commercial Avenue, Lagos, Nigeria',
            businessPhone: '+234 800 000 0000',
            receiptFooter: 'Thank you for your patronage! Goods bought in good condition are not returnable.'
        };

        const dateObj = sale.date ? new Date(sale.date) : new Date();
        const dateStr = dateObj.toLocaleString('en-NG');
        const divider = '========================================';
        const thinDivider = '----------------------------------------';

        let text = `${divider}\n`;
        text += `          ${(storeSettings.businessName || 'VENDORA RETAIL').toUpperCase()}\n`;
        text += `     ${storeSettings.businessAddress || 'Official Retail Outlet'}\n`;
        text += `        Tel: ${storeSettings.businessPhone || '+234 800 000 0000'}\n`;
        text += `${divider}\n`;
        text += `RECEIPT #: ${sale.id}\n`;
        text += `DATE:      ${dateStr}\n`;
        text += `CUSTOMER:  ${sale.customerName || 'Walk-in'}\n`;
        if (sale.customerPhone) text += `PHONE:     ${sale.customerPhone}\n`;
        text += `PAYMENT:   ${(sale.paymentMethod || 'Cash').toUpperCase()}\n`;
        text += `${thinDivider}\n`;
        text += `ITEM                 QTY   PRICE   TOTAL\n`;
        text += `${thinDivider}\n`;

        const items = sale.items || [];
        for (const it of items) {
            const lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 1);
            const name = (it.name || 'Item').padEnd(20).substring(0, 20);
            const qty = String(it.qty || 1).padStart(3);
            const price = Number(it.price || 0).toLocaleString().padStart(7);
            const total = lineTotal.toLocaleString().padStart(8);
            text += `${name} ${qty} ${price} ₦${total}\n`;
        }

        text += `${thinDivider}\n`;
        text += `Subtotal:                  ₦${(Number(sale.subtotal) || 0).toLocaleString()}.00\n`;
        text += `VAT (7.5%):                 ₦${(Number(sale.vat) || 0).toLocaleString()}.00\n`;
        text += `TOTAL DUE:                 ₦${(Number(sale.total) || 0).toLocaleString()}.00\n`;
        text += `STATUS:                    PAID IN FULL\n`;
        text += `${divider}\n`;
        text += `${storeSettings.receiptFooter || 'Thank you for your patronage!'}\n`;
        text += `* ${sale.id} *\n`;
        text += `${divider}\n`;

        return text;
    },

    async copyReceiptText(sale: any, settings?: any): Promise<boolean> {
        if (!sale) return false;
        try {
            const plain = Utils.generateReceiptPlainText(sale, settings);
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(plain);
                return true;
            }
            const textarea = document.createElement('textarea');
            textarea.value = plain;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        } catch {
            return false;
        }
    },

    shareReceiptWhatsApp(sale: any, settings?: any): void {
        if (!sale) return;
        const text = Utils.generateReceiptPlainText(sale, settings);
        let phone = (sale.customerPhone || '').replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
            phone = '234' + phone.substring(1);
        }
        const url = phone
            ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
            : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    },

    downloadReceipt(sale: any, settings?: any): void {
        if (!sale) return;
        const html = Utils.generateReceiptHTML(sale, settings);
        Utils.downloadFile(html, `Receipt_${sale.id}.html`, 'text/html;charset=utf-8;');
    },

    async downloadReceiptPDF(sale: any, settings?: any): Promise<void> {
        if (!sale) return;
        const { ExportService } = await import('./exportService');
        ExportService.exportReceiptPDF(sale, settings);
    }
};
