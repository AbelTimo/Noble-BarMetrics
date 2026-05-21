import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recipeUpdateSchema } from '@/lib/validations';
import { requirePermission, AuthError } from '@/lib/auth';
import { PERMISSIONS, PermissionError } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            product: {
              select: { id: true, brand: true, productName: true, category: true, abvPercent: true, nominalVolumeMl: true },
            },
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(request, PERMISSIONS.RECIPE_UPDATE);

    const { id } = await params;
    const body = await request.json();
    const validated = recipeUpdateSchema.parse(body);

    const { ingredients, ...recipeData } = validated;

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        ...(ingredients && {
          ingredients: {
            deleteMany: {},
            create: ingredients.map((ing) => ({
              productId: ing.productId,
              quantityMl: ing.quantityMl,
            })),
          },
        }),
      },
      include: {
        ingredients: {
          include: {
            product: {
              select: { id: true, brand: true, productName: true, category: true, abvPercent: true },
            },
          },
        },
      },
    });

    return NextResponse.json(recipe);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error updating recipe:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(request, PERMISSIONS.RECIPE_DELETE);

    const { id } = await params;
    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof PermissionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
