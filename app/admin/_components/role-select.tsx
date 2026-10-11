'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type UserRole = 'CUSTOMER' | 'ADMIN' | 'SUPER_ADMIN';

const ROLES: UserRole[] = ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'];

interface RoleSelectProps {
  userId: string;
  role: UserRole;
  disabled?: boolean;
}

export function RoleSelect({ userId, role: initialRole, disabled }: RoleSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>(initialRole);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as UserRole;
    if (next === role) return;
    if (!window.confirm(`Change this user's role to ${next.replace('_', ' ')}?`)) {
      e.target.value = role;
      return;
    }

    const previous = role;
    setRole(next);
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to update role');
      }
      startTransition(() => router.refresh());
    } catch (err: unknown) {
      setRole(previous);
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const loading = saving || isPending;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <select
          value={role}
          onChange={handleChange}
          disabled={disabled || loading}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace('_', ' ')}
            </option>
          ))}
        </select>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
