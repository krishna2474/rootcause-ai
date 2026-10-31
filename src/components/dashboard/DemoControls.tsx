"use client";
import { useState } from "react";
import { FlaskConical, LoaderCircle, RotateCcw, Wrench, Zap } from "lucide-react";
import type { DashboardData } from "@/lib/queries";
import { SCENARIOS, scenarioById, type ScenarioId } from "@/lib/scenarios";
import { cn } from "@/lib/utils";
import { ScenarioPicker } from "./ScenarioPicker";
import { Button } from "./ui";

export type DemoAction = "reset" | "spike" | "fix";

export function DemoControls({
  demo,
  busy,
  error,
  disabled,
  onRun,
}: {
  demo?: DashboardData["demo"];
  busy: DemoAction | null;
  error: string | null;
  disabled?: boolean;
  onRun: (a: DemoAction, scenario?: ScenarioId) => void;
}) {
  const [pick, setPick] = useState<ScenarioId>(SCENARIOS[0].id);
  const spikeActive = demo?.spikeActive ?? false;
  const fixed = Boolean(demo?.fixedAt);
  const running = demo?.scenario ? scenarioById(demo.scenario) : null;
  const status = !demo?.seeded
    ? "Not seeded"
    : spikeActive
      ? `Issue running: ${running?.label ?? "outage"}`
      : fixed
        ? "Bank fix deployed, traffic recovering"
        : "Normal traffic";

  // One toolbar: same height everywhere, numbered steps, and a quiet grey (not a washed-out colour) when disabled.
  const off = "disabled:bg-page disabled:text-ink-3 disabled:ring-1 disabled:ring-line disabled:ring-inset disabled:shadow-none disabled:opacity-100";
  const step = (n: number) => <span className="grid size-4 place-items-center rounded-full bg-white/25 text-[10px] font-bold leading-none in-disabled:bg-line">{n}</span>;
  const btn = (action: DemoAction, label: React.ReactNode, icon: React.ReactNode, isDisabled: boolean, className: string) => (
    <Button
      variant="secondary"
      onClick={() => onRun(action, action === "spike" ? pick : undefined)}
      disabled={disabled || busy !== null || isDisabled}
      aria-busy={busy === action}
      className={cn(off, className)}
    >
      {busy === action ? <LoaderCircle className="animate-spin" /> : icon}
      {label}
    </Button>
  );

  return (
    <div
      role="group"
      aria-label="Demo controls"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line/80 bg-card px-3 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
    >
      <span className="hidden items-center gap-1.5 text-[11px] font-semibold tracking-wider whitespace-nowrap text-ink-3 uppercase xl:flex">
        <FlaskConical className="size-3.5" /> Demo controls
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {btn("reset", "Reset", <RotateCcw />, false, "bg-transparent text-ink-2 ring-0 shadow-none hover:bg-page hover:text-navy")}
        <ScenarioPicker value={spikeActive && running ? running.id : pick} onChange={setPick} disabled={disabled || spikeActive || busy !== null} />
        <span className="hidden h-5 w-px bg-line sm:block" aria-hidden />
        {btn("spike", <>{step(1)} Start<span className="hidden md:inline">issue</span></>, <Zap />, !demo?.seeded || spikeActive, "bg-sky text-white ring-0 shadow-[0_4px_12px_-4px_rgba(0,186,242,0.7)] hover:bg-[#00a6d9]")}
        {btn("fix", <>{step(2)}<span className="hidden md:inline">Bank deploys</span> fix</>, <Wrench />, !spikeActive, "bg-ok text-white ring-0 shadow-[0_4px_12px_-4px_rgba(18,183,106,0.7)] hover:bg-[#0e9f5c]")}
      </div>
      <span
        className={cn(
          "ml-auto flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
          spikeActive ? "bg-bad-soft text-[#b42318] ring-bad/30" : fixed ? "bg-ok-soft text-[#067647] ring-ok/30" : "bg-page text-ink-2 ring-line",
        )}
      >
        <span className={cn("size-1.5 shrink-0 rounded-full", spikeActive ? "animate-pulse bg-bad" : fixed ? "bg-ok" : "bg-ink-3")} />
        <span className={cn("truncate", error && "text-bad")} title={error ?? status}>
          {error ?? status}
        </span>
      </span>
    </div>
  );
}
