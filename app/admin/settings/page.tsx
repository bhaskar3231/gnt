import React from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { SiteSettings, type ISiteSettings } from '@/models';
import type { SiteSettingsInput } from '@/lib/admin-settings';
import { SettingsForm } from '../_components/settings-form';

export default async function SettingsPage() {
  const { userId } = await auth();

  try {
    await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  await dbConnect();

  const settings = await SiteSettings.findOneAndUpdate(
    {},
    { $setOnInsert: { contactEmail: '', phone: '' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean<ISiteSettings>();

  const initialData: SiteSettingsInput = {
    brandName: settings?.brandName ?? 'Gift & Treat',
    logo: settings?.logo ?? '',
    contactEmail: settings?.contactEmail ?? '',
    phone: settings?.phone ?? '',
    address: settings?.address ?? '',
    socialLinks: {
      instagram: settings?.socialLinks?.instagram ?? '',
      facebook: settings?.socialLinks?.facebook ?? '',
      twitter: settings?.socialLinks?.twitter ?? '',
      youtube: settings?.socialLinks?.youtube ?? '',
    },
    announcementBar: {
      text: settings?.announcementBar?.text ?? '',
      isActive: settings?.announcementBar?.isActive ?? false,
      bgColor: settings?.announcementBar?.bgColor ?? '',
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Site Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage your store&apos;s branding, contact details and announcement bar.
        </p>
      </div>
      <SettingsForm initialData={initialData} />
    </div>
  );
}
