import { siteContent } from "@/content/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border/20 py-10">
      <div className="container space-y-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-2xl text-sm leading-7 text-white/75 md:text-base">
            Building at the intersection of full-stack software engineering, mechatronics, robotics,
            and systems architecture.
          </p>
          <div className="space-y-2 md:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/45">Scope</p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/75 md:text-sm">
              {siteContent.role}
            </p>
          </div>
        </div>

        <div className="h-px w-full bg-white/10" />

        <div className="flex flex-col gap-2 text-xs uppercase tracking-[0.18em] text-white/55 md:flex-row md:items-center md:justify-between">
          <p>(c) {year} {siteContent.fullName}</p>
          <p>Execution. Systems. Innovation.</p>
        </div>
      </div>
    </footer>
  );
}
