'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Printer, CheckCircle2, Loader2, AlertCircle, ArrowRight, Package } from 'lucide-react';
import { toast } from 'sonner';

interface SKU {
  id: string;
  code: string;
  name: string;
  category: string;
  sizeMl: number;
  isActive: boolean;
  _count: { labels: number };
}

interface LabelGeneratorFormProps {
  preselectedSkuId?: string;
}

export function LabelGeneratorFormImproved({ preselectedSkuId }: LabelGeneratorFormProps) {
  const router = useRouter();
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState(preselectedSkuId || '');
  const [quantity, setQuantity] = useState(10);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSKUs, setIsFetchingSKUs] = useState(true);
  const [generatedBatchId, setGeneratedBatchId] = useState<string | null>(null);
  const [generatedLabels, setGeneratedLabels] = useState<any[]>([]);

  useEffect(() => {
    const fetchSKUs = async () => {
      try {
        const response = await fetch('/api/skus?isActive=true');
        if (!response.ok) throw new Error('Failed to fetch SKUs');

        const data = await response.json();
        setSKUs(data.filter((s: SKU) => s.isActive));
      } catch (error) {
        console.error('Error fetching SKUs:', error);
        toast.error('Failed to load SKUs', {
          description: 'Please refresh the page to try again'
        });
      } finally {
        setIsFetchingSKUs(false);
      }
    };
    fetchSKUs();
  }, []);

  useEffect(() => {
    if (preselectedSkuId) {
      setSelectedSkuId(preselectedSkuId);
    }
  }, [preselectedSkuId]);

  const selectedSku = skus.find((s) => s.id === selectedSkuId);

  const handleGenerate = async () => {
    if (!selectedSkuId) {
      toast.error('Please select a SKU', {
        description: 'You must select a SKU before generating labels'
      });
      return;
    }

    if (quantity < 1 || quantity > 500) {
      toast.error('Invalid quantity', {
        description: 'Quantity must be between 1 and 500'
      });
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading('Generating labels...', {
      description: `Creating ${quantity} label${quantity > 1 ? 's' : ''} for ${selectedSku?.name}`
    });

    try {
      const response = await fetch('/api/labels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuId: selectedSkuId,
          quantity,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedBatchId(data.batch?.id || data.id);
        setGeneratedLabels(data.labels || []);

        toast.success('Labels generated successfully!', {
          id: toastId,
          description: `Created ${quantity} label${quantity > 1 ? 's' : ''}. Click below to print.`,
          duration: 5000,
        });
      } else {
        const error = await response.json();
        toast.error('Failed to generate labels', {
          id: toastId,
          description: error.error || 'An unexpected error occurred'
        });
      }
    } catch (error) {
      console.error('Error generating labels:', error);
      toast.error('Failed to generate labels', {
        id: toastId,
        description: 'Network error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Success state after generation
  if (generatedBatchId) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-green-900">Labels Generated Successfully!</CardTitle>
              <CardDescription className="text-green-700">
                {generatedLabels.length} label{generatedLabels.length > 1 ? 's' : ''} created for {selectedSku?.name}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <QrCode className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Your labels are ready to print. You can print them now or access them later from the Labels page.
            </AlertDescription>
          </Alert>

          {generatedLabels.length > 0 && (
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Generated Label Codes:</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-white rounded-md border">
                {generatedLabels.slice(0, 10).map((label: any) => (
                  <Badge key={label.id} variant="secondary" className="font-mono">
                    {label.code}
                  </Badge>
                ))}
                {generatedLabels.length > 10 && (
                  <Badge variant="outline">+{generatedLabels.length - 10} more</Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={() => router.push(`/labels/print/${generatedBatchId}`)}
              className="flex-1 gap-2"
              size="lg"
            >
              <Printer className="h-4 w-4" />
              Print Labels
            </Button>
            <Button
              onClick={() => {
                setGeneratedBatchId(null);
                setGeneratedLabels([]);
                setQuantity(10);
                setNotes('');
              }}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              Generate More
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            onClick={() => router.push('/labels')}
            variant="ghost"
            className="w-full gap-2"
          >
            View All Labels
            <Package className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main form
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Generate QR Labels</CardTitle>
            <CardDescription>
              Create a batch of QR labels for inventory tracking
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SKU Selection */}
        <div className="space-y-2">
          <Label htmlFor="sku">
            SKU <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedSkuId}
            onValueChange={setSelectedSkuId}
            disabled={isFetchingSKUs || isLoading}
          >
            <SelectTrigger id="sku" className="h-11">
              <SelectValue placeholder={isFetchingSKUs ? "Loading SKUs..." : "Select a SKU"} />
            </SelectTrigger>
            <SelectContent>
              {skus.length === 0 && !isFetchingSKUs && (
                <div className="p-4 text-sm text-muted-foreground text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p>No active SKUs found.</p>
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => router.push('/skus/new')}
                    className="mt-2"
                  >
                    Create a SKU first
                  </Button>
                </div>
              )}
              {skus.map((sku) => (
                <SelectItem key={sku.id} value={sku.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{sku.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {sku.code} • {sku.sizeMl}ml • {sku._count.labels} label{sku._count.labels !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selected SKU Info */}
        {selectedSku && (
          <Alert className="border-blue-200 bg-blue-50">
            <Package className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-blue-900">{selectedSku.name}</div>
                  <div className="text-sm text-blue-700">
                    Code: {selectedSku.code} • Size: {selectedSku.sizeMl}ml
                  </div>
                </div>
                <Badge variant="secondary">{selectedSku._count.labels} existing</Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quantity Input */}
        <div className="space-y-2">
          <Label htmlFor="quantity">
            Quantity <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            disabled={isLoading}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Enter a number between 1 and 500
          </p>
        </div>

        {/* Notes Input */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this batch..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={handleGenerate}
            disabled={!selectedSkuId || isLoading || quantity < 1 || quantity > 500}
            className="flex-1 h-11 gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4" />
                Generate {quantity} Label{quantity !== 1 ? 's' : ''}
              </>
            )}
          </Button>
          <Button
            onClick={() => router.push('/labels')}
            variant="outline"
            disabled={isLoading}
            size="lg"
            className="gap-2"
          >
            Cancel
          </Button>
        </div>

        {/* Help Text */}
        <Alert>
          <QrCode className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>How it works:</strong> Each label gets a unique QR code (format: BM-XXXXXXXX).
            After generation, you can print them on thermal labels or Avery sheets.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
