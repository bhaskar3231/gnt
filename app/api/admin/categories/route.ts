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

export async function GET() {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    await dbConnect();

    const categories = await Category.find({})
      .populate('parentId', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return NextResponse.json<ApiResponse<typeof categories>>({ success: true, data: categories });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/categories GET]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const { name, slug: customSlug, parentId, type = 'GENERAL', isActive = true, description, image } = body ?? {};

    if (typeof name !== 'string' || !name.trim() || name.length > 200) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Category name is required (max 200 chars)' } },
        { status: 400 }
      );
    }

    if (!CATEGORY_TYPES.includes(type)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Invalid category type' } },
        { status: 400 }
      );
    }

    if (parentId && !mongoose.isValidObjectId(parentId)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Invalid parent category' } },
        { status: 400 }
      );
    }

    if (parentId && !(await CategoryRepository.findById(parentId))) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Parent category not found' } },
        { status: 400 }
      );
    }

    const slug = generateSlug(typeof customSlug === 'string' && customSlug.trim() ? customSlug : name);
    if (!slug) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Invalid slug' } },
        { status: 400 }
      );
    }

    if (await CategoryRepository.findBySlug(slug)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Slug is already in use' } },
        { status: 400 }
      );
    }

    const category = await CategoryRepository.create({
      name: name.trim(),
      slug,
      parentId: parentId || null,
      type,
      isActive: Boolean(isActive),
      description: typeof description === 'string' ? description : undefined,
      image: typeof image === 'string' ? image : undefined,
    });

    return NextResponse.json<ApiResponse<typeof category>>(
      { success: true, data: category },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/categories POST]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
