/**
 * Product Service
 * Business logic for products
 */

import { Product, ProductVariant, Inventory } from '@/models';
import { PaginationParams, PaginationResult } from '@/types';
import { slugify } from '@/lib/utils/format';

export class ProductService {
  /**
   * Get all products with pagination
   */
  static async getProducts(
    params: PaginationParams
  ): Promise<PaginationResult<any>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const products = await Product.find({ status: 'ACTIVE' })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments({ status: 'ACTIVE' });

    return {
      data: products,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get product by slug
   */
  static async getProductBySlug(slug: string) {
    return await Product.findOne({ slug, status: 'ACTIVE' }).populate(
      'variantIds categoryIds collectionIds'
    );
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: string) {
    return await Product.findById(id).populate(
      'variantIds categoryIds collectionIds'
    );
  }

  /**
   * Create product
   */
  static async createProduct(data: any) {
    const slug = slugify(data.name);

    const product = new Product({
      ...data,
      slug,
    });

    return await product.save();
  }

  /**
   * Update product
   */
  static async updateProduct(id: string, data: any) {
    return await Product.findByIdAndUpdate(id, data, { new: true });
  }

  /**
   * Delete product (soft delete)
   */
  static async deleteProduct(id: string) {
    return await Product.findByIdAndUpdate(
      id,
      { status: 'INACTIVE' },
      { new: true }
    );
  }

  /**
   * Get variants for product
   */
  static async getProductVariants(productId: string) {
    return await ProductVariant.find({ productId });
  }

  /**
   * Get featured products
   */
  static async getFeaturedProducts(limit: number = 10) {
    return await Product.find({ featured: true, status: 'ACTIVE' }).limit(
      limit
    );
  }

  /**
   * Get best seller products
   */
  static async getBestSellerProducts(limit: number = 10) {
    return await Product.find({ bestSeller: true, status: 'ACTIVE' }).limit(
      limit
    );
  }

  /**
   * Get new arrival products
   */
  static async getNewArrivalProducts(limit: number = 10) {
    return await Product.find({ newArrival: true, status: 'ACTIVE' })
      .limit(limit)
      .sort({ createdAt: -1 });
  }
}