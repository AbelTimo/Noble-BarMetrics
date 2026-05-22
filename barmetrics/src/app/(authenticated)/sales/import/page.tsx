'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SalesImportForm } from '@/components/sales/sales-import-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ImportSalesPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/sales">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Sales from a POS Export</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file of sales. Rows sharing a date and shift are
            grouped into one sale; each item is matched to a recipe or product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SalesImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
