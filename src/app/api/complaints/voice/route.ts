import { NextResponse, type NextRequest } from "next/server";
import { handleComplaint } from "@/agent/complaints";
import { DEMO_USER_ID } from "@/lib/demo";
import { sarvamEnabled, speechToText } from "@/lib/sarvam";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Voice note → Sarvam speech-to-text → same complaint flow as chat.
export async function POST(req: NextRequest) {
  if (!sarvamEnabled()) {
    return NextResponse.json({ error: "Voice needs SARVAM_API_KEY. Type your message instead." }, { status: 503 });
  }
  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob)) return NextResponse.json({ error: "No audio received" }, { status: 400 });
  const stt = await speechToText(audio, (audio as File).name || "note.webm");
  if (!stt?.text) return NextResponse.json({ error: "Couldn't understand the recording. Try again or type." }, { status: 422 });
  const result = await handleComplaint({
    userId: (form.get("userId") as string) || DEMO_USER_ID,
    text: stt.text,
    channel: "VOICE",
    language: stt.language === "hi" ? "hi" : undefined,
  });
  return NextResponse.json({ transcript: stt.text, ...result });
}
