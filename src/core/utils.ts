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

                    <!-- Buyer Details Card -->
                    <div style="background:#F8FAFC;border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:11.5px;border:1px solid #E2E8F0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid #EDF2F7;padding-bottom:5px;">
                            <span style="font-size:10px;font-weight:800;color:#475569;letter-spacing:0.05em;text-transform:uppercase;">BUYER DETAILS</span>
                            <span style="padding:2px 7px;border-radius:5px;background:${isDebt ? '#FEF3C7' : '#DCFCE7'};color:${isDebt ? '#B45309' : '#15803D'};font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;border:${isDebt ? '1px solid #FDE68A' : '1px solid #BBF7D0'};">
                                ${isDebt ? 'UNPAID CREDIT' : sale.isSettlement ? 'SETTLED' : String(sale.paymentMethod || 'Cash').toUpperCase()}
                            </span>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:3px;text-align:left;">
                            <div style="display:flex;gap:6px;">
                                <span style="color:#64748B;font-weight:600;width:65px;flex-shrink:0;">Buyer:</span>
                                <strong style="color:#0F172A;">${sale.customerName || 'Walk-in Customer'}</strong>
                            </div>
                            ${sale.customerPhone ? `
                            <div style="display:flex;gap:6px;">
                                <span style="color:#64748B;font-weight:600;width:65px;flex-shrink:0;">Phone:</span>
                                <span style="color:#0F172A;font-weight:600;">${sale.customerPhone}</span>
                            </div>` : ''}
                            ${sale.customerAddress ? `
                            <div style="display:flex;gap:6px;">
                                <span style="color:#64748B;font-weight:600;width:65px;flex-shrink:0;">Address:</span>
                                <span style="color:#0F172A;font-weight:500;">${sale.customerAddress}</span>
                            </div>` : ''}
                            ${isDebt ? `
                            <div style="display:flex;gap:6px;color:#B45309;font-weight:700;font-size:10.5px;margin-top:2px;">
                                <span style="width:65px;flex-shrink:0;">Due Date:</span>
                                <span>${formattedDueDate}</span>
                            </div>` : ''}
                        </div>
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

                    <!-- Subtotals & Discounts (VAT tracked internally) -->
                    <div style="border-top:1px solid #E2E8F0;padding-top:10px;margin-top:6px;">
                        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#64748B;margin-bottom:4px;">
                            <span>Subtotal</span>
                            <span style="font-weight:600;color:#0F172A;">₦${subtotal.toLocaleString()}</span>
                        </div>
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
    .ticket-paper-content img {
        max-width: 52px !important;
        height: auto !important;
        filter: grayscale(100%) contrast(160%) !important;
        image-rendering: crisp-edges !important;
        -webkit-filter: grayscale(100%) contrast(160%) !important;
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
        text += `          ${(storeSettings.businessName || 'ROYALVAZIER TEXTILE').toUpperCase()}\n`;
        text += `     ${storeSettings.businessAddress || 'Kantin Kwari Market, Kano'}\n`;
        text += `        Tel: ${storeSettings.businessPhone || '+2348137098824'}\n`;
        text += `${divider}\n`;
        text += `RECEIPT #: ${sale.id}\n`;
        text += `DATE:      ${dateStr}\n`;
        text += `${thinDivider}\n`;
        text += `BUYER DETAILS:\n`;
        text += `  Buyer:   ${sale.customerName || 'Walk-in Customer'}\n`;
        if (sale.customerPhone) text += `  Phone:   ${sale.customerPhone}\n`;
        if (sale.customerAddress) text += `  Address: ${sale.customerAddress}\n`;
        text += `  Payment: ${(sale.paymentMethod || 'Cash').toUpperCase()}\n`;
        if (String(sale.paymentMethod || '').toLowerCase().includes('debt') && !sale.isSettlement) {
            text += `  Due Date: ${sale.dueDate ? new Date(sale.dueDate).toLocaleDateString('en-US') : 'In 7 days'} (UNPAID CREDIT)\n`;
        }
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
        text += `Subtotal:                  ₦${(Number(sale.subtotal) || Number(sale.total) || 0).toLocaleString()}.00\n`;
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

    async generateReceiptImageBlob(sale: any, settings?: any): Promise<Blob | null> {
        return new Promise(async (resolve) => {
            try {
                // Try preloading logo image
                const logoImg: HTMLImageElement | null = await new Promise((res) => {
                    if (typeof Image === 'undefined') return res(null);
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    let settled = false;
                    img.onload = () => { if (!settled) { settled = true; res(img); } };
                    img.onerror = () => { if (!settled) { settled = true; res(null); } };
                    img.src = settings?.businessLogo || '/royalvazier-logo.png';
                    setTimeout(() => { if (!settled) { settled = true; res(null); } }, 400);
                });

                const canvas = document.createElement('canvas');
                const scale = 3; // 300 DPI high-definition retina
                const width = 420;
                const items = sale.items || [];
                const isDebt = String(sale.paymentMethod || '').toLowerCase().includes('debt') && !sale.isSettlement;
                const formattedDueDate = sale.dueDate
                    ? new Date(sale.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'In 7 days';

                // Calculate dynamic Buyer Details Card height
                const buyerLinesCount = 1 + (sale.customerPhone ? 1 : 0) + (sale.customerAddress ? 1 : 0) + (isDebt ? 1 : 0);
                const custBoxH = 34 + buyerLinesCount * 20 + 8;
                const headerHeight = 220 + custBoxH;
                const itemsHeight = Math.max(1, items.length) * 44;
                const totalsHeight = 175;
                const footerHeight = 155;
                const height = headerHeight + itemsHeight + totalsHeight + footerHeight;

                canvas.width = width * scale;
                canvas.height = height * scale;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }

                ctx.scale(scale, scale);

                // Background
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);

                // Subtle luxury outer border
                ctx.strokeStyle = '#E2E8F0';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(12, 12, width - 24, height - 24);

                // Gold decorative top bar
                ctx.fillStyle = '#C9A227';
                ctx.fillRect(12, 12, width - 24, 4);

                // Top Meta Bar
                ctx.fillStyle = '#94A3B8';
                ctx.font = '600 11px system-ui, -apple-system, sans-serif';
                ctx.fillText(`ORDER #${String(sale.id).replace(/^SALE-/, '')}`, 24, 38);
                const dateObj = sale.date ? new Date(sale.date) : new Date();
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                ctx.textAlign = 'right';
                ctx.fillText(dateStr, width - 24, 38);
                ctx.textAlign = 'left';

                // Logo / Brand Icon
                const logoY = 56;
                const logoSize = 56;
                const logoX = (width - logoSize) / 2;

                if (logoImg) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(width / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
                    ctx.restore();
                    // Gold ring around logo
                    ctx.strokeStyle = '#C9A227';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(width / 2, logoY + logoSize / 2, logoSize / 2 + 1, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    // Fallback Royal Gold Seal
                    ctx.fillStyle = '#FFF7ED';
                    ctx.beginPath();
                    ctx.arc(width / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#C9A227';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.fillStyle = '#8C6A1A';
                    ctx.font = '800 18px serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('RV', width / 2, logoY + logoSize / 2 + 6);
                }

                // Brand Titles
                const storeName = settings?.businessName || 'Royalvazier Textile';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#0F172A';
                ctx.font = '800 20px system-ui, -apple-system, sans-serif';
                ctx.fillText(storeName, width / 2, logoY + logoSize + 22);

                ctx.fillStyle = '#8C6A1A';
                ctx.font = '700 10.5px system-ui, -apple-system, sans-serif';
                ctx.fillText((settings?.parentCompany || 'Royalvazier Global Services Ltd') + ' · ' + (settings?.rcNumber || 'RC9636293'), width / 2, logoY + logoSize + 36);

                ctx.fillStyle = '#64748B';
                ctx.font = '500 11px system-ui, -apple-system, sans-serif';
                ctx.fillText('No:15 Gidan Baba Dan Baffa, Kantin Kwari market, Kano', width / 2, logoY + logoSize + 51);

                // Receipt Title Banner
                ctx.fillStyle = isDebt ? '#B45309' : '#047857';
                ctx.font = '800 14px system-ui, -apple-system, sans-serif';
                ctx.fillText(sale.isSettlement ? 'DEBT SETTLEMENT RECEIPT' : isDebt ? 'CREDIT SALE ISSUED' : 'OFFICIAL SALES RECEIPT', width / 2, logoY + logoSize + 76);

                // BUYER DETAILS Card
                const custBoxY = logoY + logoSize + 92;
                ctx.textAlign = 'left';
                ctx.fillStyle = '#F8FAFC';
                ctx.beginPath();
                if ((ctx as any).roundRect) {
                    (ctx as any).roundRect(24, custBoxY, width - 48, custBoxH, 10);
                } else {
                    ctx.rect(24, custBoxY, width - 48, custBoxH);
                }
                ctx.fill();
                ctx.strokeStyle = '#E2E8F0';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Card Header: "BUYER DETAILS" + Payment Status Badge
                ctx.fillStyle = '#475569';
                ctx.font = '800 10.5px system-ui, -apple-system, sans-serif';
                ctx.fillText('BUYER DETAILS', 36, custBoxY + 18);

                // Badge on right of header
                const badgeText = isDebt ? 'UNPAID CREDIT' : sale.isSettlement ? 'SETTLED' : String(sale.paymentMethod || 'Cash').toUpperCase();
                ctx.font = '800 9.5px system-ui, -apple-system, sans-serif';
                const badgeWidth = ctx.measureText(badgeText).width + 14;
                const badgeX = width - 36 - badgeWidth;
                const badgeY = custBoxY + 7;
                ctx.fillStyle = isDebt ? '#FEF3C7' : '#DCFCE7';
                ctx.beginPath();
                if ((ctx as any).roundRect) {
                    (ctx as any).roundRect(badgeX, badgeY, badgeWidth, 16, 4);
                } else {
                    ctx.rect(badgeX, badgeY, badgeWidth, 16);
                }
                ctx.fill();
                ctx.strokeStyle = isDebt ? '#FDE68A' : '#BBF7D0';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = isDebt ? '#B45309' : '#15803D';
                ctx.textAlign = 'center';
                ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + 12);
                ctx.textAlign = 'left';

                // Subtle divider below header
                ctx.strokeStyle = '#EDF2F7';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(34, custBoxY + 28);
                ctx.lineTo(width - 34, custBoxY + 28);
                ctx.stroke();

                // Lines inside Buyer Card
                let cardLineY = custBoxY + 46;

                // Line 1: Buyer Name
                ctx.fillStyle = '#64748B';
                ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
                ctx.fillText('Buyer:', 36, cardLineY);
                ctx.fillStyle = '#0F172A';
                ctx.font = '800 13px system-ui, -apple-system, sans-serif';
                const custName = String(sale.customerName || 'Walk-in Customer');
                ctx.fillText(custName.length > 28 ? custName.substring(0, 28) + '...' : custName, 96, cardLineY);

                // Line 2: Phone Number (if present)
                if (sale.customerPhone) {
                    cardLineY += 20;
                    ctx.fillStyle = '#64748B';
                    ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
                    ctx.fillText('Phone:', 36, cardLineY);
                    ctx.fillStyle = '#0F172A';
                    ctx.font = '700 12px system-ui, -apple-system, sans-serif';
                    ctx.fillText(sale.customerPhone, 96, cardLineY);
                }

                // Line 3: Address (if present)
                if (sale.customerAddress) {
                    cardLineY += 20;
                    ctx.fillStyle = '#64748B';
                    ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
                    ctx.fillText('Address:', 36, cardLineY);
                    ctx.fillStyle = '#0F172A';
                    ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
                    const addrStr = String(sale.customerAddress);
                    ctx.fillText(addrStr.length > 32 ? addrStr.substring(0, 32) + '...' : addrStr, 96, cardLineY);
                }

                // Line 4: Due Date (if credit sale)
                if (isDebt) {
                    cardLineY += 20;
                    ctx.fillStyle = '#B45309';
                    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
                    ctx.fillText('Due Date:', 36, cardLineY);
                    ctx.fillText(formattedDueDate, 96, cardLineY);
                }

                // Table Header
                let currY = custBoxY + custBoxH + 26;
                ctx.fillStyle = '#94A3B8';
                ctx.font = '700 10.5px system-ui, -apple-system, sans-serif';
                ctx.fillText('FABRICS & ITEMS', 24, currY);
                ctx.textAlign = 'center';
                ctx.fillText('QTY', width - 110, currY);
                ctx.textAlign = 'right';
                ctx.fillText('AMOUNT', width - 24, currY);
                ctx.textAlign = 'left';

                ctx.strokeStyle = '#CBD5E1';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(24, currY + 6);
                ctx.lineTo(width - 24, currY + 6);
                ctx.stroke();

                currY += 26;

                // Items list
                items.forEach((it: any) => {
                    ctx.fillStyle = '#0F172A';
                    ctx.font = '700 13px system-ui, -apple-system, sans-serif';
                    const name = String(it.name || 'Textile Fabric');
                    ctx.fillText(name.length > 26 ? name.substring(0, 26) + '...' : name, 24, currY);

                    ctx.fillStyle = '#64748B';
                    ctx.font = '500 11px system-ui, -apple-system, sans-serif';
                    ctx.fillText(`₦${Number(it.price || 0).toLocaleString()} per unit`, 24, currY + 15);

                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#334155';
                    ctx.font = '700 13px system-ui, -apple-system, sans-serif';
                    ctx.fillText(String(it.qty || 1), width - 110, currY + 6);

                    ctx.textAlign = 'right';
                    ctx.fillStyle = '#0F172A';
                    ctx.font = '800 13px system-ui, -apple-system, sans-serif';
                    ctx.fillText(`₦${(Number(it.price || 0) * Number(it.qty || 1)).toLocaleString()}`, width - 24, currY + 6);
                    ctx.textAlign = 'left';

                    currY += 42;
                });

                // Financial Summary
                currY += 4;
                ctx.strokeStyle = '#E2E8F0';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(24, currY);
                ctx.lineTo(width - 24, currY);
                ctx.stroke();

                currY += 22;
                ctx.fillStyle = '#64748B';
                ctx.font = '600 12px system-ui, -apple-system, sans-serif';
                ctx.fillText('Subtotal', 24, currY);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#0F172A';
                ctx.font = '700 13px system-ui, -apple-system, sans-serif';
                const subtotal = Number(sale.subtotal) || Number(sale.total) || 0;
                ctx.fillText(`₦${subtotal.toLocaleString()}`, width - 24, currY);
                ctx.textAlign = 'left';

                currY += 20;
                // Dashed separator before grand total
                ctx.setLineDash([5, 4]);
                ctx.strokeStyle = '#CBD5E1';
                ctx.beginPath();
                ctx.moveTo(24, currY);
                ctx.lineTo(width - 24, currY);
                ctx.stroke();
                ctx.setLineDash([]);

                currY += 28;
                ctx.fillStyle = '#0F172A';
                ctx.font = '800 15px system-ui, -apple-system, sans-serif';
                ctx.fillText(isDebt ? 'BALANCE DUE' : 'TOTAL PAID', 24, currY);

                ctx.textAlign = 'right';
                ctx.fillStyle = isDebt ? '#D97706' : '#059669';
                ctx.font = '800 24px system-ui, -apple-system, sans-serif';
                ctx.fillText(`₦${(Number(sale.total) || 0).toLocaleString()}`, width - 24, currY);
                ctx.textAlign = 'left';

                currY += 20;
                ctx.fillStyle = '#64748B';
                ctx.font = '600 11.5px system-ui, -apple-system, sans-serif';
                ctx.fillText(`Payment Method: ${String(sale.paymentMethod || 'Cash')}`, 24, currY);

                // Barcode simulation
                currY += 28;
                const barW = 180;
                const barH = 26;
                const barX = (width - barW) / 2;
                for (let b = 0; b < barW; b += 3) {
                    if ((b * 13 + 7) % 17 > 4) {
                        ctx.fillStyle = '#0F172A';
                        ctx.fillRect(barX + b, currY, 1.6, barH);
                    }
                }
                ctx.textAlign = 'center';
                ctx.fillStyle = '#64748B';
                ctx.font = '600 10px monospace';
                ctx.fillText(`* ${sale.id} *`, width / 2, currY + barH + 12);

                // Footer lines
                currY += barH + 28;
                ctx.fillStyle = '#0F172A';
                ctx.font = '700 11px system-ui, -apple-system, sans-serif';
                ctx.fillText('Wholesale & Retail Fabrics Across Nigeria', width / 2, currY);

                ctx.fillStyle = '#64748B';
                ctx.font = '500 10px system-ui, -apple-system, sans-serif';
                ctx.fillText('Hotline: +234 813 709 8824 · +234 906 004 2040', width / 2, currY + 16);
                ctx.fillText('Goods bought in good condition are not returnable', width / 2, currY + 30);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            } catch (e) {
                console.warn('Canvas receipt generation failed:', e);
                resolve(null);
            }
        });
    },

    async shareReceiptWhatsApp(sale: any, settings?: any): Promise<{ success: boolean; message: string }> {
        if (!sale) return { success: false, message: 'No sale to share' };

        const storeSettings = settings || {};
        const storeName = storeSettings.businessName || 'Royalvazier Textile';
        const storeAddress = storeSettings.businessAddress || 'No:15 Gidan Baba Dan Baffa Beside Jumma’at Mosque opp. Ganduje Building Kantin Kwari market Kano';
        const storePhone = storeSettings.businessPhone || '+2348137098824 / +2349060042040';

        // Clean and validate the phone number
        const rawDigits = (sale.customerPhone || '').replace(/[^0-9]/g, '');
        let cleanPhone = '';
        if (rawDigits.length >= 10) {
            if (rawDigits.startsWith('0') && rawDigits.length === 11) {
                // e.g. 08012345678 -> 2348012345678
                cleanPhone = '234' + rawDigits.substring(1);
            } else if (rawDigits.startsWith('234') && rawDigits.length >= 13) {
                cleanPhone = rawDigits;
            } else if (rawDigits.length === 10) {
                cleanPhone = '234' + rawDigits;
            } else {
                cleanPhone = rawDigits;
            }
        }

        const isDebt = String(sale.paymentMethod || '').toLowerCase().includes('debt') && !sale.isSettlement;
        const formattedDueDate = sale.dueDate
            ? new Date(sale.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'In 7 days';

        const dateObj = sale.date ? new Date(sale.date) : new Date();
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const items = sale.items || [];
        const itemsList = items.map((it: any) => `• ${it.name} (x${it.qty || 1}) - ₦${((Number(it.price) || 0) * (Number(it.qty) || 1)).toLocaleString()}`).join('\n');

        const whatsappMsg = [
            `🧾 *${storeName.toUpperCase()}*`,
            `*Sales Receipt #${String(sale.id).replace(/^SALE-/, '')}*`,
            `📅 ${dateStr}`,
            ``,
            `👤 *BUYER DETAILS:*`,
            `• *Buyer:* ${sale.customerName || 'Walk-in Customer'}`,
            sale.customerPhone ? `• *Phone:* ${sale.customerPhone}` : null,
            sale.customerAddress ? `• *Address:* ${sale.customerAddress}` : null,
            `• *Payment:* ${isDebt ? `UNPAID CREDIT (Due: ${formattedDueDate})` : sale.isSettlement ? 'SETTLED' : String(sale.paymentMethod || 'Cash').toUpperCase()}`,
            ``,
            `📦 *ITEMS PURCHASED:*`,
            itemsList || '• Retail Textile Fabric Order',
            ``,
            `💰 *TOTAL: ₦${Number(sale.total || 0).toLocaleString()}*`,
            ``,
            `📍 ${storeAddress}`,
            `📞 Hotline: ${storePhone}`,
            `_Goods bought in good condition are not returnable._`
        ].filter(Boolean).join('\n');

        const blob = await Utils.generateReceiptImageBlob(sale, settings);

        // 1. Mobile Native Web Share API: share file as IMAGE directly to WhatsApp without opening browser tabs
        if (blob && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
            try {
                const file = new File([blob], `Receipt_${sale.id}.png`, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `${storeName} Receipt #${sale.id}`,
                        text: whatsappMsg,
                        files: [file]
                    });
                    return { success: true, message: '✓ Receipt image shared directly to WhatsApp!' };
                }
            } catch (err: any) {
                if (err.name === 'AbortError') {
                    return { success: true, message: 'Share closed' };
                }
                console.warn('Native share failed, continuing with direct WhatsApp URL:', err);
            }
        }

        // 2. Desktop Web: Copy Image directly to clipboard so user can press Ctrl+V into WhatsApp
        let copied = false;
        if (blob && typeof navigator !== 'undefined' && navigator.clipboard && (window as any).ClipboardItem) {
            try {
                await navigator.clipboard.write([
                    new (window as any).ClipboardItem({ 'image/png': blob })
                ]);
                copied = true;
            } catch (clipErr) {
                console.warn('Clipboard image write failed:', clipErr);
            }
        }

        // 3. Open WhatsApp directly with prefilled receipt text and buyer details (NEVER trigger a browser file download)
        const encodedText = encodeURIComponent(whatsappMsg);
        const targetUrl = cleanPhone
            ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
            : `https://api.whatsapp.com/send?text=${encodedText}`;

        window.open(targetUrl, '_blank', 'noopener,noreferrer');

        return {
            success: true,
            message: copied
                ? '📸 Receipt image copied to clipboard! In WhatsApp, press Ctrl+V (Paste) to send.'
                : '✓ Opening WhatsApp with receipt and buyer details.'
        };
    },

    async downloadReceiptImage(sale: any, settings?: any): Promise<void> {
        if (!sale) return;
        const blob = await Utils.generateReceiptImageBlob(sale, settings);
        if (blob && typeof window !== 'undefined') {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Receipt_${sale.id}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
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
