'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Scale,
  MinusCircle,
  PackageX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ANOMALY_TYPES, AnomalyType, ANOMALY_INFO, AnomalySummary } from '@/lib/anomalies';

interface AnomalySummaryPanelProps {
  sessionId: string;
  className?: string;
}

interface AnomalySummaryResponse {
  sessionId: string;
  sessionName: string | null;
  mode: string;
  hasAnomalies: boolean;
  summary: AnomalySummary;
  measurementsWithAnomalies: Array<{
    id: string;
    productId: string;
    brand: string;
    productName: string;
    anomalyFlags: AnomalyType[];
    variancePercent: number | null;
    percentFull: number | null;
  }>;
  missingProducts: Array<{
    productId: string;
    brand: string;
    productName: string;
  }>;
}

const ANOMALY_ICONS: Record<AnomalyType, React.ComponentType<{ className?: string }>> = {
  OVER_CAPACITY: Scale,
  NEGATIVE_VOLUME: MinusCircle,
  LARGE_VARIANCE_UP: TrendingUp,
  LARGE_VARIANCE_DOWN: TrendingDown,
  MISSING_BOTTLE: PackageX,
};

export function AnomalySummaryPanel({ sessionId, className }: AnomalySummaryPanelProps) {
  const [data, setData] = useState<AnomalySummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/anomalies`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          setError('Failed to load anomaly data');
        }
      } catch (err) {
        console.error('Error fetching anomalies:', err);
        setError('Failed to load anomaly data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnomalies();
  }, [sessionId]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">Loading anomaly data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return null;
  }

  const { summary } = data;
  const hasIssues = summary.errorCount > 0 || summary.warningCount > 0;

  return (
    <Card className={cn(className, hasIssues && 'border-amber-200')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            {hasIssues ? (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            Anomaly Summary
          </span>
          <div className="flex gap-1">
            {summary.errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {summary.errorCount} Error{summary.errorCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {summary.warningCount > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                {summary.warningCount} Warning{summary.warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasIssues ? (
          <p className="text-sm text-muted-foreground">
            No anomalies detected. All {summary.totalMeasurements} measurements look good.
          </p>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {summary.measurementsWithAnomalies} of {summary.totalMeasurements} measurements have issues
            </div>

            {/* Anomaly counts by type */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(summary.anomalyCounts).map(([type, count]) => {
                if (count === 0) return null;
                const anomalyType = type as AnomalyType;
                const info = ANOMALY_INFO[anomalyType];
                const Icon = ANOMALY_ICONS[anomalyType];

                return (
                  <div
                    key={type}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-md text-sm',
                      info.severity === 'error'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-amber-50 text-amber-800'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 truncate" title={info.message}>
                      {info.message.replace('from previous measurement', '')}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        info.severity === 'error'
                          ? 'border-red-300 text-red-700'
                          : 'border-amber-300 text-amber-700'
                      )}
                    >
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {/* Detailed list of measurements with anomalies */}
            {data.measurementsWithAnomalies.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Affected Products</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {data.measurementsWithAnomalies.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                    >
                      <span className="truncate">
                        {m.brand} {m.productName}
                      </span>
                      <div className="flex items-center gap-2">
                        {m.variancePercent != null && (
                          <span
                            className={cn(
                              'text-xs',
                              m.variancePercent > 0 ? 'text-amber-600' : 'text-red-600'
                            )}
                          >
                            {m.variancePercent > 0 ? '+' : ''}{m.variancePercent.toFixed(1)}%
                          </span>
                        )}
                        <div className="flex gap-0.5">
                          {m.anomalyFlags.map((flag) => {
                            const Icon = ANOMALY_ICONS[flag];
                            const info = ANOMALY_INFO[flag];
                            return (
                              <span
                                key={flag}
                                title={info.message}
                                className={cn(
                                  'p-0.5 rounded',
                                  info.severity === 'error'
                                    ? 'text-red-600 bg-red-100'
                                    : 'text-amber-600 bg-amber-100'
                                )}
                              >
                                <Icon className="h-3 w-3" />
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing bottles */}
            {data.missingProducts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <PackageX className="h-4 w-4 text-amber-500" />
                  Missing from Previous Session ({data.missingProducts.length})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {data.missingProducts.map((p) => (
                    <div
                      key={p.productId}
                      className="p-2 bg-amber-50 rounded text-sm text-amber-800"
                    >
                      {p.brand} {p.productName}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
