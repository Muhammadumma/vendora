import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Store, Product, Sale, Debt, Purchase, Settings } from './store';
import { Utils } from './utils';

export const ExportService = {
    // -------------------------------------------------------------
    // Formatters & Helpers
    // -------------------------------------------------------------
    formatCurrency(amount: number | undefined | null): string {
        const val = Number(amount) || 0;
        return `NGN ${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    },

    formatDate(dateStr: string | undefined): string {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
            return dateStr;
        }
    },

    formatDateTime(dateStr: string | undefined): string {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch {
            return dateStr;
        }
    },

    downloadJSONFile(data: any, filename: string) {
        const json = JSON.stringify(data, null, 2);
        Utils.downloadFile(json, filename, 'application/json;charset=utf-8;');
    },

    // -------------------------------------------------------------
    // 1. MASTER BACKUP & COMPLETE BUSINESS DOSSIER
    // -------------------------------------------------------------
    exportAllDataJSON() {
        Store.downloadBackup();
    },

    exportAllDataPDF() {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const settings = Store.getSettings();
        const user = Store.getUser();
        const products = Store.getProducts();
        const sales = Store.getSales();
        const debts = Store.getDebts();
        const purchases = Store.getPurchases();
        const nowStr = new Date().toISOString();
        const dateFormatted = this.formatDateTime(nowStr);

        const primaryColor: [number, number, number] = [201, 162, 39]; // Royal Gold #C9A227
        const darkColor: [number, number, number] = [15, 23, 42]; // Slate 900 #0F172A
        const accentBg: [number, number, number] = [248, 242, 226]; // Royal Paper

        // Cover / Header Banner
        doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.rect(0, 0, 210, 32, 'F');

        doc.setTextColor(255, 233, 168);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text((settings.businessName || 'VENDORA RETAIL').toUpperCase(), 14, 13);

        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`${settings.businessAddress || 'Official Retail Outlet'}  |  Tel: ${settings.businessPhone || 'N/A'}`, 14, 20);
        doc.text(`MASTER BUSINESS AUDIT & FINANCIAL LEDGER REPORT`, 14, 26);

        doc.setTextColor(229, 185, 78);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`Generated: ${dateFormatted}`, 196, 13, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(203, 213, 225);
        doc.text(`Operator: ${user?.name || 'Authorized Admin'}`, 196, 20, { align: 'right' });

        // KPI Summary Highlights
        let currentY = 40;
        const totalStockVal = Store.getTotalStockValue();
        const totalRetailVal = Store.getTotalRetailValue();
        const totalSalesRev = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const activeDebts = debts.filter(d => d.status !== 'Paid' && d.status !== 'Settled');
        const activeDebtTotal = activeDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

        doc.setFillColor(accentBg[0], accentBg[1], accentBg[2]);
        doc.roundedRect(14, currentY, 182, 22, 2, 2, 'F');
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(14, currentY, 182, 22, 2, 2, 'D');

        const kpis = [
            { label: 'TOTAL INVENTORY COST', val: this.formatCurrency(totalStockVal) },
            { label: 'EST. RETAIL VALUE', val: this.formatCurrency(totalRetailVal) },
            { label: 'TOTAL RECORDED SALES', val: this.formatCurrency(totalSalesRev) },
            { label: 'ACTIVE UNPAID DEBT', val: this.formatCurrency(activeDebtTotal) }
        ];

        kpis.forEach((kpi, idx) => {
            const x = 16 + (idx * 45);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(140, 106, 26);
            doc.text(kpi.label, x, currentY + 7);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(kpi.val, x, currentY + 15);
        });

        currentY += 30;

        // Section 1: Inventory Stock Table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('1. Inventory Valuation & Stock Catalog', 14, currentY);

        const productRows = products.map((p, idx) => {
            const qty = Number(p.qty) || 0;
            const buy = Number(p.buyPrice) || 0;
            const sell = Number(p.sellPrice) || 0;
            const totalVal = qty * buy;
            const margin = sell > 0 ? Math.round(((sell - buy) / sell) * 100) : 0;
            return [
                p.sku || `SKU-${idx + 1}`,
                p.name,
                p.category || 'General',
                String(qty),
                this.formatCurrency(buy),
                this.formatCurrency(sell),
                this.formatCurrency(totalVal),
                `${margin}%`
            ];
        });

        autoTable(doc, {
            startY: currentY + 3,
            head: [['SKU', 'Product Name', 'Category', 'Stock Qty', 'Buy Cost', 'Sell Price', 'Total Cost Value', 'Margin']],
            body: productRows.length > 0 ? productRows : [['-', 'No products recorded in inventory', '-', '-', '-', '-', '-', '-']],
            foot: productRows.length > 0 ? [[
                'TOTALS',
                `${products.length} Products listed`,
                '-',
                String(products.reduce((acc, p) => acc + (Number(p.qty) || 0), 0)),
                '-',
                '-',
                this.formatCurrency(totalStockVal),
                '-'
            ]] : undefined,
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontSize: 7.5,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 7,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontSize: 7.5,
                fontStyle: 'bold'
            },
            margin: { left: 14, right: 14 }
        });

        // Section 2: Sales Ledger
        doc.addPage();
        doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.rect(0, 0, 210, 18, 'F');
        doc.setTextColor(255, 233, 168);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('2. Historical Sales & Revenue Ledger', 14, 12);
        doc.setFontSize(8);
        doc.setTextColor(203, 213, 225);
        doc.text(`${settings.businessName} - Official Ledger`, 196, 12, { align: 'right' });

        const saleRows = sales.map(s => {
            const itemsCount = s.items?.reduce((c, it) => c + (Number(it.qty) || 1), 0) || s.items?.length || 1;
            return [
                s.id,
                ExportService.formatDateTime(s.date),
                s.customerName || 'Walk-in Customer',
                String(itemsCount),
                s.paymentMethod || 'Cash',
                ExportService.formatCurrency(s.subtotal || s.total),
                ExportService.formatCurrency(s.vat || 0),
                ExportService.formatCurrency(s.total)
            ];
        });

        autoTable(doc, {
            startY: 24,
            head: [['Receipt #', 'Date / Time', 'Customer', 'Items', 'Payment', 'Subtotal', 'VAT', 'Total Paid']],
            body: saleRows.length > 0 ? saleRows : [['-', 'No completed sales recorded', '-', '-', '-', '-', '-', '-']],
            foot: saleRows.length > 0 ? [[
                'TOTAL REVENUE',
                `${sales.length} Transactions`,
                '-',
                '-',
                '-',
                '-',
                '-',
                ExportService.formatCurrency(totalSalesRev)
            ]] : undefined,
            theme: 'grid',
            headStyles: {
                fillColor: [140, 106, 26],
                textColor: [255, 255, 255],
                fontSize: 7.5,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 7,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [254, 252, 246]
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontSize: 7.5,
                fontStyle: 'bold'
            },
            margin: { left: 14, right: 14 }
        });

        // Section 3: Customer Debts
        doc.addPage();
        doc.setFillColor(darkColor[0], darkColor[1], darkColor[2]);
        doc.rect(0, 0, 210, 18, 'F');
        doc.setTextColor(255, 233, 168);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('3. Customer Credit & Debt Recovery Register', 14, 12);
        doc.setFontSize(8);
        doc.setTextColor(203, 213, 225);
        doc.text(`Active Debt: ${ExportService.formatCurrency(activeDebtTotal)}`, 196, 12, { align: 'right' });

        const debtRows = debts.map(d => [
            d.debtor,
            d.phone || 'N/A',
            d.product || 'Items on Credit',
            ExportService.formatCurrency(d.amount),
            ExportService.formatDate(d.dueDate),
            d.status.toUpperCase(),
            d.settledDate ? ExportService.formatDate(d.settledDate) : 'Pending'
        ]);

        autoTable(doc, {
            startY: 24,
            head: [['Debtor Name', 'Phone Number', 'Goods on Credit', 'Amount Due', 'Due Date', 'Status', 'Settled Date']],
            body: debtRows.length > 0 ? debtRows : [['-', 'No outstanding credit or debts found', '-', '-', '-', '-', '-']],
            foot: debtRows.length > 0 ? [[
                'TOTAL DEBT RECORDED',
                '-',
                '-',
                ExportService.formatCurrency(debts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)),
                '-',
                `${activeDebts.length} Active / ${debts.length - activeDebts.length} Settled`,
                '-'
            ]] : undefined,
            theme: 'grid',
            headStyles: {
                fillColor: [22, 101, 52],
                textColor: [255, 255, 255],
                fontSize: 7.5,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 7,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [240, 253, 244]
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontSize: 7.5,
                fontStyle: 'bold'
            },
            margin: { left: 14, right: 14 }
        });

        // Footer & Page Numbers
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`Vendora Smart Shop Ledger | Confidential & Proprietary | Page ${i} of ${totalPages}`, 105, 292, { align: 'center' });
        }

        const dateSlug = nowStr.split('T')[0];
        doc.save(`Vendora_Master_Business_Report_${dateSlug}.pdf`);
    },

    // -------------------------------------------------------------
    // 2. INVENTORY CATALOG EXPORTS (JSON & PDF)
    // -------------------------------------------------------------
    exportInventoryJSON(productsList?: Product[]) {
        const products = productsList || Store.getProducts();
        const exportObj = {
            exportType: 'Inventory Catalog',
            store: Store.getSettings().businessName,
            exportedAt: new Date().toISOString(),
            totalProducts: products.length,
            totalStockCost: Store.getTotalStockValue(),
            totalRetailValue: Store.getTotalRetailValue(),
            products
        };
        const dateSlug = new Date().toISOString().split('T')[0];
        this.downloadJSONFile(exportObj, `Inventory_Catalog_${dateSlug}.json`);
    },

    exportInventoryPDF(productsList?: Product[]) {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const settings = Store.getSettings();
        const products = productsList || Store.getProducts();
        const totalStockVal = Store.getTotalStockValue();
        const totalRetailVal = Store.getTotalRetailValue();
        const dateSlug = new Date().toISOString().split('T')[0];

        // Header Banner
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 26, 'F');
        doc.setTextColor(255, 233, 168);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text((settings.businessName || 'VENDORA RETAIL').toUpperCase(), 14, 11);

        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`Official Inventory Stock & Valuation Table  |  ${products.length} SKUs Listed`, 14, 18);
        doc.text(`Generated: ${this.formatDateTime(new Date().toISOString())}`, 196, 18, { align: 'right' });

        const rows = products.map((p, idx) => {
            const qty = Number(p.qty) || 0;
            const buy = Number(p.buyPrice) || 0;
            const sell = Number(p.sellPrice) || 0;
            const val = qty * buy;
            const margin = sell > 0 ? Math.round(((sell - buy) / sell) * 100) : 0;
            return [
                p.sku || `SKU-${idx + 1}`,
                p.name,
                p.category || 'General',
                String(qty),
                this.formatCurrency(buy),
                this.formatCurrency(sell),
                this.formatCurrency(val),
                `${margin}%`
            ];
        });

        autoTable(doc, {
            startY: 32,
            head: [['SKU', 'Product Name', 'Category', 'Stock Qty', 'Cost Price', 'Selling Price', 'Inventory Value', 'Margin']],
            body: rows.length > 0 ? rows : [['-', 'No products in inventory', '-', '-', '-', '-', '-', '-']],
            foot: rows.length > 0 ? [[
                'TOTAL',
                `${products.length} Items`,
                '-',
                String(products.reduce((acc, p) => acc + (Number(p.qty) || 0), 0)),
                '-',
                '-',
                this.formatCurrency(totalStockVal),
                '-'
            ]] : undefined,
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 7.5,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontSize: 8,
                fontStyle: 'bold'
            },
            margin: { left: 14, right: 14 }
        });

        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${totalPages}  |  ${settings.businessName} Inventory Report`, 105, 292, { align: 'center' });
        }

        doc.save(`Inventory_Catalog_Table_${dateSlug}.pdf`);
    },

    // -------------------------------------------------------------
    // 3. SALES LEDGER EXPORTS (JSON & PDF)
    // -------------------------------------------------------------
    exportSalesJSON(salesList?: Sale[]) {
        const sales = salesList || Store.getSales();
        const exportObj = {
            exportType: 'Sales Transactions Ledger',
            store: Store.getSettings().businessName,
            exportedAt: new Date().toISOString(),
            totalTransactions: sales.length,
            totalRevenue: sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
            sales
        };
        const dateSlug = new Date().toISOString().split('T')[0];
        this.downloadJSONFile(exportObj, `Sales_Ledger_${dateSlug}.json`);
    },

    exportSalesPDF(salesList?: Sale[]) {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const settings = Store.getSettings();
        const sales = salesList || Store.getSales();
        const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const dateSlug = new Date().toISOString().split('T')[0];

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 26, 'F');
        doc.setTextColor(255, 233, 168);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text((settings.businessName || 'VENDORA RETAIL').toUpperCase(), 14, 11);

        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`Official Sales & Revenue Ledger Table  |  ${sales.length} Transactions`, 14, 18);
        doc.text(`Generated: ${this.formatDateTime(new Date().toISOString())}`, 196, 18, { align: 'right' });

        const rows = sales.map(s => {
            const itemsSummary = s.items?.map(it => `${it.qty}x ${it.name}`).join(', ') || 'Item';
            return [
                s.id,
                ExportService.formatDateTime(s.date),
                s.customerName || 'Walk-in Customer',
                itemsSummary.length > 28 ? itemsSummary.substring(0, 26) + '...' : itemsSummary,
                s.paymentMethod || 'Cash',
                ExportService.formatCurrency(s.total)
            ];
        });

        autoTable(doc, {
            startY: 32,
            head: [['Receipt #', 'Date / Time', 'Customer', 'Items Sold', 'Method', 'Total Amount']],
            body: rows.length > 0 ? rows : [['-', 'No sales recorded', '-', '-', '-', '-']],
            foot: rows.length > 0 ? [[
                'TOTAL SALES',
                `${sales.length} Invoices`,
                '-',
                '-',
                '-',
                this.formatCurrency(totalRevenue)
            ]] : undefined,
            theme: 'grid',
            headStyles: {
                fillColor: [140, 106, 26],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 7.5,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [254, 252, 246]
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontSize: 8,
                fontStyle: 'bold'
            },
            margin: { left: 14, right: 14 }
        });

        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${totalPages}  |  ${settings.businessName} Sales Ledger`, 105, 292, { align: 'center' });
        }

        doc.save(`Sales_Ledger_Table_${dateSlug}.pdf`);
    },

    // -------------------------------------------------------------
    // 4. DEBT REGISTER EXPORTS (JSON & PDF)
    // -------------------------------------------------------------
    exportDebtsJSON(debtsList?: Debt[]) {
        const debts = debtsList || Store.getDebts();
        const exportObj = {
            exportType: 'Customer Debt Ledger',
            store: Store.getSettings().businessName,
            exportedAt: new Date().toISOString(),
            totalDebtsCount: debts.length,
            activeDebtTotal: debts.filter(d => d.status !== 'Paid' && d.status !== 'Settled').reduce((s, d) => s + (Number(d.amount) || 0), 0),
            debts
        };
        const dateSlug = new Date().toISOString().split('T')[0];
        this.downloadJSONFile(exportObj, `Customer_Debts_${dateSlug}.json`);
    },

    exportDebtsPDF(debtsList?: Debt[]) {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const settings = Store.getSettings();
        const debts = debtsList || Store.getDebts();
        const activeDebts = debts.filter(d => d.status !== 'Paid' && d.status !== 'Settled');
        const activeTotal = activeDebts.reduce((s, d) => s + (Number(d.amount) || 0), 0);
        const dateSlug = new Date().toISOString().split('T')[0];

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 26, 'F');
        doc.setTextColor(255, 233, 168);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text((settings.businessName || 'VENDORA RETAIL').toUpperCase(), 14, 11);

        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(`Customer Credit & Debt Recovery Table  |  Active Debt: ${this.formatCurrency(activeTotal)}`, 14, 18);
        doc.text(`Generated: ${this.formatDateTime(new Date().toISOString())}`, 196, 18, { align: 'right' });

        const rows = debts.map(d => [
            d.debtor,
            d.phone || 'N/A',
            d.product || 'Goods on Credit',
            ExportService.formatCurrency(d.amount),
            ExportService.formatDate(d.dueDate),
            d.status.toUpperCase(),
            d.settledDate ? ExportService.formatDate(d.settledDate) : 'Unsettled'
        ]);

        autoTable(doc, {
            startY: 32,
            head: [['Debtor Name', 'Phone Number', 'Items on Credit', 'Amount Due', 'Due Date', 'Status', 'Settled Date']],
            body: rows.length > 0 ? rows : [['-', 'No debts recorded', '-', '-', '-', '-', '-']],
            foot: rows.length > 0 ? [[
                'TOTAL DEBT',
                '-',
                '-',
                this.formatCurrency(debts.reduce((s, d) => s + (Number(d.amount) || 0), 0)),
                '-',
                `${activeDebts.length} Unpaid`,
                '-'
            ]] : undefined,
            theme: 'grid',
            headStyles: {
                fillColor: [22, 101, 52], // Emerald #166534
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 7.5,
                textColor: [30, 41, 59]
            },
            alternateRowStyles: {
                fillColor: [240, 253, 244]
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontSize: 8,
                fontStyle: 'bold'
            },
            margin: { left: 14, right: 14 }
        });

        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${totalPages}  |  ${settings.businessName} Debt Recovery Register`, 105, 292, { align: 'center' });
        }

        doc.save(`Customer_Debts_Table_${dateSlug}.pdf`);
    },

    // -------------------------------------------------------------
    // 5. TRANSACTION RECEIPT PDF EXPORT
    // -------------------------------------------------------------
    exportReceiptPDF(sale: Sale, settings?: Settings) {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 210] }); // 80mm receipt width!
        const storeSettings = settings || Store.getSettings();
        const dateObj = sale.date ? new Date(sale.date) : new Date();
        const dateFormatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        // Header Background
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 80, 20, 'F');

        doc.setTextColor(229, 185, 78);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text((storeSettings.businessName || 'VENDORA RETAIL').toUpperCase(), 40, 8, { align: 'center' });

        doc.setTextColor(203, 213, 225);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.text(storeSettings.businessAddress || 'Official Retail Outlet', 40, 13, { align: 'center' });
        doc.text(`Tel: ${storeSettings.businessPhone || '+234 800 000 0000'}`, 40, 17, { align: 'center' });

        // Metadata
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text('RECEIPT NO:', 6, 26);
        doc.setFont('helvetica', 'normal');
        doc.text(sale.id, 28, 26);

        doc.setFont('helvetica', 'bold');
        doc.text('DATE / TIME:', 6, 31);
        doc.setFont('helvetica', 'normal');
        doc.text(`${dateFormatted} ${timeFormatted}`, 28, 31);

        doc.setFont('helvetica', 'bold');
        doc.text('BILLED TO:', 6, 36);
        doc.setFont('helvetica', 'normal');
        doc.text(sale.customerName || 'Walk-in Customer', 28, 36);

        // Table
        const itemRows = (sale.items || []).map(it => [
            it.name,
            String(it.qty || 1),
            `NGN ${((Number(it.price) || 0) * (Number(it.qty) || 1)).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['ITEM', 'QTY', 'AMOUNT']],
            body: itemRows,
            theme: 'plain',
            headStyles: {
                fillColor: [248, 242, 226],
                textColor: [140, 106, 26],
                fontSize: 6,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 6,
                textColor: [15, 23, 42]
            },
            columnStyles: {
                0: { cellWidth: 44 },
                1: { cellWidth: 10, halign: 'center' },
                2: { cellWidth: 20, halign: 'right' }
            },
            margin: { left: 3, right: 3 }
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 80;

        // Totals Box
        doc.setFillColor(15, 23, 42);
        doc.rect(3, finalY + 4, 74, 12, 'F');

        doc.setTextColor(229, 185, 78);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text('TOTAL PAID:', 6, finalY + 11);

        doc.setFontSize(10);
        doc.text(`NGN ${(Number(sale.total) || 0).toLocaleString()}.00`, 74, finalY + 12, { align: 'right' });

        // Footer
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(5.5);
        doc.text(storeSettings.receiptFooter || 'Thank you for your patronage!', 40, finalY + 22, { align: 'center' });
        doc.text(`* ${sale.id} *`, 40, finalY + 26, { align: 'center' });

        doc.save(`Receipt_${sale.id}.pdf`);
    }
};
