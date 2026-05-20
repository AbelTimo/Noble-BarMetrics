import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { excelImportRowSchema, duplicateHandlingSchema, type DuplicateHandling } from '@/lib/validations';
import {
  getDensityForABV,
  computeSearchKey,
  normalizeForKey,
  deriveAgeStatement,
  isValidGtin,
  LIQUOR_SUBCLASSES,
  type LiquorClass,
} from '@/lib/calculations';
import { ZodError } from 'zod';

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  updated: number;
  /** Active SKUs created automatically for newly imported products. */
  autoCreatedSkus: number;
  errors: ImportError[];
  /** Per-row notes about auto-enrichment (tare/age/subClass pulled from the catalog). */
  notes?: string[];
}

// Column header mappings — case/space-insensitive. Anything not listed is ignored.
const COLUMN_MAPPINGS: Record<string, string> = {
  // Required
  'brand': 'brand',
  'product name': 'productName',
  'productname': 'productName',
  'product': 'productName',
  'name': 'productName',
  'category': 'category',
  'class': 'category',
  'type': 'category',
  'abv %': 'abvPercent',
  'abv%': 'abvPercent',
  'abv': 'abvPercent',
  'abv (percent)': 'abvPercent',
  'alcohol': 'abvPercent',
  'volume (ml)': 'nominalVolumeMl',
  'volume(ml)': 'nominalVolumeMl',
  'volume': 'nominalVolumeMl',
  'size': 'nominalVolumeMl',
  'size (ml)': 'nominalVolumeMl',
  'size(ml)': 'nominalVolumeMl',
  'bottle size': 'nominalVolumeMl',
  'bottle size (ml)': 'nominalVolumeMl',
  // Optional
  'sub-class': 'subClass',
  'subclass': 'subClass',
  'sub class': 'subClass',
  'sub category': 'subClass',
  'sub-category': 'subClass',
  'subcategory': 'subClass',
  'age': 'ageStatement',
  'age statement': 'ageStatement',
  'age (years)': 'ageStatement',
  'age years': 'ageStatement',
  'years': 'ageStatement',
  'tare weight (g)': 'defaultTareG',
  'tare weight(g)': 'defaultTareG',
  'tare weight': 'defaultTareG',
  'tare': 'defaultTareG',
  'tare (g)': 'defaultTareG',
  'empty weight': 'defaultTareG',
  'bottle weight': 'defaultTareG',
  'upc': 'upc',
  'gtin': 'upc',
  'barcode': 'upc',
};

function normalizeColumnName(header: string): string | undefined {
  const normalized = header.toLowerCase().trim();
  return COLUMN_MAPPINGS[normalized];
}

function parseExcelFile(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  // Prefer a sheet named "Stock" (the template's data sheet); fall back to first.
  const sheetName = workbook.SheetNames.find((n) => /^stock$/i.test(n)) || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
  if (rawData.length === 0) return [];

  return rawData.map((row) => {
    const mapped: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      const key = normalizeColumnName(k);
      if (key) mapped[key] = v;
    }
    return mapped;
  });
}

/**
 * Auto-derive missing fields by consulting the BottleWeightDatabase + heuristics.
 * Returns the enriched row and a list of human-readable notes about what was filled in.
 */
