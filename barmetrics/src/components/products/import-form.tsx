'use client';

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { LIQUOR_CATEGORIES } from '@/lib/calculations';
import type { DuplicateHandling } from '@/lib/validations';

interface ImportFormProps {
  onSuccess: () => void;
}

interface ParsedRow {
  rowNumber: number;
  brand?: string;
  productName?: string;
  category?: string;
  abvPercent?: number | string;
  nominalVolumeMl?: number | string;
  defaultTareG?: number | string | null;
  errors: string[];
}

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

function validateRow(row: ParsedRow): string[] {
  const errors: string[] = [];

  if (!row.brand || String(row.brand).trim() === '') {
    errors.push('Brand is required');
  }

  if (!row.productName || String(row.productName).trim() === '') {
    errors.push('Product name is required');
  }

  const category = String(row.category || '').toUpperCase();
  if (!category || !LIQUOR_CATEGORIES.includes(category as typeof LIQUOR_CATEGORIES[number])) {
    errors.push(`Invalid category: ${row.category || 'empty'}`);
  }

  const abv = parseFloat(String(row.abvPercent));
  if (isNaN(abv) || abv < 0 || abv > 100) {
    errors.push('ABV must be between 0 and 100');
  }

  const volume = parseInt(String(row.nominalVolumeMl), 10);
  if (isNaN(volume) || volume < 1 || volume > 5000) {
    errors.push('Volume must be between 1 and 5000 ml');
  }

  if (row.defaultTareG !== null && row.defaultTareG !== undefined && row.defaultTareG !== '') {
    const tare = parseFloat(String(row.defaultTareG));
    if (isNaN(tare) || tare < 0 || tare > 2000) {
      errors.push('Tare weight must be between 0 and 2000 g');
    }
  }

  return errors;
}

