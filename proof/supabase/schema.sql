-- Proof database (Supabase / Postgres). Run once in Supabase > SQL Editor.
--
-- PRIVACY MODEL (enforced by the database, not the app):
--   * Signed-out visitors can read and write NOTHING.
--   * Your profile, onboarding answers and daily plans: only you.
--   * Your proof (photos, voice notes, captions): you, plus people in a club
--     you are in. Nobody else, ever.
--   * Club mates see each other's first name only, never email or answers.
--   * Photos and voice notes live in a private bucket; links expire.
--   * You can delete your account and everything in it.
-- Row Level Security is ON for every table, and every policy names the
-- `authenticated` role, so the public `anon` key alone opens nothing.


-- ---------- Tables ----------

create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  name         text not null check (char_length(name) between 1 and 24),
  goal         text[],
  wake         text,
  lockin       int,
  proof_time   text[],
  crew         text[],
  obstacle     text[],
  commitments  text[] not null check (array_length(commitments, 1) = 3),
  posts_used   int not null default 0,
  pro          boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.plans (
  user_id  uuid not null default auth.uid() references auth.users on delete cascade,
  day      date not null,
  items    jsonb not null default '[]'::jsonb,
  primary key (user_id, day)
);

create table public.clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 24),
  code        text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  owner       uuid not null default auth.uid() references auth.users on delete cascade,
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
  created_at  timestamptz not null default now()
);
create index proofs_user_time on public.proofs (user_id, created_at desc);

-- Signed-out visitors get no table access at all.
revoke all on public.profiles, public.plans, public.clubs, public.club_members, public.proofs from anon;
-- People may only write these profile fields. Pro, the free-post count and
-- timestamps can't be set from the app; only the server changes them.
revoke insert, update on public.profiles from authenticated;
grant insert (id, name, goal, wake, lockin, proof_time, crew, obstacle, commitments) on public.profiles to authenticated;
grant update (name, goal, wake, lockin, proof_time, crew, obstacle, commitments) on public.profiles to authenticated;
-- Clubs are created through create_club() below, never directly.
revoke insert on public.clubs from authenticated;
revoke insert, update on public.club_members from authenticated;

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

-- First names of the people in one of MY clubs. Nothing else leaves profiles.
create or replace function public.club_roster(club uuid)
returns table (user_id uuid, name text)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.name
  from club_members m join profiles p on p.id = m.user_id
  where m.club_id = club and club in (select my_club_ids())
$$;

-- Join by invite code without letting anyone list or guess at clubs.
create or replace function public.join_club(invite text) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select id into cid from clubs where code = upper(invite);
  if cid is null then raise exception 'No club with that code'; end if;
  if (select count(*) from club_members where club_id = cid) >= 20 then raise exception 'Club is full'; end if;
  insert into club_members (club_id, user_id) values (cid, auth.uid()) on conflict do nothing;
  return cid;
end $$;

-- Create a club: the server makes the invite code and adds you as a member.
create or replace function public.create_club(club_name text)
returns table (id uuid, code text)
language plpgsql security definer set search_path = public as $$
declare cid uuid; c text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if (select count(*) from clubs where owner = auth.uid()) >= 5 then raise exception 'You can own up to 5 clubs'; end if;
  loop
    c := (select string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    exit when not exists (select 1 from clubs where clubs.code = c);
  end loop;
  insert into clubs (name, code, owner) values (trim(club_name), c, auth.uid()) returning clubs.id into cid;
  insert into club_members (club_id, user_id) values (cid, auth.uid());
  return query select cid, c;
end $$;

-- Delete my account: removes the login, and everything cascades with it.
-- (Photos in storage are removed by the app before calling this.)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.my_club_ids, public.is_club_mate, public.club_roster,
  public.join_club, public.create_club, public.delete_my_account from anon, public;
grant execute on function public.my_club_ids, public.is_club_mate to authenticated;
grant execute on function public.club_roster, public.join_club, public.create_club, public.delete_my_account to authenticated;

-- Free plan, enforced by the server: every post counts, and once the free
-- posts are used up only Pro accounts can post. (Matches FREE_POSTS in config.js.)
create or replace function public.count_post() returns trigger
language plpgsql security definer set search_path = public as $$
declare used int; is_pro boolean;
begin
  select posts_used, pro into used, is_pro from profiles where id = new.user_id for update;
  if used is null then raise exception 'Finish setting up your profile first'; end if;
  if not is_pro and used >= 21 then raise exception 'FREE_LIMIT: free posts used up'; end if;
  update profiles set posts_used = used + 1 where id = new.user_id;
  return new;
end $$;
create trigger proofs_count_post before insert on public.proofs
  for each row execute function public.count_post();

-- ---------- Row Level Security ----------

alter table public.profiles     enable row level security;
alter table public.plans        enable row level security;
alter table public.clubs        enable row level security;
alter table public.club_members enable row level security;
alter table public.proofs       enable row level security;

-- Profiles: only you. (Club mates get your first name through club_roster.)
create policy "read own profile"   on public.profiles for select to authenticated using (id = auth.uid());
create policy "create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Plans: only you.
create policy "own plans" on public.plans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Clubs: visible only to members.
create policy "see clubs I'm in"    on public.clubs for select to authenticated using (id in (select public.my_club_ids()));
create policy "owner renames club"   on public.clubs for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
create policy "owner deletes club"   on public.clubs for delete to authenticated using (owner = auth.uid());

create policy "see members of my clubs" on public.club_members for select to authenticated
  using (club_id in (select public.my_club_ids()));
create policy "leave a club" on public.club_members for delete to authenticated using (user_id = auth.uid());

-- Proof: you, plus your club mates. Only you can post or delete yours.
create policy "see own or club mates' proof" on public.proofs for select to authenticated
  using (user_id = auth.uid() or public.is_club_mate(user_id));
create policy "post own proof"   on public.proofs for insert to authenticated with check (user_id = auth.uid());
create policy "delete own proof" on public.proofs for delete to authenticated using (user_id = auth.uid());

-- ---------- Storage: photos and voice notes ----------
-- Files live at proof-media/<user id>/<file>. Private bucket: no public URLs;
-- the app asks for short-lived signed links, which pass the same checks.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proof-media', 'proof-media', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/mpeg'])
on conflict (id) do update set public = false;

create policy "upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'proof-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "read own or club mates' files" on storage.objects for select to authenticated
  using (bucket_id = 'proof-media' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_club_mate(((storage.foldername(name))[1])::uuid)));
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'proof-media' and (storage.foldername(name))[1] = auth.uid()::text);
