import Image from "next/image";

export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-8 py-20 select-none pointer-events-none"
      role="status"
      aria-label="Loading page"
    >
      {/* Geometric Spinner */}
      <div className="relative h-20 w-20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-dashed border-text/10" />
        <div
          className="absolute inset-[-8px] rounded-full border-2 border-t-text/30 border-r-transparent border-b-transparent border-l-transparent animate-spin"
          style={{ animationDuration: "2s" }}
        />
        <div className="absolute inset-1 rounded-full border border-dotted border-text/20 animate-reverse-spin" />
        <div className="absolute inset-3 rounded-full border-2 border-b-text/40 border-t-transparent border-r-transparent border-l-transparent animate-spin-slow" />
        <div className="relative h-6 w-6 overflow-hidden rounded-sm">
          <Image
            src="/itskayode.png"
            alt="Loading"
            width={24}
            height={24}
            className="h-full w-full object-contain"
            priority
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-[11px] font-semibold text-text/45 animate-pulse">
          Loading
        </span>
        <span className="text-[11px] text-text/30">
          One moment
        </span>
      </div>
    </div>
  );
}
