import { Activity, MessageSquareText, Siren, TriangleAlert } from "lucide-react";
import type { DashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Level = "normal" | "warn" | "bad";

export function KpiRow({ stats, compact }: { stats: DashboardData["stats"]; compact?: boolean }) {
  const rate = stats.failureRateLast10m * 100;
  // Once the incident is closed the 10-minute window still holds the outage, so don't keep shouting "critical".
  const afterIncident = stats.openIncidents === 0 && rate >= 8;
  const rateLevel: Level = afterIncident ? "warn" : rate >= 20 ? "bad" : rate >= 8 ? "warn" : "normal";
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4", compact ? "gap-2" : "gap-3")}>
      <Kpi icon={<Activity />} label="Payments" value={stats.paymentsLast10m.toLocaleString("en-IN")} hint="last 10 min · all banks" compact={compact} />
      <Kpi
        icon={<TriangleAlert />}
        label="Failure rate"
        value={`${rate.toFixed(rate < 10 ? 1 : 0)}%`}
        hint={`last 10 min · ${afterIncident ? "includes the outage" : rateLevel === "normal" ? "normal" : rateLevel === "warn" ? "elevated" : "critical"}`}
        level={rateLevel}
        compact={compact}
      />
      <Kpi
        icon={<MessageSquareText />}
        label="Complaints"
        value={stats.complaintsLast10m}
        hint="last 10 min · chat + voice"
        level={stats.complaintsLast10m >= 5 ? "warn" : "normal"}
        compact={compact}
      />
      <Kpi icon={<Siren />} label="Open incidents" value={stats.openIncidents} hint={stats.openIncidents ? "needs attention" : "none"} level={stats.openIncidents ? "bad" : "normal"} compact={compact} />
    </div>
  );
}

const LEVEL = {
  normal: { card: "border-line/80 border-l-sky", value: "text-navy", icon: "text-sky bg-sky-soft", hint: "text-ink-3" },
  warn: { card: "border-warn/40 border-l-warn bg-warn-soft/30", value: "text-[#b54708]", icon: "text-warn bg-warn-soft", hint: "text-[#b54708]" },
  bad: { card: "border-bad/40 border-l-bad bg-bad-soft/40", value: "text-[#b42318]", icon: "text-bad bg-bad-soft", hint: "text-[#b42318]" },
};

function Kpi({
  icon,
  label,
  value,
  hint,
  level = "normal",
  className,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
  level?: Level;
  className?: string;
  /** Stage view: value and hint share a line so the row stays short. */
  compact?: boolean;
}) {
  const s = LEVEL[level];
  if (compact) {
    // Move the time window into the label so the short hint ("critical", "chat + voice") isn't truncated.
    const windowed = hint.startsWith("last 10 min · ");
    return (
      <div className={cn("flex min-w-0 flex-col gap-0.5 rounded-xl border border-l-[3px] bg-card px-3 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors", s.card, className)}>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs font-medium text-ink-2">
            {label}
            {windowed && <span className="text-ink-3"> · 10 min</span>}
          </span>
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-lg [&_svg]:size-3.5", s.icon)}>{icon}</span>
        </div>
        <div className="flex min-w-0 items-baseline gap-2">
          <span className={cn("tabular text-2xl leading-8 font-extrabold tracking-tight", s.value)}>{value}</span>
          <span className={cn("truncate text-[11px]", s.hint)}>{windowed ? hint.slice("last 10 min · ".length) : hint}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-1 rounded-xl border border-l-[3px] bg-card px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors", s.card, className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-ink-2">{label}</span>
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-md [&_svg]:size-3.5", s.icon)}>{icon}</span>
      </div>
      <div className={cn("tabular text-2xl leading-8 font-bold tracking-tight", s.value)}>{value}</div>
      <div className={cn("truncate text-[11px]", s.hint)}>{hint}</div>
    </div>
  );
}
