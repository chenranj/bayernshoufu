-- Bayernshofu initial schema
-- Run in Supabase Dashboard → SQL Editor

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- =============================================================================
-- ENUMS
-- =============================================================================
do $$ begin
  create type user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type kit_type as enum ('home', 'away', 'third', 'goalkeeper', 'special', 'training', 'other');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- TABLES
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  role user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default uuid_generate_v4(),
  label text unique not null,            -- e.g. "2023/24"
  year_start int not null,
  year_end int not null,
  slug text unique not null,             -- e.g. "2023-24"
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists seasons_year_idx on public.seasons (year_start desc, year_end desc);

create table if not exists public.players (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  slug text unique not null,
  shirt_number int,
  position text,
  photo_path text,                       -- storage path in 'players' bucket
  is_legend boolean not null default false,
  bio text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists players_name_trgm on public.players using gin (full_name gin_trgm_ops);
create index if not exists players_slug_idx on public.players (slug);

create table if not exists public.jerseys (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                    -- e.g. "Home Kit 2023/24"
  season_id uuid not null references public.seasons(id) on delete restrict,
  kit_type kit_type not null default 'home',
  image_path text not null,              -- storage path in 'jerseys' bucket
  description text,
  release_year int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists jerseys_season_idx on public.jerseys (season_id);
create index if not exists jerseys_name_trgm on public.jerseys using gin (name gin_trgm_ops);

create table if not exists public.jersey_players (
  jersey_id uuid not null references public.jerseys(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (jersey_id, player_id)
);
create index if not exists jersey_players_player_idx on public.jersey_players (player_id);

create table if not exists public.banners (
  id uuid primary key default uuid_generate_v4(),
  image_path text not null,              -- storage path in 'banners' bucket
  caption text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists banners_active_idx on public.banners (active, sort_order);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.favorite_jerseys (
  user_id uuid not null references auth.users(id) on delete cascade,
  jersey_id uuid not null references public.jerseys(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, jersey_id)
);

create table if not exists public.favorite_players (
  user_id uuid not null references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, player_id)
);

create table if not exists public.image_access_logs (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null,                    -- 'jersey' | 'player' | 'banner'
  entity_id uuid not null,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists image_access_logs_user_idx on public.image_access_logs (user_id, created_at desc);
create index if not exists image_access_logs_entity_idx on public.image_access_logs (kind, entity_id, created_at desc);

-- =============================================================================
-- HELPERS
-- =============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create profile on auth signup; bootstrap admin by email match.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    case when new.email = 'jinchenran@gmail.com' then 'admin'::user_role else 'user'::user_role end,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.jerseys enable row level security;
alter table public.jersey_players enable row level security;
alter table public.banners enable row level security;
alter table public.site_settings enable row level security;
alter table public.favorite_jerseys enable row level security;
alter table public.favorite_players enable row level security;
alter table public.image_access_logs enable row level security;

-- profiles
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- seasons / players / jerseys / jersey_players: authed read; admin write
drop policy if exists seasons_read on public.seasons;
create policy seasons_read on public.seasons for select to authenticated using (true);
drop policy if exists seasons_admin on public.seasons;
create policy seasons_admin on public.seasons for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists players_read on public.players;
create policy players_read on public.players for select to authenticated using (true);
drop policy if exists players_admin on public.players;
create policy players_admin on public.players for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists jerseys_read on public.jerseys;
create policy jerseys_read on public.jerseys for select to authenticated using (true);
drop policy if exists jerseys_admin on public.jerseys;
create policy jerseys_admin on public.jerseys for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists jp_read on public.jersey_players;
create policy jp_read on public.jersey_players for select to authenticated using (true);
drop policy if exists jp_admin on public.jersey_players;
create policy jp_admin on public.jersey_players for all using (public.is_admin()) with check (public.is_admin());

-- banners: anyone (even anon) can read active rows; admins manage all
drop policy if exists banners_read_active on public.banners;
create policy banners_read_active on public.banners
  for select using (active = true or public.is_admin());
drop policy if exists banners_admin on public.banners;
create policy banners_admin on public.banners
  for all using (public.is_admin()) with check (public.is_admin());

-- site_settings: anyone can read; admin writes
drop policy if exists settings_read on public.site_settings;
create policy settings_read on public.site_settings for select using (true);
drop policy if exists settings_admin on public.site_settings;
create policy settings_admin on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- favorites: each user owns their rows
drop policy if exists fj_self on public.favorite_jerseys;
create policy fj_self on public.favorite_jerseys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists fp_self on public.favorite_players;
create policy fp_self on public.favorite_players
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- image_access_logs: user can insert own; admin reads all
drop policy if exists ial_insert_self on public.image_access_logs;
create policy ial_insert_self on public.image_access_logs
  for insert with check (auth.uid() = user_id or user_id is null);
drop policy if exists ial_admin_read on public.image_access_logs;
create policy ial_admin_read on public.image_access_logs
  for select using (public.is_admin());

-- =============================================================================
-- STORAGE BUCKETS + POLICIES
-- =============================================================================
insert into storage.buckets (id, name, public)
values
  ('jerseys', 'jerseys', false),
  ('players', 'players', false),
  ('banners', 'banners', true)
on conflict (id) do nothing;

-- Banners: public read (login page needs them pre-auth); admin write
drop policy if exists "banners read" on storage.objects;
create policy "banners read" on storage.objects
  for select using (bucket_id = 'banners');

drop policy if exists "banners admin write" on storage.objects;
create policy "banners admin write" on storage.objects
  for insert with check (bucket_id = 'banners' and public.is_admin());

drop policy if exists "banners admin update" on storage.objects;
create policy "banners admin update" on storage.objects
  for update using (bucket_id = 'banners' and public.is_admin());

drop policy if exists "banners admin delete" on storage.objects;
create policy "banners admin delete" on storage.objects
  for delete using (bucket_id = 'banners' and public.is_admin());

-- Jerseys + players: only admins can write; reads happen via service role server-side
drop policy if exists "jerseys admin write" on storage.objects;
create policy "jerseys admin write" on storage.objects
  for insert with check (bucket_id = 'jerseys' and public.is_admin());
drop policy if exists "jerseys admin update" on storage.objects;
create policy "jerseys admin update" on storage.objects
  for update using (bucket_id = 'jerseys' and public.is_admin());
drop policy if exists "jerseys admin delete" on storage.objects;
create policy "jerseys admin delete" on storage.objects
  for delete using (bucket_id = 'jerseys' and public.is_admin());
drop policy if exists "jerseys admin read" on storage.objects;
create policy "jerseys admin read" on storage.objects
  for select using (bucket_id = 'jerseys' and public.is_admin());

drop policy if exists "players admin write" on storage.objects;
create policy "players admin write" on storage.objects
  for insert with check (bucket_id = 'players' and public.is_admin());
drop policy if exists "players admin update" on storage.objects;
create policy "players admin update" on storage.objects
  for update using (bucket_id = 'players' and public.is_admin());
drop policy if exists "players admin delete" on storage.objects;
create policy "players admin delete" on storage.objects
  for delete using (bucket_id = 'players' and public.is_admin());
drop policy if exists "players admin read" on storage.objects;
create policy "players admin read" on storage.objects
  for select using (bucket_id = 'players' and public.is_admin());

-- =============================================================================
-- DEFAULT SETTINGS
-- =============================================================================
insert into public.site_settings (key, value)
values
  ('banner_interval_seconds', '6'::jsonb),
  ('banner_fade_ms', '1200'::jsonb)
on conflict (key) do update set value = excluded.value;
