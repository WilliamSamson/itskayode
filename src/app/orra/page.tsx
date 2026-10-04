import type { Metadata, Viewport } from "next";
import { OrraClient } from "./orra-client";

export const viewport: Viewport = {
  themeColor: "#020106",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    absolute: "ORRA: A Living World",
  },
  description:
    "A living world shaped by time, weather, climate and its environment. Built and maintained by Kayode.",
  authors: [{ name: "Kayode", url: "https://itskayode.web.app" }],
  creator: "Kayode",
  alternates: {
    canonical: "https://itskayode.web.app/orra",
  },
  openGraph: {
    type: "website",
    title: "ORRA: A Living World",
    description:
      "A living world shaped by time, weather, climate and its environment.",
    siteName: "ORRA",
    url: "https://itskayode.web.app/orra",
    images: [
      {
        url: "/orra/og-orra.png",
        width: 1200,
        height: 630,
        alt: "ORRA: A Living World",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ORRA: A Living World",
    description:
      "A living world shaped by time, weather, climate and its environment.",
    images: ["/orra/og-orra.png"],
    creator: "@itskayode",
  },
  icons: {
    icon: [
      { url: "/orra/icon.svg", type: "image/svg+xml" },
      { url: "/orra/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/orra/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ORRA",
  },
};

export default function OrraPage() {
  return <OrraClient />;
}
