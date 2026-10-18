-- Hex Merge global leaderboard. Run once in the Supabase SQL Editor (same project as Star Tiles).
-- Until this runs, the in-game leaderboard shows your own best scores only.
create table if not exists public.hex_scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  week text not null, day date,
  mode text not null check (mode in ('ai','daily','online','team')),
  level text, score int not null check (score >= 0 and score <= 1000000),
  name text not null, device_id text not null);
create index if not exists hex_scores_week on public.hex_scores(week, mode, score desc);
create index if not exists hex_scores_day on public.hex_scores(day, score desc);
alter table public.hex_scores enable row level security;
drop policy if exists "hex_scores_read" on public.hex_scores;
create policy "hex_scores_read" on public.hex_scores for select to anon, authenticated using (true);
revoke insert, update, delete on public.hex_scores from anon, authenticated;
create or replace function public.submit_hex_score(p_mode text, p_level text, p_score int, p_name text, p_device text, p_day date default null)
returns void language plpgsql security definer set search_path = public as $$
declare w text := to_char(now() at time zone 'utc', 'IYYY-"W"IW');
begin
  if length(coalesce(p_device,'')) < 8 or p_score < 0 or p_score > 1000000 then raise exception 'bad score'; end if;
  if p_mode = 'daily' and exists(select 1 from hex_scores where device_id=p_device and day=p_day) then return; end if;
  if (select count(*) from hex_scores where device_id=p_device and week=w) >= 40 then return; end if;
  insert into hex_scores(week, day, mode, level, score, name, device_id)
  values (w, case when p_mode='daily' then p_day end, p_mode, left(p_level,12), p_score, left(coalesce(nullif(trim(p_name),''),'Player'),20), p_device);
end $$;
grant execute on function public.submit_hex_score(text,text,int,text,text,date) to anon, authenticated;
