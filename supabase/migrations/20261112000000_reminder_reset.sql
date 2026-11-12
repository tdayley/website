-- When an exchange's date is changed, forget that the "one week to go" reminder
-- was sent, so the new date gets its own reminder.

create function public.reset_reminder_on_date_change()
returns trigger
language plpgsql set search_path = ''
as $$
begin
	if new.exchange_date is distinct from old.exchange_date then
		new.reminder_sent_at := null;
	end if;
	return new;
end;
$$;

revoke execute on function public.reset_reminder_on_date_change() from public, anon, authenticated;

create trigger on_group_date_changed
	before update on public.groups
	for each row execute function public.reset_reminder_on_date_change();
