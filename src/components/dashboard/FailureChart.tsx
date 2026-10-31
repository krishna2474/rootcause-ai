"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLine } from "lucide-react";
import type { DashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Card, CardHeader, type Incident, type PaymentEvent, hhmm } from "./ui";

const MIN = 60_000;
const C = { line: "#0b3f8a", fill: "#00baf2", bars: "#8193ad", grid: "#e4e9f0", axis: "#98a2b3", detected: "#e5484d", approved: "#f79009", fixed: "#12b76a" };

type Point = DashboardData["chart"]["points"][number] & { x: number };

// Two small multiples on one time axis (failure rate, complaints) rather than a dual-axis chart.
export function FailureChart({
  chart,
  incident,
  events,
  compact = false,
}: {
  chart: DashboardData["chart"];
  incident?: Incident;
  events: PaymentEvent[];
  /** Narrow column in the stage view: shorter plots, markers only on the plot. */
  compact?: boolean;
}) {
  // Zoom to the last ~12 minutes (or from just before detection) so the demo's few minutes fill the plot.
  const all: Point[] = chart.points.map((p) => ({ ...p, x: Date.parse(p.t) + MIN / 2 }));
  const end = Date.parse(chart.points.at(-1)?.t ?? new Date().toISOString()) + MIN;
  const detected = incident ? Math.floor(Date.parse(incident.createdAt) / MIN) * MIN - 4 * MIN : Infinity;
  const start = Math.max(Date.parse(chart.points[0]?.t ?? "0"), Math.min(end - 12 * MIN, detected));
  const points = all.filter((p) => p.x > start);
  const ticks = points.filter((_, i) => i % 2 === 0).map((p) => p.x - MIN / 2);

  const markers = incident
    ? [
        { at: incident.createdAt, label: "Detected", color: C.detected },
        { at: incident.approvedAt, label: "Approved", color: C.approved },
        { at: incident.fixedAt, label: "Fix deployed", color: C.fixed },
      ].flatMap((m) => (m.at && Date.parse(m.at) >= start && Date.parse(m.at) <= end ? [{ ...m, x: Date.parse(m.at) }] : []))
    : [];

  const summary = beforeAfter(all, incident?.fixedAt ?? null, events.filter((e) => e.bank === chart.bank));
  const xAxis = (hide: boolean) => (
    <XAxis
      dataKey="x"
      type="number"
      scale="time"
      domain={[start, end]}
      ticks={ticks}
      tickFormatter={(v) => hhmm(v)}
      tick={hide ? false : { fontSize: 11, fill: C.axis }}
      tickLine={false}
      axisLine={{ stroke: C.grid }}
      height={hide ? 1 : 22}
    />
  );
  const refLines = (withLabels: boolean) =>
    markers.map((m, i) => (
      <ReferenceLine
        key={m.label}
        x={m.x}
        stroke={m.color}
        strokeDasharray="4 3"
        strokeWidth={1.5}
        label={
          withLabels
            ? ({ viewBox }: { viewBox?: { x?: number; y?: number } }) => (
                <text x={(viewBox?.x ?? 0) - 5} y={(viewBox?.y ?? 0) + 12 + i * 14} textAnchor="end" fill={m.color} stroke="#fff" strokeWidth={3} paintOrder="stroke" fontSize={11} fontWeight={600}>
                  {m.label}
                </text>
              )
            : undefined
        }
      />
    ));

  return (
    <Card>
      <CardHeader
        icon={<ChartLine />}
        title={`${chart.bank} · before and after`}
        meta={compact ? undefined : <span className="hidden sm:inline">per minute, last {points.length} min</span>}
      />
      <div className="flex flex-col gap-1 px-2 pt-3 pb-2 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-2 pb-1">
          <div className={cn("flex flex-wrap gap-y-1", compact ? "gap-x-4" : "gap-x-6")}>
            {summary.map((s) => (
              <div key={s.label}>
                <p className="text-[11px] font-medium text-ink-3">{s.label}</p>
                <p className="tabular text-lg font-bold" style={{ color: s.color }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          {markers.length > 0 && !compact && (
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-2" aria-label="Incident markers">
              {markers.map((m) => (
                <li key={m.label} className="flex items-center gap-1.5">
                  <span className="h-3 w-0 border-l-[1.5px] border-dashed" style={{ borderColor: m.color }} />
                  {m.label} <span className="tabular font-mono text-ink-3">{hhmm(m.x)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="px-2 text-[11px] font-semibold text-ink-2">Failure rate (%)</p>
        <div className={compact ? "h-[150px]" : "h-[190px]"} role="img" aria-label={`Failure rate per minute for ${chart.bank}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} syncId="fc" margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="fr-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.fill} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.fill} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.grid} vertical={false} />
              {xAxis(true)}
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<ChartTip />} cursor={{ stroke: C.axis, strokeWidth: 1 }} isAnimationActive={false} />
              {refLines(true)}
              <Area type="linear" dataKey="failureRate" stroke={C.line} strokeWidth={2} fill="url(#fr-fill)" isAnimationActive={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="px-2 pt-1 text-[11px] font-semibold text-ink-2">Customer complaints</p>
        <div className={compact ? "h-[72px]" : "h-[92px]"} role="img" aria-label="Customer complaints per minute">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} syncId="fc" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              {xAxis(false)}
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(0,46,110,0.05)" }} isAnimationActive={false} />
              {refLines(false)}
              <Bar dataKey="complaints" fill={C.bars} radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

function ChartTip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  const p = active ? payload?.[0]?.payload : undefined;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-navy tabular">
        {hhmm(p.x - MIN / 2)}–{hhmm(p.x + MIN / 2)}
      </p>
      <dl className="tabular grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-ink-2">
        <dt>Failure rate</dt>
        <dd className="text-right font-semibold text-ink">{p.failureRate}%</dd>
        <dt>Failed / total</dt>
        <dd className="text-right font-semibold text-ink">
          {p.failed} / {p.total}
        </dd>
        <dt>Complaints</dt>
        <dd className="text-right font-semibold text-ink">{p.complaints}</dd>
      </dl>
    </div>
  );
}

/** Headline numbers above the chart: before vs after the fix, or the current and peak rate. */
function beforeAfter(points: Point[], fixedAt: string | null, bankEvents: PaymentEvent[]) {
  const rate = (ps: Point[]) => {
    const total = ps.reduce((s, p) => s + p.total, 0);
    return total ? (ps.reduce((s, p) => s + p.failed, 0) / total) * 100 : 0;
  };
  const fmt = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)}%`;
  if (fixedAt) {
    const f = Date.parse(fixedAt);
    const before = rate(points.filter((p) => p.x < f && p.x > f - 6 * MIN));
    // Minute buckets straddle the fix, so "after" comes from the raw events since the fix.
    const since = bankEvents.filter((e) => Date.parse(e.createdAt) >= f);
    const after = since.length ? (since.filter((e) => e.status === "FAILED").length / since.length) * 100 : null;
    const complaintsAfter = points.filter((p) => p.x - MIN / 2 > f).reduce((s, p) => s + p.complaints, 0);
    return [
      { label: "Before fix", value: fmt(before), color: C.detected },
      { label: `After fix${since.length ? ` · ${since.length} txns` : ""}`, value: after === null ? "measuring…" : fmt(after), color: "#067647" },
      { label: "Complaints since fix", value: String(complaintsAfter), color: "#002e6e" },
    ];
  }
  const recent = points.slice(-3);
  const peak = Math.max(0, ...points.map((p) => p.failureRate));
  return [
    { label: "Last 3 min", value: fmt(rate(recent)), color: rate(recent) >= 20 ? C.detected : "#002e6e" },
    { label: "Peak minute", value: fmt(peak), color: "#002e6e" },
    { label: "Complaints · 20 min", value: String(points.reduce((s, p) => s + p.complaints, 0)), color: "#002e6e" },
  ];
}
