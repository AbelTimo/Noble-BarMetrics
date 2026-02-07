import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const brand = searchParams.get('brand') || '';
    const category = searchParams.get('category') || '';
    const sizeMl = searchParams.get('sizeMl');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};

    // Search across brand and product name
    // Note: SQLite doesn't support mode: 'insensitive', so we use contains without it
    // For PostgreSQL in production, you can add mode: 'insensitive'
    if (search) {
      where.OR = [
        { brand: { contains: search } },
        { productName: { contains: search } },
      ];
    }

    if (brand) {
      where.brand = { contains: brand };
    }

    if (category) {
      where.category = category;
    }

    if (sizeMl) {
      where.sizeMl = parseInt(sizeMl);
    }

    const bottles = await prisma.bottleWeightDatabase.findMany({
      where,
      orderBy: [
        { verified: 'desc' }, // Verified bottles first
        { brand: 'asc' },
        { productName: 'asc' },
        { sizeMl: 'asc' },
      ],
      take: limit,
    });

    return NextResponse.json(bottles);
  } catch (error) {
    console.error('Error fetching bottle weights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bottle weights' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brand,
      productName,
      category,
      sizeMl,
      tareWeightG,
      fullWeightG,
      abvPercent,
      upc,
      manufacturer,
      countryOfOrigin,
      bottleType,
      notes,
    } = body;

    // Validation
    if (!brand || !productName || !category || !sizeMl || !tareWeightG) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const bottle = await prisma.bottleWeightDatabase.create({
      data: {
        brand,
        productName,
        category,
        sizeMl: parseInt(sizeMl),
        tareWeightG: parseFloat(tareWeightG),
        fullWeightG: fullWeightG ? parseFloat(fullWeightG) : null,
        abvPercent: abvPercent ? parseFloat(abvPercent) : null,
        upc,
        manufacturer,
        countryOfOrigin,
        bottleType,
        notes,
        source: 'user',
        verified: false,
      },
    });

    return NextResponse.json(bottle, { status: 201 });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Bottle weight entry already exists for this brand, product, and size' },
        { status: 409 }
      );
    }

    console.error('Error creating bottle weight:', error);
    return NextResponse.json(
      { error: 'Failed to create bottle weight' },
      { status: 500 }
    );
  }
}
