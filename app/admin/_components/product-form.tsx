'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  ArrowLeft,
  ImageIcon,
} from 'lucide-react';
import Link from 'next/link';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const variantFormSchema = z.object({
  _id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or higher'),
  salePrice: z.number().min(0).optional().nullable(),
  stock: z.number().min(0, 'Stock must be 0 or higher'),
});

const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  slug: z.string().min(1, 'Slug is required'),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['GIFT', 'TREAT', 'CHILDREN', 'GENERAL']),
  categoryId: z.string().optional(),
  tags: z.string().optional(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isBestSeller: z.boolean(),
  isNewArrival: z.boolean(),
  variants: z.array(variantFormSchema).min(1, 'At least one variant is required'),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

export interface CategoryOption {
  _id: string;
  name: string;
  slug?: string;
}

export interface InitialProductData {
  product?: {
    _id?: string;
    name?: string;
    slug?: string;
    shortDescription?: string;
    description?: string;
    type?: 'GIFT' | 'TREAT' | 'CHILDREN' | 'GENERAL';
    categoryIds?: Array<{ _id: string; name: string } | string>;
    tags?: string[];
    images?: Array<{ url: string; alt?: string; sortOrder?: number }>;
    thumbnail?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
    featured?: boolean;
    bestSeller?: boolean;
    newArrival?: boolean;
  };
  variants?: Array<{
    _id?: string;
    sku: string;
    name?: string;
    price: number;
    compareAtPrice?: number | null;
    inventory?: number;
  }>;
}

interface ProductFormProps {
  mode?: 'create' | 'edit';
  productId?: string;
  initialData?: InitialProductData;
  categories?: CategoryOption[];
}

export function ProductForm({
  mode = 'create',
  productId,
  initialData,
  categories: initialCategories,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [categoriesList, setCategoriesList] = useState<CategoryOption[]>(
    initialCategories || []
  );
  const [images, setImages] = useState<string[]>(() => {
    if (initialData?.product?.images && initialData.product.images.length > 0) {
      return initialData.product.images.map((img) => img.url);
    }
    if (initialData?.product?.thumbnail) {
      return [initialData.product.thumbnail];
    }
    return [];
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(mode === 'edit');

  // Load categories if not provided
  useEffect(() => {
    if (!initialCategories || initialCategories.length === 0) {
      fetch('/api/categories')
        .then((res) => res.json())
        .then((json) => {
          if (json.data && Array.isArray(json.data)) {
            setCategoriesList(json.data);
          }
        })
        .catch((err) => {
          console.error('Failed to load categories', err);
        });
    }
  }, [initialCategories]);

  // Determine initial values
  const defaultCategoryId = (() => {
    const cat = initialData?.product?.categoryIds?.[0];
    if (typeof cat === 'object' && cat?._id) return cat._id;
    if (typeof cat === 'string') return cat;
    return '';
  })();

  const defaultVariants =
    initialData?.variants && initialData.variants.length > 0
      ? initialData.variants.map((v) => ({
          _id: v._id,
          sku: v.sku || '',
          name: v.name || '',
          price: v.price ?? 0,
          salePrice: v.compareAtPrice ?? null,
          stock: v.inventory ?? 0,
        }))
      : [
          {
            sku: '',
            name: '',
            price: 0,
            salePrice: null,
            stock: 0,
          },
        ];

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: initialData?.product?.name || '',
      slug: initialData?.product?.slug || '',
      shortDescription: initialData?.product?.shortDescription || '',
      description: initialData?.product?.description || '',
      type: initialData?.product?.type || 'GENERAL',
      categoryId: defaultCategoryId,
      tags: initialData?.product?.tags?.join(', ') || '',
      isActive: initialData?.product?.status !== 'INACTIVE',
      isFeatured: initialData?.product?.featured || false,
      isBestSeller: initialData?.product?.bestSeller || false,
      isNewArrival: initialData?.product?.newArrival || false,
      variants: defaultVariants,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants',
  });

  // Handle auto-slug on name change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('name', val, { shouldValidate: true });
    if (!slugManuallyEdited) {
      setValue('slug', slugify(val), { shouldValidate: true });
    }
  };

  // Upload image handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMessage(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/products/upload', {
          method: 'POST',
          body: formData,
        });

        const json = await res.json();
        if (!res.ok || (!json.url && !json.data?.url)) {
          throw new Error(json.error?.message || 'Failed to upload image');
        }

        const uploadedUrl = json.url || json.data.url;
        setImages((prev) => [...prev, uploadedUrl]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error uploading image';
      setErrorMessage(msg);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    setErrorMessage(null);

    const payload = {
      name: data.name.trim(),
      slug: data.slug.trim(),
      shortDescription: data.shortDescription?.trim() || '',
      description: data.description?.trim() || '',
      type: data.type,
      categoryId: data.categoryId || undefined,
      tags: data.tags
        ? data.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      isBestSeller: data.isBestSeller,
      isNewArrival: data.isNewArrival,
      imageUrls: images,
      variants: data.variants.map((v) => ({
        _id: v._id,
        sku: v.sku.trim(),
        name: v.name?.trim() || data.name.trim(),
        price: Number(v.price),
        salePrice:
          v.salePrice !== undefined && v.salePrice !== null && !isNaN(Number(v.salePrice))
            ? Number(v.salePrice)
            : undefined,
        stock: Number(v.stock),
      })),
    };

    try {
      const endpoint =
        mode === 'edit' && productId
          ? `/api/admin/products/${productId}`
          : '/api/admin/products';
      const method = mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to save product');
      }

      startTransition(() => {
        router.push('/admin/products');
        router.refresh();
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header and Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/products"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Products
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === 'edit' ? 'Edit Product' : 'New Product'}
          </h1>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-medium text-red-800">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Details Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Product Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Handmade Silk Scarf"
                {...register('name')}
                onChange={handleNameChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. handmade-silk-scarf"
                {...register('slug')}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setValue('slug', e.target.value);
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {errors.slug && (
                <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                {...register('type')}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="GENERAL">GENERAL</option>
                <option value="GIFT">GIFT</option>
                <option value="TREAT">TREAT</option>
                <option value="CHILDREN">CHILDREN</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                {...register('categoryId')}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select a category</option>
                {categoriesList.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Short Description
            </label>
            <input
              type="text"
              placeholder="Brief summary for listings..."
              {...register('shortDescription')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Description
            </label>
            <textarea
              rows={4}
              placeholder="Detailed description of the product..."
              {...register('description')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              placeholder="handcrafted, luxury, organic, gift"
              {...register('tags')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Badges / Visibility Toggles */}
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility & Badges
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Active (Visible)</span>
              </label>

              <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isFeatured')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Featured</span>
              </label>

              <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isBestSeller')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Best Seller</span>
              </label>

              <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isNewArrival')}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>New Arrival</span>
              </label>
            </div>
          </div>
        </div>

        {/* Media / Images Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Product Images
            </h2>
            <label className="cursor-pointer inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm">
              {uploadingImage ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload Image
                </>
              )}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="hidden"
              />
            </label>
          </div>

          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
              <ImageIcon className="h-10 w-10 mb-2 stroke-1" />
              <p className="text-sm font-medium">No images uploaded yet</p>
              <p className="text-xs text-gray-400">
                Click &quot;Upload Image&quot; to upload to Supabase Storage
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {images.map((url, idx) => (
                <div
                  key={`${url}-${idx}`}
                  className="group relative aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Product image ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow"
                    title="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variants Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Product Variants
              </h2>
              <p className="text-xs text-gray-500">
                Manage SKUs, pricing, and stock for this product.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                append({
                  sku: '',
                  name: '',
                  price: 0,
                  salePrice: null,
                  stock: 0,
                })
              }
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Variant
            </button>
          </div>

          {errors.variants?.message && (
            <p className="text-xs text-red-600">{errors.variants.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1 w-full sm:w-auto">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    SKU <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SCARF-RED-01"
                    {...register(`variants.${index}.sku` as const)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {errors.variants?.[index]?.sku && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.variants[index]?.sku?.message}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-32">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    {...register(`variants.${index}.price` as const, {
                      valueAsNumber: true,
                    })}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {errors.variants?.[index]?.price && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.variants[index]?.price?.message}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-32">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Sale Price (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Optional"
                    {...register(`variants.${index}.salePrice` as const, {
                      setValueAs: (v) =>
                        v === '' || v === null || v === undefined
                          ? null
                          : isNaN(Number(v))
                          ? null
                          : Number(v),
                    })}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="w-full sm:w-28">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    {...register(`variants.${index}.stock` as const, {
                      valueAsNumber: true,
                    })}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="sm:mt-5 p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 transition-colors"
                    title="Remove variant"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Link
            href="/admin/products"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending || uploadingImage}
            className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'edit' ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
