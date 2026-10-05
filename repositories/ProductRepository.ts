/**
 * Product Repository
 * Data access layer for products
 */

import { Product, ProductVariant, Category, Collection } from '@/models';
import { Types } from 'mongoose';

export class ProductRepository {
  /**
   * Find product by ID
   */
  static async findById(id: string) {
    return await Product.findById(id);
  }

  /**
   * Find product by slug
   */
  static async findBySlug(slug: string) {
    return await Product.findOne({ slug });
  }

  /**
   * Find all products with filters
   */
  static async findAll(filters: any = {}, options: any = {}) {
    const {
      skip = 0,
      limit = 20,
      sort = { createdAt: -1 },
    } = options;

    const query: any = { status: 'ACTIVE', ...filters };

    const [data, total] = await Promise.all([
      Product.find(query).skip(skip).limit(limit).sort(sort),
      Product.countDocuments(query),
    ]);

    return { data, total };
  }

  /**
   * Create product
   */
  static async create(productData: any) {
    const product = new Product(productData);
    return await product.save();
  }

  /**
   * Update product
   */
  static async update(id: string, updateData: any) {
    return await Product.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Delete product (soft delete)
   */
  static async delete(id: string) {
    return await Product.findByIdAndUpdate(
      id,
      { status: 'INACTIVE' },
      { new: true }
    );
  }

  /**
   * Add variant to product
   */
  static async addVariant(productId: string, variantData: any) {
    const variant = new ProductVariant({
      productId,
      ...variantData,
    });

    await variant.save();

    // Add variant ID to product
    await Product.findByIdAndUpdate(
      productId,
      { $push: { variantIds: variant._id } },
      { new: true }
    );

    return variant;
  }

  /**
   * Get product variants
   */
  static async getVariants(productId: string) {
    return await ProductVariant.find({ productId });
  }

  /**
   * Get products by category
   */
  static async getByCategory(categoryId: string, options: any = {}) {
    return this.findAll(
      { categoryIds: new Types.ObjectId(categoryId) },
      options
    );
  }

  /**
   * Get products by collection
   */
  static async getByCollection(collectionId: string, options: any = {}) {
    return this.findAll(
      { collectionIds: new Types.ObjectId(collectionId) },
      options
    );
  }

  /**
   * Get featured products
   */
  static async getFeatured(limit: number = 10) {
    return await Product.find({ featured: true, status: 'ACTIVE' }).limit(
      limit
    );
  }

  /**
   * Get best sellers
   */
  static async getBestSellers(limit: number = 10) {
    return await Product.find({ bestSeller: true, status: 'ACTIVE' }).limit(
      limit
    );
  }

  /**
   * Get new arrivals
   */
  static async getNewArrivals(limit: number = 10) {
    return await Product.find({ newArrival: true, status: 'ACTIVE' })
      .limit(limit)
      .sort({ createdAt: -1 });
  }
}