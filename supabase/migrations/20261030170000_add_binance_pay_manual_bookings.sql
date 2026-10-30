alter table public.gather_payment_submissions add column payment_method text not null default 'mpesa' check (payment_method in ('mpesa','binance_pay'));
alter table public.gather_payment_submissions alter column payee_phone drop not null;
alter table public.gather_payment_submissions add column payee_binance_id text;
alter table public.gather_payment_submissions add column crypto_asset text;
alter table public.gather_payment_submissions add column crypto_amount numeric(28,10);
alter table public.gather_payment_submissions drop constraint gather_payment_submissions_transaction_code_check;
alter table public.gather_payment_submissions add constraint gather_payment_submissions_transaction_code_check check (transaction_code ~ '^[A-Za-z0-9]{6,40}$');
alter table public.gather_payment_submissions add constraint gather_payment_submissions_payment_details_check check (
  (payment_method = 'mpesa' and payee_phone is not null)
  or (payment_method = 'binance_pay' and payee_binance_id is not null and crypto_asset ~ '^[A-Z0-9]{2,12}$' and crypto_amount > 0)
);
drop index public.gather_payment_submissions_code_ci_idx;
create unique index gather_payment_submissions_code_ci_idx on public.gather_payment_submissions (payment_method,lower(transaction_code));

create function gather_private.submit_gather_binance_booking(p_event_id uuid,p_quantity smallint,p_ticket_type text,p_transaction_code text,p_crypto_asset text,p_crypto_amount numeric)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_buyer uuid := auth.uid();
  v_event public.gather_events%rowtype;
  v_order public.gather_orders%rowtype;
  v_payment public.gather_payment_submissions%rowtype;
  v_ticket_type text := lower(trim(p_ticket_type));
  v_code text := upper(trim(p_transaction_code));
  v_asset text := upper(trim(p_crypto_asset));
begin
  if v_buyer is null then raise exception 'Sign in before submitting a booking.' using errcode='28000'; end if;
  if v_ticket_type not in ('general','vip','vvip') then raise exception 'Choose a valid ticket category.' using errcode='22023'; end if;
  if v_code !~ '^[A-Z0-9]{6,40}$' then raise exception 'Enter a valid Binance Pay transaction reference.' using errcode='22023'; end if;
  if v_asset !~ '^[A-Z0-9]{2,12}$' or p_crypto_amount is null or p_crypto_amount <= 0 then raise exception 'Enter the crypto asset and amount you sent.' using errcode='22023'; end if;
  select * into v_event from public.gather_events where id=p_event_id for update;
  if not found or v_event.status<>'published' or not v_event.manual_payment_required then raise exception 'This event is not open for Binance Pay bookings.' using errcode='P0001'; end if;
  insert into public.gather_orders(event_id,buyer_id,quantity,ticket_type,payment_status) values(p_event_id,v_buyer,p_quantity,v_ticket_type,'pending_verification') returning * into v_order;
  insert into public.gather_payment_submissions(order_id,buyer_id,amount_kes,payer_phone,payee_phone,payee_binance_id,transaction_code,payment_method,crypto_asset,crypto_amount)
  values(v_order.id,v_buyer,v_order.amount_kes,null,null,'94780808',v_code,'binance_pay',v_asset,p_crypto_amount) returning * into v_payment;
  return jsonb_build_object('order_id',v_order.id,'payment_id',v_payment.id,'amount_kes',v_payment.amount_kes,'payee_binance_id',v_payment.payee_binance_id,'transaction_code',v_payment.transaction_code,'ticket_type',v_order.ticket_type,'quantity',v_order.quantity,'crypto_asset',v_payment.crypto_asset,'crypto_amount',v_payment.crypto_amount,'payment_method',v_payment.payment_method,'payment_status',v_payment.status,'created_at',v_payment.created_at);
end; $$;
revoke all on function gather_private.submit_gather_binance_booking(uuid,smallint,text,text,text,numeric) from public,anon;
grant execute on function gather_private.submit_gather_binance_booking(uuid,smallint,text,text,text,numeric) to authenticated;
create function public.submit_gather_binance_booking(p_event_id uuid,p_quantity smallint,p_ticket_type text,p_transaction_code text,p_crypto_asset text,p_crypto_amount numeric)
returns jsonb language sql security invoker set search_path=''
as $$ select gather_private.submit_gather_binance_booking($1,$2,$3,$4,$5,$6); $$;
revoke all on function public.submit_gather_binance_booking(uuid,smallint,text,text,text,numeric) from public,anon;
grant execute on function public.submit_gather_binance_booking(uuid,smallint,text,text,text,numeric) to authenticated;