import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Order, User, ProductVariant } from '@/models';
import { ORDER_STATUSES } from '@/lib/constants';
import { OrderService } from '@/lib/services/OrderService';
import type { ApiResponse, OrderStatus } from '@/types';

const VALID_STATUSES = Object.values(ORDER_STATUSES) as OrderStatus[];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Invalid order ID' } },
        { status: 400 }
      );
    }

    await dbConnect();

    // Ensure models are registered for populate
    void User;
    void ProductVariant;

    const order = await Order.findById(id)
      .populate('customerId', 'firstName lastName email phone')
      .populate('items.productVariantId', 'sku name')
      .lean();

    if (!order) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Order not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<typeof order>>({ success: true, data: order });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/orders/[id] GET]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    const admin = await verifyAdminAccess(userId);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Invalid order ID' } },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const status = body?.status;

    if (typeof status !== 'string' || !VALID_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Invalid order status' } },
        { status: 400 }
      );
    }

    await dbConnect();

    const order = await OrderService.updateOrderStatus(id, status, String(admin._id));

    if (!order) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Order not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ _id: string; status: string }>>({
      success: true,
      data: { _id: String(order._id), status: order.status },
    });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/orders/[id] PUT]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
