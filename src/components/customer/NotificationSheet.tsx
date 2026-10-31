"use client";
import { useEffect, useRef } from "react";
import { BellOff, Info, X } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { iconBtn } from "./AppHeader";
import { localize, useT } from "./i18n";
import type { Notice } from "./types";

export function NotificationSheet({ notifications, onClose, onHelp }: { notifications: Notice[]; onClose: () => void; onHelp: () => void }) {
  const { t, lang } = useT();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="notif-h">
      <button type="button" aria-label="Close notifications" onClick={onClose} className="rc-fade-up absolute inset-0 bg-ink/40" tabIndex={-1} />
      <div className="rc-sheet relative max-h-[80%] overflow-y-auto rounded-t-3xl bg-card pb-[calc(16px+env(safe-area-inset-bottom))]">
        <div className="sticky top-0 bg-card px-4 pb-2 pt-2.5">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" aria-hidden />
          <div className="flex items-center justify-between">
            <h2 id="notif-h" className="text-[17px] font-bold text-navy">
              {t("notifications")}
            </h2>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={iconBtn}>
              <X className="size-5" />
            </button>
          </div>
        </div>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <BellOff className="size-7 text-ink-3" aria-hidden />
            <p className="text-[14px] font-semibold text-navy">{t("caughtUp")}</p>
            <p className="text-[12px] text-ink-3">{t("caughtUpBody")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-line px-1">
            {notifications.map((n) => {
              const m = localize(n, lang);
              return (
              <li key={n.id} lang={lang} className="flex gap-3 px-3 py-3">
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", n.readAt ? "bg-page text-ink-3" : "bg-sky-soft text-sky")}>
                  <Info className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-semibold leading-snug text-navy">{m.title}</p>
                    <span className="shrink-0 text-[11px] text-ink-3">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{m.message}</p>
                  <button type="button" onClick={onHelp} className="mt-1.5 rounded text-[12px] font-semibold text-sky focus-visible:outline-2 focus-visible:outline-sky">
                    {t("askAbout")}
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
