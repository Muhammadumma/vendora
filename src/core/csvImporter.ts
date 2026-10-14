import Papa from 'papaparse';

export interface ValidatedProductData {
    title: string;
    sku: string;
    category: string;
    qty: number;
    cost: number;
    price: number;
    supplier: string;
    threshold: number;
}

export interface RowValidationResult {
    rowNumber: number;
    valid: boolean;
    errors: string[];
    warnings: string[];
    data: ValidatedProductData | null;
    raw: Record<string, string>;
}

export interface ParseCSVResult {
    success: boolean;
    headerError?: string;
    expectedHeaders?: string[];
    foundHeaders?: string[];
    totalRows: number;
    imported: number;
    rejected: number;
    warningCount: number;
    validRows: RowValidationResult[];
    rejectedRows: RowValidationResult[];
    hasSuspiciousMargin: boolean;
    rawPreviewRows: {
        rowNumber: number;
        raw: Record<string, string>;
        parsed: ValidatedProductData | null;
        valid: boolean;
        errors: string[];
        warnings: string[];
    }[];
}

// Canonical fields
export type CanonicalField = 'title' | 'category' | 'sku' | 'qty' | 'cost' | 'price' | 'supplier' | 'threshold';

const FIELD_ALIASES: Record<CanonicalField, string[]> = {
    title: [
        'product title',
        'title',
        'product name',
        'item name',
        'name',
        'product'
    ],
    category: [
        'category',
        'department',
        'dept',
        'cat'
    ],
    sku: [
        'sku / barcode id',
        'sku/barcode id',
        'sku / barcode',
        'sku/barcode',
        'sku / id',
        'sku id',
        'sku',
        'barcode id',
        'barcode',
        'item sku'
    ],
    qty: [
        'initial batch count',
        'initial batch',
        'batch count',
        'initial count',
        'quantity',
        'qty',
        'initial stock',
        'stock quantity',
        'stock count',
        'stock'
    ],
    cost: [
        'unit cost (₦)',
        'unit cost (n)',
        'unit cost',
        'cost price (₦)',
        'cost price',
        'cost (₦)',
        'cost',
        'buy price',
        'purchase price'
    ],
    price: [
        'selling price (₦)',
        'selling price (n)',
        'selling price',
        'price (₦)',
        'price',
        'sell price',
        'retail price',
        'unit price'
    ],
    supplier: [
        'assigned supplier',
        'supplier',
        'vendor',
        'distributor',
        'source'
    ],
    threshold: [
        'low stock alert threshold',
        'low stock threshold',
        'alert threshold',
        'threshold',
        'reorder threshold',
        'min stock',
        'alert limit'
    ]
};

export function cleanNumString(v: unknown): string {
    return String(v ?? '').replace(/[₦,\s]/g, '');
}

