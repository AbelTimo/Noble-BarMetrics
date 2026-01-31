'use client';

import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MeasurementResult } from './measurement-result';
import { calculateVolumeFromWeight, DEFAULT_STANDARD_POUR_ML } from '@/lib/calculations';
import { Scale, Plus } from 'lucide-react';

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

interface MeasurementFormProps {
  sessionId?: string;
  onMeasurementSaved?: () => void;
}

export function MeasurementForm({ sessionId, onMeasurementSaved }: MeasurementFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [standardPour, setStandardPour] = useState<string>(String(DEFAULT_STANDARD_POUR_ML));
  const [isLoading, setIsLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<ReturnType<typeof calculateVolumeFromWeight> | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?isActive=true');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct && grossWeight) {
      const tareWeight =
        selectedProduct.calibrations[0]?.tareWeightG ||
        selectedProduct.defaultTareG;

      if (tareWeight) {
        const result = calculateVolumeFromWeight({
          grossWeightG: parseFloat(grossWeight),
          tareWeightG: tareWeight,
          abvPercent: selectedProduct.abvPercent,
          nominalVolumeMl: selectedProduct.nominalVolumeMl,
          standardPourMl: parseFloat(standardPour) || DEFAULT_STANDARD_POUR_ML,
        });
        setPreviewResult(result);
      }
    } else {
      setPreviewResult(null);
    }
  }, [selectedProduct, grossWeight, standardPour]);

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product || null);
  };

  const handleSave = async () => {
    if (!selectedProduct || !grossWeight || !sessionId) return;

    const tareWeight =
      selectedProduct.calibrations[0]?.tareWeightG ||
      selectedProduct.defaultTareG;

    if (!tareWeight) {
      alert('No tare weight available for this product');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          grossWeightG: parseFloat(grossWeight),
          tareWeightG: tareWeight,
          standardPourMl: parseFloat(standardPour) || DEFAULT_STANDARD_POUR_ML,
          calibrationId: selectedProduct.calibrations[0]?.id || null,
        }),
      });

      if (response.ok) {
        setGrossWeight('');
        setSelectedProduct(null);
        setPreviewResult(null);
        onMeasurementSaved?.();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving measurement:', error);
      alert('Failed to save measurement');
    } finally {
      setIsLoading(false);
    }
  };

  const getTareWeight = () => {
    if (!selectedProduct) return null;
    return selectedProduct.calibrations[0]?.tareWeightG || selectedProduct.defaultTareG;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Enter Measurement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product">Select Product</Label>
            <Select
              value={selectedProduct?.id || ''}
              onValueChange={handleProductSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.brand} {product.productName} ({product.nominalVolumeMl}ml)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProduct && (
            <>
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg text-sm">
                <div>
                  <p className="text-muted-foreground">ABV</p>
                  <p className="font-medium">{selectedProduct.abvPercent}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bottle Size</p>
                  <p className="font-medium">{selectedProduct.nominalVolumeMl}ml</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tare Weight</p>
                  <p className="font-medium">{getTareWeight()}g</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grossWeight">Gross Weight (g) *</Label>
                  <Input
                    id="grossWeight"
                    type="number"
                    step="0.1"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    placeholder="Enter scale reading"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="standardPour">Standard Pour Size (ml)</Label>
                  <Input
                    id="standardPour"
                    type="number"
                    value={standardPour}
                    onChange={(e) => setStandardPour(e.target.value)}
                    placeholder="30"
                  />
                </div>
              </div>
            </>
          )}

          {sessionId && selectedProduct && grossWeight && previewResult && (
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Add Measurement'}
            </Button>
          )}
        </CardContent>
      </Card>

      {previewResult && selectedProduct && (
        <MeasurementResult
          result={previewResult}
          productName={`${selectedProduct.brand} ${selectedProduct.productName}`}
          standardPourMl={parseFloat(standardPour) || DEFAULT_STANDARD_POUR_ML}
        />
      )}
    </div>
  );
}
