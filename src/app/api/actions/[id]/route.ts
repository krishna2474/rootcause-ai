import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { approveAction, log, rejectAction } from "@/agent/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Human decisions on agent drafts. `draft` lets ops edit the text; decision "save" stores the edit without approving.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json()) as { decision: "approve" | "reject" | "save"; by?: string; draft?: string };
  const by = body.by?.trim() || "Ops on duty";
  if (body.draft) {
    const before = await db.action.findUniqueOrThrow({ where: { id } });
    const edited = before.draft !== body.draft && (await db.action.updateMany({ where: { id, status: "DRAFT" }, data: { draft: body.draft } })).count > 0;
    // Record that a human changed the agent's words, with both versions.
    if (edited) {
      const what = before.kind === "OPS_TICKET" ? "ops ticket" : `customer alert (${before.language === "hi" ? "Hindi" : "English"})`;
      await log(`${by} edited the agent's ${what}`, before.incidentId, { original: before.draft, edited: body.draft }, "HUMAN");
    }
  }
  if (body.decision === "save") return NextResponse.json({ action: await db.action.findUniqueOrThrow({ where: { id } }) });
  const action = body.decision === "reject" ? await rejectAction(id, by) : await approveAction(id, by);
  return NextResponse.json({ action });
}
