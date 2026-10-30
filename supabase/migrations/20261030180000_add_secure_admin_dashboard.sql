alter table public.gather_payment_submissions
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users(id) on delete set null,
  add column review_note text;
create index gather_payment_submissions_status_idx on public.gather_payment_submissions (status, created_at desc);

create policy "Gather admins manage all Gather events" on public.gather_events
  for all to authenticated
  using (coalesce(auth.jwt()->'app_metadata'->>'gather_admin','false') = 'true')
  with check (coalesce(auth.jwt()->'app_metadata'->>'gather_admin','false') = 'true');
create policy "Gather admins view all Gather orders" on public.gather_orders
  for select to authenticated
  using (coalesce(auth.jwt()->'app_metadata'->>'gather_admin','false') = 'true');
create policy "Gather admins view all payment submissions" on public.gather_payment_submissions
  for select to authenticated
  using (coalesce(auth.jwt()->'app_metadata'->>'gather_admin','false') = 'true');

create function gather_private.review_gather_payment(p_payment_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_admin uuid := auth.uid();
  v_payment public.gather_payment_submissions%rowtype;
  v_order_id uuid;
begin
  if v_admin is null or coalesce(auth.jwt()->'app_metadata'->>'gather_admin','false') <> 'true' then
    raise exception 'Gather admin access is required.' using errcode='42501';
  end if;
  if p_decision not in ('verified','rejected') then
    raise exception 'Choose verified or rejected.' using errcode='22023';
  end if;
  select * into v_payment from public.gather_payment_submissions where id=p_payment_id for update;
  if not found then raise exception 'Payment submission was not found.' using errcode='P0002'; end if;
  if v_payment.status <> 'pending_verification' then
    raise exception 'This payment submission has already been reviewed.' using errcode='P0001';
  end if;
  update public.gather_payment_submissions
    set status=p_decision, review_note=nullif(trim(p_note),''), reviewed_at=now(), reviewed_by=v_admin
    where id=p_payment_id returning order_id into v_order_id;
  update public.gather_orders
    set payment_status=case when p_decision='verified' then 'paid' else 'rejected' end,
        status=case when p_decision='rejected' then 'cancelled' else status end
    where id=v_order_id;
  return jsonb_build_object('payment_id',p_payment_id,'order_id',v_order_id,'status',p_decision);
end; $$;
revoke all on function gather_private.review_gather_payment(uuid,text,text) from public,anon;
grant execute on function gather_private.review_gather_payment(uuid,text,text) to authenticated;
create function public.review_gather_payment(p_payment_id uuid,p_decision text,p_note text default null)
returns jsonb language sql security invoker set search_path=''
as $$ select gather_private.review_gather_payment($1,$2,$3); $$;
revoke all on function public.review_gather_payment(uuid,text,text) from public,anon;
grant execute on function public.review_gather_payment(uuid,text,text) to authenticated;