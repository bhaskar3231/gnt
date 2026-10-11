import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Category } from '@/models';
import { CategoryRepository } from '@/repositories/CategoryRepository';
import type { ApiResponse } from '@/types';

const CATEGORY_TYPES = ['GIFT', 'TREAT', 'CHILDREN', 'GENERAL'];

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function badRequest(message: string, status = 400) {
  return NextResponse.json<ApiResponse<never>>({ success: false, error: { message } }, { status });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return badRequest('Invalid category ID');

    await dbConnect();

    const existing = await CategoryRepository.findById(id);
    if (!existing) return badRequest('Category not found', 404);

    const body = await request.json().catch(() => ({}));
    const { name, slug, parentId, type, isActive, description, image } = body ?? {};
    const update: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim() || name.length > 200) {
        return badRequest('Category name cannot be empty (max 200 chars)');
      }
      update.name = name.trim();
    }

    if (slug !== undefined) {
      const formatted = typeof slug === 'string' ? generateSlug(slug) : '';
      if (!formatted) return badRequest('Invalid slug');
      const clash = await Category.findOne({ slug: formatted, _id: { $ne: id } });
      if (clash) return badRequest('Slug is already in use');
      update.slug = formatted;
    }

    if (parentId !== undefined) {
      if (parentId === null || parentId === '') {
        update.parentId = null;
      } else {
        if (!mongoose.isValidObjectId(parentId)) return badRequest('Invalid parent category');
        if (String(parentId) === id) return badRequest('A category cannot be its own parent');
        if (!(await CategoryRepository.findById(parentId))) {
          return badRequest('Parent category not found');
        }
        update.parentId = parentId;
      }
    }

    if (type !== undefined) {
      if (!CATEGORY_TYPES.includes(type)) return badRequest('Invalid category type');
      update.type = type;
    }

    if (isActive !== undefined) update.isActive = Boolean(isActive);
    if (typeof description === 'string') update.description = description;
    if (typeof image === 'string') update.image = image;

    const category = await CategoryRepository.update(id, update);

    return NextResponse.json<ApiResponse<typeof category>>({ success: true, data: category });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/categories/[id] PUT]', err);
    return badRequest('Internal server error', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return badRequest('Invalid category ID');

    await dbConnect();

    const childCount = await Category.countDocuments({ parentId: id });
    if (childCount > 0) {
      return badRequest('Cannot delete a category that has subcategories');
    }

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return badRequest('Category not found', 404);

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: 'Category deleted successfully' },
    });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/categories/[id] DELETE]', err);
    return badRequest('Internal server error', 500);
  }
}
