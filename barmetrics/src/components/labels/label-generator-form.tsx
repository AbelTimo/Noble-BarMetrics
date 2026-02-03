'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Badge } from '@/components/ui/badge';
import { QrCode, Printer } from 'lucide-react';

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

export function LabelGeneratorForm({ preselectedSkuId }: LabelGeneratorFormProps) {
  const router = useRouter();
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [selectedSkuId, setSelectedSkuId] = useState(preselectedSkuId || '');
  const [quantity, setQuantity] = useState(10);
  const [notes, setNotes] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedBatchId, setGeneratedBatchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSKUs = async () => {
      try {
        const response = await fetch('/api/skus?isActive=true');
        const data = await response.json();
        setSKUs(data.filter((s: SKU) => s.isActive));
      } catch (error) {
        console.error('Error fetching SKUs:', error);
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
      alert('Please select a SKU');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/labels/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuId: selectedSkuId,
          quantity,
          notes: notes || null,
          createdBy: createdBy || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedBatchId(data.batch.id);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating labels:', error);
      alert('Failed to generate labels');
    } finally {
      setIsLoading(false);
    }
  };

  if (generatedBatchId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <QrCode className="h-5 w-5" />
            Labels Generated Successfully
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Generated <strong>{quantity}</strong> labels for{' '}
            <strong>{selectedSku?.code}</strong>
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <a href={`/labels/print/${generatedBatchId}`}>
                <Printer className="mr-2 h-4 w-4" />
                Print Labels
              </a>
            </Button>
            <Button variant="outline" onClick={() => setGeneratedBatchId(null)}>
              Generate More
            </Button>
            <Button variant="ghost" onClick={() => router.push('/labels')}>
              View All Labels
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Generate QR Labels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sku">Select SKU *</Label>
          <Select value={selectedSkuId} onValueChange={setSelectedSkuId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a SKU" />
            </SelectTrigger>
            <SelectContent>
              {skus.map((sku) => (
                <SelectItem key={sku.id} value={sku.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{sku.code}</span>
                    <span className="text-muted-foreground">-</span>
                    <span>{sku.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {sku._count.labels} labels
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedSku && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{selectedSku.category}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Size</p>
                <p className="font-medium">{selectedSku.sizeMl}ml</p>
              </div>
              <div>
                <p className="text-muted-foreground">Existing Labels</p>
                <p className="font-medium">{selectedSku._count.labels}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            max={500}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          />
          <p className="text-xs text-muted-foreground">
            Generate between 1 and 500 labels at once
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="createdBy">Created By</Label>
          <Input
            id="createdBy"
            value={createdBy}
            onChange={(e) => setCreatedBy(e.target.value)}
            placeholder="Your name (optional)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for this batch"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!selectedSkuId || isLoading}>
            {isLoading ? 'Generating...' : `Generate ${quantity} Labels`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
