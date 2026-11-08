// Title block shared by the main screens; actions wrap under the title on narrow screens
import type { ReactNode } from "react";

export default function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-[32px] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-muted text-[15px]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}
