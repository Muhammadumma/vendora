import { Utils } from '../core/utils.js';

export default {
    render(store) {
        const container = document.createElement('div');
        container.className = 'fade-in';

        const renderContent = () => {
            const purchases = store.getPurchases();
            const products = store.getProducts();

            container.innerHTML = `
                <div class="page-header">
                    <div>
                        <h2 class="page-title">Stock Purchases</h2>
                        <p style="color: var(--text-secondary);">Record and track your inventory restocking.</p>
                    </div>
                    <button class="btn btn-primary" id="add-purchase-btn">
                        <i data-lucide="plus"></i> New Purchase
                    </button>
                </div>

                <div class="card" style="margin-top: 24px;">
                    <h3 style="margin-bottom: 20px;">Purchase History</h3>
                    <div class="data-table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Cost/Unit</th>
                                    <th>Total Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${purchases.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 32px;">No purchase records found.</td></tr>' :
                    purchases.slice().reverse().map(p => `
                                        <tr>
                                            <td>${Utils.formatDate(p.date)}</td>
                                            <td style="font-weight: 600;">${p.productName}</td>
                                            <td>${p.qty}</td>
                                            <td>${Utils.formatCurrency(p.buyPrice)}</td>
                                            <td style="font-weight: 700; color: var(--danger-color);">${Utils.formatCurrency(p.qty * p.buyPrice)}</td>
                                        </tr>
                                    `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            if (window.lucide) window.lucide.createIcons();

            container.querySelector('#add-purchase-btn').addEventListener('click', () => {
                this.showAddPurchaseModal(store, products, renderContent);
            });
        };

        renderContent();
        return container;
    },

    showAddPurchaseModal(store, products, onSuccess) {
        const modal = document.createElement('div');
        modal.className = 'glass-effect';
        modal.style.position = 'fixed';
        modal.style.inset = '0';
        modal.style.zIndex = '3000';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.background = 'rgba(0,0,0,0.6)';

        modal.innerHTML = `
            <div class="card fade-in" style="width: 450px; padding: 32px; border-radius: 20px;">
                <h3 style="margin-bottom: 20px;">Record New Stock</h3>
                
                <div style="margin-bottom: 16px;">
                    <label class="label">Select Product</label>
                    <select id="p-select" class="search-input" style="width: 100%;">
                        <option value="">-- Select Product --</option>
                        ${products.map(p => `<option value="${p.id}">${p.name} (Current: ${p.qty})</option>`).join('')}
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                    <div>
                        <label class="label">Quantity</label>
                        <input type="number" id="p-qty" class="search-input" placeholder="0">
                    </div>
                    <div>
                        <label class="label">Cost price</label>
                        <input type="number" id="p-buy" class="search-input" placeholder="0.00">
                    </div>
                </div>

                <div style="display: flex; gap: 12px;">
                    <button id="p-cancel" class="btn btn-outline" style="flex: 1;">Cancel</button>
                    <button id="p-save" class="btn btn-primary" style="flex: 1;">Save Purchase</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) window.lucide.createIcons();

        modal.querySelector('#p-cancel').addEventListener('click', () => document.body.removeChild(modal));

        modal.querySelector('#p-save').addEventListener('click', () => {
            const productId = modal.querySelector('#p-select').value;
            const qty = Number(modal.querySelector('#p-qty').value);
            const buyPrice = Number(modal.querySelector('#p-buy').value);
            const product = products.find(p => p.id === productId);

            if (productId && qty > 0 && buyPrice >= 0) {
                store.addPurchase({
                    productId,
                    productName: product.name,
                    qty,
                    buyPrice
                });
                document.body.removeChild(modal);
                onSuccess();
            } else {
                alert('Please fill all fields correctly.');
            }
        });
    }
}
