begin;

-- A fan comment has no player ID. An MVP ballot has a player ID and an optional comment.
create table if not exists public.community_match_entries (
  id bigint generated always as identity primary key,
  match_id bigint not null check (match_id > 0),
  voter_hash text not null check (length(voter_hash) = 64),
  player_id text check (player_id ~ '^[1-9][0-9]{0,9}$'),
  body text check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  check (player_id is not null or body is not null)
);
create unique index if not exists community_match_one_ballot
  on public.community_match_entries (match_id, voter_hash) where player_id is not null;
create index if not exists community_match_discussion_by_time
  on public.community_match_entries (match_id, created_at desc, id desc) where body is not null;

alter table public.community_match_entries enable row level security;
revoke all on public.community_match_entries from public, anon, authenticated;
grant select, insert, update on public.community_match_entries to service_role;
grant usage on sequence public.community_match_entries_id_seq to service_role;

create or replace function public.read_community_match(p_match_id bigint, p_voter_hash text)
returns jsonb language sql stable set search_path = public as $$
  with ballot as (select player_id from community_match_entries
    where match_id = p_match_id and voter_hash = p_voter_hash and player_id is not null)
  select jsonb_build_object(
    'myVote', (select player_id from ballot),
    'votes', case when exists (select 1 from ballot) then coalesce((select jsonb_object_agg(player_id, amount) from (
      select player_id, count(*) as amount from community_match_entries
      where match_id = p_match_id and player_id is not null group by player_id
    ) v), '{}'::jsonb) else '{}'::jsonb end,
    'comments', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc, c.id desc) from (
      select id, body, player_id, created_at from community_match_entries
      where match_id = p_match_id and body is not null order by created_at desc, id desc limit 30
    ) c), '[]'::jsonb)
  );
$$;

create or replace function public.write_community_match(p_match_id bigint, p_voter_hash text, p_player_id text, p_body text)
returns void language sql volatile set search_path = public as $$
  insert into community_match_entries(match_id, voter_hash, player_id, body)
  values (p_match_id, p_voter_hash, p_player_id, p_body)
  on conflict (match_id, voter_hash) where player_id is not null do update
  set player_id = excluded.player_id, body = excluded.body, created_at = now();
$$;

revoke all on function public.read_community_match(bigint, text) from public, anon, authenticated;
revoke all on function public.write_community_match(bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.read_community_match(bigint, text) to service_role;
grant execute on function public.write_community_match(bigint, text, text, text) to service_role;

commit;
