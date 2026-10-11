import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose, { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Product, ProductVariant, Category } from '@/models';
import type { ApiResponse, PaginationResult } from '@/types';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    await dbConnect();

    // Ensure models are registered for populate
    void Category;
    void ProductVariant;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '20', 10));
    const search = searchParams.get('search')?.trim() || '';

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categoryIds', 'name slug')
        .populate('variantIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    const result: PaginationResult<(typeof products)[number]> = {
      data: products,
      total,
      page,
      limit,
      pages,
    };

    return NextResponse.json<ApiResponse<PaginationResult<(typeof products)[number]>>>({
      success: true,
      data: result,
    });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/products GET]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    await dbConnect();

    const body = await request.json();
    const {
      name,
      slug: customSlug,
      description,
      shortDescription,
      type = 'GENERAL',
      categoryId,
      categoryIds,
      tags = [],
      isActive = true,
      status: explicitStatus,
      isFeatured = false,
      featured,
      isBestSeller = false,
      bestSeller,
      isNewArrival = false,
      newArrival,
      variants = [],
      imageUrls = [],
      images: explicitImages,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Product name is required' } },
        { status: 400 }
      );
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'At least one variant is required' } },
        { status: 400 }
      );
    }

    // Validate variants
    for (const [index, variant] of variants.entries()) {
      if (!variant.sku || typeof variant.sku !== 'string' || !variant.sku.trim()) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { message: `Variant #${index + 1} requires a SKU` } },
          { status: 400 }
        );
      }
      if (variant.price === undefined || variant.price === null || Number(variant.price) < 0) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { message: `Variant #${index + 1} requires a valid price` } },
          { status: 400 }
        );
      }
    }

    // Determine slug
    let slug = customSlug ? generateSlug(customSlug) : generateSlug(name);
    if (!slug) {
      slug = `product-${Date.now()}`;
    }

    // Check slug collision
    const existingProductWithSlug = await Product.findOne({ slug });
    if (existingProductWithSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Format tags
    let parsedTags: string[] = [];
    if (Array.isArray(tags)) {
      parsedTags = tags.map((t: string) => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string') {
      parsedTags = tags
        .split(',')
        .map((t: string) => t.trim())
        .filter(Boolean);
    }

    // Format categoryIds
    const parsedCategoryIds: Types.ObjectId[] = [];
    if (categoryId && mongoose.isValidObjectId(categoryId)) {
      parsedCategoryIds.push(new Types.ObjectId(categoryId));
    }
    if (Array.isArray(categoryIds)) {
      for (const catId of categoryIds) {
        if (catId && mongoose.isValidObjectId(catId) && !parsedCategoryIds.some((id) => id.equals(catId))) {
          parsedCategoryIds.push(new Types.ObjectId(catId));
        }
      }
    }

    // Format images
    let images: { url: string; alt?: string; sortOrder?: number }[] = [];
    if (Array.isArray(explicitImages) && explicitImages.length > 0) {
      images = explicitImages.map((img: { url: string; alt?: string; sortOrder?: number }, idx: number) => ({
        url: img.url,
        alt: img.alt || name,
        sortOrder: img.sortOrder ?? idx,
      }));
    } else if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      images = imageUrls.map((url: string, idx: number) => ({
        url,
        alt: name,
        sortOrder: idx,
      }));
    }

    const thumbnail = images[0]?.url || undefined;
    const status = explicitStatus || (isActive ? 'ACTIVE' : 'INACTIVE');
    const isFeaturedVal = Boolean(featured ?? isFeatured);
    const isBestSellerVal = Boolean(bestSeller ?? isBestSeller);
    const isNewArrivalVal = Boolean(newArrival ?? isNewArrival);

    // Create Product
    const newProduct = new Product({
      name: name.trim(),
      slug,
      description: description || '',
      shortDescription: shortDescription || '',
      type,
      categoryIds: parsedCategoryIds,
      tags: parsedTags,
      images,
      thumbnail,
      status,
      featured: isFeaturedVal,
      bestSeller: isBestSellerVal,
      newArrival: isNewArrivalVal,
      variantIds: [],
    });

    await newProduct.save();

    // Create Variants
    const createdVariantIds: Types.ObjectId[] = [];
    const createdVariants = [];

    for (const v of variants) {
      const variantDoc = new ProductVariant({
        productId: newProduct._id,
        sku: v.sku.trim(),
        name: v.name || newProduct.name,
        price: Number(v.price),
        compareAtPrice: v.compareAtPrice !== undefined ? Number(v.compareAtPrice) : v.salePrice !== undefined ? Number(v.salePrice) : undefined,
        inventory: v.inventory !== undefined ? Number(v.inventory) : v.stock !== undefined ? Number(v.stock) : 0,
        attributes: v.attributes || {},
        active: v.active !== undefined ? Boolean(v.active) : true,
      });

      await variantDoc.save();
      createdVariantIds.push(variantDoc._id as Types.ObjectId);
      createdVariants.push(variantDoc);
    }

    // Link variants to product
    newProduct.variantIds = createdVariantIds;
    await newProduct.save();

    return NextResponse.json<ApiResponse<{ product: typeof newProduct; variants: typeof createdVariants }>>(
      {
        success: true,
        data: {
          product: newProduct,
          variants: createdVariants,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/products POST]', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: errorMessage } },
      { status: 500 }
    );
  }
}
