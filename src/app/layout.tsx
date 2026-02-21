import type { Metadata } from "next";
import "./globals.css";
import { siteContent } from "@/content/site";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { HardNavigation } from "@/components/hard-navigation";

const sansStack = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const headingStack = 'Outfit, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://itskayode.web.app"),
  title: {
    default: siteContent.siteTitle,
    template: "%s | Kayode Olalere"
  },
  description: siteContent.description,
  openGraph: {
    type: "website",
    title: siteContent.siteTitle,
    description: siteContent.description,
    siteName: siteContent.siteTitle,
    url: "/",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: siteContent.siteTitle
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteContent.siteTitle,
    description: siteContent.description,
    images: ["/og-image.svg"]
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        suppressHydrationWarning
        className="bg-bg font-sans text-text antialiased relative h-full flex flex-col"
        style={{
          "--font-sans": sansStack,
          "--font-heading": headingStack
        } as React.CSSProperties}
      >
        <a
          href="#main-content"
          className="focus-ring sr-only z-50 rounded bg-bg px-4 py-2 focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <HardNavigation />
        <Navbar />
        <main id="main-content" className="container relative z-10 flex-1 py-12 sm:py-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
