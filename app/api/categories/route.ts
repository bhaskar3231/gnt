import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { CategoryService } from '@/lib/services/CategoryService';
import { PAGINATION } from '@/lib/constants';
import { ApiResponse } from '@/types';

/**
 * GET /api/categories
 * Get all categories with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any[]>>> {
  try {
    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(
      parseInt(searchParams.get('limit') || PAGINATION.DEFAULT_LIMIT.toString(), 10),
      PAGINATION.MAX_LIMIT
    );
    const rootOnly = searchParams.get('rootOnly') === 'true';

    if (page < 1 || limit < 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid pagination parameters',
        },
        { status: 400 }
      );
    }

    let categories;

    if (rootOnly) {
      categories = await CategoryService.getRootCategories();
    } else {
      categories = await CategoryService.getCategories({
        page,
        limit,
      });
    }

    return NextResponse.json({
      success: true,
      data: categories,
      total: categories.length,
      page,
      limit,
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch categories',
      },
      { status: 500 }
    );
  }
}