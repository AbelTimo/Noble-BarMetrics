'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalibrationForm } from '@/components/products/calibration-form';
import { ArrowLeft, Edit, Plus, Trash2, Scale } from 'lucide-react';
import { getDensityForABV, calculateFullBottleWeight } from '@/lib/calculations';
import type { CalibrationFormData } from '@/lib/validations';

interface Product {
  id: string;
  brand: string;
  productName: string;
  category: string;
  abvPercent: number;
  nominalVolumeMl: number;
  defaultDensity: number;
  defaultTareG: number | null;
  isActive: boolean;
  calibrations: Calibration[];
}

interface Calibration {
  id: string;
  tareWeightG: number;
  fullBottleWeightG: number | null;
  calibrationMethod: string;
  notes: string | null;
  createdAt: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCalibrationDialog, setShowCalibrationDialog] = useState(false);
  const [calibrationLoading, setCalibrationLoading] = useState(false);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${id}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      } else {
        router.push('/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleAddCalibration = async (data: CalibrationFormData) => {
    setCalibrationLoading(true);
    try {
      const response = await fetch('/api/calibrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setShowCalibrationDialog(false);
        fetchProduct();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating calibration:', error);
    } finally {
      setCalibrationLoading(false);
    }
  };

  const handleDeleteCalibration = async (calibrationId: string) => {
    if (!confirm('Are you sure you want to delete this calibration?')) return;

    try {
      await fetch(`/api/calibrations/${calibrationId}`, { method: 'DELETE' });
      fetchProduct();
    } catch (error) {
      console.error('Error deleting calibration:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">Product not found</div>
      </div>
    );
  }

  const density = getDensityForABV(product.abvPercent);
  const latestCalibration = product.calibrations[0];
  const expectedFullWeight = latestCalibration
    ? calculateFullBottleWeight(
        latestCalibration.tareWeightG,
        product.nominalVolumeMl,
        product.abvPercent
      )
    : null;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-2xl">
              {product.brand} {product.productName}
            </CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{product.category}</Badge>
              <Badge variant={product.isActive ? 'default' : 'secondary'}>
                {product.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
          <Link href={`/products/${product.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">ABV</p>
              <p className="text-lg font-medium">{product.abvPercent}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bottle Size</p>
              <p className="text-lg font-medium">{product.nominalVolumeMl}ml</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Density</p>
              <p className="text-lg font-medium">{density.toFixed(3)} g/ml</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Tare</p>
              <p className="text-lg font-medium">
                {latestCalibration?.tareWeightG || product.defaultTareG || '-'}g
              </p>
            </div>
          </div>

          {expectedFullWeight && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Scale className="h-4 w-4" />
                <span>
                  Expected full bottle weight: <strong>{expectedFullWeight}g</strong>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Calibrations</CardTitle>
          <Dialog open={showCalibrationDialog} onOpenChange={setShowCalibrationDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Calibration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Calibration</DialogTitle>
              </DialogHeader>
              <CalibrationForm
                productId={product.id}
                nominalVolumeMl={product.nominalVolumeMl}
                abvPercent={product.abvPercent}
                defaultTareG={product.defaultTareG}
                onSubmit={handleAddCalibration}
                onCancel={() => setShowCalibrationDialog(false)}
                isLoading={calibrationLoading}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {product.calibrations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No calibrations yet. Add one to improve measurement accuracy.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Tare (g)</TableHead>
                  <TableHead className="text-right">Full (g)</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.calibrations.map((cal, index) => (
                  <TableRow key={cal.id}>
                    <TableCell>
                      {new Date(cal.createdAt).toLocaleDateString()}
                      {index === 0 && (
                        <Badge className="ml-2" variant="secondary">
                          Current
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{cal.calibrationMethod}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{cal.tareWeightG}</TableCell>
                    <TableCell className="text-right">
                      {cal.fullBottleWeightG || '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {cal.notes || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCalibration(cal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
