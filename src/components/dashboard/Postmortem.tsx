import { FileText, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Incident, hhmm } from "./ui";

const ACTOR = { AGENT: "bg-sky", HUMAN: "bg-warn", SYSTEM: "bg-ink-3" } as Record<string, string>;

export function Postmortem({ pm }: { pm: NonNullable<Incident["postmortem"]> }) {
  return (
    <section aria-label="Post-mortem" className="flex flex-col gap-4 rounded-xl border border-line bg-page/50 p-4">
      <header className="flex items-center gap-2">
        <FileText className="size-4 text-sky" />
        <h3 className="text-sm font-semibold text-navy">Post-mortem</h3>
        <span className="text-xs text-ink-3">written by the agent</span>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cause">{pm.cause}</Field>
        <Field label="Impact">{pm.impact}</Field>
      </div>

      <div className="flex gap-3 rounded-lg border border-sky/40 bg-sky-soft px-4 py-3">
        <Lightbulb className="mt-0.5 size-5 shrink-0 text-sky" />
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-navy-2 uppercase">Suggested prevention rule</p>
          <p className="mt-0.5 text-sm font-medium text-navy">{pm.preventionRule}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold tracking-wide text-ink-3 uppercase">Timeline</p>
        <ol className="relative flex flex-col gap-2.5 before:absolute before:top-1.5 before:bottom-1.5 before:left-[68px] before:w-px before:bg-line">
          {pm.timeline.map((t, i) => (
            <li key={i} className="relative grid grid-cols-[56px_16px_1fr] items-start gap-x-1 text-[13px]">
              <span className="tabular pt-px font-mono text-[11px] text-ink-3">{hhmm(t.at, true)}</span>
              <span className={cn("relative z-10 mt-1.5 size-2 justify-self-center rounded-full ring-2 ring-[#f9fafc]", ACTOR[t.actor] ?? "bg-ink-3")} />
              <span className="text-ink-2">{t.event}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-ink-3 uppercase">{label}</p>
      <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}
