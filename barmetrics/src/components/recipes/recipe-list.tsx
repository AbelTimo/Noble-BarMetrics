'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Wine, Trash2 } from 'lucide-react';
import { RECIPE_CATEGORIES } from '@/lib/validations';
import { toast } from 'sonner';

interface RecipeIngredient {
  id: string;
  quantityMl: number;
  product: {
    id: string;
    brand: string;
    productName: string;
    category: string;
  };
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  description: string | null;
  method: string | null;
  glassType: string | null;
  isActive: boolean;
  ingredients: RecipeIngredient[];
}

export function RecipeList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchRecipes = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/recipes?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRecipes(data);
    } catch {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [search, categoryFilter]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete recipe "${name}"?`)) return;
    try {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Recipe deleted');
      fetchRecipes();
    } catch {
      toast.error('Failed to delete recipe');
    }
  };

  const totalMl = (ingredients: RecipeIngredient[]) =>
    ingredients.reduce((sum, i) => sum + i.quantityMl, 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.15em] uppercase text-[#3E3226]">Recipes</h1>
          <p className="text-sm text-[#3E3226]/60 mt-1">Cocktail recipes for variance calculation</p>
        </div>
        <Button asChild className="bg-[#3E3226] hover:bg-[#3E3226]/90 text-[#F5F0E8]">
          <Link href="/recipes/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Recipe
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3E3226]/40" />
          <Input
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/50 border-[#3E3226]/20"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-md border border-[#3E3226]/20 bg-white/50 text-sm text-[#3E3226]"
        >
          <option value="">All Categories</option>
          {RECIPE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#3E3226]/50">Loading recipes...</div>
      ) : recipes.length === 0 ? (
        <Card className="p-12 text-center bg-white/30 border-[#3E3226]/10">
          <Wine className="h-12 w-12 mx-auto mb-4 text-[#3E3226]/30" />
          <h3 className="text-lg font-semibold text-[#3E3226]/70 mb-2">No recipes yet</h3>
          <p className="text-sm text-[#3E3226]/50 mb-4">Add cocktail recipes to enable variance tracking</p>
          <Button asChild className="bg-[#3E3226] hover:bg-[#3E3226]/90 text-[#F5F0E8]">
            <Link href="/recipes/new">
              <Plus className="h-4 w-4 mr-2" />
              Add First Recipe
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}/edit`}>
              <Card className="p-5 bg-white/40 border-[#3E3226]/10 hover:border-[#3E3226]/30 hover:shadow-lg transition-all cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-[#3E3226] text-lg">{recipe.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] border-[#3E3226]/20 text-[#3E3226]/70">
                        {recipe.category.replace(/_/g, ' ')}
                      </Badge>
                      {recipe.method && (
                        <Badge variant="outline" className="text-[10px] border-[#3E3226]/20 text-[#3E3226]/50">
                          {recipe.method}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(recipe.id, recipe.name);
                    }}
                    className="p-1.5 text-[#3E3226]/30 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {recipe.description && (
                  <p className="text-xs text-[#3E3226]/50 mb-3 line-clamp-2">{recipe.description}</p>
                )}

                <div className="space-y-1.5">
                  {recipe.ingredients.map((ing) => (
                    <div key={ing.id} className="flex justify-between text-sm">
                      <span className="text-[#3E3226]/70">{ing.product.brand} {ing.product.productName}</span>
                      <span className="font-mono text-[#3E3226]/90 font-medium">{ing.quantityMl} ml</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-[#3E3226]/10 flex justify-between text-sm">
                  <span className="text-[#3E3226]/50">Total pour</span>
                  <span className="font-mono font-bold text-[#3E3226]">{totalMl(recipe.ingredients)} ml</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
