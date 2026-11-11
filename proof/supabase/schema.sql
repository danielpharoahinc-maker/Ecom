-- Proof database (Supabase / Postgres). Paste into Supabase > SQL Editor > Run.
-- Row Level Security is ON for every table: people only see their own data
-- and the data of people in a club with them.

create extension if not exists pgcrypto;

-- ---------- Tables ----------

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  name         text not null check (char_length(name) between 1 and 24),
  goal         text,
  wake         text,
  lockin       int,
  proof_time   text,
  crew         text,
  obstacle     text,
  commitments  text[] not null check (array_length(commitments, 1) = 3),
  created_at   timestamptz not null default now()
);

create table public.clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 24),
  code        text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  owner       uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.club_members (
  club_id    uuid references public.clubs on delete cascade,
  user_id    uuid references auth.users on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table public.proofs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  c_key       text not null,
  kind        text not null check (kind in ('photo', 'voice')),
  note        text check (char_length(note) <= 280),
  photo_path  text,
  audio_path  text,
  audio_secs  int,
  mins        int,
  created_at  timestamptz not null default now()
);
create index proofs_user_time on public.proofs (user_id, created_at desc);

-- ---------- Helpers (security definer avoids policy recursion) ----------

create or replace function public.my_club_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select club_id from club_members where user_id = auth.uid()
$$;

create or replace function public.is_club_mate(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from club_members a join club_members b on a.club_id = b.club_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

-- Join by invite code without letting anyone list every club.
create or replace function public.join_club(invite text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select id into cid from clubs where code = upper(invite);
  if cid is null then raise exception 'No club with that code'; end if;
  if (select count(*) from club_members where club_id = cid) >= 20 then raise exception 'Club is full'; end if;
  insert into club_members (club_id, user_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

-- The creator is added as the first member automatically.
create or replace function public.add_owner_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into club_members (club_id, user_id) values (new.id, new.owner);
  return new;
end $$;
create trigger clubs_owner_member after insert on public.clubs
  for each row execute function public.add_owner_member();

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.proofs enable row level security;

create policy "see own or club mates' profile" on public.profiles for select
  using (id = auth.uid() or public.is_club_mate(id));
create policy "write own profile" on public.profiles for insert with check (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid());

create policy "see clubs I'm in" on public.clubs for select using (id in (select public.my_club_ids()));
create policy "create a club as owner" on public.clubs for insert with check (owner = auth.uid());
create policy "owner renames club" on public.clubs for update using (owner = auth.uid());
create policy "owner deletes club" on public.clubs for delete using (owner = auth.uid());

create policy "see members of my clubs" on public.club_members for select
  using (club_id in (select public.my_club_ids()));
create policy "leave a club" on public.club_members for delete using (user_id = auth.uid());

create policy "see own or club mates' proof" on public.proofs for select
  using (user_id = auth.uid() or public.is_club_mate(user_id));
create policy "post own proof" on public.proofs for insert with check (user_id = auth.uid());
create policy "delete own proof" on public.proofs for delete using (user_id = auth.uid());

-- ---------- Storage: photos and voice notes ----------
-- Files live at proof-media/<user id>/<file>. Private bucket.

insert into storage.buckets (id, name, public) values ('proof-media', 'proof-media', false)
  on conflict do nothing;

create policy "upload to own folder" on storage.objects for insert
  with check (bucket_id = 'proof-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own or club mates' files" on storage.objects for select
  using (bucket_id = 'proof-media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_club_mate(((storage.foldername(name))[1])::uuid)));
create policy "delete own files" on storage.objects for delete
  using (bucket_id = 'proof-media' and (storage.foldername(name))[1] = auth.uid()::text);
