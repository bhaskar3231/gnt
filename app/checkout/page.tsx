"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, useUser, SignInButton } from "@clerk/nextjs";

interface CartItem {
  productVariantId: string;
  quantity: number;
  price: number;
  priceSnapshot?: {
    name?: string;
    variantName?: string;
  };
}

interface Cart {
  items: CartItem[];
  subtotal: number;
  total: number;
}

interface AddressForm {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const EMPTY_FORM: AddressForm = {
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

export default function CheckoutPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<AddressForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) return; // will show sign-in prompt below

    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const c: Cart = data.data;
          setCart(c);
          if (!c?.items?.length) {
            router.replace("/cart");
          }
        }
      })
      .catch(() => {})
      .finally(() => setCartLoading(false));
  }, [isLoaded, isSignedIn, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof AddressForm]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = (): boolean => {
    const errs: Partial<AddressForm> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    else if (!/^\d{10}$/.test(form.phone.trim()))
      errs.phone = "Enter a valid 10-digit phone number";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.city.trim()) errs.city = "City is required";
    if (!form.state.trim()) errs.state = "State is required";
    if (!form.postalCode.trim()) errs.postalCode = "Postal code is required";
    else if (!/^\d{6}$/.test(form.postalCode.trim()))
      errs.postalCode = "Enter a valid 6-digit postal code";
    if (!form.country.trim()) errs.country = "Country is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validate() || !cart) return;

    setSubmitting(true);
    setSubmitError("");

    const payload = {
      items: cart.items.map((i) => ({
        productVariantId: i.productVariantId,
        quantity: i.quantity,
        price: i.price,
      })),
      shippingAddress: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim(),
      },
      paymentMethod: "COD",
      subtotal: cart.subtotal,
      shipping: 0,
      tax: 0,
      total: cart.total,
      // Pass Clerk user info so the API can auto-create the MongoDB user if missing
      userEmail: user?.primaryEmailAddress?.emailAddress ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/orders/${data.data._id}?new=true`);
      } else {
        setSubmitError(data.message || "Failed to place order. Please try again.");
      }
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Not loaded yet ──
  if (!isLoaded || (isSignedIn && cartLoading)) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // ── Not signed in ──
  if (!isSignedIn) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center gap-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Please sign in to checkout</h1>
        <p className="text-gray-500">You need an account to place an order.</p>
        <SignInButton mode="modal">
          <button className="bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors">
            Sign In
          </button>
        </SignInButton>
        <Link href="/cart" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to cart
        </Link>
      </main>
    );
  }

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const total = cart?.total ?? subtotal;

  const inputClass = (field: keyof AddressForm) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 ${
      errors[field] ? "border-red-400 focus:ring-red-400" : "border-gray-200"
    }`;

  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Left: Delivery Address ── */}
        <div className="flex-1 space-y-6">
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              Delivery Address
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Raj Kumar"
                  className={inputClass("name")}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  maxLength={10}
                  className={inputClass("phone")}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="123, Main Street, Near..."
                  rows={3}
                  className={inputClass("address")}
                />
                {errors.address && (
                  <p className="mt-1 text-xs text-red-500">{errors.address}</p>
                )}
              </div>

              {/* City + State */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Delhi"
                    className={inputClass("city")}
                  />
                  {errors.city && (
                    <p className="mt-1 text-xs text-red-500">{errors.city}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Delhi"
                    className={inputClass("state")}
                  />
                  {errors.state && (
                    <p className="mt-1 text-xs text-red-500">{errors.state}</p>
                  )}
                </div>
              </div>

              {/* Postal + Country */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    placeholder="110001"
                    maxLength={6}
                    className={inputClass("postalCode")}
                  />
                  {errors.postalCode && (
                    <p className="mt-1 text-xs text-red-500">{errors.postalCode}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="India"
                    className={inputClass("country")}
                  />
                  {errors.country && (
                    <p className="mt-1 text-xs text-red-500">{errors.country}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Payment Method ── */}
          <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Payment Method
            </h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                checked
                readOnly
                disabled
                className="mt-0.5 accent-gray-900"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  💵 Cash on Delivery
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pay when your order arrives
                </p>
              </div>
            </label>
          </section>

          {/* ── Place Order ── */}
          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
              {submitError}
            </p>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={submitting}
            className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold text-base hover:bg-gray-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Placing Order…
              </>
            ) : (
              "Place Order"
            )}
          </button>
        </div>

        {/* ── Right: Order Summary ── */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4 sticky top-24">
            <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>

            <ul className="space-y-3 text-sm">
              {items.map((item) => {
                const name = item.priceSnapshot?.name ?? "Product";
                const variant = item.priceSnapshot?.variantName;
                return (
                  <li
                    key={item.productVariantId}
                    className="flex justify-between gap-2"
                  >
                    <span className="text-gray-700 truncate flex-1">
                      {name}
                      {variant && (
                        <span className="text-gray-400"> · {variant}</span>
                      )}{" "}
                      <span className="text-gray-400">×{item.quantity}</span>
                    </span>
                    <span className="font-medium text-gray-900 flex-shrink-0">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
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
          </div>
        </div>
      </div>
    </main>
  );
}
