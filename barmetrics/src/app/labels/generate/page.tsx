'use client';

import { useSearchParams } from 'next/navigation';
import { LabelGeneratorFormImproved } from '@/components/labels/label-generator-form-improved';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

function GenerateLabelsContent() {
  const searchParams = useSearchParams();
  const skuId = searchParams.get('skuId') || undefined;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <LabelGeneratorFormImproved preselectedSkuId={skuId} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-11 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function GenerateLabelsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <GenerateLabelsContent />
    </Suspense>
  );
}
