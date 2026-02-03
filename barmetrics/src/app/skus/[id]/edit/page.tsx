'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SKUForm } from '@/components/skus/sku-form';
import type { SKUFormData } from '@/lib/validations';

interface SKU {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  sizeMl: number;
  isActive: boolean;
}

export default function EditSKUPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sku, setSKU] = useState<SKU | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSKU = async () => {
      try {
        const response = await fetch(`/api/skus/${id}`);
        if (response.ok) {
          const data = await response.json();
          setSKU(data);
        }
      } catch (error) {
        console.error('Error fetching SKU:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSKU();
  }, [id]);

  const handleSubmit = async (data: SKUFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/skus/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push(`/skus/${id}`);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating SKU:', error);
      alert('Failed to update SKU');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!sku) {
    return (
      <div className="container mx-auto py-8 max-w-2xl">
        <div className="text-center text-muted-foreground">SKU not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Edit SKU: {sku.code}</CardTitle>
        </CardHeader>
        <CardContent>
          <SKUForm
            defaultValues={{
              code: sku.code,
              name: sku.name,
              description: sku.description || undefined,
              category: sku.category as SKUFormData['category'],
              sizeMl: sku.sizeMl,
              isActive: sku.isActive,
            }}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={isSaving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
