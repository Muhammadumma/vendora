export const Utils = {
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2
        }).format(amount);
    },

    formatDate(isoString) {
        if (!isoString) return '';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    printElement(elementId, title = 'Document') {
        const el = document.getElementById(elementId);
        if (!el) return;

        // Create a hidden iframe
        let iframe = document.getElementById('print-frame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'print-frame';
            iframe.style.position = 'absolute';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: 'Courier New', Courier, monospace; padding: 20px; color: #000; max-width: 300px; margin: 0 auto; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 15px; }
                        .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
                        .info { font-size: 12px; margin: 2px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th { text-align: left; border-bottom: 1px solid #000; padding: 5px 0; }
                        td { padding: 5px 0; border-bottom: 1px dashed #ccc; }
                        .totals { margin-top: 15px; border-top: 2px dashed #000; padding-top: 10px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
                        .total-row { font-weight: bold; font-size: 16px; margin-top: 10px; }
                        .footer { text-align: center; margin-top: 30px; font-size: 11px; border-top: 1px solid #000; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    ${el.innerHTML}
                </body>
            </html>
        `);
        doc.close();

        // Print after content loads
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 500);
    },

    downloadCSV(rows, filename) {
        if (!rows || !rows.length) return;

        const content = rows.map(row =>
            row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    },

    parseCSV(text) {
        const result = [];
        const lines = text.split(/\r\n|\n/);
        if (lines.length < 2) return result;

        const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().toLowerCase().replace(/^"|"$/g, '').replace(/""/g, '"'));

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const obj = {};
            const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

            headers.forEach((header, j) => {
                let val = currentline[j] ? currentline[j].trim() : '';
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.substring(1, val.length - 1).replace(/""/g, '"');
                }
                obj[header] = val;
            });
            result.push(obj);
        }
        return result;
    },

    showModal({ title, content, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel' }) {
        const overlay = document.createElement('div');
        overlay.className = 'auth-overlay fade-in'; // Reuse auth overlay styles
        overlay.style.zIndex = '3000';

        overlay.innerHTML = `
            <div class="auth-card" style="width: 500px; max-width: 90vw;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h3 style="font-size: 20px; font-weight: 700;">${title}</h3>
                    <button id="modal-close" class="icon-btn">✕</button>
                </div>
                <div style="margin-bottom: 32px;">
                    ${content}
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button id="modal-cancel" class="btn btn-outline">${cancelText}</button>
                    <button id="modal-confirm" class="btn btn-primary">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const close = () => {
            overlay.remove();
        };

        overlay.querySelector('#modal-close').onclick = close;
        overlay.querySelector('#modal-cancel').onclick = close;

        overlay.querySelector('#modal-confirm').onclick = async () => {
            if (onConfirm) {
                const result = await onConfirm(overlay);
                if (result !== false) close();
            } else {
                close();
            }
        };

        // Close on outside click
        overlay.onclick = (e) => {
            if (e.target === overlay) close();
        };
    },

    formatTimeAgo(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString();
    },

    convertToCSV(data) {
        if (!data || !data.length) return '';
        const headers = Object.keys(data[0]);
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const row of data) {
            const values = headers.map(header => {
                const val = row[header];
                return `"${String(val).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }
        return csvRows.join('\n');
    },

    downloadFile(content, fileName, contentType) {
        const a = document.createElement("a");
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    }
};
