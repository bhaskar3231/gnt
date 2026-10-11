import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { couponInputSchema, toCouponDocument } from '@/lib/admin-coupon';
import { Coupon } from '@/models';
import type { ApiResponse } from '@/types';

function errorResponse(message: string, status: number) {
  return NextResponse.json<ApiResponse<never>>({ success: false, error: { message } }, { status });
}

function handleError(err: unknown, label: string) {
  if (err instanceof Response) {
    return new NextResponse(err.body, { status: err.status });
  }
  console.error(`[admin/coupons/[id] ${label}]`, err);
  return errorResponse('Internal server error', 500);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return errorResponse('Invalid coupon ID', 400);

    await dbConnect();

    const coupon = await Coupon.findById(id).lean();
    if (!coupon) return errorResponse('Coupon not found', 404);

    return NextResponse.json<ApiResponse<typeof coupon>>({ success: true, data: coupon });
  } catch (err) {
    return handleError(err, 'GET');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return errorResponse('Invalid coupon ID', 400);

    const body = await request.json().catch(() => ({}));
    const parsed = couponInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400);
    }

    await dbConnect();

    const clash = await Coupon.findOne({ code: parsed.data.code, _id: { $ne: id } });
    if (clash) return errorResponse('A coupon with this code already exists', 400);

    const coupon = await Coupon.findByIdAndUpdate(id, toCouponDocument(parsed.data), {
      new: true,
      runValidators: true,
    }).lean();
    if (!coupon) return errorResponse('Coupon not found', 404);

    return NextResponse.json<ApiResponse<typeof coupon>>({ success: true, data: coupon });
  } catch (err) {
    return handleError(err, 'PUT');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return errorResponse('Invalid coupon ID', 400);

    await dbConnect();

    const deleted = await Coupon.findByIdAndDelete(id);
    if (!deleted) return errorResponse('Coupon not found', 404);

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: 'Coupon deleted successfully' },
    });
  } catch (err) {
    return handleError(err, 'DELETE');
  }
}