async function enrichRow(
  data: {
    brand: string;
    productName: string;
    category: string;
    subClass?: string | null;
    abvPercent: number;
    nominalVolumeMl: number;
    defaultTareG?: number | null;
    ageStatement?: number | null;
    upc?: string | null;
  },
  rowNumber: number,
): Promise<{
  data: typeof data & { searchKey: string };
  notes: string[];
  errors: ImportError[];
}> {
  const notes: string[] = [];
  const errors: ImportError[] = [];
  const next = { ...data };

  // Normalize UPC (digits-only) and validate check digit when provided.
  if (next.upc) {
    const digits = String(next.upc).replace(/\D/g, '');
    if (digits === '') {
      next.upc = null;
    } else if (!isValidGtin(digits)) {
      errors.push({
        row: rowNumber,
        field: 'upc',
        message: `Invalid UPC/GTIN check digit (${digits})`,
      });
      next.upc = null;
    } else {
      next.upc = digits;
    }
  } else {
    next.upc = null;
  }

  // Look up canonical bottle in the catalog (BottleWeightDatabase) by the same
  // composite key — pulls tare weight (and optionally ABV/sub-class hints).
  const sizeMl = next.nominalVolumeMl;
  const catalog = await prisma.bottleWeightDatabase.findFirst({
    where: { brand: next.brand, productName: next.productName, sizeMl },
  });

  if ((next.defaultTareG == null || Number.isNaN(next.defaultTareG)) && catalog?.tareWeightG != null) {
    next.defaultTareG = catalog.tareWeightG;
    notes.push(`row ${rowNumber}: auto-filled tare ${catalog.tareWeightG}g from catalog`);
  }

  if (!next.subClass && catalog?.subClass) {
    next.subClass = catalog.subClass;
    notes.push(`row ${rowNumber}: auto-filled sub-class ${catalog.subClass} from catalog`);
  }

  if ((next.ageStatement == null) && catalog?.ageStatement != null) {
    next.ageStatement = catalog.ageStatement;
    notes.push(`row ${rowNumber}: auto-filled age ${catalog.ageStatement}yr from catalog`);
  }

  // Heuristic age from the product name when still missing.
  if (next.ageStatement == null) {
    const derived = deriveAgeStatement(next.productName);
    if (derived != null) {
      next.ageStatement = derived;
      notes.push(`row ${rowNumber}: derived age ${derived}yr from product name`);
    }
  }

  // Validate sub-class is in the allowed set for the chosen class (silently drop otherwise).
  if (next.subClass) {
    const allowed = (LIQUOR_SUBCLASSES[next.category as LiquorClass] ?? []) as readonly string[];
    if (allowed.length && !allowed.includes(next.subClass)) {
      notes.push(`row ${rowNumber}: sub-class "${next.subClass}" not valid for ${next.category}, ignoring`);
      next.subClass = null;
    }
  }

  const searchKey = computeSearchKey(next.brand, next.productName, sizeMl);
  return { data: { ...next, searchKey }, notes, errors };
}

