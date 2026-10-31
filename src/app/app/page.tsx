import type { Metadata } from "next";
import { CustomerApp } from "@/components/customer/CustomerApp";

export const metadata: Metadata = { title: "Paytm" };

// `?embed=1` is used by the stage view's iframe: full-bleed, no phone frame.
export default async function AppPage({ searchParams }: { searchParams: Promise<{ embed?: string }> }) {
  const { embed } = await searchParams;
  return <CustomerApp embed={embed === "1"} />;
}
