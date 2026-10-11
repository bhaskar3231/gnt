import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { StorageService } from '@/lib/services/storage';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'No file provided in form field "file"' } },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage in 'products' folder
    const uploadResult = await StorageService.uploadFile(file, 'products');

    return NextResponse.json({
      success: true,
      url: uploadResult.url,
      data: {
        url: uploadResult.url,
        path: uploadResult.path,
        size: uploadResult.size,
      },
    });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/products/upload POST]', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: errorMessage } },
      { status: 500 }
    );
  }
}
