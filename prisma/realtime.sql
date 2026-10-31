-- Run once in the Supabase SQL editor after `pnpm db:push`.
-- Adds our tables to the Realtime publication so both screens update live.
alter publication supabase_realtime add table "PaymentEvent", "Complaint", "Incident", "Action", "Notification", "ChatMessage", "AuditLog", "DemoState";

-- Prisma's tables get Supabase's default anon grants with RLS off, and the anon key ships to the browser.
-- Lock them to read-only for anon. Realtime needs the select policy to keep delivering changes.
do $$
declare t text;
begin
  foreach t in array array['User','PaymentEvent','Complaint','Incident','Action','Notification','ChatMessage','AuditLog','Postmortem','DemoState'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists anon_read on %I', t);
    execute format('create policy anon_read on %I for select to anon using (true)', t);
  end loop;
end $$;
