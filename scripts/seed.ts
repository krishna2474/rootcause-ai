import "dotenv/config";
import { db } from "../src/lib/db";
import { resetDemo } from "../src/lib/demo";

resetDemo()
  .then(() => console.log("Seeded: 40 customers, 60 minutes of normal traffic."))
  .finally(() => db.$disconnect());
