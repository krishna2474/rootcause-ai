import { generateObject, generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateTraffic } from "@/lib/demo";
import { rupees } from "@/lib/format";
import { getModel } from "@/lib/llm";
import { scenarioFor } from "@/lib/scenarios";
import { simulateComplaintWave } from "./complaints";
import * as T from "./tools";

// The agent loop. With an LLM configured, the model investigates and writes the drafts by calling tools.
// Without one (or if the call fails), a scripted path calls the same tools so the demo never breaks.

const SYSTEM = `You are RootCause, an autonomous operations teammate at an Indian payments company.
You investigate payment failure spikes, find the shared root cause, and prepare actions for a human to approve.
Rules:
- Investigate before concluding: call clusterCases, check at least two sample transactions with checkTxnStatus, and call searchComplaints.
- Then call createIncident once, with a short title, a plain-English root cause, a confidence between 0 and 1, and 3-5 evidence points that cite numbers.
- Then call draftOpsTicket (addressed to the bank's operations team) and draftCustomerMsg (short, calm, under 45 words, Hindi version in Devanagari). Say money is safe and what happens to it, matching the error: failed debits auto-reverse within 2 hours; if the bank was unreachable no money was debited; delayed refunds are credited automatically once the bank recovers.
- You cannot send anything. A human approves every message.
- Amounts are Indian rupees. Be factual and do not invent numbers.`;

// Tools are bound to the spike under investigation, so the model can't drift to a wrong bank,
// error code or incident id.
function agentTools(spike: T.Spike) {
  let incidentId: string | null = null;
  const needIncident = () => {
    if (!incidentId) throw new Error("Call createIncident first.");
    return incidentId;
  };
  return {
    clusterCases: tool({
      description: `Group the failed ${spike.bank} ${spike.errorCode} transactions and measure impact.`,
      inputSchema: z.object({ sinceMinutes: z.number().optional() }),
      execute: async ({ sinceMinutes }) => {
        const r = await T.clusterCases({ bank: spike.bank, errorCode: spike.errorCode, sinceMinutes });
        await T.log(`Grouped ${r.failedTxns} failed ${spike.bank} payments (${spike.errorCode}) across ${r.impactedUsers} customers`);
        return r;
      },
    }),
    checkTxnStatus: tool({
      description: "Look up one transaction by its txnId.",
      inputSchema: z.object({ txnId: z.string() }),
      execute: async ({ txnId }) => {
        const r = await T.checkTxnStatus(txnId);
        await T.log(`Checked transaction ${txnId}: ${r.found ? `${r.status} ${r.errorCode ?? ""}`.trim() : "not found"}`);
        return r;
      },
    }),
    searchComplaints: tool({
      description: "Search recent customer complaints.",
      inputSchema: z.object({ sinceMinutes: z.number().optional(), keyword: z.string().optional() }),
      execute: async (input) => {
        const r = await T.searchComplaints(input);
        await T.log(`Read ${r.length} recent customer complaints`);
        return r;
      },
    }),
    createIncident: tool({
      description: "Create the incident for this spike's shared root cause. Call once.",
      inputSchema: z.object({
        title: z.string(),
        rootCause: z.string(),
        confidence: z.number().min(0).max(1),
        evidence: z.array(z.string()).min(2).max(6),
      }),
      execute: async (input) => {
        const r = await T.createIncident({ ...input, bank: spike.bank, errorCode: spike.errorCode });
        incidentId = r.incidentId;
        return r;
      },
    }),
    draftOpsTicket: tool({
      description: "Draft a ticket for the bank's UPI ops team. Saved as a draft for human approval.",
      inputSchema: z.object({ title: z.string(), body: z.string() }),
      execute: (input) => T.draftOpsTicket({ ...input, incidentId: needIncident() }),
    }),
    draftCustomerMsg: tool({
      description: "Draft the alert for affected customers in English and Hindi. Saved as a draft for human approval.",
      inputSchema: z.object({ title: z.string(), titleHi: z.string(), messageEn: z.string(), messageHi: z.string() }),
      execute: (input) => T.draftCustomerMsg({ ...input, incidentId: needIncident() }),
    }),
  };
}

