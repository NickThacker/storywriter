-- Prompt logs: stores every OpenRouter request for debugging/inspection
create table if not exists public.prompt_logs (
  id          uuid        default gen_random_uuid() primary key,
  created_at  timestamptz default now(),
  user_id     uuid        references auth.users(id) on delete cascade,
  route       text        not null,
  model       text        not null,
  messages    jsonb       not null,
  char_count  integer     not null default 0
);

alter table public.prompt_logs enable row level security;

create policy "Users can view own prompt logs"
  on public.prompt_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own prompt logs"
  on public.prompt_logs for insert
  with check (auth.uid() = user_id);

-- Fast lookup: user's logs newest-first
create index if not exists prompt_logs_user_time_idx
  on public.prompt_logs (user_id, created_at desc);
