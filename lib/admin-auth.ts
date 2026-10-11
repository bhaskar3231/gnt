import dbConnect from '@/lib/db';
import { User, IUser } from '@/models/User';

/**
 * Verifies that the given Clerk userId belongs to a user with ADMIN or SUPER_ADMIN role.
 * Throws a Response with status 403 if the check fails.
 * Returns the user document on success.
 */
export async function verifyAdminAccess(
  userId: string | null | undefined
): Promise<IUser> {
  if (!userId) {
    throw new Response('Forbidden', { status: 403 });
  }

  await dbConnect();

  const user = await User.findOne({ clerkId: userId }).lean<IUser>();

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
    throw new Response('Forbidden', { status: 403 });
  }

  return user;
}