const LLM_TIMEOUT_MS = 25_000;
// Reasoning models (e.g. sarvam-105b) can take 15-30s for the post-mortem; still inside the tick route's 60s.
const POSTMORTEM_TIMEOUT_MS = 45_000;

async function investigateWithLLM(spike: T.Spike) {
  const model = getModel();
  if (!model) return false;
  await generateText({
    model,
    system: SYSTEM,
    prompt: `Spike detected: ${spike.bank} ${scenarioFor(spike.bank, spike.errorCode)?.noun ?? "payments"} failing with error ${spike.errorCode} (${T.ERROR_MEANING(spike.errorCode)}). ${spike.failures} of ${spike.total} payments failed in the last 10 minutes (${T.pct(spike.failureRate)} vs ${T.pct(spike.baselineRate)} normally, ${spike.multiplier}x). First failure at ${spike.firstSeen}. Investigate and prepare the incident and drafts.`,
    tools: agentTools(spike),
    stopWhen: stepCountIs(12),
    abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
  return true;
}

async function investigateScripted(spike: T.Spike) {
  const sc = scenarioFor(spike.bank, spike.errorCode);
  const c = await T.clusterCases({ bank: spike.bank, errorCode: spike.errorCode });
  await T.log(`Grouped ${c.failedTxns} failed ${spike.bank} payments (${spike.errorCode}) across ${c.impactedUsers} customers`);
  for (const id of c.sampleTxnIds.slice(0, 2)) {
    const t = await T.checkTxnStatus(id);
    await T.log(`Checked transaction ${id}: ${t.found ? `${t.status} ${t.errorCode ?? ""}`.trim() : "not found"}`);
  }
  const complaints = await T.searchComplaints({ sinceMinutes: 30 });
  await T.log(`Read ${complaints.length} recent customer complaints`);

  const { incidentId, alreadyExisted } = await T.createIncident({
    title: sc?.scripted.title ?? `${spike.bank} payments failing (${spike.errorCode})`,
    rootCause: sc?.scripted.rootCause ?? `${spike.bank} is failing requests with ${spike.errorCode} (${c.errorMeaning}) while other banks are unaffected.`,
    bank: spike.bank,
    errorCode: spike.errorCode,
    confidence: 0.87,
    evidence: [
      `${c.failedTxns} failed payments in 15 min, all ${spike.bank}, all error ${spike.errorCode} (${c.errorMeaning})`,
      `Failure rate ${T.pct(spike.failureRate)} vs ${T.pct(spike.baselineRate)} normally (${spike.multiplier}x)`,
      `Other banks are normal at ${T.pct(c.otherBanksFailureRate)} failure rate`,
      `${c.complaintsFromAffectedUsers} complaints already received from affected customers`,
    ],
  });
  if (alreadyExisted) return fillMissingDrafts(incidentId, spike);
  await scriptedDrafts(incidentId, spike, ["OPS_TICKET", "CUSTOMER_MSG"]);
}

/** If the LLM stopped partway, finish its work with scripted drafts. */
async function fillMissingDrafts(incidentId: string, spike: T.Spike) {
  const acts = await db.action.findMany({ where: { incidentId } });
  const missing = (["OPS_TICKET", "CUSTOMER_MSG"] as const).filter((k) => !acts.some((a) => a.kind === k));
  if (missing.length) await scriptedDrafts(incidentId, spike, [...missing]);
}

async function scriptedDrafts(incidentId: string, spike: T.Spike, kinds: ("OPS_TICKET" | "CUSTOMER_MSG")[]) {
  const c = await T.clusterCases({ bank: spike.bank, errorCode: spike.errorCode });
  const sc = scenarioFor(spike.bank, spike.errorCode);
  if (kinds.includes("OPS_TICKET")) {
    await T.draftOpsTicket({
      incidentId,
      title: `[P1] ${sc?.scripted.title ?? `${spike.bank} failures (${spike.errorCode})`}`,
      body: `Hi ${spike.bank} Ops,\n\nSince ${new Date(c.firstFailure ?? Date.now()).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata" })} we are seeing ${c.failedTxns} failed ${sc?.noun ?? "payments"} with ${spike.errorCode} (${c.errorMeaning}) across ${c.impactedUsers} customers, ${c.moneyStuck} in value. Other banks are normal.\n\nSample txn IDs: ${c.sampleTxnIds.join(", ")}\n\n${sc?.scripted.opsAsk ?? "Please investigate and confirm when it is fixed."}\n\n- RootCause AI, on behalf of Payments Ops`,
    });
  }
  if (kinds.includes("CUSTOMER_MSG")) {
    const a = sc?.scripted.alert;
    await T.draftCustomerMsg({
      incidentId,
      title: a?.title ?? "Your payment didn't go through",
      titleHi: a?.titleHi ?? "आपका भुगतान पूरा नहीं हुआ",
      messageEn: a?.en ?? `${spike.bank} is having a temporary problem. Your money is safe. We'll update you here.`,
      messageHi: a?.hi ?? `${spike.bank} में अस्थायी समस्या है। आपका पैसा सुरक्षित है। हम आपको यहीं अपडेट देंगे।`,
    });
  }
}

async function investigate(spike: T.Spike) {
  await T.log(`Detected spike: ${spike.bank} ${scenarioFor(spike.bank, spike.errorCode)?.noun ?? "payment"} failures ${spike.multiplier}x normal (${spike.failures} failed, error ${spike.errorCode})`);
  try {
    if (await investigateWithLLM(spike)) {
      // The model may stop early; fill in anything it skipped.
      const inc = await db.incident.findFirst({ where: { bank: spike.bank, errorCode: spike.errorCode, status: "OPEN" } });
      if (inc) return fillMissingDrafts(inc.id, spike);
    }
  } catch (err) {
    await T.log(`LLM unavailable, switching to scripted investigation (${(err as Error).message.slice(0, 80)})`, undefined, undefined, "SYSTEM");
  }
  await investigateScripted(spike);
}

export async function writePostmortem(incidentId: string) {
  const inc = await db.incident.findUniqueOrThrow({ where: { id: incidentId }, include: { complaints: true } });
  const timeline = await T.incidentTimeline(incidentId);
  const minutes = inc.resolvedAt ? Math.max(1, Math.round((inc.resolvedAt.getTime() - inc.createdAt.getTime()) / 60_000)) : null;
  const fallback = {
    cause: inc.rootCause,
    impact: `${inc.impactedUsers} customers, ${rupees(inc.moneyStuck)} in failed payments, ${inc.complaints.length} complaints. Detected automatically and resolved${minutes ? ` in ${minutes} min` : ""}.`,
    preventionRule: `If ${inc.bank} UPI failures with ${inc.errorCode} exceed 3x the hourly baseline for 5 minutes, auto-open an incident, page ${inc.bank} UPI ops, and show a "bank is slow" banner at checkout for ${inc.bank} users.`,
  };
  let content = fallback;
  const model = getModel();
  if (model) {
    try {
      const { object } = await generateObject({
        model,
        schema: z.object({ cause: z.string(), impact: z.string(), preventionRule: z.string() }),
        abortSignal: AbortSignal.timeout(POSTMORTEM_TIMEOUT_MS),
        prompt: `Respond only with JSON: {"cause": string, "impact": string, "preventionRule": string}.\nWrite a short blameless post-mortem for this payments incident. Each field 1-2 sentences.\nIncident: ${JSON.stringify({ title: inc.title, rootCause: inc.rootCause, bank: inc.bank, errorCode: inc.errorCode, impactedUsers: inc.impactedUsers, moneyStuck: rupees(inc.moneyStuck), complaints: inc.complaints.length, evidence: inc.evidence })}\nTimeline: ${JSON.stringify(timeline)}`,
      });
      content = object;
    } catch (err) {
      await T.log(`LLM post-mortem failed, using template (${(err as Error).message.slice(0, 80)})`, undefined, undefined, "SYSTEM");
    }
  }
  return T.savePostmortem({ incidentId, ...content });
}

/** The "payments are working again" notice: written by the LLM from the incident facts, a template if it can't. */
export async function draftAllClear(incidentId: string) {
  if (await db.action.count({ where: { incidentId, kind: "CUSTOMER_RESOLVED" } })) return;
  const inc = await db.incident.findUniqueOrThrow({ where: { id: incidentId }, include: { actions: { where: { kind: "CUSTOMER_MSG", language: "en" }, take: 1 } } });
  const sc = scenarioFor(inc.bank, inc.errorCode);
  let content = T.allClearTemplate(inc.bank, sc?.noun, sc?.nounHi);
  const model = getModel();
  if (model) {
    try {
      const minutes = inc.resolvedAt ? Math.max(1, Math.round((inc.resolvedAt.getTime() - inc.createdAt.getTime()) / 60_000)) : null;
      const { object } = await generateObject({
        model,
        schema: z.object({ title: z.string(), titleHi: z.string(), messageEn: z.string(), messageHi: z.string() }),
        abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
        prompt: `Respond only with JSON: {"title": string, "titleHi": string, "messageEn": string, "messageHi": string}.
Write the all-clear push notification for customers of an Indian payments app. The ${inc.bank} issue with ${sc?.noun ?? "payments"} (error ${inc.errorCode}) is fixed and they work normally again.
Rules: calm and warm; title under 8 words; message under 40 words; tell them things work as usual again; stay consistent with the alert we sent earlier about what happens to their money; do not invent numbers, times or new promises. titleHi and messageHi are the same in natural Hindi (Devanagari).
Facts: ${JSON.stringify({ bank: inc.bank, customersAffected: inc.impactedUsers, outageMinutes: minutes, alertWeSentEarlier: inc.actions[0]?.draft ?? null })}`,
      });
      content = object;
    } catch (err) {
      await T.log(`LLM all-clear failed, using template (${(err as Error).message.slice(0, 80)})`, incidentId, undefined, "SYSTEM");
    }
  }
  await T.draftResolvedMsg({ incidentId, ...content });
}

/** One heartbeat of the autonomous loop: keep traffic moving, detect, investigate, verify, learn. */
export async function tick() {
  // A lease in the DB, not a module variable, so two tabs or two serverless instances can't tick at once.
  const { count } = await db.demoState.updateMany({
    where: { id: 1, OR: [{ tickLockUntil: null }, { tickLockUntil: { lt: new Date() } }] },
    data: { tickLockUntil: new Date(Date.now() + 55_000) },
  });
  if (!count) return { skipped: true };
  try {
    const generated = await generateTraffic();
    const spikes = await T.detectSpike();
    for (const s of spikes) await investigate(s);
    await T.refreshImpact();
    const complaints = await simulateComplaintWave();

    const fixed = await db.incident.findMany({ where: { status: { in: ["OPEN", "APPROVED"] }, fixedAt: { not: null } } });
    for (const inc of fixed) {
      const v = await T.verifyFix(inc.id);
      if (v.verified) await Promise.all([draftAllClear(inc.id), writePostmortem(inc.id)]);
    }
    return { skipped: false, generated, spikes: spikes.length, complaints };
  } finally {
    await db.demoState.update({ where: { id: 1 }, data: { tickLockUntil: null } }).catch(() => {});
  }
}
