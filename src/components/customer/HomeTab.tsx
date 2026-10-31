"use client";
import { useState } from "react";
import {
  ArrowLeftRight,
  Car,
  ChevronRight,
  Clapperboard,
  Coins,
  Contact,
  Copy,
  Eye,
  EyeOff,
  Landmark,
  Plane,
  ScanLine,
  ShieldCheck,
  Smartphone,
  TrainFront,
  Tv,
  Zap,
} from "lucide-react";
import type { CustomerData } from "@/lib/queries";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "./i18n";
import { TxnRow } from "./TxnRow";
import type { Tab } from "./types";

const card = "rounded-2xl bg-card shadow-[0_1px_2px_rgba(16,24,40,0.05)]";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky";

export function HomeTab(props: { data: CustomerData; onTab: (t: Tab) => void; onDecor: (msg: string) => void; onRaise: (text: string) => void; onPay: (start: "scan" | "pay") => void }) {
  const { data, onTab, onDecor, onPay } = props;
  const { t } = useT();
  const [showBal, setShowBal] = useState(true);
  const bank = "HDFC Bank";
  const upiId = `${data.user.phone.replace(/^\+91/, "").replace(/^(\d{2})\d{6}(\d{2})$/, "$1xxxxxx$2")}@ptyes`;
  const soon = (what: string) => () => onDecor(t("soon", { what }));

  return (
    <div className="space-y-3 p-3 pb-6">
      {/* UPI Money Transfer */}
      <section className={cn(card, "px-3 pb-3 pt-3.5")} aria-labelledby="upi-h">
        <h2 id="upi-h" className="px-1 text-[15px] font-bold text-navy">
          {t("upiTransfer")}
        </h2>
        <div className="mt-3 grid grid-cols-4 gap-1">
          {[
            { label: t("scanPay"), Icon: ScanLine, start: "scan" as const },
            { label: t("toMobile"), Icon: Contact, start: "pay" as const },
            { label: t("toBank"), Icon: Landmark, start: "pay" as const },
            { label: t("toSelf"), Icon: ArrowLeftRight, start: "pay" as const },
          ].map(({ label, Icon, start }) => (
            <button key={label} type="button" onClick={() => onPay(start)} className={cn("flex flex-col items-center gap-1.5 rounded-xl p-1 active:scale-[.97]", focus)}>
              <span className="grid size-[52px] place-items-center rounded-[18px] bg-sky text-white shadow-[0_4px_10px_-4px_rgba(0,186,242,0.8)]">
                <Icon className="size-6" strokeWidth={2.1} />
              </span>
              <span className="text-center text-[11.5px] font-medium leading-tight text-ink">{label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-line px-1 pt-3">
          <button type="button" onClick={() => onTab("history")} className={cn("inline-flex h-8 items-center gap-1 rounded-full bg-sky-soft px-3 text-[12px] font-semibold text-navy", focus)}>
            {t("balanceHistory")} <ChevronRight className="size-3.5" />
          </button>
          <button type="button" onClick={soon(t("receive"))} className={cn("inline-flex h-8 items-center gap-1 rounded-full bg-sky-soft px-3 text-[12px] font-semibold text-navy", focus)}>
            {t("receive")} <ChevronRight className="size-3.5" />
          </button>
        </div>
        <p className="mt-2.5 flex items-center gap-1 px-1 text-[11.5px] text-ink-3">
          {t("upiId")} <span className="font-medium text-ink-2">{upiId}</span>
          <Copy className="size-3 text-sky" aria-hidden />
        </p>
      </section>

      {/* Balance */}
      <section className={cn(card, "flex items-center gap-3 px-4 py-3.5")} aria-label="Bank balance">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-soft text-navy">
          <Landmark className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] text-ink-3">{t("totalBalance")} · {bank} ••4521</p>
          <p className="tabular text-[20px] font-extrabold leading-tight text-navy">{showBal ? rupees(data.user.balance) : "₹ ••••••"}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowBal((s) => !s)}
          aria-label={showBal ? "Hide balance" : "Show balance"}
          className={cn("grid size-9 place-items-center rounded-full text-sky hover:bg-sky-soft", focus)}
        >
          {showBal ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </section>

      {/* Recharges & Bill Payments */}
      <section className={cn(card, "px-3 pb-3 pt-3.5")} aria-labelledby="bills-h">
        <div className="flex items-center justify-between px-1">
          <h2 id="bills-h" className="text-[15px] font-bold text-navy">
            {t("recharges")}
          </h2>
          <button type="button" onClick={soon(t("recharges"))} className={cn("rounded text-[12px] font-semibold text-sky", focus)}>
            {t("viewAll")}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1">
          {[
            { label: t("mobileRecharge"), Icon: Smartphone },
            { label: t("electricity"), Icon: Zap },
            { label: t("dth"), Icon: Tv },
            { label: t("fastag"), Icon: Car },
          ].map(({ label, Icon }) => (
            <button key={label} type="button" onClick={soon(label)} className={cn("flex flex-col items-center gap-1.5 rounded-xl p-1 active:scale-[.97]", focus)}>
              <span className="grid size-11 place-items-center rounded-full border border-line bg-card text-sky">
                <Icon className="size-[22px]" strokeWidth={1.9} />
              </span>
              <span className="text-center text-[11.5px] font-medium leading-tight text-ink">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent */}
      <section className={cn(card, "overflow-hidden")} aria-labelledby="recent-h">
        <div className="flex items-center justify-between px-4 pt-3.5">
          <h2 id="recent-h" className="text-[15px] font-bold text-navy">
            {t("recent")}
          </h2>
          <button type="button" onClick={() => onTab("history")} className={cn("rounded text-[12px] font-semibold text-sky", focus)}>
            {t("seeAll")}
          </button>
        </div>
        {data.events.length ? (
          <ul className="divide-y divide-line">
            {data.events.slice(0, 3).map((t) => (
              <TxnRow key={t.id} txn={t} />
            ))}
          </ul>
        ) : (
          <p className="px-4 py-6 text-center text-[13px] text-ink-3">{t("noPayments")}</p>
        )}
      </section>

      {/* Do more */}
      <section className={cn(card, "px-3 pb-3 pt-3.5")} aria-labelledby="more-h">
        <h2 id="more-h" className="px-1 text-[15px] font-bold text-navy">
          {t("doMore")}
        </h2>
        <div className="mt-3 grid grid-cols-4 gap-1">
          {[
            { label: t("metro"), Icon: TrainFront },
            { label: t("flights"), Icon: Plane },
            { label: t("movies"), Icon: Clapperboard },
            { label: t("gold"), Icon: Coins },
          ].map(({ label, Icon }) => (
            <button key={label} type="button" onClick={soon(label)} className={cn("flex flex-col items-center gap-1.5 rounded-xl p-1 active:scale-[.97]", focus)}>
              <span className="grid size-11 place-items-center rounded-full border border-line bg-card text-sky">
                <Icon className="size-[22px]" strokeWidth={1.9} />
              </span>
              <span className="text-center text-[11.5px] font-medium leading-tight text-ink">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 rounded-2xl border border-sky/30 bg-sky-soft px-4 py-3">
        <ShieldCheck className="size-6 shrink-0 text-sky" aria-hidden />
        <p className="text-[12px] leading-snug text-navy">
          <span className="font-bold">{t("guardOn")}</span> {t("guardBody")}
          <span className="mt-0.5 block text-[10.5px] text-ink-3">{t("poweredBy")}</span>
        </p>
      </div>
    </div>
  );
}
