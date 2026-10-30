alter table public.gather_events add column manual_payment_required boolean not null default false;
alter table public.gather_orders add column payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending_verification','paid','rejected'));

create table public.gather_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.gather_orders(id) on delete restrict,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  amount_kes integer not null check (amount_kes > 0),
  payer_phone text not null,
  payee_phone text not null default '+254105062638',
  transaction_code text not null check (transaction_code ~ '^[A-Za-z0-9]{6,20}$'),
  status text not null default 'pending_verification' check (status in ('pending_verification','verified','rejected')),
  created_at timestamptz not null default now()
);
create unique index gather_payment_submissions_code_ci_idx on public.gather_payment_submissions (lower(transaction_code));
create index gather_payment_submissions_buyer_idx on public.gather_payment_submissions (buyer_id, created_at desc);

alter table public.gather_payment_submissions enable row level security;
grant select on public.gather_payment_submissions to authenticated;
create policy "Buyers view their Gather payment submissions" on public.gather_payment_submissions
  for select to authenticated using (buyer_id = (select auth.uid()));

 drop policy if exists "Buyers create reservations for themselves" on public.gather_orders;
create policy "Buyers create non manual reservations for themselves" on public.gather_orders
  for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.gather_events e
      where e.id = event_id and e.status = 'published' and e.manual_payment_required = false
    )
  );

create or replace function public.submit_gather_mpesa_booking(
  p_event_id uuid,
  p_quantity smallint,
  p_ticket_type text,
  p_transaction_code text,
  p_payer_phone text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer uuid := auth.uid();
  v_event public.gather_events%rowtype;
  v_order public.gather_orders%rowtype;
  v_payment public.gather_payment_submissions%rowtype;
  v_ticket_type text := lower(trim(p_ticket_type));
  v_code text := upper(trim(p_transaction_code));
  v_payer_phone text := regexp_replace(trim(p_payer_phone), '[^0-9]', '', 'g');
begin
  if v_buyer is null then
    raise exception 'Sign in before submitting a booking.' using errcode = '28000';
  end if;
  if v_ticket_type not in ('general','vip','vvip') then
    raise exception 'Choose a valid ticket category.' using errcode = '22023';
  end if;
  if v_code !~ '^[A-Z0-9]{6,20}$' then
    raise exception 'Enter a valid M-Pesa transaction code.' using errcode = '22023';
  end if;
  if v_payer_phone !~ '^(254[17][0-9]{8}|0[17][0-9]{8}|[17][0-9]{8})$' then
    raise exception 'Enter a valid Kenyan mobile number.' using errcode = '22023';
  end if;

  select * into v_event from public.gather_events where id = p_event_id for update;
  if not found or v_event.status <> 'published' or not v_event.manual_payment_required then
    raise exception 'This event is not open for M-Pesa bookings.' using errcode = 'P0001';
  end if;

  insert into public.gather_orders(event_id,buyer_id,quantity,ticket_type,payment_status)
  values (p_event_id,v_buyer,p_quantity,v_ticket_type,'pending_verification')
  returning * into v_order;

  insert into public.gather_payment_submissions(order_id,buyer_id,amount_kes,payer_phone,payee_phone,transaction_code)
  values (v_order.id,v_buyer,v_order.amount_kes,v_payer_phone,'+254105062638',v_code)
  returning * into v_payment;

  return jsonb_build_object(
    'order_id',v_order.id,'payment_id',v_payment.id,'amount_kes',v_payment.amount_kes,
    'payer_phone',v_payment.payer_phone,'payee_phone',v_payment.payee_phone,
    'transaction_code',v_payment.transaction_code,'ticket_type',v_order.ticket_type,
    'quantity',v_order.quantity,'payment_status',v_payment.status,'created_at',v_payment.created_at
  );
end;
$$;
revoke all on function public.submit_gather_mpesa_booking(uuid,smallint,text,text,text) from public, anon;
grant execute on function public.submit_gather_mpesa_booking(uuid,smallint,text,text,text) to authenticated;

update public.gather_events set manual_payment_required = true
where id = 'a7777777-7777-4777-8777-777777777777';