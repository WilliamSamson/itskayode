import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { RoverTopView } from '@/sonaris/components/rover-top-view';

export const metadata: Metadata = {
  title: {
    absolute: 'SONARIS: Indoor Spatial Mapping',
  },
  description:
    'Camera-free indoor spatial-capture rover combining a holonomic base with a mechanically tilting S2 30 m 2D LiDAR for spatial capture.',
  icons: {
    icon: '/sonaris/brand/rover.png',
  },
  openGraph: {
    title: 'SONARIS',
    description:
      'Camera-free indoor spatial-capture rover combining a holonomic base with a mechanically tilting S2 30 m 2D LiDAR for spatial capture.',
    url: '/sonaris/',
    siteName: 'SONARIS',
    images: [
      {
        url: '/sonaris/brand/rover.png',
        width: 1200,
        height: 630,
        alt: 'SONARIS Rover Canonical Assembly',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SONARIS',
    description:
      'Camera-free indoor spatial-capture rover combining a holonomic base with a mechanically tilting S2 30 m 2D LiDAR for spatial capture.',
    images: ['/sonaris/brand/rover.png'],
  },
};

export default function SonarisPage() {
  return (
    <div className="sonaris-page w-full min-h-[100dvh] bg-[#000000] text-[#111116] flex flex-col items-center justify-center p-6 sm:p-10 md:p-12 select-none">
      <div className="w-full max-w-[1020px] mx-auto">
        {/* Spacious card layout with relaxed gutters */}
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1.3fr] gap-6 lg:gap-7">
          {/* Left Tall Card: Terra-cotta Red Rover Stage */}
          <div className="md:row-span-2 bg-[var(--sonaris-red)] rounded-[28px] p-7 sm:p-8 flex flex-col justify-between min-h-[460px] md:min-h-[530px] relative overflow-hidden group shadow-2xl">
            {/* Top header details */}
            <div className="flex items-center justify-between text-[#111116]">
              <span className="font-mono text-[13px] font-black tracking-wider uppercase">01</span>
              <div className="text-right font-mono text-[9px] font-bold tracking-widest uppercase leading-tight opacity-80">
                Spatial Tech<br />2026
              </div>
            </div>

            {/* Rover Animation Stage */}
            <div className="my-auto w-full flex items-center justify-center py-6 relative z-10">
              <RoverTopView />
            </div>

            {/* Bottom details */}
            <div className="flex items-end justify-between text-[#111116] pt-4">
              <div className="font-black text-[22px] tracking-[-0.04em] uppercase font-mono leading-none">
                SONARIS
              </div>
              <div className="flex items-center gap-1.5 opacity-80">
                <span className="w-2.5 h-1.5 rounded-full bg-[#111116]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#111116]" />
              </div>
            </div>
          </div>

          {/* Top Right Card: Orange Project Introduction */}
          <div className="bg-[var(--sonaris-orange)] text-[#111116] rounded-[28px] p-7 sm:p-9 flex flex-col justify-between min-h-[270px] shadow-2xl relative overflow-hidden">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
              Engineering Final Year Project · 2026
            </span>

            <div className="my-4">
              <div className="h-12 sm:h-14 relative w-44 sm:w-52 mb-3">
                <Image
                  src="/sonaris/brand/wordmark.png"
                  alt="SONARIS"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>
              <p className="text-[15px] sm:text-[16px] font-medium leading-relaxed opacity-90 max-w-[420px]">
                A camera-free rover with an S2 30 m 2D LiDAR. A tilting mount captures successive scan planes for 3D reconstruction.
              </p>
            </div>

            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] opacity-75">
              Holonomic drive · Tilting S2 30 m 2D LiDAR
            </span>
          </div>

          {/* Bottom Right: Two Industrial Cards (Dark Yellow + Dark Green) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-h-[175px]">
            {/* 1st Button: Navigation Overview in Dark Yellow */}
            <Link
              href="/sonaris/workspace/"
              className="group bg-[var(--sonaris-yellow)] hover:brightness-105 rounded-[24px] p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-xl text-[#111116]"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] uppercase tracking-wider font-semibold opacity-80">
                  01 / System
                </span>
                <span className="font-bold group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200">
                  ↗
                </span>
              </div>
              <div>
                <strong className="block font-mono text-[20px] sm:text-[22px] font-black tracking-tight leading-tight">
                  Workspace
                </strong>
                <span className="block font-mono text-[11px] opacity-85 mt-1 leading-snug font-medium">
                  Interactive subsystem graph
                </span>
              </div>
            </Link>

            {/* 2nd Card: Cyber Tech Letter 'V' in Dark Green (Static Card) */}
            <div
              className="bg-[var(--sonaris-green)] rounded-[24px] p-6 flex flex-col justify-between shadow-xl text-[#111116] relative overflow-hidden"
            >
              {/* Graphic icon top right */}
              <div className="flex items-start justify-between">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider opacity-80">
                  SECTOR // 01
                </span>
                <div className="flex gap-0.5 opacity-80">
                  <div className="w-2 h-2.5 bg-[#111116] -skew-x-12" />
                  <div className="w-2 h-2.5 bg-[#111116] -skew-x-12" />
                </div>
              </div>

              {/* Stylized cyber tech 'V' typography */}
              <div className="my-auto py-1 flex items-baseline">
                <span className="font-mono font-black text-[52px] sm:text-[58px] leading-none tracking-tighter uppercase mr-1">
                  V
                </span>
                <span className="font-mono font-extrabold text-[26px] sm:text-[30px] text-[#C25443] leading-none tracking-tight">
                  01
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[#111116]/30 pt-2 font-mono text-[9px] font-bold tracking-wider">
                <span>RECON MATRIX</span>
                <span>●</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
