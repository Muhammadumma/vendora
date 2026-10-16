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
        let storeSettings = settings;
        if (!storeSettings && typeof window !== 'undefined') {
            storeSettings = {};
        }
        storeSettings = storeSettings || {};

        const storeName = storeSettings.businessName || 'Royalvazier Textile';
        const parentCompany = storeSettings.parentCompany || 'Royalvazier Global Services Ltd';
        const rcNumber = storeSettings.rcNumber || 'RC9636293';
        const address = storeSettings.businessAddress || 'No:15 Gidan Baba Dan Baffa Beside Jumma’at Mosque opp. Ganduje Building Kantin Kwari market Kano';
        const phone = storeSettings.businessPhone || '+2348137098824 / +2349060042040';
        const logoUrl = storeSettings.businessLogo || '/royalvazier-logo.png';

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

        const items = sale.items || [];
        const itemsHtml = items.length > 0 ? items.map((it: any, idx: number) => {
            const lineTotal = (Number(it.price) || 0) * (Number(it.qty) || 1);
            return `
                <div style="display:grid;grid-template-columns:1fr 50px 85px;gap:8px;padding:7px 0;align-items:center;border-bottom:${idx === items.length - 1 ? 'none' : '1px dashed #F1F5F9'};">
                    <div style="text-align:left;">
                        <div style="font-size:12.5px;font-weight:700;color:#0F172A;line-height:1.3;">${it.name || 'Quality Fabric'}</div>
                        <div style="font-size:10.5px;color:#94A3B8;margin-top:1px;">₦${Number(it.price || 0).toLocaleString()} each</div>
                    </div>
                    <div style="text-align:center;font-size:12.5px;font-weight:700;color:#334155;">${it.qty || 1}</div>
                    <div style="text-align:right;font-size:12.5px;font-weight:800;color:#0F172A;">₦${lineTotal.toLocaleString()}</div>
                </div>
            `;
        }).join('') : `
            <div style="display:grid;grid-template-columns:1fr 50px 85px;gap:8px;padding:7px 0;align-items:center;">
                <div style="text-align:left;"><div style="font-size:12.5px;font-weight:700;color:#0F172A;">Retail Textile Order</div></div>
                <div style="text-align:center;font-size:12.5px;font-weight:700;">1</div>
                <div style="text-align:right;font-size:12.5px;font-weight:800;">₦${Number(sale.total || 0).toLocaleString()}</div>
            </div>
        `;

        const subtotal = Number(sale.subtotal) || Number(sale.total) || 0;
        const vat = Number(sale.vat) || 0;
        const total = Number(sale.total) || 0;
        const discount = subtotal > total ? subtotal - total : 0;

        const barcodeSvg = Utils.generateBarcodeSVG(sale.id);

        const topSerratedPath = "M0,10 L6,0 L12,10 L18,0 L24,10 L30,0 L36,10 L42,0 L48,10 L54,0 L60,10 L66,0 L72,10 L78,0 L84,10 L90,0 L96,10 L102,0 L108,10 L114,0 L120,10 L126,0 L132,10 L138,0 L144,10 L150,0 L156,10 L162,10 L168,0 L174,10 L180,0 L186,10 L192,0 L198,10 L204,0 L210,10 L216,0 L222,10 L228,0 L234,10 L240,0 L246,10 L252,0 L258,10 L264,0 L270,10 L276,0 L282,10 L288,0 L294,10 L300,0 L306,10 L312,0 L318,10 L324,0 L330,10 L336,0 L342,10 L348,0 L354,10 L360,10 Z";
        const bottomSerratedPath = "M0,0 L6,10 L12,0 L18,10 L24,0 L30,10 L36,0 L42,10 L48,0 L54,10 L60,0 L66,10 L72,0 L78,10 L84,0 L90,10 L96,0 L102,10 L108,0 L114,10 L120,0 L126,10 L132,0 L138,10 L144,0 L150,10 L156,0 L162,10 L168,0 L174,10 L180,0 L186,10 L192,0 L198,10 L204,0 L210,10 L216,0 L222,10 L228,0 L234,10 L240,0 L246,10 L252,0 L258,10 L264,0 L270,10 L276,0 L282,10 L288,0 L294,10 L300,0 L306,10 L312,0 L318,10 L324,0 L330,10 L336,0 L342,10 L348,0 L354,10 L360,0 Z";

        const isDebt = String(sale.paymentMethod || '').toLowerCase().includes('debt') && !sale.isSettlement;
        const formattedDueDate = sale.dueDate 
            ? new Date(sale.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'In 7 days';

        const displayTitle = sale.isSettlement 
            ? 'Debt Settlement Confirmed!' 
            : isDebt 
                ? 'Credit Sale Issued' 
                : 'Your order is confirmed!';

        const displaySubtitle = sale.isSettlement
            ? 'Debt Balance Settled & Cleared'
            : isDebt
                ? `Payment Pending · Due: ${formattedDueDate}`
                : 'Official Sales Receipt & Proof of Payment';

        return `
            <div class="ticket-outer-wrapper" style="width:100%;max-width:380px;margin:0 auto;filter:drop-shadow(0 18px 30px rgba(0,0,0,0.12));">
                <!-- Top Serrated Edge -->
                <div style="width:100%;height:10px;line-height:0;overflow:hidden;">
                    <svg viewBox="0 0 360 10" preserveAspectRatio="none" style="width:100%;height:10px;display:block;">
                        <path d="${topSerratedPath}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.75" />
                    </svg>
                </div>

                <!-- Main Receipt Body -->
                <div class="ticket-paper-content" style="background:#FFFFFF;padding:16px 20px 18px;font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;color:#0F172A;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
                    <!-- Top Meta Bar -->
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94A3B8;font-weight:600;">
                        <span style="font-family:'JetBrains Mono',monospace;letter-spacing:0.02em;">Order: #${String(sale.id).replace(/^SALE-/, '')}</span>
                        <span>${formattedDate} · ${formattedTime}</span>
                    </div>

                    <!-- Brand / Logo Section -->
                    <div style="text-align:center;margin-top:14px;margin-bottom:14px;">
                        <div style="width:56px;height:56px;margin:0 auto 8px;border-radius:50%;overflow:hidden;border:2px solid #F1F5F9;box-shadow:0 4px 10px rgba(0,0,0,0.06);">
                            <img src="${logoUrl}" alt="Royalvazier Textile" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='/logo.png';" />
                        </div>
                        <div style="font-size:16px;font-weight:800;color:#0F172A;letter-spacing:-0.01em;line-height:1.2;">
                            ${storeName}
                        </div>
                        <div style="font-size:10px;font-weight:700;color:#8C6A1A;letter-spacing:0.04em;text-transform:uppercase;margin-top:2px;">
                            ${parentCompany} · ${rcNumber}
                        </div>
                        <div style="font-size:11px;color:#64748B;margin-top:2px;">
                            Kantin Kwari Market, Kano
                        </div>

                        <div style="margin-top:12px;font-size:18px;font-weight:800;color:#0F172A;letter-spacing:-0.02em;">
                            ${displayTitle}
                        </div>
                        <div style="font-size:11px;color:${isDebt ? '#D97706' : '#059669'};font-weight:700;margin-top:2px;">
                            ${displaySubtitle}
                        </div>
                    </div>

                    <!-- Customer Information Strip -->
                    <div style="background:#F8FAFC;border-radius:10px;padding:8px 12px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;font-size:11.5px;border:1px solid #F1F5F9;">
                        <div style="text-align:left;">
                            <span style="color:#64748B;font-weight:600;">${isDebt ? 'Debtor: ' : 'Billed to: '}</span>
                            <strong style="color:#0F172A;">${sale.customerName || 'Walk-in Customer'}</strong>
                            ${sale.customerPhone ? `<div style="font-size:10.5px;color:#64748B;margin-top:1px;">Tel: ${sale.customerPhone}</div>` : ''}
                            ${isDebt ? `<div style="font-size:10px;color:#B45309;font-weight:700;margin-top:2px;">Due Date: ${formattedDueDate}</div>` : ''}
                        </div>
                        <span style="padding:4px 8px;border-radius:6px;background:${isDebt ? '#FEF3C7' : '#DCFCE7'};color:${isDebt ? '#B45309' : '#15803D'};font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;border:${isDebt ? '1px solid #FDE68A' : '1px solid #BBF7D0'};">
                            ${isDebt ? 'UNPAID CREDIT' : sale.isSettlement ? 'SETTLED' : String(sale.paymentMethod || 'Cash').toUpperCase()}
                        </span>
                    </div>

                    <!-- Section Title -->
                    <div style="font-size:10.5px;font-weight:800;color:#64748B;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;text-align:left;">
                        PAYMENT SUMMARY
                    </div>

                    <!-- Table Header -->
                    <div style="display:grid;grid-template-columns:1fr 50px 85px;gap:8px;padding-bottom:6px;border-bottom:1px solid #E2E8F0;font-size:10.5px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.04em;">
                        <div style="text-align:left;">ITEMS</div>
                        <div style="text-align:center;">QUANTITY</div>
                        <div style="text-align:right;">PRICE</div>
                    </div>

                    <!-- Items List -->
                    <div style="margin:4px 0 10px;">
                        ${itemsHtml}
                    </div>

                    <!-- Subtotals & Taxes -->
                    <div style="border-top:1px solid #E2E8F0;padding-top:10px;margin-top:6px;">
                        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#64748B;margin-bottom:4px;">
                            <span>Subtotal</span>
                            <span style="font-weight:600;color:#0F172A;">₦${subtotal.toLocaleString()}</span>
                        </div>
                        ${vat > 0 ? `
                            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#64748B;margin-bottom:4px;">
                                <span>VAT (7.5%)</span>
                                <span style="font-weight:600;color:#0F172A;">₦${vat.toLocaleString()}</span>
                            </div>
                        ` : ''}
                        ${discount > 0 ? `
                            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#DC2626;margin-bottom:4px;">
                                <span>Discount</span>
                                <span style="font-weight:700;">−₦${discount.toLocaleString()}</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Grand Total Row -->
                    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:12px;padding-top:10px;border-top:1px dashed #CBD5E1;">
                        <span style="font-size:15px;font-weight:800;color:#0F172A;letter-spacing:0.04em;">
                            ${isDebt ? 'BALANCE DUE' : 'TOTAL'}
                        </span>
                        <span style="font-size:26px;font-weight:800;color:${isDebt ? '#D97706' : '#059669'};letter-spacing:-0.02em;">
                            ₦${total.toLocaleString()}
                        </span>
                    </div>

                    <!-- Barcode & Store Details -->
                    <div style="margin-top:18px;padding-top:14px;border-top:1px solid #F1F5F9;text-align:center;">
                        <div style="display:flex;justify-content:center;overflow:hidden;">
                            ${barcodeSvg}
                        </div>
                        <div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:#64748B;letter-spacing:2px;margin-top:4px;font-weight:600;">
                            * ${sale.id} *
                        </div>

                        <div style="font-size:10px;color:#64748B;margin-top:10px;line-height:1.45;">
                            <div style="font-weight:700;color:#0F172A;">Selling Quality Textiles in Bulk & Retail Nationwide</div>
                            <div>${address}</div>
                            <div>Hotline: ${phone}</div>
                            <div style="font-size:9px;color:#94A3B8;margin-top:3px;">
                                Goods bought in good condition are not returnable
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Serrated Edge -->
                <div style="width:100%;height:10px;line-height:0;overflow:hidden;">
                    <svg viewBox="0 0 360 10" preserveAspectRatio="none" style="width:100%;height:10px;display:block;">
                        <path d="${bottomSerratedPath}" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.75" />
                    </svg>
                </div>
            </div>
        `;
    },

    generateReceiptHTML(sale: any, settings?: any): string {
        const bodyContent = Utils.generateReceiptPrintContent(sale, settings);
        let storeSettings = settings;
        if (!storeSettings && typeof window !== 'undefined') {
            storeSettings = {};
        }
        storeSettings = storeSettings || {};
        const storeName = storeSettings.businessName || 'Royalvazier Textile';
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${storeName} — Receipt #${sale.id}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
}
body {
    background: #0F172A;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 12px;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    color: #0F172A;
}
.ticket-outer-wrapper {
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
    filter: drop-shadow(0 18px 30px rgba(0,0,0,0.12));
}
.ticket-actions-bar {
    margin-top: 18px;
    display: flex;
    gap: 10px;
    width: 100%;
    max-width: 380px;
}
.ticket-btn {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    border: none;
    transition: transform 0.15s, opacity 0.15s;
}
.ticket-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.ticket-btn-primary { background: #059669; color: #FFFFFF; }
.ticket-btn-secondary { background: #1E293B; color: #F1F5F9; border: 1px solid #334155; }

@media print {
    @page {
        size: 80mm auto;
        margin: 0;
    }
    html, body {
        width: 80mm !important;
        max-width: 80mm !important;
        margin: 0 !important;
        padding: 3mm 0 !important;
        background: #FFFFFF !important;
        color: #0F172A !important;
        display: block !important;
        min-height: auto !important;
    }
    .ticket-outer-wrapper {
        width: 76mm !important;
        max-width: 76mm !important;
        margin: 0 auto !important;
        filter: none !important;
        box-shadow: none !important;
    }
    .ticket-paper-content {
        padding: 5mm 3.5mm !important;
    }
    .ticket-actions-bar {
        display: none !important;
    }
}
</style>
</head>
<body>
    ${bodyContent}
    <div class="ticket-actions-bar">
        <button class="ticket-btn ticket-btn-primary" onclick="window.print()">Print Receipt</button>
        <button class="ticket-btn ticket-btn-secondary" onclick="window.close()">Close</button>
    </div>
</body>
</html>`;
    },

    mountReceiptForPrint(sale: any, settings?: any): HTMLElement {
        let printContainer = document.getElementById('vendora-receipt-print-area');
        if (!printContainer) {
            printContainer = document.createElement('div');
            printContainer.id = 'vendora-receipt-print-area';
            printContainer.style.display = 'none';
            document.body.appendChild(printContainer);
        } else {
            printContainer.style.display = 'none';
        }
        printContainer.innerHTML = Utils.generateReceiptPrintContent(sale, settings);
        return printContainer;
    },

    printReceipt(sale: any, settings?: any): boolean {
        if (!sale) return false;
        try {
            // 1. Mount into dedicated print element for backup
            Utils.mountReceiptForPrint(sale, settings);

            // 2. Prepare iframe document for isolated, crisp thermal printing
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

            const receiptHtml = Utils.generateReceiptHTML(sale, settings);
            const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;

            if (frameDoc && iframe.contentWindow) {
                frameDoc.open();
                frameDoc.write(receiptHtml);
                frameDoc.close();

                // Wait for iframe styles/fonts to mount, then print iframe cleanly
                setTimeout(() => {
                    try {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                    } catch (iframePrintErr) {
                        console.warn('Iframe print error, attempting window popup print:', iframePrintErr);
                        const printWin = window.open('', '_blank', 'width=420,height=700');
                        if (printWin) {
                            printWin.document.open();
                            printWin.document.write(receiptHtml);
                            printWin.document.close();
                            printWin.focus();
                            setTimeout(() => {
                                printWin.print();
                            }, 250);
                        } else {
                            window.focus();
                            window.print();
                        }
                    }
                }, 200);

                return true;
            }

            // Fallback: window print
            window.focus();
            window.print();
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
