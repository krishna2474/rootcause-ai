import { db, isEmbeddedDb } from "./db";
import { llmInfo } from "./llm";
import { sarvamEnabled } from "./sarvam";
import { SPIKE_BANK, resetDemo } from "./demo";
import { scenarioFor } from "./scenarios";

// Read models for the two screens. Response shapes are exported for the UI.

let seeding: Promise<void> | null = null;

/** The embedded database starts empty on every cold start; seed it once so the screens have data. */
async function ensureSeeded() {
  if (!isEmbeddedDb) return;
  seeding ??= db.demoState
    .findUnique({ where: { id: 1 } })
    .then((s) => (s ? undefined : resetDemo()))
    .catch((err) => {
      seeding = null; // let the next request retry
      throw err;
    });
  await seeding;
}

export async function getDashboard() {
  await ensureSeeded();
  const since10 = new Date(Date.now() - 10 * 60_000);
  const [events, incidents, audit, total10, failed10, complaints10, autoAnswered, state, escalations, recentChat] = await Promise.all([
    db.paymentEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { user: { select: { name: true } } } }),
    db.incident.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { actions: { orderBy: [{ kind: "asc" }, { language: "asc" }] }, postmortem: true, _count: { select: { complaints: true } } },
    }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    db.paymentEvent.count({ where: { createdAt: { gte: since10 } } }),
    db.paymentEvent.count({ where: { createdAt: { gte: since10 }, status: "FAILED" } }),
    db.complaint.count({ where: { createdAt: { gte: since10 } } }),
    db.chatMessage.count({ where: { role: "agent", incidentId: { not: null } } }),
    db.demoState.findUnique({ where: { id: 1 } }),
    db.complaint.findMany({
      where: { escalatedAt: { not: null }, answeredAt: null },
      orderBy: { createdAt: "asc" },
      take: 10,
      include: { user: { select: { name: true } } },
    }),
    db.chatMessage.findMany({ orderBy: { createdAt: "desc" }, take: 80, include: { user: { select: { name: true } } } }),
  ]);

  // The agent's instant replies, each paired with the customer message it answered (newest first).
  const autoReplies = recentChat
    .flatMap((m, i) => {
      if (m.role !== "agent" || !m.incidentId) return [];
      const q = recentChat.slice(i + 1).find((x) => x.userId === m.userId && x.role === "user");
      return [{ id: m.id, customer: m.user.name, question: q?.text ?? null, voice: Boolean(q?.audioUrl), reply: m.text, language: m.language, createdAt: m.createdAt.toISOString() }];
    })
    .slice(0, 12);

  const focus = incidents[0];
  const [chart, outageStarts] = await Promise.all([
    failureChart(focus?.bank ?? state?.spikeBank ?? SPIKE_BANK),
    // When the outage began: the first failure with this bank + error code in the 30 min before detection.
    Promise.all(
      incidents.map((i) =>
        db.paymentEvent.findFirst({
          where: { bank: i.bank, errorCode: i.errorCode ?? undefined, status: "FAILED", createdAt: { gte: new Date(i.createdAt.getTime() - 30 * 60_000), lte: i.createdAt } },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        }),
      ),
    ),
  ]);
  const llm = llmInfo();

  return {
    now: new Date().toISOString(),
    stats: {
      paymentsLast10m: total10,
      failureRateLast10m: total10 ? failed10 / total10 : 0,
      complaintsLast10m: complaints10,
      openIncidents: incidents.filter((i) => i.status !== "RESOLVED").length,
      autoAnswered,
    },
    events: events.map((e) => ({
      id: e.id,
      txnId: e.txnId,
      customer: e.user.name,
      type: e.type,
      bank: e.bank,
      payee: e.payee,
      amount: e.amount,
      status: e.status,
      errorCode: e.errorCode,
      createdAt: e.createdAt.toISOString(),
    })),
    incidents: incidents.map((i, k) => ({
      id: i.id,
      title: i.title,
      rootCause: i.rootCause,
      bank: i.bank,
      errorCode: i.errorCode,
      evidence: i.evidence as { points: string[]; failedTxns: number; sampleTxnIds: string[]; complaints: number; otherBanksFailureRate: number },
      confidence: i.confidence,
      impactedUsers: i.impactedUsers,
      moneyStuck: i.moneyStuck,
      status: i.status,
      complaints: i._count.complaints,
      createdAt: i.createdAt.toISOString(),
      outageStartedAt: outageStarts[k]?.createdAt.toISOString() ?? null,
      approvedAt: i.approvedAt?.toISOString() ?? null,
      fixedAt: i.fixedAt?.toISOString() ?? null,
      resolvedAt: i.resolvedAt?.toISOString() ?? null,
      actions: i.actions.map((a) => ({
        id: a.id,
        kind: a.kind,
        title: a.title,
        draft: a.draft,
        language: a.language,
        status: a.status,
        approvedBy: a.approvedBy,
        sentAt: a.sentAt?.toISOString() ?? null,
      })),
      postmortem: i.postmortem
        ? {
            cause: i.postmortem.cause,
            impact: i.postmortem.impact,
            preventionRule: i.postmortem.preventionRule,
            timeline: i.postmortem.timeline as { at: string; actor: string; event: string }[],
          }
        : null,
    })),
    escalations: escalations.map((c) => ({
      id: c.id,
      customer: c.user.name,
      text: c.text,
      language: c.language,
      channel: c.channel,
      createdAt: c.createdAt.toISOString(),
    })),
    autoReplies,
    audit: audit.map((a) => ({ id: a.id, actor: a.actor, action: a.action, incidentId: a.incidentId, createdAt: a.createdAt.toISOString() })),
    chart,
    demo: { scenario: scenarioFor(state?.spikeBank, state?.spikeCode)?.id ?? null, spikeActive: state?.spikeActive ?? false, fixedAt: state?.fixedAt?.toISOString() ?? null, seeded: Boolean(state) },
    config: { llm: llm.configured ? `${llm.provider} · ${llm.model}` : null, sarvam: sarvamEnabled() },
  };
}

