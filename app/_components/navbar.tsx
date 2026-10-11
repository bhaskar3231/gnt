"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ShoppingCart, Menu, X, ChevronDown } from "lucide-react";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export default function Navbar() {
  const { isSignedIn } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCartCount(data.data?.items?.length ?? 0);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/categories?rootOnly=true&limit=20")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setCategories(data.data ?? []);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-gray-900 flex-shrink-0">
            🎁 Gift &amp; Treat
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/products"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Products
            </Link>

            {/* Categories dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setCategoriesOpen((o) => !o)}
                onMouseEnter={() => setCategoriesOpen(true)}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Categories <ChevronDown className="w-4 h-4" />
              </button>

              {categoriesOpen && (
                <div
                  onMouseLeave={() => setCategoriesOpen(false)}
                  className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
                >
                  {categories.length === 0 ? (
                    <p className="px-4 py-2 text-sm text-gray-500">No categories</p>
                  ) : (
                    categories.map((cat) => (
                      <Link
                        key={cat._id}
                        href={`/category/${cat.slug}`}
                        onClick={() => setCategoriesOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {cat.name}
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* Cart */}
            <Link href="/cart" className="relative p-1">
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {isSignedIn ? (
              <UserButton />
            ) : (
              <SignInButton mode="modal">
                <button className="text-sm font-medium text-white bg-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1 text-gray-700"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 flex flex-col gap-1">
            <Link
              href="/products"
              onClick={() => setMobileOpen(false)}
              className="px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
            >
              Products
            </Link>
            <div>
              <button
                onClick={() => setCategoriesOpen((o) => !o)}
                className="w-full flex items-center justify-between px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Categories <ChevronDown className="w-4 h-4" />
              </button>
              {categoriesOpen && (
                <div className="ml-4 flex flex-col gap-1 mt-1">
                  {categories.map((cat) => (
                    <Link
                      key={cat._id}
                      href={`/category/${cat.slug}`}
                      onClick={() => { setMobileOpen(false); setCategoriesOpen(false); }}
                      className="px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
