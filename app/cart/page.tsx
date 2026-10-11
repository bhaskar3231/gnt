"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ShoppingBag, Trash2, Minus, Plus } from "lucide-react";
import { useAuth, SignInButton } from "@clerk/nextjs";

interface CartItem {
  productVariantId: string;
  quantity: number;
  price: number;
  priceSnapshot?: {
    name?: string;
    variantName?: string;
    image?: string;
  };
}

interface Cart {
  items: CartItem[];
  subtotal: number;
  total: number;
  shipping?: number;
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100">
          <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CartPage() {
  const { isSignedIn } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (data.success) {
        setCart(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (productVariantId: string, newQty: number) => {
    if (!cart) return;

    // Optimistic update
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items
        .map((item) =>
          item.productVariantId === productVariantId
            ? { ...item, quantity: newQty }
            : item
        )
        .filter((item) => item.quantity > 0);
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      return { ...prev, items, subtotal, total: subtotal };
    });

    setUpdatingId(productVariantId);
    try {
      const res = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId, quantity: newQty }),
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.data);
      }
    } catch {
      // revert on error
      fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (productVariantId: string) => {
    if (!cart) return;

    // Optimistic update
    setCart((prev) => {
      if (!prev) return prev;
      const items = prev.items.filter(
        (item) => item.productVariantId !== productVariantId
      );
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      return { ...prev, items, subtotal, total: subtotal };
    });

    setUpdatingId(productVariantId);
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCart(data.data);
      }
    } catch {
      fetchCart();
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Your Cart</h1>
        <LoadingSkeleton />
      </main>
    );
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="text-gray-500">Looks like you haven&apos;t added anything yet.</p>
        <Link
          href="/products"
          className="inline-block bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          Browse Products
        </Link>
      </main>
    );
  }

  const subtotal = cart?.subtotal ?? 0;
  const total = cart?.total ?? subtotal;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Your Cart ({items.length} {items.length === 1 ? "item" : "items"})
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Items list */}
        <div className="flex-1 space-y-4">
          {items.map((item) => {
            const name = item.priceSnapshot?.name ?? "Product";
            const variantName = item.priceSnapshot?.variantName;
            const image = item.priceSnapshot?.image;
            const isUpdating = updatingId === item.productVariantId;

            return (
              <div
                key={item.productVariantId}
                className={`flex gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-opacity ${
                  isUpdating ? "opacity-50" : ""
                }`}
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-lg flex-shrink-0 overflow-hidden bg-gray-100">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-lg" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{name}</p>
                  {variantName && (
                    <p className="text-sm text-gray-500">{variantName}</p>
                  )}
                  <p className="text-sm text-gray-700 mt-1">
                    ₹{item.price.toLocaleString("en-IN")} each
                  </p>

                  {/* Qty stepper + remove */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center border border-gray-200 rounded-lg">
                      <button
                        onClick={() =>
                          updateQuantity(item.productVariantId, item.quantity - 1)
                        }
                        disabled={isUpdating || item.quantity <= 1}
                        className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-3 text-sm font-medium min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.productVariantId, item.quantity + 1)
                        }
                        disabled={isUpdating}
                        className="p-1.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.productVariantId)}
                      disabled={isUpdating}
                      className="p-1.5 text-red-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Line total */}
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-gray-900">
                    ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order summary */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">FREE</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-lg text-gray-900">
              <span>Total</span>
              <span>₹{total.toLocaleString("en-IN")}</span>
            </div>

            {isSignedIn ? (
              <Link
                href="/checkout"
                className="block w-full text-center bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors"
              >
                Proceed to Checkout
              </Link>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 text-center">
                  Sign in to checkout
                </p>
                <SignInButton mode="modal">
                  <button className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            )}

            <Link
              href="/products"
              className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
