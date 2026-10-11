"use client";

import { useState } from "react";
import Link from "next/link";

interface IProductVariant {
  _id: string;
  productId: string;
  sku: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  inventory: number;
  active: boolean;
}

interface Props {
  variants: IProductVariant[];
  productId: string;
}

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function AddToCartSection({ variants, productId }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<IProductVariant>(variants[0]);
  const [quantity, setQuantity] = useState(1);
  const maxQty = selectedVariant.inventory > 0 ? Math.min(selectedVariant.inventory, 99) : 0;
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddToCart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: selectedVariant._id,
          quantity,
          price: selectedVariant.price,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Failed to add to cart");
      }
      setAdded(true);
      window.dispatchEvent(new Event("cart-updated"));
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Variant selector */}
      {variants.length > 1 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Select variant</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v._id}
                onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  selectedVariant._id === v._id
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 text-gray-700 hover:border-gray-500"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected variant price */}
      <div className="flex items-baseline gap-3">
        <span className="text-xl font-bold text-gray-900">
          {formatPrice(selectedVariant.price)}
        </span>
        {selectedVariant.compareAtPrice && (
          <span className="text-base text-gray-400 line-through">
            {formatPrice(selectedVariant.compareAtPrice)}
          </span>
        )}
      </div>

      {/* Quantity stepper */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Quantity</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold text-gray-900">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={quantity >= maxQty ? `Maximum stock reached (${maxQty})` : undefined}
          >
            +
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Add to cart button */}
      {maxQty === 0 && (
        <p className="text-sm font-medium text-red-600">Out of stock</p>
      )}
      {quantity >= maxQty && maxQty > 0 && (
        <p className="text-xs text-amber-600">Maximum stock reached ({maxQty} available)</p>
      )}
      <button
        onClick={handleAddToCart}
        disabled={loading || added || maxQty === 0}
        className={`w-full py-3 px-6 rounded-xl text-sm font-semibold transition-colors ${
          added
            ? "bg-green-600 text-white"
            : "bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        }`}
      >
        {added ? "✓ Added to Cart!" : loading ? "Adding…" : "Add to Cart"}
      </button>

      {/* View cart link */}
      <Link
        href="/cart"
        className="text-center text-sm text-gray-500 hover:text-gray-800 underline underline-offset-2 transition-colors"
      >
        View Cart
      </Link>
    </div>
  );
}
