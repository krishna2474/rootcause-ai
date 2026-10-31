import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerApp } from "@/components/customer/CustomerApp";

export const metadata: Metadata = { title: "Paytm" };

// Only shown inside the stage view's phone at "/" (`?embed=1`); a direct visit goes there.
export default async function AppPage({ searchParams }: { searchParams: Promise<{ embed?: string }> }) {
  const { embed } = await searchParams;
  if (embed !== "1") redirect("/");
  return <CustomerApp embed />;
}
