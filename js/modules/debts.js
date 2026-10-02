import { Utils } from '../core/utils.js';

export default {
    render(store) {
        const container = document.createElement('div');
        container.className = 'fade-in';
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <div>
                    <h2 class="page-title">Debt Management</h2>
                    <p style="color: var(--text-secondary);">Track debtors and payment schedules.</p>
                </div>
                <button class="btn btn-primary" id="add-debt-btn">
                    <i data-lucide="plus-circle" style="width: 18px; height: 18px; margin-right: 8px;"></i>
                    Record New Debt
                </button>
            </div>

            <!-- Add Debt Form (Hidden by default) -->
            <div id="debt-form-container" class="card hidden" style="margin-bottom: 24px; border-left: 4px solid var(--warning-color);">
                <h3 style="margin-bottom: 16px; font-weight: 600;">New Debt Entry</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
                    <input type="text" id="d-debtor" placeholder="Debtor Name" class="search-input">
                    <input type="tel" id="d-phone" placeholder="Phone Number" class="search-input">
                    <input type="text" id="d-product" placeholder="Product Collected" class="search-input">
                    <input type="number" id="d-amount" placeholder="Amount Due" class="search-input">
                    <input type="date" id="d-due-date" class="search-input" title="Due Date">
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="save-debt-btn" class="btn btn-primary">Save Debt Permanent Record</button>
                    <button id="cancel-debt-btn" class="btn btn-outline">Cancel</button>
                </div>
            </div>

            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Debtor & Phone</th>
                            <th>Product</th>
                            <th>Amount</th>
                            <th>Due Date</th>
                            <th>Payment Status</th>
                            <th>Actions & Reasons</th>
                        </tr>
                    </thead>
                    <tbody id="debt-list">
                        <!-- Debts injected here -->
                    </tbody>
                </table>
            </div>
        `;

        this.attachEvents(container, store);
        this.renderList(container, store);

        return container;
    },

    renderList(container, store) {
        const tbody = container.querySelector('#debt-list');
        const debts = store.getDebts();

        if (debts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 24px;">No active debts found.</td></tr>';
            return;
        }

        const now = new Date();

        tbody.innerHTML = debts.map(d => {
            const dueDate = new Date(d.dueDate);
            const isOverdue = dueDate < now && d.status !== 'Paid';
            const reasons = (d.overdueReasons || []).map(r => `<div style="font-size: 11px; opacity: 0.7; border-left: 2px solid var(--warning-color); padding-left: 6px; margin-top: 4px;">${r.reason} (${new Date(r.date).toLocaleDateString()})</div>`).join('');

            return `
                <tr style="${isOverdue ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                    <td>
                        <div style="font-weight: 600;">${d.debtor}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="phone" style="width: 12px;"></i> ${d.phone || 'No Phone'}
                        </div>
                    </td>
                    <td>${d.product}</td>
                    <td style="font-weight: 700; color: var(--danger-color);">${Utils.formatCurrency(d.amount)}</td>
                    <td>
                        <div style="font-size: 13px;">${Utils.formatDate(d.dueDate).split(',')[0]}</div>
                        ${isOverdue ? '<span style="color: var(--danger-color); font-size: 11px; font-weight: 700;">OVERDUE</span>' : ''}
                    </td>
                    <td>
                        <span class="badge ${d.status === 'Paid' ? 'badge-success' : 'badge-warning'}">
                            ${d.status}
                        </span>
                        ${d.archived ? '<span class="badge badge-neutral" style="margin-left: 4px;">Archived</span>' : ''}
                    </td>
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <div style="display: flex; gap: 8px;">
                                ${d.status !== 'Paid' ? `<button class="icon-btn pay-btn" data-id="${d.id}" title="Settle Debt"><i data-lucide="check-square" style="width: 18px; color: var(--success-color);"></i></button>` : ''}
                                <a href="tel:${d.phone}" class="icon-btn" title="Call Customer"><i data-lucide="phone-forwarded" style="width: 18px; color: var(--primary-color);"></i></a>
                                ${isOverdue ? `<button class="icon-btn add-reason-btn" data-id="${d.id}" title="Add Overdue Reason"><i data-lucide="message-square" style="width: 18px; color: var(--warning-color);"></i></button>` : ''}
                            </div>
                            ${reasons ? `<div style="max-width: 200px;">${reasons}</div>` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();

        // Event Listeners for rows
        tbody.querySelectorAll('.pay-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').dataset.id;
                if (confirm('Mark this debt as fully settled? It will be archived permanently.')) {
                    store.deleteDebt(id); // mapped to soft-delete
                    this.renderList(container, store);
                }
            });
        });

        tbody.querySelectorAll('.add-reason-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('button').dataset.id;
                this.promptForReason(id, store, container);
            });
        });
    },

    promptForReason(id, store, container) {
        const reason = prompt("Enter the debtor's reason for overdue payment:");
        if (reason) {
            store.updateDebt(id, { newReason: reason });
            this.renderList(container, store);
        }
    },

    attachEvents(container, store) {
        const form = container.querySelector('#debt-form-container');
        const addBtn = container.querySelector('#add-debt-btn');
        const cancelBtn = container.querySelector('#cancel-debt-btn');
        const saveBtn = container.querySelector('#save-debt-btn');

        addBtn.addEventListener('click', () => {
            form.classList.toggle('hidden');
            if (window.lucide) window.lucide.createIcons();
        });

        cancelBtn.addEventListener('click', () => form.classList.add('hidden'));

        saveBtn.addEventListener('click', () => {
            const debtor = container.querySelector('#d-debtor').value;
            const phone = container.querySelector('#d-phone').value;
            const product = container.querySelector('#d-product').value;
            const amount = container.querySelector('#d-amount').value;
            const dueDate = container.querySelector('#d-due-date').value;

            if (debtor && product && amount && dueDate) {
                store.addDebt({
                    debtor,
                    phone,
                    product,
                    amount: Number(amount),
                    dueDate,
                    status: 'Pending'
                });
                form.classList.add('hidden');
                this.renderList(container, store);

                // Reset inputs
                container.querySelectorAll('.search-input').forEach(i => i.value = '');
            } else {
                alert('Please fill in required fields (Name, Product, Amount, Date)');
            }
        });
    }
};
