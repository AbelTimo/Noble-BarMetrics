'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { calibrationSchema, type CalibrationFormData } from '@/lib/validations';
import { suggestTareWeight, calculateFullBottleWeight } from '@/lib/calculations';
import { useEffect, useState } from 'react';

interface CalibrationFormProps {
  productId: string;
  nominalVolumeMl: number;
  abvPercent: number;
  defaultTareG?: number | null;
  defaultValues?: Partial<CalibrationFormData>;
  onSubmit: (data: CalibrationFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CalibrationForm({
  productId,
  nominalVolumeMl,
  abvPercent,
  defaultTareG,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: CalibrationFormProps) {
  const [fullBottleEstimate, setFullBottleEstimate] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CalibrationFormData>({
    resolver: zodResolver(calibrationSchema),
    defaultValues: {
      productId,
      tareWeightG: defaultTareG || suggestTareWeight(nominalVolumeMl),
      fullBottleWeightG: null,
      calibrationMethod: 'ESTIMATED',
      notes: '',
      ...defaultValues,
    },
  });

  const tareWeightG = watch('tareWeightG');
  const calibrationMethod = watch('calibrationMethod');

  useEffect(() => {
    if (tareWeightG) {
      const estimate = calculateFullBottleWeight(tareWeightG, nominalVolumeMl, abvPercent);
      setFullBottleEstimate(estimate);
    }
  }, [tareWeightG, nominalVolumeMl, abvPercent]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register('productId')} />

      <div className="space-y-2">
        <Label htmlFor="calibrationMethod">Calibration Method</Label>
        <Select
          defaultValue={defaultValues?.calibrationMethod || 'ESTIMATED'}
          onValueChange={(value) => setValue('calibrationMethod', value as 'MEASURED_EMPTY' | 'MEASURED_FULL' | 'ESTIMATED')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MEASURED_EMPTY">Measured Empty Bottle</SelectItem>
            <SelectItem value="MEASURED_FULL">Measured Full Bottle</SelectItem>
            <SelectItem value="ESTIMATED">Estimated</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {calibrationMethod === 'MEASURED_EMPTY' &&
            'Weighed the empty bottle directly'}
          {calibrationMethod === 'MEASURED_FULL' &&
            'Weighed a full sealed bottle'}
          {calibrationMethod === 'ESTIMATED' &&
            'Using estimated tare based on bottle size'}
        </p>
        {errors.calibrationMethod && (
          <p className="text-sm text-destructive">
            {errors.calibrationMethod.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tareWeightG">Tare Weight (g) *</Label>
          <Input
            id="tareWeightG"
            type="number"
            step="0.1"
            {...register('tareWeightG', { valueAsNumber: true })}
            placeholder="Empty bottle weight"
          />
          <p className="text-xs text-muted-foreground">
            Suggested: {suggestTareWeight(nominalVolumeMl)}g
          </p>
          {errors.tareWeightG && (
            <p className="text-sm text-destructive">{errors.tareWeightG.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullBottleWeightG">Full Bottle Weight (g)</Label>
          <Input
            id="fullBottleWeightG"
            type="number"
            step="0.1"
            {...register('fullBottleWeightG', { valueAsNumber: true })}
            placeholder="Optional"
          />
          {fullBottleEstimate && (
            <p className="text-xs text-muted-foreground">
              Expected: ~{fullBottleEstimate}g
            </p>
          )}
          {errors.fullBottleWeightG && (
            <p className="text-sm text-destructive">
              {errors.fullBottleWeightG.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          {...register('notes')}
          placeholder="Optional notes about this calibration"
        />
        {errors.notes && (
          <p className="text-sm text-destructive">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Calibration'}
        </Button>
      </div>
    </form>
  );
}
