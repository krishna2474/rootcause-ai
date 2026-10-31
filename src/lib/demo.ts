import type { EventType, Prisma } from "@prisma/client";
import { db } from "./db";
import { DEFAULT_SCENARIO, SCENARIOS, scenarioById, scenarioFor } from "./scenarios";

// Mock world for the demo. Amounts are in paise.

export const DEMO_USER_ID = "u_demo";
export const SPIKE_BANK = DEFAULT_SCENARIO.bank;
export const SPIKE_CODE = DEFAULT_SCENARIO.code;

export const BANKS = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank"];

/** NPCI-style UPI error codes used in the mock data. */
export const ERROR_CODES: Record<string, string> = {
  U30: "Debit failed at remitter bank (core banking timeout)",
  U28: "Remitter bank unreachable (connection timeout at the bank's UPI switch)",
  U68: "Credit timeout at beneficiary bank (refund not credited)",
  U16: "Risk threshold exceeded",
  U69: "Collect request expired",
  Z9: "Insufficient funds",
  ZM: "Invalid UPI PIN",
};
const BACKGROUND_CODES = ["U16", "U69", "Z9", "ZM"];

const PAYEES = [
  "Sharma Kirana Store", "Swiggy", "Zomato", "IRCTC", "Jio Recharge", "BESCOM Electricity",
  "Apollo Pharmacy", "Big Bazaar", "Ola Cabs", "Chai Point", "Reliance Smart", "Rapido",
];

const NAMES = [
  "Krishna Narayan", "Priya Nair", "Amit Patel", "Sneha Reddy", "Vikram Singh", "Ananya Iyer", "Rohan Gupta",
  "Kavya Menon", "Arjun Mehta", "Neha Joshi", "Siddharth Rao", "Pooja Kulkarni", "Karan Malhotra",
  "Divya Pillai", "Manish Yadav", "Ritu Agarwal", "Aditya Kumar", "Meera Krishnan", "Suresh Babu",
  "Fatima Sheikh", "Harpreet Kaur", "Nikhil Desai", "Lakshmi Narayanan", "Imran Khan", "Shruti Bhat",
  "Gaurav Saxena", "Anjali Mishra", "Deepak Chauhan", "Swati Banerjee", "Rajesh Tiwari", "Nandini Ghosh",
  "Vivek Sharma", "Ayesha Siddiqui", "Prakash Jain", "Tanvi Shah", "Mohit Bansal", "Sunita Devi",
  "Abhishek Das", "Rekha Pandey", "Varun Kapoor",
];

// Deterministic pseudo-random so the demo looks the same every reset.
let seed = 42;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function amount() {
  // ₹50 – ₹5,000, rounded to ₹10
  return Math.round((50 + rand() * 4950) / 10) * 1000;
}
let txnCounter = 0;
function txnId() {
  txnCounter++;
  return `T${Date.now().toString().slice(-7)}${String(txnCounter).padStart(4, "0")}${Math.floor(rand() * 90 + 10)}`;
}

function userId(i: number) {
  return i === 0 ? DEMO_USER_ID : `u_${String(i).padStart(3, "0")}`;
}

function eventRow(opts: {
  userId: string;
  bank: string;
  at: Date;
  failed?: boolean;
  code?: string;
  type?: EventType;
  payee?: string;
  amount?: number;
}): Prisma.PaymentEventCreateManyInput {
  return {
    txnId: txnId(),
    userId: opts.userId,
    type: opts.type ?? "UPI",
    bank: opts.bank,
    payee: opts.payee ?? pick(PAYEES),
    amount: opts.amount ?? amount(),
    status: opts.failed ? "FAILED" : "SUCCESS",
    errorCode: opts.failed ? opts.code ?? pick(BACKGROUND_CODES) : null,
    createdAt: opts.at,
  };
}

