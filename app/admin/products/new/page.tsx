import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Category } from '@/models';
import { ProductForm, type CategoryOption } from '../../_components/product-form';

export default async function NewProductPage() {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  await dbConnect();

  const categoriesRaw = await Category.find({ isActive: true })
    .select('_id name slug')
    .sort({ name: 1 })
    .lean();

  const categories: CategoryOption[] = categoriesRaw.map((cat) => ({
    _id: String(cat._id),
    name: cat.name,
    slug: cat.slug,
  }));

  return <ProductForm mode="create" categories={categories} />;
}
