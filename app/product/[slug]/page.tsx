import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";
import ImageGallery from "../_components/image-gallery";
import AddToCartSection from "../_components/add-to-cart-section";

const TYPE_COLORS: Record<string, string> = {
  GIFT: "bg-purple-100 text-purple-700",
  TREAT: "bg-orange-100 text-orange-700",
  CHILDREN: "bg-blue-100 text-blue-700",
  GENERAL: "bg-gray-100 text-gray-700",
};

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await dbConnect();

  const product = await Product.findOne({ slug, status: "ACTIVE" }).lean();
  if (!product) {
    notFound();
  }

  const variants = await ProductVariant.find({
    productId: product._id,
    active: true,
  })
    .sort({ price: 1 })
    .lean();

  const cheapestVariant = variants[0];

  // Serialise for client components (ObjectIds → strings)
  const serialisedVariants = variants.map((v) => ({
    ...v,
    _id: v._id.toString(),
    productId: v.productId.toString(),
  }));

  const images = product.images ?? [];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image gallery */}
        <ImageGallery
          images={images.map((img) => ({ url: img.url ?? "", alt: img.alt }))}
          thumbnail={product.thumbnail}
        />

        {/* Product details */}
        <div className="flex flex-col gap-4">
          {/* Type badge */}
          <span
            className={`self-start text-xs font-medium px-2.5 py-1 rounded-full ${
              TYPE_COLORS[product.type] ?? TYPE_COLORS.GENERAL
            }`}
          >
            {product.type}
          </span>

          {/* Name */}
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {product.name}
          </h1>

          {/* Short description */}
          {product.shortDescription && (
            <p className="text-gray-600 text-sm leading-relaxed">
              {product.shortDescription}
            </p>
          )}

          {/* Price */}
          {cheapestVariant && (
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(cheapestVariant.price)}
              </span>
              {cheapestVariant.compareAtPrice && (
                <span className="text-lg text-gray-400 line-through">
                  {formatPrice(cheapestVariant.compareAtPrice)}
                </span>
              )}
            </div>
          )}

          <hr className="border-gray-200" />

          {/* Add to cart section (client) */}
          {variants.length > 0 ? (
            <AddToCartSection
              variants={serialisedVariants}
              productId={product._id.toString()}
            />
          ) : (
            <p className="text-sm text-gray-500">
              This product is currently unavailable.
            </p>
          )}
        </div>
      </div>

      {/* Full description */}
      {product.description && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
          <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        </div>
      )}
    </main>
  );
}
