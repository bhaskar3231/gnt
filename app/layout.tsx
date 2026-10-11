import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "./_components/navbar";

export const metadata: Metadata = {
  title: "Gift & Treat - Premium Gifts & Traditional Treats",
  description: "Authentic gifts and traditional North Indian treats. Perfect for every occasion.",
  keywords: [
    "gifts",
    "traditional treats",
    "namkeen",
    "gujiya",
    "educational toys",
    "corporate gifts",
  ],
  openGraph: {
    title: "Gift & Treat",
    description: "Authentic gifts and traditional North Indian treats",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className="h-full antialiased"
      >
        <body className="min-h-full flex flex-col">
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}