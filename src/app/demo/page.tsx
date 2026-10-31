import { StagePhone } from "@/components/customer/StagePhone";

// Stage view for the pitch: ops dashboard and the customer's phone side by side on one screen.
export default function DemoStage() {
  return (
    <main className="flex h-dvh gap-5 bg-navy p-4 lg:p-5">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-page shadow-2xl">
        <iframe src="/dashboard?embed=1" title="Ops dashboard" className="h-full w-full border-0" />
      </section>
      <aside className="hidden shrink-0 flex-col items-center justify-center gap-3 md:flex">
        <span className="text-xs font-semibold uppercase tracking-widest text-sky">Customer&apos;s phone</span>
        <StagePhone />
      </aside>
    </main>
  );
}
