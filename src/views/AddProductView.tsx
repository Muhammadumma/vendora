import React, { useState } from 'react';
import {
    Scan,
    Plus,
    FileUp,
    ShieldCheck,
    CheckCircle2,
    Truck,
    Package,
    Tag,
    TrendingUp,
    RefreshCw,
    AlertTriangle,
    XCircle,
    Download,
    Eye,
    ChevronDown,
    ChevronUp,
    Check
} from 'lucide-react';
import { Store } from '../core/store';
import { Utils } from '../core/utils';
import {
    parseAndValidateCSV,
    ParseCSVResult,
    pluralize,
    computeMargin
} from '../core/csvImporter';

interface AddProductViewProps {
    onNavigate: (route: string) => void;
}

export const AddProductView: React.FC<AddProductViewProps> = ({ onNavigate }) => {
    const [tab, setTab] = useState<'single' | 'batch'>('single');

    // Single item state
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Grains');
    const [sku, setSku] = useState(() => `SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    const [batchCount, setBatchCount] = useState<number | string>(10);
    const [unitCost, setUnitCost] = useState<number | string>('');
    const [sellingPrice, setSellingPrice] = useState<number | string>('');
    const [supplier, setSupplier] = useState('');
    const [thresholdValue, setThresholdValue] = useState<number | string>(5);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Batch CSV Importer State
    const [importPreview, setImportPreview] = useState<ParseCSVResult | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [showAllRejected, setShowAllRejected] = useState(false);
    const [isCommitting, setIsCommitting] = useState(false);

    const categoriesList = ['Grains', 'Cooking Oil', 'Dairy & Milk', 'Beverages', 'Flour & Bakery', 'Packaged Foods', 'Personal Care', 'General'];

    // Real-time calculations for single entry
    const costNum = Number(unitCost) || 0;
    const sellNum = Number(sellingPrice) || 0;
    const countNum = Math.max(1, parseInt(String(batchCount), 10) || 1);
    const unitGrossProfit = sellNum - costNum;
    const marginPct = sellNum > 0 ? ((unitGrossProfit / sellNum) * 100).toFixed(1) : '0';
    const batchInventoryValue = countNum * sellNum;

    const handleSaveSingle = (andAnother = false) => {
        const prodTitle = title.trim();
        if (!prodTitle) {
            setErrorMessage('Product title is required.');
            return;
        }
        if (costNum <= 0) {
            setErrorMessage('Please enter a cost price greater than ₦0.');
            return;
        }
        if (sellNum <= 0) {
            setErrorMessage('Please enter a selling price greater than ₦0.');
            return;
        }

        setErrorMessage('');
        Store.addProduct({
            name: prodTitle,
            sku: sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            category,
            qty: countNum,
            buyPrice: costNum,
            sellPrice: sellNum,
            supplier: supplier.trim() || 'Direct Wholesaler',
            threshold: Number(thresholdValue) || 5
        });

        setSuccessMessage(`✓ "${prodTitle}" added to stock catalog!`);
        setTimeout(() => setSuccessMessage(''), 3000);

        if (andAnother) {
            setTitle('');
            setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
            setBatchCount(10);
            setUnitCost('');
            setSellingPrice('');
        } else {
            window.location.hash = '#inventory';
            onNavigate('inventory');
        }
    };

    // CSV File Reading with UTF-8
    const processCSVText = (text: string, filename: string) => {
        setUploadedFileName(filename);
        const existingSKUs = new Set(
            Store.getProducts()
                .map(p => (p.sku || p.id).trim().toLowerCase())
                .filter(Boolean)
        );
        const result = parseAndValidateCSV(text, existingSKUs);
        setImportPreview(result);
    };

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = (event.target?.result as string) || '';
            processCSVText(text, file.name);
        };
        reader.readAsText(file, 'utf-8');
    };

    const handleCommitBatchImport = () => {
        if (!importPreview || importPreview.imported === 0) return;
        setIsCommitting(true);

        const itemsToAdd = importPreview.validRows.map(r => ({
            name: r.data!.title,
            sku: r.data!.sku,
            category: r.data!.category,
            qty: r.data!.qty,
            buyPrice: r.data!.cost,
            sellPrice: r.data!.price,
            supplier: r.data!.supplier,
            threshold: r.data!.threshold,
            warnings: r.warnings
        }));

        Store.addProductsBatch(itemsToAdd);

        setSuccessMessage(`✓ Successfully added ${itemsToAdd.length} products to stock!`);
        setTimeout(() => {
            setIsCommitting(false);
            window.location.hash = '#inventory';
            onNavigate('inventory');
        }, 1200);
    };

    const handleDownloadTemplate = () => {
        const headers = [
            'Product Title',
            'Category',
            'SKU / Barcode ID',
            'Initial Batch Count',
            'Unit Cost (₦)',
            'Selling Price (₦)',
            'Assigned Supplier',
            'Low Stock Alert Threshold'
        ];
        const sampleRows = [
            ['Golden Penny Semovita 10kg', 'Grains', 'SKU-8921-SEMO', '25', '7900', '9200', 'Flour Mills of Nigeria', '5'],
            ['Milo Refill 500g', 'Beverages', 'SKU-9108-MILO', '35', '2700', '3400', 'Nestle Lagos Hub', '10'],
            ['Golden Morn 900g', 'Beverages', 'SKU-3321-GMORN', '20', '4000', '4800', 'Nestle Lagos Hub', '6'],
            ['"Rice, Premium Long Grain 25kg"', 'Grains', 'SKU-5491-RICE', '15', '18500', '21000', 'Staples Distribution', '4'],
            ['Unicode Test ₦ Ẹ̀wà Ìrẹsì 🍚', 'Grains', 'SKU-UNICODE-01', '30', '4500', '5800', 'Ibadan Local Depot', '8']
        ];
        Utils.downloadCSV([headers, ...sampleRows], 'Stock_Control_Hub_Template.csv');
    };

    const handleLoadStressTest = () => {
        const stressCSV = `Product Title,Category,SKU / Barcode ID,Initial Batch Count,Unit Cost (₦),Selling Price (₦),Assigned Supplier,Low Stock Alert Threshold
Golden Penny Semovita 10kg,Grains,SKU-8921-SEMO,25,7900,9200,Flour Mills of Nigeria,5
Milo Refill 500g,Beverages,SKU-9108-MILO,35,2700,3400,Nestle Lagos Hub,10
Golden Morn 900g,Beverages,SKU-3321-GMORN,20,4000,4800,Nestle Lagos Hub,6
"Rice, Premium Long Grain 25kg",Grains,SKU-5491-RICE,15,18500,21000,Staples Distribution,4
Unicode Test ₦ Ẹ̀wà Ìrẹsì 🍚,Grains,SKU-UNICODE-01,30,4500,5800,Ibadan Local Depot,8
Comma Price Test,Pantry,SKU-COMMA-01,10,"5,000","6,500",Local Market,5
Naira Symbol Test,Pantry,SKU-NAIRA-01,12,₦3500,₦4500,Local Market,5
Negative Stock Trap,Pantry,SKU-NEG-01,-5,1000,1500,Supplier,5
Cost Equals Price Trap,Pantry,SKU-EQ-01,10,3000,3000,Supplier,5
Selling Below Cost Trap,Pantry,SKU-LOSS-01,10,5000,4000,Supplier,5
Zero Cost Trap,Pantry,SKU-ZERO-01,10,0,2000,Supplier,5
Duplicate SKU First,Pantry,SKU-DUP-01,10,2000,2500,Supplier,5
Duplicate SKU Second,Pantry,SKU-DUP-01,10,2000,2500,Supplier,5
Missing Title Trap,Pantry,SKU-NOTITLE-01,10,2000,2500,Supplier,5
Missing SKU Trap,Pantry,,10,2000,2500,Supplier,5
Decimal Quantity Trap,Pantry,SKU-DEC-01,10.5,2000,2500,Supplier,5
Huge Margin Warning,Pantry,SKU-HIGHMAR-01,10,25,9200,Supplier,5
High Threshold Warning,Pantry,SKU-HIGHTHRESH-01,10,2000,2500,Supplier,999`;
        processCSVText(stressCSV, 'stress-test-batch.csv');
    };

    return (
        <div className="fade-in" style={{ paddingBottom: '36px' }}>
            {/* Header */}
            <div style={{ marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#F95721', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Stock Control Hub
                </span>
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '2px 0 0' }}>Add New Products</h1>
                <p style={{ color: '#64748B', fontSize: '13px', margin: '2px 0 0' }}>
                    Add single items directly or import a spreadsheet.
                </p>
            </div>

            {/* Compact Tab Switcher */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#F1F5F9', padding: '3px', borderRadius: '12px', marginBottom: '14px' }}>
                <button
                    type="button"
                    onClick={() => setTab('single')}
                    style={{
                        padding: '9px',
                        borderRadius: '9px',
                        border: 'none',
                        background: tab === 'single' ? '#FFFFFF' : 'transparent',
                        color: tab === 'single' ? '#F95721' : '#64748B',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: tab === 'single' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                    }}
                >
                    Single Product
                </button>
                <button
                    type="button"
                    onClick={() => setTab('batch')}
                    style={{
                        padding: '9px',
                        borderRadius: '9px',
                        border: 'none',
                        background: tab === 'batch' ? '#FFFFFF' : 'transparent',
                        color: tab === 'batch' ? '#F95721' : '#64748B',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        boxShadow: tab === 'batch' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                    }}
                >
                    Batch / CSV Import
                </button>
            </div>

            {/* Feedback Banners */}
            {successMessage && (
                <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#DCFCE7', color: '#15803D', fontSize: '13px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{successMessage}</span>
                </div>
            )}
            {errorMessage && (
                <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#FEF2F2', color: '#DC2626', fontSize: '13px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} />
                    <span>{errorMessage}</span>
                </div>
            )}

            {tab === 'single' ? (
                /* ─── Compact Vivid Single Product Form (Minimizes scrolling) ─── */
                <div className="card" style={{ padding: '12px 14px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #EDF2F7', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    {/* Row 1: Product Title */}
                    <div style={{ marginBottom: '8px' }}>
                        <label className="label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Product Name *</label>
                        <input
                            type="text"
                            className="search-input"
                            style={{ width: '100%', fontSize: '13.5px', fontWeight: 600, height: '38px', padding: '8px 10px' }}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Golden Penny Semovita 10kg"
                            required
                        />
                    </div>

                    {/* Row 2: Category & SKU */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <div>
                            <label className="label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Category</label>
                            <select
                                className="search-input"
                                style={{ width: '100%', height: '38px', fontSize: '12.5px', padding: '6px 8px' }}
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                            >
                                {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Item Code / SKU</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="search-input"
                                    style={{ width: '100%', paddingRight: '32px', height: '38px', fontSize: '12.5px', padding: '6px 8px' }}
                                    value={sku}
                                    onChange={e => setSku(e.target.value)}
                                    placeholder="SKU-1001"
                                />
                                <button
                                    type="button"
                                    onClick={() => setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`)}
                                    style={{ position: 'absolute', right: '6px', top: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                                    title="Generate new SKU"
                                >
                                    <Scan size={14} color="#64748B" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Cost Price & Selling Price */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <div>
                            <label className="label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Cost Price (₦) *</label>
                            <input
                                type="number"
                                className="search-input"
                                style={{ width: '100%', height: '38px', fontSize: '13.5px', fontWeight: 700, padding: '6px 8px' }}
                                value={unitCost}
                                onChange={e => setUnitCost(e.target.value)}
                                placeholder="7900"
                                min="0"
                                required
                            />
                        </div>
                        <div>
                            <label className="label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Selling Price (₦) *</label>
                            <input
                                type="number"
                                className="search-input"
                                style={{ width: '100%', height: '38px', fontSize: '13.5px', fontWeight: 700, color: '#F95721', padding: '6px 8px' }}
                                value={sellingPrice}
                                onChange={e => setSellingPrice(e.target.value)}
                                placeholder="9200"
                                min="0"
                                required
                            />
                        </div>
                    </div>

                    {/* Vivid Profit Ribbon */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: unitGrossProfit > 0 ? '#F0FDF4' : '#F8FAFC',
                        border: unitGrossProfit > 0 ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        marginBottom: '8px'
                    }}>
                        <div style={{ fontSize: '11.5px', color: '#475569' }}>
                            <span>Profit: </span>
                            <strong style={{ color: unitGrossProfit > 0 ? '#15803D' : '#64748B' }}>
                                ₦{unitGrossProfit.toLocaleString()}
                            </strong>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#475569' }}>
                            <span>Margin: </span>
                            <strong style={{ color: Number(marginPct) > 0 ? '#15803D' : '#64748B' }}>
                                {marginPct}%
                            </strong>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#475569' }}>
                            <span>Value: </span>
                            <strong style={{ color: '#F95721' }}>
                                ₦{batchInventoryValue.toLocaleString()}
                            </strong>
                        </div>
                    </div>

                    {/* Row 4: Quantity in Stock & Low Stock Threshold */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div>
                            <label className="label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Stock Quantity *</label>
                            <input
                                type="number"
                                className="search-input"
                                style={{ width: '100%', height: '38px', fontSize: '13px', padding: '6px 8px' }}
                                value={batchCount}
                                onChange={e => setBatchCount(e.target.value)}
                                min="1"
                                placeholder="10"
                                required
                            />
                        </div>
                        <div>
                            <label className="label" style={{ fontSize: '11.5px', marginBottom: '3px' }}>Alert When Below</label>
                            <input
                                type="number"
                                className="search-input"
                                style={{ width: '100%', height: '38px', fontSize: '13px', padding: '6px 8px' }}
                                value={thresholdValue}
                                onChange={e => setThresholdValue(e.target.value)}
                                min="1"
                                placeholder="5"
                            />
                        </div>
                    </div>

                    {/* Single Unified Action Buttons Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSaveSingle(false)}
                            style={{ padding: '10px 14px', fontSize: '13.5px', fontWeight: 800, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                            <Check size={15} /> Save Product
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => handleSaveSingle(true)}
                            style={{ padding: '10px 12px', fontSize: '12.5px', fontWeight: 700, borderRadius: '10px', background: '#FFFFFF', whiteSpace: 'nowrap' }}
                        >
                            + Another
                        </button>
                    </div>
                </div>
            ) : (
                /* ─── Batch CSV Import with Dry Run Preview & Validation ─── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {!importPreview ? (
                        <div className="card" style={{ padding: '22px 18px', borderRadius: '18px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <FileUp size={26} color="#F95721" />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                                Import Products from CSV
                            </h3>
                            <p style={{ color: '#64748B', fontSize: '13px', maxWidth: '440px', margin: '0 auto 16px', lineHeight: 1.4 }}>
                                Reads columns by header name, supports Naira (₦) & diacritics, and prevents corrupted trap rows.
                            </p>

                            {/* Standard Columns Preview */}
                            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px', margin: '0 auto 18px', maxWidth: '520px', border: '1px solid #E2E8F0', textAlign: 'left' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    Expected Columns in CSV:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {[
                                        'Product Title',
                                        'Category',
                                        'SKU / Barcode ID',
                                        'Initial Batch Count',
                                        'Unit Cost (₦)',
                                        'Selling Price (₦)',
                                        'Assigned Supplier',
                                        'Low Stock Alert Threshold'
                                    ].map(col => (
                                        <span key={col} style={{ padding: '2px 7px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #CBD5E1', fontSize: '10.5px', fontWeight: 600, color: '#334155' }}>
                                            {col}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Choose File Button */}
                            <input
                                type="file"
                                id="batch-csv-upload-input"
                                accept=".csv,text/csv"
                                style={{ display: 'none' }}
                                onChange={handleCSVUpload}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', maxWidth: '340px', margin: '0 auto' }}>
                                <label
                                    htmlFor="batch-csv-upload-input"
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '12px 20px', cursor: 'pointer', borderRadius: '12px', fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <FileUp size={16} /> Choose CSV File
                                </label>

                                <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={handleDownloadTemplate}
                                        style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 700, borderRadius: '10px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <Download size={13} /> Sample CSV
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={handleLoadStressTest}
                                        style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 700, borderRadius: '10px', background: '#FFF2EB', color: '#F95721', borderColor: 'rgba(249,87,33,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                        <RefreshCw size={13} /> Test Sample
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ─── Dry Run & Validation Preview ─── */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {/* File Name & Actions */}
                            <div className="card" style={{ padding: '12px 16px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #EDF2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFF2EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileUp size={16} color="#F95721" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{uploadedFileName}</div>
                                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                                            {importPreview.totalRows} data rows parsed
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        type="file"
                                        id="reupload-csv-input"
                                        accept=".csv,text/csv"
                                        style={{ display: 'none' }}
                                        onChange={handleCSVUpload}
                                    />
                                    <label
                                        htmlFor="reupload-csv-input"
                                        className="btn btn-outline"
                                        style={{ padding: '6px 12px', fontSize: '11.5px', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', background: '#FFFFFF' }}
                                    >
                                        Change File
                                    </label>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setImportPreview(null)}
                                        style={{ padding: '6px 10px', fontSize: '11.5px', fontWeight: 700, borderRadius: '8px', background: '#FFFFFF' }}
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {!importPreview.success ? (
                                <div className="card" style={{ padding: '16px', borderRadius: '14px', background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', marginBottom: '6px' }}>
                                        <XCircle size={18} />
                                        <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Missing Required Columns</h4>
                                    </div>
                                    <p style={{ color: '#991B1B', fontSize: '12.5px', margin: '0 0 10px' }}>
                                        {importPreview.headerError}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* 4 Summary Stat Cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                        <div className="card" style={{ padding: '10px 6px', borderRadius: '12px', background: '#FFFFFF', border: '1px solid #EDF2F7', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 700 }}>Total</div>
                                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                                                {importPreview.totalRows}
                                            </div>
                                        </div>
                                        <div className="card" style={{ padding: '10px 6px', borderRadius: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10.5px', color: '#166534', fontWeight: 700 }}>Valid</div>
                                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803D' }}>
                                                {importPreview.imported}
                                            </div>
                                        </div>
                                        <div className="card" style={{ padding: '10px 6px', borderRadius: '12px', background: '#FEFCE8', border: '1px solid #FEF08A', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10.5px', color: '#854D0E', fontWeight: 700 }}>Warnings</div>
                                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#A16207' }}>
                                                {importPreview.warningCount}
                                            </div>
                                        </div>
                                        <div className="card" style={{ padding: '10px 6px', borderRadius: '12px', background: '#FEF2F2', border: '1px solid #FECACA', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10.5px', color: '#991B1B', fontWeight: 700 }}>Rejected</div>
                                            <div style={{ fontSize: '18px', fontWeight: 800, color: '#DC2626' }}>
                                                {importPreview.rejected}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Suspicious Margin Warning */}
                                    {importPreview.hasSuspiciousMargin && (
                                        <div style={{ padding: '10px 14px', borderRadius: '12px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
                                            <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0 }} />
                                            <span>Some margins look unusually high (&gt;60%). Please verify cost vs selling price.</span>
                                        </div>
                                    )}

                                    {/* Preview Table */}
                                    <div className="card" style={{ padding: '14px', borderRadius: '16px', background: '#FFFFFF', border: '1px solid #EDF2F7' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                                            Preview (First 5 Rows)
                                        </div>
                                        <div className="data-table-container" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                            <table className="data-table" style={{ width: '100%', fontSize: '11.5px' }}>
                                                <thead>
                                                    <tr style={{ background: '#F8FAFC' }}>
                                                        <th>#</th>
                                                        <th>Title</th>
                                                        <th>SKU</th>
                                                        <th>Cost</th>
                                                        <th>Price</th>
                                                        <th>Margin</th>
                                                        <th>Qty</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {importPreview.rawPreviewRows.map((r) => {
                                                        const p = r.parsed;
                                                        const margin = p ? computeMargin(p.cost, p.price) : null;
                                                        return (
                                                            <tr key={r.rowNumber} style={{ background: !r.valid ? '#FFF5F5' : undefined }}>
                                                                <td style={{ fontWeight: 800 }}>#{r.rowNumber}</td>
                                                                <td style={{ fontWeight: 700, maxWidth: '140px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {p ? p.title : (r.raw.title || <em style={{ color: '#EF4444' }}>Empty</em>)}
                                                                </td>
                                                                <td>{p ? p.sku : (r.raw.sku || '—')}</td>
                                                                <td style={{ fontWeight: 700 }}>{p ? `₦${p.cost.toLocaleString()}` : (r.raw.cost || '—')}</td>
                                                                <td style={{ fontWeight: 700, color: '#F95721' }}>{p ? `₦${p.price.toLocaleString()}` : (r.raw.price || '—')}</td>
                                                                <td>{margin !== null ? `${(margin * 100).toFixed(1)}%` : '—'}</td>
                                                                <td>{p ? p.qty : (r.raw.qty || '—')}</td>
                                                                <td>
                                                                    {r.valid ? (
                                                                        <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', fontSize: '10.5px', fontWeight: 800 }}>
                                                                            Valid
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#FEE2E2', color: '#B91C1C', fontSize: '10.5px', fontWeight: 800 }}>
                                                                            Invalid
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Rejected Rows Collapsible */}
                                    {importPreview.rejected > 0 && (
                                        <div className="card" style={{ padding: '12px 14px', borderRadius: '14px', background: '#FFFFFF', border: '1px solid #FECACA' }}>
                                            <div
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                                onClick={() => setShowAllRejected(!showAllRejected)}
                                            >
                                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B' }}>
                                                    {importPreview.rejected} Rejected Rows (Will NOT be imported)
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 700 }}>
                                                    {showAllRejected ? 'Hide' : 'View Reasons'}
                                                </span>
                                            </div>
                                            {showAllRejected && (
                                                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {importPreview.rejectedRows.map(r => (
                                                        <div key={r.rowNumber} style={{ padding: '6px 10px', borderRadius: '8px', background: '#FFF5F5', fontSize: '11.5px', display: 'flex', justifyContent: 'space-between' }}>
                                                            <span>Row #{r.rowNumber}: {r.raw.title || 'Untitled'}</span>
                                                            <span style={{ color: '#DC2626', fontWeight: 700 }}>{r.errors[0]}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Commit Button */}
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleCommitBatchImport}
                                        disabled={importPreview.imported === 0 || isCommitting}
                                        style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 800, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        <Check size={18} />
                                        <span>
                                            {isCommitting ? 'Importing...' : `Import ${importPreview.imported} Valid Products`}
                                        </span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
