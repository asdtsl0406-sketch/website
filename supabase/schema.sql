-- Run in Supabase SQL Editor before enabling the community.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 24),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_nickname_lower_unique on public.profiles (lower(nickname));

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_site_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.site_admins where user_id = auth.uid()); $$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to anon, authenticated;

create or replace function public.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare requested_nickname text;
begin
  requested_nickname := nullif(btrim(new.raw_user_meta_data ->> 'nickname'), '');
  if requested_nickname is null then
    requested_nickname := 'Madridista-' || left(replace(new.id::text, '-', ''), 8);
  end if;
  insert into public.profiles (id, nickname) values (new.id, requested_nickname)
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.create_profile_for_auth_user();

-- Written only by the server after it confirms the official match lineup.
create table if not exists public.match_participants (
  match_id text not null,
  player_id text not null,
  player_name text not null,
  team_id bigint not null,
  match_date timestamptz not null,
  primary key (match_id, player_id)
);

create table if not exists public.player_ratings (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  player_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, player_id, user_id),
  foreign key (match_id, player_id)
    references public.match_participants(match_id, player_id) on delete cascade
);
create index if not exists player_ratings_match_player_idx on public.player_ratings (match_id, player_id);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  board text not null check (board in ('match_discussion', 'tactics_players', 'free_chat')),
  match_id text,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  body text not null check (char_length(btrim(body)) between 2 and 12000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (board = 'match_discussion' or match_id is null)
);
create index if not exists posts_board_created_idx on public.posts (board, created_at desc);
create index if not exists posts_match_idx on public.posts (match_id) where match_id is not null;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_post_created_idx on public.comments (post_id, created_at);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  reason text not null check (char_length(btrim(reason)) between 2 and 1000),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists content_reports_status_idx on public.content_reports (status, created_at desc);

alter table public.profiles enable row level security;
alter table public.site_admins enable row level security;
alter table public.match_participants enable row level security;
alter table public.player_ratings enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.content_reports enable row level security;

grant select on public.profiles, public.match_participants, public.posts, public.comments to anon, authenticated;
grant update (nickname) on public.profiles to authenticated;
grant select, insert, update, delete on public.player_ratings, public.posts, public.comments to authenticated;
grant insert on public.content_reports to authenticated;
grant select, update on public.content_reports to authenticated;
revoke all on public.site_admins from anon, authenticated;
revoke insert, update, delete on public.match_participants from anon, authenticated;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
drop policy if exists profiles_update_own_nickname on public.profiles;
create policy profiles_update_own_nickname on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists participants_public_read on public.match_participants;
create policy participants_public_read on public.match_participants for select to anon, authenticated using (true);

drop policy if exists ratings_read_own on public.player_ratings;
create policy ratings_read_own on public.player_ratings for select to authenticated using (user_id = auth.uid());
drop policy if exists ratings_insert_verified_participant on public.player_ratings;
create policy ratings_insert_verified_participant on public.player_ratings for insert to authenticated
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.match_participants p
      where p.match_id = player_ratings.match_id and p.player_id = player_ratings.player_id
    )
  );
drop policy if exists ratings_update_own_verified_participant on public.player_ratings;
create policy ratings_update_own_verified_participant on public.player_ratings for update to authenticated
  using (user_id = auth.uid()) with check (
    user_id = auth.uid() and exists (
      select 1 from public.match_participants p
      where p.match_id = player_ratings.match_id and p.player_id = player_ratings.player_id
    )
  );
drop policy if exists ratings_delete_own on public.player_ratings;
create policy ratings_delete_own on public.player_ratings for delete to authenticated using (user_id = auth.uid());

drop policy if exists posts_read_visible_or_owner_admin on public.posts;
create policy posts_read_visible_or_owner_admin on public.posts for select to anon, authenticated
  using (status = 'visible' or author_id = auth.uid() or public.is_site_admin());
drop policy if exists posts_insert_own_visible on public.posts;
create policy posts_insert_own_visible on public.posts for insert to authenticated
  with check (author_id = auth.uid() and status = 'visible');
drop policy if exists posts_update_own_visible on public.posts;
create policy posts_update_own_visible on public.posts for update to authenticated
  using (author_id = auth.uid() and status = 'visible') with check (author_id = auth.uid() and status = 'visible');
drop policy if exists posts_admin_moderate on public.posts;
create policy posts_admin_moderate on public.posts for update to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists posts_delete_own_or_admin on public.posts;
create policy posts_delete_own_or_admin on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_site_admin());

drop policy if exists comments_read_visible_or_owner_admin on public.comments;
create policy comments_read_visible_or_owner_admin on public.comments for select to anon, authenticated
  using (
    (status = 'visible' and exists (
      select 1 from public.posts p where p.id = comments.post_id and p.status = 'visible'
    )) or author_id = auth.uid() or public.is_site_admin()
  );
drop policy if exists comments_insert_own_visible on public.comments;
create policy comments_insert_own_visible on public.comments for insert to authenticated
  with check (
    author_id = auth.uid() and status = 'visible' and exists (
      select 1 from public.posts p where p.id = comments.post_id and p.status = 'visible'
    )
  );
drop policy if exists comments_update_own_visible on public.comments;
create policy comments_update_own_visible on public.comments for update to authenticated
  using (
    author_id = auth.uid() and status = 'visible' and exists (
      select 1 from public.posts p where p.id = comments.post_id and p.status = 'visible'
    )
  ) with check (
    author_id = auth.uid() and status = 'visible' and exists (
      select 1 from public.posts p where p.id = comments.post_id and p.status = 'visible'
    )
  );
drop policy if exists comments_admin_moderate on public.comments;
create policy comments_admin_moderate on public.comments for update to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());
drop policy if exists comments_delete_own_or_admin on public.comments;
create policy comments_delete_own_or_admin on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_site_admin());

drop policy if exists reports_insert_own_visible_target on public.content_reports;
create policy reports_insert_own_visible_target on public.content_reports for insert to authenticated
  with check (
    reporter_id = auth.uid() and (
      (target_type = 'post' and exists (select 1 from public.posts p where p.id = target_id and p.status = 'visible')) or
      (target_type = 'comment' and exists (select 1 from public.comments c where c.id = target_id and c.status = 'visible'))
    )
  );
drop policy if exists reports_admin_read on public.content_reports;
create policy reports_admin_read on public.content_reports for select to authenticated using (public.is_site_admin());
drop policy if exists reports_admin_update on public.content_reports;
create policy reports_admin_update on public.content_reports for update to authenticated
  using (public.is_site_admin()) with check (public.is_site_admin());

create or replace function public.match_rating_summary(p_match_id text)
returns table (player_id text, player_name text, average_score numeric, rating_count bigint)
language sql stable security definer set search_path = ''
as $$
  select r.player_id, p.player_name, round(avg(r.score)::numeric, 2), count(*)
  from public.player_ratings r
  join public.match_participants p using (match_id, player_id)
  where r.match_id = p_match_id
  group by r.player_id, p.player_name
  order by avg(r.score) desc;
$$;
grant execute on function public.match_rating_summary(text) to anon, authenticated;

-- After signup, grant an operator/admin role manually:
-- insert into public.site_admins (user_id) select id from auth.users where email = 'admin@example.com';
