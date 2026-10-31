import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = { title: "Ops console · RootCause AI" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ embed?: string }> }) {
  const { embed } = await searchParams;
  // Only shown inside the stage view at "/"; a direct visit goes there.
  if (embed !== "1") redirect("/");
  return <Dashboard embed />;
}
