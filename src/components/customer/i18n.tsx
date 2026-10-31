"use client";
import { createContext, useCallback, useContext } from "react";
import type { Notice } from "./types";

export type Lang = "en" | "hi";

const en = {
  upiTransfer: "UPI Money Transfer",
  scanPay: "Scan & Pay",
  toMobile: "To Mobile or Contact",
  toBank: "To Bank A/c or UPI ID",
  toSelf: "To Self A/c",
  balanceHistory: "Balance & History",
  receive: "Receive Money",
  upiId: "UPI ID:",
  totalBalance: "Total Balance",
  recharges: "Recharges & Bill Payments",
  viewAll: "View all",
  mobileRecharge: "Mobile Recharge",
  electricity: "Electricity Bill",
  dth: "DTH Recharge",
  fastag: "FASTag Recharge",
  recent: "Recent Payments",
  seeAll: "See all",
  noPayments: "No payments yet",
  doMore: "Do more with Paytm",
  metro: "Metro Tickets",
  flights: "Flights",
  movies: "Movies",
  gold: "Digital Gold",
  guardOn: "Payment Guard is on.",
  guardBody: "We spot bank outages early and tell you what happened before you have to ask.",
  poweredBy: "Powered by RootCause AI",
  soon: "{what} isn't part of this demo",
  official: "Official update",
  getHelp: "Get help",
  navHome: "Home",
  navHistory: "History",
  navScan: "Scan",
  navHelp: "Help",
  navAlerts: "Alerts",
  titleHistory: "Balance & History",
  titleHelp: "Help & Support",
  notifications: "Notifications",
  caughtUp: "You're all caught up",
  caughtUpBody: "Updates about your payments will show up here.",
  askAbout: "Ask about this",
  language: "Language",
  chooseLanguage: "Choose language",
  pay: "Pay",
  enterPin: "Enter UPI PIN",
  payStatus: "Payment status",
  paying: "Paying",
  enterAmount: "Enter amount",
  payFrom: "Pay from",
  change: "Change",
  done: "Done",
  balance: "Balance",
  proceed: "Proceed to pay",
  enterYourPin: "Enter your 6-digit UPI PIN",
  processing: "Processing payment…",
  dontBack: "Please don't press back",
  failedTitle: "Payment didn't go through",
  failedBody: "{bank} isn't responding right now. Your money is safe.",
  failedPlain: "{bank} isn't responding right now. Please try again in a while.",
  successTitle: "Payment successful",
  paidTo: "Paid to {payee} from {bank}",
  backHome: "Back to home",
  blocked: "{bank} is facing an outage right now. Pay from another account so your payment doesn't fail.",
  useAnother: "Use another account",
  outage: "Outage",
  pointCamera: "Point your camera at any UPI QR code",
  demoScan: "Demo: scan Sharma Kirana Store",
};

const hi: typeof en = {
  upiTransfer: "UPI पैसे भेजें",
  scanPay: "स्कैन करें और भुगतान करें",
  toMobile: "मोबाइल या कॉन्टैक्ट को",
  toBank: "बैंक खाते या UPI ID पर",
  toSelf: "अपने खाते में",
  balanceHistory: "बैलेंस और हिस्ट्री",
  receive: "पैसे प्राप्त करें",
  upiId: "UPI आईडी:",
  totalBalance: "कुल बैलेंस",
  recharges: "रिचार्ज और बिल भुगतान",
  viewAll: "सभी देखें",
  mobileRecharge: "मोबाइल रिचार्ज",
  electricity: "बिजली बिल",
  dth: "DTH रिचार्ज",
  fastag: "FASTag रिचार्ज",
  recent: "हाल के भुगतान",
  seeAll: "सभी देखें",
  noPayments: "अभी कोई भुगतान नहीं",
  doMore: "Paytm के साथ और करें",
  metro: "मेट्रो टिकट",
  flights: "फ्लाइट",
  movies: "मूवी",
  gold: "डिजिटल गोल्ड",
  guardOn: "पेमेंट गार्ड चालू है।",
  guardBody: "हम बैंक की दिक्कत जल्दी पहचानते हैं और आपके पूछने से पहले बता देते हैं।",
  poweredBy: "RootCause AI द्वारा संचालित",
  soon: "{what} इस डेमो में शामिल नहीं है",
  official: "आधिकारिक अपडेट",
  getHelp: "मदद लें",
  navHome: "होम",
  navHistory: "हिस्ट्री",
  navScan: "स्कैन",
  navHelp: "मदद",
  navAlerts: "अलर्ट",
  titleHistory: "बैलेंस और हिस्ट्री",
  titleHelp: "मदद और सहायता",
  notifications: "सूचनाएँ",
  caughtUp: "सब कुछ देख लिया",
  caughtUpBody: "आपके भुगतान से जुड़े अपडेट यहाँ दिखेंगे।",
  askAbout: "इस बारे में पूछें",
  language: "भाषा",
  chooseLanguage: "भाषा चुनें",
  pay: "भुगतान",
  enterPin: "UPI पिन दर्ज करें",
  payStatus: "भुगतान की स्थिति",
  paying: "भुगतान किसे",
  enterAmount: "राशि दर्ज करें",
  payFrom: "किस खाते से",
  change: "बदलें",
  done: "हो गया",
  balance: "बैलेंस",
  proceed: "भुगतान करें",
  enterYourPin: "अपना 6 अंकों का UPI पिन दर्ज करें",
  processing: "भुगतान हो रहा है…",
  dontBack: "कृपया बैक न दबाएँ",
  failedTitle: "भुगतान नहीं हो पाया",
  failedBody: "{bank} अभी जवाब नहीं दे रहा है। आपका पैसा सुरक्षित है।",
  failedPlain: "{bank} अभी जवाब नहीं दे रहा है। कृपया थोड़ी देर बाद कोशिश करें।",
  successTitle: "भुगतान सफल",
  paidTo: "{bank} से {payee} को भुगतान किया गया",
  backHome: "होम पर वापस",
  blocked: "{bank} में अभी समस्या चल रही है। भुगतान विफल न हो, इसलिए किसी दूसरे खाते से भुगतान करें।",
  useAnother: "दूसरा खाता चुनें",
  outage: "समस्या",
  pointCamera: "किसी भी UPI QR कोड पर कैमरा रखें",
  demoScan: "डेमो: Sharma Kirana Store को स्कैन करें",
};

const dict = { en, hi };
export type Key = keyof typeof en;

/** Translate outside a component tree that sits under the provider. */
export const tr = (lang: Lang, key: Key) => dict[lang][key];

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function useT() {
  const { lang, setLang } = useContext(LangContext);
  const t = useCallback(
    (key: Key, vars?: Record<string, string>) => {
      let s: string = dict[lang][key];
      for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(`{${k}}`, v);
      return s;
    },
    [lang],
  );
  return { t, lang, setLang };
}

/** An alert in the app's language. Falls back to the version stored on the notification. */
export function localize(n: Notice, lang: Lang) {
  return n.variants?.[lang] ?? { title: n.title, message: n.message };
}
