import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Product } from '@/models/Product';
import { ProductVariant } from '@/models/ProductVariant';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await dbConnect();

    const { slug } = await params;

    const product = await Product.findOne({ slug, status: 'ACTIVE' }).lean();

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const variants = await ProductVariant.find({
      productId: product._id,
      active: true,
    }).lean();

    return NextResponse.json({ success: true, data: { product, variants } });
  } catch (error) {
    console.error('GET /api/products/[slug] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
