'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
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

interface PreviewRow {
  date: string;
  shift: string;
  type: string;
  item: string;
  quantity: string;
}

interface ImportError {
  row: number;
  message: string;
}

interface ImportResult {
  success: boolean;
  importedSales: number;
  importedItems: number;
  errors: ImportError[];
  error?: string;
}

// Header aliases — must stay in sync with the API route's COLUMN_MAP.
const HEADER_ALIASES: Record<string, keyof PreviewRow> = {
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
};

export function SalesImportForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (selected: File) => {
    setParseError(null);
    setResult(null);
    try {
      const buf = await selected.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames.find((n) => /^sales$/i.test(n)) || wb.SheetNames[0];
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null }) as Array<
        Record<string, unknown>
      >;
      if (raw.length === 0) {
        setParseError('That file has no data rows.');
        setRows([]);
        return;
      }
      const parsed: PreviewRow[] = raw.map((r) => {
        const out: PreviewRow = { date: '', shift: '', type: '', item: '', quantity: '' };
        for (const [k, v] of Object.entries(r)) {
          const key = HEADER_ALIASES[k.toLowerCase().trim()];
          if (!key) continue;
          out[key] =
            v instanceof Date ? v.toLocaleDateString() : v == null ? '' : String(v);
        }
        return out;
      });
      setRows(parsed);
    } catch {
      setParseError('Could not read that file. Use a .csv, .xlsx or .xls export.');
      setRows([]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      parseFile(f);
    }
  };

  const handleClear = () => {
    setFile(null);
    setRows([]);
    setResult(null);
    setParseError(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/sales/import', { method: 'POST', body: fd });
      const data: ImportResult = await res.json();
      setResult(data);
      if (data.success && data.importedSales > 0) {
        setTimeout(() => router.push('/sales'), 2000);
      }
    } catch {
      setResult({
        success: false,
        importedSales: 0,
        importedItems: 0,
        errors: [{ row: 0, message: 'Network error — please try again.' }],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template download */}
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
        <FileSpreadsheet className="mt-0.5 h-5 w-5 text-primary" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium">Need a starting point?</p>
          <p className="text-xs text-muted-foreground">
            Download the template, copy your POS export into the Sales sheet
            (Date, Shift, Type, Item, Quantity), then upload it here.
          </p>
          <div className="flex gap-2 pt-1">
            <Button asChild variant="outline" size="sm">
              <a href="/templates/sales-import-template.xlsx" download>
                Download .xlsx template
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href="/templates/sales-import-template.csv" download>
                .csv version
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Upload */}
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="sr-only"
          />
          <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-sm font-medium">Click to upload a sales file</p>
          <p className="mt-1 text-xs text-muted-foreground">Supports .csv, .xlsx and .xls</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-4">
          <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{rows.length} rows found</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {parseError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{parseError}</p>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Preview</p>
          <div className="max-h-[400px] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 50).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{i + 2}</TableCell>
                    <TableCell>{r.date || '-'}</TableCell>
                    <TableCell>{r.shift || '-'}</TableCell>
                    <TableCell>{r.type || '-'}</TableCell>
                    <TableCell>{r.item || '-'}</TableCell>
                    <TableCell className="text-right">{r.quantity || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 50 && (
              <div className="border-t p-2 text-center text-sm text-muted-foreground">
                Showing first 50 of {rows.length} rows
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div
          className={`rounded-lg p-4 ${
            result.success
              ? 'border border-emerald-500/30 bg-emerald-500/10'
              : 'border border-amber-500/30 bg-amber-500/10'
          }`}
        >
          {result.success ? (
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              <div>
                <p className="font-medium">Import successful!</p>
                <p className="text-sm">
                  Created {result.importedSales} sale{result.importedSales === 1 ? '' : 's'} with{' '}
                  {result.importedItems} item{result.importedItems === 1 ? '' : 's'}. Redirecting…
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center gap-2 text-amber-500">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">
                  {result.error ?? 'Import failed — nothing was saved'}
                </p>
              </div>
              {result.errors?.length > 0 && (
                <ul className="space-y-1 text-sm text-amber-500">
                  {result.errors.slice(0, 12).map((e, i) => (
                    <li key={i}>
                      {e.row > 0 ? `Row ${e.row}: ` : ''}
                      {e.message}
                    </li>
                  ))}
                  {result.errors.length > 12 && (
                    <li>… and {result.errors.length - 12} more</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Progress value={undefined} className="w-full" />
          <p className="text-center text-sm text-muted-foreground">Importing sales…</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleClear} disabled={isLoading || !file}>
          Clear
        </Button>
        <Button onClick={handleImport} disabled={isLoading || !file || rows.length === 0}>
          {isLoading ? 'Importing…' : `Import ${rows.length} rows`}
        </Button>
      </div>
    </div>
  );
}
