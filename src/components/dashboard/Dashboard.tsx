"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleAlert, RefreshCw, RotateCcw } from "lucide-react";
import { useLive } from "@/lib/useLive";
import type { DashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { TopBar } from "./TopBar";
import type { ScenarioId } from "@/lib/scenarios";
import { DemoControls, type DemoAction } from "./DemoControls";
import { KpiRow } from "./KpiRow";
import { IncidentCard, NoIncident, ResolvedBar } from "./IncidentCard";
import { FailureChart } from "./FailureChart";
import { EscalationQueue } from "./EscalationQueue";
import { PaymentFeed } from "./PaymentFeed";
import { RailTabs } from "./RailTabs";
import { Button, Card, Skeleton } from "./ui";

const TICK_GAP_MS = 3000;

export type AgentStatus = { on: boolean; busy: boolean; error: string | null; lastTick: number | null };

async function post(url: string, body?: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export function Dashboard({ embed = false }: { embed?: boolean }) {
  const { data, error, refresh } = useLive<DashboardData>("/api/dashboard", ["PaymentEvent", "Incident", "Action", "AuditLog", "Complaint", "DemoState"]);
  const [agent, setAgent] = useState<AgentStatus>({ on: true, busy: false, error: null, lastTick: null });
  const [demoBusy, setDemoBusy] = useState<DemoAction | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

  // The autonomous loop: one tick, wait, repeat. Ticks never overlap, even across on/off toggles.
  const chain = useRef<Promise<void>>(Promise.resolve());
  const wake = useRef<() => void>(() => {});
  const runTick = useCallback(async () => {
    setAgent((a) => ({ ...a, busy: true }));
    let err: string | null = null;
    try {
      await post("/api/agent/tick");
    } catch (e) {
      err = (e as Error).message;
    }
    setAgent((a) => ({ ...a, busy: false, error: err, lastTick: Date.now() }));
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!agent.on) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      await chain.current;
      while (!stop) {
        const p = runTick();
        chain.current = p;
        await p;
        if (stop) break;
        await new Promise<void>((resolve) => {
          wake.current = resolve;
          timer = setTimeout(resolve, TICK_GAP_MS);
        });
      }
    })();
    return () => {
      stop = true;
      clearTimeout(timer);
      wake.current();
    };
  }, [agent.on, runTick]);

  const runDemo = async (action: DemoAction, scenario?: ScenarioId) => {
    setDemoBusy(action);
    setDemoError(null);
    try {
      await post("/api/demo", { action, scenario });
      await refresh();
      wake.current(); // let the agent react straight away
    } catch (e) {
      setDemoError((e as Error).message);
    } finally {
      setDemoBusy(null);
    }
  };

  const decide = useCallback(
    async (ids: string[], decision: "approve" | "reject", draft?: string) => {
      for (const id of ids) await post(`/api/actions/${id}`, { decision, draft });
      await refresh();
    },
    [refresh],
  );

  const reply = useCallback(
    async (complaintId: string, text: string) => {
      await post(`/api/complaints/${complaintId}/reply`, { text });
      await refresh();
    },
    [refresh],
  );

  const incident = data?.incidents[0];
  // Resolved with nothing left to approve: fold the card away and give the space back to live payments.
  const settled = incident?.status === "RESOLVED" && !incident.actions.some((a) => a.status === "DRAFT");
  const [reopened, setReopened] = useState<string | null>(null);
  const showCard = incident && (!settled || reopened === incident.id);

  return (
    // Embed (stage view): the page itself never scrolls, so the demo controls and KPIs stay on screen
    // and each column scrolls on its own. The incident card leads the left column, the chart the right.
    <div className={cn("bg-[radial-gradient(ellipse_at_top_left,#eaf6fd,transparent_55%),radial-gradient(ellipse_at_bottom_right,#e8eefb,transparent_50%)] bg-page", embed ? "flex h-dvh flex-col overflow-hidden text-[13px]" : "min-h-dvh")}>
      <TopBar agent={agent} onToggle={() => setAgent((a) => ({ ...a, on: !a.on }))} embed={embed} />
      <main className={cn("mx-auto flex w-full max-w-[1600px] flex-col", embed ? "min-h-0 flex-1 gap-3 p-3" : "gap-4 p-4 lg:px-6 lg:py-5")}>
        <DemoControls demo={data?.demo} busy={demoBusy} error={demoError} onRun={runDemo} disabled={!data} />

        {!data && error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : !data ? (
          <LoadingState />
        ) : (
          <>
            {!data.demo.seeded && <SeedBanner busy={demoBusy === "reset"} onReset={() => runDemo("reset")} />}
            {error && (
              <p role="status" className="flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-2 text-xs font-medium text-[#b54708]">
                <CircleAlert className="size-4" /> Connection hiccup, showing the last good data. {error}
              </p>
            )}
            <KpiRow stats={data.stats} compact={embed} />
            {embed ? (
              <div className="grid min-h-0 flex-1 gap-3 min-[720px]:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl [&>*]:shrink-0">
                  <EscalationQueue items={data.escalations} onReply={reply} />
                  {incident && settled && (
                    <ResolvedBar incident={incident} open={reopened === incident.id} onToggle={() => setReopened((id) => (id === incident.id ? null : incident.id))} />
                  )}
                  {showCard && <IncidentCard key={incident.id} incident={incident} onDecide={decide} />}
                  {!incident && <NoIncident payments={data.stats.paymentsLast10m} spikeActive={data.demo.spikeActive} agentOn={agent.on} />}
                  {(!incident || settled) && <PaymentFeed events={data.events} />}
                </div>
                <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overscroll-contain rounded-xl [&>*]:shrink-0">
                  <FailureChart chart={data.chart} incident={incident} events={data.events} compact />
                  <RailTabs data={data} payments={Boolean(incident) && !settled} />
                </div>
              </div>
            ) : (
              <div className="grid items-start gap-4 min-[1000px]:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
                <div className="flex min-w-0 flex-col gap-4">
                  <EscalationQueue items={data.escalations} onReply={reply} />
                  {incident ? (
                    <IncidentCard key={incident.id} incident={incident} onDecide={decide} />
                  ) : (
                    <NoIncident payments={data.stats.paymentsLast10m} spikeActive={data.demo.spikeActive} agentOn={agent.on} />
                  )}
                  <FailureChart chart={data.chart} incident={incident} events={data.events} />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                  <RailTabs data={data} />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function SeedBanner({ busy, onReset }: { busy: boolean; onReset: () => void }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-sky/40 bg-sky-soft px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-navy">No demo data yet</p>
        <p className="text-xs text-ink-2">Press Reset to seed customers and a normal day of payments.</p>
      </div>
      <Button variant="primary" onClick={onReset} disabled={busy}>
        <RotateCcw className={cn(busy && "animate-spin")} /> Reset demo data
      </Button>
    </Card>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-bad-soft text-bad">
        <CircleAlert className="size-5" />
      </span>
      <div>
        <p className="font-semibold text-navy">Couldn&apos;t reach the server</p>
        <p className="mt-1 max-w-md text-sm text-ink-2">The dashboard API didn&apos;t respond. Check the dev server and database, then try again.</p>
        <p className="mt-2 font-mono text-xs text-ink-3">{message}</p>
      </div>
      <Button variant="primary" onClick={onRetry}>
        <RefreshCw /> Retry
      </Button>
    </Card>
  );
}

function LoadingState() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 min-[1000px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[420px] rounded-xl" />
          <Skeleton className="h-[280px] rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-[340px] rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
