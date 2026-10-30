alter table public.gather_orders alter column buyer_id drop not null;
alter table public.gather_orders add column buyer_name text, add column buyer_phone text, add column buyer_email text;
alter table public.gather_payment_submissions alter column buyer_id drop not null;

grant usage on schema gather_private to anon, authenticated;

create function gather_private.submit_gather_guest_booking(
  p_event_id uuid,p_quantity smallint,p_ticket_type text,p_payment_method text,
  p_transaction_code text,p_buyer_name text,p_buyer_phone text,p_buyer_email text,
  p_crypto_asset text,p_crypto_amount numeric
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_buyer uuid := auth.uid();
  v_event public.gather_events%rowtype;
  v_order public.gather_orders%rowtype;
  v_payment public.gather_payment_submissions%rowtype;
  v_ticket_type text := lower(trim(p_ticket_type));
  v_method text := lower(trim(p_payment_method));
  v_code text := upper(trim(p_transaction_code));
  v_name text := trim(p_buyer_name);
  v_phone text := regexp_replace(trim(p_buyer_phone),'[^0-9]','','g');
  v_email text := nullif(lower(trim(p_buyer_email)),'');
  v_asset text := upper(trim(coalesce(p_crypto_asset,'')));
begin
  if char_length(v_name) not between 2 and 120 then raise exception 'Enter your full name.' using errcode='22023'; end if;
  if v_phone !~ '^(254[17][0-9]{8}|0[17][0-9]{8}|[17][0-9]{8})$' then raise exception 'Enter a valid Kenyan mobile number.' using errcode='22023'; end if;
  if v_email is not null and v_email !~* '^[^@]+@[^@]+\.[^@]+$' then raise exception 'Enter a valid email address.' using errcode='22023'; end if;
  if v_ticket_type not in ('general','vip','vvip') then raise exception 'Choose a valid ticket category.' using errcode='22023'; end if;
  if v_method not in ('mpesa','binance_pay') then raise exception 'Choose M-Pesa or Binance Pay.' using errcode='22023'; end if;
  if v_method='mpesa' and v_code !~ '^[A-Z0-9]{6,20}$' then raise exception 'Enter a valid M-Pesa transaction code.' using errcode='22023'; end if;
  if v_method='binance_pay' and (v_code !~ '^[A-Z0-9]{6,40}$' or v_asset !~ '^[A-Z0-9]{2,12}$' or p_crypto_amount is null or p_crypto_amount<=0) then raise exception 'Enter the Binance Pay reference, crypto asset, and amount sent.' using errcode='22023'; end if;

  select * into v_event from public.gather_events where id=p_event_id for update;
  if not found or v_event.status<>'published' or not v_event.manual_payment_required then raise exception 'This event is not open for bookings.' using errcode='P0001'; end if;

  insert into public.gather_orders(event_id,buyer_id,buyer_name,buyer_phone,buyer_email,quantity,ticket_type,payment_status)
  values(p_event_id,v_buyer,v_name,v_phone,v_email,p_quantity,v_ticket_type,'pending_verification') returning * into v_order;

  insert into public.gather_payment_submissions(order_id,buyer_id,amount_kes,payer_phone,payee_phone,payee_binance_id,transaction_code,payment_method,crypto_asset,crypto_amount)
  values(v_order.id,v_buyer,v_order.amount_kes,case when v_method='mpesa' then v_phone else null end,case when v_method='mpesa' then '+254105062638' else null end,case when v_method='binance_pay' then '94780808' else null end,v_code,v_method,case when v_method='binance_pay' then v_asset else null end,case when v_method='binance_pay' then p_crypto_amount else null end)
  returning * into v_payment;

  return jsonb_build_object('order_id',v_order.id,'payment_id',v_payment.id,'amount_kes',v_payment.amount_kes,'buyer_name',v_name,'buyer_phone',v_phone,'buyer_email',v_email,'payee_phone',v_payment.payee_phone,'payee_binance_id',v_payment.payee_binance_id,'transaction_code',v_payment.transaction_code,'ticket_type',v_order.ticket_type,'quantity',v_order.quantity,'payment_method',v_method,'crypto_asset',v_payment.crypto_asset,'crypto_amount',v_payment.crypto_amount,'payment_status',v_payment.status,'created_at',v_payment.created_at);
end; $$;
revoke all on function gather_private.submit_gather_guest_booking(uuid,smallint,text,text,text,text,text,text,text,numeric) from public;
grant execute on function gather_private.submit_gather_guest_booking(uuid,smallint,text,text,text,text,text,text,text,numeric) to anon,authenticated;
create function public.submit_gather_guest_booking(p_event_id uuid,p_quantity smallint,p_ticket_type text,p_payment_method text,p_transaction_code text,p_buyer_name text,p_buyer_phone text,p_buyer_email text,p_crypto_asset text,p_crypto_amount numeric)
returns jsonb language sql security invoker set search_path=''
as $$ select gather_private.submit_gather_guest_booking($1,$2,$3,$4,$5,$6,$7,$8,$9,$10); $$;
revoke all on function public.submit_gather_guest_booking(uuid,smallint,text,text,text,text,text,text,text,numeric) from public;
grant execute on function public.submit_gather_guest_booking(uuid,smallint,text,text,text,text,text,text,text,numeric) to anon,authenticated;