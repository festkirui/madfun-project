alter function public.submit_gather_mpesa_booking(uuid,smallint,text,text,text) set schema gather_private;
grant usage on schema gather_private to authenticated;
create function public.submit_gather_mpesa_booking(p_event_id uuid,p_quantity smallint,p_ticket_type text,p_transaction_code text,p_payer_phone text)
returns jsonb language sql security invoker set search_path=''
as $$ select gather_private.submit_gather_mpesa_booking($1,$2,$3,$4,$5); $$;
revoke all on function public.submit_gather_mpesa_booking(uuid,smallint,text,text,text) from public, anon;
grant execute on function public.submit_gather_mpesa_booking(uuid,smallint,text,text,text) to authenticated;
