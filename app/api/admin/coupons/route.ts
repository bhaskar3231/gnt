import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { couponInputSchema, toCouponDocument } from '@/lib/admin-coupon';
import { Coupon } from '@/models';
import type { ApiResponse } from '@/types';

export async function GET() {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    await dbConnect();

    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json<ApiResponse<typeof coupons>>({ success: true, data: coupons });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/coupons GET]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const body = await request.json().catch(() => ({}));
    const parsed = couponInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: parsed.error.issues[0]?.message || 'Invalid input' } },
        { status: 400 }
      );
    }

    await dbConnect();

    if (await Coupon.findOne({ code: parsed.data.code })) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'A coupon with this code already exists' } },
        { status: 400 }
      );
    }

    const coupon = await Coupon.create(toCouponDocument(parsed.data));

    return NextResponse.json<ApiResponse<typeof coupon>>(
      { success: true, data: coupon },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/coupons POST]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
