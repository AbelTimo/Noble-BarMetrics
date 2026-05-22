import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';
import { SALE_SHIFTS, SALE_ITEM_TYPES } from '@/lib/validations';

/**
 * Bulk sales import from a POS CSV/Excel export.
 *
 * Each row is one sale line: Date, Shift, Type, Item, Quantity, Notes.
 * Rows sharing a Date + Shift are grouped into a single Sale with many items.
 * `Item` is matched to a Recipe (Type COCKTAIL) or a Product (SHOT/NEAT/BOTTLE).
 */

interface ImportError {
  row: number;
  message: string;
}

// Case/space-insensitive header aliases. Anything else is ignored.
const COLUMN_MAP: Record<string, string> = {
  date: 'date',
  'sale date': 'date',
  shift: 'shift',
  type: 'type',
  'item type': 'type',
  item: 'item',
  'item name': 'item',
  name: 'item',
  product: 'item',
  recipe: 'item',
  cocktail: 'item',
  quantity: 'quantity',
  qty: 'quantity',
  count: 'quantity',
  notes: 'notes',
  note: 'notes',
};

function mapHeader(h: string): string | undefined {
  return COLUMN_MAP[h.toLowerCase().trim()];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/** Parse a cell that may be a JS Date (cellDates) or a string into a Date. */
function parseDate(v: unknown): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number') {
    // Excel serial date fallback (days since 1899-12-30).
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'string' && v.trim()) {
    const d = new Date(v.trim());
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission(request, PERMISSIONS.SALE_CREATE);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const fname = file.name.toLowerCase();
    if (!fname.endsWith('.xlsx') && !fname.endsWith('.xls') && !fname.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Invalid file type. Upload a .csv, .xlsx or .xls file.' },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = wb.SheetNames.find((n) => /^sales$/i.test(n)) || wb.SheetNames[0];
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null }) as Array<
      Record<string, unknown>
    >;

    if (raw.length === 0) {
      return NextResponse.json(
        { error: 'The file has no data rows. Put sales on the first sheet (or a "Sales" sheet).' },
        { status: 400 },
      );
    }

    // Map each raw row to our known columns.
    const rows = raw.map((r) => {
      const mapped: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        const key = mapHeader(k);
        if (key) mapped[key] = v;
      }
      return mapped;
    });

    // Lookup tables for matching.
    const [recipes, products] = await Promise.all([
      prisma.recipe.findMany({ select: { id: true, name: true } }),
      prisma.product.findMany({ select: { id: true, brand: true, productName: true } }),
    ]);
    const recipeByName = new Map<string, string>();
    for (const r of recipes) recipeByName.set(normalize(r.name), r.id);
    const productByName = new Map<string, string>();
    for (const p of products) {
      productByName.set(normalize(`${p.brand} ${p.productName}`), p.id);
      productByName.set(normalize(p.brand), p.id);
    }

    interface Line {
      type: string;
      recipeId: string | null;
      productId: string | null;
      quantity: number;
      notes: string | null;
    }
    const errors: ImportError[] = [];
    // Group by `${date}|${shift}` → accumulated Sale.
    const groups = new Map<string, { date: Date; shift: string | null; lines: Line[] }>();

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // header + 1-indexed
      const r = rows[i];

      const date = parseDate(r.date);
      if (!date) {
        errors.push({ row: rowNumber, message: 'Missing or invalid Date' });
        continue;
      }

      let shift: string | null = null;
      if (r.shift != null && String(r.shift).trim() !== '') {
        shift = String(r.shift).trim().toUpperCase();
        if (!(SALE_SHIFTS as readonly string[]).includes(shift)) {
          errors.push({ row: rowNumber, message: `Invalid Shift "${r.shift}" (use ${SALE_SHIFTS.join('/')})` });
          continue;
        }
      }

      const type = String(r.type ?? '').trim().toUpperCase();
      if (!(SALE_ITEM_TYPES as readonly string[]).includes(type)) {
        errors.push({ row: rowNumber, message: `Invalid Type "${r.type}" (use ${SALE_ITEM_TYPES.join('/')})` });
        continue;
      }

      const itemName = String(r.item ?? '').trim();
      if (!itemName) {
        errors.push({ row: rowNumber, message: 'Missing Item name' });
        continue;
      }

      const quantity = parseInt(String(r.quantity), 10);
      if (isNaN(quantity) || quantity < 1) {
        errors.push({ row: rowNumber, message: 'Quantity must be a whole number ≥ 1' });
        continue;
      }

      // Match the item: COCKTAIL → recipe, else → product.
      let recipeId: string | null = null;
      let productId: string | null = null;
      const norm = normalize(itemName);
      if (type === 'COCKTAIL') {
        recipeId = recipeByName.get(norm) ?? null;
        if (!recipeId) {
          errors.push({ row: rowNumber, message: `No recipe matches "${itemName}"` });
          continue;
        }
      } else {
        productId = productByName.get(norm) ?? null;
        if (!productId) {
          errors.push({ row: rowNumber, message: `No product matches "${itemName}"` });
          continue;
        }
      }

      const key = `${ymd(date)}|${shift ?? ''}`;
      if (!groups.has(key)) groups.set(key, { date, shift, lines: [] });
      groups.get(key)!.lines.push({
        type,
        recipeId,
        productId,
        quantity,
        notes: r.notes != null && String(r.notes).trim() !== '' ? String(r.notes).trim() : null,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, importedSales: 0, importedItems: 0, errors },
        { status: 400 },
      );
    }

    // Create one Sale per (date, shift) group.
    let importedSales = 0;
    let importedItems = 0;
    for (const g of groups.values()) {
      await prisma.sale.create({
        data: {
          date: g.date,
          shift: g.shift,
          source: 'CSV_IMPORT',
          items: { create: g.lines },
        },
      });
      importedSales++;
      importedItems += g.lines.length;
    }

    return NextResponse.json(
      { success: true, importedSales, importedItems, errors: [] },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error importing sales:', error);
    return NextResponse.json({ error: 'Failed to import sales file' }, { status: 500 });
  }
}
