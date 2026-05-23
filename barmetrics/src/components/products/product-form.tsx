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
import { productSchema, type ProductFormData } from '@/lib/validations';
import { LIQUOR_CLASSES, LIQUOR_SUBCLASSES, BOTTLE_SIZES, suggestTareWeight, type LiquorClass } from '@/lib/calculations';
import { useEffect } from 'react';
import { BottleDatabaseSearch } from '@/components/skus/bottle-database-search';

interface ProductFormProps {
  defaultValues?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ProductForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      brand: '',
      productName: '',
      category: 'VODKA',
      abvPercent: 40,
      nominalVolumeMl: 1000,
      defaultDensity: 0.95,
      defaultTareG: null,
      isActive: true,
      ...defaultValues,
    },
  });

  const nominalVolumeMl = watch('nominalVolumeMl');

  useEffect(() => {
    if (nominalVolumeMl && !defaultValues?.defaultTareG) {
      const suggestedTare = suggestTareWeight(nominalVolumeMl);
      setValue('defaultTareG', suggestedTare);
    }
  }, [nominalVolumeMl, setValue, defaultValues?.defaultTareG]);

  const categoryWatch = watch('category');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Bottle Database Search — auto-fill all fields from the 100+ catalog */}
      <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
        <Label>Quick fill from bottle catalog</Label>
        <BottleDatabaseSearch
          currentSize={nominalVolumeMl}
          currentCategory={categoryWatch}
          onSelect={(bottle) => {
            setValue('brand', bottle.brand);
            setValue('productName', bottle.productName);
            setValue('category', bottle.category as typeof LIQUOR_CLASSES[number]);
            setValue('nominalVolumeMl', bottle.sizeMl);
            if (bottle.abvPercent != null) setValue('abvPercent', bottle.abvPercent);
            if (bottle.tareWeightG != null) setValue('defaultTareG', bottle.tareWeightG);
          }}
        />
        <p className="text-xs text-muted-foreground">
          Search 100+ spirits (Tito&apos;s, Jameson, Patrón…) to auto-fill brand, name, ABV, and tare weight. You can still edit any field below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Brand *</Label>
          <Input
            id="brand"
            {...register('brand')}
            placeholder="e.g., Tito's"
          />
          {errors.brand && (
            <p className="text-sm text-destructive">{errors.brand.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName">Product Name</Label>
          <Input
            id="productName"
            {...register('productName')}
            placeholder="e.g., Handmade Vodka (optional)"
          />
          {errors.productName && (
            <p className="text-sm text-destructive">{errors.productName.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select
            defaultValue={defaultValues?.category || 'VODKA'}
            onValueChange={(value) => setValue('category', value as typeof LIQUOR_CLASSES[number])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {LIQUOR_CLASSES.map((cat) => (
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
          <Label htmlFor="abvPercent">ABV % *</Label>
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
      </div>

      {/* Sub-class dropdown (cascades from category) + Age statement */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subClass">Sub-class</Label>
          {(() => {
            const subs = LIQUOR_SUBCLASSES[categoryWatch as LiquorClass] ?? [];
            if (subs.length === 0) {
              return (
                <Input
                  id="subClass"
                  disabled
                  placeholder="No sub-classes for this category"
                  className="text-muted-foreground"
                />
              );
            }
            return (
              <Select
                value={watch('subClass') ?? ''}
                onValueChange={(v) => setValue('subClass', v === '__none__' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional — pick a sub-type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {subs.map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })()}
          <p className="text-xs text-muted-foreground">
            E.g. Whiskey → Bourbon, Tequila → Blanco, Cognac under Brandy.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ageStatement">Age statement (years)</Label>
          <Input
            id="ageStatement"
            type="number"
            min={0}
            max={120}
            step={1}
            {...register('ageStatement', {
              setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
            })}
            placeholder="e.g., 12 — leave blank if N/A"
          />
          {errors.ageStatement && (
            <p className="text-sm text-destructive">{errors.ageStatement.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nominalVolumeMl">Bottle Size (ml) *</Label>
          <Select
            defaultValue={String(defaultValues?.nominalVolumeMl || 750)}
            onValueChange={(value) => setValue('nominalVolumeMl', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {BOTTLE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}ml {size === 1000 && '(Standard)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.nominalVolumeMl && (
            <p className="text-sm text-destructive">{errors.nominalVolumeMl.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultTareG">Default Tare Weight (g)</Label>
          <Input
            id="defaultTareG"
            type="number"
            {...register('defaultTareG', { valueAsNumber: true })}
            placeholder="Empty bottle weight"
          />
          <p className="text-xs text-muted-foreground">
            Auto-suggested based on bottle size
          </p>
          {errors.defaultTareG && (
            <p className="text-sm text-destructive">{errors.defaultTareG.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="upc">UPC / GTIN <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          id="upc"
          inputMode="numeric"
          {...register('upc')}
          placeholder="12- or 13-digit barcode, leave blank if unknown"
        />
        {errors.upc && (
          <p className="text-sm text-destructive">{errors.upc.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Globally unique product identifier (GS1 GTIN). The check digit is validated on save.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : defaultValues?.brand ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
