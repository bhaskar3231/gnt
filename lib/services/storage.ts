/**
 * Media/Storage Service
 * Abstraction layer for storage provider (Supabase)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase credentials not configured');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface UploadResult {
  path: string;
  url: string;
  size: number;
}

export class StorageService {
  private static readonly BUCKET = 'media';

  /**
   * Upload file to storage
   */
  static async uploadFile(
    file: File,
    folder: string
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const path = `${folder}/${fileName}`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET)
        .upload(path, file);

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from upload');
      }

      const { data: publicData } = supabase.storage
        .from(this.BUCKET)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        url: publicData.publicUrl,
        size: file.size,
      };
    } catch (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
  }

  /**
   * Delete file from storage
   */
  static async deleteFile(path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET)
        .remove([path]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error('Storage delete error:', error);
      throw error;
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  }
}