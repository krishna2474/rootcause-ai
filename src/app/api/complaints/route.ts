import { NextResponse, type NextRequest } from "next/server";
import { handleComplaint } from "@/agent/complaints";
import { DEMO_USER_ID } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { userId?: string; text: string; channel?: "CHAT" | "VOICE"; language?: string };
  if (!body.text?.trim()) return NextResponse.json({ error: "Message is empty" }, { status: 400 });
  const result = await handleComplaint({
    userId: body.userId ?? DEMO_USER_ID,
    text: body.text.trim(),
    channel: body.channel ?? "CHAT",
    language: body.language,
  });
  return NextResponse.json(result);
}
