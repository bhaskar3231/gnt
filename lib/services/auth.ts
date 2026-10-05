/**
 * Authentication Service
 * Abstraction layer for authentication provider (Clerk)
 * This allows replacing Clerk with another provider later
 */

import { auth } from '@clerk/nextjs/server';

export interface AuthUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

export class AuthService {
  /**
   * Get the current authenticated user
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { userId } = await auth();
      
      if (!userId) {
        return null;
      }

      // For now, we return basic info
      // In production, you'd fetch full user details from your database
      return {
        id: userId,
        email: undefined,
        firstName: undefined,
        lastName: undefined,
        imageUrl: undefined,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  /**
   * Get current user ID
   */
  static async getUserId(): Promise<string | null> {
    const { userId } = await auth();
    return userId || null;
  }
}