import { generateText } from "ai";
import type { Channel } from "@prisma/client";
import { db } from "@/lib/db";
import { DEMO_USER_ID, ERROR_CODES } from "@/lib/demo";
import { rupees } from "@/lib/format";
import { getModel } from "@/lib/llm";
import { DEFAULT_SCENARIO, scenarioFor } from "@/lib/scenarios";
import { log } from "./tools";

const DEVANAGARI = /[ऀ-ॿ]/;
// ponytail: keyword check in English, Hinglish and Hindi. Swap for an LLM classifier if it misroutes real complaints.
const PAYMENT_TOPIC = /pay|upi|fail|money|paisa|paise|refund|debit|deduct|kat |kat gaya|transaction|txn|₹|\brs\.?\s?\d|पेमेंट|भुगतान|पैसा|पैसे|फेल|कट|रिफंड|ट्रांजैक्शन/i;

export function detectLanguage(text: string) {
  return DEVANAGARI.test(text) ? "hi" : "en";
}

/**
 * Links a complaint to an incident using the customer's failed payments in the last hour.
 * A failure that belongs to an open incident wins over a newer unrelated one (e.g. a wrong-PIN failure).
 */
export async function matchComplaintToIncident(userId: string) {
  const since = new Date(Date.now() - 60 * 60_000);
  const open = await db.incident.findMany({
    where: { status: { in: ["OPEN", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
    include: { actions: { where: { kind: "CUSTOMER_MSG", status: "SENT" } } },
  });
  if (open.length) {
    const hit = await db.paymentEvent.findFirst({
      where: { userId, status: "FAILED", createdAt: { gte: since }, OR: open.map((i) => ({ bank: i.bank, errorCode: i.errorCode })) },
      orderBy: { createdAt: "desc" },
    });
    const incident = hit && open.find((i) => i.bank === hit.bank && i.errorCode === hit.errorCode);
    if (hit && incident) return { failed: hit, incident };
  }

  const failed = await db.paymentEvent.findFirst({
    where: { userId, status: "FAILED", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  if (!failed) return { failed: null, incident: null };
  const incident = await db.incident.findFirst({
    where: { bank: failed.bank, errorCode: failed.errorCode, status: { in: ["OPEN", "APPROVED", "RESOLVED"] } },
    orderBy: { createdAt: "desc" },
    include: { actions: { where: { kind: "CUSTOMER_MSG", status: "SENT" } } },
  });
  return { failed, incident };
}

/**
 * Saves the complaint, matches it to an incident and replies on the help chat.
 * Replies only repeat what a human already approved; anything new is escalated.
 */
export async function handleComplaint(input: { userId: string; text: string; channel: Channel; language?: string; audioUrl?: string }) {
  const language = input.language ?? detectLanguage(input.text);
  await db.chatMessage.create({ data: { userId: input.userId, role: "user", text: input.text, language, audioUrl: input.audioUrl } });

  // Only payment complaints can belong to a payment incident; "my KYC is stuck" must not get the outage answer.
  const { failed, incident } = PAYMENT_TOPIC.test(input.text) ? await matchComplaintToIncident(input.userId) : { failed: null, incident: null };
  const complaint = await db.complaint.create({
    data: { userId: input.userId, txnId: failed?.txnId, channel: input.channel, text: input.text, language, audioUrl: input.audioUrl, incidentId: incident?.id, escalatedAt: incident ? null : new Date() },
  });

  let reply: string;
  let escalated = false;
  if (incident && failed) {
    const approved = incident.actions.find((a) => a.language === language) ?? incident.actions[0];
    const facts = {
      payee: failed.payee,
      amount: rupees(failed.amount),
      bank: failed.bank,
      errorMeaning: ERROR_CODES[failed.errorCode ?? ""] ?? "bank error",
      incidentStatus: incident.status,
      approvedMessage: approved?.draft ?? null,
    };
    reply = (await llmReply(input.text, language, facts)) ?? templateReply(language, facts);
    await log(`Answered ${input.channel === "VOICE" ? "voice" : "chat"} complaint, matched to incident`, incident.id, { complaintId: complaint.id });
  } else {
    escalated = true;
    reply =
      language === "hi"
        ? "धन्यवाद, हमें आपकी शिकायत मिल गई है। हमारी सपोर्ट टीम जल्द ही आपसे संपर्क करेगी।"
        : "Thanks, we've got your message. This looks new, so I've passed it to our support team and they'll reply here shortly.";
    await log("New complaint did not match any incident, escalated to a human", undefined, { complaintId: complaint.id });
  }

  const message = await db.chatMessage.create({
    data: { userId: input.userId, role: "agent", text: reply, language, incidentId: incident?.id },
  });
  return { complaintId: complaint.id, incidentId: incident?.id ?? null, escalated, reply: message };
}

/** A human's reply to escalated complaints. Lands in the customer's help chat and closes their open escalations. */
export async function replyAsHuman(input: { complaintId: string; text: string; by: string }) {
  const complaint = await db.complaint.findUniqueOrThrow({ where: { id: input.complaintId } });
  const message = await db.chatMessage.create({ data: { userId: complaint.userId, role: "human", text: input.text, language: complaint.language } });
  await db.complaint.updateMany({ where: { userId: complaint.userId, escalatedAt: { not: null }, answeredAt: null }, data: { answeredAt: new Date() } });
  await log(`${input.by} replied to an escalated complaint`, undefined, { complaintId: complaint.id }, "HUMAN");
  return message;
}

type Facts = {
  payee: string;
  amount: string;
  bank: string;
  errorMeaning: string;
  incidentStatus: string;
  approvedMessage: string | null;
};

async function llmReply(text: string, language: string, f: Facts) {
  const model = getModel();
  if (!model) return null;
  try {
    const { text: out } = await generateText({
      model,
      system: `You are the help-chat assistant of an Indian payments app. Reply in ${language === "hi" ? "Hindi (Devanagari)" : "the customer's language and style (English or Hinglish)"}, warm and under 50 words.
Only state facts given to you. If approvedMessage is null, only acknowledge that the team found the bank issue and is working on it; do not promise refunds or timelines. If an approved message exists, stay consistent with it. If the incident is RESOLVED, say the bank issue is fixed and they can retry. Never promise anything else.`,
      prompt: `Customer said: "${text}"\nFacts: ${JSON.stringify(f)}`,
      abortSignal: AbortSignal.timeout(20_000),
    });
    // Some models (e.g. older Sarvam ones) include their reasoning in <think> tags.
    return out.replace(/<think>[\s\S]*?<\/think>/g, "").trim() || null;
  } catch {
    return null;
  }
}

function templateReply(language: string, f: Facts) {
  // Until a human approves the alert, only acknowledge. No promises about refunds.
  if (!f.approvedMessage) {
    return language === "hi"
      ? `हमें ${f.bank} में UPI भुगतान से जुड़ी एक समस्या मिली है और हमारी टीम इस पर काम कर रही है। आपका ${f.payee} वाला भुगतान इसी से जुड़ा है। हम जल्द ही यहीं अपडेट देंगे।`
      : `We've spotted a problem at ${f.bank} affecting UPI payments, and your ${f.amount} payment to ${f.payee} is one of them. Our team is on it and will update you here shortly.`;
  }
  const resolved = f.incidentStatus === "RESOLVED";
  if (language === "hi") {
    return resolved
      ? `${f.payee} को ${f.amount} का आपका भुगतान ${f.bank} की एक समस्या की वजह से फेल हुआ था। यह समस्या अब ठीक हो गई है, आप दोबारा भुगतान कर सकते हैं। अगर पैसा कटा था, तो 2 घंटे में वापस आ जाएगा।`
      : `आपका ${f.payee} को ${f.amount} का भुगतान ${f.bank} की अस्थायी समस्या की वजह से फेल हुआ। आपका पैसा सुरक्षित है। अगर कटा है, तो 2 घंटे में अपने आप वापस आ जाएगा।`;
  }
  return resolved
    ? `Your ${f.amount} payment to ${f.payee} failed because of a problem at ${f.bank}. That's fixed now, so you can retry. If money was debited, it comes back within 2 hours.`
    : `Your ${f.amount} payment to ${f.payee} failed because ${f.bank} is having a temporary UPI problem. Your money is safe. If it was debited, it will be returned automatically within 2 hours.`;
}

// Complaint wave during the demo outage: what customers send when their payment fails.
const WAVE_MAX = 50;
const WAVE_PER_TICK = 4;

/**
 * While the demo outage runs, a few affected customers complain on each tick (up to 50 per outage).
 * Some complain twice, which is the repeat-complaint problem the product exists to stop.
 * Each one goes through the same path as a real complaint, so the agent matches and answers it.
 */
export async function simulateComplaintWave() {
  const state = await db.demoState.findUnique({ where: { id: 1 } });
  if (!state?.spikeActive || !state.spikeBank) return 0;
  const incident = await db.incident.findFirst({
    where: { bank: state.spikeBank, errorCode: state.spikeCode, status: { in: ["OPEN", "APPROVED"] } },
  });
  if (!incident) return 0; // wait until the agent has opened the incident

  const since = incident.createdAt;
  const sent = await db.complaint.count({ where: { createdAt: { gte: since }, userId: { not: DEMO_USER_ID } } });
  if (sent >= WAVE_MAX) return 0;

  // Affected customers (the demo user complains live on stage, so leave them out), fewest complaints first.
  const affected = await db.paymentEvent.findMany({
    where: { bank: state.spikeBank, errorCode: state.spikeCode, status: "FAILED", userId: { not: DEMO_USER_ID } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const counts = await db.complaint.groupBy({ by: ["userId"], where: { createdAt: { gte: since } }, _count: true });
  const countOf = (id: string) => counts.find((c) => c.userId === id)?._count ?? 0;
  const pickable = affected.map((a) => a.userId).filter((id) => countOf(id) < 2);
  pickable.sort((a, b) => countOf(a) - countOf(b) || (a < b ? -1 : 1));

  const batch = pickable.slice(0, Math.min(WAVE_PER_TICK, WAVE_MAX - sent));
  // What people say depends on what broke (failed payments vs missing refunds).
  const texts = (scenarioFor(state.spikeBank, state.spikeCode) ?? DEFAULT_SCENARIO).complaints;
  await Promise.all(
    batch.map((userId, i) => {
      const t = texts[(sent + i) % texts.length];
      return handleComplaint({ userId, text: t.text, channel: t.channel });
    }),
  );
  return batch.length;
}
