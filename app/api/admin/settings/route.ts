import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { siteSettingsSchema } from '@/lib/admin-settings';
import { SiteSettings } from '@/models';
import type { ApiResponse } from '@/types';

function errorResponse(message: string, status: number) {
  return NextResponse.json<ApiResponse<never>>({ success: false, error: { message } }, { status });
}

export async function GET() {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    await dbConnect();

    // Single settings document — create an empty one on first access.
    const settings = await SiteSettings.findOneAndUpdate(
      {},
      { $setOnInsert: { contactEmail: '', phone: '' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json<ApiResponse<typeof settings>>({ success: true, data: settings });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/settings GET]', err);
    return errorResponse('Internal server error', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const body = await request.json().catch(() => ({}));
    const parsed = siteSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid input', 400);
    }

    const d = parsed.data;

    await dbConnect();

    // Dotted paths so unrelated nested fields (e.g. socialLinks.linkedin) are preserved.
    const settings = await SiteSettings.findOneAndUpdate(
      {},
      {
        $set: {
          brandName: d.brandName,
          logo: d.logo,
          contactEmail: d.contactEmail,
          phone: d.phone,
          address: d.address,
          'socialLinks.instagram': d.socialLinks.instagram,
          'socialLinks.facebook': d.socialLinks.facebook,
          'socialLinks.twitter': d.socialLinks.twitter,
          'socialLinks.youtube': d.socialLinks.youtube,
          'announcementBar.text': d.announcementBar.text,
          'announcementBar.isActive': d.announcementBar.isActive,
          'announcementBar.bgColor': d.announcementBar.bgColor,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json<ApiResponse<typeof settings>>({ success: true, data: settings });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/settings PUT]', err);
    return errorResponse('Internal server error', 500);
  }
}
