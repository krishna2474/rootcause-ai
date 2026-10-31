import { Bell, Headset, Home, ReceiptText, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "./i18n";
import type { Tab } from "./types";

const item =
  "flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky rounded-lg";

export function BottomNav(props: { tab: Tab; onTab: (t: Tab) => void; unread: number; onAlerts: () => void; onScan: () => void }) {
  const { tab, onTab } = props;
  const { t } = useT();
  const tabBtn = (t: Tab, label: string, Icon: typeof Home) => (
    <button
      type="button"
      onClick={() => onTab(t)}
      aria-current={tab === t ? "page" : undefined}
      className={cn(item, tab === t ? "text-navy" : "text-ink-3 hover:text-ink-2")}
    >
      <Icon className={cn("size-[22px]", tab === t && "text-sky")} strokeWidth={tab === t ? 2.25 : 1.75} />
      <span className={cn(tab === t && "font-semibold")}>{label}</span>
    </button>
  );

  return (
    <nav aria-label="Main" className="z-20 shrink-0 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-end px-1">
        {tabBtn("home", t("navHome"), Home)}
        {tabBtn("history", t("navHistory"), ReceiptText)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={props.onScan}
            aria-label="Scan any QR"
            className="-mt-6 mb-1 flex flex-col items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            <span className="grid size-[58px] place-items-center rounded-full bg-sky text-white shadow-[0_6px_16px_-4px_rgba(0,186,242,0.7)] ring-4 ring-card transition active:scale-95">
              <ScanLine className="size-7" strokeWidth={2.25} />
            </span>
            <span className="text-[11px] font-semibold text-navy">{t("navScan")}</span>
          </button>
        </div>
        {tabBtn("help", t("navHelp"), Headset)}
        <button type="button" onClick={props.onAlerts} className={cn(item, "relative text-ink-3 hover:text-ink-2")}>
          <span className="relative">
            <Bell className="size-[22px]" strokeWidth={1.75} />
            {props.unread > 0 && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-bad ring-2 ring-card" aria-hidden />}
          </span>
          <span>{t("navAlerts")}{props.unread > 0 && <span className="sr-only">, {props.unread} unread</span>}</span>
        </button>
      </div>
    </nav>
  );
}
