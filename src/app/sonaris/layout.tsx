import type { Metadata } from "next";
import "@/sonaris/sonaris.css";

export const metadata: Metadata = {
  title: {
    default: "SONARIS: Indoor Spatial Mapping",
    template: "%s | SONARIS"
  },
  description:
    "Camera-free indoor spatial-capture rover combining a holonomic base with a mechanically tilting S2 30 m 2D LiDAR for spatial capture.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SONARIS"
  },
  icons: {
    icon: "/sonaris/brand/rover.png",
    apple: "/sonaris/brand/rover.png"
  }
};

export default function SonarisLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
