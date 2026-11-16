-- Meals and the Claude connection. Safe to run more than once.
-- Run after migration-2.sql.

-- A proof can carry meal details (which meal, tags) and Claude's review of it.
alter table public.proofs add column if not exists meta jsonb;
alter table public.proofs add column if not exists analysis jsonb;
grant insert (meta) on public.proofs to authenticated;
grant update (meta) on public.proofs to authenticated;
-- `analysis` is written only by the Proof API (service role), never by the app.

-- API keys let your own Claude read your proof and write meal reviews back.
-- Only a hash is stored; the key itself is shown once, when it is created.
create table if not exists public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users on delete cascade,
  label        text not null default 'Claude',
  key_hash     text not null unique,
  key_hint     text not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
alter table public.api_keys enable row level security;
revoke all on public.api_keys from anon, authenticated;

create or replace function public.create_api_key(key_label text default 'Claude') returns text
language plpgsql security definer set search_path = public as $$
declare k text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if (select count(*) from api_keys where user_id = auth.uid() and revoked_at is null) >= 5 then
    raise exception 'You can have up to 5 active keys. Revoke one first.';
  end if;
  k := 'proof_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into api_keys (user_id, label, key_hash, key_hint)
  values (auth.uid(), left(trim(coalesce(key_label, 'Claude')), 30), encode(sha256(convert_to(k, 'utf8')), 'hex'), right(k, 4));
  return k;
end $$;

create or replace function public.list_api_keys()
returns table (id uuid, label text, key_hint text, created_at timestamptz, last_used_at timestamptz)
language sql stable security definer set search_path = public as $$
  select id, label, key_hint, created_at, last_used_at from api_keys
  where user_id = auth.uid() and revoked_at is null order by created_at desc
$$;

create or replace function public.revoke_api_key(key_id uuid) returns void
language sql security definer set search_path = public as $$
  update api_keys set revoked_at = now() where id = key_id and user_id = auth.uid()
$$;

revoke execute on function public.create_api_key, public.list_api_keys, public.revoke_api_key from anon, public;
grant execute on function public.create_api_key, public.list_api_keys, public.revoke_api_key to authenticated;

-- Only the Proof API may write a review. The app (role "authenticated") can never set
-- or change `analysis`, even though it can insert and read its own proof.
create or replace function public.protect_analysis() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then new.analysis := null; else new.analysis := old.analysis; end if;
  end if;
  return new;
end $$;
drop trigger if exists proofs_protect_analysis on public.proofs;
create trigger proofs_protect_analysis before insert or update on public.proofs
  for each row execute function public.protect_analysis();

-- Re-sending a proof that already saved (a retry) must not get stuck: let people update their own rows.
drop policy if exists "update own proof" on public.proofs;
create policy "update own proof" on public.proofs for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
