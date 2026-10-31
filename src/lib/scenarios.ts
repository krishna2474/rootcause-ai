// Demo issues the presenter can fire. Pure data, so both the server (mock world, agent) and the dashboard can import it.
// Each one differs in bank, error code and payment type, so the agent visibly reasons about what it sees.

export type ScenarioId = "hdfc-upi" | "sbi-upi" | "icici-refund";

export type Scenario = {
  id: ScenarioId;
  /** Shown in the demo picker and status pill. */
  label: string;
  bank: string;
  short: string;
  code: string;
  meaning: string;
  type: "UPI" | "REFUND";
  /** What is broken, in words customers use ("UPI payments", "refunds"). */
  noun: string;
  nounHi: string;
  /** The demo customer's own failed transaction, so their phone gets the alert. */
  demoTxn: { payee: string; amount: number };
  /** Wording for the scripted agent (used only when no LLM is configured or it fails). */
  scripted: {
    title: string;
    rootCause: string;
    opsAsk: string;
    alert: { title: string; titleHi: string; en: string; hi: string };
  };
  /** Lines the simulated complaint wave uses. Each must match PAYMENT_TOPIC in agent/complaints.ts. */
  complaints: { text: string; channel: "CHAT" | "VOICE" }[];
};

export const SCENARIOS: Scenario[] = [
  {
    id: "hdfc-upi",
    label: "HDFC · UPI debits failing",
    bank: "HDFC Bank",
    short: "HDFC",
    code: "U30",
    meaning: "Debit failed at remitter bank (core banking timeout)",
    type: "UPI",
    noun: "UPI payments",
    nounHi: "UPI भुगतान",
    demoTxn: { payee: "Sharma Kirana Store", amount: 1_250_00 },
    scripted: {
      title: "HDFC Bank UPI debits failing (U30)",
      rootCause: "HDFC Bank's core banking system is timing out on UPI debit requests, so payments fail with U30 while other banks are unaffected.",
      opsAsk: "Please check CBS response times for UPI debits and confirm auto-reversal for debited amounts.",
      alert: {
        title: "Your payment didn't go through",
        titleHi: "आपका भुगतान पूरा नहीं हुआ",
        en: "HDFC Bank is having a temporary problem with UPI payments. Your money is safe. If it was debited, it will be returned to your account automatically within 2 hours. We'll update you here.",
        hi: "HDFC Bank में UPI भुगतान में अस्थायी समस्या है। आपका पैसा सुरक्षित है। अगर पैसा कट गया है, तो 2 घंटे में अपने आप आपके खाते में वापस आ जाएगा। हम आपको यहीं अपडेट देंगे।",
      },
    },
    complaints: [
      { text: "UPI payment failed but money got debited. Please help.", channel: "CHAT" },
      { text: "Payment fail ho gaya, paisa kat gaya. Refund kab aayega?", channel: "CHAT" },
      { text: "Tried paying 3 times, all failed. Is HDFC down?", channel: "CHAT" },
      { text: "मेरा पेमेंट फेल हो गया लेकिन पैसे कट गए, क्या हुआ?", channel: "VOICE" },
      { text: "Shop pe payment fail ho raha hai baar baar", channel: "CHAT" },
      { text: "₹2,000 debited but merchant says not received. Where is my money?", channel: "CHAT" },
      { text: "UPI transaction pending for 10 minutes, what is going on?", channel: "CHAT" },
      { text: "भुगतान नहीं हुआ और खाते से पैसे कट गए", channel: "VOICE" },
      { text: "Bhai mera UPI kaam nahi kar raha, payment fail", channel: "VOICE" },
      { text: "Refund status? My payment to the kirana store failed", channel: "CHAT" },
      { text: "Paise kat gaye par recharge nahi hua", channel: "CHAT" },
      { text: "Why is every HDFC UPI payment failing today?", channel: "CHAT" },
      { text: "पेमेंट बार बार फेल हो रहा है, कृपया जल्दी ठीक करें", channel: "VOICE" },
      { text: "Again payment failed!! This is the second time today", channel: "CHAT" },
      { text: "Money deducted, transaction failed, need refund urgently", channel: "CHAT" },
    ],
  },
  {
    id: "sbi-upi",
    label: "SBI · UPI bank unreachable",
    bank: "State Bank of India",
    short: "SBI",
    code: "U28",
    meaning: "Remitter bank unreachable (connection timeout at the bank's UPI switch)",
    type: "UPI",
    noun: "UPI payments",
    nounHi: "UPI भुगतान",
    demoTxn: { payee: "Apollo Pharmacy", amount: 860_00 },
    scripted: {
      title: "SBI UPI requests timing out (U28)",
      rootCause: "State Bank of India's UPI switch is not responding, so UPI requests time out with U28 before any debit happens. Other banks are normal.",
      opsAsk: "Please check the health of your UPI switch and NPCI connectivity, and confirm when requests are being accepted again.",
      alert: {
        title: "SBI UPI payments are failing",
        titleHi: "SBI UPI भुगतान विफल हो रहे हैं",
        en: "State Bank of India's UPI service is not responding right now, so payments may fail. No money is debited for these failures. Please try again later or pay from another bank account.",
        hi: "स्टेट बैंक ऑफ इंडिया की UPI सेवा अभी जवाब नहीं दे रही है, इसलिए भुगतान विफल हो सकते हैं। इन विफल भुगतानों में पैसा नहीं कटता। कृपया थोड़ी देर बाद या किसी दूसरे बैंक खाते से भुगतान करें।",
      },
    },
    complaints: [
      { text: "SBI UPI not working, payment keeps failing", channel: "CHAT" },
      { text: "Payment fail ho raha hai SBI account se", channel: "CHAT" },
      { text: "मेरा SBI से पेमेंट नहीं हो रहा", channel: "VOICE" },
      { text: "Is SBI UPI down? Can't pay at the shop", channel: "CHAT" },
      { text: "UPI payment failed, it says bank not reachable", channel: "CHAT" },
      { text: "Pharmacy pe payment fail ho gaya, SBI account hai", channel: "VOICE" },
      { text: "भुगतान बार बार फेल हो रहा है", channel: "VOICE" },
      { text: "Transaction failed 3 times from my SBI account", channel: "CHAT" },
      { text: "Bhai SBI UPI band hai kya? payment nahi ho raha", channel: "VOICE" },
      { text: "Payment failed at the petrol pump, what is going on?", channel: "CHAT" },
    ],
  },
  {
    id: "icici-refund",
    label: "ICICI · refunds not credited",
    bank: "ICICI Bank",
    short: "ICICI",
    code: "U68",
    meaning: "Credit timeout at beneficiary bank (refund not credited)",
    type: "REFUND",
    noun: "refunds",
    nounHi: "रिफंड",
    demoTxn: { payee: "Swiggy", amount: 640_00 },
    scripted: {
      title: "ICICI refunds failing to credit (U68)",
      rootCause: "ICICI Bank is timing out on incoming credits, so refunds to ICICI accounts fail with U68 and wait for retry. Payments and other banks are unaffected.",
      opsAsk: "Please check the inward credit leg for timeouts and confirm the retry queue for pending refunds.",
      alert: {
        title: "Your refund is delayed",
        titleHi: "आपका रिफंड देर से आएगा",
        en: "Refunds to ICICI Bank accounts are delayed because of a temporary bank issue. Your money is safe and the refund will be credited automatically once the bank recovers. You don't need to do anything.",
        hi: "बैंक की अस्थायी समस्या के कारण ICICI बैंक खातों में रिफंड देर से आ रहे हैं। आपका पैसा सुरक्षित है और बैंक के ठीक होते ही रिफंड अपने आप आपके खाते में आ जाएगा। आपको कुछ करने की ज़रूरत नहीं है।",
      },
    },
    complaints: [
      { text: "Refund not received yet, it's been hours", channel: "CHAT" },
      { text: "Swiggy order cancelled but refund not credited", channel: "CHAT" },
      { text: "Refund kab aayega? Order cancel ho gaya tha", channel: "VOICE" },
      { text: "मेरा रिफंड अभी तक नहीं आया", channel: "VOICE" },
      { text: "Money debited for a cancelled order, where is my refund?", channel: "CHAT" },
      { text: "Refund status shows failed, please check", channel: "CHAT" },
      { text: "रिफंड नहीं मिला, कृपया जल्दी करें", channel: "VOICE" },
      { text: "Paise wapas nahi aaye abhi tak, refund pending", channel: "CHAT" },
      { text: "Why are ICICI refunds not coming today?", channel: "CHAT" },
      { text: "Refund failed for my IRCTC ticket cancellation", channel: "CHAT" },
    ],
  },
];

export const DEFAULT_SCENARIO = SCENARIOS[0];

export function scenarioById(id: string | null | undefined) {
  return SCENARIOS.find((s) => s.id === id) ?? DEFAULT_SCENARIO;
}

/** The scenario behind a running or past outage, from its bank and error code. */
export function scenarioFor(bank: string | null | undefined, code: string | null | undefined) {
  return SCENARIOS.find((s) => s.bank === bank && s.code === code) ?? null;
}
