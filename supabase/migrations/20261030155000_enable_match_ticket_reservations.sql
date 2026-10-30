alter table public.gather_events
  add column general_price_kes integer check (general_price_kes is null or general_price_kes >= 0),
  add column vip_price_kes integer check (vip_price_kes is null or vip_price_kes >= 0),
  add column vvip_price_kes integer check (vvip_price_kes is null or vvip_price_kes >= 0);

alter table public.gather_orders add column ticket_type text not null default 'general';
alter table public.gather_orders add constraint gather_orders_ticket_type_check check (ticket_type in ('general','vip','vvip'));

create or replace function gather_private.reserve_gather_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.gather_events%rowtype;
  reserved_count bigint;
  selected_price integer;
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

  selected_price := case new.ticket_type
    when 'vip' then coalesce(selected_event.vip_price_kes, selected_event.price_kes)
    when 'vvip' then coalesce(selected_event.vvip_price_kes, selected_event.price_kes)
    else coalesce(selected_event.general_price_kes, selected_event.price_kes)
  end;
  new.amount_kes := selected_price * new.quantity;
  return new;
end;
$$;

update public.gather_events
set price_kes = 1500,
    general_price_kes = 1500,
    vip_price_kes = 5000,
    vvip_price_kes = 15000,
    status = 'published',
    description = 'Ticket reservations are open on Gather at the prices shown. General Admission KSh 1,500, VIP KSh 5,000, VVIP KSh 15,000. Payment is not collected on this site; a reservation is not a paid ticket or proof of entry. Official ticket information: Talanta Sports City.'
where id = 'a7777777-7777-4777-8777-777777777777';