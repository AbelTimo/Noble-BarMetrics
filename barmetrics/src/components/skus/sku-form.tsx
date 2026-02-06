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
import { skuSchema, type SKUFormData } from '@/lib/validations';
import { LIQUOR_CATEGORIES, BOTTLE_SIZES } from '@/lib/calculations';
import { generateSKUCode } from '@/lib/labels';
import { useEffect, useState } from 'react';
import { BottleDatabaseSearch } from './bottle-database-search';
import { Separator } from '@/components/ui/separator';

interface SKUFormProps {
  defaultValues?: Partial<SKUFormData>;
  onSubmit: (data: SKUFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  existingCount?: number;
}

export function SKUForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  existingCount = 0,
}: SKUFormProps) {
  const [autoGenerateCode, setAutoGenerateCode] = useState(!defaultValues?.code);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SKUFormData>({
    resolver: zodResolver(skuSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      category: 'VODKA',
      sizeMl: 750,
      isActive: true,
      ...defaultValues,
    },
  });

  const category = watch('category');
  const sizeMl = watch('sizeMl');

  useEffect(() => {
    if (autoGenerateCode && category && sizeMl) {
      const suggestedCode = generateSKUCode(
        category as typeof LIQUOR_CATEGORIES[number],
        sizeMl,
        existingCount + 1
      );
      setValue('code', suggestedCode);
    }
  }, [category, sizeMl, autoGenerateCode, setValue, existingCount]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            defaultValue={defaultValues?.category || 'VODKA'}
            onValueChange={(value) => setValue('category', value as typeof LIQUOR_CATEGORIES[number])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {LIQUOR_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-destructive">{errors.category.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sizeMl">Bottle Size (ml) *</Label>
          <Select
            defaultValue={String(defaultValues?.sizeMl || 750)}
            onValueChange={(value) => setValue('sizeMl', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {BOTTLE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}ml {size === 750 && '(Standard)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sizeMl && (
            <p className="text-sm text-destructive">{errors.sizeMl.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="code">SKU Code *</Label>
          {!defaultValues?.code && (
            <label className="flex items-center text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoGenerateCode}
                onChange={(e) => setAutoGenerateCode(e.target.checked)}
                className="mr-2"
              />
              Auto-generate
            </label>
          )}
        </div>
        <Input
          id="code"
          {...register('code')}
          placeholder="e.g., VODKA-750-001"
          disabled={autoGenerateCode && !defaultValues?.code}
          className={autoGenerateCode && !defaultValues?.code ? 'bg-muted' : ''}
        />
        <p className="text-xs text-muted-foreground">
          Format: CATEGORY-SIZE-NUMBER (uppercase letters, numbers, and hyphens only)
        </p>
        {errors.code && (
          <p className="text-sm text-destructive">{errors.code.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Display Name *</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="e.g., Premium Vodka 750ml"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          {...register('description')}
          placeholder="Optional description"
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <Separator className="my-6" />

      {/* Weight-Based Inventory Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Weight-Based Inventory (Optional)</h3>
          <p className="text-sm text-muted-foreground">
            Configure bottle weights for automatic volume calculation from scale measurements.
          </p>
        </div>

        {/* Bottle Database Search */}
        <div className="space-y-2">
          <Label>Quick Setup from Database</Label>
          <BottleDatabaseSearch
            currentSize={sizeMl}
            currentCategory={category}
            onSelect={(bottle) => {
              setValue('bottleTareG', bottle.tareWeightG);
              if (bottle.abvPercent) {
                setValue('abvPercent', bottle.abvPercent);
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Search our database of 100+ bottles to auto-fill tare weight and ABV
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bottleTareG">
              Tare Weight (g)
              <span className="ml-1 text-xs text-muted-foreground">(empty bottle)</span>
            </Label>
            <Input
              id="bottleTareG"
              type="number"
              step="0.1"
              {...register('bottleTareG', { valueAsNumber: true })}
              placeholder="e.g., 480"
            />
            {errors.bottleTareG && (
              <p className="text-sm text-destructive">{errors.bottleTareG.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="abvPercent">
              ABV %
              <span className="ml-1 text-xs text-muted-foreground">(alcohol content)</span>
            </Label>
            <Input
              id="abvPercent"
              type="number"
              step="0.1"
              {...register('abvPercent', { valueAsNumber: true })}
              placeholder="e.g., 40"
            />
            {errors.abvPercent && (
              <p className="text-sm text-destructive">{errors.abvPercent.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="densityGPerMl">
              Density (g/ml)
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="densityGPerMl"
              type="number"
              step="0.001"
              {...register('densityGPerMl', { valueAsNumber: true })}
              placeholder="Auto-calc from ABV"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to auto-calculate from ABV
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : defaultValues?.code ? 'Update SKU' : 'Create SKU'}
        </Button>
      </div>
    </form>
  );
}
