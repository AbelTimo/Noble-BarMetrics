/**
 * Generate the sales-import Excel template at:
 *   barmetrics/public/templates/sales-import-template.xlsx
 *
 * 3-sheet workbook: Instructions / Sales (data) / Reference.
 * Reshape a POS export into the "Sales" sheet, then upload at /sales/import.
 *
 * Run: node scripts/generate-sales-template.cjs
 */
const path = require('path');
const fs = require('fs');
const XLSX = require(path.join(__dirname, '..', 'node_modules', 'xlsx'));

const OUT = path.join(__dirname, '..', 'public', 'templates', 'sales-import-template.xlsx');
const CSV_OUT = path.join(__dirname, '..', 'public', 'templates', 'sales-import-template.csv');

const SHIFTS = ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'];
const TYPES = ['COCKTAIL', 'SHOT', 'NEAT', 'BOTTLE'];

const COLUMNS = ['Date', 'Shift', 'Type', 'Item', 'Quantity', 'Notes'];

const EXAMPLES = [
  ['2026-05-22', 'EVENING', 'COCKTAIL', 'Cosmopolitan', 3, ''],
  ['2026-05-22', 'EVENING', 'SHOT', 'Jameson Whiskey', 6, ''],
  ['2026-05-22', 'NIGHT', 'BOTTLE', 'Absolute Vodka', 1, 'VIP table'],
];

const INSTRUCTIONS = [
  ['Melekyia — Sales Import Template'],
  [''],
  ['Fill in the "Sales" sheet, one row per sale line. Then upload the file at /sales/import.'],
  [''],
  ['Required columns: Date, Type, Item, Quantity'],
  ['Optional columns: Shift, Notes'],
  [''],
  ['How rows become sales:'],
  ['  • Rows with the same Date AND Shift are grouped into one sale with multiple items.'],
  ['  • Type COCKTAIL  → Item must match a recipe name (see your /recipes page).'],
  ['  • Type SHOT / NEAT / BOTTLE → Item must match a product name (brand, e.g. "Absolute Vodka").'],
  ['  • An item that matches nothing is reported as an error — the import makes no changes until every row is valid.'],
  [''],
  ['Hard rules:'],
  ['  • Date is required on every row (any clear date format, e.g. 2026-05-22).'],
  ['  • Type must be one of the values on the Reference sheet.'],
  ['  • Shift, when provided, must be one of the values on the Reference sheet.'],
  ['  • Quantity is a whole number of 1 or more.'],
  [''],
  ['Tip: export sales from your POS, then copy the columns into the "Sales" sheet.'],
  ['Note: importing the same file twice creates duplicate sales — import each export once.'],
];

function colWidths(rows) {
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

const instSheet = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
instSheet['!cols'] = [{ wch: 110 }];
XLSX.utils.book_append_sheet(wb, instSheet, 'Instructions');

const salesRows = [COLUMNS, ...EXAMPLES];
const salesSheet = XLSX.utils.aoa_to_sheet(salesRows);
salesSheet['!cols'] = colWidths(salesRows);
XLSX.utils.book_append_sheet(wb, salesSheet, 'Sales');

const refRows = [];
refRows.push(['Reference: valid values per column']);
refRows.push([]);
refRows.push(['Shift (optional — leave blank if you do not track shifts):']);
refRows.push(...SHIFTS.map((s) => ['  ' + s]));
refRows.push([]);
refRows.push(['Type (required — use exactly one of these):']);
refRows.push(...TYPES.map((t) => ['  ' + t]));
refRows.push([]);
refRows.push(['Item:']);
refRows.push(['  COCKTAIL → a recipe name from your /recipes page']);
refRows.push(['  SHOT / NEAT / BOTTLE → a product name from your /products page']);
refRows.push([]);
refRows.push(['Quantity: whole number, 1 or more']);
const refSheet = XLSX.utils.aoa_to_sheet(refRows);
refSheet['!cols'] = [{ wch: 110 }];
XLSX.utils.book_append_sheet(wb, refSheet, 'Reference');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
XLSX.writeFile(wb, OUT);
console.log('Wrote', OUT);

const csv =
  COLUMNS.join(',') +
  '\n' +
  EXAMPLES.map((row) =>
    row
      .map((c) => {
        const s = c == null ? '' : String(c);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(','),
  ).join('\n') +
  '\n';
fs.writeFileSync(CSV_OUT, csv);
console.log('Wrote', CSV_OUT);
