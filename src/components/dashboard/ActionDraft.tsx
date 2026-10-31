"use client";
import { useState } from "react";
import { Check, CircleCheckBig, Hourglass, LoaderCircle, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type AgentAction, Button, Pill, hhmm } from "./ui";

export type Decide = (ids: string[], decision: "approve" | "reject", draft?: string) => Promise<void>;

const LANG = { en: { label: "English", short: "EN" }, hi: { label: "हिन्दी · Hindi", short: "HI" } } as Record<string, { label: string; short: string }>;

/**
 * One proposed action awaiting a human decision. A customer alert passes several language variants;
 * approving any one sends all of them (the API approves siblings together).
 */
export function ActionDraft({
  icon,
  heading,
  sub,
  variants,
  approveLabel,
  onDecide,
  clamp = false,
}: {
  icon: React.ReactNode;
  heading: string;
  sub: string;
  variants: AgentAction[];
  approveLabel: string;
  onDecide: Decide;
  /** Long drafts (ops tickets) start collapsed. */
  clamp?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lead = variants[0];
  const drafts = variants.filter((v) => v.status === "DRAFT");
  const status = drafts.length ? "DRAFT" : variants.some((v) => v.status === "SENT") ? "SENT" : "REJECTED";
  const sent = variants.find((v) => v.status === "SENT");
  const multi = variants.length > 1;

  const run = async (decision: "approve" | "reject") => {
    setPending(decision);
    setError(null);
    try {
      if (decision === "reject") await onDecide(drafts.map((d) => d.id), "reject");
      else if (editing) await onDecide([editing], "approve", text.trim());
      else await onDecide([drafts[0].id], "approve");
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  };

  const startEdit = (v: AgentAction) => {
    setEditing(v.id);
    setText(v.draft);
  };

  return (
    <article
      className={cn(
        "@container overflow-hidden rounded-xl border bg-card",
        status === "DRAFT" ? "border-warn/60 shadow-[0_0_0_3px_var(--warn-soft)]" : "border-line",
      )}
    >
      <header className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5", status === "DRAFT" ? "bg-warn-soft/60" : "bg-page/60")}>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-card text-navy ring-1 ring-line [&_svg]:size-4">{icon}</span>
        <div className="min-w-[180px] flex-1">
          <h4 className="text-[13px] font-semibold text-navy">{heading}</h4>
          <p className="truncate text-xs text-ink-2">{sub}</p>
        </div>
        {status === "DRAFT" ? (
          <Pill tone="warn">
            <Hourglass /> Waiting for your approval
          </Pill>
        ) : status === "SENT" ? (
          <Pill tone="ok">
            <Check /> Sent
          </Pill>
        ) : (
          <Pill tone="neutral">
            <X /> Rejected
          </Pill>
        )}
      </header>

      <div className={cn("grid gap-px bg-line", multi && "@lg:grid-cols-2")}>
        {variants.map((v) => (
          <div key={v.id} className="flex min-w-0 flex-col gap-1.5 bg-card px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{multi ? (LANG[v.language]?.label ?? v.language) : "Draft"}</span>
              {multi && v.status === "DRAFT" && editing !== v.id && (
                <button
                  type="button"
                  onClick={() => startEdit(v)}
                  disabled={pending !== null}
                  aria-label={`Edit ${multi ? (LANG[v.language]?.label ?? v.language) + " " : ""}draft`}
                  className="flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-ink-2 hover:bg-page hover:text-navy focus-visible:outline-2 focus-visible:outline-sky disabled:opacity-50"
                >
                  <Pencil className="size-3" /> Edit
                </button>
              )}
            </div>
            <p className="text-[13px] font-semibold text-ink" lang={v.language}>
              {v.title}
            </p>
            {editing === v.id ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={Math.min(12, Math.max(4, v.draft.split("\n").length + 1))}
                aria-label={`Edit ${heading}`}
                lang={v.language}
                autoFocus
                className="w-full resize-y rounded-lg border border-sky bg-sky-soft/40 px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:ring-2 focus:ring-sky/30"
              />
            ) : (
              <div className="relative">
                <p
                  lang={v.language}
                  className={cn(
                    "text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2",
                    v.status === "REJECTED" && "line-through opacity-60",
                    clamp && !expanded && "max-h-[6.5rem] overflow-hidden [mask-image:linear-gradient(to_bottom,black_60%,transparent)]",
                  )}
                >
                  {v.draft}
                </p>
                {clamp && (
                  <button
                    type="button"
                    onClick={() => setExpanded((x) => !x)}
                    aria-expanded={expanded}
                    className="mt-1 cursor-pointer rounded text-xs font-semibold text-navy-2 hover:underline focus-visible:outline-2 focus-visible:outline-sky"
                  >
                    {expanded ? "Show less" : "Show full ticket"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        {status === "DRAFT" ? (
          <>
            <Button variant="approve" size="lg" onClick={() => run("approve")} disabled={pending !== null || (editing !== null && !text.trim())} className="min-w-[180px]">
              {pending === "approve" ? <LoaderCircle className="animate-spin" /> : <Check />}
              {editing ? "Approve edited" : approveLabel}
            </Button>
            {editing ? (
              <Button variant="ghost" onClick={() => setEditing(null)} disabled={pending !== null}>
                Cancel edit
              </Button>
            ) : (
              !multi && (
                <Button variant="secondary" onClick={() => startEdit(lead)} disabled={pending !== null}>
                  <Pencil /> Edit
                </Button>
              )
            )}
            <Button variant="danger" onClick={() => run("reject")} disabled={pending !== null} className="ml-auto">
              {pending === "reject" ? <LoaderCircle className="animate-spin" /> : <X />} Reject
            </Button>
            {error && <p className="w-full text-xs text-bad">{error}</p>}
          </>
        ) : status === "SENT" && sent ? (
          <p className="flex items-center gap-1.5 text-xs text-ink-2">
            <CircleCheckBig className="size-4 text-ok" />
            Sent by <span className="font-semibold text-ink">{sent.approvedBy}</span>
            {sent.sentAt && <span className="tabular">· {hhmm(sent.sentAt, true)}</span>}
          </p>
        ) : (
          <p className="text-xs text-ink-2">Rejected by {lead.approvedBy ?? "ops"}. Nothing was sent.</p>
        )}
      </footer>
    </article>
  );
}
