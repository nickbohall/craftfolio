-- Craftfolio initial schema
-- Tables: craft_types, users, projects, project_photos, materials, project_materials

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- craft_types (seeded lookup table)
-- ============================================================
create table craft_types (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- users
-- ============================================================
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  portfolio_slug text unique,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- projects
-- ============================================================
create table projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  craft_type_id uuid references craft_types(id) on delete set null,
  made_for text,
  date_completed date,
  pattern_source text,
  technique_notes text,
  is_shareable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_user_id on projects(user_id);
create index idx_projects_craft_type_id on projects(craft_type_id);

-- ============================================================
-- project_photos
-- ============================================================
create table project_photos (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  storage_url text not null,
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_project_photos_project_id on project_photos(project_id);

-- ============================================================
-- materials
-- ============================================================
create table materials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  material_type text check (material_type in ('yarn', 'thread/floss', 'fabric', 'resin', 'needle', 'hook', 'other')),
  brand text,
  name text,
  color_name text,
  color_code text,
  dye_lot text,
  fiber_content text,
  yarn_weight text check (yarn_weight in (
    'Lace (0)', 'Fingering (1)', 'Sport (2)', 'DK (3)',
    'Worsted (4)', 'Aran (5)', 'Bulky (6)', 'Super Bulky (7)', 'Jumbo (8)'
  )),
  yardage_per_skein numeric,
  weight_per_skein_grams numeric,
  needle_size_mm numeric,
  needle_size_us text,
  needle_type text check (needle_type in ('straight', 'circular', 'DPN', 'interchangeable', 'crochet hook')),
  needle_material text check (needle_material in ('bamboo', 'metal', 'wood', 'plastic')),
  cable_length_inches numeric,
  notes text,
  is_favorited boolean not null default false,
  quantity_in_stash numeric, -- v2 stash feature, do NOT expose in v1 UI
  created_at timestamptz not null default now()
);

create index idx_materials_user_id on materials(user_id);

-- ============================================================
-- project_materials (join table)
-- ============================================================
create table project_materials (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  material_id uuid not null references materials(id) on delete cascade,
  quantity_used text,
  usage_notes text
);

create index idx_project_materials_project_id on project_materials(project_id);
create index idx_project_materials_material_id on project_materials(material_id);

-- ============================================================
-- Row Level Security
-- ============================================================

-- craft_types: readable by everyone, insertable by authenticated users (custom crafts)
alter table craft_types enable row level security;
create policy "craft_types_select" on craft_types for select using (true);
create policy "craft_types_insert" on craft_types for insert with check (auth.role() = 'authenticated');

-- users: users can read/update their own row
alter table users enable row level security;
create policy "users_select_own" on users for select using (auth.uid() = id);
create policy "users_update_own" on users for update using (auth.uid() = id);
create policy "users_insert_own" on users for insert with check (auth.uid() = id);
-- public profiles for portfolio sharing
create policy "users_select_public" on users for select using (portfolio_slug is not null);

-- projects: owner full access, public read for shareable projects
alter table projects enable row level security;
create policy "projects_owner" on projects for all using (auth.uid() = user_id);
create policy "projects_public_read" on projects for select using (is_shareable = true);

-- project_photos: access follows project access
alter table project_photos enable row level security;
create policy "photos_owner" on project_photos for all
  using (exists (select 1 from projects where projects.id = project_photos.project_id and projects.user_id = auth.uid()));
create policy "photos_public_read" on project_photos for select
  using (exists (select 1 from projects where projects.id = project_photos.project_id and projects.is_shareable = true));

-- materials: owner only
alter table materials enable row level security;
create policy "materials_owner" on materials for all using (auth.uid() = user_id);

-- project_materials: access follows project access
alter table project_materials enable row level security;
create policy "project_materials_owner" on project_materials for all
  using (exists (select 1 from projects where projects.id = project_materials.project_id and projects.user_id = auth.uid()));
create policy "project_materials_public_read" on project_materials for select
  using (exists (select 1 from projects where projects.id = project_materials.project_id and projects.is_shareable = true));

-- ============================================================
-- Auto-update updated_at on projects
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();
