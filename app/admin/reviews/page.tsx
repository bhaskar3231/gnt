import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Star, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Review, Product, User } from '@/models';
import { ReviewActions } from '../_components/review-actions';

const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function truncate(text: string, max = 100): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

function buildHref(status: string, page?: number): string {
  const sp = new URLSearchParams();
  if (status) sp.set('status', status);
  if (page && page > 1) sp.set('page', String(page));
  const qs = sp.toString();
  return `/admin/reviews${qs ? `?${qs}` : ''}`;
}

interface ReviewsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface ProductRef {
  _id: unknown;
  name?: string;
  slug?: string;
}

interface CustomerRef {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  await dbConnect();
  void Product;
  void User;

  const resolvedParams = await searchParams;
  const rawStatus = typeof resolvedParams.status === 'string' ? resolvedParams.status : 'PENDING';
  const status = (REVIEW_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : '';
  const page = Math.max(1, parseInt((resolvedParams.page as string) || '1', 10) || 1);
  const limit = 20;

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

  const totalPages = Math.ceil(total / limit) || 1;
  const tabs = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ALL', label: 'All' },
  ];
  const activeTab = status || 'ALL';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Reviews</h1>
        <p className="text-xs text-gray-500 mt-0.5">Moderate customer product reviews.</p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-3">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={buildHref(tab.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab.value === activeTab
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Product</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Rating</th>
                <th className="px-5 py-3.5">Comment</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5 text-right">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <MessageSquare className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="font-medium text-gray-500">No reviews found</p>
                  </td>
                </tr>
              ) : (
                reviews.map((review) => {
                  const product = review.productId as ProductRef | null;
                  const customer = review.customerId as CustomerRef | null;
                  const customerName = customer
                    ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
                      customer.email ||
                      '—'
                    : '—';
                  return (
                    <tr key={String(review._id)} className="hover:bg-gray-50/80 transition-colors align-top">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {product ? (
                          <Link
                            href={`/admin/products/${String(product._id)}`}
                            className="hover:text-indigo-600"
                          >
                            {product.name}
                          </Link>
                        ) : (
                          <span className="text-gray-400">Deleted product</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-gray-900">{customerName}</div>
                        {review.verified && (
                          <div className="text-xs text-green-600">Verified buyer</div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Stars rating={review.rating} />
                      </td>
                      <td className="px-5 py-3 max-w-sm">
                        {review.title && (
                          <div className="font-medium text-gray-900">{review.title}</div>
                        )}
                        <div className="text-gray-600" title={review.comment}>
                          {truncate(review.comment || '')}
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">{formatDate(review.createdAt)}</td>
                      <td className="px-5 py-3">
                        <ReviewActions
                          reviewId={String(review._id)}
                          status={review.status as ReviewStatus}
                        />
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
                href={buildHref(activeTab, page - 1)}
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
                href={buildHref(activeTab, page + 1)}
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
