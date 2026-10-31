"use client";
import { useEffect, useRef, useState } from "react";
import { Bot, Radio, Workflow } from "lucide-react";
import type { DashboardData } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ActivityLog } from "./ActivityLog";
import { AutoReplies } from "./AutoReplies";
import { PaymentFeed } from "./PaymentFeed";
import { Card } from "./ui";

type Tab = "activity" | "replies" | "payments";

/**
 * The secondary data (what the agent did, what it told customers, the payment firehose) lives behind tabs,
 * so the screen leads with the incident instead of three stacked lists.
 */
export function RailTabs({ data, payments = true }: { data: DashboardData; payments?: boolean }) {
  const [tab, setTab] = useState<Tab>("activity");
  const [fresh, setFresh] = useState(false);
  const seen = useRef(data.stats.autoAnswered);

  // A dot on the Replies tab when the agent answers a customer while another tab is open.
  useEffect(() => {
    if (data.stats.autoAnswered > seen.current && tab !== "replies") setFresh(true);
    seen.current = data.stats.autoAnswered;
  }, [data.stats.autoAnswered, tab]);

  const failed = data.events.filter((e) => e.status === "FAILED").length;
  const all: { id: Tab; label: string; icon: React.ReactNode; count?: number; hot?: boolean }[] = [
    { id: "activity", label: "Activity", icon: <Workflow /> },
    { id: "replies", label: "Replies", icon: <Bot />, count: data.stats.autoAnswered, hot: fresh },
    { id: "payments", label: "Payments", icon: <Radio />, count: failed || undefined },
  ];
  const tabs = all.filter((t) => payments || t.id !== "payments");

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="Agent details" className={cn("grid gap-1 rounded-xl bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.05)] ring-1 ring-line/80", tabs.length === 3 ? "grid-cols-[repeat(3,minmax(0,1fr))]" : "grid-cols-[repeat(2,minmax(0,1fr))]")}>
        {tabs.map((t) => {
          const on = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setTab(t.id);
                if (t.id === "replies") setFresh(false);
              }}
              className={cn(
                "flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-lg px-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-sky [&_svg]:size-3.5",
                on ? "bg-navy text-white shadow-sm" : "text-ink-2 hover:bg-page hover:text-navy",
              )}
            >
              {t.icon}
              {t.label}
              {t.hot && !on && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-bad" aria-label="new" />}
              {t.count !== undefined && (
                <span className={cn("tabular rounded-full px-1.5 text-[10px] leading-4 font-bold", on ? "bg-white/20 text-white" : t.id === "payments" ? "bg-bad-soft text-[#b42318]" : "bg-sky-soft text-navy-2")}>
                  {t.count}
                </span>
              )}
              
            </button>
          );
        })}
      </div>

      {tab === "activity" && <ActivityLog audit={data.audit} />}
      {tab === "replies" &&
        (data.autoReplies.length ? (
          <AutoReplies items={data.autoReplies} total={data.stats.autoAnswered} />
        ) : (
          <Card className="px-4 py-10 text-center text-xs text-ink-3">When a customer writes in, the agent&apos;s instant reply shows up here.</Card>
        ))}
      {tab === "payments" && payments && <PaymentFeed events={data.events} />}
    </div>
  );
}
