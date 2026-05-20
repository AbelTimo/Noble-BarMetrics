'use client';

import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Share2, Printer, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface StockProduct {
  productId: string;
  brand: string;
  productName: string;
  category: string;
  openingMl: number;
  closingMl: number;
  depletionMl: number;
}

interface DailyReport {
  date: string;
  generatedAt: string;
  sessions: {
    total: number;
    opening: { id: string; name: string | null; time: string; bottlesCounted: number } | null;
    closing: { id: string; name: string | null; time: string; bottlesCounted: number } | null;
  };
  stock: {
    totalOpeningMl: number;
    totalClosingMl: number;
    totalDepletionMl: number;
    products: StockProduct[];
  };
  sales: {
    totalItems: number;
    items: { type: string; name: string; quantity: number; shift: string | null }[];
  };
}

export default function DailyReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-report?date=${date}`);
      if (!res.ok) throw new Error('Failed');
      setReport(await res.json());
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!report) return;

    const text = generateTextReport(report);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `BarMetrics Daily Report - ${report.date}`,
          text,
        });
      } catch {
        // User cancelled or share failed, copy to clipboard instead
        await navigator.clipboard.writeText(text);
        toast.success('Report copied to clipboard');
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Report copied to clipboard - paste into WhatsApp or email');
    }
  };

  const generateTextReport = (r: DailyReport): string => {
    const lines: string[] = [];
    lines.push(`BARMETRICS DAILY REPORT`);
    lines.push(`Date: ${new Date(r.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
    lines.push(`Generated: ${new Date(r.generatedAt).toLocaleTimeString()}`);
    lines.push('');
    lines.push(`--- INVENTORY SUMMARY ---`);
    lines.push(`Opening Stock: ${r.stock.totalOpeningMl.toLocaleString()} ml`);
    lines.push(`Closing Stock: ${r.stock.totalClosingMl.toLocaleString()} ml`);
    lines.push(`Total Depletion: ${r.stock.totalDepletionMl.toLocaleString()} ml`);
    lines.push('');

    if (r.stock.products.length > 0) {
      lines.push(`--- TOP DEPLETIONS ---`);
      for (const p of r.stock.products.slice(0, 10)) {
        lines.push(`${p.brand} ${p.productName}: ${p.depletionMl > 0 ? '-' : '+'}${Math.abs(p.depletionMl)} ml`);
      }
      lines.push('');
    }

    if (r.sales.items.length > 0) {
      lines.push(`--- SALES (${r.sales.totalItems} items) ---`);
      for (const item of r.sales.items) {
        lines.push(`${item.quantity}x ${item.name} (${item.type}${item.shift ? ', ' + item.shift : ''})`);
      }
      lines.push('');
    }

    lines.push(`Sessions: ${r.sessions.total}`);
    if (r.sessions.opening) lines.push(`Opening: ${r.sessions.opening.bottlesCounted} bottles counted`);
    if (r.sessions.closing) lines.push(`Closing: ${r.sessions.closing.bottlesCounted} bottles counted`);

    return lines.join('\n');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.15em] uppercase text-foreground">Daily Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate shareable daily inventory reports</p>
        </div>
        {report && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="border-border text-muted-foreground">
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="border-border text-muted-foreground">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        )}
      </div>

      {/* Date Picker & Generate */}
      <Card className="p-4 bg-card/40 border-border mb-6 flex flex-col sm:flex-row items-end gap-4">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground font-medium block mb-1">
            <Calendar className="h-3 w-3 inline mr-1" />
            Report Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
          />
        </div>
        <Button onClick={generateReport} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
          Generate Report
        </Button>
      </Card>

      {/* Report Content */}
      {report && (
        <div ref={reportRef} className="print:bg-card print:text-black space-y-6">
          {/* Report Header */}
          <Card className="p-6 bg-card/40 border-border print:border print:border-border">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold tracking-[0.2em] uppercase text-foreground">BarMetrics Daily Report</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(report.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-card/30 border border-border">
                <div className="text-xs text-muted-foreground uppercase">Opening</div>
                <div className="text-xl font-mono font-bold text-foreground">{report.stock.totalOpeningMl.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">ml</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-card/30 border border-border">
                <div className="text-xs text-muted-foreground uppercase">Closing</div>
                <div className="text-xl font-mono font-bold text-foreground">{report.stock.totalClosingMl.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">ml</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="text-xs text-destructive/70 uppercase">Depletion</div>
                <div className="text-xl font-mono font-bold text-destructive">{report.stock.totalDepletionMl.toLocaleString()}</div>
                <div className="text-xs text-destructive/70">ml</div>
              </div>
            </div>
          </Card>

          {/* Sessions Info */}
          <Card className="p-6 bg-card/40 border-border print:border print:border-border">
            <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-3">Sessions ({report.sessions.total})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {report.sessions.opening && (
                <div className="p-3 rounded-lg bg-card/30 border border-border">
                  <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px] mb-1">OPENING</Badge>
                  <div className="text-sm font-medium text-foreground">{report.sessions.opening.name || 'Session'}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(report.sessions.opening.time).toLocaleTimeString()} - {report.sessions.opening.bottlesCounted} bottles
                  </div>
                </div>
              )}
              {report.sessions.closing && (
                <div className="p-3 rounded-lg bg-card/30 border border-border">
                  <Badge className="bg-primary/10 text-primary text-[10px] mb-1">CLOSING</Badge>
                  <div className="text-sm font-medium text-foreground">{report.sessions.closing.name || 'Session'}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(report.sessions.closing.time).toLocaleTimeString()} - {report.sessions.closing.bottlesCounted} bottles
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Stock Details */}
          {report.stock.products.length > 0 && (
            <Card className="p-6 bg-card/40 border-border print:border print:border-border">
              <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-3">Stock Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Product</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Opening</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Closing</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Depletion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.stock.products.map((p) => (
                      <tr key={p.productId} className="border-b border-border">
                        <td className="py-1.5">
                          <span className="font-medium text-foreground">{p.brand}</span>{' '}
                          <span className="text-muted-foreground">{p.productName}</span>
                        </td>
                        <td className="py-1.5 text-right font-mono text-muted-foreground">{p.openingMl} ml</td>
                        <td className="py-1.5 text-right font-mono text-muted-foreground">{p.closingMl} ml</td>
                        <td className={`py-1.5 text-right font-mono font-bold ${p.depletionMl > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                          {p.depletionMl > 0 ? '-' : '+'}{Math.abs(p.depletionMl)} ml
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Sales */}
          {report.sales.items.length > 0 && (
            <Card className="p-6 bg-card/40 border-border print:border print:border-border">
              <h3 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-3">
                Sales ({report.sales.totalItems} items)
              </h3>
              <div className="space-y-1.5">
                {report.sales.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        {item.type}
                      </Badge>
                      <span className="text-foreground">{item.name}</span>
                      {item.shift && (
                        <span className="text-[10px] text-muted-foreground">({item.shift})</span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-foreground">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* No Data */}
          {report.sessions.total === 0 && report.sales.items.length === 0 && (
            <Card className="p-12 text-center bg-card/30 border-border">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">No data for this date</h3>
              <p className="text-sm text-muted-foreground">No inventory sessions or sales were recorded on this date.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
