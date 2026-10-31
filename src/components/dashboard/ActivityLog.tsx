import { Bot, Settings2, UserRound, Workflow } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { type AuditEntry, Card, CardHeader, hhmm } from "./ui";

const ACTOR = {
  AGENT: { label: "Agent", icon: Bot, dot: "bg-sky-soft text-sky ring-sky/30", text: "text-navy-2" },
  HUMAN: { label: "Human", icon: UserRound, dot: "bg-warn-soft text-warn ring-warn/30", text: "text-[#b54708]" },
  SYSTEM: { label: "System", icon: Settings2, dot: "bg-page text-ink-3 ring-line", text: "text-ink-3" },
} as const;

export function ActivityLog({ audit }: { audit: AuditEntry[] }) {
  return (
    <Card className="@container flex flex-col">
      <CardHeader
        icon={<Workflow />}
        title="Agent activity"
        meta={
          // Legend only when there's room, so the title never truncates in the narrow stage column.
          <span className="hidden items-center gap-2.5 @[330px]:flex">
            {(["AGENT", "HUMAN", "SYSTEM"] as const).map((a) => (
              <span key={a} className="flex items-center gap-1">
                <span className={cn("size-1.5 rounded-full", a === "AGENT" ? "bg-sky" : a === "HUMAN" ? "bg-warn" : "bg-ink-3")} />
                {ACTOR[a].label}
              </span>
            ))}
          </span>
        }
      />
      {audit.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-ink-3">No activity yet.</p>
      ) : (
        <ol aria-live="polite" aria-label="Agent activity, newest first" className="max-h-[380px] overflow-y-auto overscroll-contain px-2 py-1.5">
          {audit.map((e) => {
            const a = ACTOR[e.actor as keyof typeof ACTOR] ?? ACTOR.SYSTEM;
            const Icon = a.icon;
            return (
              <li
                key={e.id}
                className="flex gap-2.5 rounded-lg px-2 py-1.5 transition-all duration-500 starting:-translate-y-1 starting:bg-sky-soft starting:opacity-0 motion-reduce:transition-none"
              >
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-1 ring-inset", a.dot)}>
                  <Icon className="size-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[13px] leading-snug", e.actor === "HUMAN" ? "font-medium text-ink" : "text-ink-2")}>{e.action}</p>
                  <p className="tabular text-[11px] text-ink-3" title={new Date(e.createdAt).toLocaleString("en-IN")}>
                    <span className={cn("font-semibold", a.text)}>{a.label}</span> · {timeAgo(e.createdAt)} · {hhmm(e.createdAt, true)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
