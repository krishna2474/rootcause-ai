"use client";
import { BadgeCheck, CircleCheckBig, ChevronRight, Info, X } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { localize, useT } from "./i18n";
import type { Notice } from "./types";

/**
 * The official alert as a push-style banner: it drops in from the top over whatever screen the customer is on,
 * and the cross hides it (it stays in the bell's notification list).
 */
export function AlertBanner({ n, embed, onHelp, onClose }: { n: Notice; embed: boolean; onHelp: () => void; onClose: () => void }) {
  const { t, lang } = useT();
  const m = localize(n, lang);
  const hi = lang === "hi";
  const good = n.kind === "RESOLVED";
  return (
    <section
      role="alert"
      lang={lang}
      className={cn(
        good ? "from-[#067647] to-[#12b76a]" : "from-navy to-navy-2",
        "rc-drop absolute inset-x-3 z-40 overflow-hidden rounded-2xl bg-gradient-to-br p-4 pr-11 text-white shadow-[0_18px_40px_-12px_rgba(0,46,110,0.75)] ring-1 ring-white/10",
        // Below the faux status bar of the desktop phone frame; tight to the top on a real phone or embedded.
        embed ? "top-2" : "top-2 min-[481px]:top-[56px]",
      )}
    >
      <span aria-hidden className="absolute -right-10 -top-10 size-32 rounded-full bg-sky/20" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss alert"
        className="absolute right-2.5 top-2.5 z-10 grid size-7 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95 focus-visible:outline-2 focus-visible:outline-white"
      >
        <X className="size-4" aria-hidden />
      </button>
      <div className="relative flex gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-white", good ? "bg-white/25" : "bg-bad")}>
          {good ? <CircleCheckBig className="size-5" aria-hidden /> : <Info className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide", good ? "text-white/90" : "text-sky")}>
            <BadgeCheck className="size-3.5" aria-hidden /> {t("official")} · {timeAgo(n.createdAt)}
          </p>
          <h2 className={cn("mt-1 font-bold leading-snug", hi ? "text-[16px]" : "text-[15px]")}>{m.title}</h2>
          <p className={cn("mt-1 line-clamp-4 text-white/85", hi ? "text-[14px] leading-relaxed" : "text-[13px] leading-snug")}>{m.message}</p>
          <button
            type="button"
            onClick={good ? onClose : onHelp}
            className={cn("mt-3 inline-flex h-9 items-center gap-1 rounded-full px-4 text-[13px] font-bold text-white transition hover:brightness-105 active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white", good ? "bg-white/25" : "bg-sky")}
          >
            {good ? t("done") : t("getHelp")} {!good && <ChevronRight className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
    </section>
  );
}
