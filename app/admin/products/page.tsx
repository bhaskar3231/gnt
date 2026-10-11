import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Plus, Package, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Product, ProductVariant, Category } from '@/models';
import { ProductSearch } from '../_components/product-search';
import { DeleteProductButton } from '../_components/delete-product-button';

function formatCurrency(value?: number): string {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  await dbConnect();

  // Ensure models are registered for populate
  void Category;
  void ProductVariant;

  const resolvedParams = await searchParams;
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search.trim() : '';
  const page = Math.max(1, parseInt((resolvedParams.page as string) || '1', 10));
  const limit = 20;

  const query: Record<string, unknown> = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate('categoryIds', 'name slug')
      .populate('variantIds')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Products</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your store&apos;s product inventory and pricing.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Product
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <ProductSearch />
        <span className="text-xs text-gray-500 hidden sm:inline-block">
          Showing {products.length} of {total} products
        </span>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5 w-16">Image</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Price</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                    <Package className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="font-medium text-gray-500">No products found</p>
                    {search ? (
                      <p className="text-xs text-gray-400 mt-1">
                        Try adjusting your search terms.
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">
                        Get started by adding your first product.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const primaryImage =
                    product.thumbnail ||
                    product.images?.[0]?.url ||
                    (Array.isArray(product.images) && product.images[0]?.url) ||
                    null;

                  const firstVariant = Array.isArray(product.variantIds)
                    ? (product.variantIds[0] as { price?: number; compareAtPrice?: number } | undefined)
                    : undefined;

                  const categories = Array.isArray(product.categoryIds)
                    ? (product.categoryIds as Array<{ _id: string; name: string }>)
                    : [];

                  const categoryNames = categories
                    .map((c) => (typeof c === 'object' ? c.name : ''))
                    .filter(Boolean)
                    .join(', ');

                  const isActive = product.status === 'ACTIVE';

                  return (
                    <tr
                      key={String(product._id)}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="h-11 w-11 rounded-md border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                          {primaryImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={primaryImage}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-gray-300" />
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">
                          <Link
                            href={`/admin/products/${String(product._id)}`}
                            className="hover:text-indigo-600 transition-colors"
                          >
                            {product.name}
                          </Link>
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          /{product.slug}
                        </div>
                      </td>

                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {product.type || 'GENERAL'}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-sm text-gray-600">
                        {categoryNames || '—'}
                      </td>

                      <td className="px-5 py-3 font-medium text-gray-900">
                        {formatCurrency(firstVariant?.price)}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <Link
                            href={`/admin/products/${String(product._id)}`}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <DeleteProductButton
                            productId={String(product._id)}
                            productName={product.name}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
            <div className="text-xs text-gray-500">
              Page <span className="font-medium text-gray-800">{page}</span> of{' '}
              <span className="font-medium text-gray-800">{totalPages}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Link
                href={`/admin/products?page=${page - 1}${
                  search ? `&search=${encodeURIComponent(search)}` : ''
                }`}
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
                href={`/admin/products?page=${page + 1}${
                  search ? `&search=${encodeURIComponent(search)}` : ''
                }`}
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
