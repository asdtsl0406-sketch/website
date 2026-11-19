begin;

create table if not exists public.scout_player_comments (
  id bigint generated always as identity primary key,
  player_id integer not null check (player_id > 0),
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  is_hidden boolean not null default false
);

create index if not exists scout_player_comments_visible_idx
  on public.scout_player_comments (player_id, created_at desc, id desc) where not is_hidden;

alter table public.scout_player_comments enable row level security;
revoke all on table public.scout_player_comments from public, anon, authenticated;
grant select, insert on table public.scout_player_comments to service_role;
grant usage on sequence public.scout_player_comments_id_seq to service_role;

commit;
