"use client";
import { useState } from "react";
import { LoaderCircle, Mic, Send, UserRoundSearch } from "lucide-react";
import type { DashboardData } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
import { Button, Card, CardHeader, Pill } from "./ui";

type Escalation = DashboardData["escalations"][number];
export type Reply = (complaintId: string, text: string) => Promise<void>;

/** Complaints the agent couldn't match to an incident. It never guesses, so a human answers these. */
export function EscalationQueue({ items, onReply }: { items: Escalation[]; onReply: Reply }) {
  if (items.length === 0) return null;
  return (
    <Card aria-label="Complaints that need a human" className="overflow-hidden border-warn/60 shadow-[0_0_0_3px_var(--warn-soft)]">
      <CardHeader
        icon={<UserRoundSearch />}
        title="Needs a human"
        meta={<Pill tone="warn">{items.length} waiting</Pill>}
        className="bg-warn-soft/60"
      />
      <p className="border-b border-line px-4 py-2 text-xs text-ink-2">The agent couldn&apos;t match these to a known incident, so it didn&apos;t guess. Your reply goes straight to the customer&apos;s chat.</p>
      <ul className="divide-y divide-line">
        {items.map((c) => (
          <EscalationItem key={c.id} c={c} onReply={onReply} />
        ))}
      </ul>
    </Card>
  );
}

function EscalationItem({ c, onReply }: { c: Escalation; onReply: Reply }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await onReply(c.id, text.trim());
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
    }
  };

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-ink-2">
        <span className="font-semibold text-ink">{c.customer}</span>
        {c.channel === "VOICE" && (
          <span className="flex items-center gap-0.5">
            <Mic className="size-3" /> voice note
          </span>
        )}
        <span className="ml-auto text-ink-3">{timeAgo(c.createdAt)}</span>
      </div>
      <p lang={c.language} className="rounded-lg bg-page px-3 py-2 text-[13px] leading-relaxed text-ink">
        “{c.text}”
      </p>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send();
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder={c.language === "hi" ? "Reply to the customer (Hindi or English)…" : "Reply to the customer…"}
          aria-label={`Reply to ${c.customer}`}
          className="min-w-0 flex-1 resize-y rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink outline-none focus:border-sky focus:ring-2 focus:ring-sky/30"
        />
        <Button type="submit" variant="primary" disabled={sending || !text.trim()}>
          {sending ? <LoaderCircle className="animate-spin" /> : <Send />} Send
        </Button>
      </form>
      {error && <p className="text-xs text-bad">{error}</p>}
    </li>
  );
}