/** Wipes everything and loads 60 minutes of normal traffic. */
export async function resetDemo() {
  seed = 42;
  // One atomic TRUNCATE + user insert. Separate deleteMany calls raced with the agent's live traffic: a payment event
  // inserted by a tick between "delete events" and "delete users" violated PaymentEvent_userId_fkey.
  await db.$transaction([
    db.$executeRawUnsafe(
      'TRUNCATE TABLE "Postmortem", "Notification", "ChatMessage", "Complaint", "Action", "AuditLog", "Incident", "PaymentEvent", "User", "DemoState" CASCADE',
    ),
    db.user.createMany({
      data: NAMES.map((name, i) => ({
        id: userId(i),
        name,
        phone: `+9198${String(10000000 + i * 7919).slice(0, 8)}`,
        // The demo customer (index 0) uses the app in English, so their alerts are English; other customers are a mix.
        language: i !== 0 && i % 3 === 0 ? "hi" : "en",
        balance: 1_284_750 + i * 31_000,
      })),
    }),
  ]);

  const now = Date.now();
  const rows: Prisma.PaymentEventCreateManyInput[] = [];
  // ~4 events a minute for the last hour, ~3% background failures spread across banks.
  for (let m = 60; m >= 1; m--) {
    for (let k = 0; k < 4; k++) {
      const at = new Date(now - m * 60_000 + Math.floor(rand() * 60_000));
      rows.push(eventRow({ userId: userId(1 + Math.floor(rand() * (NAMES.length - 1))), bank: pick(BANKS), at, failed: rand() < 0.03 }));
    }
  }
  // The demo customer's own history, all fine.
  const history: [string, number, number, EventType?][] = [
    ["Jio Recharge", 299_00, 50],
    ["Swiggy", 412_00, 38],
    ["BESCOM Electricity", 1_860_00, 27],
    ["Chai Point", 60_00, 12, "UPI"],
  ];
  for (const [payee, amt, minsAgo, type] of history) {
    rows.push(eventRow({ userId: DEMO_USER_ID, bank: SPIKE_BANK, payee, amount: amt, at: new Date(now - minsAgo * 60_000), type }));
  }
  await db.paymentEvent.createMany({ data: rows });
  await db.demoState.create({ data: { id: 1 } });
  await db.auditLog.create({ data: { actor: "SYSTEM", action: "Demo reset: 60 minutes of normal traffic loaded" } });
}

/** Starts the HDFC UPI outage: back-fills the last 3 minutes and keeps failing until fixed. */
/** A demo request that can't be done right now; carries the HTTP status for the API route. */
export class DemoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function fireSpike(scenarioId?: string) {
  if (scenarioId && !SCENARIOS.some((x) => x.id === scenarioId)) {
    throw new DemoError(`Unknown issue "${scenarioId}". Use one of: ${SCENARIOS.map((x) => x.id).join(", ")}`, 400);
  }
  // One issue at a time: a second one would leave the first incident open with no way to fix it.
  const running = await db.demoState.findUnique({ where: { id: 1 } });
  if (running?.spikeActive) throw new DemoError("An issue is already running. Press \"Bank deploys fix\" first.", 409);
  const sc = scenarioById(scenarioId);
  const now = Date.now();
  // The outage "started" up to 3 minutes ago, but never before the last fix of this same issue: the agent only
  // counts failures after a fix, so back-dating past it would hide the repeat.
  const lastFix = await db.incident.findFirst({ where: { bank: sc.bank, errorCode: sc.code, fixedAt: { not: null } }, orderBy: { fixedAt: "desc" }, select: { fixedAt: true } });
  const from = Math.max(now - 180_000, (lastFix?.fixedAt?.getTime() ?? 0) + 1_000);
  const span = Math.max(0, now - 1_000 - from);
  const at = (t: number) => new Date(Math.min(t, now - 1)); // never in the future, or it could land after the next fix
  const rows: Prisma.PaymentEventCreateManyInput[] = [];
  for (let i = 0; i < 30; i++) {
    const uid = userId(1 + ((i * 7) % (NAMES.length - 1)));
    rows.push(eventRow({ userId: uid, bank: sc.bank, at: at(from + (i / 29) * span), failed: true, code: sc.code, type: sc.type }));
  }
  // The demo customer's own failed transaction, the one they will complain about.
  rows.push(
    eventRow({
      userId: DEMO_USER_ID,
      bank: sc.bank,
      payee: sc.demoTxn.payee,
      amount: sc.demoTxn.amount,
      at: at(Math.max(now - 40_000, from + 500)),
      failed: true,
      code: sc.code,
      type: sc.type,
    }),
  );
  await db.paymentEvent.createMany({ data: rows });

