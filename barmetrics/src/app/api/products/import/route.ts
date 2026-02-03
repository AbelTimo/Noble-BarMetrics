import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { excelImportRowSchema, duplicateHandlingSchema, type DuplicateHandling } from '@/lib/validations';
import { getDensityForABV } from '@/lib/calculations';
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
  errors: ImportError[];
}

// Column header mappings from Excel to our schema
const COLUMN_MAPPINGS: Record<string, string> = {
  'brand': 'brand',
  'product name': 'productName',
  'productname': 'productName',
  'product': 'productName',
  'name': 'productName',
  'category': 'category',
  'type': 'category',
  'abv %': 'abvPercent',
  'abv%': 'abvPercent',
  'abv': 'abvPercent',
  'alcohol': 'abvPercent',
  'volume (ml)': 'nominalVolumeMl',
  'volume(ml)': 'nominalVolumeMl',
  'volume': 'nominalVolumeMl',
  'size': 'nominalVolumeMl',
  'size (ml)': 'nominalVolumeMl',
  'bottle size': 'nominalVolumeMl',
  'tare weight (g)': 'defaultTareG',
  'tare weight(g)': 'defaultTareG',
  'tare weight': 'defaultTareG',
  'tare': 'defaultTareG',
  'empty weight': 'defaultTareG',
  'bottle weight': 'defaultTareG',
};

function normalizeColumnName(header: string): string | undefined {
  const normalized = header.toLowerCase().trim();
  return COLUMN_MAPPINGS[normalized];
}

function parseExcelFile(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Parse to JSON with headers
  const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

  if (rawData.length === 0) {
    return [];
  }

  // Map column names to our schema
  return rawData.map((row) => {
    const mappedRow: Record<string, unknown> = {};
    const rowRecord = row as Record<string, unknown>;

    for (const [originalKey, value] of Object.entries(rowRecord)) {
      const mappedKey = normalizeColumnName(originalKey);
      if (mappedKey) {
        mappedRow[mappedKey] = value;
      }
    }

    return mappedRow;
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const duplicateHandlingRaw = formData.get('duplicateHandling') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Parse duplicate handling option
    let duplicateHandling: DuplicateHandling = 'skip';
    if (duplicateHandlingRaw) {
      try {
        duplicateHandling = duplicateHandlingSchema.parse(duplicateHandlingRaw);
      } catch {
        return NextResponse.json(
          { error: 'Invalid duplicateHandling option. Must be "skip", "update", or "error"' },
          { status: 400 }
        );
      }
    }

    // Read and parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const rows = parseExcelFile(arrayBuffer);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Excel file is empty or has no valid data rows' },
        { status: 400 }
      );
    }

    // Validate each row and collect errors
    const errors: ImportError[] = [];
    const validatedRows: Array<{
      row: number;
      data: {
        brand: string;
        productName: string;
        category: string;
        abvPercent: number;
        nominalVolumeMl: number;
        defaultTareG?: number | null;
      };
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +2 because row 1 is headers, and we're 1-indexed
      const row = rows[i];

      try {
        const validated = excelImportRowSchema.parse(row);
        validatedRows.push({ row: rowNumber, data: validated });
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
          errors.push({
            row: rowNumber,
            message: 'Unknown validation error',
          });
        }
      }
    }

    // If there are validation errors, return them without importing
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        imported: 0,
        skipped: 0,
        updated: 0,
        errors,
      } satisfies ImportResult);
    }

    // Process imports with duplicate handling
    let imported = 0;
    let skipped = 0;
    let updated = 0;
    const importErrors: ImportError[] = [];

    for (const { row: rowNumber, data } of validatedRows) {
      try {
        // Check for existing product (same brand and product name)
        const existing = await prisma.product.findFirst({
          where: {
            brand: data.brand,
            productName: data.productName,
          },
        });

        if (existing) {
          switch (duplicateHandling) {
            case 'skip':
              skipped++;
              continue;
            case 'error':
              importErrors.push({
                row: rowNumber,
                message: `Duplicate product: ${data.brand} ${data.productName} already exists`,
              });
              continue;
            case 'update':
              await prisma.product.update({
                where: { id: existing.id },
                data: {
                  category: data.category,
                  abvPercent: data.abvPercent,
                  nominalVolumeMl: data.nominalVolumeMl,
                  defaultDensity: getDensityForABV(data.abvPercent),
                  defaultTareG: data.defaultTareG ?? null,
                },
              });
              updated++;
              continue;
          }
        }

        // Create new product
        await prisma.product.create({
          data: {
            brand: data.brand,
            productName: data.productName,
            category: data.category,
            abvPercent: data.abvPercent,
            nominalVolumeMl: data.nominalVolumeMl,
            defaultDensity: getDensityForABV(data.abvPercent),
            defaultTareG: data.defaultTareG ?? null,
            isActive: true,
          },
        });
        imported++;
      } catch (error) {
        console.error(`Error importing row ${rowNumber}:`, error);
        importErrors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : 'Failed to import product',
        });
      }
    }

    const result: ImportResult = {
      success: importErrors.length === 0,
      imported,
      skipped,
      updated,
      errors: importErrors,
    };

    return NextResponse.json(result, { status: importErrors.length > 0 ? 207 : 201 });
  } catch (error) {
    console.error('Error processing import:', error);
    return NextResponse.json(
      { error: 'Failed to process import file' },
      { status: 500 }
    );
  }
}
