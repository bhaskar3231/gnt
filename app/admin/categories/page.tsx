import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Category, type ICategory } from '@/models';
import { CategoryManager, type CategoryRow } from '../_components/category-manager';

export default async function CategoriesPage() {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  await dbConnect();

  const raw = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean<ICategory[]>();
  const nameById = new Map(raw.map((c) => [String(c._id), c.name]));

  const categories: CategoryRow[] = raw.map((c) => {
    const parentId = c.parentId ? String(c.parentId) : null;
    return {
      _id: String(c._id),
      name: c.name,
      slug: c.slug,
      parentId,
      parentName: parentId ? nameById.get(parentId) ?? null : null,
      type: c.type,
      isActive: c.isActive,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Categories</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Organise products into categories and subcategories.
        </p>
      </div>
      <CategoryManager categories={categories} />
    </div>
  );
}
