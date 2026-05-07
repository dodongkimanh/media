-- ============================================================
-- KIMANH — Supabase Schema
-- Run this in Supabase SQL Editor (Settings → SQL Editor)
-- ============================================================

-- Enable UUID
create extension if not exists "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  avatar_color text default '#1D9E75',
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can insert profiles" on public.profiles for insert with check (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'staff')
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── CATEGORIES ────────────────────────────────────────────
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text default '',
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.categories enable row level security;
create policy "Everyone can read categories" on public.categories for select using (true);
create policy "Admins manage categories" on public.categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── PRODUCTS ──────────────────────────────────────────────
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text default '',
  category_id uuid references public.categories(id) on delete set null,
  unit text default '',
  price_listed numeric default 0,
  discount_pct numeric default 0 check (discount_pct >= 0 and discount_pct <= 100),
  price_final numeric generated always as (
    round(price_listed * (1 - discount_pct / 100))
  ) stored,
  status text default 'active' check (status in ('active', 'draft', 'out')),
  description text default '',
  images jsonb default '[]',
  videos jsonb default '[]',
  feedback_media jsonb default '[]',
  related_media jsonb default '[]',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.products enable row level security;
create policy "Everyone can read products" on public.products for select using (true);
create policy "Admins manage products" on public.products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Product specs
create table public.product_specs (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade not null,
  spec_name text not null,
  height text default '',
  weight text default '',
  price text default '',
  sort_order int default 0
);
alter table public.product_specs enable row level security;
create policy "Everyone can read specs" on public.product_specs for select using (true);
create policy "Admins manage specs" on public.product_specs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── MESSAGES (CHAT) ───────────────────────────────────────
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Authenticated users can read messages" on public.messages for select using (auth.uid() is not null);
create policy "Authenticated users can insert messages" on public.messages for insert with check (auth.uid() = user_id);

-- Realtime for messages
alter publication supabase_realtime add table public.messages;

-- ── ARTICLES (KNOWLEDGE) ──────────────────────────────────
create table public.articles (
  id uuid primary key default uuid_generate_v4(),
  type text not null default 'policy' check (type in ('policy', 'product', 'training')),
  title text not null,
  content text default '',
  images jsonb default '[]',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.articles enable row level security;
create policy "Authenticated can read articles" on public.articles for select using (auth.uid() is not null);
create policy "Admins manage articles" on public.articles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── QUIZZES ───────────────────────────────────────────────
create table public.quizzes (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  time_limit int default 30,
  pass_score int default 70,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.quizzes enable row level security;
create policy "Authenticated can read quizzes" on public.quizzes for select using (auth.uid() is not null);
create policy "Admins manage quizzes" on public.quizzes for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create table public.quiz_questions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  question text not null,
  options jsonb not null default '[]',
  correct_index int not null default 0,
  sort_order int default 0
);
alter table public.quiz_questions enable row level security;
create policy "Authenticated can read questions" on public.quiz_questions for select using (auth.uid() is not null);
create policy "Admins manage questions" on public.quiz_questions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create table public.quiz_assignments (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  assigned_at timestamptz default now(),
  unique(quiz_id, user_id)
);
alter table public.quiz_assignments enable row level security;
create policy "Users can read own assignments" on public.quiz_assignments for select using (auth.uid() = user_id);
create policy "Admins can read all assignments" on public.quiz_assignments for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins manage assignments" on public.quiz_assignments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create table public.quiz_submissions (
  id uuid primary key default uuid_generate_v4(),
  quiz_id uuid references public.quizzes(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  score int not null default 0,
  total int not null default 0,
  answers jsonb default '[]',
  submitted_at timestamptz default now()
);
alter table public.quiz_submissions enable row level security;
create policy "Users can read own submissions" on public.quiz_submissions for select using (auth.uid() = user_id);
create policy "Users can insert own submissions" on public.quiz_submissions for insert with check (auth.uid() = user_id);
create policy "Admins can read all submissions" on public.quiz_submissions for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── MEDIA ALBUMS ──────────────────────────────────────────
create table public.media_albums (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text default '',
  category text default 'tonghop' check (category in ('xuong', 'feedback', 'tonghop')),
  cover_url text default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.media_albums enable row level security;
create policy "Authenticated can read albums" on public.media_albums for select using (auth.uid() is not null);
create policy "Admins manage albums" on public.media_albums for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create table public.media_items (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid references public.media_albums(id) on delete cascade not null,
  url text not null,
  type text not null default 'image' check (type in ('image', 'video')),
  caption text default '',
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.media_items enable row level security;
create policy "Authenticated can read media items" on public.media_items for select using (auth.uid() is not null);
create policy "Admins manage media items" on public.media_items for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── STORAGE BUCKETS ───────────────────────────────────────
-- Run separately in Supabase Storage UI or via API:
-- Bucket: "media" (public)
-- Bucket: "products" (public)
-- Bucket: "articles" (public)

insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('products', 'products', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('articles', 'articles', true) on conflict do nothing;

create policy "Public read media" on storage.objects for select using (bucket_id in ('media','products','articles'));
create policy "Auth upload media" on storage.objects for insert with check (auth.uid() is not null and bucket_id in ('media','products','articles'));
create policy "Auth delete media" on storage.objects for delete using (auth.uid() is not null and bucket_id in ('media','products','articles'));
