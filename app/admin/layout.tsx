import { auth } from '@clerk/nextjs/server';
import { verifyAdminAccess } from '@/lib/admin-auth';
import AdminSidebar from './_components/sidebar';
import AdminHeader from './_components/header';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  let forbidden = false;
  try {
    await verifyAdminAccess(userId);
  } catch {
    forbidden = true;
  }

  if (forbidden) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">403</h1>
          <p className="mt-2 text-lg text-gray-600">
            You do not have permission to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 overflow-y-auto border-r border-gray-200 bg-white">
        <AdminSidebar />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
