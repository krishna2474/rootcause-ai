import { db } from "../src/lib/db";
import { applyFix, fireSpike, resetDemo } from "../src/lib/demo";
import { tick } from "../src/agent/run";
import { getDashboard } from "../src/lib/queries";

// Complaint wave: ~50 complaints during the outage, matched and auto-answered, none after the fix. Resets demo data.
async function main() {
  await resetDemo();
  await fireSpike();
  for (let i = 0; i < 16; i++) await tick();
  const total = await db.complaint.count();
  const matched = await db.complaint.count({ where: { incidentId: { not: null } } });
  const escalated = await db.complaint.count({ where: { escalatedAt: { not: null } } });
  const repeatCustomers = (await db.complaint.groupBy({ by: ["userId"], _count: true })).filter((g) => g._count > 1).length;
  const voice = await db.complaint.count({ where: { channel: "VOICE" } });
  console.log({ total, matched, escalated, repeatCustomers, voice, autoAnswered: (await getDashboard()).stats.autoAnswered });
  await applyFix();
  await tick();
  console.log("after fix:", { total: await db.complaint.count(), status: (await getDashboard()).incidents[0].status });
}
main()
  .finally(() => db.$disconnect())
  .then(() => process.exit(0));
