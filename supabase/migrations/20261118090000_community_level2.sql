-- Real Madrid fan community - Level 2
-- Adds one-vote-per-browser reactions and per-post author ownership.
--
-- Safe to re-run. Existing posts are NOT deleted, reset, or given an owner.
-- Apply this file in the Supabase SQL editor BEFORE deploying the new app code.
--
-- public.posts.id type is unknown to the repository (no migration was checked in),
-- so the new tables store post ids as text. The same text value round-trips for
-- uuid, bigint, and text ids. Post existence and visibility are validated inside
-- the functions below, and votes are enforced by a UNIQUE primary key.

begin;

-- 1) Author ownership, kept in its own table so hashes are never part of post reads.
create table if not exists public.post_authors (
  post_id text primary key,
  author_hash text not null,
  created_at timestamptz not null default now()
);

-- 2) One row per post and browser identity. Repeated requests cannot add votes.
create table if not exists public.post_votes (
  post_id text not null,
  voter_hash text not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, voter_hash)
);

create index if not exists post_votes_post_id_idx on public.post_votes (post_id);

-- 3) No public read/write access. Only the server-side secret key is used.
alter table public.post_authors enable row level security;
alter table public.post_votes enable row level security;

revoke all on table public.post_authors from anon, authenticated;
revoke all on table public.post_votes from anon, authenticated;

grant select, insert on table public.post_authors to service_role;
grant select, insert, update, delete on table public.post_votes to service_role;

-- 4) Create a post and record its owner in one transaction.
create or replace function public.create_community_post(
  p_board text,
  p_title text,
  p_body text,
  p_author_hash text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text;
begin
  insert into public.posts (board, title, body, is_hidden)
  values (p_board, p_title, p_body, false)
  returning id::text into new_id;

  insert into public.post_authors (post_id, author_hash)
  values (new_id, p_author_hash)
  on conflict (post_id) do update set author_hash = excluded.author_hash;

  return new_id;
end;
$$;

-- 5) Idempotent final vote state: up / down / none.
--    The aggregate in the response is computed from stored rows, never from input.
create or replace function public.set_community_vote(
  p_post_id text,
  p_voter_hash text,
  p_state text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  vote_up bigint;
  vote_down bigint;
  my_value smallint;
begin
  if p_state not in ('up', 'down', 'none') then
    raise exception 'invalid vote state' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.posts p
    where p.id::text = p_post_id
      and p.is_hidden = false
  ) then
    return jsonb_build_object('found', false);
  end if;

  if p_state = 'none' then
    delete from public.post_votes
    where post_id = p_post_id
      and voter_hash = p_voter_hash;
  else
    insert into public.post_votes (post_id, voter_hash, value)
    values (p_post_id, p_voter_hash, case when p_state = 'up' then 1 else -1 end)
    on conflict (post_id, voter_hash)
    do update set value = excluded.value, updated_at = now();
  end if;

  select
    count(*) filter (where value = 1),
    count(*) filter (where value = -1)
  into vote_up, vote_down
  from public.post_votes
  where post_id = p_post_id;

  select value
  into my_value
  from public.post_votes
  where post_id = p_post_id
    and voter_hash = p_voter_hash;

  return jsonb_build_object(
    'found', true,
    'up', vote_up,
    'down', vote_down,
    'myVote', coalesce(my_value, 0)
  );
end;
$$;

-- 6) Soft delete. Ownership is part of the UPDATE predicate, so a direct API call
--    from another browser cannot hide someone else's post.
create or replace function public.hide_community_post(
  p_post_id text,
  p_author_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.posts p
  set is_hidden = true
  where p.id::text = p_post_id
    and p.is_hidden = false
    and exists (
      select 1
      from public.post_authors a
      where a.post_id = p_post_id
        and a.author_hash = p_author_hash
    );

  return found;
end;
$$;

-- 7) Only the server secret key may call these functions.
revoke all on function public.create_community_post(text, text, text, text) from public;
revoke all on function public.set_community_vote(text, text, text) from public;
revoke all on function public.hide_community_post(text, text) from public;

revoke all on function public.create_community_post(text, text, text, text) from anon, authenticated;
revoke all on function public.set_community_vote(text, text, text) from anon, authenticated;
revoke all on function public.hide_community_post(text, text) from anon, authenticated;

grant execute on function public.create_community_post(text, text, text, text) to service_role;
grant execute on function public.set_community_vote(text, text, text) to service_role;
grant execute on function public.hide_community_post(text, text) to service_role;

commit;