  // A few early complaints from affected customers.
  const early = sc.complaints.filter((c) => c.channel === "CHAT").slice(0, 3);
  await db.complaint.createMany({
    data: early.map((c, k) => ({
      userId: userId(1 + ((((k + 1) * 7) * 7) % (NAMES.length - 1))),
      channel: "CHAT" as const,
      text: c.text,
      language: /[\u0900-\u097F]/.test(c.text) ? "hi" : "en",
      createdAt: at(Math.max(now - 90_000 + k * 20_000, from + k * 1_000)),
    })),
  });

  await db.demoState.upsert({
    where: { id: 1 },
    create: { id: 1, spikeBank: sc.bank, spikeCode: sc.code, spikeActive: true },
    update: { spikeBank: sc.bank, spikeCode: sc.code, spikeActive: true, fixedAt: null },
  });
  await db.auditLog.create({ data: { actor: "SYSTEM", action: `Demo: ${sc.label} started` } });
}

/** The bank deploys its fix: traffic for that bank succeeds again. */
export async function applyFix() {
  const state = await db.demoState.findUnique({ where: { id: 1 } });
  const bank = state?.spikeBank ?? SPIKE_BANK;
  const sc = scenarioFor(bank, state?.spikeCode);
  const now = new Date();
  await db.demoState.upsert({ where: { id: 1 }, create: { id: 1, fixedAt: now }, update: { spikeActive: false, fixedAt: now } });
  await db.incident.updateMany({ where: { bank, status: { in: ["OPEN", "APPROVED"] }, fixedAt: null }, data: { fixedAt: now } });

  const rows: Prisma.PaymentEventCreateManyInput[] = [];
  for (let i = 0; i < 14; i++) {
    rows.push(eventRow({ userId: userId(1 + Math.floor(rand() * (NAMES.length - 1))), bank, at: new Date(now.getTime() + i * 200), type: sc?.type }));
  }
  await db.paymentEvent.createMany({ data: rows });
  await db.auditLog.create({ data: { actor: "SYSTEM", action: `Demo: ${bank} deployed a fix, ${sc?.noun ?? "payments"} recovering` } });
}

/** Called on every agent tick so the feed keeps moving. */
export async function generateTraffic() {
  const state = await db.demoState.findUnique({ where: { id: 1 } });
  if (!state) return 0;
  const sc = scenarioFor(state.spikeBank, state.spikeCode);
  const n = 2 + Math.floor(rand() * 3);
  const rows: Prisma.PaymentEventCreateManyInput[] = [];
  for (let i = 0; i < n; i++) {
    const bank = state.spikeActive && rand() < 0.45 ? state.spikeBank! : pick(BANKS);
    const outage = state.spikeActive && bank === state.spikeBank;
    rows.push(
      eventRow({
        userId: userId(1 + Math.floor(rand() * (NAMES.length - 1))),
        bank,
        at: new Date(Date.now() - i * 50), // never in the future, or it could land after a fix
        failed: outage ? rand() < 0.85 : rand() < 0.03,
        code: outage ? state.spikeCode ?? SPIKE_CODE : undefined,
        type: outage ? sc?.type : undefined,
      }),
    );
  }
  await db.paymentEvent.createMany({ data: rows });
  return n;
}

/** A payment made from the customer app. It fails when its bank is in the running outage, whether or not an alert has gone out. */
export async function submitPayment(input: { userId: string; bank: string; amount: number; payee: string }) {
  const state = await db.demoState.findUnique({ where: { id: 1 } });
  // Only a payments outage blocks payments; a refunds outage leaves new payments working.
  const sc = scenarioFor(state?.spikeBank, state?.spikeCode);
  const failed = Boolean(state?.spikeActive && state.spikeBank === input.bank && (sc?.type ?? "UPI") === "UPI");
  await db.paymentEvent.create({
    data: {
      ...eventRow({ userId: input.userId, bank: input.bank, at: new Date(), failed, code: state?.spikeCode ?? SPIKE_CODE, payee: input.payee, amount: input.amount }),
    },
  });
  return { status: failed ? ("FAILED" as const) : ("SUCCESS" as const), errorCode: failed ? state?.spikeCode ?? SPIKE_CODE : null };
}
