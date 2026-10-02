import { Utils } from '../core/utils.js';

export default {
    render(store) {
        const container = document.createElement('div');
        container.className = 'fade-in';
        container.innerHTML = `
            <div class="page-header">
                <div>
                    <h2 class="page-title">Inventory Management</h2>
                    <p style="color: var(--text-secondary);">Track stock levels and manage products.</p>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-outline" id="import-btn">📂 Import CSV</button>
                </div>
            </div>

            <!-- Product Table -->
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Stock</th>
                            <th>Buying Price</th>
                            <th>Selling Price</th>
                            <th>Profit/Unit</th>
                            <th>Potent. Profit</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="inventory-list">
                        <!-- Items injected here -->
                    </tbody>
                </table>
            </div>
        `;

        this.attachEvents(container, store);
        this.renderList(container, store);

        return container;
    },

    renderList(container, store) {
        const tbody = container.querySelector('#inventory-list');
        const products = store.getProducts();

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 24px;">No products found. Import or add one to get started.</td></tr>';
            return;
        }

        // Group by Category
        const grouped = products.reduce((acc, product) => {
            const cat = product.category || 'Uncategorized';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(product);
            return acc;
        }, {});

        // Sort Categories
        const categories = Object.keys(grouped).sort();

        let html = '';

        categories.forEach(category => {
            // Category Header
            html += `
                <tr style="background-color: var(--bg-body); border-bottom: 2px solid var(--border-color);">
                    <td colspan="9" style="font-weight: 700; color: var(--text-main); padding: 12px 16px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
                        ${category} <span style="font-weight: 400; color: var(--text-muted); font-size: 12px; margin-left: 8px;">(${grouped[category].length} items)</span>
                    </td>
                </tr>
            `;

            // Products in Category
            html += grouped[category].map(p => {
                // Stock Status Logic
                let statusBadge = '<span class="badge badge-success">In Stock</span>';
                let rowClass = '';

                if (p.qty <= 5) {
                    statusBadge = '<span class="badge badge-error">Low Stock</span>';
                    rowClass = 'row-low-stock';
                } else if (p.qty <= 15) {
                    statusBadge = '<span class="badge badge-warning">Running Low</span>';
                }

                // Stock Bar
                const maxStock = 100; // arbitrary scale for vis
                const barWidth = Math.min(100, (p.qty / maxStock) * 100);
                const barColor = p.qty <= 5 ? 'var(--danger-color)' : (p.qty <= 15 ? 'var(--warning-color)' : 'var(--success-color)');

                const profitPerUnit = p.sellPrice - p.buyPrice;
                const potentialProfit = profitPerUnit * p.qty;

                return `
                    <tr class="${rowClass}">
                        <td style="font-weight: 500; padding-left: 24px;">${p.name}</td>
                        <td>${p.category || '-'}</td>
                        <td>
                            <div class="stock-level-container">
                                <span class="stock-count">${p.qty}</span>
                                <div class="stock-progress-bar">
                                    <div class="stock-progress-fill" style="width: ${barWidth}%; background: ${barColor};"></div>
                                </div>
                            </div>
                        </td>
                        <td>${Utils.formatCurrency(p.buyPrice)}</td>
                        <td>${Utils.formatCurrency(p.sellPrice)}</td>
                        <td class="text-success">${Utils.formatCurrency(profitPerUnit)}</td>
                        <td class="text-primary">${Utils.formatCurrency(potentialProfit)}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="icon-btn edit-btn" data-id="${p.id}" title="Edit">
                                <i data-lucide="edit" style="width: 16px; height: 16px;"></i>
                            </button>
                            <button class="icon-btn delete-btn" data-id="${p.id}" title="Delete">
                                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                            </button>
                        </td>
                    </tr>
                 `;
            }).join('');
        });

        tbody.innerHTML = html;

        // Re-attach listeners
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').dataset.id;
                if (confirm('Are you sure you want to delete this product?')) {
                    store.deleteProduct(id);
                    this.renderList(container, store);
                }
            });
        });

        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').dataset.id;
                const product = store.getProducts().find(p => p.id === id);
                if (!product) return;

                Utils.showModal({
                    title: 'Edit Product',
                    confirmText: 'Save Changes',
                    content: `
                        <div class="auth-form" style="margin-bottom: 0;">
                            <div class="auth-input-wrapper">
                                <label class="label">Product Name</label>
                                <input type="text" id="edit-name" value="${product.name}" class="search-input">
                            </div>
                            <div class="auth-input-wrapper">
                                <label class="label">Category</label>
                                <input type="text" id="edit-category" value="${product.category || ''}" class="search-input">
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div>
                                    <label class="label">Stock Qty</label>
                                    <input type="number" id="edit-qty" value="${product.qty}" class="search-input">
                                </div>
                                <div>
                                    <label class="label">Buy Price</label>
                                    <input type="number" id="edit-buy" value="${product.buyPrice}" class="search-input">
                                </div>
                            </div>
                            <div>
                                <label class="label">Sell Price</label>
                                <input type="number" id="edit-sell" value="${product.sellPrice}" class="search-input">
                            </div>
                        </div>
                    `,
                    onConfirm: (modal) => {
                        const name = modal.querySelector('#edit-name').value;
                        const category = modal.querySelector('#edit-category').value;
                        const qty = modal.querySelector('#edit-qty').value;
                        const buyPrice = modal.querySelector('#edit-buy').value;
                        const sellPrice = modal.querySelector('#edit-sell').value;

                        if (name && qty && sellPrice) {
                            // Password Verification
                            Utils.showModal({
                                title: 'Security Check',
                                content: `
                                    <div class="auth-form" style="margin-bottom: 0;">
                                        <p style="margin-bottom: 16px; color: var(--text-secondary);">Please enter your password to confirm these changes.</p>
                                        <div class="auth-input-wrapper">
                                            <i data-lucide="lock" class="auth-input-icon"></i>
                                            <input type="password" id="confirm-pass" placeholder="Password" class="search-input auth-input">
                                        </div>
                                    </div>
                                `,
                                confirmText: 'Verify & Save',
                                onConfirm: (authModal) => {
                                    const password = authModal.querySelector('#confirm-pass').value;
                                    if (store.verifyPassword(password)) {
                                        // Log Changes
                                        store.logProductEdit({
                                            productId: id,
                                            productName: name,
                                            action: 'Update',
                                            changes: {
                                                old: {
                                                    name: product.name,
                                                    qty: product.qty,
                                                    price: product.sellPrice
                                                },
                                                new: {
                                                    name,
                                                    qty: Number(qty),
                                                    price: Number(sellPrice)
                                                }
                                            }
                                        });

                                        // Update Product
                                        store.updateProduct(id, {
                                            name,
                                            category,
                                            qty: Number(qty),
                                            buyPrice: Number(buyPrice),
                                            sellPrice: Number(sellPrice)
                                        });
                                        this.renderList(container, store);
                                        return true; // Close Auth Modal
                                    } else {
                                        alert('Incorrect Password!');
                                        return false; // Keep Auth Modal open
                                    }
                                }
                            });
                            return true; // Close Edit Modal
                        } else {
                            alert('Please fill in Name, Qty and Sell Price.');
                            return false;
                        }
                    }
                });
            });
        });
    },

    attachEvents(container, store) {
        const importBtn = container.querySelector('#import-btn');
        importBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.csv';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const csvData = Utils.parseCSV(event.target.result);
                    let addedCount = 0;

                    csvData.forEach(row => {
                        // Basic validation mapping
                        // Expected headers: name, category, stock (or qty), buyPrice, sellPrice
                        const name = row.name || row.Name;
                        const category = row.category || row.Category || 'General';
                        const qty = Number(row.stock || row.Stock || row.qty || row.Qty || 0);
                        const buyPrice = Number(row.buyPrice || row.cost || 0);
                        const sellPrice = Number(row.sellPrice || row.price || 0);

                        if (name && !isNaN(sellPrice)) {
                            store.addProduct({
                                name,
                                category,
                                qty,
                                buyPrice,
                                sellPrice
                            });
                            addedCount++;
                        }
                    });

                    if (addedCount > 0) {
                        alert(`Successfully imported ${addedCount} products.`);
                        this.renderList(container, store);
                    } else {
                        alert('No valid products found in CSV. Please check the format (headers: name, category, stock, buyPrice, sellPrice).');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });

        // Add Download Audit Log Button if not exists (check logic in case of re-renders)
        if (!container.querySelector('#audit-btn')) {
            const btnGroup = container.querySelector('.page-header div:last-child');
            const auditBtn = document.createElement('button');
            auditBtn.id = 'audit-btn';
            auditBtn.className = 'btn btn-outline';
            auditBtn.innerHTML = '📜 History';
            auditBtn.style.marginLeft = '8px';
            auditBtn.onclick = () => {
                const log = store.getAuditLog();
                if (log.length === 0) {
                    alert('No edit history found.');
                    return;
                }

                const headers = ['Timestamp', 'User', 'Action', 'Product Name', 'Old Qty', 'New Qty', 'Old Price', 'New Price'];
                const rows = log.map(entry => [
                    Utils.formatDate(entry.timestamp),
                    entry.user,
                    entry.action,
                    entry.productName,
                    entry.changes?.old?.qty || '-',
                    entry.changes?.new?.qty || '-',
                    entry.changes?.old?.price || '-',
                    entry.changes?.new?.price || '-'
                ]);

                Utils.downloadCSV([headers, ...rows], 'Product_Edit_History.csv');
            };
            btnGroup.appendChild(auditBtn);
        }
    }
}
