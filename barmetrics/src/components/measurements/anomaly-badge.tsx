'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Scale, MinusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AnomalyType,
  ANOMALY_INFO,
  getAnomalyInfoList,
  getHighestSeverity,
} from '@/lib/anomalies';

interface AnomalyBadgeProps {
  anomalyFlags: string | null;
  showAll?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const ANOMALY_ICONS: Record<AnomalyType, React.ComponentType<{ className?: string }>> = {
  OVER_CAPACITY: Scale,
  NEGATIVE_VOLUME: MinusCircle,
  LARGE_VARIANCE_UP: TrendingUp,
  LARGE_VARIANCE_DOWN: TrendingDown,
  MISSING_BOTTLE: AlertCircle,
};

export function AnomalyBadge({
  anomalyFlags,
  showAll = false,
  size = 'sm',
  className,
}: AnomalyBadgeProps) {
  const anomalies = getAnomalyInfoList(anomalyFlags);

  if (anomalies.length === 0) {
    return null;
  }

  const severity = getHighestSeverity(anomalyFlags);
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  if (showAll) {
    return (
      <div className={cn('flex flex-wrap gap-1', className)}>
        {anomalies.map((anomaly) => {
          const Icon = ANOMALY_ICONS[anomaly.type];
          return (
            <Badge
              key={anomaly.type}
              variant={anomaly.severity === 'error' ? 'destructive' : 'secondary'}
              className={cn(
                'flex items-center gap-1',
                size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-sm px-2 py-0.5',
                anomaly.severity === 'warning' && 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              )}
              title={`${anomaly.message}\n${anomaly.suggestion}`}
            >
              <Icon className={iconSize} />
              <span className="sr-only">{anomaly.message}</span>
            </Badge>
          );
        })}
      </div>
    );
  }

  // Show single badge with count if multiple anomalies
  const primaryAnomaly = anomalies[0];
  const Icon = severity === 'error' ? AlertCircle : AlertTriangle;

  return (
    <Badge
      variant={severity === 'error' ? 'destructive' : 'secondary'}
      className={cn(
        'flex items-center gap-1',
        size === 'sm' ? 'text-xs px-1.5 py-0' : 'text-sm px-2 py-0.5',
        severity === 'warning' && 'bg-amber-100 text-amber-800 hover:bg-amber-200',
        className
      )}
      title={anomalies.map(a => `${a.message}: ${a.suggestion}`).join('\n')}
    >
      <Icon className={iconSize} />
      {anomalies.length > 1 && (
        <span className={size === 'sm' ? 'text-[10px]' : 'text-xs'}>
          {anomalies.length}
        </span>
      )}
    </Badge>
  );
}

interface AnomalyDetailsProps {
  anomalyFlags: string | null;
  variancePercent?: number | null;
  className?: string;
}

export function AnomalyDetails({
  anomalyFlags,
  variancePercent,
  className,
}: AnomalyDetailsProps) {
  const anomalies = getAnomalyInfoList(anomalyFlags);

  if (anomalies.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {anomalies.map((anomaly) => {
        const Icon = ANOMALY_ICONS[anomaly.type];
        return (
          <div
            key={anomaly.type}
            className={cn(
              'flex items-start gap-2 p-2 rounded-md text-sm',
              anomaly.severity === 'error'
                ? 'bg-red-50 text-red-800'
                : 'bg-amber-50 text-amber-800'
            )}
          >
            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{anomaly.message}</p>
              <p className="text-xs opacity-80">{anomaly.suggestion}</p>
              {variancePercent != null &&
                (anomaly.type === 'LARGE_VARIANCE_UP' || anomaly.type === 'LARGE_VARIANCE_DOWN') && (
                  <p className="text-xs mt-1">
                    Change: {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                  </p>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface VarianceBadgeProps {
  variancePercent: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function VarianceBadge({ variancePercent, size = 'sm', className }: VarianceBadgeProps) {
  if (variancePercent == null) {
    return null;
  }

  const isSignificant = Math.abs(variancePercent) > 30;
  const isPositive = variancePercent > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5',
        size === 'sm' ? 'text-xs' : 'text-sm',
        isSignificant
          ? isPositive
            ? 'text-amber-600'
            : 'text-red-600'
          : 'text-muted-foreground',
        className
      )}
    >
      <Icon className={iconSize} />
      {isPositive ? '+' : ''}{variancePercent.toFixed(1)}%
    </span>
  );
}
