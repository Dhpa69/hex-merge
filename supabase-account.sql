-- Hex Merge v10: account sync table (Sign in with Apple). Run once in Supabase > SQL Editor. Safe to re-run.
create table if not exists public.hexmerge_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.hexmerge_profiles enable row level security;
drop policy if exists "hm_select_own" on public.hexmerge_profiles;
drop policy if exists "hm_insert_own" on public.hexmerge_profiles;
drop policy if exists "hm_update_own" on public.hexmerge_profiles;
create policy "hm_select_own" on public.hexmerge_profiles for select to authenticated using (auth.uid() = id);
create policy "hm_insert_own" on public.hexmerge_profiles for insert to authenticated with check (auth.uid() = id);
create policy "hm_update_own" on public.hexmerge_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create or replace function public.hexmerge_touch() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists hexmerge_touch on public.hexmerge_profiles;
create trigger hexmerge_touch before update on public.hexmerge_profiles for each row execute function public.hexmerge_touch();
