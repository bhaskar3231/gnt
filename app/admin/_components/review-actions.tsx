'use client';

import React, { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';

type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_COLORS: Record<ReviewStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

interface ReviewActionsProps {
  reviewId: string;
  status: ReviewStatus;
}

/**
 * Renders the status badge + Approve/Reject buttons for a review row.
 * Uses optimistic UI so the badge updates immediately while the request is in flight.
 */
export function ReviewActions({ reviewId, status }: ReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<ReviewStatus, ReviewStatus>(
    status,
    (_current, next) => next
  );
  const [error, setError] = useState<string | null>(null);

  const moderate = (next: ReviewStatus) => {
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      try {
        const res = await fetch('/api/admin/reviews', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: reviewId, status: next }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to update review');
        }
        router.refresh();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to update review');
      }
    });
  };

  return (
    <div className="flex items-center justify-end gap-3">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[optimisticStatus]}`}
      >
        {optimisticStatus}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => moderate('APPROVED')}
          disabled={isPending || optimisticStatus === 'APPROVED'}
          className="inline-flex items-center rounded-md border border-green-200 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-40"
          title="Approve"
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          Approve
        </button>
        <button
          type="button"
          onClick={() => moderate('REJECTED')}
          disabled={isPending || optimisticStatus === 'REJECTED'}
          className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
          title="Reject"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Reject
        </button>
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
