import { NextResponse, type NextRequest } from "next/server";
import { replyAsHuman } from "@/agent/complaints";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Ops replies to a complaint the agent escalated. The reply shows up in the customer's help chat as "Support team".
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { text?: string; by?: string };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "Reply is empty" }, { status: 400 });
  if (text.length > 1000) return NextResponse.json({ error: "Reply is too long (max 1000 characters)" }, { status: 400 });
  const message = await replyAsHuman({ complaintId: id, text, by: body.by?.trim() || "Ops on duty" });
  return NextResponse.json({ message });
}
