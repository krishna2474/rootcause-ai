# RootCause AI

An AI teammate that catches payment failures before customers complain, tells them what happened in their own language, fixes it with human approval, and proves the fix worked.

See `CLAUDE.md` for the product flow and `docs/architecture.html` for the architecture.

## Run it

```bash
pnpm install
pnpm dev
```

That's it. **No keys are needed.** Without `DATABASE_URL`, the app starts an embedded in-memory Postgres (PGlite) and seeds it on first load. Without an LLM key, the agent runs a scripted investigation. Data resets when the server restarts.

Open:
- `/demo`: stage view, with the dashboard and phone side by side
- `/dashboard`: ops console
- `/app`: customer app (open it on a phone)

Add keys later by copying `.env.example` to `.env`.

### Deploy to Vercel
Import the GitHub repo in Vercel and deploy. It works with no env vars. For data that persists and is shared across serverless instances, add the Supabase variables below.

### Supabase setup
1. Create a project and copy the pooled (6543) and direct (5432) connection strings into `DATABASE_URL` / `DIRECT_URL`.
2. `pnpm db:push && pnpm db:seed`, then run `prisma/realtime.sql` in the Supabase SQL editor to enable Realtime.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without them the UI polls every 2s instead.

### LLM
Set `LLM_PROVIDER` (openai | groq | gemini | sarvam | paytm | custom), `LLM_API_KEY`, `LLM_MODEL` and, for paytm/custom, `LLM_BASE_URL`. With no LLM the agent runs a scripted investigation, so the demo still works.

### Sarvam
Set `SARVAM_API_KEY` for voice notes (speech-to-text). Without it, the mic button sends a sample Hindi note as text.

## Demo script
1. Open `/demo` and press **Reset**.
2. Press **Start HDFC outage**. The agent detects the spike, investigates, and drafts an incident with an ops ticket and a customer alert.
3. Press **Approve** on the customer alert. The phone shows the alert.
4. On the phone, open Help and send a Hindi voice note. The agent answers with the real reason.
5. Press **Bank deploys fix**. The agent verifies recovery, resolves the incident and writes the post-mortem.

`npx tsx scripts/e2e-check.ts` runs the same story without the UI.
