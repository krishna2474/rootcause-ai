import { Landmark, ReceiptText } from "lucide-react";
import { rupees } from "@/lib/format";
import type { CustomerData } from "@/lib/queries";
import { dayLabel, TxnRow } from "./TxnRow";
import type { Txn } from "./types";

export function HistoryTab({ data, onRaise }: { data: CustomerData; onRaise: (text: string) => void }) {
  const groups: { label: string; txns: Txn[] }[] = [];
  for (const t of data.events) {
    const label = dayLabel(t.createdAt);
    const g = groups.at(-1);
    if (g?.label === label) g.txns.push(t);
    else groups.push({ label, txns: [t] });
  }
  const failed = data.events.filter((e) => e.status === "FAILED").length;

  return (
    <div className="space-y-3 p-3 pb-6">
      <div className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-soft text-navy">
          <Landmark className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] text-ink-3">HDFC Bank · Savings ••4521</p>
          <p className="tabular text-[18px] font-extrabold leading-tight text-navy">{rupees(data.user.balance)}</p>
        </div>
        {failed > 0 && <span className="rounded-full bg-bad-soft px-2.5 py-1 text-[12px] font-semibold text-bad">{failed} failed</span>}
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-12 text-center">
          <ReceiptText className="size-8 text-sky" aria-hidden />
          <p className="text-[14px] font-semibold text-navy">No payments yet</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.label} aria-label={g.label} className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          <h2 className="px-4 pb-1 pt-3 text-[12px] font-semibold uppercase tracking-wide text-ink-3">{g.label}</h2>
          <ul className="divide-y divide-line">
            {g.txns.map((t) => (
              <TxnRow key={t.id} txn={t} detailed onRaise={onRaise} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
