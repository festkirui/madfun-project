-- Gather ticketing MVP: public event discovery, owner-managed events, and private reservations.
create table public.gather_events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 120),
  category text not null,
  date date not null,
  time time not null,
  venue text not null,
  price_kes integer not null default 0 check (price_kes >= 0),
  capacity integer not null default 100 check (capacity between 1 and 100000),
  status text not null default 'draft' check (status in ('draft','published','cancelled')),
  art smallint not null default 1 check (art between 1 and 6),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gather_events_public_date_idx on public.gather_events (date, time) where status = 'published';
create index gather_events_organizer_idx on public.gather_events (organizer_id, date);

create table public.gather_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.gather_events(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  quantity smallint not null check (quantity between 1 and 10),
  amount_kes integer not null default 0 check (amount_kes >= 0),
  status text not null default 'reserved' check (status in ('reserved','cancelled')),
  created_at timestamptz not null default now()
);

create index gather_orders_buyer_idx on public.gather_orders (buyer_id, created_at desc);
create index gather_orders_event_idx on public.gather_orders (event_id) where status = 'reserved';

alter table public.gather_events enable row level security;
alter table public.gather_orders enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.gather_events to anon, authenticated;
grant insert, update, delete on public.gather_events to authenticated;
grant select, insert on public.gather_orders to authenticated;

create policy "Published Gather events are public" on public.gather_events
  for select to anon, authenticated
  using (status = 'published' or organizer_id = (select auth.uid()));
create policy "Organizers create their own Gather events" on public.gather_events
  for insert to authenticated
  with check (organizer_id = (select auth.uid()));
create policy "Organizers update their own Gather events" on public.gather_events
  for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));
create policy "Organizers delete their own Gather events" on public.gather_events
  for delete to authenticated
  using (organizer_id = (select auth.uid()));

create policy "Buyers and event organizers can view Gather orders" on public.gather_orders
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or exists (
      select 1 from public.gather_events e
      where e.id = event_id and e.organizer_id = (select auth.uid())
    )
  );
create policy "Buyers create reservations for themselves" on public.gather_orders
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.gather_events e
      where e.id = event_id and e.status = 'published'
    )
  );

-- Keep ticket capacity checks and price calculation atomic when concurrent orders arrive.
create schema if not exists gather_private;
revoke all on schema gather_private from public, anon, authenticated;
create or replace function gather_private.reserve_gather_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.gather_events%rowtype;
  reserved_count bigint;
begin
  select * into selected_event
  from public.gather_events
  where id = new.event_id
  for update;

  if not found or selected_event.status <> 'published' then
    raise exception 'This event is not available for reservations.' using errcode = 'P0001';
  end if;

  select coalesce(sum(quantity), 0) into reserved_count
  from public.gather_orders
  where event_id = new.event_id and status = 'reserved';

  if reserved_count + new.quantity > selected_event.capacity then
    raise exception 'There are not enough tickets left.' using errcode = 'P0001';
  end if;

  new.amount_kes := selected_event.price_kes * new.quantity;
  return new;
end;
$$;
revoke all on function gather_private.reserve_gather_capacity() from public, anon, authenticated;
create trigger gather_orders_check_capacity
  before insert on public.gather_orders
  for each row execute function gather_private.reserve_gather_capacity();

-- Supabase now requires explicit Data API grants for newly created public tables.
-- Add a small starter lineup; these are public sample events without an owner.
insert into public.gather_events (id, name, category, date, time, venue, price_kes, capacity, status, art, description)
values
  ('a1111111-1111-4111-8111-111111111111','Sunset Sessions: Rooftop Edition','Music','2026-10-30','18:00','The Social House, Westlands',2500,200,'published',1,'Rooftop sounds and sunset views above the city.'),
  ('a2222222-2222-4222-8222-222222222222','Nairobi Design Weekender','Arts & culture','2026-11-01','10:00','KICC, CBD',4000,150,'published',2,'A weekend of fresh ideas, makers and city culture.'),
  ('a3333333-3333-4333-8333-333333333333','Sunday Table: Farm to Fork','Food & drink','2026-11-02','12:30','Cultiva, Karen',3500,100,'published',3,'A long lunch celebrating the best of local produce.'),
  ('a4444444-4444-4444-8444-444444444444','Soft Life: A Slow Sunday Reset','Wellness','2026-11-08','09:00','Karura Forest, Gate A',1800,80,'published',4,'A gentle morning walk, stretch and reset in the forest.'),
  ('a5555555-5555-4555-8555-555555555555','The Listening Room','Music','2026-11-12','19:00','Ngong Racecourse, Nairobi',3000,120,'published',5,'A close-up listening session for music lovers.'),
  ('a6666666-6666-4666-8666-666666666666','Clay, Coffee & Conversation','Workshops','2026-11-14','11:00','Matteo’s, Lavington',2200,60,'published',6,'Try your hand at clay with a good cup of coffee.')
on conflict (id) do nothing;

