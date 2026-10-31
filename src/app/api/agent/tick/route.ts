import { NextResponse } from "next/server";
import { tick } from "@/agent/run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The dashboard calls this every few seconds while the agent is switched on.
export async function POST() {
  try {
    return NextResponse.json(await tick());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
