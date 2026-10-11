import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Coupon, type ICoupon } from '@/models';
import { CouponForm, type InitialCouponData } from '../../_components/coupon-form';

interface EditCouponPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCouponPage({ params }: EditCouponPageProps) {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  await dbConnect();

  const coupon = await Coupon.findById(id).lean<ICoupon | null>();
  if (!coupon) notFound();

  const initialData: InitialCouponData = {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrder: coupon.minimumOrder ?? null,
    maximumDiscount: coupon.maximumDiscount ?? null,
    usageLimit: coupon.usageLimit ?? null,
    perCustomerLimit: coupon.perCustomerLimit ?? null,
    startAt: new Date(coupon.startAt).toISOString(),
    endAt: new Date(coupon.endAt).toISOString(),
    active: coupon.active,
  };

  return <CouponForm mode="edit" couponId={id} initialData={initialData} />;
}
