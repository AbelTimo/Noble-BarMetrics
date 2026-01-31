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
import { Plus, Search, Edit, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  brand: string;
  productName: string;
  category: string;
  abvPercent: number;
  nominalVolumeMl: number;
  defaultTareG: number | null;
  isActive: boolean;
  calibrations: { id: string; tareWeightG: number }[];
}

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category && category !== 'all') params.set('category', category);

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, category]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

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
        <CardTitle>Products</CardTitle>
        <Link href="/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48">
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

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No products found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">ABV</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead className="text-right">Tare (g)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Link
                      href={`/products/${product.id}`}
                      className="hover:underline font-medium"
                    >
                      {product.brand} {product.productName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(product.category)} variant="outline">
                      {product.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{product.abvPercent}%</TableCell>
                  <TableCell className="text-right">{product.nominalVolumeMl}ml</TableCell>
                  <TableCell className="text-right">
                    {product.calibrations[0]?.tareWeightG || product.defaultTareG || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? 'default' : 'secondary'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/products/${product.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