/** Per-minute failure rate for one bank over the last 20 minutes, plus complaints per minute. */
async function failureChart(bank: string) {
  const start = new Date(Math.floor((Date.now() - 19 * 60_000) / 60_000) * 60_000);
  const [events, complaints] = await Promise.all([
    db.paymentEvent.findMany({ where: { bank, createdAt: { gte: start } }, select: { status: true, createdAt: true } }),
    db.complaint.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
  ]);
  const buckets = Array.from({ length: 20 }, (_, i) => ({ t: new Date(start.getTime() + i * 60_000).toISOString(), total: 0, failed: 0, complaints: 0, failureRate: 0 }));
  const idx = (d: Date) => Math.min(19, Math.floor((d.getTime() - start.getTime()) / 60_000));
  for (const e of events) {
    const b = buckets[idx(e.createdAt)];
    b.total++;
    if (e.status === "FAILED") b.failed++;
  }
  for (const c of complaints) buckets[idx(c.createdAt)].complaints++;
  for (const b of buckets) b.failureRate = b.total ? Math.round((b.failed / b.total) * 1000) / 10 : 0;
  return { bank, points: buckets };
}

export async function getCustomer(userId: string) {
  await ensureSeeded();
  const [user, events, notifications, messages] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.paymentEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 15 }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, include: { incident: { select: { bank: true, errorCode: true, status: true, fixedAt: true } } } }),
    db.chatMessage.findMany({ where: { userId }, orderBy: { createdAt: "asc" }, take: 50 }),
  ]);
  if (!user) return null;
  // Both language versions of each alert, so the app can switch language without a new notification.
  const incidentIds = [...new Set(notifications.flatMap((n) => (n.incidentId ? [n.incidentId] : [])))];
  const drafts = incidentIds.length ? await db.action.findMany({ where: { incidentId: { in: incidentIds }, kind: { in: ["CUSTOMER_MSG", "CUSTOMER_RESOLVED"] } } }) : [];
  const variantsOf = (incidentId: string | null, notifKind: string) => {
    const draftKind = notifKind === "RESOLVED" ? "CUSTOMER_RESOLVED" : "CUSTOMER_MSG";
    const out: Partial<Record<"en" | "hi", { title: string; message: string }>> = {};
    for (const a of drafts) if (a.incidentId === incidentId && a.kind === draftKind && (a.language === "en" || a.language === "hi")) out[a.language] = { title: a.title, message: a.draft };
    return out;
  };
  return {
    user: { id: user.id, name: user.name, phone: user.phone, language: user.language, balance: user.balance },
    events: events.map((e) => ({
      id: e.id,
      txnId: e.txnId,
      type: e.type,
      bank: e.bank,
      payee: e.payee,
      amount: e.amount,
      status: e.status,
      errorCode: e.errorCode,
      createdAt: e.createdAt.toISOString(),
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      language: n.language,
      incidentId: n.incidentId,
      bank: n.incident?.bank ?? null,
      variants: variantsOf(n.incidentId, n.kind),
      kind: n.kind === "RESOLVED" ? ("RESOLVED" as const) : ("ALERT" as const),
      // Stops warning customers once the bank's fix is live or the incident is resolved.
      // A refunds outage doesn't block new payments, so its alert has no place on the pay screens.
      affectsPayments: (scenarioFor(n.incident?.bank, n.incident?.errorCode)?.type ?? "UPI") === "UPI",
      active: n.kind === "RESOLVED" || !n.incident || (n.incident.status !== "RESOLVED" && !n.incident.fixedAt),
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    messages: messages.map((m) => ({ id: m.id, role: m.role as "user" | "agent" | "human", text: m.text, language: m.language, createdAt: m.createdAt.toISOString() })),
    config: { sarvam: sarvamEnabled() },
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
export type CustomerData = NonNullable<Awaited<ReturnType<typeof getCustomer>>>;
