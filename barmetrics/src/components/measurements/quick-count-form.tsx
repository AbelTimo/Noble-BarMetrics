'use client';

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { BottleVisual } from './bottle-visual';
import { AnomalyBadge, VarianceBadge } from './anomaly-badge';
import { calculateVolumeFromWeight, DEFAULT_STANDARD_POUR_ML } from '@/lib/calculations';
import { detectAnomalies, calculateVariance } from '@/lib/anomalies';
import { cn } from '@/lib/utils';
import {
  Zap,
  Save,
  CheckCircle,
  Circle,
  SkipForward,
  Loader2,
} from 'lucide-react';

interface Product {
  id: string;
  brand: string;
  productName: string;
  category: string;
  abvPercent: number;
  nominalVolumeMl: number;
  defaultTareG: number | null;
  calibrations: { id: string; tareWeightG: number }[];
}

interface PreviousMeasurement {
  id: string;
  percentFull: number | null;
  grossWeightG: number;
  tareWeightG: number;
  calibrationId: string | null;
}

interface TemplateProduct {
  product: Product;
  previousMeasurement: PreviousMeasurement;
}

interface QuickCountFormProps {
  sessionId: string;
  sourceSessionId: string;
  defaultPourMl?: number;
  onMeasurementsSaved?: () => void;
}

interface MeasurementEntry {
  productId: string;
  product: Product;
  previousMeasurement: PreviousMeasurement;
  grossWeight: string;
  isSkipped: boolean;
  isSaved: boolean;
  preview: ReturnType<typeof calculateVolumeFromWeight> | null;
  anomalies: string[];
  variancePercent: number | null;
}

