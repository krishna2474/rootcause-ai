import type { CustomerData } from "@/lib/queries";

export type Tab = "home" | "history" | "help";
export type Txn = CustomerData["events"][number];
export type Notice = CustomerData["notifications"][number];
export type ChatMsg = CustomerData["messages"][number];
