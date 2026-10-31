import { Bot, Mic } from "lucide-react";
import type { DashboardData } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
import { Card, CardHeader, Pill } from "./ui";

type Reply = DashboardData["autoReplies"][number];

/** What the agent told customers on its own, next to the complaint it answered. */
export function AutoReplies({ items, total }: { items: Reply[]; total: number }) {
  if (items.length === 0) return null;
  return (
    <Card aria-label="Instant replies from the agent" className="overflow-hidden">
      <CardHeader icon={<Bot />} title="Instant replies from the agent" meta={<Pill tone="sky">{total} sent</Pill>} />
      <ul className="max-h-[340px] divide-y divide-line overflow-y-auto overscroll-contain">
        {items.map((r) => (
          <li key={r.id} className="space-y-2 px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-navy">
                {r.customer}
                {r.voice && (
                  <Pill tone="neutral">
                    <Mic /> voice note
                  </Pill>
                )}
                <Pill tone="neutral">{r.language === "hi" ? "हिन्दी" : "English"}</Pill>
              </span>
              <span className="shrink-0 text-ink-3">{timeAgo(r.createdAt)}</span>
            </div>
            {r.question && (
              <p lang={r.language} className="rounded-lg bg-page px-3 py-2 text-[13px] text-ink-2">
                “{r.question}”
              </p>
            )}
            <p lang={r.language} className="rounded-lg bg-sky-soft px-3 py-2 text-[13px] leading-relaxed text-navy">
              <span className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-navy-2">
                <Bot className="size-3" aria-hidden /> Agent replied
              </span>
              {r.reply}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
