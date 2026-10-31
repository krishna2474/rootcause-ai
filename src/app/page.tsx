import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-5 py-12">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-sky">Track 3 · Autonomous AI Teammates</span>
        <h1 className="text-4xl font-extrabold tracking-tight text-navy">RootCause AI</h1>
        <p className="text-lg text-ink-2">
          Catches payment failures before customers complain, tells them the truth in their own language, fixes it with human
          approval, and proves it worked.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/demo", title: "Stage view", body: "Dashboard and phone side by side" },
          { href: "/dashboard", title: "Ops dashboard", body: "Incidents, approvals, live feed" },
          { href: "/app", title: "Customer app", body: "Open on a phone" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="rounded-2xl border border-line bg-card p-4 transition hover:border-sky hover:shadow-sm focus-visible:outline-2 focus-visible:outline-sky">
            <div className="font-semibold text-navy">{l.title}</div>
            <div className="text-sm text-ink-2">{l.body}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
