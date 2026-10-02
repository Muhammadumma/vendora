import { Utils } from '../core/utils.js';

export default {
    // State
    selectedProductId: null,
    manualData: {
        marketing: { traffic: 0, roas: 0, adSpend: 0 },
        customer: { cac: 0, clv: 0, newCustomers: 0, lostCustomers: 0 },
        operations: { pipelineVelocity: 0, projectCompletion: 0 }
    }, // Keeping structure for safety, though focus is changing

    // User Provided Key (Google Gemini is detected via 'AIza')
    API_KEY: 'AIzaSyDvVWVr9QzqJry1g4BJYW7MmnAV0faloV4',

    async handleAIQuery(query, resultDiv, store) {
        if (!this.API_KEY) {
            resultDiv.innerHTML = '<span style="color: var(--warning-color);">⚠️ API Key is missing. Please provide it to the admin.</span>';
            return;
        }

        try {
            const context = this.gatherFullContext(store);
            const response = await this.callAI(query, context);
            resultDiv.innerHTML = this.formatAIResponse(response);
        } catch (error) {
            resultDiv.innerHTML = `<span style="color: var(--danger-color);">Error: ${error.message}</span>`;
        }
    },

    gatherFullContext(store) {
        // Collect ALL real + manual data
        const sales = store.getSales();
        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

        return {
            financial: {
                revenue: totalRevenue,
                transactions: sales.length,
                // Add more calculated financial metrics here
            },
            marketing: this.manualData.marketing,
            customer: this.manualData.customer,
            operations: this.manualData.operations
        };
    },

    async callAI(query, context) {
        const isGemini = this.API_KEY.startsWith('AIza');
        const systemPrompt = `You are an expert business analyst. You have access to the following business data:
${JSON.stringify(context, null, 2)}

Analyze this data to answer the user's question. Be precise, use the numbers provided, and give actionable advice.`;

        if (isGemini) {
            // Google Gemini API
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: systemPrompt + "\n\nUser Question: " + query }]
                    }]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
        } else {
            // OpenAI API Fallback
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4-turbo",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: query }
                    ]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.choices[0].message.content;
        }
    },

    formatAIResponse(text) {
        if (!text) return '';
        text = text.trim();
        // Bold
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Bullet points
        text = text.replace(/^\* /gm, '<br>• ');
        // Line breaks for readability
        text = text.replace(/\. ([A-Z])/g, '.<br><br>$1');
        return text;
    },

    render(store) {
        const container = document.createElement('div');
        container.className = 'fade-in';
        container.style.paddingBottom = '40px';

        // 1. Header & AI Section (Keep as Gateway)
        container.appendChild(this.renderHeader());

        // 2. Financial Overview (Keep as Base Truth)
        const financialGrid = document.createElement('div');
        financialGrid.className = 'analytics-grid';
        financialGrid.style.marginTop = '24px';
        financialGrid.appendChild(this.renderFinancialBucket(store));
        container.appendChild(financialGrid);

        // 3. Predictive Intelligence Section (The "New Core")
        const predictionSection = this.renderPredictiveSection(store);
        container.appendChild(predictionSection);

        this.attachEvents(container, store);

        // Defer chart rendering until mounted
        setTimeout(() => {
            this.initFinancialChart(store);
            this.updatePredictionView(container, store);
        }, 0);

        return container;
    },

    renderHeader() {
        const div = document.createElement('div');
        div.innerHTML = `
            <div class="card glass-effect" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(16, 185, 129, 0.1)); border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; align-items: start; gap: 20px;">
                    <div style="font-size: 40px; background: rgba(255,255,255,0.1); width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border-radius: 12px;">📊</div>
                    <div style="flex: 1;">
                        <h2 style="margin: 0 0 8px 0; font-size: 20px;">Predictive Command Center</h2>
                        <div style="font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">
                            AI-driven insights to replace manual analysis. Identifying high-demand days and automating purchasing decisions.
                        </div>
                        
                        <!-- AI Gateway -->
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <input type="text" id="ai-query" placeholder="Ask Gemini about your data (e.g., 'Why is Friday peak?')" 
                                style="flex: 1; min-width: 200px; padding: 12px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); color: var(--text-main); border-radius: 8px;">
                            <button id="ask-ai-btn" class="btn btn-primary" style="display: flex; align-items: center; gap: 8px;">
                                <i data-lucide="sparkles" style="width: 16px;"></i> Ask AI
                            </button>
                        </div>
                        <div id="ai-result" style="margin-top: 12px; font-size: 14px; line-height: 1.6; color: var(--text-secondary); display: none; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;"></div>
                    </div>
                </div>
            </div>
        `;
        return div;
    },

    renderFinancialBucket(store) {
        // ... (Same calculation logic as before for consistency)
        const sales = store.getSales();
        const revenue = sales.reduce((sum, s) => sum + s.total, 0);
        const grossProfit = sales.reduce((sum, s) => sum + s.items.reduce((acc, i) => acc + ((i.price - (i.buyPrice || 0)) * i.qty), 0), 0);

        const card = document.createElement('div');
        card.className = 'card glass-effect';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <h3 class="section-title"><i data-lucide="wallet"></i> Financial Health</h3>
                <span class="badge badge-success">Live Data</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                <div class="metric-box">
                    <span class="label">Total Revenue</span>
                    <span class="value">${Utils.formatCurrency(revenue)}</span>
                </div>
                <div class="metric-box">
                    <span class="label">Net Profit</span>
                    <span class="value" style="color: var(--success-color)">${Utils.formatCurrency(grossProfit)}</span>
                </div>
            </div>

            <div style="height: 200px; position: relative;">
                <canvas id="financialChart"></canvas>
            </div>
        `;
        return card;
    },

    renderPredictiveSection(store) {
        const products = store.getProducts();

        const section = document.createElement('div');
        section.style.marginTop = '24px';

        section.innerHTML = `
            <div class="card glass-effect" style="border: 1px solid var(--primary-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
                    <div>
                        <h3 class="section-title" style="color: var(--primary-color);"><i data-lucide="line-chart"></i> Product Performance & Demand Prediction</h3>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Day-specific velocity analysis</div>
                    </div>
                    
                    <div style="display: flex; gap: 12px; align-items: center;">
                        <span style="font-size: 13px; font-weight: 600;">Analyze:</span>
                        <select id="product-selector" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-body); color: var(--text-main); min-width: 200px;">
                            <option value="all">Create Store Overview (All Products)</option>
                            ${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                    <!-- Chart Area -->
                    <div style="background: rgba(255,255,255,0.02); border-radius: 12px; padding: 16px; min-height: 400px; position: relative;">
                        <canvas id="predictionChart"></canvas>
                    </div>

                    <!-- Actionable Admin Insights -->
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div class="card" style="background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.2);">
                            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--primary-color);">HIGH DEMAND ALERT</h4>
                            <div id="demand-insight" style="font-size: 18px; font-weight: 600; line-height: 1.4;">
                                --
                            </div>
                            <div id="demand-detail" style="font-size: 13px; margin-top: 8px; color: var(--text-secondary);">
                                Select a product to see daily trends.
                            </div>
                        </div>

                        <div class="card" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);">
                            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--success-color);">ADMIN ACTION PLAN</h4>
                            <div id="action-plan" style="font-size: 15px; line-height: 1.5; color: var(--text-main);">
                                --
                            </div>
                        </div>

                        <div style="margin-top: auto; padding: 16px; background: var(--bg-body); border-radius: 8px;">
                            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">CURRENT STOCK</div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div id="current-stock" style="font-size: 24px; font-weight: bold;">--</div>
                                <div id="stock-status" class="badge">--</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        return section;
    },

    attachEvents(container, store) {
        // Product Selector
        const selector = container.querySelector('#product-selector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.selectedProductId = e.target.value;
                this.updatePredictionView(container, store);
            });
        }

        // AI Chat
        const aiBtn = container.querySelector('#ask-ai-btn');
        if (aiBtn) {
            aiBtn.addEventListener('click', () => {
                const input = container.querySelector('#ai-query');
                const result = container.querySelector('#ai-result');
                if (input && result) {
                    result.style.display = 'block';
                    result.innerHTML = 'Thinking...';
                    this.handleAIQuery(input.value, result, store);
                }
            });
        }
    },

    initFinancialChart(store) {
        const ctx = document.getElementById('financialChart');
        if (!ctx) return;

        const sales = store.getSales();
        const debts = store.getDebts();
        const data = this.getLast7DaysFinancials(sales, debts);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Revenue ($)',
                        data: data.revenue,
                        borderColor: '#2563EB',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Unpaid Debt',
                        data: data.debt,
                        borderColor: '#EF4444',
                        borderDash: [5, 5],
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true } },
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: 'rgba(0,0,0,0.05)' } }
                }
            }
        });
    },

    updatePredictionView(container, store) {
        const products = store.getProducts();

        // Default to 'all' if none selected
        if (!this.selectedProductId) {
            this.selectedProductId = 'all';
        }

        const sales = store.getSales();

        // 1. Analyze Data by Day of Week
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayStats = days.map(day => ({
            day,
            unitsSold: 0,
            transactions: 0,
            revenue: 0
        }));

        sales.forEach(sale => {
            const date = new Date(sale.date);
            const dayIndex = date.getDay();

            if (this.selectedProductId === 'all') {
                // Aggregate everything
                dayStats[dayIndex].transactions += 1;
                dayStats[dayIndex].revenue += sale.total; // Approximate total revenue
                // Sum units
                const totalUnits = sale.items.reduce((sum, i) => sum + i.qty, 0);
                dayStats[dayIndex].unitsSold += totalUnits;
            } else {
                // Specific product
                const hasProduct = sale.items.find(i => i.productId === this.selectedProductId);
                if (hasProduct) {
                    dayStats[dayIndex].transactions += 1;
                    dayStats[dayIndex].unitsSold += hasProduct.qty;
                    dayStats[dayIndex].revenue += hasProduct.qty * hasProduct.price;
                }
            }
        });

        // 2. Render Combo Chart
        const ctx = container.querySelector('#predictionChart');
        if (ctx) {
            const chartStatus = Chart.getChart(ctx);
            if (chartStatus) chartStatus.destroy();

            const productName = this.selectedProductId === 'all' ? 'Entire Store' : (products.find(p => p.id === this.selectedProductId)?.name || 'Unknown');

            new Chart(ctx, {
                type: 'bar', // Base type
                data: {
                    labels: days,
                    datasets: [
                        {
                            label: 'Units Sold',
                            data: dayStats.map(d => d.unitsSold),
                            backgroundColor: 'rgba(37, 99, 235, 0.8)',
                            order: 2,
                            yAxisID: 'y'
                        },
                        {
                            type: 'line',
                            label: 'Total Transactions',
                            data: dayStats.map(d => d.transactions),
                            borderColor: '#F59E0B',
                            borderWidth: 3,
                            fill: false,
                            tension: 0.3,
                            order: 1,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: `Weekly Performance: ${productName}`,
                            font: { size: 16 }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Units Sold' }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: { drawOnChartArea: false },
                            title: { display: true, text: 'Transactions' }
                        }
                    }
                }
            });
        }

        // 3. Generate Actionable Insights
        // Find Peak Day
        const peakDay = dayStats.reduce((max, current) => current.unitsSold > max.unitsSold ? current : max, dayStats[0]);
        const totalUnits = dayStats.reduce((sum, d) => sum + d.unitsSold, 0);
        const avgUnits = totalUnits / 7;

        const demandInsight = container.querySelector('#demand-insight');
        const demandDetail = container.querySelector('#demand-detail');
        const actionPlan = container.querySelector('#action-plan');
        const currentStock = container.querySelector('#current-stock');
        const stockStatus = container.querySelector('#stock-status');

        const product = this.selectedProductId === 'all' ? null : products.find(p => p.id === this.selectedProductId);

        if (demandInsight) {
            if (peakDay.unitsSold > 0) {
                demandInsight.innerText = `${peakDay.day}s are your highest demand day.`;
                demandInsight.style.color = 'var(--text-main)';
            } else {
                demandInsight.innerText = "Insufficient data to determine trends.";
                demandInsight.style.color = 'var(--text-muted)';
            }
        }

        if (demandDetail) {
            const entityName = product ? product.name : 'the store';
            demandDetail.innerText = `You typically sell ${peakDay.unitsSold} units across ${entityName} on this day, compared to a daily average of ${avgUnits.toFixed(1)}.`;
        }

        // Action Plan
        if (actionPlan) {
            if (this.selectedProductId === 'all') {
                actionPlan.innerHTML = `
                    <strong>Store-Wide Overview</strong><br>
                    Focus staffing and inventory checks on <strong>${peakDay.day}s</strong> to handle peak transaction volume (${peakDay.transactions} txns).
                `;
            } else if (product) {
                const recommendedStock = Math.ceil(peakDay.unitsSold * 1.5);
                if (product.qty < recommendedStock) {
                    const toBuy = recommendedStock - product.qty;
                    actionPlan.innerHTML = `
                        You are <strong>understocked</strong> for peak demand.<br>
                        <i data-lucide="alert-triangle" style="width:14px; display:inline"></i> <strong>Recommendation:</strong> Buy <strong>${toBuy} units</strong> before next ${peakDay.day} to maximize revenue.
                    `;
                } else {
                    actionPlan.innerHTML = `
                        <i data-lucide="check-circle" style="width:14px; display:inline; color: var(--success-color)"></i> <strong>Stock is optimal.</strong><br>
                        Your current inventory (${product.qty}) is sufficient to cover peak demand on ${peakDay.day}s.
                    `;
                }
            }
        }

        if (currentStock) currentStock.innerText = product ? product.qty : '--';
        if (stockStatus) {
            if (product) {
                stockStatus.innerText = product.qty < 5 ? 'Low Stock' : 'Good Stock';
                stockStatus.className = product.qty < 5 ? 'badge badge-danger' : 'badge badge-success';
            } else {
                stockStatus.innerText = 'N/A';
                stockStatus.className = 'badge badge-neutral';
            }
        }
    },

    getLast7DaysFinancials(sales, debts = []) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const labels = [];
        const revenue = [];
        const debt = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            labels.push(days[d.getDay()]); // Simplified label (e.g. "Mon")

            const dateStr = d.toDateString();

            // Calc revenue for this specific date (Sales + Debt Repayments)
            const salesRevenue = sales
                .filter(s => new Date(s.date).toDateString() === dateStr)
                .reduce((sum, s) => sum + s.total, 0);

            const debtRepayment = debts
                .filter(d => d.status === 'Paid' && d.settledDate && new Date(d.settledDate).toDateString() === dateStr)
                .reduce((sum, d) => sum + d.amount, 0);

            const daysRevenue = salesRevenue + debtRepayment;

            // Calc Active Debt existing on this date (Approximation: debts created on this day)
            // Ideally, this should track outstanding balance over time, but for now we visualize NEW debts vs NEW revenue
            const daysDebt = debts
                .filter(d => new Date(d.createdAt).toDateString() === dateStr && d.status !== 'Paid')
                .reduce((sum, d) => sum + d.amount, 0);

            revenue.push(daysRevenue);
            debt.push(daysDebt);
        }
        return { labels, revenue, debt };
    }
};
