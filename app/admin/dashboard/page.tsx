import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import {
  ShoppingCart,
  DollarSign,
  Package,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Order } from '@/models/Order';
import { Product } from '@/models/Product';
import { Review } from '@/models/Review';
import { Inventory } from '@/models/Inventory';
import { StatCard } from '../_components/stat-card';
import { RevenueChart } from '../_components/revenue-chart';
import type { IOrder } from '@/models/Order';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  PACKED: 'bg-purple-100 text-purple-800',
  SHIPPED: 'bg-cyan-100 text-cyan-800',
  OUT_FOR_DELIVERY: 'bg-teal-100 text-teal-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUND_PENDING: 'bg-orange-100 text-orange-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
  RETURN_REQUESTED: 'bg-rose-100 text-rose-800',
  RETURNED: 'bg-slate-100 text-slate-800',
};

export default async function DashboardPage() {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

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
    Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
    Product.countDocuments({}),
    Review.countDocuments({ status: 'PENDING' }),
    Inventory.countDocuments({
      $expr: { $lte: ['$availableQuantity', '$lowStockThreshold'] },
    }),
    Order.find({}).sort({ createdAt: -1 }).limit(10).lean<IOrder[]>(),
    Order.aggregate([
      {
        $match: {
          status: { $in: ['DELIVERED', 'CONFIRMED'] },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalRevenue: number = revenueResult[0]?.total ?? 0;
  const dailyRevenue: { date: string; revenue: number }[] = dailyRevenueRaw.map(
    (d: { _id: string; revenue: number }) => ({ date: d._id, revenue: d.revenue })
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Orders"
          value={totalOrders}
          icon={ShoppingCart}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
        />
        <StatCard
          label="Total Products"
          value={totalProducts}
          icon={Package}
        />
        <StatCard
          label="Pending Reviews"
          value={pendingReviews}
          icon={MessageSquare}
        />
        <StatCard
          label="Low Stock Items"
          value={lowStockCount}
          icon={AlertTriangle}
        />
      </div>

      {/* Revenue chart */}
      <RevenueChart data={dailyRevenue} />

      {/* Recent orders */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3">Order #</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Total</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-gray-400"
                  >
                    No orders yet.
                  </td>
                </tr>
              )}
              {recentOrders.map((order) => (
                <tr
                  key={String(order._id)}
                  className="hover:bg-gray-50"
                >
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">
                    {order.orderNumber}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {order.items.length}
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
