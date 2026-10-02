import { Utils } from '../core/utils.js';

export default {
    render(store) {
        const container = document.createElement('div');

        // State for filters
        this.currentPeriod = 'daily';
        this.selectedMethod = 'All';

        const renderContent = (period, method) => {
            this.currentPeriod = period || this.currentPeriod;
            this.selectedMethod = method || this.selectedMethod;

            const sales = store.getSales();
            const now = new Date();
            let filteredSales = [];

            // Period Filter
            if (this.currentPeriod === 'daily') {
                const today = now.toISOString().split('T')[0];
                filteredSales = sales.filter(s => s.date.startsWith(today));
            } else if (this.currentPeriod === 'weekly') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filteredSales = sales.filter(s => new Date(s.date) >= oneWeekAgo);
            } else if (this.currentPeriod === 'monthly') {
                const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                filteredSales = sales.filter(s => new Date(s.date) >= oneMonthAgo);
            } else {
                filteredSales = sales;
            }

            // Payment Method Filter
            if (this.selectedMethod !== 'All') {
                filteredSales = filteredSales.filter(s => s.paymentMethod === this.selectedMethod);
            }

            const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
            const totalProfit = filteredSales.reduce((totalP, sale) => {
                const saleProfit = sale.items.reduce((sum, item) => sum + ((item.price - (item.buyPrice || 0)) * item.qty), 0);
                return totalP + saleProfit;
            }, 0);

            container.innerHTML = `
                <style>
                    .reports-grid {
                        display: grid;
                        grid-template-columns: 350px 1fr;
                        gap: 24px;
                        margin-bottom: 24px;
                    }
                    .filter-bar {
                        display: flex;
                        gap: 12px;
                        flex-wrap: wrap;
                        margin-bottom: 20px;
                    }
                    .filter-group {
                        display: flex;
                        background: white;
                        padding: 4px;
                        border-radius: var(--radius-md);
                        border: 1px solid var(--border-color);
                    }
                    .filter-btn {
                        padding: 6px 16px;
                        border: none;
                        background: none;
                        border-radius: var(--radius-sm);
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        color: var(--text-secondary);
                    }
                    .filter-btn.active {
                        background: var(--primary-color);
                        color: white;
                    }
                    @media (max-width: 1024px) {
                        .reports-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                </style>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <h2 class="page-title">Analytics Reports</h2>
                        <p style="color: var(--text-secondary);">Analyze your business performance.</p>
                        <div style="font-size: 28px; font-weight: 700; color: var(--success-color);">${Utils.formatCurrency(totalProfit)}</div>
                    </div>
                    
                    <div class="filter-bar">
                        <div class="filter-group">
                            <button class="filter-btn ${this.currentPeriod === 'daily' ? 'active' : ''}" data-period="daily">Daily</button>
                            <button class="filter-btn ${this.currentPeriod === 'weekly' ? 'active' : ''}" data-period="weekly">Weekly</button>
                            <button class="filter-btn ${this.currentPeriod === 'monthly' ? 'active' : ''}" data-period="monthly">Monthly</button>
                            <button class="filter-btn ${this.currentPeriod === 'all' ? 'active' : ''}" data-period="all">All</button>
                        </div>
                        
                        <div class="filter-group">
                            <button class="filter-btn ${this.selectedMethod === 'All' ? 'active' : ''}" data-method="All">All Methods</button>
                            <button class="filter-btn ${this.selectedMethod === 'Cash' ? 'active' : ''}" data-method="Cash">Cash</button>
                            <button class="filter-btn ${this.selectedMethod === 'Store Bank' ? 'active' : ''}" data-method="Store Bank">Bank</button>
                            <button class="filter-btn ${this.selectedMethod === 'POS' ? 'active' : ''}" data-method="POS">POS</button>
                        </div>

                        <button id="export-excel-btn" class="btn btn-outline" style="border-color: var(--success-color); color: var(--success-color);">
                            <i data-lucide="file-spreadsheet"></i> Export to Excel
                        </button>
                    </div>
                </div>

                <div class="reports-grid">
                    <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <h3 style="margin-bottom: 16px; align-self: flex-start;">Sales by Category</h3>
                        <canvas id="categoryChart"></canvas>
                    </div>
                    <div class="card" style="overflow: hidden;">
                        <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="list" style="width: 20px;"></i>
                            Transaction History
                        </h3>
                        <div class="data-table-container" style="max-height: 400px; overflow-y: auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Method</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${filteredSales.slice().reverse().map(s => `
                                        <tr class="transaction-row" data-id="${s.id}" style="cursor: pointer; ${s.isSettlement ? 'background: rgba(16, 185, 129, 0.05);' : ''}">
                                            <td>${Utils.formatDate(s.date)}</td>
                                            <td>
                                                <span class="badge ${s.isSettlement ? 'badge-success' : (s.paymentMethod === 'Cash' ? 'badge-success' : 'badge-primary')}" style="font-size: 11px;">
                                                    ${s.paymentMethod || 'Cash'}
                                                </span>
                                            </td>
                                            <td>${s.isSettlement ? 'Debt Repayment' : s.items.length + ' items'}</td>
                                            <td style="font-weight: 600;">${Utils.formatCurrency(s.total)}</td>
                                        </tr>
                                    `).join('')}
                                    ${filteredSales.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding: 20px;">No transactions found.</td></tr>' : ''}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            // Render Chart
            this.renderChart(filteredSales, store);

            // Period listeners
            container.querySelectorAll('[data-period]').forEach(btn => {
                btn.addEventListener('click', () => renderContent(btn.dataset.period, this.selectedMethod));
            });

            // Method listeners
            container.querySelectorAll('[data-method]').forEach(btn => {
                btn.addEventListener('click', () => renderContent(this.currentPeriod, btn.dataset.method));
            });

            // Transaction Detail Listeners
            container.querySelectorAll('.transaction-row').forEach(row => {
                row.addEventListener('click', () => {
                    const id = row.dataset.id;
                    const sale = store.getSales().find(s => s.id === id);
                    if (!sale) return;

                    const vatRate = store.getSettings().vatRate;

                    Utils.showModal({
                        title: 'Transaction Details',
                        confirmText: 'Print Receipt',
                        cancelText: 'Close',
                        content: `
                            <div style="background: #F9FAFB; padding: 16px; border-radius: 8px; font-size: 14px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="color: var(--text-secondary);">Transaction ID</span>
                                    <span style="font-weight: 600;">#${String(sale.id).split('-')[1]}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                                    <span style="color: var(--text-secondary);">Date</span>
                                    <span>${Utils.formatDate(sale.date)}</span>
                                </div>
                                
                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                                    <thead>
                                        <tr style="border-bottom: 1px solid var(--border-color); text-align: left; font-size: 12px; color: var(--text-secondary);">
                                            <th style="padding: 8px 0;">Item</th>
                                            <th style="padding: 8px 0; text-align: right;">Qty</th>
                                            <th style="padding: 8px 0; text-align: right;">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sale.items.map(item => `
                                            <tr style="border-bottom: 1px dashed var(--border-subtle);">
                                                <td style="padding: 8px 0;">${item.name}</td>
                                                <td style="padding: 8px 0; text-align: right;">${item.qty}</td>
                                                <td style="padding: 8px 0; text-align: right;">${Utils.formatCurrency(item.price * item.qty)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>

                                <div style="border-top: 1px solid var(--border-color); padding-top: 12px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <span>Subtotal</span>
                                        <span>${Utils.formatCurrency(sale.subtotal)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                        <span>VAT (${vatRate}%)</span>
                                        <span>${Utils.formatCurrency(sale.vat)}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; font-weight: 700; color: var(--primary-color); font-size: 16px;">
                                        <span>Total Paid</span>
                                        <span>${Utils.formatCurrency(sale.total)}</span>
                                    </div>
                                </div>
                            </div>
                        `,
                        onConfirm: () => {
                            const settings = store.getSettings();
                            const receiptId = 'hist-receipt-' + Date.now();
                            const receiptEl = document.createElement('div');
                            receiptEl.id = receiptId;
                            receiptEl.style.display = 'none';
                            receiptEl.innerHTML = `
                                    <div class="header">
                                        <div class="logo">${settings.businessName}</div>
                                        <div class="info">${settings.businessAddress || ''}</div>
                                        <div class="info">Tel: ${settings.businessPhone || 'N/A'}</div>
                                    </div>
                                    <div style="text-align:center; margin-bottom:10px; font-size:12px;">
                                        Receipt #${String(sale.id).split('-')[1]}<br>
                                        Date: ${Utils.formatDate(sale.date)}<br>
                                        Method: <strong>${sale.paymentMethod || 'Cash'}</strong>
                                    </div>
                                    <table>
                                        <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Total</th></tr></thead>
                                        <tbody>
                                            ${sale.items.map(i => `<tr><td>${i.name}</td><td style="text-align:center;">${i.qty}</td><td style="text-align:right;">${Utils.formatCurrency(i.price * i.qty)}</td></tr>`).join('')}
                                        </tbody>
                                    </table>
                                    <div class="totals">
                                        <div class="row"><span>Subtotal:</span><span>${Utils.formatCurrency(sale.subtotal)}</span></div>
                                        <div class="row"><span>VAT (${vatRate}%):</span><span>${Utils.formatCurrency(sale.vat)}</span></div>
                                        <div class="row total-row"><span>TOTAL:</span><span>${Utils.formatCurrency(sale.total)}</span></div>
                                    </div>
                                    <div class="footer">${settings.receiptFooter || 'Thank you!'}</div>
                                `;
                            document.body.appendChild(receiptEl);
                            Utils.printElement(receiptId, 'Receipt');
                            setTimeout(() => receiptEl.remove(), 2000);
                            return true;
                        }
                    });
                });
            });

            // Export listener
            const exportBtn = container.querySelector('#export-excel-btn');
            exportBtn.addEventListener('click', () => {
                const headers = ['Date', 'Method', 'Items Count', 'Total Amount'];
                const rows = filteredSales.map(s => [
                    Utils.formatDate(s.date),
                    s.paymentMethod || 'Cash',
                    s.items.length,
                    s.total
                ]);
                Utils.downloadCSV([headers, ...rows], `SalesReport_${this.currentPeriod}_${this.selectedMethod}.csv`);
            });

            if (window.lucide) window.lucide.createIcons();
        };

        renderContent('daily', 'All');
        return container;
    },

    renderChart(filteredSales, store) {
        // Aggregate categories
        const categoryData = {};
        const products = store.getProducts();

        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const prod = products.find(p => p.id === item.productId);
                const cat = (prod ? prod.category : 'General') || 'General';
                categoryData[cat] = (categoryData[cat] || 0) + item.qty;
            });
        });

        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        // Destroy existing chart if any
        if (this.chart) this.chart.destroy();

        if (Object.keys(categoryData).length === 0) {
            ctx.parentElement.innerHTML += '<p style="color: var(--text-muted); font-size: 13px;">No data for chart</p>';
            return;
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryData),
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: [
                        '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-secondary').trim(),
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }
}
