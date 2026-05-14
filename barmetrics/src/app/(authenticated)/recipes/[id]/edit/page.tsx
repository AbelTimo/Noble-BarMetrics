'use client';

import { use } from 'react';
import { RecipeForm } from '@/components/recipes/recipe-form';

export default function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="container mx-auto py-8 px-4">
      <RecipeForm recipeId={id} />
    </div>
  );
}
