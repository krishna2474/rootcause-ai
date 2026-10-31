import { NextResponse, type NextRequest } from "next/server";
import { DemoError, applyFix, fireSpike, resetDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ACTIONS = { reset: resetDemo, spike: fireSpike, fix: applyFix } as const;

export async function POST(req: NextRequest) {
  const { action, scenario } = (await req.json()) as { action: keyof typeof ACTIONS; scenario?: string };
  const run = ACTIONS[action];
  if (!run) return NextResponse.json({ error: "action must be reset, spike or fix" }, { status: 400 });
  try {
    if (action === "spike") await fireSpike(scenario);
    else await run();
  } catch (err) {
    if (err instanceof DemoError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
  return NextResponse.json({ ok: true });
}
