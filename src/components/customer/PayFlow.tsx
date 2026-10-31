"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Ban, Check, ChevronRight, Delete, Info, Landmark, Loader2, ShieldCheck, X, Zap } from "lucide-react";
import type { CustomerData } from "@/lib/queries";
import { rupees, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { iconBtn } from "./AppHeader";
import { localize, useT } from "./i18n";
import type { Notice } from "./types";

export type PayStart = "scan" | "pay";
type Step = "scan" | "pay" | "pin" | "processing" | "result";

const PAYEE = { name: "Sharma Kirana Store", upi: "sharma.kirana@okhdfc" };
const PIN_LEN = 6;
const ACCOUNTS = [
  { bank: "HDFC Bank", last4: "4521" },
  { bank: "State Bank of India", last4: "8830" },
  { bank: "ICICI Bank", last4: "1096" },
  { bank: "Axis Bank", last4: "7742" },
  { bank: "Kotak Mahindra Bank", last4: "3315" },
];

/**
 * Mock UPI payment: scanner → gateway (pay) → UPI PIN → result.
 * The latest approved alert is pinned on every step, so a customer is warned wherever they are.
 */
export function PayFlow({ data, start, onExit, onHelp }: { data: CustomerData; start: PayStart; onExit: () => void; onHelp: () => void }) {
  const { t } = useT();
  const [step, setStep] = useState<Step>(start);
  const [amount, setAmount] = useState("1250");
  const [pin, setPin] = useState("");
  const [account, setAccount] = useState(ACCOUNTS[0]);
  const [picking, setPicking] = useState(false);
  const latest = data.notifications.find((n) => n.active && n.kind === "ALERT" && n.affectsPayments);
  // The warning only applies to the bank with the incident; another bank is unaffected.
  const alert = latest && (!latest.bank || latest.bank === account.bank) ? latest : undefined;
  // Prevention: once customers have been told a bank's debits are failing, don't let them start a payment that will
  // fail. Switching to an unaffected account lets it through.
  const blocked = Boolean(alert);
  const outageBank = latest?.bank ?? null;
  const [outcome, setOutcome] = useState<"SUCCESS" | "FAILED" | null>(null);
  const failed = outcome === "FAILED";
  const paise = Math.round((Number(amount) || 0) * 100);

  // Auto-detect the QR a moment after the scanner opens, like a real camera.
  useEffect(() => {
    if (step !== "scan") return;
    const id = setTimeout(() => setStep("pay"), 2200);
    return () => clearTimeout(id);
  }, [step]);

  useEffect(() => {
    if (step !== "processing") return;
    let live = true;
    // Submit the payment; keep the spinner up for at least a moment so it feels like a real attempt.
    const submit = fetch("/api/customer/pay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bank: account.bank, payee: PAYEE.name, amount: paise }),
    })
      .then((r) => r.json())
      .then((r) => (r.status === "FAILED" ? "FAILED" : "SUCCESS") as "SUCCESS" | "FAILED")
      .catch(() => "FAILED" as const);
    Promise.all([submit, new Promise((r) => setTimeout(r, 1800))]).then(([o]) => {
      if (!live) return;
      setOutcome(o);
      setStep("result");
    });
    return () => {
      live = false;
    };
  }, [step, account.bank, paise]);

  const back = () => (step === "pay" ? (start === "scan" ? setStep("scan") : onExit()) : step === "pin" ? setStep("pay") : onExit());
  const title = step === "pay" ? t("pay") : step === "pin" ? t("enterPin") : t("payStatus");

  const press = (k: string) => {
    if (k === "del") return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, PIN_LEN);
    setPin(next);
    if (next.length === PIN_LEN) setTimeout(() => setStep("processing"), 250);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-page">
      {step !== "scan" && step !== "processing" && (
        <header className="shrink-0 bg-card shadow-[0_1px_0_var(--line)]">
          <div className="flex h-14 items-center gap-2 px-3">
            <button type="button" onClick={back} aria-label="Back" className={iconBtn}>
              {step === "result" ? <X className="size-5" /> : <ArrowLeft className="size-5" />}
            </button>
            <h1 className="flex-1 truncate text-[17px] font-bold text-navy">{title}</h1>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-3">
              <ShieldCheck className="size-4 text-ok" aria-hidden /> UPI
            </span>
          </div>
        </header>
      )}

      {alert && step !== "scan" && <AlertStrip n={alert} onHelp={onHelp} />}

      {step === "scan" && <Scanner onBack={onExit} onSkip={() => setStep("pay")} />}

      {step === "pay" && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
          <section className="rounded-2xl bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <p className="text-[12px] text-ink-3">{t("paying")}</p>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-sky-soft text-[15px] font-bold text-navy">SK</span>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold text-navy">{PAYEE.name}</p>
                <p className="truncate text-[12px] text-ink-3">{PAYEE.upi}</p>
              </div>
            </div>
            <label className="mt-4 block text-[12px] text-ink-3" htmlFor="amt">
              {t("enterAmount")}
            </label>
            <div className="flex items-baseline gap-1 border-b-2 border-sky pb-1">
              <span className="text-[28px] font-extrabold text-navy">₹</span>
              <input
                id="amt"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, "").slice(0, 7))}
                className="tabular w-full bg-transparent text-[32px] font-extrabold text-navy outline-none"
              />
            </div>
          </section>

          <section className="rounded-2xl bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-ink-3">{t("payFrom")}</p>
              <button type="button" onClick={() => setPicking((p) => !p)} className="text-[12px] font-bold text-sky" aria-expanded={picking}>
                {picking ? t("done") : t("change")}
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {(picking ? ACCOUNTS : [account]).map((a) => {
                const on = a.bank === account.bank;
                return (
                  <li key={a.bank}>
                    <button
                      type="button"
                      onClick={() => {
                        setAccount(a);
                        setPicking(false);
                      }}
                      aria-pressed={on}
                      className="flex w-full items-center gap-3 rounded-xl p-1 text-left active:bg-sky-soft"
                    >
                      <span className="grid size-10 place-items-center rounded-full bg-sky-soft text-navy">
                        <Landmark className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[14px] font-semibold text-navy">
                          {a.bank} ••{a.last4}
                          {a.bank === outageBank && <span className="rounded-full bg-bad-soft px-1.5 text-[10px] font-bold text-bad">{t("outage")}</span>}
                        </span>
                        {on && <span className="tabular block text-[12px] text-ink-3">{t("balance")} {rupees(data.user.balance)}</span>}
                      </span>
                      <span className={cn("grid size-5 place-items-center rounded-full", on ? "bg-sky text-white" : "border border-line")}>
                        {on && <Check className="size-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="mt-auto flex flex-col gap-2">
            {blocked && (
              <div role="status" className="flex items-start gap-2.5 rounded-2xl bg-bad-soft px-3.5 py-3 ring-1 ring-bad/20">
                <Ban className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-snug text-[#b42318]">{t("blocked", { bank: account.bank })}</p>
                  <button type="button" onClick={() => setPicking(true)} className="mt-1.5 text-[12.5px] font-bold text-navy underline underline-offset-2">
                    {t("useAnother")}
                  </button>
                </div>
              </div>
            )}
            {/* The wrapper takes the hover so the tooltip still shows over a disabled button. */}
            <div className="group relative">
              <button
                type="button"
                disabled={paise <= 0 || blocked}
                aria-describedby={blocked ? "pay-blocked" : undefined}
                onClick={() => {
                  setPin("");
                  setStep("pin");
                }}
                className="inline-flex h-12 w-full items-center justify-center gap-1 rounded-full bg-sky text-[15px] font-bold text-white active:scale-[.99] disabled:bg-line disabled:text-ink-3 disabled:active:scale-100"
              >
                {t("proceed")} {paise > 0 && rupees(paise)} <ChevronRight className="size-5" aria-hidden />
              </button>
              {blocked && (
                <span
                  id="pay-blocked"
                  role="tooltip"
                  className="pointer-events-none absolute inset-x-2 bottom-[calc(100%+8px)] rounded-xl bg-ink px-3 py-2 text-center text-[12px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
                >
                  {t("blocked", { bank: account.bank })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {step === "pin" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <p className="text-center text-[13px] text-ink-3">
              {t("paying")}: <span className="font-semibold text-navy">{PAYEE.name}</span>
            </p>
            <p className="tabular text-[30px] font-extrabold text-navy">{rupees(paise)}</p>
            <p className="text-[13px] text-ink-2">{t("enterYourPin")}</p>
            <div className="flex gap-3" aria-label={`${pin.length} of ${PIN_LEN} digits entered`}>
              {Array.from({ length: PIN_LEN }, (_, i) => (
                <span key={i} className={cn("size-3.5 rounded-full border-2 border-navy transition", i < pin.length && "bg-navy")} />
              ))}
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-px bg-line pb-px">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k) =>
              k === "" ? (
                <span key="blank" className="bg-card" />
              ) : (
                <button key={k} type="button" onClick={() => press(k)} aria-label={k === "del" ? "Delete" : k} className="grid h-14 place-items-center bg-card text-[22px] font-semibold text-navy active:bg-sky-soft">
                  {k === "del" ? <Delete className="size-6" /> : k}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-card">
          <Loader2 className="size-10 animate-spin text-sky motion-reduce:animate-none" aria-hidden />
          <p className="text-[15px] font-semibold text-navy">{t("processing")}</p>
          <p className="text-[12px] text-ink-3">{t("dontBack")}</p>
        </div>
      )}

      {step === "result" && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col items-center gap-2 bg-card px-6 py-8 text-center">
            <span className={cn("grid size-16 place-items-center rounded-full text-white", failed ? "bg-warn" : "bg-ok")}>
              {failed ? <Zap className="size-8" aria-hidden /> : <Check className="size-8" strokeWidth={3} aria-hidden />}
            </span>
            <p className="tabular text-[26px] font-extrabold text-navy">{rupees(paise)}</p>
            <p className="text-[16px] font-bold text-navy">{failed ? t("failedTitle") : t("successTitle")}</p>
            <p className="text-[13px] text-ink-2">{failed ? t(alert ? "failedBody" : "failedPlain", { bank: account.bank }) : t("paidTo", { payee: PAYEE.name, bank: account.bank })}</p>
          </div>
          <div className="mt-auto flex flex-col gap-2 p-3">
            {failed && (
              <button type="button" onClick={onHelp} className="inline-flex h-12 items-center justify-center rounded-full bg-sky text-[15px] font-bold text-white">
                {t("getHelp")}
              </button>
            )}
            <button type="button" onClick={onExit} className="inline-flex h-12 items-center justify-center rounded-full bg-sky-soft text-[15px] font-bold text-navy">
              {t("backHome")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AlertStrip({ n, onHelp }: { n: Notice; onHelp: () => void }) {
  const { t, lang } = useT();
  const m = localize(n, lang);
  const hi = lang === "hi";
  return (
    <section
      role="alert"
      lang={hi ? "hi" : "en"}
      className="rc-slide-in mx-3 mt-3 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-2 p-3 text-white shadow-[0_10px_24px_-12px_rgba(0,46,110,0.7)]"
    >
      <div className="flex gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bad">
          <Info className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-sky">
            <BadgeCheck className="size-3.5" aria-hidden /> {t("official")} · {timeAgo(n.createdAt)}
          </p>
          <p className={cn("mt-0.5 font-bold leading-snug", hi ? "text-[14px]" : "text-[13.5px]")}>{m.title}</p>
          <p className={cn("mt-0.5 line-clamp-3 text-white/85", hi ? "text-[13px] leading-relaxed" : "text-[12px] leading-snug")}>{m.message}</p>
          <button type="button" onClick={onHelp} className="mt-1.5 text-[12px] font-bold text-sky">
            {t("getHelp")} →
          </button>
        </div>
      </div>
    </section>
  );
}

function Scanner({ onBack, onSkip }: { onBack: () => void; onSkip: () => void }) {
  const { t } = useT();
  const corners = [
    "left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl",
    "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl",
    "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl",
    "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl",
  ];
  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#0b1220] text-white">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <button type="button" onClick={onBack} aria-label="Close scanner" className={cn(iconBtn, "text-white hover:bg-white/10")}>
          <X className="size-5" />
        </button>
        <h1 className="flex-1 text-[17px] font-bold">{t("scanPay")}</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
        <div className="relative size-60 rounded-3xl">
          {corners.map((c) => (
            <span key={c} className={cn("absolute size-10 border-sky", c)} />
          ))}
          <span className="absolute inset-x-3 top-1/2 h-0.5 animate-pulse rounded bg-sky shadow-[0_0_12px_2px_rgba(0,186,242,0.8)] motion-reduce:animate-none" />
        </div>
        <p className="text-center text-[13px] text-white/70">{t("pointCamera")}</p>
        <button type="button" onClick={onSkip} className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-semibold">
          {t("demoScan")}
        </button>
      </div>
    </div>
  );
}
