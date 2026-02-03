'use client';

import { useSearchParams } from 'next/navigation';
import { LabelGeneratorForm } from '@/components/labels/label-generator-form';
import { Suspense } from 'react';

function GenerateLabelsContent() {
  const searchParams = useSearchParams();
  const skuId = searchParams.get('skuId') || undefined;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <LabelGeneratorForm preselectedSkuId={skuId} />
    </div>
  );
}

export default function GenerateLabelsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 max-w-2xl text-center">Loading...</div>}>
      <GenerateLabelsContent />
    </Suspense>
  );
}
