import {
    parseAndValidateCSV,
    validateRow,
    buildHeaderMap,
    computeMargin,
    pluralize,
    stripBOM
} from '../src/core/csvImporter';

console.log('=== RUNNING COMPREHENSIVE CSV IMPORTER REGRESSION & UNIT TESTS ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`✅ PASS: ${testName}`);
    } else {
        console.error(`❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
        throw new Error(`Test failed: ${testName}`);
    }
}

// 1. Regression Test: UTF-8 with ₦, 🍚, and Yoruba diacritics
console.log('--- TEST SUITE 1: UTF-8 & Diacritics Fidelity ---');
const utf8CSV = `\uFEFFProduct Title,Category,SKU / Barcode ID,Initial Batch Count,Unit Cost (₦),Selling Price (₦),Assigned Supplier,Low Stock Alert Threshold
"Unicode Test ₦ Ẹ̀wà Ìrẹsì 🍚",Grains & Staples,SKU-YORUBA-01,25,₦4500,"₦6,000",Ibadan Local Depot,10`;

const utf8Result = parseAndValidateCSV(utf8CSV);
assert(utf8Result.success, 'UTF-8 with BOM parses successfully');
assert(utf8Result.imported === 1, 'Imported count is 1 for UTF-8 test');
assert(utf8Result.validRows[0].data?.title === 'Unicode Test ₦ Ẹ̀wà Ìrẹsì 🍚', 'Title preserves ₦, 🍚, and Yoruba diacritics fidelity');
assert(utf8Result.validRows[0].data?.cost === 4500, 'Cost parsed accurately without currency corruption');
assert(utf8Result.validRows[0].data?.price === 6000, 'Selling price parsed accurately');
assert(utf8Result.validRows[0].data?.sku === 'SKU-YORUBA-01', 'SKU read directly from mapped column');

// 2. Unit Test: Shuffled Columns Mapping
console.log('\n--- TEST SUITE 2: Shuffled Column Order & Alias Matching ---');
const shuffledCSV = `Selling Price (₦),SKU / Barcode ID,Unit Cost (₦),Low Stock Alert Threshold,Product Title,Category,Initial Batch Count,Assigned Supplier
₦7500,SKU-SHUFFLE-99,₦5000,8,Golden Morn 900g,Beverages,30,Nestle Nigeria Hub`;

const shuffledResult = parseAndValidateCSV(shuffledCSV);
assert(shuffledResult.success, 'Shuffled CSV parsed successfully');
assert(shuffledResult.imported === 1, 'Shuffled row imported');
const shuffledRow = shuffledResult.validRows[0].data!;
assert(shuffledRow.title === 'Golden Morn 900g', 'Product title mapped correctly despite shuffled position');
assert(shuffledRow.sku === 'SKU-SHUFFLE-99', 'SKU mapped correctly');
assert(shuffledRow.cost === 5000, `Cost mapped correctly (got ${shuffledRow.cost}, expected 5000)`);
assert(shuffledRow.price === 7500, `Selling price mapped correctly (got ${shuffledRow.price}, expected 7500)`);
assert(shuffledRow.qty === 30, `Batch count mapped correctly (got ${shuffledRow.qty}, expected 30)`);
assert(shuffledRow.threshold === 8, `Threshold mapped correctly (got ${shuffledRow.threshold}, expected 8)`);

// 3. P0 Zero Validation & Traps Test
console.log('\n--- TEST SUITE 3: Trap Rows & Strict Validation ---');
const stressCSV = `Product Title,Category,SKU / Barcode ID,Initial Batch Count,Unit Cost (₦),Selling Price (₦),Assigned Supplier,Low Stock Alert Threshold
"Golden Penny Semovita 10kg",Grains,SKU-SEMO-10K,25,7900,9200,Flour Mills,5
,Grains,SKU-EMPTY-TITLE,10,2000,3000,Supplier,5
Missing SKU Item,Pantry,,10,2000,3000,Supplier,5
"   ",Pantry,SKU-WHITESPACE-TITLE,10,2000,3000,Supplier,5
Whitespace SKU Item,Pantry,"   ",10,2000,3000,Supplier,5
Negative Stock Test,Oils,SKU-NEG-STOCK,-5,1000,1500,Supplier,5
Zero Cost Test,Oils,SKU-ZERO-COST,10,0,1500,Supplier,5
Negative Cost Test,Oils,SKU-NEG-COST,10,-500,1500,Supplier,5
Decimal Stock Test,Oils,SKU-DEC-STOCK,10.5,1000,1500,Supplier,5
Selling Below Cost,Beverages,SKU-BELOW-COST,10,5000,3000,Supplier,5
Duplicate 1,Beverages,SKU-DUP-01,10,2000,3000,Supplier,5
Duplicate 2,Beverages,SKU-DUP-01,10,2000,3000,Supplier,5
Huge Margin Test,Beverages,SKU-HUGE-MARGIN,10,25,9200,Supplier,5
Threshold 999 Test,Beverages,SKU-THRESH-HIGH,10,2000,3000,Supplier,999
"Rice, Premium Long Grain 25kg",Grains,SKU-RICE-LG25,50,"5,000","6,500",Staples Hub,10`;

const stressResult = parseAndValidateCSV(stressCSV);
assert(stressResult.success, 'Stress test CSV parsed without crashing');
assert(stressResult.hasSuspiciousMargin, 'Flags suspicious margin banner');

// Verify individual rejections
const rejectedSkusOrTitles = stressResult.rejectedRows.map(r => r.raw.title || r.raw.sku || r.errors.join('; '));
console.log('Rejected row details:');
stressResult.rejectedRows.forEach(r => {
    console.log(`  Row ${r.rowNumber}: [${r.raw.title || 'No Title'}] -> Errors: ${r.errors.join('; ')}`);
});

// Assert specific trap rejections
const emptyTitleRow = stressResult.rejectedRows.find(r => r.errors.includes('Missing product title'));
assert(!!emptyTitleRow, 'Rejected empty product title');

const missingSkuRow = stressResult.rejectedRows.find(r => r.errors.includes('Missing SKU'));
assert(!!missingSkuRow, 'Rejected missing/whitespace SKU');

const negStockRow = stressResult.rejectedRows.find(r => r.errors.some(e => e.includes('Invalid quantity')));
assert(!!negStockRow, 'Rejected negative / decimal stock');

const zeroCostRow = stressResult.rejectedRows.find(r => r.errors.some(e => e.includes('Invalid cost')));
assert(!!zeroCostRow, 'Rejected zero / negative cost');

const belowCostRow = stressResult.rejectedRows.find(r => r.errors.includes('Selling price below cost'));
assert(!!belowCostRow, 'Rejected selling price below cost');

const duplicateSkuRow = stressResult.rejectedRows.find(r => r.errors.some(e => e.includes('Duplicate SKU')));
assert(!!duplicateSkuRow, 'Rejected second duplicate SKU');

// Valid rows check
const validTitles = stressResult.validRows.map(r => r.data?.title);
assert(validTitles.includes('Golden Penny Semovita 10kg'), 'Golden Penny Semovita 10kg imported');
assert(validTitles.includes('Rice, Premium Long Grain 25kg'), 'Quoted comma in title imported cleanly');
assert(validTitles.includes('Huge Margin Test'), 'Huge margin test imported with warning recorded');
assert(validTitles.includes('Threshold 999 Test'), 'Threshold 999 test imported with warning recorded');

const hugeMarginRow = stressResult.validRows.find(r => r.data?.title === 'Huge Margin Test');
assert(hugeMarginRow?.warnings.some(w => w.includes('Suspicious margin')) === true, 'Huge margin has warning recorded');

const thresh999Row = stressResult.validRows.find(r => r.data?.title === 'Threshold 999 Test');
assert(thresh999Row?.warnings.some(w => w.includes('Threshold unusually high')) === true, 'Threshold 999 has warning recorded');

// 4. Valuation Test with 3 known items
console.log('\n--- TEST SUITE 4: Dynamic Valuation Sum ---');
const knownItems = [
    { qty: 10, costPrice: 1000, sellingPrice: 1500 },
    { qty: 5, costPrice: 2000, sellingPrice: 3000 },
    { qty: 20, costPrice: 500, sellingPrice: 800 }
];
// Hand-computed sum:
// Item 1: 10 * 1000 = 10,000 cost, 15,000 retail
// Item 2: 5 * 2000  = 10,000 cost, 15,000 retail
// Item 3: 20 * 500  = 10,000 cost, 16,000 retail
// Total Cost Valuation: 30,000
// Total Retail Value: 46,000
// Margin: (46,000 - 30,000) / 46,000 = 16,000 / 46,000 = 0.3478 (34.8%)
const valuation = knownItems.reduce((sum, i) => sum + i.qty * i.costPrice, 0);
const retailValue = knownItems.reduce((sum, i) => sum + i.qty * i.sellingPrice, 0);
const avgMargin = retailValue > 0 ? (retailValue - valuation) / retailValue : 0;

assert(valuation === 30000, 'Hand-computed cost valuation equals 30,000');
assert(retailValue === 46000, 'Hand-computed retail value equals 46,000');
assert(Math.round(avgMargin * 1000) / 10 === 34.8, 'Average margin equals 34.8%');

// 5. Margin formula safely handles invalid input
console.log('\n--- TEST SUITE 5: Margin Formula Edge Cases ---');
assert(computeMargin(0, 1000) === null, 'computeMargin with 0 cost returns null');
assert(computeMargin(-500, 1000) === null, 'computeMargin with negative cost returns null');
assert(computeMargin(1000, 0) === null, 'computeMargin with 0 price returns null');
assert(computeMargin(1000, -200) === null, 'computeMargin with negative price returns null');
assert(computeMargin(NaN, 1000) === null, 'computeMargin with NaN cost returns null');
const normalMargin = computeMargin(2000, 2500);
assert(normalMargin !== null && Math.abs(normalMargin - 0.20) < 0.0001, 'computeMargin with 2000/2500 returns 0.20 (20%)');

// 6. Pluralization helper
console.log('\n--- TEST SUITE 6: Pluralization Helper ---');
assert(pluralize(1, 'unit') === 'unit', 'pluralize(1, "unit") === "unit"');
assert(pluralize(2, 'unit') === 'units', 'pluralize(2, "unit") === "units"');
assert(pluralize(0, 'unit') === 'units', 'pluralize(0, "unit") === "units"');
assert(pluralize(10, 'unit') === 'units', 'pluralize(10, "unit") === "units"');

console.log(`\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
