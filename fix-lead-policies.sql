-- Cập nhật RLS policies để role 'lead' có đủ quyền quản lý
-- Chạy file này trong Supabase → SQL Editor
-- An toàn: chỉ cập nhật policies, KHÔNG xóa dữ liệu

-- profiles
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (
  auth.uid() = id
  or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles" on public.profiles for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- categories
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- products
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- product_specs
drop policy if exists "Admins manage specs" on public.product_specs;
create policy "Admins manage specs" on public.product_specs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- articles
drop policy if exists "Admins manage articles" on public.articles;
create policy "Admins manage articles" on public.articles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- quizzes
drop policy if exists "Admins manage quizzes" on public.quizzes;
create policy "Admins manage quizzes" on public.quizzes for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- quiz_questions
drop policy if exists "Admins manage questions" on public.quiz_questions;
create policy "Admins manage questions" on public.quiz_questions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- quiz_assignments
drop policy if exists "Admins can read all assignments" on public.quiz_assignments;
create policy "Admins can read all assignments" on public.quiz_assignments for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

drop policy if exists "Admins manage assignments" on public.quiz_assignments;
create policy "Admins manage assignments" on public.quiz_assignments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- quiz_submissions
drop policy if exists "Admins can read all submissions" on public.quiz_submissions;
create policy "Admins can read all submissions" on public.quiz_submissions for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- media_albums
drop policy if exists "Admins manage albums" on public.media_albums;
create policy "Admins manage albums" on public.media_albums for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- media_items
drop policy if exists "Admins manage media items" on public.media_items;
create policy "Admins manage media items" on public.media_items for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead'))
);

-- storage objects (cho phép mọi user đã đăng nhập upload/xóa)
drop policy if exists "Auth upload media" on storage.objects;
create policy "Auth upload media" on storage.objects for insert with check (
  auth.uid() is not null and bucket_id in ('media', 'products', 'articles')
);

drop policy if exists "Auth delete media" on storage.objects;
create policy "Auth delete media" on storage.objects for delete using (
  auth.uid() is not null and bucket_id in ('media', 'products', 'articles')
);