/** Slug a brand/name into a stable, readable SKU code suffix (TITO-S-HANDMADE-VODKA). */
function slugForCode(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '') // strip combining diacritical marks (NFKD residue)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const duplicateHandlingRaw = formData.get('duplicateHandling') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 },
      );
    }

    let duplicateHandling: DuplicateHandling = 'skip';
    if (duplicateHandlingRaw) {
      try {
        duplicateHandling = duplicateHandlingSchema.parse(duplicateHandlingRaw);
      } catch {
        return NextResponse.json(
          { error: 'Invalid duplicateHandling option. Must be "skip", "update", or "error"' },
          { status: 400 },
        );
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const rows = parseExcelFile(arrayBuffer);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty or has no valid data rows. Make sure your data is on the "Stock" sheet or the first sheet.' },
        { status: 400 },
      );
    }

    const errors: ImportError[] = [];
    const notes: string[] = [];
    const enriched: Array<{ row: number; data: Awaited<ReturnType<typeof enrichRow>>['data'] }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // 1-indexed + header row
      try {
        const validated = excelImportRowSchema.parse(rows[i]);
        const enrichResult = await enrichRow(validated, rowNumber);
        notes.push(...enrichResult.notes);
        if (enrichResult.errors.length) errors.push(...enrichResult.errors);
        else enriched.push({ row: rowNumber, data: enrichResult.data });
      } catch (error) {
        if (error instanceof ZodError) {
          for (const issue of error.issues) {
            errors.push({
              row: rowNumber,
              field: issue.path.join('.'),
              message: issue.message,
            });
          }
        } else {
          errors.push({ row: rowNumber, message: 'Unknown validation error' });
        }
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, imported: 0, skipped: 0, updated: 0, autoCreatedSkus: 0, errors, notes },
        { status: 400 },
      );
    }

    let imported = 0, skipped = 0, updated = 0, autoCreatedSkus = 0;
    const importErrors: ImportError[] = [];

    for (const { row: rowNumber, data } of enriched) {
      try {
        // Use searchKey as the dedup key — more robust than brand+name alone.
        const existing = await prisma.product.findFirst({
          where: { searchKey: data.searchKey },
        });

        if (existing) {
          switch (duplicateHandling) {
            case 'skip':
              skipped++;
              continue;
            case 'error':
              importErrors.push({
                row: rowNumber,
                message: `Duplicate product: ${data.brand} ${data.productName} ${data.nominalVolumeMl}ml already exists`,
              });
              continue;
            case 'update':
              await prisma.product.update({
                where: { id: existing.id },
                data: {
                  category: data.category,
                  subClass: data.subClass ?? null,
                  abvPercent: data.abvPercent,
                  nominalVolumeMl: data.nominalVolumeMl,
                  defaultDensity: getDensityForABV(data.abvPercent),
                  defaultTareG: data.defaultTareG ?? null,
                  ageStatement: data.ageStatement ?? null,
                  upc: data.upc ?? null,
                },
              });
              updated++;
              continue;
          }
        }

        const product = await prisma.product.create({
          data: {
            brand: data.brand,
            productName: data.productName,
            category: data.category,
            subClass: data.subClass ?? null,
            abvPercent: data.abvPercent,
            nominalVolumeMl: data.nominalVolumeMl,
            defaultDensity: getDensityForABV(data.abvPercent),
            defaultTareG: data.defaultTareG ?? null,
            ageStatement: data.ageStatement ?? null,
            upc: data.upc ?? null,
            searchKey: data.searchKey,
            isActive: true,
          },
        });
        imported++;

        // Auto-create a primary SKU so the product is immediately usable in /weigh.
        try {
          let code = `${slugForCode(data.brand)}-${slugForCode(data.productName)}-${data.nominalVolumeMl}ML`;
          for (let attempt = 0; attempt < 3; attempt++) {
            const dup = await prisma.sKU.findFirst({ where: { code } });
            if (!dup) break;
            code = `${code}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
          }
          const sku = await prisma.sKU.create({
            data: {
              code,
              name: `${data.brand} ${data.productName}`.trim(),
              category: data.category,
              sizeMl: data.nominalVolumeMl,
              unit: 'ml',
              isActive: true,
              bottleTareG: data.defaultTareG ?? null,
              densityGPerMl: getDensityForABV(data.abvPercent),
              abvPercent: data.abvPercent,
            },
          });
          await prisma.productSKU.create({
            data: { productId: product.id, skuId: sku.id, isPrimary: true },
          });
          autoCreatedSkus++;
        } catch (skuErr) {
          notes.push(`row ${rowNumber}: product created but SKU auto-link failed (${skuErr instanceof Error ? skuErr.message : 'unknown'})`);
        }
      } catch (error) {
        console.error(`Error importing row ${rowNumber}:`, error);
        const msg = error instanceof Error ? error.message : 'Failed to import product';
        if (msg.includes('P2002') || msg.toLowerCase().includes('unique constraint')) {
          if (duplicateHandling === 'skip') { skipped++; continue; }
          importErrors.push({
            row: rowNumber,
            message: 'Duplicate (same searchKey or UPC) — choose update to overwrite.',
          });
        } else {
          importErrors.push({ row: rowNumber, message: msg });
        }
      }
    }

    const result: ImportResult = {
      success: importErrors.length === 0,
      imported,
      skipped,
      updated,
      autoCreatedSkus,
      errors: importErrors,
      notes: notes.length ? notes : undefined,
    };

    return NextResponse.json(result, { status: importErrors.length > 0 ? 207 : 201 });
  } catch (error) {
    console.error('Error processing import:', error);
    return NextResponse.json({ error: 'Failed to process import file' }, { status: 500 });
  }
}
