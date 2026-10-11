import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Plus, Tag, Edit } from 'lucide-react';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Coupon, type ICoupon } from '@/models';

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

export default async function CouponsPage() {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  await dbConnect();

  const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean<ICoupon[]>();
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Coupons</h1>
          <p className="text-xs text-gray-500 mt-0.5">Create and manage discount codes.</p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Coupon
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Value</th>
                <th className="px-5 py-3.5">Min Order</th>
                <th className="px-5 py-3.5">Uses / Max</th>
                <th className="px-5 py-3.5">Expiry</th>
                <th className="px-5 py-3.5">Active</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400">
                    <Tag className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="font-medium text-gray-500">No coupons yet</p>
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const expired = new Date(c.endAt) < now;
                  const id = String(c._id);
                  return (
                    <tr key={id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono font-medium text-gray-900">
                        <Link href={`/admin/coupons/${id}`} className="hover:text-indigo-600">
                          {c.code}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {c.discountType}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {c.discountType === 'PERCENTAGE'
                          ? `${c.discountValue}%`
                          : formatCurrency(c.discountValue)}
                      </td>
                      <td className="px-5 py-3">{formatCurrency(c.minimumOrder)}</td>
                      <td className="px-5 py-3">
                        {c.usedCount ?? 0} / {c.usageLimit ?? '∞'}
                      </td>
                      <td className={`px-5 py-3 ${expired ? 'text-red-600' : ''}`}>
                        {formatDate(c.endAt)}
                        {expired && <span className="ml-1 text-xs">(expired)</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {c.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/admin/coupons/${id}`}
                          className="inline-flex p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Edit Coupon"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
