export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-8 py-20 select-none pointer-events-none"
      role="status"
      aria-label="Loading page"
    >
      {/* Dynamic Geometric Schematic Spinner */}
      <div className="relative h-20 w-20 flex items-center justify-center">
        {/* Dotted Crosshair Ring */}
        <div className="absolute inset-0 rounded-full border border-dashed border-text/10" />
        
        {/* Outer Tech Dial */}
        <div
          className="absolute inset-[-8px] rounded-full border-2 border-t-text/30 border-r-transparent border-b-transparent border-l-transparent animate-spin"
          style={{ animationDuration: "2s" }}
        />
        
        {/* Middle Dial (Reverse rotation) */}
        <div className="absolute inset-1 rounded-full border border-dotted border-text/20 animate-reverse-spin" />
        
        {/* Inner solid dial segment */}
        <div className="absolute inset-3 rounded-full border-2 border-b-text/40 border-t-transparent border-r-transparent border-l-transparent animate-spin-slow" />
        
        {/* Central Core Circle Indicator */}
        <span className="font-heading font-black text-xs tracking-widest text-text">
          KO
        </span>
      </div>

      {/* Terminal Loading Output */}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-text/45 animate-pulse">
          Initializing Synaptic Link
        </span>
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-text/30">
          Status: Calibration Flow [Active]
        </span>
      </div>
    </div>
  );
}
