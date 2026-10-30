alter table public.gather_events add column if not exists sales_open_at date;
alter table public.gather_events add column if not exists ticket_url text;

alter table public.gather_events drop constraint if exists gather_events_status_check;
alter table public.gather_events add constraint gather_events_status_check check (status in ('draft','published','cancelled','coming_soon'));
alter table public.gather_events drop constraint if exists gather_events_art_check;
alter table public.gather_events add constraint gather_events_art_check check (art between 1 and 7);

 drop policy if exists "Published Gather events are public" on public.gather_events;
create policy "Published and announced Gather events are public" on public.gather_events
  for select to anon, authenticated
  using (status in ('published','coming_soon') or organizer_id = (select auth.uid()));

drop index if exists public.gather_events_public_date_idx;
create index gather_events_public_date_idx on public.gather_events (date, time) where status in ('published','coming_soon');

insert into public.gather_events (id, name, category, date, time, venue, price_kes, capacity, status, art, description, sales_open_at, ticket_url)
values ('a7777777-7777-4777-8777-777777777777','FC Bayern Munich vs Ajax','Sports','2027-01-05','00:00','Raila Odinga International Stadium, Talanta Sports City, Nairobi',0,60000,'coming_soon',7,'International friendly in Nairobi. Kick-off time, ticket prices, ticket categories, and released inventory have not yet been announced. Official ticket sales are expected to begin 5 November 2026. This listing is not currently bookable.','2026-11-05','https://talantasportscity.com/')
on conflict (id) do update set
  name=excluded.name, category=excluded.category, date=excluded.date,
  venue=excluded.venue, status=excluded.status, art=excluded.art,
  description=excluded.description, sales_open_at=excluded.sales_open_at,
  ticket_url=excluded.ticket_url, updated_at=now();