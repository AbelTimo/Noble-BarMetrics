'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImportForm } from '@/components/products/import-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ImportProductsPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/products');
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Products from Excel</CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx) to bulk import products into your inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Excel Format Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-3">
            <p>Your Excel file should have the following columns in the first row:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 font-medium">Column</th>
                    <th className="py-2 pr-4 font-medium">Required</th>
                    <th className="py-2 pr-4 font-medium">Example</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Brand</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2 pr-4 font-mono text-xs">Tito&apos;s</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Product Name</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2 pr-4 font-mono text-xs">Handmade Vodka</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Category</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2 pr-4 font-mono text-xs">VODKA, GIN, WHISKEY, RUM, TEQUILA, etc.</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">ABV %</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2 pr-4 font-mono text-xs">40</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Volume (ml)</td>
                    <td className="py-2 pr-4">Yes</td>
                    <td className="py-2 pr-4 font-mono text-xs">750</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Tare Weight (g)</td>
                    <td className="py-2 pr-4">No</td>
                    <td className="py-2 pr-4 font-mono text-xs">485</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              <strong>Valid categories:</strong> VODKA, GIN, WHISKEY, RUM, TEQUILA, BRANDY, LIQUEUR, MEZCAL, COGNAC, SCOTCH, BOURBON, OTHER
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
