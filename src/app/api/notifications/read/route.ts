import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };
  await db.notification.updateMany({ where: { userId: userId ?? DEMO_USER_ID, readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
