"use client";
import { useEffect, useState } from "react";
import { BadgeCheck, Bot, ChevronDown, CircleCheckBig, Eye, Hourglass, MessageSquareText, Radar, Search, ShieldCheck, Ticket, Timer, Users, Wallet, XCircle } from "lucide-react";
import { rupees, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActionDraft, type Decide } from "./ActionDraft";
import { Postmortem } from "./Postmortem";
import { Card, type Incident, Pill, hhmm } from "./ui";

export function IncidentCard({ incident: inc, onDecide }: { incident: Incident; onDecide: Decide }) {
  const ops = inc.actions.filter((a) => a.kind === "OPS_TICKET");
  const alerts = inc.actions.filter((a) => a.kind === "CUSTOMER_MSG");
  const allClear = inc.actions.filter((a) => a.kind === "CUSTOMER_RESOLVED");
  const waiting = inc.actions.filter((a) => a.kind !== "CUSTOMER_RESOLVED" && a.status === "DRAFT").length;
  const resolved = inc.status === "RESOLVED";

  const actions = (
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Bot className="size-4 text-sky" /> Agent&apos;s proposed actions
          </h3>
          {waiting > 0 ? (
            <span className="text-xs font-medium text-[#b54708]">Nothing goes out until you approve</span>
          ) : (
            inc.actions.length > 0 && <span className="text-xs text-ink-3">All actions decided</span>
          )}
        </div>
        {inc.actions.length === 0 && <p className="rounded-lg bg-page px-3 py-2 text-xs text-ink-2">The agent is drafting actions…</p>}
        {alerts.length > 0 && (
          <ActionDraft
            icon={<MessageSquareText />}
            heading="Customer alert"
            sub={`Push + in-app to ${inc.impactedUsers} affected customers, each in their language`}
            variants={alerts}
            approveLabel={`Approve & send to ${inc.impactedUsers} customers`}
            onDecide={onDecide}
          />
        )}
        {ops.length > 0 && (
          <ActionDraft
            icon={<Ticket />}
            heading="Ops ticket"
            sub={`To ${inc.bank} UPI operations`}
            variants={ops}
            approveLabel="Approve & raise ticket"
            clamp
            onDecide={onDecide}
          />
        )}
      </section>
  );

  // While approval is pending, the decision comes first so the Approve button is on screen; evidence follows.
  const investigation =
    waiting > 0 ? (
      <>
        {actions}
        <Evidence inc={inc} />
      </>
    ) : (
      <>
        <Evidence inc={inc} />
        {actions}
      </>
    );

  return (
    <Card aria-label="Current incident" className={cn("@container overflow-hidden", !resolved && waiting > 0 && "border-warn/50")}>
      {resolved && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-ok px-5 py-2.5 text-white">
          <ShieldCheck className="size-5" />
          <p className="text-sm font-semibold">Resolved · fix verified by the agent</p>
          {inc.resolvedAt && <span className="text-xs text-white/85">Failures back to normal at {hhmm(inc.resolvedAt, true)}</span>}
        </div>
      )}

      <div className="flex flex-col gap-5 p-5">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill inc={inc} waiting={waiting} />
            <Pill tone="neutral">
              {inc.bank} · <span className="font-mono">{inc.errorCode}</span>
            </Pill>
            <span className="ml-auto text-xs text-ink-3" title={new Date(inc.createdAt).toLocaleString("en-IN")}>
              Detected {timeAgo(inc.createdAt)}
            </span>
          </div>
          <h2 className="text-xl leading-tight font-bold tracking-tight text-navy">{inc.title}</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            <span className="font-semibold text-ink">Root cause: </span>
            {inc.rootCause}
          </p>
        </header>

        <Progress inc={inc} />
        <IncidentClock inc={inc} />

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line @xl:grid-cols-5">
          <Confidence value={inc.confidence} />
          <Stat icon={<Users />} label="Customers hit" value={inc.impactedUsers.toLocaleString("en-IN")} />
          <Stat icon={<Wallet />} label="Money stuck" value={rupees(inc.moneyStuck)} />
          <Stat icon={<MessageSquareText />} label="Complaints" value={inc.complaints} />
          <Stat icon={<XCircle />} label="Failed txns" value={inc.evidence.failedTxns} />
        </div>

        {allClear.length > 0 && (
          <ActionDraft
            icon={<ShieldCheck />}
            heading="All-clear notice"
            sub={`Tells ${inc.impactedUsers} affected customers that ${inc.bank} payments work again`}
            variants={allClear}
            approveLabel={`Approve & send to ${inc.impactedUsers} customers`}
            onDecide={onDecide}
          />
        )}

        {resolved && inc.postmortem && <Postmortem pm={inc.postmortem} />}
        {resolved && !inc.postmortem && <p className="rounded-lg bg-page px-3 py-2 text-xs text-ink-2">The agent is writing the post-mortem…</p>}

        {resolved ? (
          <details className="group rounded-xl border border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-navy focus-visible:outline-2 focus-visible:outline-sky [&::-webkit-details-marker]:hidden">
              <span>
                Investigation and actions taken
                {waiting > 0 && <span className="ml-2 text-xs font-medium text-[#b54708]">{waiting} draft{waiting > 1 ? "s" : ""} not sent</span>}
              </span>
              <ChevronDown className="size-4 text-ink-3 transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-5 border-t border-line p-4">{investigation}</div>
          </details>
        ) : (
          investigation
        )}
      </div>
    </Card>
  );
}

