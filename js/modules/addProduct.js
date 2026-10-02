import { Utils } from '../core/utils.js';

export default {
    render(store) {
        const container = document.createElement('div');
        container.className = 'fade-in';
        container.innerHTML = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px;">
                    <div>
                        <h2 class="page-title" style="font-size: 32px; margin-bottom: 4px;">Bulk Product Entry</h2>
                        <p style="color: var(--text-secondary);">Add multiple products manually or import via CSV.</p>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <input type="file" id="csv-upload" accept=".csv" style="display: none;">
                        <label for="csv-upload" class="btn btn-outline" style="cursor: pointer;">
                            <i data-lucide="file-up" style="width: 18px;"></i> Import CSV
                        </label>
                        <button id="add-row-btn" class="btn btn-outline">
                            <i data-lucide="plus" style="width: 18px;"></i> Add Row
                        </button>
                    </div>
                </div>

                <div class="card glass-effect" style="padding: 0; overflow: hidden; border-radius: 20px;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: rgba(2, 44, 34, 0.5);">
                                <th style="padding: 16px; width: 30%;">Product Name</th>
                                <th style="padding: 16px; width: 20%;">Category</th>
                                <th style="padding: 16px; width: 15%;">Stock</th>
                                <th style="padding: 16px; width: 15%;">Buy Price</th>
                                <th style="padding: 16px; width: 15%;">Sell Price</th>
                                <th style="padding: 16px; width: 5%;"></th>
                            </tr>
                        </thead>
                        <tbody id="product-rows-body">
                            <!-- Rows injected here -->
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 16px;">
                    <button id="cancel-btn" class="btn btn-outline" style="width: 140px;">Cancel</button>
                    <button id="save-all-btn" class="btn btn-primary" style="width: 240px; height: 52px; font-size: 16px; border-radius: 12px;">
                        <i data-lucide="shield-check" style="width: 20px;"></i>
                        Confirm Bulk Save
                    </button>
                </div>
            </div>
        `;

        this.initRows(container);
        this.attachEvents(container, store);
        return container;
    },

    initRows(container) {
        this.tbody = container.querySelector('#product-rows-body');
        this.addRow(); // Start with one row
    },

    addRow(data = {}) {
        const tr = document.createElement('tr');
        tr.className = 'product-row fade-in';
        tr.innerHTML = `
            <td style="padding: 12px;"><input type="text" class="search-input p-name" value="${data.name || ''}" placeholder="Product Name" style="border: none; background: transparent;"></td>
            <td style="padding: 12px;"><input type="text" class="search-input p-cat" value="${data.category || ''}" placeholder="Category" style="border: none; background: transparent;"></td>
            <td style="padding: 12px;"><input type="number" class="search-input p-qty" value="${data.qty || ''}" placeholder="0" style="border: none; background: transparent;"></td>
            <td style="padding: 12px;"><input type="number" class="search-input p-buy" value="${data.buy || ''}" placeholder="0.00" style="border: none; background: transparent;"></td>
            <td style="padding: 12px;"><input type="number" class="search-input p-sell" value="${data.sell || ''}" placeholder="0.00" style="border: none; background: transparent;"></td>
            <td style="padding: 12px; text-align: right;">
                <button class="icon-btn remove-row-btn" style="color: var(--danger-color);"><i data-lucide="trash-2" style="width: 16px;"></i></button>
            </td>
        `;

        this.tbody.appendChild(tr);
        if (window.lucide) window.lucide.createIcons();

        tr.querySelector('.remove-row-btn').addEventListener('click', () => {
            if (this.tbody.children.length > 1) {
                tr.remove();
            } else {
                alert('At least one row is required.');
            }
        });
    },

    attachEvents(container, store) {
        const addRowBtn = container.querySelector('#add-row-btn');
        const saveBtn = container.querySelector('#save-all-btn');
        const cancelBtn = container.querySelector('#cancel-btn');
        const csvInput = container.querySelector('#csv-upload');

        addRowBtn.addEventListener('click', () => this.addRow());

        csvInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target.result;
                    this.parseCSV(text);
                };
                reader.readAsText(file);
            }
        });

        saveBtn.addEventListener('click', () => {
            const rows = Array.from(this.tbody.querySelectorAll('tr'));
            const products = rows.map(tr => ({
                name: tr.querySelector('.p-name').value,
                category: tr.querySelector('.p-cat').value,
                qty: Number(tr.querySelector('.p-qty').value),
                buyPrice: Number(tr.querySelector('.p-buy').value),
                sellPrice: Number(tr.querySelector('.p-sell').value)
            })).filter(p => p.name && p.qty > 0);

            if (products.length === 0) {
                alert('Please enter valid product details.');
                return;
            }

            this.showPasswordDialog(store, (authorized) => {
                if (authorized) {
                    products.forEach(p => store.addProduct(p));
                    alert(`Successfully added ${products.length} products! ✅`);
                    window.location.hash = '#inventory';
                } else {
                    alert('Unauthorized: Incorrect password.');
                }
            });
        });

        cancelBtn.addEventListener('click', () => {
            window.location.hash = '#inventory';
        });
    },

    parseCSV(text) {
        const lines = text.split('\n');
        // Simple CSV parser: Name, Category, Qty, Buy, Sell
        lines.forEach((line, index) => {
            if (index === 0 && line.toLowerCase().includes('name')) return; // skip header
            const parts = line.split(',').map(p => p.trim());
            if (parts.length >= 4) {
                this.addRow({
                    name: parts[0],
                    category: parts[1],
                    qty: parts[2],
                    buy: parts[3],
                    sell: parts[4] || 0
                });
            }
        });
        alert('CSV Imported! Review the rows below.');
    },

    showPasswordDialog(store, callback) {
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
            <div class="card fade-in" style="width: 380px; padding: 32px; border-radius: 20px; text-align: center;">
                <div style="width: 52px; height: 52px; background: var(--primary-color); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i data-lucide="lock" style="width: 24px; height: 24px; color: white;"></i>
                </div>
                <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Security Verification</h3>
                <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">Please enter your password to confirm this action.</p>
                
                <input type="password" id="verify-pass" placeholder="Confirm Password" class="search-input" style="width: 100%; padding: 12px; margin-bottom: 20px; text-align: center;">
                
                <div style="display: flex; gap: 12px;">
                    <button id="cancel-verify" class="btn btn-outline" style="flex: 1; justify-content: center;">Cancel</button>
                    <button id="confirm-verify" class="btn btn-primary" style="flex: 1; justify-content: center;">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) window.lucide.createIcons();

        const input = modal.querySelector('#verify-pass');
        input.focus();

        modal.querySelector('#confirm-verify').addEventListener('click', () => {
            const user = store.getUser();
            if (input.value === user.password) {
                document.body.removeChild(modal);
                callback(true);
            } else {
                document.body.removeChild(modal);
                callback(false);
            }
        });

        modal.querySelector('#cancel-verify').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }
}
