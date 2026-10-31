"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useLive } from "@/lib/useLive";
import type { CustomerData } from "@/lib/queries";
import { BottomNav } from "./BottomNav";
import { AppHeader } from "./AppHeader";
import { HelpChat } from "./HelpChat";
import { HistoryTab } from "./HistoryTab";
import { HomeTab } from "./HomeTab";
import { NotificationSheet } from "./NotificationSheet";
import { PhoneFrame } from "./PhoneFrame";
import { AppSkeleton } from "./AppSkeleton";
import { PayFlow, type PayStart } from "./PayFlow";
import { LangContext, tr, type Lang } from "./i18n";
import { AlertBanner } from "./AlertBanner";
import { LanguageSheet } from "./LanguageSheet";
import type { Tab } from "./types";

export function CustomerApp({ embed }: { embed: boolean }) {
  const { data, error, refresh } = useLive<CustomerData>("/api/customer", ["Notification", "ChatMessage"]);
  const [tab, setTab] = useState<Tab>("home");
  const [draft, setDraft] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pay, setPay] = useState<PayStart | null>(null);
  const [langPick, setLangPick] = useState<Lang | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const go = useCallback((t: Tab) => {
    setTab(t);
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);

  // The app starts in the customer's saved language; picking one here wins and is saved for later alerts.
  const lang: Lang = langPick ?? (data?.user.language === "hi" ? "hi" : "en");
  const chooseLang = useCallback((l: Lang) => {
    setLangPick(l);
    setLangOpen(false);
    fetch("/api/customer/language", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ language: l }) }).catch(() => {});
  }, []);

  const unread = data?.notifications.filter((n) => !n.readAt) ?? [];
  // The banner follows the newest live alert; the cross hides that one alert (a new one shows again).
  const banner = data?.notifications.find((n) => !n.readAt && n.active);

  const openSheet = async () => {
    setSheetOpen(true);
    if (unread.length) {
      await fetch("/api/notifications/read", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).catch(() => {});
      refresh();
    }
  };

  const raiseComplaint = (text: string) => {
    setDraft(text);
    go("help");
  };

  if (pay && data) {
    return (
      <LangContext.Provider value={{ lang, setLang: chooseLang }}>
      <PhoneFrame embed={embed}>
        <PayFlow
          data={data}
          start={pay}
          onExit={() => setPay(null)}
          onHelp={() => {
            setPay(null);
            go("help");
          }}
        />
      </PhoneFrame>
      </LangContext.Provider>
    );
  }

  return (
    <LangContext.Provider value={{ lang, setLang: chooseLang }}>
    <PhoneFrame embed={embed}>
      <AppHeader
        name={data?.user.name}
        unread={unread.length}
        title={tab === "home" ? null : tab === "history" ? tr(lang, "titleHistory") : tr(lang, "titleHelp")}
        hideHelp={tab === "help"}
        onLang={() => setLangOpen(true)}
        onBack={() => go("home")}
        onBell={openSheet}
        onHelp={() => go("help")}
      />

      {tab === "help" && data ? (
        <HelpChat data={data} refresh={refresh} draft={draft} setDraft={setDraft} toast={showToast} />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {error && !data ? (
            <LoadError />
          ) : !data ? (
            <AppSkeleton />
          ) : tab === "home" ? (
            <HomeTab data={data} onTab={go} onDecor={showToast} onRaise={raiseComplaint} onPay={setPay} />
          ) : (
            <HistoryTab data={data} onRaise={raiseComplaint} />
          )}
        </div>
      )}

      {/* Chat is full-screen like a real support flow; back arrow returns home */}
      {tab !== "help" && <BottomNav tab={tab} onTab={go} unread={unread.length} onAlerts={openSheet} onScan={() => setPay("scan")} />}

      {sheetOpen && data && <NotificationSheet notifications={data.notifications} onClose={() => setSheetOpen(false)} onHelp={() => { setSheetOpen(false); go("help"); }} />}

      {banner && banner.id !== dismissed && (
        <AlertBanner key={banner.id} n={banner} embed={embed} onHelp={() => { setDismissed(banner.id); go("help"); }} onClose={() => setDismissed(banner.id)} />
      )}

      {langOpen && <LanguageSheet onPick={chooseLang} onClose={() => setLangOpen(false)} />}

      {toast && (
        <div role="status" className="rc-fade-up pointer-events-none absolute inset-x-4 bottom-[calc(92px+env(safe-area-inset-bottom))] z-40 flex justify-center">
          <div className="rounded-xl bg-ink/90 px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-lg">{toast}</div>
        </div>
      )}

      {/* Small local keyframes for entrances and the typing dots (globals.css stays untouched) */}
      <style>{`
        @keyframes rc-slide-in { from { opacity: 0; transform: translateY(-12px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes rc-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes rc-sheet { from { transform: translateY(100%); } to { transform: none; } }
        @keyframes rc-dot { 0%, 80%, 100% { opacity: .25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
        @keyframes rc-drop { from { opacity: 0; transform: translateY(-140%); } 60% { opacity: 1; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .rc-drop { animation: rc-drop .55s cubic-bezier(.2,.8,.2,1) both; }
        .rc-slide-in { animation: rc-slide-in .45s cubic-bezier(.2,.8,.2,1) both; }
        .rc-fade-up { animation: rc-fade-up .25s ease-out both; }
        .rc-sheet { animation: rc-sheet .3s cubic-bezier(.2,.8,.2,1) both; }
        .rc-dot { animation: rc-dot 1.2s infinite ease-in-out; }
        @media (prefers-reduced-motion: reduce) { .rc-slide-in, .rc-fade-up, .rc-sheet, .rc-dot, .rc-drop { animation: none; } }
      `}</style>
    </PhoneFrame>
    </LangContext.Provider>
  );
}

function LoadError() {
  return (
    <div className="m-4 flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-10 text-center shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <span className="grid size-11 place-items-center rounded-full bg-bad-soft text-bad">
        <AlertCircle className="size-5" aria-hidden />
      </span>
      <p className="text-[15px] font-semibold text-navy">Couldn&apos;t load</p>
      <p className="text-[13px] text-ink-2">Reset the demo from the dashboard and this screen will update by itself.</p>
    </div>
  );
}
