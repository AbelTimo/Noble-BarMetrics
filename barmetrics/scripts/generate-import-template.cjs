/**
 * Generate the stock-import Excel template at:
 *   barmetrics/public/templates/stock-import-template.xlsx
 *
 * The template is a 3-sheet workbook:
 *   1) Instructions  — how to fill it in
 *   2) Stock         — header row + 3 example rows (the data sheet)
 *   3) Reference     — valid enums (classes, sub-classes, sizes)
 *
 * Run: node scripts/generate-import-template.cjs
 */
const path = require('path');
const fs = require('fs');
const XLSX = require(path.join(__dirname, '..', 'node_modules', 'xlsx'));

const OUT = path.join(__dirname, '..', 'public', 'templates', 'stock-import-template.xlsx');
const CSV_OUT = path.join(__dirname, '..', 'public', 'templates', 'stock-import-template.csv');

// Mirror src/lib/calculations.ts (kept here to avoid TS compilation in a script).
const STANDARD_BOTTLE_SIZES = [50, 100, 187, 200, 250, 350, 375, 500, 700, 720, 750, 1000, 1500, 1750, 3000];

const LIQUOR_CLASSES = ['VODKA','GIN','RUM','TEQUILA','MEZCAL','WHISKEY','BRANDY','LIQUEUR','BITTERS','VERMOUTH','OTHER'];

const LIQUOR_SUBCLASSES = {
  VODKA:    [],
  GIN:      ['LONDON_DRY','PLYMOUTH','OLD_TOM','GENEVER','CONTEMPORARY'],
  RUM:      ['WHITE','GOLD','DARK','SPICED','OVERPROOF','AGED'],
  TEQUILA:  ['BLANCO','REPOSADO','ANEJO','EXTRA_ANEJO','CRISTALINO'],
  MEZCAL:   ['JOVEN','REPOSADO','ANEJO'],
  WHISKEY:  ['BOURBON','RYE','TENNESSEE','SCOTCH_SINGLE_MALT','SCOTCH_BLENDED','IRISH','CANADIAN','JAPANESE','AMERICAN'],
  BRANDY:   ['COGNAC','ARMAGNAC','CALVADOS','PISCO','AMERICAN'],
  LIQUEUR:  ['CREAM','COFFEE','HERBAL','FRUIT','NUT','CHOCOLATE','TRIPLE_SEC','AMARO'],
  BITTERS:  [],
  VERMOUTH: ['DRY','SWEET','BLANC'],
  OTHER:    [],
};

const COLUMNS = [
  'Brand',
  'Product Name',
  'Class',
  'Sub-class',
  'Size (ml)',
  'ABV %',
  'Age (years)',
  'Tare weight (g)',
  'UPC',
];

// UPC column is illustrative — left blank so the template imports cleanly
// without users having to compute GS1 check digits for placeholder values.
const EXAMPLES = [
  ["Tito's", 'Handmade Vodka', 'VODKA', '', 750, 40,   '', 480, ''],
  ['Glenlivet', '12 Year',     'WHISKEY', 'SCOTCH_SINGLE_MALT', 750, 40, 12, '', ''],
  ['Patrón',   'Silver',       'TEQUILA', 'BLANCO',             750, 40, '', 610, ''],
];

const INSTRUCTIONS = [
  ['BarMetrics — Stock Import Template'],
  [''],
  ['Fill in the "Stock" sheet, one row per (brand × product × size). Then upload the file at /products/import.'],
  [''],
  ['Required columns: Brand, Product Name, Class, Size (ml), ABV %'],
  ['Optional columns: Sub-class, Age (years), Tare weight (g), UPC'],
  [''],
  ['What the app does automatically when you upload:'],
  ['  • Normalizes names (smart quotes, extra spaces, etc.)'],
  ['  • If you leave Tare weight blank, it looks up the bottle in our 116-item catalog and fills it.'],
  ['  • If you leave Age blank, it derives one from the name when possible ("12 Year"→12, VS→2, VSOP→4, XO→10).'],
  ['  • If you leave Sub-class blank, it derives one from the name where unambiguous (e.g. "Bourbon"→BOURBON, "Single Malt"→SCOTCH_SINGLE_MALT).'],
  ['  • Computes a normalized search key from brand+name+size — duplicates are rejected at the database (no double rows).'],
  ['  • Creates one active SKU per imported product (you can use it on /weigh immediately).'],
  [''],
  ['Hard rules:'],
  ['  • Size (ml) must be a TTB Standard of Fill — see the Reference sheet.'],
  ['  • Class must be one of the values in the Reference sheet (free-form classes are rejected).'],
  ['  • ABV % is a number from 0 to 95.'],
  ['  • UPC, when provided, must be 12 or 13 digits with a valid GS1 check digit.'],
  [''],
  ['Duplicate handling: when you upload, you can pick:'],
  ['  • Skip      — keep existing row, skip the upload row (default).'],
  ['  • Update    — overwrite the existing row with your values.'],
  ['  • Error     — fail the import on the first duplicate.'],
  [''],
  ['See docs/PRODUCT-NAMING-STANDARD.md in the repo for the full spec.'],
];

function colWidths(rows) {
  // Auto-size columns: max(content length) + small padding, capped to 40.
  const widths = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = cell == null ? 0 : String(cell).length;
      widths[i] = Math.max(widths[i] || 8, Math.min(len + 2, 40));
    });
  }
  return widths.map((w) => ({ wch: w }));
}

const wb = XLSX.utils.book_new();

// Instructions
const instSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
instSheet['!cols'] = [{ wch: 110 }];
XLSX.utils.book_append_sheet(wb, instSheet, 'Instructions');

// Stock
const stockRows = [COLUMNS, ...EXAMPLES];
const stockSheet = XLSX.utils.aoa_to_sheet(stockRows);
stockSheet['!cols'] = colWidths(stockRows);
XLSX.utils.book_append_sheet(wb, stockSheet, 'Stock');

// Reference
const refRows = [];
refRows.push(['Reference: valid values per column']);
refRows.push([]);
refRows.push(['Class (use exactly one of these in the Class column):']);
refRows.push(...LIQUOR_CLASSES.map((c) => ['  ' + c]));
refRows.push([]);
refRows.push(['Sub-classes by class (optional — leave blank if none apply):']);
for (const cls of LIQUOR_CLASSES) {
  const subs = LIQUOR_SUBCLASSES[cls];
  refRows.push(['  ' + cls + (subs.length ? ': ' + subs.join(', ') : ': (none)')]);
}
refRows.push([]);
refRows.push(['Size (ml) — TTB Standards of Fill (27 CFR §5.203):']);
refRows.push(['  ' + STANDARD_BOTTLE_SIZES.join(', ')]);
refRows.push([]);
refRows.push(['ABV %:     0 to 95']);
refRows.push(['Age:       whole years (e.g. 12)']);
refRows.push(['Tare (g):  empty-bottle weight in grams']);
refRows.push(['UPC:       12 or 13 digits, GS1 check digit validated on import']);
const refSheet = XLSX.utils.aoa_to_sheet(refRows);
refSheet['!cols'] = [{ wch: 110 }];
XLSX.utils.book_append_sheet(wb, refSheet, 'Reference');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
XLSX.writeFile(wb, OUT);
console.log('Wrote', OUT);

// CSV mirror for users who prefer plain text.
const csv =
  COLUMNS.join(',') + '\n' +
  EXAMPLES.map((row) => row.map((c) => {
    const s = c == null ? '' : String(c);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n') + '\n';
fs.writeFileSync(CSV_OUT, csv);
console.log('Wrote', CSV_OUT);
