'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SKUForm } from '@/components/skus/sku-form';
import type { SKUFormData } from '@/lib/validations';

export default function NewSKUPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [skuCount, setSkuCount] = useState(0);

  useEffect(() => {
    const fetchSKUCount = async () => {
      try {
        const response = await fetch('/api/skus');
        const data = await response.json();
        setSkuCount(Array.isArray(data) ? data.length : 0);
      } catch (error) {
        console.error('Error fetching SKU count:', error);
      }
    };
    fetchSKUCount();
  }, []);

  const handleSubmit = async (data: SKUFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push('/skus');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating SKU:', error);
      alert('Failed to create SKU');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create New SKU</CardTitle>
        </CardHeader>
        <CardContent>
          <SKUForm
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
            isLoading={isLoading}
            existingCount={skuCount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
