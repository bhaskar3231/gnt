import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { User } from '@/models';
import type { ApiResponse, PaginationResult, UserRole } from '@/types';

const USER_ROLES: UserRole[] = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'];

function errorResponse(message: string, status: number) {
  return NextResponse.json<ApiResponse<never>>({ success: false, error: { message } }, { status });
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const search = searchParams.get('search')?.trim().slice(0, 100) || '';

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: 'i' };
      query.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('email firstName lastName role status createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    const result: PaginationResult<(typeof users)[number]> = {
      data: users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };

    return NextResponse.json<ApiResponse<typeof result>>({ success: true, data: result });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/users GET]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    const admin = await verifyAdminAccess(userId);

    if (admin.role !== 'SUPER_ADMIN') {
      return errorResponse('Only SUPER_ADMIN can change user roles', 403);
    }

    const body = await request.json().catch(() => ({}));
    const { id, role } = body ?? {};

    if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
      return errorResponse('Invalid user ID', 400);
    }
    if (typeof role !== 'string' || !USER_ROLES.includes(role as UserRole)) {
      return errorResponse('Invalid role', 400);
    }
    if (String(admin._id) === id) {
      return errorResponse('You cannot change your own role', 400);
    }

    await dbConnect();

    const user = await User.findByIdAndUpdate(id, { role }, { new: true })
      .select('email firstName lastName role status createdAt')
      .lean();
    if (!user) return errorResponse('User not found', 404);

    return NextResponse.json<ApiResponse<typeof user>>({ success: true, data: user });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/users PUT]', err);
    return errorResponse('Internal server error', 500);
  }
}
