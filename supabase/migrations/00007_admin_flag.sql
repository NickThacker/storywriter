alter table public.user_settings
  add column if not exists is_admin boolean not null default false;
