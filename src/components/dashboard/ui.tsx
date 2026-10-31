import type { ComponentProps, ReactNode } from "react";
import type { DashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

export type Incident = DashboardData["incidents"][number];
export type AgentAction = Incident["actions"][number];
export type PaymentEvent = DashboardData["events"][number];
export type AuditEntry = DashboardData["audit"][number];

/** 24h HH:MM for chart ticks and dense rows. */
export function hhmm(date: string | Date | number, seconds = false) {
  return new Date(date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: seconds ? "2-digit" : undefined });
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-2xl border border-line/80 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_28px_-18px_rgba(0,46,110,0.28)]", className)} {...props} />;
}

export function CardHeader({ icon, title, meta, className }: { icon?: ReactNode; title: ReactNode; meta?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex items-center justify-between gap-3 border-b border-line/80 px-4 py-2.5", className)}>
      <h2 className="flex min-w-0 items-center gap-2.5 text-[14px] font-bold tracking-[-0.01em] text-navy [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-sky">
        {icon && <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sky-soft">{icon}</span>}
        <span className="truncate">{title}</span>
      </h2>
      {meta && <div className="shrink-0 text-xs text-ink-3">{meta}</div>}
    </header>
  );
}

const PILL = {
  neutral: "bg-page text-ink-2 ring-line",
  sky: "bg-sky-soft text-navy-2 ring-sky/30",
  ok: "bg-ok-soft text-[#067647] ring-ok/30",
  warn: "bg-warn-soft text-[#b54708] ring-warn/30",
  bad: "bg-bad-soft text-[#b42318] ring-bad/30",
  navy: "bg-navy text-white ring-navy",
} as const;
export type Tone = keyof typeof PILL;

export function Pill({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 ring-1 ring-inset [&_svg]:size-3", PILL[tone], className)}>
      {children}
    </span>
  );
}

const BTN = {
  primary: "bg-sky text-white hover:bg-[#00a6d9] shadow-sm",
  approve: "bg-ok text-white hover:bg-[#0e9f5c] shadow-sm",
  secondary: "bg-card text-navy ring-1 ring-inset ring-line hover:bg-page",
  ghost: "text-ink-2 hover:bg-page hover:text-navy",
  danger: "text-[#b42318] hover:bg-bad-soft",
  dark: "bg-white/10 text-white ring-1 ring-inset ring-white/15 hover:bg-white/20",
} as const;

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof BTN; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0",
        size === "sm" && "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        size === "md" && "h-8 px-3 text-[13px] [&_svg]:size-4",
        size === "lg" && "h-10 px-5 text-sm [&_svg]:size-4",
        BTN[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-line/70", className)} />;
}
