import { redirect } from "next/navigation";

// The stage view lives at "/" now; keep old /demo links working.
export default function DemoRedirect() {
  redirect("/");
}
