import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ERROR_CODES } from "@/lib/demo";
import { rupees } from "@/lib/format";

// Deterministic building blocks. The LLM decides which to call (see run.ts); these do the real work.
// Every step writes an AuditLog row so the dashboard can show what the agent is doing.

const WINDOW_MIN = 10;
const BASELINE_MIN = 60;

export async function log(action: string, incidentId?: string, payload?: Prisma.InputJsonValue, actor: "AGENT" | "HUMAN" | "SYSTEM" = "AGENT") {
  await db.auditLog.create({ data: { actor, action, incidentId, payload } });
}

export type Spike = {
  bank: string;
  errorCode: string;
  failures: number;
  total: number;
  failureRate: number;
  baselineRate: number;
  multiplier: number;
  firstSeen: string;
};

/** Finds bank + error code pairs whose failure rate in the last 10 min is far above the hour before. */
export async function detectSpike(): Promise<Spike[]> {
  const now = Date.now();
  const windowStart = new Date(now - WINDOW_MIN * 60_000);
  const baselineStart = new Date(now - (WINDOW_MIN + BASELINE_MIN) * 60_000);

  const [recentTotals, recentFails, baseTotals, baseFails, active] = await Promise.all([
    db.paymentEvent.groupBy({ by: ["bank"], where: { createdAt: { gte: windowStart } }, _count: true }),
    db.paymentEvent.groupBy({
      by: ["bank", "errorCode"],
      where: { createdAt: { gte: windowStart }, status: "FAILED" },
      _count: true,
      _min: { createdAt: true },
    }),
    db.paymentEvent.groupBy({ by: ["bank"], where: { createdAt: { gte: baselineStart, lt: windowStart } }, _count: true }),
    db.paymentEvent.groupBy({ by: ["bank", "errorCode"], where: { createdAt: { gte: baselineStart, lt: windowStart }, status: "FAILED" }, _count: true }),
    // Incidents that are still being handled, or that touched the baseline/window (their failures must not count twice).
    db.incident.findMany({
      where: { OR: [{ status: { in: ["OPEN", "APPROVED"] } }, { fixedAt: { gte: baselineStart } }, { createdAt: { gte: baselineStart } }] },
      select: { bank: true, errorCode: true, status: true, fixedAt: true },
    }),
  ]);

  const count = (rows: { bank: string; _count: number }[], bank: string) => rows.find((r) => r.bank === bank)?._count ?? 0;

  const spikes: Spike[] = [];
  for (const f of recentFails) {
    if (!f.errorCode) continue;
    const same = active.filter((a) => a.bank === f.bank && a.errorCode === f.errorCode);
    // Already handling this cause (including a fix that is still being verified).
    if (same.some((a) => a.status === "OPEN" || a.status === "APPROVED")) continue;

    // Fixed recently: the old outage's failures are still in the window, so only count what happened after the fix.
    // That way the same issue coming back is caught, but the tail of the last one isn't.
    const fixedAt = same.reduce<Date | null>((latest, a) => (a.fixedAt && a.fixedAt > windowStart && (!latest || a.fixedAt > latest) ? a.fixedAt : latest), null);
    let failures = f._count;
    let total = count(recentTotals, f.bank);
    let firstSeen = f._min.createdAt;
    if (fixedAt) {
      const [fails, all, first] = await Promise.all([
        db.paymentEvent.count({ where: { bank: f.bank, errorCode: f.errorCode, status: "FAILED", createdAt: { gt: fixedAt } } }),
        db.paymentEvent.count({ where: { bank: f.bank, createdAt: { gt: fixedAt } } }),
        db.paymentEvent.findFirst({ where: { bank: f.bank, errorCode: f.errorCode, status: "FAILED", createdAt: { gt: fixedAt } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      ]);
      failures = fails;
      total = all;
      firstSeen = first?.createdAt ?? null;
    }
    const failureRate = total ? failures / total : 0;
    // Baseline leaves out failures from causes that already had an incident, or an earlier outage would raise the bar.
    const known = new Set(active.filter((a) => a.bank === f.bank).map((a) => a.errorCode));
    const bTotal = count(baseTotals, f.bank);
    const bFails = baseFails.filter((b) => b.bank === f.bank && !known.has(b.errorCode)).reduce((sum, b) => sum + b._count, 0);
    const baselineRate = bTotal ? bFails / bTotal : 0;
    const floor = Math.max(baselineRate, 0.02);
    if (failures >= 8 && failureRate >= 3 * floor) {
      spikes.push({
        bank: f.bank,
        errorCode: f.errorCode,
        failures,
        total,
        failureRate: round(failureRate),
        baselineRate: round(baselineRate),
        multiplier: Math.round((failureRate / floor) * 10) / 10,
        firstSeen: (firstSeen ?? new Date()).toISOString(),
      });
    }
  }
  return spikes;
}

export async function checkTxnStatus(txnId: string) {
  const e = await db.paymentEvent.findUnique({ where: { txnId }, include: { user: { select: { name: true } } } });
  if (!e) return { found: false as const, txnId };
  return {
    found: true as const,
    txnId: e.txnId,
    customer: e.user.name,
    type: e.type,
    bank: e.bank,
    payee: e.payee,
    amount: rupees(e.amount),
    status: e.status,
    errorCode: e.errorCode,
    errorMeaning: e.errorCode ? ERROR_CODES[e.errorCode] ?? "Unknown" : null,
    at: e.createdAt.toISOString(),
  };
}

export async function searchComplaints(opts: { sinceMinutes?: number; keyword?: string }) {
  const since = new Date(Date.now() - (opts.sinceMinutes ?? 30) * 60_000);
  const rows = await db.complaint.findMany({
    where: {
      createdAt: { gte: since },
      ...(opts.keyword ? { text: { contains: opts.keyword, mode: "insensitive" as const } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true } } },
  });
  return rows.map((c) => ({ id: c.id, customer: c.user.name, text: c.text, channel: c.channel, at: c.createdAt.toISOString() }));
}

/** Groups the failed transactions behind a suspected cause and measures the impact. */
export async function clusterCases(opts: { bank: string; errorCode: string; sinceMinutes?: number }) {
  const since = new Date(Date.now() - (opts.sinceMinutes ?? 15) * 60_000);
  const fails = await db.paymentEvent.findMany({
    where: { bank: opts.bank, errorCode: opts.errorCode, status: "FAILED", createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });
  const otherBanksFailRate = await failureRate({ notBank: opts.bank, since });
  const users = new Set(fails.map((f) => f.userId));
  const complaints = await db.complaint.count({ where: { userId: { in: [...users] }, createdAt: { gte: since } } });
  return {
    bank: opts.bank,
    errorCode: opts.errorCode,
    errorMeaning: ERROR_CODES[opts.errorCode] ?? "Unknown",
    failedTxns: fails.length,
    impactedUsers: users.size,
    moneyStuckPaise: fails.reduce((s, f) => s + f.amount, 0),
    moneyStuck: rupees(fails.reduce((s, f) => s + f.amount, 0)),
    firstFailure: fails[0]?.createdAt.toISOString() ?? null,
    lastFailure: fails.at(-1)?.createdAt.toISOString() ?? null,
    sampleTxnIds: fails.slice(-5).map((f) => f.txnId),
    complaintsFromAffectedUsers: complaints,
    otherBanksFailureRate: otherBanksFailRate,
  };
}

async function failureRate(opts: { bank?: string; notBank?: string; since: Date; until?: Date }) {
  const where: Prisma.PaymentEventWhereInput = {
    createdAt: { gte: opts.since, ...(opts.until ? { lt: opts.until } : {}) },
    ...(opts.bank ? { bank: opts.bank } : {}),
    ...(opts.notBank ? { bank: { not: opts.notBank } } : {}),
  };
  const [total, failed] = await Promise.all([db.paymentEvent.count({ where }), db.paymentEvent.count({ where: { ...where, status: "FAILED" } })]);
  return total ? round(failed / total) : 0;
}

export async function createIncident(input: {
  title: string;
  rootCause: string;
  bank: string;
  errorCode: string;
  confidence: number;
  evidence: string[];
}) {
  const existing = await db.incident.findFirst({
    where: { bank: input.bank, errorCode: input.errorCode, status: { in: ["OPEN", "APPROVED"] } },
  });
  if (existing) return { incidentId: existing.id, alreadyExisted: true };

  const cluster = await clusterCases({ bank: input.bank, errorCode: input.errorCode });
  // A slow investigation can finish after the demo was reset; don't open an empty incident for data that's gone.
  if (cluster.failedTxns === 0) throw new Error("No failed transactions match this spike any more, so no incident was opened.");
  const incident = await db.incident.create({
    data: {
      title: input.title,
      rootCause: input.rootCause,
      bank: input.bank,
      errorCode: input.errorCode,
      confidence: Math.min(0.99, Math.max(0, input.confidence)),
      evidence: {
        points: input.evidence,
        failedTxns: cluster.failedTxns,
        firstFailure: cluster.firstFailure,
        sampleTxnIds: cluster.sampleTxnIds,
        otherBanksFailureRate: cluster.otherBanksFailureRate,
        complaints: cluster.complaintsFromAffectedUsers,
      },
      impactedUsers: cluster.impactedUsers,
      moneyStuck: cluster.moneyStuckPaise,
    },
  });
  // Link complaints already received from affected customers.
  const affected = await affectedUserIds(incident.id);
  await db.complaint.updateMany({
    where: { userId: { in: affected }, incidentId: null, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } },
    data: { incidentId: incident.id },
  });
  await log(`Created incident: ${input.title}`, incident.id, { confidence: input.confidence });
  return { incidentId: incident.id, alreadyExisted: false };
}

export async function draftOpsTicket(input: { incidentId: string; title: string; body: string }) {
  const a = await db.action.create({
    data: { incidentId: input.incidentId, kind: "OPS_TICKET", title: input.title, draft: input.body },
  });
  await log("Drafted ops ticket, waiting for approval", input.incidentId);
  return { actionId: a.id, status: "DRAFT" };
}

/** One draft per language. Customers get the version in their own language once approved. */
export async function draftCustomerMsg(input: { incidentId: string; title: string; titleHi?: string; messageEn: string; messageHi: string }) {
  const rows = await db.$transaction([
    db.action.create({ data: { incidentId: input.incidentId, kind: "CUSTOMER_MSG", title: input.title, draft: input.messageEn, language: "en" } }),
    db.action.create({ data: { incidentId: input.incidentId, kind: "CUSTOMER_MSG", title: input.titleHi ?? input.title, draft: input.messageHi, language: "hi" } }),
  ]);
  await log("Drafted customer alert in English and Hindi, waiting for approval", input.incidentId);
  return { actionIds: rows.map((r) => r.id), status: "DRAFT" };
}

/** Plain wording for the all-clear, used when no LLM is configured or it fails. */
export function allClearTemplate(bank: string, noun = "UPI payments", nounHi = "UPI भुगतान") {
  return {
    title: `${bank} ${noun} are working again`,
    titleHi: `${bank} के ${nounHi} फिर से चालू हैं`,
    messageEn: `Good news: ${bank} ${noun} are back to normal. Any money affected during the issue will reach your account automatically, you don't need to do anything.`,
    messageHi: `अच्छी खबर: ${bank} के ${nounHi} सामान्य हो गए हैं। समस्या के दौरान प्रभावित कोई भी राशि अपने आप आपके खाते में आ जाएगी, आपको कुछ करने की ज़रूरत नहीं है।`,
  };
}

export const ERROR_MEANING = (code: string) => ERROR_CODES[code] ?? "unknown error";

/** The all-clear: drafted once the fix is verified, and sent only after a human approves it. */
export async function draftResolvedMsg(input: { incidentId: string; title: string; titleHi: string; messageEn: string; messageHi: string }) {
  const rows = await db.$transaction([
    db.action.create({ data: { incidentId: input.incidentId, kind: "CUSTOMER_RESOLVED", title: input.title, draft: input.messageEn, language: "en" } }),
    db.action.create({ data: { incidentId: input.incidentId, kind: "CUSTOMER_RESOLVED", title: input.titleHi, draft: input.messageHi, language: "hi" } }),
  ]);
  await log("Drafted the all-clear notice for customers in English and Hindi, waiting for approval", input.incidentId);
  return { actionIds: rows.map((r) => r.id), status: "DRAFT" };
}

export async function affectedUserIds(incidentId: string) {
  const inc = await db.incident.findUniqueOrThrow({ where: { id: incidentId } });
  const rows = await db.paymentEvent.findMany({
    where: {
      bank: inc.bank,
      errorCode: inc.errorCode,
      status: "FAILED",
      createdAt: { gte: new Date(inc.createdAt.getTime() - 20 * 60_000) },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.map((r) => r.userId);
}

/**
 * Human-only. Called from the Approve button, never by the LLM.
 * Customer messages become notifications for every affected user; ops tickets are marked raised.
 */
export async function approveAction(actionId: string, approvedBy: string) {
  const action = await db.action.findUniqueOrThrow({ where: { id: actionId }, include: { incident: true } });
  if (action.status !== "DRAFT") return action;
  const now = new Date();

  if (action.kind === "CUSTOMER_MSG" || action.kind === "CUSTOMER_RESOLVED") {
    const allClear = action.kind === "CUSTOMER_RESOLVED";
    // Approving one language approves the alert; send each user the version in their language.
    const recipientIds = await affectedUserIds(action.incidentId);
    // One transaction: claim the drafts, create the notifications and mark them sent together. A failure part-way
    // rolls everything back, so a draft can never be left "approved" with nobody notified, and a double-click
    // can't send twice (the second claim finds nothing left in DRAFT).
    const recipients = await db.$transaction(async (tx) => {
      const siblings = await tx.action.findMany({ where: { incidentId: action.incidentId, kind: action.kind, status: "DRAFT" } });
      const claimed = await tx.action.updateMany({
        where: { id: { in: siblings.map((x) => x.id) }, status: "DRAFT" },
        data: { status: "APPROVED", approvedBy },
      });
      if (claimed.count === 0) return null;
      const byLang = new Map(siblings.map((x) => [x.language, x]));
      const users = await tx.user.findMany({ where: { id: { in: recipientIds } } });
      await tx.notification.createMany({
        data: users.map((u) => {
          const msg = byLang.get(u.language) ?? action;
          return { userId: u.id, incidentId: action.incidentId, title: msg.title, message: msg.draft, language: msg.language, kind: allClear ? "RESOLVED" : "ALERT" };
        }),
      });
      await tx.action.updateMany({ where: { id: { in: siblings.map((x) => x.id) } }, data: { status: "SENT", approvedBy, sentAt: now } });
      // Don't re-open an incident that was already resolved.
      if (!allClear) await tx.incident.updateMany({ where: { id: action.incidentId, status: "OPEN" }, data: { status: "APPROVED", approvedAt: now } });
      return users.length;
    });
    if (recipients === null) return db.action.findUniqueOrThrow({ where: { id: actionId } });
    await log(`${approvedBy} approved the ${allClear ? "all-clear notice" : "customer alert"}`, action.incidentId, undefined, "HUMAN");
    await log(`Sent the ${allClear ? "all-clear" : "alert"} to ${recipients} affected customers`, action.incidentId, { recipients });
  } else {
    const claimed = await db.action.updateMany({ where: { id: actionId, status: "DRAFT" }, data: { status: "SENT", approvedBy, sentAt: now } });
    if (claimed.count === 0) return db.action.findUniqueOrThrow({ where: { id: actionId } });
    await log(`${approvedBy} approved the ops ticket`, action.incidentId, undefined, "HUMAN");
    await log(`Raised ticket with ${action.incident.bank} UPI ops`, action.incidentId);
  }
  return db.action.findUniqueOrThrow({ where: { id: actionId } });
}

export async function rejectAction(actionId: string, by: string) {
  await db.action.updateMany({ where: { id: actionId, status: "DRAFT" }, data: { status: "REJECTED", approvedBy: by } });
  const action = await db.action.findUniqueOrThrow({ where: { id: actionId } });
  await log(`${by} rejected a draft (${action.kind})`, action.incidentId, undefined, "HUMAN");
  return action;
}

/** Compares the bank's failure rate before and after the fix. Resolves the incident when it has recovered. */
export async function verifyFix(incidentId: string) {
  const inc = await db.incident.findUniqueOrThrow({ where: { id: incidentId } });
  if (!inc.fixedAt) return { verified: false, reason: "Fix not deployed yet" };
  const before = await failureRate({ bank: inc.bank, since: new Date(inc.fixedAt.getTime() - 10 * 60_000), until: inc.fixedAt });
  const afterWhere = { bank: inc.bank, createdAt: { gte: inc.fixedAt } };
  const afterTotal = await db.paymentEvent.count({ where: afterWhere });
  if (afterTotal < 10) return { verified: false, reason: `Waiting for more traffic (${afterTotal}/10 txns since fix)` };
  const after = await failureRate({ bank: inc.bank, since: inc.fixedAt });
  const complaintsAfter = await db.complaint.count({ where: { incidentId, createdAt: { gte: inc.fixedAt } } });
  const recovered = after <= Math.max(0.05, before / 4);
  if (recovered && inc.status !== "RESOLVED") {
    await db.incident.update({ where: { id: incidentId }, data: { status: "RESOLVED", resolvedAt: new Date() } });
    await log(`Verified fix: ${inc.bank} failure rate ${pct(before)} → ${pct(after)}. Incident resolved`, incidentId, { before, after, complaintsAfter });
  }
  return { verified: recovered, before, after, afterTotal, complaintsAfter };
}

/** Keeps open incidents' impact numbers current while the outage is still running (more customers get hit). */
export async function refreshImpact() {
  const open = await db.incident.findMany({ where: { status: { in: ["OPEN", "APPROVED"] }, fixedAt: null } });
  for (const inc of open) {
    const fails = await db.paymentEvent.findMany({
      where: { bank: inc.bank, errorCode: inc.errorCode, status: "FAILED", createdAt: { gte: new Date(inc.createdAt.getTime() - 20 * 60_000) } },
      select: { userId: true, amount: true },
    });
    if (!fails.length) continue;
    const impactedUsers = new Set(fails.map((f) => f.userId)).size;
    const moneyStuck = fails.reduce((sum, f) => sum + f.amount, 0);
    if (impactedUsers === inc.impactedUsers && moneyStuck === inc.moneyStuck) continue;
    await db.incident.update({
      where: { id: inc.id },
      data: { impactedUsers, moneyStuck, evidence: { ...(inc.evidence as Record<string, unknown>), failedTxns: fails.length } },
    });
  }
}

export async function incidentTimeline(incidentId: string) {
  const rows = await db.auditLog.findMany({ where: { incidentId }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ at: r.createdAt.toISOString(), actor: r.actor, event: r.action }));
}

export async function savePostmortem(input: { incidentId: string; cause: string; impact: string; preventionRule: string }) {
  const timeline = await incidentTimeline(input.incidentId);
  const pm = await db.postmortem.upsert({
    where: { incidentId: input.incidentId },
    create: { ...input, timeline },
    update: { cause: input.cause, impact: input.impact, preventionRule: input.preventionRule, timeline },
  });
  await log("Wrote post-mortem and suggested a prevention rule", input.incidentId);
  return pm;
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
