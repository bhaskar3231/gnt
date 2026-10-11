'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Plus, Edit, Trash2, Check, X, FolderTree } from 'lucide-react';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  slug: z.string().trim().max(200).optional(),
  parentId: z.string().optional(),
  type: z.enum(['GIFT', 'TREAT', 'CHILDREN', 'GENERAL']),
  isActive: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export interface CategoryRow {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  parentName: string | null;
  type: 'GIFT' | 'TREAT' | 'CHILDREN' | 'GENERAL';
  isActive: boolean;
}

const inputClass =
  'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const TYPES = ['GENERAL', 'GIFT', 'TREAT', 'CHILDREN'] as const;

async function sendJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Request failed');
  }
  return json;
}

function toPayload(data: CategoryFormData) {
  return {
    name: data.name,
    slug: data.slug ? data.slug : slugify(data.name),
    parentId: data.parentId || null,
    type: data.type,
    isActive: data.isActive,
  };
}

function AddCategoryForm({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', slug: '', parentId: '', type: 'GENERAL', isActive: true },
  });

  const onSubmit = async (data: CategoryFormData) => {
    setError(null);
    try {
      await sendJson('/api/admin/categories', 'POST', toPayload(data));
      reset();
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const loading = isSubmitting || isPending;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3"
    >
      <h2 className="text-sm font-semibold text-gray-900">Add Category</h2>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
        <div className="md:col-span-2">
          <input placeholder="Name *" {...register('name')} className={inputClass} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <input placeholder="Slug (auto)" {...register('slug')} className={inputClass} />
        </div>
        <div>
          <select {...register('parentId')} className={inputClass}>
            <option value="">No parent</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select {...register('type')} className={inputClass}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
            <input type="checkbox" {...register('isActive')} className="rounded border-gray-300" />
            Active
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </>
            )}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

function CategoryTableRow({
  category,
  categories,
}: {
  category: CategoryRow;
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category.name,
      slug: category.slug,
      parentId: category.parentId ?? '',
      type: category.type,
      isActive: category.isActive,
    },
  });

  const onSave = async (data: CategoryFormData) => {
    setError(null);
    try {
      await sendJson(`/api/admin/categories/${category._id}`, 'PUT', toPayload(data));
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete category "${category.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await sendJson(`/api/admin/categories/${category._id}`, 'DELETE');
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  };

  const busy = isSubmitting || isPending || deleting;

  if (editing) {
    return (
      <tr className="bg-indigo-50/40">
        <td className="px-5 py-2">
          <input {...register('name')} className={inputClass} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </td>
        <td className="px-5 py-2">
          <input {...register('slug')} className={inputClass} />
        </td>
        <td className="px-5 py-2">
          <select {...register('parentId')} className={inputClass}>
            <option value="">No parent</option>
            {categories
              .filter((c) => c._id !== category._id)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
          </select>
        </td>
        <td className="px-5 py-2">
          <select {...register('type')} className={inputClass}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </td>
        <td className="px-5 py-2">
          <input type="checkbox" {...register('isActive')} className="rounded border-gray-300" />
        </td>
        <td className="px-5 py-2 text-right">
          <div className="flex items-center justify-end space-x-1">
            <button
              type="button"
              onClick={handleSubmit(onSave)}
              disabled={busy}
              className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
              title="Save"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setError(null);
                setEditing(false);
              }}
              disabled={busy}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50/80 transition-colors">
      <td className="px-5 py-3 font-medium text-gray-900">
        {category.name}
        {error && <p className="mt-1 text-xs font-normal text-red-600">{error}</p>}
      </td>
      <td className="px-5 py-3 font-mono text-xs text-gray-500">{category.slug}</td>
      <td className="px-5 py-3">{category.parentName || '—'}</td>
      <td className="px-5 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
          {category.type}
        </span>
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            category.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {category.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex items-center justify-end space-x-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Delete"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  return (
    <div className="space-y-6">
      <AddCategoryForm categories={categories} />

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Slug</th>
                <th className="px-5 py-3.5">Parent</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Active</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    <FolderTree className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="font-medium text-gray-500">No categories yet</p>
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <CategoryTableRow key={c._id} category={c} categories={categories} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
