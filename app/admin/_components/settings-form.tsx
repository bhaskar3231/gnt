'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { siteSettingsSchema, type SiteSettingsInput } from '@/lib/admin-settings';

const inputClass =
  'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
      <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}

export function SettingsForm({ initialData }: { initialData: SiteSettingsInput }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsInput>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: initialData,
  });

  const announcementText = watch('announcementBar.text');
  const announcementBg = watch('announcementBar.bgColor');
  const announcementActive = watch('announcementBar.isActive');

  const onSubmit = async (data: SiteSettingsInput) => {
    setErrorMessage(null);
    setSaved(false);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to save settings');
      }
      setSaved(true);
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const loading = isSubmitting || isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {errorMessage && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <p className="text-sm font-medium text-red-800">{errorMessage}</p>
        </div>
      )}
      {saved && !errorMessage && (
        <div className="rounded-md bg-green-50 p-4 border border-green-200">
          <p className="text-sm font-medium text-green-800">Settings saved.</p>
        </div>
      )}

      <Section title="Brand">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Store Name <span className="text-red-500">*</span>
            </label>
            <input {...register('brandName')} className={inputClass} />
            <FieldError message={errors.brandName?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo URL</label>
            <input {...register('logo')} placeholder="https://..." className={inputClass} />
            <FieldError message={errors.logo?.message} />
          </div>
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" {...register('contactEmail')} className={inputClass} />
            <FieldError message={errors.contactEmail?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input {...register('phone')} className={inputClass} />
            <FieldError message={errors.phone?.message} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <textarea rows={3} {...register('address')} className={inputClass} />
          <FieldError message={errors.address?.message} />
        </div>
      </Section>

      <Section title="Social Links">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(['instagram', 'facebook', 'twitter', 'youtube'] as const).map((key) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 capitalize">{key}</label>
              <input
                {...register(`socialLinks.${key}`)}
                placeholder="https://..."
                className={inputClass}
              />
              <FieldError message={errors.socialLinks?.[key]?.message} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Announcement Bar">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            {...register('announcementBar.isActive')}
            className="rounded border-gray-300"
          />
          Show announcement bar
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Text</label>
            <input
              {...register('announcementBar.text')}
              placeholder="e.g. Free shipping on orders over ₹999"
              className={inputClass}
            />
            <FieldError message={errors.announcementBar?.text?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Background Color</label>
            <input
              {...register('announcementBar.bgColor')}
              placeholder="#1f2937"
              className={`${inputClass} font-mono`}
            />
            <FieldError message={errors.announcementBar?.bgColor?.message} />
          </div>
        </div>
        {announcementText && (
          <div>
            <p className="text-xs text-gray-500 mb-1">
              Preview{!announcementActive && ' (hidden on storefront)'}
            </p>
            <div
              className={`rounded px-4 py-2 text-center text-sm text-white ${
                announcementActive ? '' : 'opacity-50'
              }`}
              style={{
                backgroundColor: /^#[0-9a-fA-F]{6}$/.test(announcementBg || '')
                  ? announcementBg
                  : '#1f2937',
              }}
            >
              {announcementText}
            </div>
          </div>
        )}
      </Section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-60"
        >
          {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Save Settings
        </button>
      </div>
    </form>
  );
}
