import { Suspense } from 'react';
import Link from 'next/link';
import dbConnect from '@/lib/db';
import { ProductRepository } from '@/repositories/ProductRepository';
import { CategoryRepository } from '@/repositories/CategoryRepository';

async function FeaturedProducts() {
  try {
    await dbConnect();
    const products = await ProductRepository.getFeatured(6);
    
    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Featured Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.length > 0 ? (
              products.map((product: any) => (
                <Link key={product._id} href={`/product/${product.slug}`}>
                  <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="bg-gray-200 h-48 flex items-center justify-center">
                      {product.thumbnail ? (
                        <img
                          src={product.thumbnail}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400">No image</span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{product.shortDescription}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No featured products yet
              </div>
            )}
          </div>
        </div>
      </section>
    );
  } catch (error) {
    console.error('Error loading featured products:', error);
    return (
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Featured Products</h2>
          <div className="text-center py-8 text-red-500">
            Error loading products
          </div>
        </div>
      </section>
    );
  }
}

async function CategoriesSection() {
  try {
    await dbConnect();
    const categories = await CategoryRepository.findRootCategories();

    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Shop by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categories.length > 0 ? (
              categories.map((category: any) => (
                <Link key={category._id} href={`/category/${category.slug}`}>
                  <div className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="bg-gradient-to-br from-blue-400 to-blue-600 h-32 flex items-center justify-center">
                      <span className="text-white text-lg font-semibold text-center px-4">
                        {category.name}
                      </span>
                    </div>
                    <div className="p-4 text-center">
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No categories yet
              </div>
            )}
          </div>
        </div>
      </section>
    );
  } catch (error) {
    console.error('Error loading categories:', error);
    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Shop by Category</h2>
          <div className="text-center py-8 text-red-500">
            Error loading categories
          </div>
        </div>
      </section>
    );
  }
}

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Gift & Treat</h1>
          <p className="text-lg md:text-xl mb-8">
            Authentic gifts and traditional treats for every occasion
          </p>
          <Link href="/products">
            <button className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Shop Now
            </button>
          </Link>
        </div>
      </section>

      {/* Categories */}
      <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
        <CategoriesSection />
      </Suspense>

      {/* Featured Products */}
      <Suspense fallback={<div className="h-40 bg-gray-100 animate-pulse" />}>
        <FeaturedProducts />
      </Suspense>

      {/* Trust Features */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <h3 className="font-semibold text-lg mb-2">🚚 Fast Delivery</h3>
              <p className="text-gray-600">Quick and reliable shipping</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">✅ Quality Assured</h3>
              <p className="text-gray-600">Premium and authentic products</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">🔒 Secure Checkout</h3>
              <p className="text-gray-600">Safe and encrypted payments</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}