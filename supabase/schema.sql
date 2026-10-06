create table if not exists public.builds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  spec jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists builds_user_id_idx on public.builds (user_id, created_at desc);

alter table public.builds enable row level security;

drop policy if exists "own builds" on public.builds;
create policy "own builds" on public.builds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
