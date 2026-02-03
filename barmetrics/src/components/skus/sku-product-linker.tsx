'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Trash2, Star } from 'lucide-react';

interface Product {
  id: string;
  brand: string;
  productName: string;
  category: string;
  nominalVolumeMl: number;
}

interface LinkedProduct {
  id: string;
  productId: string;
  isPrimary: boolean;
  product: Product;
}

interface SKUProductLinkerProps {
  skuId: string;
  linkedProducts: LinkedProduct[];
  onUpdate: () => void;
}

export function SKUProductLinker({ skuId, linkedProducts, onUpdate }: SKUProductLinkerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products?isActive=true');
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  const linkedProductIds = linkedProducts.map((lp) => lp.productId);
  const availableProducts = products.filter((p) => !linkedProductIds.includes(p.id));

  const handleLink = async () => {
    if (!selectedProductId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/skus/${skuId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          isPrimary: linkedProducts.length === 0,
        }),
      });

      if (response.ok) {
        setSelectedProductId('');
        onUpdate();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error linking product:', error);
      alert('Failed to link product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async (productId: string) => {
    if (!confirm('Are you sure you want to unlink this product?')) return;

    try {
      const response = await fetch(`/api/skus/${skuId}/products?productId=${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onUpdate();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error unlinking product:', error);
      alert('Failed to unlink product');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Linked Products</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a product to link" />
            </SelectTrigger>
            <SelectContent>
              {availableProducts.length === 0 ? (
                <SelectItem value="" disabled>
                  No available products
                </SelectItem>
              ) : (
                availableProducts.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.brand} {product.productName} ({product.nominalVolumeMl}ml)
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button onClick={handleLink} disabled={!selectedProductId || isLoading}>
            <Plus className="mr-2 h-4 w-4" />
            Link
          </Button>
        </div>

        {linkedProducts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No products linked to this SKU
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Primary</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linkedProducts.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    {link.product.brand} {link.product.productName}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{link.product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{link.product.nominalVolumeMl}ml</TableCell>
                  <TableCell>
                    {link.isPrimary && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Star className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUnlink(link.productId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
