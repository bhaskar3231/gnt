'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

const optionalNumber = z
  .string()
  .trim()
  .refine((v) => v === '' || (!isNaN(Number(v)) && Number(v) >= 0), 'Must be 0 or higher');

const optionalInt = z
  .string()
  .trim()
  .refine((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1), 'Must be a whole number ≥ 1');

const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Code must be at least 3 characters')
      .max(32, 'Code must be at most 32 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Letters, numbers, - and _ only'),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z
      .string()
      .trim()
      .refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Value must be greater than 0'),
    minimumOrder: optionalNumber,
    maximumDiscount: optionalNumber,
    usageLimit: optionalInt,
    perCustomerLimit: optionalInt,
    startAt: z.string().min(1, 'Start date is required'),
    endAt: z.string().min(1, 'Expiry date is required'),
    active: z.boolean(),
  })
  .refine((d) => d.endAt >= d.startAt, {
    message: 'Expiry cannot be before start date',
    path: ['endAt'],
  })
  .refine((d) => d.discountType !== 'PERCENTAGE' || Number(d.discountValue) <= 100, {
    message: 'Percentage cannot exceed 100',
    path: ['discountValue'],
  });

type CouponFormData = z.infer<typeof couponFormSchema>;

export interface InitialCouponData {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumOrder?: number | null;
  maximumDiscount?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  startAt: string;
  endAt: string;
  active: boolean;
}

interface CouponFormProps {
  mode?: 'create' | 'edit';
  couponId?: string;
  initialData?: InitialCouponData;
}

const inputClass =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function toDateInput(value?: string | Date): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function numToStr(v?: number | null): string {
  return v === undefined || v === null ? '' : String(v);
}

function strToNum(v: string): number | null {
  return v.trim() === '' ? null : Number(v);
}

export function CouponForm({ mode = 'create', couponId, initialData }: CouponFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = toDateInput(new Date());

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormData>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: initialData?.code ?? '',
      discountType: initialData?.discountType ?? 'PERCENTAGE',
      discountValue: numToStr(initialData?.discountValue),
      minimumOrder: numToStr(initialData?.minimumOrder),
      maximumDiscount: numToStr(initialData?.maximumDiscount),
      usageLimit: numToStr(initialData?.usageLimit),
      perCustomerLimit: numToStr(initialData?.perCustomerLimit),
      startAt: toDateInput(initialData?.startAt) || today,
      endAt: toDateInput(initialData?.endAt),
      active: initialData?.active ?? true,
    },
  });

  const discountType = watch('discountType');

  const onSubmit = async (data: CouponFormData) => {
    setErrorMessage(null);

    // End date is inclusive: expire at end of the chosen day
    const endAt = new Date(`${data.endAt}T23:59:59.999`);
    const startAt = new Date(`${data.startAt}T00:00:00`);

    const payload = {
      code: data.code.trim().toUpperCase(),
      discountType: data.discountType,
      discountValue: Number(data.discountValue),
      minimumOrder: strToNum(data.minimumOrder),
      maximumDiscount: strToNum(data.maximumDiscount),
      usageLimit: strToNum(data.usageLimit),
      perCustomerLimit: strToNum(data.perCustomerLimit),
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      active: data.active,
    };

    try {
      const endpoint =
        mode === 'edit' && couponId ? `/api/admin/coupons/${couponId}` : '/api/admin/coupons';
      const res = await fetch(endpoint, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save coupon');
      }
      startTransition(() => {
        router.push('/admin/coupons');
        router.refresh();
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const onDelete = async () => {
    if (!couponId) return;
    if (!window.confirm('Delete this coupon? This cannot be undone.')) return;
    setDeleting(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to delete coupon');
      }
      startTransition(() => {
        router.push('/admin/coupons');
        router.refresh();
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
      setDeleting(false);
    }
  };

  const loading = isSubmitting || isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/coupons"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Coupons
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === 'edit' ? 'Edit Coupon' : 'New Coupon'}
          </h1>
        </div>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || loading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            Delete
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-medium text-red-800">{errorMessage}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              {...register('code')}
              placeholder="e.g. WELCOME10"
              className={`${inputClass} uppercase font-mono`}
            />
            {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code.message}</p>}
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 pb-2">
              <input type="checkbox" {...register('active')} className="rounded border-gray-300" />
              Active
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Discount Type</label>
            <select {...register('discountType')} className={inputClass}>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed amount (₹)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Value {discountType === 'PERCENTAGE' ? '(%)' : '(₹)'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input type="number" step="0.01" {...register('discountValue')} className={inputClass} />
            {errors.discountValue && (
              <p className="mt-1 text-xs text-red-600">{errors.discountValue.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Minimum Order (₹)</label>
            <input type="number" step="0.01" {...register('minimumOrder')} className={inputClass} />
            {errors.minimumOrder && (
              <p className="mt-1 text-xs text-red-600">{errors.minimumOrder.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Maximum Discount (₹)</label>
            <input
              type="number"
              step="0.01"
              {...register('maximumDiscount')}
              className={inputClass}
            />
            {errors.maximumDiscount && (
              <p className="mt-1 text-xs text-red-600">{errors.maximumDiscount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Uses (total)</label>
            <input type="number" step="1" {...register('usageLimit')} className={inputClass} />
            {errors.usageLimit && (
              <p className="mt-1 text-xs text-red-600">{errors.usageLimit.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Max Uses per Customer</label>
            <input type="number" step="1" {...register('perCustomerLimit')} className={inputClass} />
            {errors.perCustomerLimit && (
              <p className="mt-1 text-xs text-red-600">{errors.perCustomerLimit.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input type="date" {...register('startAt')} className={inputClass} />
            {errors.startAt && (
              <p className="mt-1 text-xs text-red-600">{errors.startAt.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Expiry Date <span className="text-red-500">*</span>
            </label>
            <input type="date" {...register('endAt')} className={inputClass} />
            {errors.endAt && <p className="mt-1 text-xs text-red-600">{errors.endAt.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
          <Link
            href="/admin/coupons"
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-60"
          >
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {mode === 'edit' ? 'Save Changes' : 'Create Coupon'}
          </button>
        </div>
      </form>
    </div>
  );
}
