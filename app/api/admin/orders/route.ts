import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Order } from '@/models';
import { ORDER_STATUSES } from '@/lib/constants';
import type { ApiResponse, OrderStatus, PaginationResult } from '@/types';

const VALID_STATUSES = Object.values(ORDER_STATUSES) as OrderStatus[];

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const status = searchParams.get('status')?.trim() || '';
    const search = searchParams.get('search')?.trim().slice(0, 100) || '';

    const query: Record<string, unknown> = {};

    if (status) {
      if (!VALID_STATUSES.includes(status as OrderStatus)) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { message: 'Invalid status filter' } },
          { status: 400 }
        );
      }
      query.status = status;
    }

    if (search) {
      query.orderNumber = { $regex: escapeRegex(search), $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    const result: PaginationResult<(typeof orders)[number]> = {
      data: orders,
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
    console.error('[admin/orders GET]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
