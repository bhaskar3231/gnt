import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Order, User } from '@/models';
import { ORDER_STATUSES } from '@/lib/constants';
import type { OrderStatus } from '@/types';
import { ProductSearch } from '../_components/product-search';
import { OrderStatusBadge } from '../_components/order-status-badge';

const VALID_STATUSES = Object.values(ORDER_STATUSES) as OrderStatus[];

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHref(params: { status?: string; search?: string; page?: number }): string {
  const sp = new URLSearchParams();
  if (params.status) sp.set('status', params.status);
  if (params.search) sp.set('search', params.search);
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  const qs = sp.toString();
  return `/admin/orders${qs ? `?${qs}` : ''}`;
}

interface OrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface CustomerRef {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  await dbConnect();
  void User;

  const resolvedParams = await searchParams;
  const search =
    typeof resolvedParams.search === 'string' ? resolvedParams.search.trim().slice(0, 100) : '';
  const rawStatus = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';
  const status = VALID_STATUSES.includes(rawStatus as OrderStatus) ? rawStatus : '';
  const page = Math.max(1, parseInt((resolvedParams.page as string) || '1', 10) || 1);
  const limit = 20;

  const query: Record<string, unknown> = {};
  if (status) query.status = status;
  if (search) query.orderNumber = { $regex: escapeRegex(search), $options: 'i' };

  const [orders, total] = await Promise.all([
    Order.find(query)
      .populate('customerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;
  const tabs = [{ value: '', label: 'All' }, ...VALID_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Orders</h1>
        <p className="text-xs text-gray-500 mt-0.5">View and manage customer orders.</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-3">
        {tabs.map((tab) => {
          const active = tab.value === status;
          return (
            <Link
              key={tab.value || 'ALL'}
              href={buildHref({ status: tab.value, search })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <ProductSearch placeholder="Search by order number..." />
        <span className="text-xs text-gray-500 hidden sm:inline-block">
          Showing {orders.length} of {total} orders
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Order #</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <ShoppingCart className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="font-medium text-gray-500">No orders found</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const customer = order.customerId as CustomerRef | null;
                  const customerName = customer
                    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
                      customer.email ||
                      '—'
                    : order.shippingAddress?.name || '—';
                  return (
                    <tr key={String(order._id)} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs">
                        <Link
                          href={`/admin/orders/${String(order._id)}`}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-gray-900">{customerName}</div>
                        {customer?.email && (
                          <div className="text-xs text-gray-400">{customer.email}</div>
                        )}
                      </td>
                      <td className="px-5 py-3">{formatDate(order.createdAt)}</td>
                      <td className="px-5 py-3">{order.items?.length ?? 0}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {order.payment?.method || '—'} · {order.payment?.status || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
            <div className="text-xs text-gray-500">
              Page <span className="font-medium text-gray-800">{page}</span> of{' '}
              <span className="font-medium text-gray-800">{totalPages}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={buildHref({ status, search, page: page - 1 })}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
                className={`inline-flex items-center px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 ${
                  page <= 1 ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Previous
              </Link>
              <Link
                href={buildHref({ status, search, page: page + 1 })}
                aria-disabled={page >= totalPages}
                tabIndex={page >= totalPages ? -1 : undefined}
                className={`inline-flex items-center px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 ${
                  page >= totalPages ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                Next
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
