import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { User, type IUser } from '@/models';
import { ProductSearch } from '../_components/product-search';
import { RoleSelect } from '../_components/role-select';

const ROLE_COLORS: Record<IUser['role'], string> = {
  CUSTOMER: 'bg-gray-100 text-gray-700',
  ADMIN: 'bg-blue-100 text-blue-800',
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHref(search: string, page: number): string {
  const sp = new URLSearchParams();
  if (search) sp.set('search', search);
  if (page > 1) sp.set('page', String(page));
  const qs = sp.toString();
  return `/admin/users${qs ? `?${qs}` : ''}`;
}

interface UsersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const { userId } = await auth();

  let currentUser: IUser;
  try {
    currentUser = await verifyAdminAccess(userId);
  } catch {
    redirect('/');
  }

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  await dbConnect();

  const resolvedParams = await searchParams;
  const search =
    typeof resolvedParams.search === 'string' ? resolvedParams.search.trim().slice(0, 100) : '';
  const page = Math.max(1, parseInt((resolvedParams.page as string) || '1', 10) || 1);
  const limit = 20;

  const query: Record<string, unknown> = {};
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    query.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('email firstName lastName role createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<IUser[]>(),
    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {isSuperAdmin
            ? 'View users and manage their roles.'
            : 'View users. Only Super Admins can change roles.'}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <ProductSearch placeholder="Search by name or email..." />
        <span className="text-xs text-gray-500 hidden sm:inline-block">
          Showing {users.length} of {total} users
        </span>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-medium text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-gray-400">
                    <Users className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="font-medium text-gray-500">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const id = String(u._id);
                  const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
                  const isSelf = id === String(currentUser._id);
                  return (
                    <tr key={id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {name}
                        {isSelf && <span className="ml-1.5 text-xs text-gray-400">(you)</span>}
                      </td>
                      <td className="px-5 py-3">{u.email}</td>
                      <td className="px-5 py-3">
                        {isSuperAdmin && !isSelf ? (
                          <RoleSelect userId={id} role={u.role} />
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role]}`}
                          >
                            {u.role.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">{formatDate(u.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
            <div className="text-xs text-gray-500">
              Page <span className="font-medium text-gray-800">{page}</span> of{' '}
              <span className="font-medium text-gray-800">{totalPages}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Link
                href={buildHref(search, page - 1)}
                aria-disabled={page <= 1}
                tabIndex={page <= 1 ? -1 : undefined}
                className={`inline-flex items-center px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 ${
                  page <= 1 ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Previous
              </Link>
              <Link
                href={buildHref(search, page + 1)}
                aria-disabled={page >= totalPages}
                tabIndex={page >= totalPages ? -1 : undefined}
                className={`inline-flex items-center px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 ${
                  page >= totalPages ? 'pointer-events-none opacity-40' : ''
                }`}
              >
                Next
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
