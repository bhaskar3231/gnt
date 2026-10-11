import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Review, Product, User } from '@/models';
import type { ApiResponse, PaginationResult } from '@/types';

const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

function errorResponse(message: string, status: number) {
  return NextResponse.json<ApiResponse<never>>({ success: false, error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    if (status && !REVIEW_STATUSES.includes(status)) {
      return errorResponse('Invalid status filter', 400);
    }

    await dbConnect();
    void Product;
    void User;

    const query: Record<string, unknown> = status ? { status } : {};

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('productId', 'name slug')
        .populate('customerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);

    const result: PaginationResult<(typeof reviews)[number]> = {
      data: reviews,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };

    return NextResponse.json<ApiResponse<typeof result>>({ success: true, data: result });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/reviews GET]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const body = await request.json().catch(() => ({}));
    const { id, status } = body ?? {};

    if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
      return errorResponse('Invalid review ID', 400);
    }
    if (typeof status !== 'string' || !REVIEW_STATUSES.includes(status)) {
      return errorResponse('Invalid review status', 400);
    }

    await dbConnect();

    const review = await Review.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!review) return errorResponse('Review not found', 404);

    return NextResponse.json<ApiResponse<typeof review>>({ success: true, data: review });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/reviews PUT]', err);
    return errorResponse('Internal server error', 500);
  }
}
