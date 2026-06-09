create extension if not exists pgcrypto;

create table if not exists public.app_state (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_state_set_updated_at on public.app_state;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 160),
  project text not null default '' check (char_length(project) <= 80),
  owner text not null default '' check (char_length(owner) <= 80),
  status text not null default 'To Do' check (status in ('To Do', 'In Progress', 'Blocked', 'Done')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  due_date date,
  notes text not null default '' check (char_length(notes) <= 1000),
  remarks text not null default '' check (char_length(remarks) <= 1000),
  attachment_name text,
  attachment_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists attachment_name text,
add column if not exists attachment_path text,
add column if not exists remarks text not null default '';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

create trigger app_state_set_updated_at
before update on public.app_state
for each row
execute function public.set_updated_at();

alter table public.app_state enable row level security;

drop policy if exists "Public can read app state" on public.app_state;
create policy "Public can read app state"
on public.app_state for select
to anon
using (key = 'directory-management');

drop policy if exists "Public can upsert app state" on public.app_state;
create policy "Public can upsert app state"
on public.app_state for insert
to anon
with check (key = 'directory-management');

drop policy if exists "Public can update app state" on public.app_state;
create policy "Public can update app state"
on public.app_state for update
to anon
using (key = 'directory-management')
with check (key = 'directory-management');

alter table public.tasks enable row level security;

drop policy if exists "Public can read tasks" on public.tasks;
create policy "Public can read tasks"
on public.tasks for select
to anon
using (true);

drop policy if exists "Public can create tasks" on public.tasks;
create policy "Public can create tasks"
on public.tasks for insert
to anon
with check (true);

drop policy if exists "Public can update tasks" on public.tasks;
create policy "Public can update tasks"
on public.tasks for update
to anon
using (true)
with check (true);

drop policy if exists "Public can delete tasks" on public.tasks;
create policy "Public can delete tasks"
on public.tasks for delete
to anon
using (true);

insert into storage.buckets (id, name, public, file_size_limit)
values ('task-attachments', 'task-attachments', true, 10485760)
on conflict (id) do update
set public = true,
    file_size_limit = 10485760;

drop policy if exists "Public can read task attachments" on storage.objects;
create policy "Public can read task attachments"
on storage.objects for select
to anon
using (bucket_id = 'task-attachments');

drop policy if exists "Public can upload task attachments" on storage.objects;
create policy "Public can upload task attachments"
on storage.objects for insert
to anon
with check (bucket_id = 'task-attachments');

drop policy if exists "Public can update task attachments" on storage.objects;
create policy "Public can update task attachments"
on storage.objects for update
to anon
using (bucket_id = 'task-attachments')
with check (bucket_id = 'task-attachments');

drop policy if exists "Public can delete task attachments" on storage.objects;
create policy "Public can delete task attachments"
on storage.objects for delete
to anon
using (bucket_id = 'task-attachments');

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end;
$$;