export function normalizeHeader(h: string): string {
    return h
        .replace(/^\uFEFF/, '') // Strip UTF-8 BOM if in header string
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

export function buildHeaderMap(rawHeaders: string[]): {
    headerMap: Partial<Record<CanonicalField, number>>;
    foundNormalized: string[];
    missingRequired: string[];
} {
    const headerMap: Partial<Record<CanonicalField, number>> = {};
    const foundNormalized: string[] = rawHeaders.map(normalizeHeader);

    // Map each raw header to canonical field by aliases
    for (let colIdx = 0; colIdx < foundNormalized.length; colIdx++) {
        const header = foundNormalized[colIdx];
        if (!header) continue;

        for (const [canonicalKey, aliases] of Object.entries(FIELD_ALIASES) as [CanonicalField, string[]][]) {
            if (headerMap[canonicalKey] === undefined) {
                // Exact alias match or close match
                const match = aliases.some(alias => alias === header || header.replace(/[()₦]/g, '').trim() === alias.replace(/[()₦]/g, '').trim());
                if (match) {
                    headerMap[canonicalKey] = colIdx;
                    break;
                }
            }
        }
    }

    const requiredFields: CanonicalField[] = ['title', 'sku', 'cost', 'price'];
    const missingRequired = requiredFields.filter(req => headerMap[req] === undefined);

    return {
        headerMap,
        foundNormalized,
        missingRequired
    };
}

export function computeMargin(cost: number, price: number): number | null {
    if (!Number.isFinite(cost) || !Number.isFinite(price) || cost <= 0 || price <= 0) {
        return null;
    }
    return (price - cost) / price;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
    return Math.abs(count) === 1 ? singular : plural;
}

export function validateRow(
    row: {
        title?: unknown;
        sku?: unknown;
        category?: unknown;
        qty?: unknown;
        cost?: unknown;
        price?: unknown;
        supplier?: unknown;
        threshold?: unknown;
    },
    existingSKUs: Set<string>
): { valid: boolean; errors: string[]; warnings: string[]; data: ValidatedProductData | null } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const title = String(row.title ?? '').trim();
    const sku = String(row.sku ?? '').trim();
    const category = String(row.category ?? '').trim();

    // Required checks
    if (!title) errors.push('Missing product title');
    if (!sku) errors.push('Missing SKU');
    if (!category) errors.push('Missing category');

    // SKU uniqueness
    if (sku) {
        if (existingSKUs.has(sku)) {
            errors.push(`Duplicate SKU: ${sku}`);
        }
    }

    // Numbers parsing
    const cleanQtyStr = cleanNumString(row.qty);
    const qty = parseInt(cleanQtyStr, 10);
    const isQtyStrictInteger = /^-?\d+$/.test(cleanQtyStr);

    const cleanCostStr = cleanNumString(row.cost);
    const cost = parseFloat(cleanCostStr);

    const cleanPriceStr = cleanNumString(row.price);
    const price = parseFloat(cleanPriceStr);

    const hasThreshold = row.threshold !== undefined && row.threshold !== null && String(row.threshold).trim() !== '';
    const cleanThreshStr = hasThreshold ? cleanNumString(row.threshold) : '5';
    const threshold = parseInt(cleanThreshStr, 10);
    const isThresholdStrictInteger = !hasThreshold || /^-?\d+$/.test(cleanThreshStr);

    // Numeric sanity
    if (!isQtyStrictInteger || !Number.isInteger(qty) || qty < 0) {
        errors.push(`Invalid quantity: ${row.qty ?? ''}`);
    }
    if (!Number.isFinite(cost) || cost <= 0) {
        errors.push(`Invalid cost: ${row.cost ?? ''}`);
    }
    if (!Number.isFinite(price) || price <= 0) {
        errors.push(`Invalid price: ${row.price ?? ''}`);
    }
    if (!isThresholdStrictInteger || !Number.isInteger(threshold) || threshold < 0) {
        errors.push(`Invalid threshold`);
    }

    // Business rules
    if (Number.isFinite(cost) && Number.isFinite(price) && price < cost) {
        errors.push('Selling price below cost');
    }

    if (Number.isFinite(cost) && Number.isFinite(price) && cost > 0 && price > 0) {
        const margin = (price - cost) / price;
        if (margin > 0.60) {
            warnings.push(`Suspicious margin: ${(margin * 100).toFixed(1)}% — verify column mapping`);
        }
    }

    if (threshold > 100) {
        warnings.push(`Threshold unusually high: ${threshold}`);
    }

    const isValid = errors.length === 0;

    return {
        valid: isValid,
        errors,
        warnings,
        data: isValid
            ? {
                title,
                sku,
                category: category || 'General',
                qty: isNaN(qty) ? 0 : qty,
                cost,
                price,
                supplier: String(row.supplier ?? '').trim() || 'Direct Wholesaler',
                threshold: isNaN(threshold) ? 5 : threshold
            }
            : null
    };
}

/**
 * Strips UTF-8 Byte Order Mark (BOM \uFEFF)
 */
export function stripBOM(str: string): string {
    if (str.charCodeAt(0) === 0xFEFF) {
        return str.slice(1);
    }
    return str;
}

/**
 * RFC 4180 compliant CSV parser with UTF-8 support, column mapping & row validation
 */
