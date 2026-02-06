'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Database, Search, Check } from 'lucide-react';

interface BottleWeight {
  id: string;
  brand: string;
  productName: string;
  category: string;
  sizeMl: number;
  tareWeightG: number;
  fullWeightG: number | null;
  abvPercent: number | null;
  verified: boolean;
}

interface BottleDatabaseSearchProps {
  onSelect: (bottle: BottleWeight) => void;
  currentSize?: number;
  currentCategory?: string;
}

export function BottleDatabaseSearch({
  onSelect,
  currentSize,
  currentCategory,
}: BottleDatabaseSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [bottles, setBottles] = useState<BottleWeight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState<BottleWeight | null>(null);

  useEffect(() => {
    if (open) {
      fetchBottles();
    }
  }, [open, search, currentSize, currentCategory]);

  const fetchBottles = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (currentSize) params.set('sizeMl', String(currentSize));
      if (currentCategory) params.set('category', currentCategory);
      params.set('limit', '20');

      const response = await fetch(`/api/bottle-weights?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setBottles(data);
      } else {
        setBottles([]);
      }
    } catch (error) {
      console.error('Error fetching bottles:', error);
      setBottles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (bottle: BottleWeight) => {
    setSelectedBottle(bottle);
    onSelect(bottle);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <Database className="mr-2 h-4 w-4" />
          {selectedBottle
            ? `${selectedBottle.brand} ${selectedBottle.productName} - ${selectedBottle.tareWeightG}g`
            : 'Search Bottle Database'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Bottle Weight Database
          </DialogTitle>
          <DialogDescription>
            Search for standard bottle weights from our database of 100+ popular brands.
            {currentSize && ` Filtered for ${currentSize}ml bottles.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="bottle-search">Search by Brand or Product Name</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="bottle-search"
                placeholder="e.g., Grey Goose, Patron, Tanqueray..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Searching database...
            </div>
          ) : bottles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No bottles found matching your criteria.</p>
              <p className="text-sm mt-2">
                Try a different search term or manually enter the tare weight below.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand & Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Tare Weight</TableHead>
                    <TableHead className="text-center">ABV</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bottles.map((bottle) => (
                    <TableRow key={bottle.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{bottle.brand}</p>
                          <p className="text-sm text-muted-foreground">{bottle.productName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{bottle.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{bottle.sizeMl}ml</TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {bottle.tareWeightG}g
                        {bottle.verified && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Verified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {bottle.abvPercent ? `${bottle.abvPercent}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSelect(bottle)}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Use
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Database Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="font-semibold mb-1">💡 Database Info:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>100+ popular liquor brands with verified tare weights</li>
              <li>Weights are based on manufacturer specifications</li>
              <li>If your bottle isn't listed, you can manually enter the tare weight</li>
              <li>Verified weights have been confirmed by multiple sources</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
