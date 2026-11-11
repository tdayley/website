-- Remembers that the "one week to go" reminder email went out for an exchange,
-- so the daily check never sends it twice.
alter table public.groups add column reminder_sent_at timestamptz;

-- Only the server's reminder job (which uses the secret key) may set it.
-- Organizers can still edit just name, budget and date, as before.
