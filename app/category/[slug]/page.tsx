import Link from "next/link";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";

const TYPE_COLORS: Record<string, string> = {
  GIFT: "bg-purple-100 text-purple-700",
  TREAT: "bg-orange-100 text-orange-700",
  CHILDREN: "bg-blue-100 text-blue-700",
  GENERAL: "bg-gray-100 text-gray-700",
};

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await dbConnect();

  const category = await Category.findOne({ slug, isActive: true }).lean();
  if (!category) {
    notFound();
  }

  const products = await Product.find({
    categoryIds: category._id,
    status: "ACTIVE",
  })
    .sort({ createdAt: -1 })
    .lean();

  const productIds = products.map((p) => p._id);
  const allVariants = await ProductVariant.find({
    productId: { $in: productIds },
    active: true,
  })
    .select("productId price")
    .lean();

  const cheapestPriceMap = new Map<string, number>();
  for (const v of allVariants) {
    const id = v.productId.toString();
    const existing = cheapestPriceMap.get(id);
    if (existing === undefined || v.price < existing) {
      cheapestPriceMap.set(id, v.price);
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/products" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← All Products
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
        {category.description && (
          <p className="text-gray-600 mt-1 text-sm">{category.description}</p>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No products in this category</p>
          <p className="text-sm mt-1">Check back later for new arrivals.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const price = cheapestPriceMap.get(product._id.toString());
            return (
              <Link
                key={product._id.toString()}
                href={`/product/${product.slug}`}
                className="group rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow bg-white"
              >
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                      🎁
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                      {product.name}
                    </h2>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                        TYPE_COLORS[product.type] ?? TYPE_COLORS.GENERAL
                      }`}
                    >
                      {product.type}
                    </span>
                  </div>
                  {price !== undefined && (
                    <p className="text-sm font-bold text-gray-800 mt-2">
                      from {formatPrice(price)}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
