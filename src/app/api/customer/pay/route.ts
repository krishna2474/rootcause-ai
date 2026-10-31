import { NextResponse, type NextRequest } from "next/server";
import { DEMO_USER_ID, submitPayment } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => ({}))) as { userId?: string; bank?: string; amount?: number; payee?: string };
  if (!b.bank || !b.payee || !Number.isInteger(b.amount) || (b.amount as number) <= 0) {
    return NextResponse.json({ error: "bank, payee and amount (paise) are required" }, { status: 400 });
  }
  return NextResponse.json(await submitPayment({ userId: b.userId ?? DEMO_USER_ID, bank: b.bank, amount: b.amount as number, payee: b.payee }));
}
