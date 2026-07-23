-- VIDARIX Social Schema
-- Execute no SQL Editor do Supabase depois de criar/configurar o projeto.

create extension if not exists pgcrypto;

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_a, user_b),
  check (user_a <> user_b)
);

create table if not exists public.social_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  category text not null check (category in ('friendship','recommendation','group','comment','message','system')),
  title text not null,
  description text not null,
  target_path text,
  tmdb_id integer,
  media_type text check (media_type in ('movie','tv')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.media_recommendations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  recipient_group_id uuid,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  message text check (char_length(message) <= 500),
  status text not null default 'sent' check (status in ('sent','viewed','saved','watched','dismissed')),
  created_at timestamptz not null default now(),
  check ((recipient_user_id is not null) <> (recipient_group_id is not null))
);

create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 80),
  description text not null default '',
  cover_url text,
  privacy text not null default 'public' check (privacy in ('public','private')),
  linked_tmdb_id integer,
  linked_media_type text check (linked_media_type in ('movie','tv')),
  created_at timestamptz not null default now()
);

alter table public.media_recommendations
  drop constraint if exists media_recommendations_recipient_group_id_fkey;
alter table public.media_recommendations
  add constraint media_recommendations_recipient_group_id_fkey
  foreign key (recipient_group_id) references public.community_groups(id) on delete cascade;

create table if not exists public.group_members (
  group_id uuid not null references public.community_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','moderator','member')),
  status text not null default 'active' check (status in ('pending','active','banned')),
  joined_at timestamptz not null default now(),
  primary key(group_id, user_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  group_id uuid references public.community_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  tmdb_id integer,
  media_type text check (media_type in ('movie','tv')),
  spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  check ((conversation_id is not null) <> (group_id is not null))
);

create table if not exists public.group_watchlist (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.community_groups(id) on delete cascade,
  added_by uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  created_at timestamptz not null default now(),
  unique(group_id, tmdb_id, media_type)
);

create table if not exists public.title_discussions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie','tv')),
  kind text not null default 'comment' check (kind in ('comment','chat','theory','review')),
  body text not null check (char_length(body) between 1 and 4000),
  spoiler boolean not null default false,
  rating numeric(3,1) check (rating between 1 and 10),
  parent_id uuid references public.title_discussions(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.discussion_reactions (
  discussion_id uuid not null references public.title_discussions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  primary key(discussion_id, user_id, reaction)
);

create table if not exists public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  discussion_id uuid references public.title_discussions(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- RLS
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.social_notifications enable row level security;
alter table public.media_recommendations enable row level security;
alter table public.community_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.group_watchlist enable row level security;
alter table public.title_discussions enable row level security;
alter table public.discussion_reactions enable row level security;
alter table public.social_reports enable row level security;

create policy "friend requests visible to participants" on public.friend_requests
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "users create their friend requests" on public.friend_requests
  for insert with check (auth.uid() = sender_id);
create policy "receiver updates friend request" on public.friend_requests
  for update using (auth.uid() = receiver_id or auth.uid() = sender_id);

create policy "friendships visible to participants" on public.friendships
  for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "notifications visible to owner" on public.social_notifications
  for select using (auth.uid() = user_id);
create policy "notifications updated by owner" on public.social_notifications
  for update using (auth.uid() = user_id);

create policy "recommendations visible to sender or recipient" on public.media_recommendations
  for select using (
    auth.uid() = sender_id or auth.uid() = recipient_user_id or
    exists(select 1 from public.group_members gm where gm.group_id = recipient_group_id and gm.user_id = auth.uid() and gm.status = 'active')
  );
create policy "users send recommendations" on public.media_recommendations
  for insert with check (auth.uid() = sender_id);
create policy "recipient updates recommendation" on public.media_recommendations
  for update using (auth.uid() = recipient_user_id or auth.uid() = sender_id);

create policy "public groups or members can view groups" on public.community_groups
  for select using (
    privacy = 'public' or owner_id = auth.uid() or
    exists(select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid() and gm.status = 'active')
  );
create policy "authenticated users create groups" on public.community_groups
  for insert with check (auth.uid() = owner_id);
create policy "owners update groups" on public.community_groups
  for update using (auth.uid() = owner_id);

create policy "group members visible to allowed users" on public.group_members
  for select using (
    user_id = auth.uid() or
    exists(select 1 from public.community_groups g where g.id = group_id and (g.privacy = 'public' or g.owner_id = auth.uid())) or
    exists(select 1 from public.group_members self where self.group_id = group_id and self.user_id = auth.uid() and self.status = 'active')
  );
create policy "users request group membership" on public.group_members
  for insert with check (auth.uid() = user_id);
create policy "users leave groups" on public.group_members
  for delete using (auth.uid() = user_id or exists(select 1 from public.community_groups g where g.id = group_id and g.owner_id = auth.uid()));

create policy "conversation visible to members" on public.conversations
  for select using (exists(select 1 from public.conversation_members cm where cm.conversation_id = id and cm.user_id = auth.uid()));
create policy "conversation members visible to members" on public.conversation_members
  for select using (exists(select 1 from public.conversation_members self where self.conversation_id = conversation_id and self.user_id = auth.uid()));

create policy "messages visible to conversation or group members" on public.messages
  for select using (
    (conversation_id is not null and exists(select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())) or
    (group_id is not null and exists(select 1 from public.group_members gm where gm.group_id = messages.group_id and gm.user_id = auth.uid() and gm.status = 'active'))
  );
create policy "members send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and (
      (conversation_id is not null and exists(select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())) or
      (group_id is not null and exists(select 1 from public.group_members gm where gm.group_id = messages.group_id and gm.user_id = auth.uid() and gm.status = 'active'))
    )
  );

create policy "group watchlist visible to members" on public.group_watchlist
  for select using (exists(select 1 from public.group_members gm where gm.group_id = group_watchlist.group_id and gm.user_id = auth.uid() and gm.status = 'active'));
create policy "group members add titles" on public.group_watchlist
  for insert with check (auth.uid() = added_by and exists(select 1 from public.group_members gm where gm.group_id = group_watchlist.group_id and gm.user_id = auth.uid() and gm.status = 'active'));

create policy "title discussions publicly readable" on public.title_discussions
  for select using (true);
create policy "authenticated users create discussions" on public.title_discussions
  for insert with check (auth.uid() = author_id);
create policy "authors update discussions" on public.title_discussions
  for update using (auth.uid() = author_id);
create policy "authors delete discussions" on public.title_discussions
  for delete using (auth.uid() = author_id);

create policy "reactions publicly readable" on public.discussion_reactions
  for select using (true);
create policy "users manage own reactions" on public.discussion_reactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users create reports" on public.social_reports
  for insert with check (auth.uid() = reporter_id);
create policy "users see own reports" on public.social_reports
  for select using (auth.uid() = reporter_id);

-- Enable Realtime for chat and notifications.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.social_notifications;
alter publication supabase_realtime add table public.title_discussions;
