import { NextResponse, type NextRequest } from "next/server";
import { DEMO_USER_ID } from "@/lib/demo";
import { getCustomer } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const data = await getCustomer(req.nextUrl.searchParams.get("userId") ?? DEMO_USER_ID);
  if (!data) return NextResponse.json({ error: "Customer not found. Reset the demo from the dashboard." }, { status: 404 });
  return NextResponse.json(data);
}
