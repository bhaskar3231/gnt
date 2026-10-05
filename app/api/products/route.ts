import dbConnect from '@/lib/db';
import { ProductRepository } from '@/repositories/ProductRepository';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const featured = searchParams.get('featured') === 'true';
    const bestSeller = searchParams.get('bestSeller') === 'true';
    const newArrival = searchParams.get('newArrival') === 'true';

    let result;

    if (featured) {
      const products = await ProductRepository.getFeatured(limit);
      result = { data: products, total: products.length };
    } else if (bestSeller) {
      const products = await ProductRepository.getBestSellers(limit);
      result = { data: products, total: products.length };
    } else if (newArrival) {
      const products = await ProductRepository.getNewArrivals(limit);
      result = { data: products, total: products.length };
    } else {
      result = await ProductRepository.findAll({}, { skip: (page - 1) * limit, limit });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        total: result.total,
        page,
        limit,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}