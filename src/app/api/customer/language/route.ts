import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The customer picks the app language; later alerts and chat replies follow it.
export async function POST(req: NextRequest) {
  const { userId, language } = (await req.json().catch(() => ({}))) as { userId?: string; language?: string };
  if (language !== "en" && language !== "hi") return NextResponse.json({ error: "language must be en or hi" }, { status: 400 });
  await db.user.updateMany({ where: { id: userId ?? DEMO_USER_ID }, data: { language } });
  return NextResponse.json({ ok: true });
}
