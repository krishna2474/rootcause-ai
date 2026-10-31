"use client";
import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { iconBtn } from "./AppHeader";
import { useT, type Lang } from "./i18n";

const OPTIONS: { lang: Lang; native: string; label: string }[] = [
  { lang: "en", native: "English", label: "English" },
  { lang: "hi", native: "हिन्दी", label: "Hindi" },
];

export function LanguageSheet({ onPick, onClose }: { onPick: (l: Lang) => void; onClose: () => void }) {
  const { t, lang } = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="lang-h">
      <button type="button" aria-label="Close" onClick={onClose} className="rc-fade-up absolute inset-0 bg-ink/40" tabIndex={-1} />
      <div className="rc-sheet relative rounded-t-3xl bg-card pb-[calc(20px+env(safe-area-inset-bottom))]">
        <div className="px-4 pb-2 pt-2.5">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" aria-hidden />
          <div className="flex items-center justify-between">
            <h2 id="lang-h" className="text-[17px] font-bold text-navy">
              {t("chooseLanguage")}
            </h2>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={iconBtn}>
              <X className="size-5" />
            </button>
          </div>
        </div>
        <ul className="space-y-2 px-4 pt-1">
          {OPTIONS.map((o) => {
            const on = o.lang === lang;
            return (
              <li key={o.lang}>
                <button
                  type="button"
                  onClick={() => onPick(o.lang)}
                  aria-pressed={on}
                  className={cn("flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left", on ? "border-sky bg-sky-soft" : "border-line")}
                >
                  <span className="flex-1">
                    <span lang={o.lang} className="block text-[16px] font-bold text-navy">
                      {o.native}
                    </span>
                    <span className="block text-[12px] text-ink-3">{o.label}</span>
                  </span>
                  <span className={cn("grid size-5 place-items-center rounded-full", on ? "bg-sky text-white" : "border border-line")}>{on && <Check className="size-3.5" strokeWidth={3} />}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