export function ImportForm({ onSuccess }: ImportFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [duplicateHandling, setDuplicateHandling] = useState<DuplicateHandling>('skip');
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const parseExcelFile = useCallback(async (selectedFile: File) => {
    setParseError(null);
    setImportResult(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

      if (rawData.length === 0) {
        setParseError('Excel file is empty or has no data rows');
        setParsedData([]);
        return;
      }

      const rows: ParsedRow[] = rawData.map((row, index) => {
        const rowRecord = row as Record<string, unknown>;
        const mappedRow: ParsedRow = {
          rowNumber: index + 2, // +2 for 1-indexing and header row
          errors: [],
        };

        for (const [originalKey, value] of Object.entries(rowRecord)) {
          const mappedKey = normalizeColumnName(originalKey);
          if (mappedKey) {
            // Use type-safe assignment based on the key
            switch (mappedKey) {
              case 'brand':
                mappedRow.brand = value as string;
                break;
              case 'productName':
                mappedRow.productName = value as string;
                break;
              case 'category':
                mappedRow.category = value as string;
                break;
              case 'abvPercent':
                mappedRow.abvPercent = value as number | string;
                break;
              case 'nominalVolumeMl':
                mappedRow.nominalVolumeMl = value as number | string;
                break;
              case 'defaultTareG':
                mappedRow.defaultTareG = value as number | string | null;
                break;
            }
          }
        }

        mappedRow.errors = validateRow(mappedRow);
        return mappedRow;
      });

      setParsedData(rows);
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setParseError('Failed to parse Excel file. Please ensure it is a valid .xlsx file.');
      setParsedData([]);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setParsedData([]);
    setImportResult(null);
    setParseError(null);
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('duplicateHandling', duplicateHandling);

      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      });

      const result: ImportResult = await response.json();
      setImportResult(result);

      if (result.success && result.imported > 0) {
        // Delay redirect to show success message
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        updated: 0,
        errors: [{ row: 0, message: 'Failed to import products. Please try again.' }],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validRows = parsedData.filter((row) => row.errors.length === 0);
  const invalidRows = parsedData.filter((row) => row.errors.length > 0);
  const hasValidationErrors = invalidRows.length > 0;

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="file">Excel File</Label>
        {!file ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">Click to upload Excel file</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .xlsx and .xls files
              </p>
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {parsedData.length} rows found
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {parseError && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <p>{parseError}</p>
        </div>
      )}

      {/* Preview Table */}
      {parsedData.length > 0 && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preview</Label>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {validRows.length} valid
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {invalidRows.length} with errors
                  </Badge>
                )}
              </div>
            </div>

            <div className="border rounded-lg max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">ABV %</TableHead>
                    <TableHead className="text-right">Volume (ml)</TableHead>
                    <TableHead className="text-right">Tare (g)</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 50).map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={row.errors.length > 0 ? 'bg-red-50' : ''}
                    >
                      <TableCell className="font-mono text-xs">
                        {row.rowNumber}
                      </TableCell>
                      <TableCell>{row.brand || '-'}</TableCell>
                      <TableCell>{row.productName || '-'}</TableCell>
                      <TableCell>
                        <span className={!row.category || !LIQUOR_CATEGORIES.includes(String(row.category).toUpperCase() as typeof LIQUOR_CATEGORIES[number]) ? 'text-red-600' : ''}>
                          {row.category || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{row.abvPercent ?? '-'}</TableCell>
                      <TableCell className="text-right">{row.nominalVolumeMl ?? '-'}</TableCell>
                      <TableCell className="text-right">{row.defaultTareG ?? '-'}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs" title={row.errors.join(', ')}>
                              {row.errors.length} error{row.errors.length > 1 ? 's' : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs">Valid</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedData.length > 50 && (
                <div className="p-2 text-center text-sm text-muted-foreground border-t">
                  Showing first 50 of {parsedData.length} rows
                </div>
              )}
            </div>
          </div>

          {/* Validation Errors Summary */}
          {invalidRows.length > 0 && (
            <div className="space-y-2">
              <Label className="text-red-600">Validation Errors</Label>
              <div className="border border-red-200 rounded-lg p-4 bg-red-50 max-h-[200px] overflow-auto">
                <ul className="space-y-1 text-sm">
                  {invalidRows.slice(0, 20).map((row) => (
                    <li key={row.rowNumber} className="text-red-700">
                      <span className="font-medium">Row {row.rowNumber}:</span>{' '}
                      {row.errors.join('; ')}
                    </li>
                  ))}
                  {invalidRows.length > 20 && (
                    <li className="text-red-600 font-medium">
                      ... and {invalidRows.length - 20} more errors
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Import Options */}
          <div className="space-y-2">
            <Label htmlFor="duplicateHandling">Duplicate Handling</Label>
            <Select
              value={duplicateHandling}
              onValueChange={(value) => setDuplicateHandling(value as DuplicateHandling)}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Skip duplicates</SelectItem>
                <SelectItem value="update">Update existing products</SelectItem>
                <SelectItem value="error">Report duplicates as errors</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Products are considered duplicates if they have the same brand and product name.
            </p>
          </div>
        </>
      )}

      {/* Import Result */}
      {importResult && (
        <div
          className={`p-4 rounded-lg ${
            importResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-yellow-50 border border-yellow-200'
          }`}
        >
          {importResult.success ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="font-medium">Import successful!</p>
                <p className="text-sm">
                  Imported {importResult.imported} products
                  {importResult.skipped > 0 && `, skipped ${importResult.skipped} duplicates`}
                  {importResult.updated > 0 && `, updated ${importResult.updated} existing`}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-yellow-700 mb-2">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Import completed with issues</p>
              </div>
              <p className="text-sm text-yellow-700 mb-2">
                Imported {importResult.imported}, skipped {importResult.skipped}, errors: {importResult.errors.length}
              </p>
              {importResult.errors.length > 0 && (
                <ul className="text-sm text-yellow-800 space-y-1">
                  {importResult.errors.slice(0, 5).map((error, index) => (
                    <li key={index}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>... and {importResult.errors.length - 5} more errors</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading Progress */}
      {isLoading && (
        <div className="space-y-2">
          <Progress value={undefined} className="w-full" />
          <p className="text-sm text-center text-muted-foreground">
            Importing products...
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleClearFile}
          disabled={isLoading || !file}
        >
          Clear
        </Button>
        <Button
          onClick={handleImport}
          disabled={isLoading || !file || validRows.length === 0 || hasValidationErrors}
        >
          {isLoading ? 'Importing...' : `Import ${validRows.length} Products`}
        </Button>
      </div>
    </div>
  );
}
