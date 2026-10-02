import { Utils } from '../core/utils.js';

export default {
    render(store) {
        const container = document.createElement('div');
        container.className = 'dashboard-container fade-in';

        const sales = store.getSales();
        const products = store.getProducts();

        // 1. Calculations & Metrics
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];

        const todaysSalesData = sales.filter(s => s.date.startsWith(today));
        const todaysSales = todaysSalesData.reduce((sum, s) => sum + s.total, 0);

        const yesterdaysSalesData = sales.filter(s => s.date.startsWith(yesterday));
        const yesterdaysSales = yesterdaysSalesData.reduce((sum, s) => sum + s.total, 0);

        const todaysProfit = todaysSalesData.reduce((totalProfit, sale) => {
            const saleProfit = sale.items.reduce((sum, item) => sum + ((item.price - (item.buyPrice || 0)) * item.qty), 0);
            return totalProfit + saleProfit;
        }, 0);

        // Actionable Insights
        let salesInsight = 'Total collected today';
        if (yesterdaysSales > 0) {
            const diff = ((todaysSales - yesterdaysSales) / yesterdaysSales) * 100;
            const icon = diff >= 0 ? '📈' : '📉';
            salesInsight = `${icon} ${Math.abs(diff).toFixed(0)}% ${diff >= 0 ? 'higher' : 'lower'} than yesterday`;
        }

        const lowStockItems = products.filter(p => p.qty < 5);
        const totalTransactions = sales.length;

        // 2. Dashboard Template
        if (products.length === 0) {
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center;">
                    <div style="font-size: 80px; margin-bottom: 24px;">🏢</div>
                    <h2 style="font-size: 32px; font-weight: 800; margin-bottom: 12px;">Welcome to Vendora!</h2>
                    <p style="color: var(--text-muted); font-size: 18px; max-width: 500px; margin-bottom: 40px;">
                        Your smart shop manager is ready. To get started, add your first product to your inventory.
                    </p>
                    <button class="btn btn-primary" onclick="window.location.hash='#add-product'" style="padding: 16px 40px; font-size: 18px;">
                        <i data-lucide="plus-circle" style="width: 24px;"></i> Add First Product
                    </button>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return container;
        }

        container.innerHTML = `
            <!-- Welcome Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
                <div>
                    <h2 style="font-size: 24px; font-weight: 800; color: var(--text-main);">Good Morning, ${store.getUser()?.name || 'User'}</h2>
                    <p style="color: var(--text-muted); font-size: 14px;">Here is your business pulse for today.</p>
                </div>
                <div class="date-filter">
                    <input type="date" id="dash-date-filter" class="search-input" style="width: auto;" value="${today}">
                </div>
            </div>

            <!-- The Pulse (KPI Row) -->
            <div class="dash-pulse-grid">
                ${this.renderKPI('Today\'s Sales', Utils.formatCurrency(todaysSales), salesInsight, 'badge-success', 'trending-up', todaysSales > 0)}
                ${this.renderKPI('Today\'s Profit', Utils.formatCurrency(todaysProfit), 'Estimated net gain', 'badge-info', 'dollar-sign', todaysProfit > 0)}
                ${this.renderKPI('Low Stock', lowStockItems.length, lowStockItems.length > 0 ? 'Restock recommended' : 'Stock levels healthy', lowStockItems.length > 0 ? 'badge-error' : 'badge-success', 'package', true)}
                ${this.renderKPI('Total Orders', totalTransactions, 'Lifetime transactions', 'badge-neutral', 'clipboard-list', true)}
            </div>

            <!-- Main Layout Grid -->
            <div class="dash-main-grid">
                <!-- Left: Shortcuts -->
                <div class="dash-shortcuts">
                    <div class="card" style="height: 100%;">
                        <h3 style="margin-bottom: 20px; font-size: 16px; font-weight: 700;">Executive Shortcuts</h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="btn btn-primary" onclick="window.location.hash='#sell'" style="width: 100%; justify-content: flex-start; padding: 16px;">
                                <i data-lucide="zap" style="width: 20px;"></i> Quick Sale
                            </button>
                            <button class="btn btn-outline" onclick="window.location.hash='#inventory'" style="width: 100%; justify-content: flex-start;">
                                <i data-lucide="plus-circle" style="width: 18px;"></i> Add Product
                            </button>
                            <button class="btn btn-outline" onclick="window.location.hash='#purchases'" style="width: 100%; justify-content: flex-start;">
                                <i data-lucide="truck" style="width: 18px;"></i> View Purchases
                            </button>
                            <button class="btn btn-outline" id="dash-export-btn" style="width: 100%; justify-content: flex-start;">
                                <i data-lucide="download" style="width: 18px;"></i> Export Data
                            </button>
                        </div>

                        ${lowStockItems.length > 0 ? `
                        <div style="margin-top: 32px;">
                            <h4 style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 12px;">Low Stock Alerts</h4>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${lowStockItems.slice(0, 3).map(p => `
                                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 8px; background: rgba(220, 38, 38, 0.05); border-radius: 8px;">
                                        <span style="font-weight: 500;">${p.name}</span>
                                        <span class="badge badge-error">${p.qty} left</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Center: Visualization -->
                <div class="dash-visuals">
                    <div class="card" style="height: 100%; min-height: 400px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h3 style="font-size: 16px; font-weight: 700;">Sales Performance</h3>
                            <select id="chart-range" style="width: auto; padding: 4px 8px; font-size: 12px;">
                                <option value="7">Last 7 Days</option>
                                <option value="30">Last 30 Days</option>
                            </select>
                        </div>
                        <canvas id="salesChart"></canvas>
                        ${sales.length === 0 ? `
                            <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.8); z-index: 5;">
                                <div style="font-size: 48px; margin-bottom: 16px;">📈</div>
                                <h4 style="font-weight: 700;">No sales data yet</h4>
                                <p style="color: var(--text-muted); font-size: 14px;">Start selling to see your growth!</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Right: Recent Activity -->
                <div class="dash-activity">
                    <div class="card" style="height: 100%;">
                        <h3 style="margin-bottom: 20px; font-size: 16px; font-weight: 700;">Recent Activity</h3>
                        <div id="activity-feed" style="display: flex; flex-direction: column; gap: 16px;">
                            ${this.renderActivityFeed(sales.slice(-5).reverse())}
                        </div>
                        ${sales.length > 5 ? `
                            <button class="btn btn-outline" style="width: 100%; margin-top: 16px; padding: 8px; font-size: 12px;" onclick="window.location.hash='#reports'">
                                View All Transactions
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        this.initCharts(sales);
        this.attachEvents(container, store);
        return container;
    },

    renderKPI(title, value, subtitle, badgeClass, icon, hasData) {
        return `
            <div class="card stats-card" style="padding: 24px; position: relative; overflow: hidden; border-radius: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <h4 style="color: var(--text-secondary); font-size: 12px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">${title}</h4>
                    <div style="padding: 8px; background: var(--primary-light); border-radius: 12px;">
                        <i data-lucide="${icon}" style="width: 20px; height: 20px; color: var(--primary-color);"></i>
                    </div>
                </div>
                <div style="font-size: 32px; font-weight: 800; color: var(--text-main); margin-bottom: 4px;">
                    ${hasData ? value : `<span style="opacity: 0.3;">₦0.00</span>`}
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge ${badgeClass}">${subtitle}</span>
                </div>
            </div>
        `;
    },

    renderActivityFeed(recentSales) {
        if (recentSales.length === 0) {
            return `<div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
                <i data-lucide="history" style="width: 32px; height: 32px; margin-bottom: 12px; opacity: 0.2;"></i>
                <p style="font-size: 13px;">No recent transactions</p>
            </div>`;
        }

        return recentSales.map(sale => `
            <div style="display: flex; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
                <div style="width: 40px; height: 40px; background: var(--bg-body); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i data-lucide="${sale.paymentMethod === 'Debt' ? 'file-warning' : 'shopping-bag'}" style="width: 18px; color: var(--primary-hover);"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sale.customerName || 'Walk-in Customer'}</span>
                        <span style="font-weight: 800; font-size: 14px; color: var(--text-main);">${Utils.formatCurrency(sale.total)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; color: var(--text-muted); font-size: 12px; margin-top: 2px;">
                        <span>${sale.items.length} item(s) • ${sale.paymentMethod}</span>
                        <span>${Utils.formatTimeAgo(sale.date)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    initCharts(sales) {
        setTimeout(() => {
            const ctx = document.getElementById('salesChart');
            if (!ctx) return;

            // Group sales by day for the last 7 days
            const last7Days = [...Array(7)].map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return d.toISOString().split('T')[0];
            });

            const salesByDay = last7Days.map(date => {
                return sales
                    .filter(s => s.date.startsWith(date))
                    .reduce((sum, s) => sum + s.total, 0);
            });

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: last7Days.map(d => new Date(d).toLocaleDateString(undefined, { weekday: 'short' })),
                    datasets: [{
                        label: 'Gross Sales',
                        data: salesByDay,
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#2563EB',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { font: { size: 10 } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 10 } }
                        }
                    }
                }
            });
        }, 100);
    },

    attachEvents(container, store) {
        const dateFilter = container.querySelector('#dash-date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                const selectedDate = e.target.value;
                this.updateMetricsForDate(container, store, selectedDate);
            });
        }

        const exportBtn = container.querySelector('#dash-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const csvData = Utils.convertToCSV(store.getSales());
                Utils.downloadFile(csvData, `Vendora_Sales_Export_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
            });
        }
    },

    updateMetricsForDate(container, store, selectedDate) {
        const sales = store.getSales();
        const filteredSales = sales.filter(s => s.date.startsWith(selectedDate));

        const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
        const totalProfit = filteredSales.reduce((totalProfit, sale) => {
            const saleProfit = sale.items.reduce((sum, item) => sum + ((item.price - (item.buyPrice || 0)) * item.qty), 0);
            return totalProfit + saleProfit;
        }, 0);

        // Update the KPI values in the DOM
        const kpiValues = container.querySelectorAll('.stats-card div[style*="font-size: 32px"]');
        if (kpiValues.length >= 2) {
            kpiValues[0].innerText = Utils.formatCurrency(totalSales);
            kpiValues[1].innerText = Utils.formatCurrency(totalProfit);
        }
    }
}
