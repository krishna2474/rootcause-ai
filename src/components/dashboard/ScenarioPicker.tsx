"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Undo2, Zap } from "lucide-react";
import { SCENARIOS, scenarioById, type Scenario, type ScenarioId } from "@/lib/scenarios";
import { cn } from "@/lib/utils";

const BANK_TONE: Record<string, string> = {
  HDFC: "bg-[#e8f0fb] text-[#004c8f]",
  SBI: "bg-[#e6f4fb] text-[#1a73b8]",
  ICICI: "bg-[#fdeee9] text-[#ae282e]",
};

function BankChip({ s, size = "md" }: { s: Scenario; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg font-extrabold tracking-tight",
        size === "sm" ? "h-5 min-w-9 px-1 text-[9.5px]" : "h-6 min-w-10 px-1 text-[10px]",
        BANK_TONE[s.short] ?? "bg-sky-soft text-navy",
      )}
    >
      {s.short}
    </span>
  );
}

const title = (s: Scenario) => {
  const t = s.label.split(" · ")[1] ?? s.label;
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Picks which issue the demo fires. A custom listbox so it matches the dashboard (native selects can't be styled). */
export function ScenarioPicker({ value, onChange, disabled }: { value: ScenarioId; onChange: (id: ScenarioId) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = scenarioById(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Issue to simulate: ${current.label}`}
        className={cn(
          "flex h-8 cursor-pointer items-center gap-2 rounded-lg bg-card pr-2 pl-1.5 text-[13px] font-semibold text-navy ring-1 ring-line ring-inset shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition hover:ring-sky/50 focus-visible:outline-2 focus-visible:outline-sky disabled:cursor-not-allowed disabled:opacity-60",
          open && "ring-sky",
        )}
      >
        <BankChip s={current} size="sm" />
        <span className="max-w-[7.5rem] truncate sm:max-w-none">{title(current)}</span>
        <ChevronDown className={cn("size-3.5 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Issue to simulate"
          className="rc-pop absolute top-[calc(100%+6px)] left-0 z-50 w-[min(236px,calc(100vw-24px))] overflow-hidden rounded-xl border border-line/80 bg-card p-1 shadow-[0_18px_40px_-14px_rgba(0,46,110,0.35)]"
        >
          <li className="px-2 pt-1.5 pb-1 text-[10px] font-semibold tracking-wider text-ink-3 uppercase">Simulate an issue</li>
          {SCENARIOS.map((s) => {
            const on = s.id === value;
            const TypeIcon = s.type === "REFUND" ? Undo2 : Zap;
            return (
              <li key={s.id} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(s.id);
                    setOpen(false);
                  }}
                  className={cn("flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors", on ? "bg-sky-soft" : "hover:bg-page")}
                >
                  <BankChip s={s} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] leading-4 font-semibold text-navy">{title(s)}</span>
                    <span className="flex items-center gap-1 text-[10.5px] leading-4 text-ink-3">
                      <TypeIcon className="size-2.5" aria-hidden />
                      {s.type === "REFUND" ? "Refunds" : "UPI payments"} · <span className="font-mono">{s.code}</span>
                    </span>
                  </span>
                  {on && <Check className="size-3.5 shrink-0 text-sky" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <style>{`@keyframes rc-pop { from { opacity: 0; transform: translateY(-4px) scale(.98); } to { opacity: 1; transform: none; } } .rc-pop { animation: rc-pop .14s ease-out both; transform-origin: top left; }`}</style>
    </div>
  );
}
