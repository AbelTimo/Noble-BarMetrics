import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { productSkuLinkSchema } from '@/lib/validations';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const productSkus = await prisma.productSKU.findMany({
      where: { skuId: id },
      include: {
        product: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(productSkus);
  } catch (error) {
    console.error('Error fetching SKU products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SKU products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: skuId } = await params;
    const body = await request.json();
    const validated = productSkuLinkSchema.parse(body);

    // Check if SKU exists
    const sku = await prisma.sKU.findUnique({
      where: { id: skuId },
    });

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU not found' },
        { status: 404 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: validated.productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if link already exists
    const existing = await prisma.productSKU.findUnique({
      where: {
        productId_skuId: {
          productId: validated.productId,
          skuId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Product is already linked to this SKU' },
        { status: 400 }
      );
    }

    // If setting as primary, unset other primary links for this SKU
    if (validated.isPrimary) {
      await prisma.productSKU.updateMany({
        where: { skuId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const productSku = await prisma.productSKU.create({
      data: {
        productId: validated.productId,
        skuId,
        isPrimary: validated.isPrimary,
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(productSku, { status: 201 });
  } catch (error) {
    console.error('Error linking product to SKU:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to link product to SKU' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: skuId } = await params;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    await prisma.productSKU.delete({
      where: {
        productId_skuId: {
          productId,
          skuId,
        },
      },
    });

    return NextResponse.json({ message: 'Product unlinked from SKU' });
  } catch (error) {
    console.error('Error unlinking product from SKU:', error);
    return NextResponse.json(
      { error: 'Failed to unlink product from SKU' },
      { status: 500 }
    );
  }
}
