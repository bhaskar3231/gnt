import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Product, ProductVariant, Category, type IProduct, type IProductVariant, type ICategory } from '@/models';
import { ProductForm, type CategoryOption, type InitialProductData } from '../../_components/product-form';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    notFound();
  }

  await dbConnect();

  const [productRaw, variantsRaw, categoriesRaw] = await Promise.all([
    Product.findById(id).lean<IProduct | null>(),
    ProductVariant.find({ productId: id }).lean<IProductVariant[]>(),
    Category.find({ isActive: true })
      .select('_id name slug')
      .sort({ name: 1 })
      .lean<ICategory[]>(),
  ]);

  if (!productRaw) {
    notFound();
  }

  const categories: CategoryOption[] = (categoriesRaw || []).map((cat) => ({
    _id: String(cat._id),
    name: cat.name,
    slug: cat.slug,
  }));

  const initialData: InitialProductData = {
    product: {
      _id: String(productRaw._id),
      name: productRaw.name,
      slug: productRaw.slug,
      shortDescription: productRaw.shortDescription || '',
      description: productRaw.description || '',
      type: productRaw.type,
      categoryIds: productRaw.categoryIds?.map((cId: mongoose.Types.ObjectId) => String(cId)) || [],
      tags: productRaw.tags || [],
      images: productRaw.images || [],
      thumbnail: productRaw.thumbnail || '',
      status: productRaw.status,
      featured: productRaw.featured || false,
      bestSeller: productRaw.bestSeller || false,
      newArrival: productRaw.newArrival || false,
    },
    variants: (variantsRaw || []).map((v) => ({
      _id: String(v._id),
      sku: v.sku,
      name: v.name,
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? null,
      inventory: v.inventory,
    })),
  };

  return (
    <ProductForm
      mode="edit"
      productId={id}
      initialData={initialData}
      categories={categories}
    />
  );
}