export function QuickCountForm({
  sessionId,
  sourceSessionId,
  defaultPourMl = DEFAULT_STANDARD_POUR_ML,
  onMeasurementsSaved,
}: QuickCountFormProps) {
  const [entries, setEntries] = useState<MeasurementEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load template from source session
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const response = await fetch(`/api/sessions/${sourceSessionId}/template`);
        if (!response.ok) {
          throw new Error('Failed to load session template');
        }
        const template = await response.json();

        const initialEntries: MeasurementEntry[] = template.products.map(
          (item: TemplateProduct) => ({
            productId: item.product.id,
            product: item.product,
            previousMeasurement: item.previousMeasurement,
            grossWeight: '',
            isSkipped: false,
            isSaved: false,
            preview: null,
            anomalies: [],
            variancePercent: null,
          })
        );

        setEntries(initialEntries);
      } catch (err) {
        console.error('Error loading template:', err);
        setError('Failed to load products from previous session');
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [sourceSessionId]);

  // Calculate preview when weight changes
  const updatePreview = useCallback((index: number, grossWeight: string) => {
    setEntries((prev) => {
      const newEntries = [...prev];
      const entry = newEntries[index];

      if (!grossWeight || entry.isSkipped) {
        newEntries[index] = {
          ...entry,
          grossWeight,
          preview: null,
          anomalies: [],
          variancePercent: null,
        };
        return newEntries;
      }

      const tareWeight =
        entry.product.calibrations[0]?.tareWeightG ||
        entry.product.defaultTareG ||
        entry.previousMeasurement.tareWeightG;

      if (!tareWeight) {
        newEntries[index] = { ...entry, grossWeight };
        return newEntries;
      }

      const preview = calculateVolumeFromWeight({
        grossWeightG: parseFloat(grossWeight),
        tareWeightG: tareWeight,
        abvPercent: entry.product.abvPercent,
        nominalVolumeMl: entry.product.nominalVolumeMl,
        standardPourMl: defaultPourMl,
      });

      const anomalies = detectAnomalies(
        {
          percentFull: preview.percentFull,
          grossWeightG: parseFloat(grossWeight),
          tareWeightG: tareWeight,
          netMassG: preview.netMassG,
        },
        entry.previousMeasurement
      );

      const variancePercent = calculateVariance(
        preview.percentFull,
        entry.previousMeasurement.percentFull
      );

      newEntries[index] = {
        ...entry,
        grossWeight,
        preview,
        anomalies,
        variancePercent,
      };

      return newEntries;
    });
  }, [defaultPourMl]);

  // Toggle skip
  const toggleSkip = useCallback((index: number) => {
    setEntries((prev) => {
      const newEntries = [...prev];
      const entry = newEntries[index];
      newEntries[index] = {
        ...entry,
        isSkipped: !entry.isSkipped,
        grossWeight: entry.isSkipped ? entry.grossWeight : '',
        preview: null,
        anomalies: [],
        variancePercent: null,
      };
      return newEntries;
    });
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, index: number) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (!e.shiftKey) {
          // Move to next input
          const nextIndex = index + 1;
          if (nextIndex < entries.length) {
            e.preventDefault();
            // Skip to next non-skipped entry
            let targetIndex = nextIndex;
            while (targetIndex < entries.length && entries[targetIndex].isSkipped) {
              targetIndex++;
            }
            if (targetIndex < entries.length) {
              inputRefs.current[targetIndex]?.focus();
            }
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = index + 1;
        if (nextIndex < entries.length) {
          inputRefs.current[nextIndex]?.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = index - 1;
        if (prevIndex >= 0) {
          inputRefs.current[prevIndex]?.focus();
        }
      }
    },
    [entries.length]
  );

  // Save all measurements
  const handleSaveAll = async () => {
    const measurementsToSave = entries
      .filter((e) => e.grossWeight || e.isSkipped)
      .map((e) => ({
        productId: e.productId,
        grossWeightG: e.isSkipped ? e.previousMeasurement.grossWeightG : parseFloat(e.grossWeight),
        previousMeasurementId: e.previousMeasurement.id,
        calibrationId: e.previousMeasurement.calibrationId,
        isSkipped: e.isSkipped,
      }));

    if (measurementsToSave.length === 0) {
      setError('No measurements to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}/measurements/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurements: measurementsToSave,
          standardPourMl: defaultPourMl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save measurements');
      }

      // Mark entries as saved
      setEntries((prev) =>
        prev.map((e) =>
          e.grossWeight || e.isSkipped ? { ...e, isSaved: true } : e
        )
      );

      onMeasurementsSaved?.();
    } catch (err) {
      console.error('Error saving measurements:', err);
      setError(err instanceof Error ? err.message : 'Failed to save measurements');
    } finally {
      setIsSaving(false);
    }
  };

  // Progress calculation
  const measuredCount = entries.filter((e) => e.grossWeight || e.isSkipped).length;
  const totalCount = entries.length;
  const progressPercent = totalCount > 0 ? (measuredCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading products...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Quick Count
          </span>
          <Button
            onClick={handleSaveAll}
            disabled={isSaving || measuredCount === 0}
            size="sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All
              </>
            )}
          </Button>
        </CardTitle>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progress: {measuredCount} of {totalCount} bottles measured</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
        {error && (
          <p className="text-sm text-red-600 mt-2">{error}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b">
            <div className="col-span-4">Product</div>
            <div className="col-span-2 text-center">Previous</div>
            <div className="col-span-3">Weight (g)</div>
            <div className="col-span-2 text-center">Current</div>
            <div className="col-span-1 text-center">Status</div>
          </div>

          {/* Entries */}
          {entries.map((entry, index) => {
            const tareWeight =
              entry.product.calibrations[0]?.tareWeightG ||
              entry.product.defaultTareG ||
              entry.previousMeasurement.tareWeightG;

            return (
              <div
                key={entry.productId}
                className={cn(
                  'grid grid-cols-12 gap-2 px-2 py-2 items-center rounded-md transition-colors',
                  entry.isSaved && 'bg-green-50',
                  entry.isSkipped && 'bg-muted/50 opacity-60',
                  !entry.isSaved && !entry.isSkipped && 'hover:bg-muted/30'
                )}
              >
                {/* Product Info */}
                <div className="col-span-4">
                  <p className="font-medium text-sm truncate">
                    {entry.product.brand}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.product.productName} ({entry.product.nominalVolumeMl}ml)
                  </p>
                </div>

                {/* Previous Measurement */}
                <div className="col-span-2 flex justify-center">
                  {entry.previousMeasurement.percentFull != null && (
                    <div className="flex items-center gap-1">
                      <BottleVisual
                        percentFull={entry.previousMeasurement.percentFull}
                        size="sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        {entry.previousMeasurement.percentFull.toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Weight Input */}
                <div className="col-span-3 flex items-center gap-1">
                  {entry.isSkipped ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <SkipForward className="h-4 w-4" />
                      <span>Skipped</span>
                    </div>
                  ) : (
                    <>
                      <Input
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="number"
                        step="0.1"
                        value={entry.grossWeight}
                        onChange={(e) => updatePreview(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        placeholder={tareWeight ? `>${tareWeight}` : 'Weight'}
                        className="h-8 text-sm"
                        disabled={entry.isSaved}
                      />
                      <Checkbox
                        checked={entry.isSkipped}
                        onCheckedChange={() => toggleSkip(index)}
                        title="Skip (no change)"
                        disabled={entry.isSaved}
                      />
                    </>
                  )}
                </div>

                {/* Current Preview */}
                <div className="col-span-2 flex justify-center items-center gap-1">
                  {entry.preview ? (
                    <>
                      <BottleVisual
                        percentFull={entry.preview.percentFull ?? 0}
                        size="sm"
                      />
                      <div className="text-xs">
                        <div>{entry.preview.percentFull?.toFixed(0)}%</div>
                        <VarianceBadge variancePercent={entry.variancePercent} size="sm" />
                      </div>
                    </>
                  ) : entry.isSkipped ? (
                    <Badge variant="outline" className="text-xs">
                      No change
                    </Badge>
                  ) : null}
                </div>

                {/* Status */}
                <div className="col-span-1 flex justify-center">
                  {entry.isSaved ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : entry.anomalies.length > 0 ? (
                    <AnomalyBadge
                      anomalyFlags={JSON.stringify(entry.anomalies)}
                      showAll
                      size="sm"
                    />
                  ) : entry.grossWeight || entry.isSkipped ? (
                    <Circle className="h-5 w-5 text-blue-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Keyboard hints */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <p>
            <strong>Keyboard shortcuts:</strong> Tab/Enter to move to next field,
            Arrow keys to navigate
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
