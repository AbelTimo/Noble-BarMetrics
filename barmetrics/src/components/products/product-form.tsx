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
import { LIQUOR_CATEGORIES, BOTTLE_SIZES, suggestTareWeight } from '@/lib/calculations';
import { useEffect } from 'react';

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
      nominalVolumeMl: 750,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <Label htmlFor="productName">Product Name *</Label>
          <Input
            id="productName"
            {...register('productName')}
            placeholder="e.g., Handmade Vodka"
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
                  {size}ml {size === 750 && '(Standard)'}
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
