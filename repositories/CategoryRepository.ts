/**
 * Category Repository
 * Data access layer for categories
 */

import { Category } from '@/models';
import { Types } from 'mongoose';

export class CategoryRepository {
  /**
   * Find category by ID
   */
  static async findById(id: string) {
    return await Category.findById(id);
  }

  /**
   * Find category by slug
   */
  static async findBySlug(slug: string) {
    return await Category.findOne({ slug });
  }

  /**
   * Find all categories
   */
  static async findAll(filters: any = {}) {
    const query = { isActive: true, ...filters };
    return await Category.find(query).sort({ sortOrder: 1 });
  }

  /**
   * Find root categories
   */
  static async findRootCategories() {
    return await Category.find({
      parentId: null,
      isActive: true,
    }).sort({ sortOrder: 1 });
  }

  /**
   * Find subcategories of a parent
   */
  static async findByParent(parentId: string) {
    return await Category.find({
      parentId: new Types.ObjectId(parentId),
      isActive: true,
    }).sort({ sortOrder: 1 });
  }

  /**
   * Create category
   */
  static async create(data: any) {
    const category = new Category(data);
    return await category.save();
  }

  /**
   * Update category
   */
  static async update(id: string, data: any) {
    return await Category.findByIdAndUpdate(id, data, { new: true });
  }

  /**
   * Delete category
   */
  static async delete(id: string) {
    return await Category.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }
}