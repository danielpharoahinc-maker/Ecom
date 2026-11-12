-- Proof upgrade 2: goals (1 to 6), 30-day trial, club sync, respect.
-- Run once in Supabase > SQL Editor, after schema.sql. Safe to run again.

-- ---------- Goals: 1 to 6, goal history, time zone ----------
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.profiles'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%array_length(commitments%'
  loop execute format('alter table public.profiles drop constraint %I', c); end loop;
end $$;
alter table public.profiles drop constraint if exists profiles_goals_count;
alter table public.profiles add constraint profiles_goals_count check (cardinality(commitments) between 1 and 6);
alter table public.profiles add column if not exists goal_log jsonb;
alter table public.profiles add column if not exists tz text not null default 'Africa/Johannesburg';
grant insert (goal_log, tz) on public.profiles to authenticated;
grant update (goal_log, tz) on public.profiles to authenticated;

-- ---------- Trial and access ----------
-- require_card = false: everyone gets trial_days free from sign-up, no card.
-- require_card = true (set when Paystack is live): access starts only once the
-- card is confirmed by the payment webhook.
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  require_card boolean not null default false,
  trial_days int not null default 30
);
insert into public.app_settings (id) values (1) on conflict do nothing;
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

create or replace function public.start_trial() returns trigger
language plpgsql security definer set search_path = public as $$
declare rc boolean; td int;
begin
  select require_card, trial_days into rc, td from app_settings where id = 1;
  if not coalesce(rc, false) and new.pro_until is null then
    new.pro_until := now() + make_interval(days => coalesce(td, 30));
  end if;
  return new;
end $$;
drop trigger if exists profiles_start_trial on public.profiles;
create trigger profiles_start_trial before insert on public.profiles
  for each row execute function public.start_trial();

-- People already signed up get their 30 days too.
update public.profiles set pro_until = created_at + interval '30 days'
where pro_until is null and not coalesce((select require_card from public.app_settings where id = 1), false);

-- Billing facts the app may see about itself (the table stays closed).
alter table public.billing add column if not exists status text;          -- trial | active | cancelled
alter table public.billing add column if not exists charge_on timestamptz; -- first real charge
alter table public.billing add column if not exists sub_code text;
alter table public.billing add column if not exists trial_ref text;
alter table public.billing add column if not exists trial_used_at timestamptz;
alter table public.billing add column if not exists granted boolean not null default false;
alter table public.billing add column if not exists refunded boolean not null default false;

create or replace function public.my_billing() returns table (status text, plan text, charge_on timestamptz)
language sql stable security definer set search_path = public as $$
  select b.status, b.plan, b.charge_on from billing b where b.user_id = auth.uid()
$$;
revoke execute on function public.my_billing from anon, public;
grant execute on function public.my_billing to authenticated;

-- Posting needs access (trial or Pro). Also: a proof can only be backdated a
-- few days (offline posts), so streaks can't be rewritten.
create or replace function public.count_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare until timestamptz;
begin
  select pro_until into until from profiles where id = new.user_id;
  if not found then raise exception 'Finish setting up your profile first'; end if;
  if until is null or until <= now() then raise exception 'ACCESS_ENDED: your free trial is over'; end if;
  if new.created_at < now() - interval '3 days' or new.created_at > now() + interval '5 minutes' then
    new.created_at := now();
  end if;
  return new;
end $$;

-- ---------- Proof sync ----------
alter table public.proofs add column if not exists client_id text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'proofs_user_client_unique') then
    alter table public.proofs add constraint proofs_user_client_unique unique (user_id, client_id);
  end if;
end $$;

-- ---------- Respect: one tap on a friend's proof ----------
create table if not exists public.respects (
  proof_id   uuid not null references public.proofs on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (proof_id, user_id)
);
alter table public.respects enable row level security;
revoke all on public.respects from anon;
drop policy if exists "see respect on proof I can see" on public.respects;
drop policy if exists "give respect to a mate's proof" on public.respects;
drop policy if exists "take back my respect" on public.respects;
create policy "see respect on proof I can see" on public.respects for select to authenticated
  using (exists (select 1 from public.proofs p where p.id = proof_id));
create policy "give respect to a mate's proof" on public.respects for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.proofs p where p.id = proof_id and p.user_id <> auth.uid()));
create policy "take back my respect" on public.respects for delete to authenticated using (user_id = auth.uid());

-- ---------- The club board: who has proven how much today, and streaks ----------
-- Same rule as the app: a day counts when you prove at least half your goals.
create or replace function public.club_board(club uuid)
returns table (user_id uuid, name text, goals int, done_today int, streak int)
language sql stable security definer set search_path = public as $$
  with mem as (
    select m.user_id, p.name, p.tz, cardinality(p.commitments) as goals
    from club_members m join profiles p on p.id = m.user_id
    where m.club_id = club and club in (select my_club_ids())
  ),
  days as (
    select mem.user_id, mem.goals, (pr.created_at at time zone mem.tz)::date as d, count(distinct pr.c_key)::int as n
    from mem join proofs pr on pr.user_id = mem.user_id and pr.c_key <> 'moment'
                            and pr.created_at > now() - interval '200 days'
    group by mem.user_id, mem.goals, (pr.created_at at time zone mem.tz)::date
  ),
  ok as (select user_id, d from days where n >= ceil(goals / 2.0)),
  isl as (select user_id, d, d - (row_number() over (partition by user_id order by d))::int as g from ok),
  runs as (select user_id, g, count(*)::int as len, max(d) as last_d from isl group by user_id, g)
  select mem.user_id, mem.name, mem.goals,
    coalesce((select dd.n from days dd where dd.user_id = mem.user_id and dd.d = (now() at time zone mem.tz)::date), 0),
    coalesce((select r.len from runs r where r.user_id = mem.user_id
              and r.last_d >= (now() at time zone mem.tz)::date - 1 order by r.last_d desc limit 1), 0)
  from mem
$$;
revoke execute on function public.club_board from anon, public;
grant execute on function public.club_board to authenticated;

-- ---------- "Sipho proved Train": tell the push function a goal was proven ----------
-- Quietly does nothing until reminders.sql has been run (it needs pg_net and push_keys).
create or replace function public.notify_club_proof() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.c_key <> 'moment'
     and exists (select 1 from club_members a join club_members b on a.club_id = b.club_id and b.user_id <> a.user_id
                 where a.user_id = new.user_id) then
    begin
      execute format(
        $f$select net.http_post(url := %L,
             headers := jsonb_build_object('Content-Type', 'application/json',
                                           'x-cron-key', (select cron_key from public.push_keys where id = 1)),
             body := jsonb_build_object('action', 'club_ping', 'proof_id', %L))$f$,
        'https://kfnetfsyvhyysjjhpwue.supabase.co/functions/v1/push', new.id::text);
    exception when others then null;
    end;
  end if;
  return new;
end $$;
drop trigger if exists proofs_notify_club on public.proofs;
create trigger proofs_notify_club after insert on public.proofs
  for each row execute function public.notify_club_proof();
