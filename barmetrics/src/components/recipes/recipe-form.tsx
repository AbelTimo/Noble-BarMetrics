'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';
import { RECIPE_CATEGORIES, RECIPE_METHODS } from '@/lib/validations';
import { toast } from 'sonner';

interface Product {
  id: string;
  brand: string;
  productName: string;
  category: string;
  abvPercent: number;
}

interface IngredientRow {
  productId: string;
  quantityMl: number;
}

interface RecipeFormProps {
  recipeId?: string;
}

export function RecipeForm({ recipeId }: RecipeFormProps) {
  const router = useRouter();
  const isEditing = !!recipeId;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('COCKTAIL');
  const [description, setDescription] = useState('');
  const [glassType, setGlassType] = useState('');
  const [garnish, setGarnish] = useState('');
  const [method, setMethod] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ productId: '', quantityMl: 30 }]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const productsRes = await fetch('/api/products?isActive=true');
        if (productsRes.ok) setProducts(await productsRes.json());

        if (recipeId) {
          const recipeRes = await fetch(`/api/recipes/${recipeId}`);
          if (recipeRes.ok) {
            const recipe = await recipeRes.json();
            setName(recipe.name);
            setCategory(recipe.category);
            setDescription(recipe.description || '');
            setGlassType(recipe.glassType || '');
            setGarnish(recipe.garnish || '');
            setMethod(recipe.method || '');
            setIngredients(
              recipe.ingredients.map((i: { productId: string; quantityMl: number }) => ({
                productId: i.productId,
                quantityMl: i.quantityMl,
              }))
            );
          }
        }
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [recipeId]);

  const addIngredient = () => {
    setIngredients([...ingredients, { productId: '', quantityMl: 30 }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length <= 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof IngredientRow, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validIngredients = ingredients.filter((i) => i.productId && i.quantityMl > 0);
    if (validIngredients.length === 0) {
      toast.error('Add at least one ingredient');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        category,
        description: description || null,
        glassType: glassType || null,
        garnish: garnish || null,
        method: method || null,
        ingredients: validIngredients,
      };

      const url = isEditing ? `/api/recipes/${recipeId}` : '/api/recipes';
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save');
      }

      toast.success(isEditing ? 'Recipe updated' : 'Recipe created');
      router.push('/recipes');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const totalMl = ingredients.reduce((sum, i) => sum + (i.quantityMl || 0), 0);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/recipes')} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-[0.15em] uppercase text-foreground">
            {isEditing ? 'Edit Recipe' : 'New Recipe'}
          </h1>
        </div>
        <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recipe Details */}
        <Card className="p-6 bg-card/40 border-border">
          <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground mb-4">Details</h2>

          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Margarita" required className="bg-card/50 border-border" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Category *</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
                >
                  {RECIPE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-muted-foreground">Method</Label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
                >
                  <option value="">Select method</option>
                  {RECIPE_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Glass Type</Label>
                <Input value={glassType} onChange={(e) => setGlassType(e.target.value)} placeholder="e.g. Rocks glass" className="bg-card/50 border-border" />
              </div>
              <div>
                <Label className="text-muted-foreground">Garnish</Label>
                <Input value={garnish} onChange={(e) => setGarnish(e.target.value)} placeholder="e.g. Lime wedge" className="bg-card/50 border-border" />
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" className="bg-card/50 border-border" rows={3} />
            </div>
          </div>
        </Card>

        {/* Ingredients */}
        <Card className="p-6 bg-card/40 border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-muted-foreground">Ingredients</h2>
            <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="border-border text-muted-foreground">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-3">
            {ingredients.map((ing, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  {index === 0 && <Label className="text-muted-foreground text-xs">Product</Label>}
                  <select
                    value={ing.productId}
                    onChange={(e) => updateIngredient(index, 'productId', e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-border bg-card/50 text-sm text-foreground"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.brand} {p.productName} ({p.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  {index === 0 && <Label className="text-muted-foreground text-xs">ml</Label>}
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={ing.quantityMl}
                    onChange={(e) => updateIngredient(index, 'quantityMl', parseFloat(e.target.value) || 0)}
                    className="bg-card/50 border-border font-mono"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length <= 1}
                  className="text-muted-foreground hover:text-destructive px-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border flex justify-between">
            <span className="text-sm text-muted-foreground">Total pour</span>
            <span className="font-mono font-bold text-foreground text-lg">{totalMl} ml</span>
          </div>
        </Card>
      </div>
    </form>
  );
}