function StatusPill({ inc, waiting }: { inc: Incident; waiting: number }) {
  if (inc.status === "RESOLVED")
    return (
      <Pill tone="ok">
        <CircleCheckBig /> Resolved
      </Pill>
    );
  if (inc.status === "APPROVED")
    return (
      <Pill tone="sky">
        <Radar /> {inc.fixedAt ? "Verifying fix" : "Approved · waiting for bank fix"}
      </Pill>
    );
  return (
    <Pill tone={waiting ? "warn" : "bad"}>
      <Hourglass /> {waiting ? "Open · needs approval" : "Open"}
    </Pill>
  );
}

const STEPS = [
  { key: "createdAt", label: "Detected" },
  { key: "approvedAt", label: "Approved" },
  { key: "fixedAt", label: "Fix deployed" },
  { key: "resolvedAt", label: "Resolved" },
] as const;

function Progress({ inc }: { inc: Incident }) {
  const next = STEPS.findIndex((s) => !inc[s.key]);
  return (
    <ol aria-label="Incident progress" className="grid grid-cols-4 gap-2">
      {STEPS.map((s, i) => {
        const at = inc[s.key];
        const current = i === next;
        return (
          <li key={s.key} className="flex flex-col gap-1.5">
            <span className={cn("h-1 rounded-full", at ? (s.key === "resolvedAt" ? "bg-ok" : "bg-sky") : current ? "bg-warn/60" : "bg-line")} />
            <span className="flex flex-wrap items-baseline gap-x-1.5 text-xs">
              <span className={cn("font-semibold", at ? "text-navy" : current ? "text-[#b54708]" : "text-ink-3")}>{s.label}</span>
              <span className="tabular font-mono text-[11px] text-ink-3">{at ? hhmm(at) : current ? "next" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function duration(from: string, to: string | number) {
  const s = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

/** How fast each stage happened. The running stage ticks every second until the incident is resolved. */
function IncidentClock({ inc }: { inc: Incident }) {
  const [now, setNow] = useState(() => Date.now());
  const live = inc.status !== "RESOLVED";
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [live]);

  const start = inc.outageStartedAt ?? inc.createdAt;
  const items = [
    inc.outageStartedAt && { label: "Outage → detected", value: duration(inc.outageStartedAt, inc.createdAt), running: false },
    { label: inc.approvedAt ? "Detected → customers alerted" : "Waiting for approval", value: duration(inc.createdAt, inc.approvedAt ?? now), running: !inc.approvedAt },
    { label: inc.resolvedAt ? "Total time to resolve" : "Outage running for", value: duration(start, inc.resolvedAt ?? now), running: !inc.resolvedAt },
  ].filter((x) => !!x);

  return (
    <div aria-label="Incident clock" className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-page px-3 py-2 ring-1 ring-line ring-inset">
      <Timer className="size-4 shrink-0 text-sky" />
      {items.map((x) => (
        <span key={x.label} className="flex items-baseline gap-1.5 text-xs text-ink-2">
          {x.label}
          <span className={cn("tabular font-mono text-sm font-bold", x.running ? "text-[#b54708]" : "text-navy")}>{x.value}</span>
        </span>
      ))}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 bg-card px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-ink-2 [&_svg]:size-3.5 [&_svg]:text-ink-3">
        {icon}
        {label}
      </span>
      <span className="tabular text-lg font-bold text-navy">{value}</span>
    </div>
  );
}

function Confidence({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 80 ? "bg-ok" : pct >= 60 ? "bg-warn" : "bg-bad";
  return (
    <div className="col-span-2 flex flex-col gap-0.5 bg-card px-3 py-2.5 @xl:col-span-1">
      {/* Same label/value rhythm as the other stats, with the meter under the value. */}
      <span className="text-[11px] font-medium text-ink-2">Confidence</span>
      <span className="tabular text-lg font-bold text-navy">{pct}%</span>
      <span
        role="meter"
        aria-label="Agent confidence"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-1.5 overflow-hidden rounded-full bg-line"
      >
        <span className={cn("block h-full rounded-full transition-[width] duration-700", tone)} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function Evidence({ inc }: { inc: Incident }) {
  const ev = inc.evidence;
  return (
    <section className="flex flex-col gap-2.5">
      <h3 className="text-sm font-semibold text-navy">Evidence</h3>
      <ul className="flex flex-col gap-1.5">
        {ev.points.map((p, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-ink-2">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-sky" />
            {p}
          </li>
        ))}
      </ul>
      {ev.sampleTxnIds?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-medium text-ink-3">Sample txns</span>
          {ev.sampleTxnIds.map((id) => (
            <code key={id} className="rounded-md bg-page px-1.5 py-0.5 font-mono text-[11px] text-ink-2 ring-1 ring-line ring-inset">
              {id}
            </code>
          ))}
        </div>
      )}
    </section>
  );
}

const AGENT_LOOP = [
  { label: "Watch", Icon: Eye },
  { label: "Detect", Icon: Radar },
  { label: "Diagnose", Icon: Search },
  { label: "Approve", Icon: BadgeCheck },
  { label: "Verify", Icon: CircleCheckBig },
];

export function NoIncident({ payments, spikeActive, agentOn }: { payments: number; spikeActive: boolean; agentOn: boolean }) {
  // Where the agent is in its loop: watching when quiet, detecting once failures rise.
  const active = !agentOn ? -1 : spikeActive ? 1 : 0;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-5">
        <span className={cn("relative grid size-12 shrink-0 place-items-center rounded-2xl", spikeActive ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok")}>
          {agentOn && <span className={cn("absolute inset-0 animate-ping rounded-2xl motion-reduce:hidden", spikeActive ? "bg-warn/20" : "bg-ok/20")} />}
          <ShieldCheck className="relative size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold tracking-[-0.01em] text-navy">{spikeActive ? "Failures are rising" : "All clear"}</h2>
          <p className="mt-0.5 text-sm text-ink-2">
            {!agentOn ? (
              "The agent is paused. Switch it on to start watching payments."
            ) : spikeActive ? (
              "The agent is investigating and will open an incident shortly."
            ) : (
              <>
                Watching <span className="tabular font-semibold text-ink">{payments.toLocaleString("en-IN")}</span> payments from the last 10 minutes.
              </>
            )}
          </p>
        </div>
        {!spikeActive && <p className="hidden shrink-0 rounded-full bg-page px-3 py-1 text-xs text-ink-3 ring-1 ring-line min-[900px]:block">Demo: pick an issue above and press Start</p>}
      </div>
      <ol className="grid grid-cols-5 border-t border-line/80 bg-page/60 px-2 py-3" aria-label="What the agent does">
        {AGENT_LOOP.map(({ label, Icon }, i) => {
          const done = i < active;
          const now = i === active;
          return (
            <li key={label} className="flex flex-col items-center gap-1.5 text-[11px] font-medium">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full ring-1 ring-inset transition-colors [&_svg]:size-4",
                  now ? "bg-sky text-white ring-sky shadow-[0_0_0_4px_var(--sky-soft)]" : done ? "bg-ok-soft text-ok ring-ok/30" : "bg-card text-ink-3 ring-line",
                )}
              >
                <Icon />
              </span>
              <span className={cn(now ? "font-bold text-navy" : done ? "text-ink-2" : "text-ink-3")}>{label}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/** A resolved, fully decided incident folds into this bar so live payments get the space back. Click to reopen. */
export function ResolvedBar({ incident: inc, open, onToggle }: { incident: Incident; open: boolean; onToggle: () => void }) {
  const from = inc.outageStartedAt ?? inc.createdAt;
  const minutes = inc.resolvedAt ? Math.max(1, Math.round((new Date(inc.resolvedAt).getTime() - new Date(from).getTime()) / 60_000)) : null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-ok/30 bg-gradient-to-r from-ok-soft to-card px-4 py-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-ok/60 focus-visible:outline-2 focus-visible:outline-sky"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ok text-white">
        <CircleCheckBig className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-navy">Resolved · {inc.title}</span>
        <span className="block truncate text-xs text-ink-2">
          {inc.bank} · <span className="font-mono">{inc.errorCode}</span>
          {minutes && <> · fixed in {minutes} min</>}
          {inc.postmortem && <> · post-mortem ready</>}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[#067647]">
        {open ? "Hide" : "View incident"}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </span>
    </button>
  );
}
