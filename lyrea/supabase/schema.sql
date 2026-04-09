-- Run this in your Supabase SQL editor

-- Projects table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  url text,
  language text default 'English',
  industry text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Articles table
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  title text,
  content text default '',
  keyword text,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Brand voices table
create table public.brand_voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  description text,
  tone_attributes text[] default '{}',
  words_to_use text[] default '{}',
  words_to_avoid text[] default '{}',
  target_audience text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.projects enable row level security;
alter table public.articles enable row level security;
alter table public.brand_voices enable row level security;

-- RLS Policies: users can only access their own data
create policy "Users own their projects"
  on public.projects for all
  using (auth.uid() = user_id);

create policy "Users own their articles"
  on public.articles for all
  using (auth.uid() = user_id);

create policy "Users own their brand voices"
  on public.brand_voices for all
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at before update on public.projects
  for each row execute function update_updated_at();

create trigger articles_updated_at before update on public.articles
  for each row execute function update_updated_at();

create trigger brand_voices_updated_at before update on public.brand_voices
  for each row execute function update_updated_at();
