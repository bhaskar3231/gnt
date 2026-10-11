import Link from "next/link";
import dbConnect from "@/lib/db";
import { Product } from "@/models/Product";
import { ProductVariant } from "@/models/ProductVariant";

const TYPE_COLORS: Record<string, string> = {
  GIFT: "bg-purple-100 text-purple-700",
  TREAT: "bg-orange-100 text-orange-700",
  CHILDREN: "bg-blue-100 text-blue-700",
  GENERAL: "bg-gray-100 text-gray-700",
};

const PRODUCT_TYPES = ["ALL", "GIFT", "TREAT", "CHILDREN", "GENERAL"] as const;

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

interface SearchParams {
  search?: string;
  type?: string;
  page?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { search, type, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const limit = 20;

  await dbConnect();

  const query: Record<string, unknown> = { status: "ACTIVE" };
  if (search) {
    query.name = { $regex: search, $options: "i" };
  }
  if (type && type !== "ALL") {
    query.type = type;
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(query),
  ]);

  // For each product, find its cheapest active variant price
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

  const totalPages = Math.ceil(total / limit);

  function buildUrl(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.type && params.type !== "ALL") sp.set("type", params.type);
    if (params.page && params.page !== "1") sp.set("page", params.page);
    const qs = sp.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Products</h1>

      {/* Search + type filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form action="/products" method="GET" className="flex gap-2 flex-1">
          {type && type !== "ALL" && <input type="hidden" name="type" value={type} />}
          <input
            type="text"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Search products…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {PRODUCT_TYPES.map((t) => {
          const isActive = (type ?? "ALL") === t;
          return (
            <Link
              key={t}
              href={buildUrl({ search, type: t, page: "1" })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t}
            </Link>
          );
        })}
      </div>

      {/* Product grid */}
      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          {page > 1 ? (
            <Link
              href={buildUrl({ search, type, page: String(page - 1) })}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Previous
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm font-medium text-gray-300 border border-gray-200 rounded-lg cursor-not-allowed">
              ← Previous
            </span>
          )}

          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={buildUrl({ search, type, page: String(page + 1) })}
              className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Next →
            </Link>
          ) : (
            <span className="px-4 py-2 text-sm font-medium text-gray-300 border border-gray-200 rounded-lg cursor-not-allowed">
              Next →
            </span>
          )}
        </div>
      )}
    </main>
  );
}
