# RootCause AI

Built for Paytm's Build for India AI challenge, **Track 3: Autonomous AI Teammates** ("Build AI teammates that don't just respond; they get the job done").
Pitch: *"RootCause AI catches payment issues before customers complain, tells them the truth in their own language, fixes it with human approval, and proves it worked."*

The team are Node/TypeScript developers (Next.js, NestJS, React). **No Python.** Keep everything in TypeScript.
Unknown until the event: which credits we get (Sarvam AI and/or Paytm Inference likely, but not confirmed). The format may be an 8-hour offline sprint, so scope stays narrow.

## Product flow

1. **Watch**: the agent monitors live payment events (UPI, refunds, settlements).
2. **Detect**: it spots a spike, e.g. "UPI failures up 5x on HDFC since 2:10 PM, same error code".
3. **Diagnose**: it checks logs and recent complaints and creates an **incident card** with evidence, impacted users, money stuck and a confidence score.
4. **Act, with human approval**: it drafts an ops ticket and a customer warning in their language. Ops clicks **Approve** and the agent sends both. Nothing goes out without approval.
5. **Handle incoming complaints**: chat or Hindi voice note → Sarvam STT → match to the open incident → reply instantly with the real reason and an ETA. Unknown issues escalate to a human.
6. **Verify**: track complaints and failures after the fix. When they drop, mark the incident Resolved and show a before/after graph.
7. **Learn** ("one more thing" in the demo): the agent writes a post-mortem (timeline, cause, impact) and suggests a prevention rule.

## Two screens, one Next.js app

| Route | Who | What |
|---|---|---|
| `/dashboard` | Ops team (laptop) | Live event/complaint feed, incident cards with evidence + confidence, **Approve** button, before/after chart, audit log, post-mortem |
| `/app` | Customer (phone-sized, Paytm-style UI) | Transaction history, failed payment, push-style alert ("Money is safe, refund in 2 hrs"), help chat with text or Hindi voice note, instant agent reply |

The customer side is a **mobile-sized web page** (shown in a phone frame or opened on a real phone), **not** a native app. No React Native or Expo. The demo's wow moment: ops clicks Approve and the customer's phone updates within a second through Supabase Realtime.

## Architecture

