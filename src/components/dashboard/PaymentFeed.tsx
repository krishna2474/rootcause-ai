import { Radio } from "lucide-react";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardHeader, type PaymentEvent, Pill, hhmm } from "./ui";

const BANK_SHORT: Record<string, string> = {
  "HDFC Bank": "HDFC",
  "State Bank of India": "SBI",
  "ICICI Bank": "ICICI",
  "Axis Bank": "Axis",
  "Kotak Mahindra Bank": "Kotak",
  "Punjab National Bank": "PNB",
  "Bank of Baroda": "BoB",
};

export function PaymentFeed({ events }: { events: PaymentEvent[] }) {
  const failed = events.filter((e) => e.status === "FAILED").length;
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<Radio />}
        title="Live payments"
        meta={
          <span className="tabular">
            {failed > 0 && <span className="font-semibold text-[#b42318]">{failed} failed</span>}
            {failed > 0 && " of "}latest {events.length}
          </span>
        }
      />
      {events.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-ink-3">Waiting for payments…</p>
      ) : (
        <ul aria-label="Latest payments" className="max-h-[420px] divide-y divide-line overflow-y-auto overscroll-contain">
          {events.map((e) => {
            const bad = e.status === "FAILED";
            return (
              <li
                key={e.id}
                className={cn(
                  "grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-1.5 text-xs transition-all duration-500 starting:opacity-0 motion-reduce:transition-none",
                  bad && "bg-bad-soft/60",
                )}
              >
                <span className="tabular font-mono text-[11px] text-ink-3">{hhmm(e.createdAt, true)}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{e.customer}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {BANK_SHORT[e.bank] ?? e.bank} · {e.type}
                    {e.payee ? ` · ${e.payee}` : ""}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  <span className="tabular font-semibold text-ink">{rupees(e.amount)}</span>
                  {bad ? (
                    <Pill tone="bad" className="px-1.5 py-0 text-[10px]">
                      Failed{e.errorCode && <span className="font-mono">· {e.errorCode}</span>}
                    </Pill>
                  ) : e.status === "SUCCESS" ? (
                    <Pill tone="ok" className="px-1.5 py-0 text-[10px]">
                      Success
                    </Pill>
                  ) : (
                    <Pill tone="neutral" className="px-1.5 py-0 text-[10px]">
                      {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                    </Pill>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
