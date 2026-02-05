'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scale, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import {
  calculateVolumeFromWeight,
  getBottleTareWeight,
  getDensityForSKU,
  formatVolume,
  formatWeight,
} from '@/lib/inventory-calculations';

interface SKU {
  id: string;
  code: string;
  name: string;
  sizeMl: number;
  bottleTareG?: number | null;
  densityGPerMl?: number | null;
  abvPercent?: number | null;
  products?: Array<{
    isPrimary: boolean;
    product: {
      id: string;
      brand: string;
      productName: string;
      defaultTareG?: number | null;
      defaultDensity?: number | null;
      abvPercent?: number | null;
    };
  }>;
}

interface WeightInputProps {
  labelId: string;
  labelCode: string;
  sku: SKU;
  currentLocation?: string | null;
  onCountSaved: () => void;
  onCancel: () => void;
}

export function WeightInput({
  labelId,
  labelCode,
  sku,
  currentLocation,
  onCountSaved,
  onCancel,
}: WeightInputProps) {
  const [grossWeightG, setGrossWeightG] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus weight input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Get bottle tare weight
  const bottleTareG = getBottleTareWeight(sku);

  // Get density
  const densityGPerMl = getDensityForSKU(sku);

  // Calculate live results
  const weight = parseFloat(grossWeightG);
  const calculation =
    bottleTareG && !isNaN(weight) && weight > 0
      ? calculateVolumeFromWeight({
          grossWeightG: weight,
          bottleTareG,
          sizeMl: sku.sizeMl,
          densityGPerMl,
        })
      : null;

  // Check if there's an error for styling
  const hasError = calculation && calculation.errors.length > 0;

  const handleSave = async () => {
    if (!calculation || !calculation.isValid) {
      setError('Invalid weight measurement');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/labels/${labelId}/count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grossWeightG: weight,
          location: currentLocation || undefined,
          idempotencyKey: `${labelCode}-${Date.now()}`,
        }),
      });

      if (response.ok) {
        onCountSaved();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save count');
      }
    } catch (err) {
      console.error('Error saving count:', err);
      setError('Network error. Count may be saved offline.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && calculation?.isValid) {
      handleSave();
    }
  };

  if (!bottleTareG) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Bottle tare weight not configured for this SKU. Please update the SKU or linked product settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border-2 border-primary">
      {/* Header */}
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Scale className="h-5 w-5" />
        <span>Weight-Based Count</span>
      </div>

      {/* SKU Info */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Bottle Size</p>
          <p className="font-bold text-lg">{sku.sizeMl}ml</p>
        </div>
        <div>
          <p className="text-muted-foreground">Empty Weight</p>
          <p className="font-bold text-lg">{formatWeight(bottleTareG)}</p>
        </div>
      </div>

      {/* Weight Input */}
      <div className="space-y-2">
        <Label htmlFor="weight" className="text-base font-medium">
          Gross Weight (grams) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="weight"
          ref={inputRef}
          type="number"
          inputMode="decimal"
          placeholder="Enter weight in grams"
          value={grossWeightG}
          onChange={(e) => setGrossWeightG(e.target.value)}
          onKeyPress={handleKeyPress}
          className={`text-2xl font-bold h-16 text-center ${
            hasError
              ? 'border-red-500 border-2 focus-visible:ring-red-500 bg-red-50'
              : ''
          }`}
          disabled={isSaving}
        />
        <p className={`text-xs text-center ${hasError ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
          {hasError
            ? `⚠️ Must be at least ${bottleTareG}g (empty bottle weight)`
            : 'Place bottle on scale and enter the weight shown'
          }
        </p>
      </div>

      {/* Live Calculation Preview */}
      {calculation && (
        <div className="space-y-3">
          {calculation.errors.length > 0 && (
            <Alert variant="destructive" className="border-2 border-red-500 bg-red-50 animate-pulse">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-900 font-semibold">
                {calculation.errors.map((err, i) => (
                  <p key={i}>❌ {err}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {calculation.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {calculation.warnings.map((warn, i) => (
                  <p key={i}>{warn}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {calculation.isValid && (
            <div className="bg-green-500/10 border-2 border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Calculated Results</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Liquid</p>
                  <p className="text-xl font-bold">{formatWeight(calculation.netLiquidG)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Volume</p>
                  <p className="text-xl font-bold">{formatVolume(calculation.remainingVolumeMl)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Full</p>
                  <p className="text-xl font-bold">{calculation.remainingPercent}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!calculation?.isValid || isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Save Count
            </>
          )}
        </Button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground text-center">
        Density: {densityGPerMl.toFixed(3)} g/ml
        {sku.abvPercent && ` (from ${sku.abvPercent}% ABV)`}
      </p>
    </div>
  );
}
