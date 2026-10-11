"use client";

import { useState } from "react";

interface ImageItem {
  url: string;
  alt?: string;
}

interface Props {
  images: ImageItem[];
  thumbnail?: string;
}

export default function ImageGallery({ images, thumbnail }: Props) {
  // Build the full list: prefer images array, fall back to thumbnail-only
  const allImages: ImageItem[] = images.length > 0
    ? images
    : thumbnail
    ? [{ url: thumbnail, alt: "Product image" }]
    : [];

  const [activeIndex, setActiveIndex] = useState(0);

  if (allImages.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-6xl">
        🎁
      </div>
    );
  }

  const active = allImages[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
        <img
          src={active.url}
          alt={active.alt ?? "Product image"}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                i === activeIndex
                  ? "border-gray-900"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              <img
                src={img.url}
                alt={img.alt ?? `Thumbnail ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
