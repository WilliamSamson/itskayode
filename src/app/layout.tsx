import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteContent } from "@/content/site";
import { AppShell } from "@/components/app-shell";

const sansStack = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const headingStack = 'Outfit, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://itskayode.web.app"),
  title: {
    default: `${siteContent.fullName} | ${siteContent.siteTitle}`,
    template: `%s | ${siteContent.fullName}`
  },
  description: siteContent.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteContent.fullName,
  },
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
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-light.png", media: "(prefers-color-scheme: light)", type: "image/png" },
      { url: "/icon-dark.png", media: "(prefers-color-scheme: dark)", type: "image/png" },
      { url: "/icon.png", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
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
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
