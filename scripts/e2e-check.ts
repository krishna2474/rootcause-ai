import "dotenv/config";
import { db } from "../src/lib/db";
import { resetDemo, fireSpike, applyFix, DEMO_USER_ID } from "../src/lib/demo";
import { tick } from "../src/agent/run";
import { approveAction } from "../src/agent/tools";
import { handleComplaint, replyAsHuman } from "../src/agent/complaints";
import { getDashboard, getCustomer } from "../src/lib/queries";

// Runs the full demo story without the UI. `pnpm tsx scripts/e2e-check.ts`
async function main() {
  await resetDemo();
  // A complaint with no matching incident goes to a human, and the human's reply lands in the customer's chat.
  const calm = await db.user.findFirstOrThrow({ where: { events: { none: { status: "FAILED", createdAt: { gte: new Date(Date.now() - 60 * 60_000) } } } } });
  const esc = await handleComplaint({ userId: calm.id, text: "My KYC verification is stuck", channel: "CHAT" });
  console.log("unknown issue escalated:", esc.escalated, "| queue:", (await getDashboard()).escalations.length, "(expect true | 1)");
  await replyAsHuman({ complaintId: esc.complaintId, text: "Hi, your KYC is approved now.", by: "Ritesh" });
  console.log("after human reply, queue:", (await getDashboard()).escalations.length, "| chat roles:", (await getCustomer(calm.id))?.messages.map((m) => m.role).join(","), "(expect 0 | user,agent,human)");
  console.log("tick (normal):", await tick());
  await fireSpike();
  console.log("tick (spike):", await tick());
  let d = await getDashboard();
  const inc = d.incidents[0];
  console.log("incident:", inc?.title, inc?.confidence, inc?.impactedUsers, inc?.moneyStuck, inc?.actions.map((a) => `${a.kind}/${a.language}/${a.status}`));
  console.log("pre-approval complaint:", (await handleComplaint({ userId: DEMO_USER_ID, text: "mera payment fail ho gaya", channel: "CHAT" })).reply.text);
  // Double-clicks and both language cards at once must still send only one alert per customer.
  await Promise.all(inc.actions.flatMap((a) => [approveAction(a.id, "Ritesh"), approveAction(a.id, "Ritesh")]));
  console.log("notifications total:", await db.notification.count(), "(expect one per affected customer)");
  const c = await getCustomer(DEMO_USER_ID);
  console.log("customer notifications:", c?.notifications.map((n) => `${n.language}: ${n.message.slice(0, 50)}`));
  console.log("hindi complaint:", (await handleComplaint({ userId: DEMO_USER_ID, text: "मेरा पेमेंट फेल हो गया लेकिन पैसे कट गए", channel: "VOICE" })).reply.text);
  await applyFix();
  console.log("tick (fixed):", await tick());
  await tick();
  d = await getDashboard();
  console.log("incidents after extra tick:", d.incidents.map((i) => i.status), "(expect one RESOLVED, no new OPEN)");
  console.log("status:", d.incidents[0].status, "postmortem:", d.incidents[0].postmortem?.preventionRule.slice(0, 80));
  console.log("stats:", d.stats);
  console.log("audit:", d.audit.slice(0, 18).reverse().map((a) => `${a.actor}: ${a.action}`).join("\n  "));
  console.log("chart tail:", d.chart.points.slice(-4));
}
// Explicit exit: the embedded PGlite socket server would otherwise keep the process alive.
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
