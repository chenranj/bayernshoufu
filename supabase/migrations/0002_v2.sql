-- Bayernshoufu v2 schema additions
-- Adds: competitions, jerseys.competition_id, jersey_images (multi-photo)
-- Run in Supabase Dashboard → SQL Editor

-- =============================================================================
-- COMPETITIONS
-- =============================================================================
create table if not exists public.competitions (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,            -- e.g. "Bundesliga", "Champions League"
  slug text unique not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists competitions_sort_idx on public.competitions (sort_order, name);

alter table public.competitions enable row level security;

drop policy if exists comps_read on public.competitions;
create policy comps_read on public.competitions
  for select to authenticated using (true);
drop policy if exists comps_admin on public.competitions;
create policy comps_admin on public.competitions
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- JERSEYS: link to competition
-- =============================================================================
alter table public.jerseys
  add column if not exists competition_id uuid references public.competitions(id) on delete set null;
create index if not exists jerseys_competition_idx on public.jerseys (competition_id);

-- =============================================================================
-- JERSEY IMAGES (gallery)
-- =============================================================================
create table if not exists public.jersey_images (
  id uuid primary key default uuid_generate_v4(),
  jersey_id uuid not null references public.jerseys(id) on delete cascade,
  image_path text not null,             -- storage key in 'jerseys' bucket
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists jersey_images_jersey_idx on public.jersey_images (jersey_id, sort_order);

alter table public.jersey_images enable row level security;

drop policy if exists ji_read on public.jersey_images;
create policy ji_read on public.jersey_images for select to authenticated using (true);
drop policy if exists ji_admin on public.jersey_images;
create policy ji_admin on public.jersey_images
  for all using (public.is_admin()) with check (public.is_admin());

-- Backfill: every existing jersey.image_path becomes its primary gallery image
insert into public.jersey_images (jersey_id, image_path, sort_order)
select j.id, j.image_path, 0
from public.jerseys j
where j.image_path is not null
  and not exists (
    select 1 from public.jersey_images ji where ji.jersey_id = j.id
  );
