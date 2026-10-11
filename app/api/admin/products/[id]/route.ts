import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose, { Types } from 'mongoose';
import dbConnect from '@/lib/db';
import { verifyAdminAccess } from '@/lib/admin-auth';
import { Product, ProductVariant, Category } from '@/models';
import type { ApiResponse } from '@/types';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Invalid product ID' } },
        { status: 400 }
      );
    }

    await dbConnect();

    // Ensure models are registered for populate
    void Category;
    void ProductVariant;

    const product = await Product.findById(id)
      .populate('categoryIds', 'name slug')
      .populate('variantIds')
      .lean();

    if (!product) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Product not found' } },
        { status: 404 }
      );
    }

    const variants = await ProductVariant.find({ productId: id }).lean();

    return NextResponse.json<ApiResponse<{ product: typeof product; variants: typeof variants }>>({
      success: true,
      data: {
        product,
        variants,
      },
    });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/products/[id] GET]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Invalid product ID' } },
        { status: 400 }
      );
    }

    await dbConnect();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Product not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      slug: customSlug,
      description,
      shortDescription,
      type,
      categoryId,
      categoryIds,
      tags,
      isActive,
      status: explicitStatus,
      isFeatured,
      featured,
      isBestSeller,
      bestSeller,
      isNewArrival,
      newArrival,
      variants,
      imageUrls,
      images: explicitImages,
    } = body;

    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { message: 'Product name cannot be empty' } },
          { status: 400 }
        );
      }
      product.name = name.trim();
    }

    if (customSlug) {
      const formattedSlug = generateSlug(customSlug);
      const existingProductWithSlug = await Product.findOne({
        slug: formattedSlug,
        _id: { $ne: product._id },
      });
      if (existingProductWithSlug) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { message: 'Slug is already in use by another product' } },
          { status: 400 }
        );
      }
      product.slug = formattedSlug;
    }

    if (description !== undefined) product.description = description;
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (type !== undefined) product.type = type;

    // CategoryIds
    if (categoryId !== undefined || categoryIds !== undefined) {
      const parsedCategoryIds: Types.ObjectId[] = [];
      if (categoryId && mongoose.isValidObjectId(categoryId)) {
        parsedCategoryIds.push(new Types.ObjectId(categoryId));
      }
      if (Array.isArray(categoryIds)) {
        for (const catId of categoryIds) {
          if (catId && mongoose.isValidObjectId(catId) && !parsedCategoryIds.some((cId) => cId.equals(catId))) {
            parsedCategoryIds.push(new Types.ObjectId(catId));
          }
        }
      }
      product.categoryIds = parsedCategoryIds;
    }

    // Tags
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        product.tags = tags.map((t: string) => String(t).trim()).filter(Boolean);
      } else if (typeof tags === 'string') {
        product.tags = tags
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
    }

    // Status
    if (explicitStatus !== undefined) {
      product.status = explicitStatus;
    } else if (isActive !== undefined) {
      product.status = isActive ? 'ACTIVE' : 'INACTIVE';
    }

    // Boolean flags
    if (featured !== undefined || isFeatured !== undefined) {
      product.featured = Boolean(featured ?? isFeatured);
    }
    if (bestSeller !== undefined || isBestSeller !== undefined) {
      product.bestSeller = Boolean(bestSeller ?? isBestSeller);
    }
    if (newArrival !== undefined || isNewArrival !== undefined) {
      product.newArrival = Boolean(newArrival ?? isNewArrival);
    }

    // Images
    if (explicitImages !== undefined || imageUrls !== undefined) {
      let images: { url: string; alt?: string; sortOrder?: number }[] = [];
      if (Array.isArray(explicitImages)) {
        images = explicitImages.map((img: { url: string; alt?: string; sortOrder?: number }, idx: number) => ({
          url: img.url,
          alt: img.alt || product.name,
          sortOrder: img.sortOrder ?? idx,
        }));
      } else if (Array.isArray(imageUrls)) {
        images = imageUrls.map((url: string, idx: number) => ({
          url,
          alt: product.name,
          sortOrder: idx,
        }));
      }
      product.images = images;
      product.thumbnail = images[0]?.url || undefined;
    }

    // Variants upsert
    let updatedVariantsList = [];
    if (Array.isArray(variants)) {
      if (variants.length === 0) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { message: 'Product must have at least one variant' } },
          { status: 400 }
        );
      }

      // Existing variants in DB for this product
      const existingDbVariants = await ProductVariant.find({ productId: product._id });
      const incomingVariantIds = new Set<string>();
      const currentVariantObjectIds: Types.ObjectId[] = [];

      for (const [index, v] of variants.entries()) {
        if (!v.sku || typeof v.sku !== 'string' || !v.sku.trim()) {
          return NextResponse.json<ApiResponse<never>>(
            { success: false, error: { message: `Variant #${index + 1} requires a SKU` } },
            { status: 400 }
          );
        }

        const variantId = v._id || v.id;
        const compareAtPrice = v.compareAtPrice !== undefined ? Number(v.compareAtPrice) : v.salePrice !== undefined ? Number(v.salePrice) : undefined;
        const inventory = v.inventory !== undefined ? Number(v.inventory) : v.stock !== undefined ? Number(v.stock) : 0;

        if (variantId && mongoose.isValidObjectId(variantId)) {
          // Update existing variant
          const updated = await ProductVariant.findByIdAndUpdate(
            variantId,
            {
              sku: v.sku.trim(),
              name: v.name || product.name,
              price: Number(v.price),
              compareAtPrice,
              inventory,
              attributes: v.attributes || {},
              active: v.active !== undefined ? Boolean(v.active) : true,
            },
            { new: true }
          );
          if (updated) {
            incomingVariantIds.add(String(updated._id));
            currentVariantObjectIds.push(updated._id as Types.ObjectId);
            updatedVariantsList.push(updated);
          }
        } else {
          // Create new variant
          const newVariant = new ProductVariant({
            productId: product._id,
            sku: v.sku.trim(),
            name: v.name || product.name,
            price: Number(v.price),
            compareAtPrice,
            inventory,
            attributes: v.attributes || {},
            active: v.active !== undefined ? Boolean(v.active) : true,
          });
          await newVariant.save();
          incomingVariantIds.add(String(newVariant._id));
          currentVariantObjectIds.push(newVariant._id as Types.ObjectId);
          updatedVariantsList.push(newVariant);
        }
      }

      // Delete removed variants
      const variantsToDelete = existingDbVariants.filter(
        (dbVar) => !incomingVariantIds.has(String(dbVar._id))
      );
      if (variantsToDelete.length > 0) {
        await ProductVariant.deleteMany({
          _id: { $in: variantsToDelete.map((v) => v._id) },
        });
      }

      product.variantIds = currentVariantObjectIds;
    } else {
      updatedVariantsList = await ProductVariant.find({ productId: product._id });
    }

    await product.save();

    return NextResponse.json<ApiResponse<{ product: typeof product; variants: typeof updatedVariantsList }>>({
      success: true,
      data: {
        product,
        variants: updatedVariantsList,
      },
    });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/products/[id] PUT]', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: errorMessage } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    await verifyAdminAccess(userId);

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Invalid product ID' } },
        { status: 400 }
      );
    }

    await dbConnect();

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { message: 'Product not found' } },
        { status: 404 }
      );
    }

    // Delete associated variants
    await ProductVariant.deleteMany({ productId: id });

    // Delete product
    await Product.findByIdAndDelete(id);

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: 'Product and variants deleted successfully' },
    });
  } catch (err) {
    if (err instanceof Response) {
      return new NextResponse(err.body, { status: err.status });
    }
    console.error('[admin/products/[id] DELETE]', err);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
