import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { CouponForm } from '../../_components/coupon-form';

export default async function NewCouponPage() {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  return <CouponForm mode="create" />;
}
