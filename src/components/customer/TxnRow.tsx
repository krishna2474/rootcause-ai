import { MessageSquareWarning, RotateCcw } from "lucide-react";
import { clock, rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Txn } from "./types";

// Customer-friendly meaning of the mock UPI codes (lib/demo.ts is server-only).
const CODE_HINT: Record<string, string> = {
  U30: "Bank server didn't respond",
  U28: "Bank not reachable",
  U68: "Refund not credited yet",
  U16: "Bank risk limit reached",
  U69: "Request expired",
  Z9: "Insufficient balance",
  ZM: "Incorrect UPI PIN",
};

const AVATAR = ["bg-sky-soft text-navy", "bg-[#eef0ff] text-[#4338ca]", "bg-ok-soft text-[#067647]", "bg-warn-soft text-[#b54708]", "bg-[#fdf0f7] text-[#c11574]"];

function avatarTone(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR[h % AVATAR.length];
}

export function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function complaintText(t: Txn) {
  return `My ${rupees(t.amount)} payment to ${t.payee} failed${t.errorCode ? ` (error ${t.errorCode})` : ""}. Was money debited from my account?`;
}

export function TxnRow({ txn, detailed, onRaise }: { txn: Txn; detailed?: boolean; onRaise?: (text: string) => void }) {
  const failed = txn.status === "FAILED";
  const pending = txn.status === "PENDING";
  const credit = txn.type === "REFUND";
  return (
    <li className="flex gap-3 px-4 py-3">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold", avatarTone(txn.payee))} aria-hidden>
        {txn.payee[0]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">{credit ? `Refund from ${txn.payee}` : txn.payee}</p>
            <p className="text-[12px] text-ink-3">
              {detailed ? clock(txn.createdAt) : `${dayLabel(txn.createdAt)}, ${clock(txn.createdAt)}`} · {txn.bank}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("tabular text-[15px] font-bold", failed ? "text-ink-3 line-through decoration-1" : credit ? "text-ok" : "text-ink")}>
              {credit ? "+ " : "- "}
              {rupees(txn.amount)}
            </p>
            {failed && <Pill className="bg-bad-soft text-bad">Failed</Pill>}
            {pending && <Pill className="bg-warn-soft text-[#b54708]">Pending</Pill>}
          </div>
        </div>

        {failed && detailed && (
          <div className="mt-2 rounded-xl bg-page px-3 py-2.5">
            <p className="text-[12px] text-ink-2">
              <span className="font-semibold text-bad">Error {txn.errorCode ?? "—"}</span>
              {txn.errorCode && CODE_HINT[txn.errorCode] ? ` · ${CODE_HINT[txn.errorCode]}` : ""}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-2">
              <RotateCcw className="size-3.5 shrink-0 text-sky" aria-hidden />
              Money will be auto-refunded if debited
            </p>
            <p className="mt-1 font-mono text-[11px] text-ink-3">UPI Ref {txn.txnId}</p>
            {onRaise && (
              <button
                type="button"
                onClick={() => onRaise(complaintText(txn))}
                className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full border border-sky bg-card px-3.5 text-[12px] font-semibold text-navy transition hover:bg-sky-soft active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
              >
                <MessageSquareWarning className="size-3.5 text-sky" aria-hidden />
                Raise complaint
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("mt-0.5 inline-block rounded-full px-2 py-px text-[10px] font-bold uppercase tracking-wide", className)}>{children}</span>;
}