Visual version for the team: `docs/architecture.html` (published at https://claude.ai/artifact/V6jzfnpsDWtXetYccNaXGz). Keep it in sync when the architecture changes.

```
                    ┌──────────────────── Vercel (Next.js, TypeScript) ────────────────────┐
                    │                                                                      │
 📱 /app ───────────┤  UI: React + Tailwind + shadcn/ui + Recharts                          │
 (customer, phone)  │                                                                      │
 💻 /dashboard ─────┤  API routes (/api/*)                                                 │
 (ops, laptop)      │    ├── /api/events      ← simulator pushes mock payment events       │
                    │    ├── /api/complaints  ← chat text / voice note from /app           │
                    │    ├── /api/incidents   ← list, approve, resolve                     │
                    │    └── /api/agent       ← runs the agent loop                        │
                    │                                                                      │
                    │  Agent brain: Vercel AI SDK (tool-calling loop)                      │
                    │    tools → watchEvents, detectSpike, checkTxnStatus, searchComplaints,│
                    │            clusterCases, createIncident, draftOpsTicket,             │
                    │            draftCustomerMsg, sendAfterApproval,                      │
                    │            matchComplaintToIncident, verifyFix, writePostmortem      │
                    │                                                                      │
                    │  lib/llm.ts    → swappable LLM (LLM_PROVIDER env)                    │
                    │  lib/sarvam.ts → speech-to-text, translate, text-to-speech           │
                    │  lib/db.ts     → Prisma client                                       │
                    └──────┬──────────────────────┬──────────────────────┬─────────────────┘
                           │                      │                      │
                           ▼                      ▼                      ▼
              ┌─────────────────────┐  ┌────────────────────┐  ┌──────────────────────────┐
              │  LLM provider       │  │  Sarvam AI         │  │  Supabase                │
              │  Paytm Inference /  │  │  STT · Translate · │  │  Postgres (via Prisma)   │
              │  Sarvam / any       │  │  TTS (Hindi + more)│  │  Realtime → live UI      │
              │  OpenAI-compatible  │  │                    │  │  Storage → voice notes   │
              └─────────────────────┘  └────────────────────┘  └──────────────────────────┘

 Mock data: scripts/seed.ts (baseline data) + scripts/simulate.ts (fires a failure spike during the demo)
```

**How the pieces relate**
- **LLM** = the thinker. It reads context and decides the next step. On its own it can only produce text.
- **Agent brain (Vercel AI SDK)** = the manager around the LLM. It hands the LLM the tools, executes the tool the LLM picks, feeds the result back, and loops until done. The AI SDK is an open-source npm package (`ai`) and has nothing to do with Vercel hosting.
- **Prisma** = how our code reads and writes Postgres in type-safe TypeScript.
- **Supabase Realtime** = pushes DB row changes to both screens, so there's no refresh and no polling code (polling every 2s is the fallback).

## Data model (first draft)

- `PaymentEvent`: id, txnId, userId, type (UPI/REFUND/SETTLEMENT), bank, amount, status, errorCode, createdAt
- `Complaint`: id, userId, txnId?, channel (CHAT/VOICE), text, language, audioUrl?, incidentId?, createdAt
- `Incident`: id, title, rootCause, evidence (json), confidence, impactedUsers, moneyStuck, status (OPEN/APPROVED/RESOLVED), createdAt, resolvedAt
- `Action`: id, incidentId, kind (OPS_TICKET/CUSTOMER_MSG/AUTO_REPLY), draft, status (DRAFT/APPROVED/SENT), approvedBy, createdAt
- `Notification`: id, userId, incidentId, message, language, readAt
- `AuditLog`: id, actor (AGENT/HUMAN), action, payload, createdAt
- `Postmortem`: id, incidentId, timeline, cause, impact, preventionRule

## Tech stack

| Layer | Choice | Why | Alternatives |
|---|---|---|---|
| App (UI + API) | Next.js (App Router) + TypeScript | UI and API in one app, and the team already knows it | NestJS backend + Vite React |
| Agent brain | Vercel AI SDK (`ai`) | Simple tool calling, works with many providers, TS-first | OpenAI SDK direct, LangChain.js, Mastra |
| LLM provider | Swappable via `lib/llm.ts` + `LLM_PROVIDER` env | Credits on the day are unknown | Groq, Gemini, Claude |
| Voice + Indian languages | Sarvam AI REST APIs | Built for Hindi and Indian languages | Bhashini, Google STT, Web Speech API |
| Database | Supabase Postgres + Prisma | Cloud Postgres with built-in Realtime + Storage | Neon (pure Postgres), Drizzle ORM |
| Live updates | Supabase Realtime (fallback: polling) | Approve → phone updates instantly | SSE, Socket.io |
| File storage | Supabase Storage | Voice notes | — |
| UI | Tailwind v4 + lucide icons, Paytm-inspired tokens in `globals.css` (navy #002E6E, sky #00BAF2, no Paytm logo) | Fast, familiar to Paytm judges | shadcn/ui, Mantine |
| Charts | Recharts | Before/after graph | Chart.js, Tremor |
| Data | Seeded mock events + complaints | No real data; controlled demo | Paytm sandbox if offered |
| Hosting | App on Vercel, DB on Supabase | Free, one-click | Netlify |

## Demo script (2 min)

1. Show `/app`: a normal Paytm-style home with transactions.
2. Run `simulate.ts` to fire a UPI failure spike on one bank. Events start streaming into `/dashboard`.
3. The agent detects the spike and creates an incident card with evidence and a confidence score.
4. The agent drafts an ops ticket and a Hindi customer alert → the judge clicks **Approve** → the phone shows the alert instantly.
5. A customer sends a Hindi voice note: "मेरा पेमेंट फेल हो गया". The agent replies instantly with the real reason and an ETA.
6. Mark the fix as applied. The complaints graph drops and the incident is Resolved.
7. One more thing: the auto-generated post-mortem and prevention rule.

## Rules

- All LLM calls go through `lib/llm.ts`. Never hardcode a provider.
- Every outbound action needs human approval and is written to `AuditLog`.
- Mock data only. Mask PII (phone numbers, account numbers) in the UI.
- Optimise for an 8-hour build and a 2-minute demo. If a feature isn't in the demo script, skip it.

## Code map

| Path | What |
|---|---|
| `src/agent/tools.ts` | Deterministic tools: detectSpike, clusterCases, createIncident, drafts, `approveAction` (human-only, idempotent), verifyFix, postmortem |
| `src/agent/run.ts` | Agent loop: LLM tool-calling with tools bound to the spike, scripted fallback, `tick()` with a DB lease lock |
| `src/agent/complaints.ts` | Complaint → match to incident → reply. No refund promises until a human has approved the alert. Non-payment or unmatched complaints are escalated (`escalatedAt`); `replyAsHuman` answers them. `simulateComplaintWave` sends up to 50 complaints (EN/Hinglish/HI, chat + voice, some repeats) from affected customers during the demo outage |
| `src/lib/llm.ts` | Provider switch (openai, groq, gemini, sarvam, paytm, custom) |
| `src/lib/sarvam.ts` | STT / translate / TTS wrappers (return null without a key) |
| `src/lib/demo.ts` | Mock world: reset, HDFC U30 outage, bank fix, live traffic |
| `src/lib/queries.ts` | Read models for the dashboard and customer app (`DashboardData`, `CustomerData`) |
| `src/lib/useLive.ts` | Client hook: Supabase Realtime if configured, else 2s polling |
| `src/app/api/*` | `dashboard`, `customer`, `agent/tick`, `demo`, `actions/[id]`, `complaints`, `complaints/voice`, `complaints/[id]/reply`, `notifications/read` |
| `src/app/demo` · `dashboard` · `app` | Stage view, ops console, Paytm-style customer app |
| `prisma/realtime.sql` | Run once in Supabase: Realtime publication + read-only RLS for anon |
| `scripts/e2e-check.ts` | Runs the whole story without the UI |
| `scripts/wave-check.ts` | Checks the complaint wave (~50 complaints during the outage, matched + auto-answered) |

## Commands

- `pnpm dev`, `pnpm typecheck`, `pnpm lint`
- `pnpm db:push`, `pnpm db:seed`, `pnpm simulate [fix]`
- No `DATABASE_URL` → embedded in-memory PGlite started in-process by `src/lib/db.ts` and auto-seeded. After editing `schema.prisma`, run `pnpm db:embedded-sql`
- `npx tsx scripts/e2e-check.ts` (resets demo data)

## Status

- [x] App, schema, agent, tools, APIs, both screens, stage view. Tested end to end in scripted mode on local PGlite
- [x] Supabase project `iamsqetdcsmtecopxaws` (eu-north-1): schema pushed, Realtime publication set up. Open it the day before so the free tier doesn't pause it
- [x] LLM: Sarvam `sarvam-105b-conversations` (fast, tool calling works). Tested end to end in LLM mode. `sarvam-m`/`sarvam-30b` are deprecated; `sarvam-105b` reasons for 15-30s per call, too slow for chat
- [ ] Sarvam key → test a real voice note on the demo laptop's browser
- [ ] Deploy to Vercel and dry-run the 2-minute script
