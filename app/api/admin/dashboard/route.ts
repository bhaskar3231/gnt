import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Order } from '@/models/Order';
import { Product } from '@/models/Product';
import { Review } from '@/models/Review';
import { Inventory } from '@/models/Inventory';
import type { ApiResponse } from '@/types';

export interface DashboardData {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  pendingReviews: number;
  lowStockCount: number;
  recentOrders: Record<string, unknown>[];
  dailyRevenue: { date: string; revenue: number }[];
}

export async function GET() {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    await dbConnect();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalOrders,
      revenueResult,
      totalProducts,
      pendingReviews,
      lowStockCount,
      recentOrders,
      dailyRevenueRaw,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.aggregate([
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Product.countDocuments({}),
      Review.countDocuments({ status: 'PENDING' }),
      Inventory.countDocuments({
        $expr: { $lte: ['$availableQuantity', '$lowStockThreshold'] },
      }),
      Order.find({}).sort({ createdAt: -1 }).limit(10).lean(),
      Order.aggregate([
        {
          $match: {
            status: { $in: ['DELIVERED', 'CONFIRMED'] },
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            revenue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const dailyRevenue: { date: string; revenue: number }[] =
      dailyRevenueRaw.map((d: { _id: string; revenue: number }) => ({
        date: d._id,
        revenue: d.revenue,
      }));

    const data: DashboardData = {
      totalOrders,
      totalRevenue: revenueResult[0]?.total ?? 0,
      totalProducts,
      pendingReviews,
      lowStockCount,
      recentOrders: recentOrders as Record<string, unknown>[],
      dailyRevenue,
    };

    return NextResponse.json<ApiResponse<DashboardData>>({
      success: true,
      data,
    });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/dashboard]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
