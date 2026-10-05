import { Category } from '@/models/Category';
import { CategoryRepository } from '@/repositories/CategoryRepository';
import { PaginationParams } from '@/types';

/**
 * Category business logic service
 */
export class CategoryService {
  /**
   * Get categories with pagination
   */
  static async getCategories(params: PaginationParams): Promise<any[]> {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    return await CategoryRepository.findAll({
      skip,
      limit,
    });
  }

  /**
   * Get root categories (no parent)
   */
  static async getRootCategories(): Promise<any[]> {
    return await CategoryRepository.findRootCategories();
  }

  /**
   * Get subcategories by parent
   */
  static async getSubcategories(parentId: string, params?: PaginationParams): Promise<any[]> {
    return await CategoryRepository.findByParent(parentId);
  }

  /**
   * Get category by slug with nested subcategories
   */
  static async getCategoryBySlug(slug: string): Promise<any> {
    const category = await CategoryRepository.findBySlug(slug);
    if (!category) return null;

    // Get subcategories
    const subcategories = await CategoryRepository.findByParent(category._id);
    return {
      ...category,
      subcategories,
    };
  }

  /**
   * Search categories
   */
  static async searchCategories(query: string): Promise<any[]> {
    const categories = await Category.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    });

    return categories;
  }
}