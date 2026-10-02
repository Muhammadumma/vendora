import { Utils } from '../core/utils.js';

export default {
    render(store, query = '') {
        const container = document.createElement('div');
        container.className = 'fade-in';

        const q = (query || '').toLowerCase();

        // Search Products
        const products = store.getProducts().filter(p =>
            (p.name || '').toLowerCase().includes(q) ||
            (p.category && p.category.toLowerCase().includes(q))
        );

        // Search Sales (by ID or Product Name)
        const sales = store.getSales().filter(s =>
            (s.id || '').toLowerCase().includes(q) ||
            (s.items && s.items.some(item => {
                const prod = store.getProducts().find(p => p.id === item.productId);
                return prod && (prod.name || '').toLowerCase().includes(q);
            }))
        );

        // Search Debts
        const debts = store.getDebts().filter(d =>
            (d.customerName || '').toLowerCase().includes(q) ||
            (d.notes && d.notes.toLowerCase().includes(q))
        );

        container.innerHTML = `
            <div style="margin-bottom: 32px;">
                <h2 class="page-title">Search Results</h2>
                <p style="color: var(--text-secondary);">Showing results for "${query}"</p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 32px;">
                <!-- Products Section -->
                <section>
                    <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="package" style="width: 20px;"></i>
                        Products (${products.length})
                    </h3>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Category</th>
                                    <th>Stock</th>
                                    <th>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products.map(p => `
                                    <tr>
                                        <td style="font-weight: 600;">${p.name}</td>
                                        <td>${p.category || '-'}</td>
                                        <td>${p.qty}</td>
                                        <td>${Utils.formatCurrency(p.sellPrice)}</td>
                                    </tr>
                                `).join('')}
                                ${products.length === 0 ? '<tr><td colspan="4" style="text-align: center; padding: 20px;">No matching products</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- Transactions Section -->
                <section>
                    <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="shopping-cart" style="width: 20px;"></i>
                        Transactions (${sales.length})
                    </h3>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sales.map(s => `
                                    <tr>
                                        <td style="font-family: monospace; font-size: 11px;">${s.id}</td>
                                        <td>${Utils.formatDate(s.date)}</td>
                                        <td>${s.items.length} items</td>
                                        <td style="font-weight: 600;">${Utils.formatCurrency(s.total)}</td>
                                    </tr>
                                `).join('')}
                                ${sales.length === 0 ? '<tr><td colspan="4" style="text-align: center; padding: 20px;">No matching transactions</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- Debts Section -->
                <section>
                    <h3 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="banknote" style="width: 20px;"></i>
                        Debts (${debts.length})
                    </h3>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${debts.map(d => `
                                    <tr>
                                        <td style="font-weight: 600;">${d.customerName}</td>
                                        <td>${Utils.formatCurrency(d.amount)}</td>
                                        <td><span class="badge ${d.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${d.status}</span></td>
                                    </tr>
                                `).join('')}
                                ${debts.length === 0 ? '<tr><td colspan="3" style="text-align: center; padding: 20px;">No matching debts</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        return container;
    }
}