export function parseAndValidateCSV(
    csvText: string,
    alreadyStoredSKUs: Set<string> = new Set()
): ParseCSVResult {
    const cleanedText = stripBOM(csvText).trim();

    if (!cleanedText) {
        return {
            success: false,
            headerError: 'The CSV file is empty.',
            totalRows: 0,
            imported: 0,
            rejected: 0,
            warningCount: 0,
            validRows: [],
            rejectedRows: [],
            hasSuspiciousMargin: false,
            rawPreviewRows: []
        };
    }

    // PapaParse handles quotes, escaped commas, newlines, and RFC 4180 rules
    const parsed = Papa.parse<string[]>(cleanedText, {
        skipEmptyLines: 'greedy',
    });

    if (!parsed.data || parsed.data.length === 0) {
        return {
            success: false,
            headerError: 'Could not parse any rows from CSV.',
            totalRows: 0,
            imported: 0,
            rejected: 0,
            warningCount: 0,
            validRows: [],
            rejectedRows: [],
            hasSuspiciousMargin: false,
            rawPreviewRows: []
        };
    }

    const rawHeaders = parsed.data[0];
    const { headerMap, foundNormalized, missingRequired } = buildHeaderMap(rawHeaders);

    if (missingRequired.length > 0) {
        return {
            success: false,
            headerError: `Missing required column(s): ${missingRequired.join(', ')}. Found columns: [${foundNormalized.join(', ')}]`,
            expectedHeaders: [
                'Product Title',
                'Category',
                'SKU / Barcode ID',
                'Initial Batch Count',
                'Unit Cost (₦)',
                'Selling Price (₦)',
                'Assigned Supplier',
                'Low Stock Alert Threshold'
            ],
            foundHeaders: rawHeaders,
            totalRows: parsed.data.length - 1,
            imported: 0,
            rejected: parsed.data.length - 1,
            warningCount: 0,
            validRows: [],
            rejectedRows: [],
            hasSuspiciousMargin: false,
            rawPreviewRows: []
        };
    }

    const seenSKUsInFile = new Set<string>(alreadyStoredSKUs);
    const validRows: RowValidationResult[] = [];
    const rejectedRows: RowValidationResult[] = [];
    let hasSuspiciousMargin = false;
    let totalWarnings = 0;

    const dataRows = parsed.data.slice(1);

    dataRows.forEach((rowCols, index) => {
        const rowNumber = index + 2; // 1-indexed including header
        if (!rowCols || rowCols.length === 0 || (rowCols.length === 1 && !rowCols[0].trim())) {
            return;
        }

        const getCol = (field: CanonicalField) => {
            const idx = headerMap[field];
            return idx !== undefined ? (rowCols[idx] ?? '') : '';
        };

        const rawObj: Record<string, string> = {
            title: getCol('title'),
            category: getCol('category'),
            sku: getCol('sku'),
            qty: getCol('qty'),
            cost: getCol('cost'),
            price: getCol('price'),
            supplier: getCol('supplier'),
            threshold: getCol('threshold')
        };

        const validation = validateRow(rawObj, seenSKUsInFile);
        const res: RowValidationResult = {
            rowNumber,
            valid: validation.valid,
            errors: validation.errors,
            warnings: validation.warnings,
            data: validation.data,
            raw: rawObj
        };

        if (validation.valid && validation.data) {
            seenSKUsInFile.add(validation.data.sku);
            validRows.push(res);
            if (validation.warnings.length > 0) {
                totalWarnings += validation.warnings.length;
                if (validation.warnings.some(w => w.includes('Suspicious margin'))) {
                    hasSuspiciousMargin = true;
                }
            }
        } else {
            rejectedRows.push(res);
        }
    });

    // Preview for first 5 rows (both valid and rejected)
    const allProcessed = [...validRows, ...rejectedRows].sort((a, b) => a.rowNumber - b.rowNumber);
    const rawPreviewRows = allProcessed.slice(0, 5).map(r => ({
        rowNumber: r.rowNumber,
        raw: r.raw,
        parsed: r.data,
        valid: r.valid,
        errors: r.errors,
        warnings: r.warnings
    }));

    return {
        success: true,
        totalRows: dataRows.length,
        imported: validRows.length,
        rejected: rejectedRows.length,
        warningCount: totalWarnings,
        validRows,
        rejectedRows,
        hasSuspiciousMargin,
        rawPreviewRows
    };
}
