/**
 * Search Service
 * Product search functionality
 */

import { Product } from '@/models';
import { PaginationParams, PaginationResult } from '@/types';

export interface SearchFilters {
  q?: string;
  categoryId?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
}

export class SearchService {
  /**
   * Search products
   */
  static async searchProducts(
    filters: SearchFilters,
    params: PaginationParams
  ): Promise<PaginationResult<any>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { status: 'ACTIVE' };

    // Text search
    if (filters.q) {
      query.$or = [
        { name: { $regex: filters.q, $options: 'i' } },
        { description: { $regex: filters.q, $options: 'i' } },
        { tags: { $regex: filters.q, $options: 'i' } },
        { brand: { $regex: filters.q, $options: 'i' } },
      ];
    }

    // Category filter
    if (filters.categoryId) {
      query.categoryIds = filters.categoryId;
    }

    // Type filter
    if (filters.type) {
      query.type = filters.type;
    }

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      // This would require fetching variants to get price range
      // For now, basic implementation
    }

    const products = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ featured: -1, createdAt: -1 });

    const total = await Product.countDocuments(query);

    return {
      data: products,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get search suggestions
   */
  static async getSearchSuggestions(query: string, limit: number = 10) {
    const suggestions = await Product.find(
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { tags: { $regex: query, $options: 'i' } },
        ],
        status: 'ACTIVE',
      },
      { name: 1 }
    )
      .limit(limit)
      .distinct('name');

    return suggestions;
  }

  /**
   * Get product by slug
   */
  static async getProductBySlug(slug: string) {
    return await Product.findOne({ slug, status: 'ACTIVE' });
  }

  /**
   * Get related products
   */
  static async getRelatedProducts(productId: string, limit: number = 6) {
    const product = await Product.findById(productId);

    if (!product) return [];

    return await Product.find(
      {
        _id: { $ne: productId },
        categoryIds: { $in: product.categoryIds },
        status: 'ACTIVE',
      },
      {}
    )
      .limit(limit);
  }
}