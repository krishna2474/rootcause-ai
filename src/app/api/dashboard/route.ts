import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";
// Same limit on every API route so Vercel bundles them into one function, which keeps the embedded database shared.
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json(await getDashboard());
}
