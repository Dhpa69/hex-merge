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

-- Account deletion (App Store guideline 5.1.1(v)) – called from the app's "Delete account" button.
-- Deletes the caller's Hex Merge profile. The sign-in (auth user) is deleted too, UNLESS the same Apple ID
-- also has a Star Tiles profile (same Supabase project) – then only the Hex Merge data is removed.
create or replace function public.hexmerge_delete_my_account() returns text
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); keep boolean := false;
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.hexmerge_profiles where id = uid;
  if to_regclass('public.profiles') is not null then
    execute 'select exists(select 1 from public.profiles where id = $1)' into keep using uid;
  end if;
  if keep then return 'profile_deleted'; end if;
  delete from auth.users where id = uid;   -- cascades identities/sessions
  return 'account_deleted';
end $$;
revoke all on function public.hexmerge_delete_my_account() from public, anon;
grant execute on function public.hexmerge_delete_my_account() to authenticated;
grant select, insert, update on public.hexmerge_profiles to authenticated;
