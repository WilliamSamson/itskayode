import type { ReactNode } from "react";

export default function PageTemplate({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="page-transition">{children}</div>;
}
