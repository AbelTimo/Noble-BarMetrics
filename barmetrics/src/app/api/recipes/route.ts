import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { recipeCreateSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};

    if (search) {
      where.name = { contains: search };
    }

    if (category) {
      where.category = category;
    }

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        ingredients: {
          include: {
            product: {
              select: { id: true, brand: true, productName: true, category: true, abvPercent: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = recipeCreateSchema.parse(body);

    const { ingredients, ...recipeData } = validated;

    const recipe = await prisma.recipe.create({
      data: {
        ...recipeData,
        ingredients: {
          create: ingredients.map((ing) => ({
            productId: ing.productId,
            quantityMl: ing.quantityMl,
          })),
        },
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

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error('Error creating recipe:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
