'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { MeasurementResult } from '@/components/measurements/measurement-result';
import { calculateVolumeFromWeight, DEFAULT_STANDARD_POUR_ML } from '@/lib/calculations';
import { Scale, RotateCcw } from 'lucide-react';

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

export default function QuickMeasurePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [standardPour, setStandardPour] = useState<string>(String(DEFAULT_STANDARD_POUR_ML));
  const [result, setResult] = useState<ReturnType<typeof calculateVolumeFromWeight> | null>(null);

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
        const calcResult = calculateVolumeFromWeight({
          grossWeightG: parseFloat(grossWeight),
          tareWeightG: tareWeight,
          abvPercent: selectedProduct.abvPercent,
          nominalVolumeMl: selectedProduct.nominalVolumeMl,
          standardPourMl: parseFloat(standardPour) || DEFAULT_STANDARD_POUR_ML,
        });
        setResult(calcResult);
      }
    } else {
      setResult(null);
    }
  }, [selectedProduct, grossWeight, standardPour]);

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setSelectedProduct(product || null);
    setResult(null);
    setGrossWeight('');
  };

  const handleReset = () => {
    setSelectedProduct(null);
    setGrossWeight('');
    setStandardPour(String(DEFAULT_STANDARD_POUR_ML));
    setResult(null);
  };

  const getTareWeight = () => {
    if (!selectedProduct) return null;
    return selectedProduct.calibrations[0]?.tareWeightG || selectedProduct.defaultTareG;
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Quick Measure
          </CardTitle>
          <CardDescription>
            Take a quick measurement without starting a session. Results are not saved.
          </CardDescription>
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
                  <Label htmlFor="standardPour">Standard Pour (ml)</Label>
                  <Input
                    id="standardPour"
                    type="number"
                    value={standardPour}
                    onChange={(e) => setStandardPour(e.target.value)}
                    placeholder="44"
                  />
                </div>
              </div>
            </>
          )}

          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </CardContent>
      </Card>

      {result && selectedProduct && (
        <MeasurementResult
          result={result}
          productName={`${selectedProduct.brand} ${selectedProduct.productName}`}
          standardPourMl={parseFloat(standardPour) || DEFAULT_STANDARD_POUR_ML}
        />
      )}
    </div>
  );
}
