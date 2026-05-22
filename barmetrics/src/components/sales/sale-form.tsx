'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { SALE_SHIFTS, SALE_ITEM_TYPES } from '@/lib/validations';
import { toast } from 'sonner';
import { localDateString } from '@/lib/utils';

interface Recipe {
  id: string;
  name: string;
  category: string;
}

interface Product {
  id: string;
  brand: string;
  productName: string;
  category: string;
}

interface SaleItemRow {
  type: string;
  recipeId: string;
  productId: string;
  quantity: number;
  notes: string;
}

export function SaleForm() {
  const router = useRouter();

  const [date, setDate] = useState(localDateString());
  const [shift, setShift] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItemRow[]>([
    { type: 'COCKTAIL', recipeId: '', productId: '', quantity: 1, notes: '' },
  ]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/recipes?isActive=true').then((r) => r.json()),
      fetch('/api/products?isActive=true').then((r) => r.json()),
    ]).then(([recipesData, productsData]) => {
      setRecipes(recipesData);
      setProducts(productsData);
    });
  }, []);

  const addItem = () => {
    setItems([...items, { type: 'COCKTAIL', recipeId: '', productId: '', quantity: 1, notes: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItemRow, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    // Clear the opposite field when type changes
    if (field === 'type') {
      if (value === 'COCKTAIL') {
        updated[index].productId = '';
      } else {
        updated[index].recipeId = '';
      }
    }
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter((i) => (i.recipeId || i.productId) && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Add at least one sale item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: new Date(date).toISOString(),
        shift: shift || null,
        notes: notes || null,
        source: 'MANUAL',
        items: validItems.map((i) => ({
          type: i.type,
          recipeId: i.recipeId || null,
          productId: i.productId || null,
          quantity: i.quantity,
          notes: i.notes || null,
        })),
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success('Sale recorded');
      router.push('/sales');
    } catch {
      toast.error('Failed to record sale');
    } finally {
      setSaving(false);
    }
  };

  const needsRecipe = (type: string) => type === 'COCKTAIL';
  const needsProduct = (type: string) => ['SHOT', 'NEAT', 'BOTTLE'].includes(type);

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/sales')} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-[0.15em] uppercase text-foreground">Record Sales</h1>
        </div>
        <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Sale Header */}
      <Card className="p-6 bg-card/40 border-border mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-muted-foreground">Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="bg-card/50 border-border" />
          </div>
          <div>
            <Label className="text-muted-foreground">Shift</Label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
            >
              <option value="">Select shift</option>
              {SALE_SHIFTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="bg-card/50 border-border" rows={1} />
          </div>
        </div>
      </Card>

      {/* Sale Items */}
      <Card className="p-6 bg-card/40 border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground">Sale Items</h2>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="border-border text-muted-foreground">
            <Plus className="h-3 w-3 mr-1" />
            Add Item
          </Button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-card/30 border border-border">
              <div className="w-full sm:w-32">
                <Label className="text-muted-foreground text-xs">Type</Label>
                <select
                  value={item.type}
                  onChange={(e) => updateItem(index, 'type', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
                >
                  {SALE_ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1">
                <Label className="text-muted-foreground text-xs">
                  {needsRecipe(item.type) ? 'Recipe' : 'Product'}
                </Label>
                {needsRecipe(item.type) ? (
                  <select
                    value={item.recipeId}
                    onChange={(e) => updateItem(index, 'recipeId', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
                  >
                    <option value="">Select recipe</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(index, 'productId', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.brand} {p.productName}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="w-20">
                <Label className="text-muted-foreground text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="bg-card/50 border-border font-mono"
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 1}
                  className="text-muted-foreground hover:text-destructive px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </form>
  );
}
