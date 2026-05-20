'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, AlertTriangle, DollarSign, BarChart3, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { VarianceSummary } from '@/lib/variance';

interface SessionOption {
  id: string;
  name: string | null;
  location: string | null;
  startedAt: string;
  completedAt: string | null;
}

export default function VariancePage() {
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [openingSessionId, setOpeningSessionId] = useState('');
  const [closingSessionId, setClosingSessionId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [variance, setVariance] = useState<VarianceSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => toast.error('Failed to load sessions'));
  }, []);

  const calculateVariance = async () => {
    if (!openingSessionId || !closingSessionId) {
      toast.error('Select both opening and closing sessions');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        openingSessionId,
        closingSessionId,
      });
      if (startDate) params.set('startDate', new Date(startDate + 'T00:00:00').toISOString());
      if (endDate) params.set('endDate', new Date(endDate + 'T23:59:59').toISOString());

      const res = await fetch(`/api/variance?${params}`);
      if (!res.ok) throw new Error('Failed');
      setVariance(await res.json());
    } catch {
      toast.error('Failed to calculate variance');
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (severity: string) => {
    const colors: Record<string, string> = {
      NORMAL: 'bg-emerald-500/10 text-emerald-500',
      WARNING: 'bg-amber-500/10 text-amber-500',
      CRITICAL: 'bg-destructive/10 text-destructive',
    };
    return colors[severity] || 'bg-muted text-foreground';
  };

  const formatSessionLabel = (s: SessionOption) => {
    const date = new Date(s.startedAt).toLocaleDateString();
    return `${s.name || 'Session'} - ${s.location || 'No location'} (${date})`;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-[0.15em] uppercase text-foreground">Variance Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">Compare theoretical vs actual liquor usage</p>
      </div>

      {/* Controls */}
      <Card className="p-6 bg-card/40 border-border mb-6">
        <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">Select Sessions & Date Range</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Opening Session *</label>
            <select
              value={openingSessionId}
              onChange={(e) => setOpeningSessionId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
            >
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{formatSessionLabel(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Closing Session *</label>
            <select
              value={closingSessionId}
              onChange={(e) => setClosingSessionId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
            >
              <option value="">Select session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{formatSessionLabel(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Sales From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-1">Sales To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
            />
          </div>
        </div>
        <Button
          onClick={calculateVariance}
          disabled={loading}
          className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
          Calculate Variance
        </Button>
      </Card>

      {variance && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-card/40 border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Theoretical Usage</div>
              <div className="text-2xl font-mono font-bold text-foreground">{variance.totalTheoreticalMl.toLocaleString()} ml</div>
            </Card>
            <Card className="p-4 bg-card/40 border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Actual Depletion</div>
              <div className="text-2xl font-mono font-bold text-foreground">{variance.totalActualMl.toLocaleString()} ml</div>
            </Card>
            <Card className={`p-4 border-border ${variance.totalVarianceMl > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                {variance.totalVarianceMl > 0 ? <TrendingUp className="h-3 w-3 text-destructive" /> : <TrendingDown className="h-3 w-3 text-emerald-500" />}
                Total Variance
              </div>
              <div className={`text-2xl font-mono font-bold ${variance.totalVarianceMl > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                {variance.totalVarianceMl > 0 ? '+' : ''}{variance.totalVarianceMl.toLocaleString()} ml
              </div>
              <div className={`text-sm font-mono ${variance.totalVarianceMl > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                {variance.totalVariancePercent > 0 ? '+' : ''}{variance.totalVariancePercent}%
              </div>
            </Card>
            <Card className="p-4 bg-card/40 border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Est. Cost Loss
              </div>
              <div className="text-2xl font-mono font-bold text-destructive">${variance.totalCostLoss.toFixed(2)}</div>
            </Card>
          </div>

          {/* By Category */}
          {variance.byCategory.length > 0 && (
            <Card className="p-6 bg-card/40 border-border mb-6">
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">Variance by Category</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground font-medium">Category</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Theoretical</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Actual</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Variance</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">%</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Cost Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variance.byCategory.map((cat) => (
                      <tr key={cat.category} className="border-b border-border">
                        <td className="py-2 font-medium text-foreground">{cat.category}</td>
                        <td className="py-2 text-right font-mono text-muted-foreground">{cat.theoreticalMl} ml</td>
                        <td className="py-2 text-right font-mono text-muted-foreground">{cat.actualMl} ml</td>
                        <td className={`py-2 text-right font-mono font-bold ${cat.varianceMl > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                          {cat.varianceMl > 0 ? '+' : ''}{cat.varianceMl} ml
                        </td>
                        <td className={`py-2 text-right font-mono ${cat.variancePercent > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                          {cat.variancePercent > 0 ? '+' : ''}{cat.variancePercent}%
                        </td>
                        <td className="py-2 text-right font-mono text-destructive">${cat.costLoss.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* By Shift */}
          {variance.byShift.length > 0 && (
            <Card className="p-6 bg-card/40 border-border mb-6">
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">Sales by Shift</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {variance.byShift.map((s) => (
                  <div key={s.shift} className="p-3 rounded-lg bg-card/30 border border-border text-center">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.shift}</div>
                    <div className="font-mono font-bold text-foreground">{s.theoreticalMl} ml</div>
                    <div className="text-xs text-muted-foreground">{s.itemsSold} items</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Product Variance Table */}
          <Card className="p-6 bg-card/40 border-border">
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">
              Product Variance
              {variance.products.filter((p) => p.severity === 'CRITICAL').length > 0 && (
                <Badge className="ml-2 bg-destructive/10 text-destructive text-[10px]">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {variance.products.filter((p) => p.severity === 'CRITICAL').length} critical
                </Badge>
              )}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Product</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Category</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Expected</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Actual</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Variance</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">%</th>
                    <th className="text-center py-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {variance.products.map((p) => (
                    <tr key={p.productId} className="border-b border-border hover:bg-card/30">
                      <td className="py-2">
                        <div className="font-medium text-foreground">{p.brand}</div>
                        <div className="text-xs text-muted-foreground">{p.productName}</div>
                      </td>
                      <td className="py-2 text-muted-foreground">{p.category}</td>
                      <td className="py-2 text-right font-mono text-muted-foreground">{p.theoreticalUsageMl} ml</td>
                      <td className="py-2 text-right font-mono text-muted-foreground">{p.actualDepletionMl} ml</td>
                      <td className={`py-2 text-right font-mono font-bold ${p.varianceMl > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                        {p.varianceMl > 0 ? '+' : ''}{p.varianceMl} ml
                      </td>
                      <td className={`py-2 text-right font-mono ${p.variancePercent > 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                        {p.variancePercent > 0 ? '+' : ''}{p.variancePercent}%
                      </td>
                      <td className="py-2 text-center">
                        <Badge className={`text-[10px] ${severityColor(p.severity)}`}>
                          {p.severity}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {variance.products.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No variance data. Ensure sessions have measurements and sales are recorded.
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
