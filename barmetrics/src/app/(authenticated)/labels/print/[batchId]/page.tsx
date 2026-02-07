'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LabelPrintPreview } from '@/components/labels/label-print-preview';
import { ArrowLeft } from 'lucide-react';

interface PrintData {
  batch: {
    id: string;
    quantity: number;
    notes: string | null;
    createdAt: string;
    createdBy: string | null;
    sku: {
      id: string;
      code: string;
      name: string;
      category: string;
      sizeMl: number;
    };
  };
  labels: {
    id: string;
    code: string;
    qrContent: string;
    skuCode: string;
    skuName: string;
    category: string;
    sizeMl: number;
  }[];
}

export default function PrintLabelsPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = use(params);
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrintData = async () => {
      try {
        const response = await fetch(`/api/labels/batch/${batchId}/print`);
        if (response.ok) {
          const data = await response.json();
          setPrintData(data);
        } else {
          const err = await response.json();
          setError(err.error || 'Failed to load print data');
        }
      } catch (err) {
        console.error('Error fetching print data:', err);
        setError('Failed to load print data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrintData();
  }, [batchId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">Loading print data...</div>
      </div>
    );
  }

  if (error || !printData) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-destructive">{error || 'Batch not found'}</div>
        <div className="text-center mt-4">
          <Button asChild variant="outline">
            <Link href="/labels">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Labels
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/labels">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Print Labels</h1>
          <p className="text-muted-foreground">
            Batch {batchId.slice(0, 8)}... - {printData.labels.length} labels
          </p>
        </div>
      </div>

      <LabelPrintPreview
        labels={printData.labels}
        batchInfo={printData.batch}
      />
    </div>
  );
}
