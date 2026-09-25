-- Guest record merge. A guest whose "save with Google" hits a Google account that already
-- belongs to another Pokepedia account can carry their record over:
--   1. still signed in as the guest, the server creates a one-time ticket (this table) and
--      hands the raw token to the browser in an httpOnly cookie;
--   2. the player signs in with Google (a different, non-guest user);
--   3. the auth callback redeems the ticket: runs, rounds and stickers move to the Google
--      account in one transaction, and only then is the guest user deleted.
-- Anonymity of both users is checked by the server from the sessions; the database only
-- trusts the ticket, and only service_role can create or redeem one.

create table private.guest_merge_ticket (
  -- sha256 of the random token, hex. The raw token only ever exists in the cookie.
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  from_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references auth.users (id) on delete set null
);

create index guest_merge_ticket_from_user_id_idx on private.guest_merge_ticket (from_user_id);

alter table private.guest_merge_ticket enable row level security;
revoke all on private.guest_merge_ticket from public, anon, authenticated;
grant select, insert, update, delete on private.guest_merge_ticket to service_role;

-- Issues a ticket for a guest, replacing any earlier unused one. The lifetime comes from the
-- server (10 minutes), which also lets tests issue an already-expired ticket.
create function public.guest_merge_create_ticket(
  p_from_user uuid,
  p_token_hash text,
  p_ttl_seconds integer
)
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from private.guest_merge_ticket
  where from_user_id = p_from_user and consumed_at is null;

  insert into private.guest_merge_ticket (token_hash, from_user_id, expires_at)
  values (p_token_hash, p_from_user, now() + make_interval(secs => p_ttl_seconds));
$$;

-- Redeems a ticket: consumes it and moves the guest's whole record to p_to_user, atomically.
-- Returns the guest's user id so the caller can delete that user afterwards.
create function public.guest_merge_redeem(p_token_hash text, p_to_user uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from uuid;
begin
  update private.guest_merge_ticket
  set consumed_at = now(), consumed_by = p_to_user
  where token_hash = p_token_hash and consumed_at is null and expires_at > now()
  returning from_user_id into v_from;

  if v_from is null then
    raise exception 'merge_ticket_invalid' using errcode = 'P0001';
  end if;
  if v_from = p_to_user then
    raise exception 'merge_same_user' using errcode = 'P0001';
  end if;

  -- A game the guest left open ends as a flee, so the Google account keeps at most one
  -- active run (quiz_run_one_active_per_user).
  update public.quiz_round
  set status = 'skipped', resolved_at = now()
  where user_id = v_from and status = 'active';
  update public.quiz_run
  set status = 'finished', end_reason = 'fled', finished_at = now()
  where user_id = v_from and status = 'active';

  update public.quiz_run set user_id = p_to_user where user_id = v_from;
  update public.quiz_round set user_id = p_to_user where user_id = v_from;

  insert into public.user_sticker
    (user_id, pokemon_id, variant, quantity, first_obtained_at, last_obtained_at)
  select p_to_user, pokemon_id, variant, quantity, first_obtained_at, last_obtained_at
  from public.user_sticker
  where user_id = v_from
  on conflict (user_id, pokemon_id, variant) do update
  set quantity = public.user_sticker.quantity + excluded.quantity,
      first_obtained_at = least(public.user_sticker.first_obtained_at, excluded.first_obtained_at),
      last_obtained_at = greatest(public.user_sticker.last_obtained_at, excluded.last_obtained_at);
  delete from public.user_sticker where user_id = v_from;

  return v_from;
end;
$$;

revoke execute on function public.guest_merge_create_ticket(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.guest_merge_redeem(text, uuid) from public, anon, authenticated;
grant execute on function public.guest_merge_create_ticket(uuid, text, integer) to service_role;
grant execute on function public.guest_merge_redeem(text, uuid) to service_role;
