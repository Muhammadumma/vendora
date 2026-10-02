import { Utils } from '../core/utils.js';

export default {
    render(store) {
        this.cart = [];
        this.store = store;

        const container = document.createElement('div');
        container.className = 'sales-container';

        // Default payment method
        this.selectedPaymentMethod = 'Cash';

        container.innerHTML = `
            <!-- Left: Product Selection -->
            <div class="sales-left-panel">
                <div class="sales-search-bar">
                    <input type="text" id="pos-search" placeholder="Search products by name..." class="search-input" style="flex: 1;">
                </div>
                
                <div class="product-grid sales-product-grid">
                     <!-- Products Injected Here -->
                </div>
            </div>

            <!-- Right: Cart -->
            <div class="card cart-card">
                <div class="cart-header">
                    <h3 class="cart-title">Current Sale</h3>
                </div>
                
                <div id="cart-items" class="cart-items-container" style="max-height: 400px; overflow-y: auto;">
                    <!-- Cart Items -->
                    <div class="cart-empty-state">Cart is empty</div>
                </div>

                <div class="cart-footer">
                    <!-- Real-time P/L Indicator -->
                    <div id="cart-profit-preview" class="hidden" style="margin-bottom: 12px; padding: 8px; border-radius: 8px; background: var(--success-bg); color: var(--success-color); font-size: 12px; display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="trending-up" style="width: 14px;"></i>
                        <span>Expected Profit: <strong id="cart-profit-val">N/A</strong></span>
                    </div>

                    <div class="payment-methods">
                        <button class="payment-btn active" data-method="Cash">
                            <i data-lucide="banknote"></i> Cash
                        </button>
                        <button class="payment-btn" data-method="Store Bank">
                            <i data-lucide="building-2"></i> Bank
                        </button>
                        <button class="payment-btn" data-method="POS">
                            <i data-lucide="credit-card"></i> POS
                        </button>
                        <button class="payment-btn" data-method="Debt" style="border-color: var(--warning-color); color: var(--warning-color);">
                            <i data-lucide="file-warning"></i> Debt
                        </button>
                    </div>

                    <div class="cart-summary-row">
                        <span>Subtotal</span>
                        <span id="cart-subtotal">N/A</span>
                    </div>
                    <div class="cart-meta-row">
                        <span>VAT (${this.store.getSettings().vatRate}%)</span>
                        <span id="cart-vat">N/A</span>
                    </div>
                    <div class="cart-total-row">
                        <span>Total</span>
                        <span id="cart-total">N/A</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-top: 8px;">
                        <button id="clear-cart-btn" class="btn btn-outline" style="padding: 12px; border-color: var(--danger-color); color: var(--danger-color);">
                           Cancel
                        </button>
                        <button id="checkout-btn" class="btn btn-primary" style="padding: 12px; font-size: 15px;">
                            Confirm Sale
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.renderProducts(container);
        this.attachEvents(container);

        if (window.lucide) window.lucide.createIcons({ props: container });

        return container;
    },

    renderProducts(container) {
        const grid = container.querySelector('.product-grid');
        const products = this.store.getProducts();

        grid.innerHTML = products.map(p => {
            const isOutOfStock = p.qty <= 0;
            const stockClass = p.qty < 5 ? 'low' : '';
            const stockText = isOutOfStock ? 'Out of Stock' : `${p.qty} in stock`;
            const cursorStyle = isOutOfStock ? 'not-allowed' : 'pointer';
            const opacityStyle = isOutOfStock ? 0.6 : 1;

            return `
                <div class="card product-card" data-id="${p.id}" data-name="${p.name.toLowerCase()}" style="padding: 16px; cursor: ${cursorStyle}; opacity: ${opacityStyle}; position: relative; transition: transform 0.1s;">
                    <div class="product-icon">📦</div>
                    <div class="product-name">${p.name}</div>
                    <div class="product-price">${Utils.formatCurrency(p.sellPrice)}</div>
                    <div class="product-stock ${stockClass}">
                        ${stockText}
                    </div>
                </div>
            `;
        }).join('');

        // Add Click Listeners
        grid.querySelectorAll('.product-card').forEach(card => {
            if (card.style.cursor !== 'not-allowed') {
                card.addEventListener('click', () => {
                    this.addToCart(card.dataset.id);
                    card.style.transform = 'scale(0.95)';
                    setTimeout(() => card.style.transform = 'scale(1)', 100);
                });
            }
        });
    },

    filterProducts(container, query) {
        const grid = container.querySelector('.product-grid');
        const cards = grid.querySelectorAll('.product-card');
        const lowerQuery = query.toLowerCase();

        cards.forEach(card => {
            const name = card.dataset.name;
            if (name.includes(lowerQuery)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    },

    addToCart(productId) {
        const product = this.store.getProducts().find(p => p.id === productId);
        if (!product || product.qty <= 0) return;

        const existing = this.cart.find(item => item.productId === productId);
        if (existing) {
            if (existing.qty < product.qty) {
                existing.qty++;
            } else {
                alert('Not enough stock!');
                return;
            }
        } else {
            this.cart.push({
                productId: product.id,
                name: product.name,
                price: product.sellPrice,
                buyPrice: product.buyPrice,
                qty: 1
            });
        }
        this.updateCartUI();
    },

    updateCartUI() {
        const container = document.getElementById('cart-items');
        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">Cart is empty</div>';
            document.getElementById('cart-profit-preview').classList.add('hidden');
        } else {
            container.innerHTML = this.cart.map((item, index) => `
                <div class="cart-item-row">
                    <div>
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-meta">${Utils.formatCurrency(item.price)} x ${item.qty}</div>
                    </div>
                    <div class="cart-item-actions">
                        <span class="cart-item-price">${Utils.formatCurrency(item.price * item.qty)}</span>
                         <button class="icon-btn remove-item btn-remove-item" data-index="${index}">✕</button>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.target.closest('button').dataset.index;
                    this.cart.splice(idx, 1);
                    this.updateCartUI();
                });
            });

            // Update P/L Preview
            const profit = this.cart.reduce((acc, item) => acc + ((item.price - item.buyPrice) * item.qty), 0);
            const profitEl = document.getElementById('cart-profit-preview');
            const profitVal = document.getElementById('cart-profit-val');

            profitEl.classList.remove('hidden');
            profitVal.innerText = Utils.formatCurrency(profit);
            if (profit < 0) {
                profitEl.style.background = 'var(--danger-bg)';
                profitEl.style.color = 'var(--danger-color)';
                profitEl.querySelector('i').setAttribute('data-lucide', 'trending-down');
            } else {
                profitEl.style.background = 'var(--success-bg)';
                profitEl.style.color = 'var(--success-color)';
                profitEl.querySelector('i').setAttribute('data-lucide', 'trending-up');
            }
            if (window.lucide) window.lucide.createIcons({ props: profitEl });
        }

        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const vatRate = this.store.getSettings().vatRate;
        const vat = subtotal * (vatRate / 100);
        const total = subtotal + vat;

        document.getElementById('cart-subtotal').innerText = Utils.formatCurrency(subtotal);
        document.getElementById('cart-vat').innerText = Utils.formatCurrency(vat);
        document.getElementById('cart-total').innerText = Utils.formatCurrency(total);
    },

    attachEvents(container) {
        const searchInput = container.querySelector('#pos-search');
        searchInput.addEventListener('input', (e) => {
            this.filterProducts(container, e.target.value);
        });

        const methodBtns = container.querySelectorAll('.payment-btn');
        methodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                methodBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedPaymentMethod = btn.dataset.method;
            });
        });

        // Clear Cart
        container.querySelector('#clear-cart-btn').addEventListener('click', () => {
            if (this.cart.length > 0 && confirm('Clear current transaction?')) {
                this.cart = [];
                this.updateCartUI();
            }
        });

        const checkoutBtn = container.querySelector('#checkout-btn');
        checkoutBtn.addEventListener('click', () => {
            if (this.cart.length === 0) return;

            // Handle Debt Details
            let customerName = '';
            let customerPhone = '';
            let dueDate = '';

            if (this.selectedPaymentMethod === 'Debt') {
                customerName = prompt("Enter Debtor Name:");
                if (!customerName) return;
                customerPhone = prompt("Enter Debtor Phone:");
                dueDate = prompt("Enter Due Date (optional, YYYY-MM-DD):");
            }

            const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const vatRate = this.store.getSettings().vatRate;
            const vat = subtotal * (vatRate / 100);
            const total = subtotal + vat;

            const sale = {
                items: JSON.parse(JSON.stringify(this.cart)), // Deep copy cart
                subtotal,
                vat,
                total,
                paymentMethod: this.selectedPaymentMethod || 'Cash',
                customerName,
                customerPhone,
                dueDate: dueDate || null
            };

            try {
                this.store.addSale(sale);
                this.printReceipt(sale);
            } catch (error) {
                alert(error.message); // Show debt limit error
            }
        });
    },

    printReceipt(sale) {
        // Create hidden receipt container for printing
        const receiptDiv = document.createElement('div');
        receiptDiv.id = 'temp-receipt';
        receiptDiv.style.display = 'none';

        let header = '';
        if (sale.paymentMethod === 'Debt') {
            header = `
                <div style="border: 2px solid black; padding: 4px; display: inline-block; font-weight: bold; margin-bottom: 8px;">DEBT RECORD</div><br>
                Debtor: ${sale.customerName}<br>
                Phone: ${sale.customerPhone}<br>
            `;
        }

        receiptDiv.innerHTML = `
            <div class="header">
                <div class="logo">${this.store.getSettings().businessName}</div>
                <div class="info">${this.store.getSettings().businessAddress || 'Address not set'}</div>
                <div class="info">Tel: ${this.store.getSettings().businessPhone || 'N/A'}</div>
            </div>
            
            <div style="text-align: center; margin-bottom: 10px; font-size: 12px;">
                ${header}
                Receipt #${String(sale.id).split('-')[1]}<br>
                Date: ${new Date().toLocaleString()}<br>
                Method: <strong>${sale.paymentMethod}</strong>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.cart.map(i => `
                        <tr>
                            <td>${i.name}</td>
                            <td style="text-align: center;">${i.qty}</td>
                            <td style="text-align: right;">${Utils.formatCurrency(i.price * i.qty)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div class="row">
                    <span>Subtotal:</span>
                    <span>${Utils.formatCurrency(sale.subtotal)}</span>
                </div>
                <div class="row">
                    <span>VAT:</span>
                    <span>${Utils.formatCurrency(sale.vat)}</span>
                </div>
                <div class="row total-row">
                    <span>TOTAL:</span>
                    <span>${Utils.formatCurrency(sale.total)}</span>
                </div>
            </div>

            <div class="footer">
                ${this.store.getSettings().receiptFooter || 'Thank you for your patronage!'}
            </div>
        `;
        document.body.appendChild(receiptDiv);

        if (confirm('Sale Successful! Print receipt?')) {
            Utils.printElement('temp-receipt', 'Receipt');
        }

        document.body.removeChild(receiptDiv);

        this.cart = [];
        this.updateCartUI();
        // Force refresh of product grid to show new stock
        const container = document.querySelector('.sales-container');
        if (container) {
            this.renderProducts(container);
            const search = container.querySelector('#pos-search');
            if (search) this.filterProducts(container, search.value);
        }
    }
}
