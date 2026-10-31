import "dotenv/config";
import { db } from "../src/lib/db";
import { applyFix, fireSpike } from "../src/lib/demo";

// pnpm simulate [hdfc-upi|sbi-upi|icici-refund] → start that issue (default hdfc-upi)
// pnpm simulate fix    → the bank deploys its fix
const arg = process.argv[2];
(arg === "fix" ? applyFix() : fireSpike(arg))
  .then(() => console.log(process.argv[2] === "fix" ? "Fix deployed." : "Outage started. Switch the agent on in /dashboard."))
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
