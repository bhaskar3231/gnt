import { currentUser } from '@clerk/nextjs/server';

interface AdminHeaderProps {
  title?: string;
}

export default async function AdminHeader({ title }: AdminHeaderProps) {
  const user = await currentUser();

  const displayName =
    user?.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? 'Admin';

  const email = user?.emailAddresses?.[0]?.emailAddress;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Page title */}
      <h1 className="text-base font-semibold text-gray-900">
        {title ?? 'Admin Panel'}
      </h1>

      {/* Logged-in user */}
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium text-gray-900">{displayName}</span>
        {email && (
          <span className="text-xs text-gray-500">{email}</span>
        )}
      </div>
    </header>
  );
}
