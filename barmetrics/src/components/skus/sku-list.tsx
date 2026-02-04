'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LIQUOR_CATEGORIES } from '@/lib/calculations';
import { Plus, Search, Edit, Tag, QrCode } from 'lucide-react';

interface SKU {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  sizeMl: number;
  isActive: boolean;
  products: { product: { id: string; brand: string; productName: string } }[];
  _count: { labels: number };
}

export function SKUList() {
  const [skus, setSKUs] = useState<SKU[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSKUs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category && category !== 'all') params.set('category', category);

      const response = await fetch(`/api/skus?${params.toString()}`);
      if (!response.ok) {
        // Handle 401 (unauthorized) or other errors silently
        setSKUs([]);
        return;
      }
      const data = await response.json();
      setSKUs(Array.isArray(data) ? data : []);
    } catch (error) {
      // Handle network errors silently
      setSKUs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSKUs();
  }, [search, category]);

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      VODKA: 'bg-blue-100 text-blue-800',
      GIN: 'bg-cyan-100 text-cyan-800',
      WHISKEY: 'bg-amber-100 text-amber-800',
      BOURBON: 'bg-orange-100 text-orange-800',
      RUM: 'bg-yellow-100 text-yellow-800',
      TEQUILA: 'bg-lime-100 text-lime-800',
      BRANDY: 'bg-purple-100 text-purple-800',
      LIQUEUR: 'bg-pink-100 text-pink-800',
      MEZCAL: 'bg-green-100 text-green-800',
      COGNAC: 'bg-rose-100 text-rose-800',
      SCOTCH: 'bg-red-100 text-red-800',
    };
    return colors[cat] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          SKUs
        </CardTitle>
        <Button asChild>
          <Link href="/skus/new">
            <Plus className="mr-2 h-4 w-4" />
            Create SKU
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKUs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {LIQUOR_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {skus.length} SKU{skus.length !== 1 ? 's' : ''}
            {category && category !== 'all' ? ` in ${category}` : ''}
            {search ? ` matching "${search}"` : ''}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : !Array.isArray(skus) || skus.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No SKUs found. Create your first SKU to get started.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {skus.map((sku) => (
                <Card key={sku.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link
                        href={`/skus/${sku.id}`}
                        className="font-mono font-bold text-sm hover:underline block mb-1"
                      >
                        {sku.code}
                      </Link>
                      <p className="font-semibold">{sku.name}</p>
                    </div>
                    <Badge variant={sku.isActive ? 'default' : 'secondary'}>
                      {sku.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(sku.category)} variant="outline">
                        {sku.category}
                      </Badge>
                      <span className="text-muted-foreground">{sku.sizeMl}ml</span>
                    </div>

                    {sku.products.length > 0 ? (
                      <p className="text-muted-foreground">
                        {sku.products[0].product.brand} {sku.products[0].product.productName}
                        {sku.products.length > 1 && ` +${sku.products.length - 1}`}
                      </p>
                    ) : (
                      <p className="text-muted-foreground italic">No products linked</p>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Labels:</span>
                      <Badge variant="secondary">{sku._count.labels}</Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/labels/generate?skuId=${sku.id}`}>
                        <QrCode className="mr-2 h-4 w-4" />
                        Labels
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/skus/${sku.id}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>SKU Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Labels</TableHead>
                <TableHead>Products</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skus.map((sku) => (
                <TableRow key={sku.id}>
                  <TableCell>
                    <Link
                      href={`/skus/${sku.id}`}
                      className="font-mono font-medium hover:underline"
                    >
                      {sku.code}
                    </Link>
                  </TableCell>
                  <TableCell>{sku.name}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(sku.category)} variant="outline">
                      {sku.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{sku.sizeMl}ml</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{sku._count.labels}</Badge>
                  </TableCell>
                  <TableCell>
                    {sku.products.length > 0 ? (
                      <span className="text-sm">
                        {sku.products[0].product.brand} {sku.products[0].product.productName}
                        {sku.products.length > 1 && ` +${sku.products.length - 1}`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">No products linked</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sku.isActive ? 'default' : 'secondary'}>
                      {sku.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="ghost" size="icon" title="Generate Labels">
                        <Link href={`/labels/generate?skuId=${sku.id}`}>
                          <QrCode className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="icon" title="Edit SKU">
                        <Link href={`/skus/${sku.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
