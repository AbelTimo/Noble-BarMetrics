'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SKUProductLinker } from '@/components/skus/sku-product-linker';
import { Edit, QrCode, Tag, ArrowLeft } from 'lucide-react';
import { getLabelStatusColor } from '@/lib/labels';

interface SKUDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  sizeMl: number;
  isActive: boolean;
  createdAt: string;
  products: {
    id: string;
    productId: string;
    isPrimary: boolean;
    product: {
      id: string;
      brand: string;
      productName: string;
      category: string;
      nominalVolumeMl: number;
    };
  }[];
  labels: {
    id: string;
    code: string;
    status: string;
    location: string | null;
    createdAt: string;
  }[];
  batches: {
    id: string;
    quantity: number;
    createdAt: string;
    createdBy: string | null;
  }[];
  _count: { labels: number };
}

export default function SKUDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sku, setSKU] = useState<SKUDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    fetchSKU();
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!sku) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center text-muted-foreground">SKU not found</div>
      </div>
    );
  }

  const statusCounts = {
    UNASSIGNED: sku.labels.filter((l) => l.status === 'UNASSIGNED').length,
    ASSIGNED: sku.labels.filter((l) => l.status === 'ASSIGNED').length,
    RETIRED: sku.labels.filter((l) => l.status === 'RETIRED').length,
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/skus">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              <h1 className="text-2xl font-bold font-mono">{sku.code}</h1>
              <Badge variant={sku.isActive ? 'default' : 'secondary'}>
                {sku.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground">{sku.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/labels/generate?skuId=${sku.id}`}>
              <QrCode className="mr-2 h-4 w-4" />
              Generate Labels
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/skus/${sku.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SKU Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline">{sku.category}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Size</p>
                <p className="font-medium">{sku.sizeMl}ml</p>
              </div>
            </div>
            {sku.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{sku.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{new Date(sku.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Label Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.UNASSIGNED}</p>
                <p className="text-sm text-muted-foreground">Unassigned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{statusCounts.ASSIGNED}</p>
                <p className="text-sm text-muted-foreground">Assigned</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{statusCounts.RETIRED}</p>
                <p className="text-sm text-muted-foreground">Retired</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-3xl font-bold">{sku._count.labels}</p>
              <p className="text-sm text-muted-foreground">Total Labels</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <SKUProductLinker
        skuId={sku.id}
        linkedProducts={sku.products}
        onUpdate={fetchSKU}
      />

      {sku.labels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Labels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sku.labels.slice(0, 20).map((label) => (
                <Link key={label.id} href={`/labels/${label.id}`}>
                  <Badge
                    className={`${getLabelStatusColor(label.status as 'UNASSIGNED' | 'ASSIGNED' | 'RETIRED')} cursor-pointer hover:opacity-80`}
                    variant="outline"
                  >
                    {label.code}
                  </Badge>
                </Link>
              ))}
              {sku.labels.length > 20 && (
                <Badge variant="secondary">+{sku.labels.length - 20} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
