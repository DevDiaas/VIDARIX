-- ====================================================================
-- VIDARIX — SOCIAL BACKEND
-- Amizades, conversas, mensagens, grupos, recomendações,
-- notificações e discussões por título.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. SOLICITAÇÕES DE AMIZADE
-- --------------------------------------------------------------------

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_different_users
    check (sender_id <> receiver_id)
);

create unique index friend_requests_one_pending_pair
on public.friend_requests (
  least(sender_id, receiver_id),
  greatest(sender_id, receiver_id)
)
where status = 'pending';

create index friend_requests_sender_idx
on public.friend_requests (sender_id, status, created_at desc);

create index friend_requests_receiver_idx
on public.friend_requests (receiver_id, status, created_at desc);


-- --------------------------------------------------------------------
-- 2. AMIZADES CONFIRMADAS
-- Cada amizade é armazenada uma única vez, em ordem crescente de UUID.
-- --------------------------------------------------------------------

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_different_users
    check (user_a_id <> user_b_id),
  constraint friendships_ordered_users
    check (user_a_id < user_b_id),
  constraint friendships_unique_pair
    unique (user_a_id, user_b_id)
);

create index friendships_user_a_idx
on public.friendships (user_a_id, created_at desc);

create index friendships_user_b_idx
on public.friendships (user_b_id, created_at desc);


-- --------------------------------------------------------------------
-- 3. CONVERSAS PARTICULARES
-- --------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct'
    check (kind in ('direct')),
  direct_key text unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  user_id uuid not null
    references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  archived boolean not null default false,
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_idx
on public.conversation_participants (user_id, archived, joined_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  sender_id uuid not null
    references public.profiles(id) on delete cascade,
  body text,
  media_data jsonb,
  spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_have_content
    check (
      nullif(btrim(coalesce(body, '')), '') is not null
      or media_data is not null
    )
);

create index messages_conversation_created_idx
on public.messages (conversation_id, created_at desc);

create index messages_sender_idx
on public.messages (sender_id, created_at desc);


-- --------------------------------------------------------------------
-- 4. GRUPOS E MEMBROS
-- --------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 80),
  description text,
  cover_url text,
  privacy text not null default 'public'
    check (privacy in ('public', 'private')),
  linked_media jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index groups_owner_idx
on public.groups (owner_id, created_at desc);

create index groups_privacy_idx
on public.groups (privacy, created_at desc);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  status text not null default 'active'
    check (status in ('pending', 'active', 'blocked')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx
on public.group_members (user_id, status, joined_at desc);

create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  media_data jsonb,
  spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint group_messages_have_content
    check (
      nullif(btrim(coalesce(body, '')), '') is not null
      or media_data is not null
    )
);

create index group_messages_group_created_idx
on public.group_messages (group_id, created_at desc);

create table public.group_watchlist (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  added_by uuid not null references public.profiles(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  media_data jsonb,
  created_at timestamptz not null default now(),
  unique (group_id, tmdb_id, media_type)
);

create index group_watchlist_group_idx
on public.group_watchlist (group_id, created_at desc);


-- --------------------------------------------------------------------
-- 5. RECOMENDAÇÕES
-- --------------------------------------------------------------------

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid references public.profiles(id) on delete cascade,
  recipient_group_id uuid references public.groups(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  title text not null,
  poster_path text,
  media_data jsonb,
  message text,
  status text not null default 'sent'
    check (status in ('sent', 'viewed', 'saved', 'dismissed')),
  created_at timestamptz not null default now(),
  viewed_at timestamptz,
  constraint recommendations_one_recipient
    check (
      (recipient_user_id is not null and recipient_group_id is null)
      or
      (recipient_user_id is null and recipient_group_id is not null)
    ),
  constraint recommendations_not_to_self
    check (
      recipient_user_id is null
      or sender_id <> recipient_user_id
    )
);

create index recommendations_sender_idx
on public.recommendations (sender_id, created_at desc);

create index recommendations_recipient_user_idx
on public.recommendations (recipient_user_id, status, created_at desc)
where recipient_user_id is not null;

create index recommendations_recipient_group_idx
on public.recommendations (recipient_group_id, created_at desc)
where recipient_group_id is not null;


-- --------------------------------------------------------------------
-- 6. NOTIFICAÇÕES
-- --------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  category text not null
    check (
      category in (
        'friendship',
        'message',
        'group',
        'recommendation',
        'system'
      )
    ),
  title text not null,
  description text not null,
  target_path text,
  related_id uuid,
  media_data jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_read_idx
on public.notifications (user_id, read, created_at desc);


-- --------------------------------------------------------------------
-- 7. DISCUSSÕES POR FILME OU SÉRIE
-- --------------------------------------------------------------------

create table public.title_discussions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie', 'tv')),
  kind text not null default 'comment'
    check (kind in ('comment', 'chat', 'theory', 'review')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  rating numeric check (rating is null or (rating >= 0 and rating <= 10)),
  parent_id uuid references public.title_discussions(id) on delete cascade,
  spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index title_discussions_media_idx
on public.title_discussions (tmdb_id, media_type, created_at desc);

create index title_discussions_user_idx
on public.title_discussions (user_id, created_at desc);

create table public.discussion_likes (
  discussion_id uuid not null
    references public.title_discussions(id) on delete cascade,
  user_id uuid not null
    references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (discussion_id, user_id)
);


-- --------------------------------------------------------------------
-- 8. FUNÇÕES AUXILIARES DE AUTORIZAÇÃO
-- --------------------------------------------------------------------

create or replace function public.are_friends(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships
    where
      (user_a_id = least(first_user_id, second_user_id)
       and user_b_id = greatest(first_user_id, second_user_id))
  );
$$;

create or replace function public.is_conversation_participant(
  target_conversation_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_participants
    where conversation_id = target_conversation_id
      and user_id = target_user_id
  );
$$;

create or replace function public.is_group_member(
  target_group_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = target_user_id
      and status = 'active'
  );
$$;

create or replace function public.is_group_admin(
  target_group_id uuid,
  target_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = target_user_id
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public;
revoke all on function public.is_conversation_participant(uuid, uuid) from public;
revoke all on function public.is_group_member(uuid, uuid) from public;
revoke all on function public.is_group_admin(uuid, uuid) from public;

grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_admin(uuid, uuid) to authenticated;


-- --------------------------------------------------------------------
-- 9. FUNÇÕES E TRIGGERS DE NEGÓCIO
-- --------------------------------------------------------------------

create trigger friend_requests_set_updated_at
before update on public.friend_requests
for each row execute function public.handle_updated_at();

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.handle_updated_at();

create trigger groups_set_updated_at
before update on public.groups
for each row execute function public.handle_updated_at();

create trigger title_discussions_set_updated_at
before update on public.title_discussions
for each row execute function public.handle_updated_at();


-- Aceitar uma solicitação cria automaticamente a amizade.
create or replace function public.handle_friend_request_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ordered_user_a uuid;
  ordered_user_b uuid;
begin
  if new.status <> old.status then
    new.responded_at := now();

    if new.status = 'accepted' then
      ordered_user_a := least(new.sender_id, new.receiver_id);
      ordered_user_b := greatest(new.sender_id, new.receiver_id);

      insert into public.friendships (user_a_id, user_b_id)
      values (ordered_user_a, ordered_user_b)
      on conflict (user_a_id, user_b_id) do nothing;

      insert into public.notifications (
        user_id,
        actor_id,
        category,
        title,
        description,
        target_path,
        related_id
      )
      values (
        new.sender_id,
        new.receiver_id,
        'friendship',
        'Pedido de amizade aceito',
        'Seu pedido de amizade foi aceito.',
        '/comunidade?tab=friends',
        new.id
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger friend_requests_after_status
before update of status on public.friend_requests
for each row
execute function public.handle_friend_request_status();


-- Nova solicitação gera notificação.
create or replace function public.notify_new_friend_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (
    user_id,
    actor_id,
    category,
    title,
    description,
    target_path,
    related_id
  )
  values (
    new.receiver_id,
    new.sender_id,
    'friendship',
    'Novo pedido de amizade',
    'Você recebeu um novo pedido de amizade.',
    '/comunidade?tab=friends',
    new.id
  );

  return new;
end;
$$;

create trigger friend_requests_after_insert
after insert on public.friend_requests
for each row
execute function public.notify_new_friend_request();


-- Ao criar um grupo, o dono entra automaticamente como owner.
create or replace function public.add_group_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (
    group_id,
    user_id,
    role,
    status
  )
  values (
    new.id,
    new.owner_id,
    'owner',
    'active'
  )
  on conflict (group_id, user_id) do update
  set role = 'owner',
      status = 'active';

  return new;
end;
$$;

create trigger groups_after_insert
after insert on public.groups
for each row
execute function public.add_group_owner_as_member();


-- Atualiza a ordem da conversa quando uma mensagem é enviada.
create or replace function public.touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  insert into public.notifications (
    user_id,
    actor_id,
    category,
    title,
    description,
    target_path,
    related_id
  )
  select
    participant.user_id,
    new.sender_id,
    'message',
    'Nova mensagem',
    'Você recebeu uma nova mensagem particular.',
    '/comunidade?tab=messages',
    new.conversation_id
  from public.conversation_participants as participant
  where participant.conversation_id = new.conversation_id
    and participant.user_id <> new.sender_id;

  return new;
end;
$$;

create trigger messages_after_insert
after insert on public.messages
for each row
execute function public.touch_conversation_after_message();


-- Atualiza o grupo quando recebe mensagem.
create or replace function public.touch_group_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.groups
  set updated_at = now()
  where id = new.group_id;

  return new;
end;
$$;

create trigger group_messages_after_insert
after insert on public.group_messages
for each row
execute function public.touch_group_after_message();


-- Recomendações geram notificações.
create or replace function public.notify_new_recommendation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.recipient_user_id is not null then
    insert into public.notifications (
      user_id,
      actor_id,
      category,
      title,
      description,
      target_path,
      related_id,
      media_data
    )
    values (
      new.recipient_user_id,
      new.sender_id,
      'recommendation',
      'Nova recomendação',
      'Você recebeu uma nova recomendação de filme ou série.',
      '/comunidade?tab=recommendations',
      new.id,
      coalesce(
        new.media_data,
        jsonb_build_object(
          'id', new.tmdb_id,
          'media_type', new.media_type,
          'title', new.title,
          'poster_path', new.poster_path
        )
      )
    );
  elsif new.recipient_group_id is not null then
    insert into public.notifications (
      user_id,
      actor_id,
      category,
      title,
      description,
      target_path,
      related_id,
      media_data
    )
    select
      member.user_id,
      new.sender_id,
      'recommendation',
      'Nova recomendação no grupo',
      'Um novo título foi recomendado em um dos seus grupos.',
      '/comunidade?tab=groups',
      new.id,
      coalesce(
        new.media_data,
        jsonb_build_object(
          'id', new.tmdb_id,
          'media_type', new.media_type,
          'title', new.title,
          'poster_path', new.poster_path
        )
      )
    from public.group_members as member
    where member.group_id = new.recipient_group_id
      and member.status = 'active'
      and member.user_id <> new.sender_id;
  end if;

  return new;
end;
$$;

create trigger recommendations_after_insert
after insert on public.recommendations
for each row
execute function public.notify_new_recommendation();


-- Cria ou devolve uma conversa particular entre dois amigos.
create or replace function public.get_or_create_direct_conversation(
  other_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  conversation_key text;
  target_conversation_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if current_user_id = other_user_id then
    raise exception 'Não é possível criar uma conversa consigo mesmo.';
  end if;

  if not public.are_friends(current_user_id, other_user_id) then
    raise exception 'A conversa particular exige uma amizade confirmada.';
  end if;

  conversation_key :=
    least(current_user_id::text, other_user_id::text)
    || ':'
    || greatest(current_user_id::text, other_user_id::text);

  insert into public.conversations (
    kind,
    direct_key,
    created_by
  )
  values (
    'direct',
    conversation_key,
    current_user_id
  )
  on conflict (direct_key) do update
  set direct_key = excluded.direct_key
  returning id into target_conversation_id;

  insert into public.conversation_participants (
    conversation_id,
    user_id
  )
  values
    (target_conversation_id, current_user_id),
    (target_conversation_id, other_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return target_conversation_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid)
to authenticated;


-- --------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
-- --------------------------------------------------------------------

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.group_watchlist enable row level security;
alter table public.recommendations enable row level security;
alter table public.notifications enable row level security;
alter table public.title_discussions enable row level security;
alter table public.discussion_likes enable row level security;


-- FRIEND REQUESTS
create policy "Friend requests visible to participants"
on public.friend_requests
for select
to authenticated
using (
  (select auth.uid()) = sender_id
  or (select auth.uid()) = receiver_id
);

create policy "Users can send friend requests"
on public.friend_requests
for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and sender_id <> receiver_id
  and not public.are_friends(sender_id, receiver_id)
);

create policy "Receivers can answer pending friend requests"
on public.friend_requests
for update
to authenticated
using (
  (select auth.uid()) = receiver_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = receiver_id
  and status in ('accepted', 'rejected')
);

create policy "Senders can cancel pending friend requests"
on public.friend_requests
for update
to authenticated
using (
  (select auth.uid()) = sender_id
  and status = 'pending'
)
with check (
  (select auth.uid()) = sender_id
  and status = 'cancelled'
);


-- FRIENDSHIPS
create policy "Friendships visible to participants"
on public.friendships
for select
to authenticated
using (
  (select auth.uid()) = user_a_id
  or (select auth.uid()) = user_b_id
);

create policy "Friends can remove friendship"
on public.friendships
for delete
to authenticated
using (
  (select auth.uid()) = user_a_id
  or (select auth.uid()) = user_b_id
);


-- CONVERSATIONS
create policy "Conversations visible to participants"
on public.conversations
for select
to authenticated
using (
  public.is_conversation_participant(id, (select auth.uid()))
);

create policy "Participants can update conversation state"
on public.conversations
for update
to authenticated
using (
  public.is_conversation_participant(id, (select auth.uid()))
)
with check (
  public.is_conversation_participant(id, (select auth.uid()))
);


-- CONVERSATION PARTICIPANTS
create policy "Conversation participants visible to members"
on public.conversation_participants
for select
to authenticated
using (
  public.is_conversation_participant(
    conversation_id,
    (select auth.uid())
  )
);

create policy "Users can update own conversation membership"
on public.conversation_participants
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);


-- MESSAGES
create policy "Messages visible to conversation participants"
on public.messages
for select
to authenticated
using (
  public.is_conversation_participant(
    conversation_id,
    (select auth.uid())
  )
);

create policy "Participants can send messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_conversation_participant(
    conversation_id,
    (select auth.uid())
  )
);

create policy "Senders can edit own messages"
on public.messages
for update
to authenticated
using (
  sender_id = (select auth.uid())
)
with check (
  sender_id = (select auth.uid())
);

create policy "Senders can delete own messages"
on public.messages
for delete
to authenticated
using (
  sender_id = (select auth.uid())
);


-- GROUPS
create policy "Public groups and member groups are visible"
on public.groups
for select
to authenticated
using (
  privacy = 'public'
  or public.is_group_member(id, (select auth.uid()))
);

create policy "Authenticated users can create groups"
on public.groups
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
);

create policy "Group owners can update groups"
on public.groups
for update
to authenticated
using (
  owner_id = (select auth.uid())
)
with check (
  owner_id = (select auth.uid())
);

create policy "Group owners can delete groups"
on public.groups
for delete
to authenticated
using (
  owner_id = (select auth.uid())
);


-- GROUP MEMBERS
create policy "Group membership visible to group members"
on public.group_members
for select
to authenticated
using (
  public.is_group_member(group_id, (select auth.uid()))
  or exists (
    select 1
    from public.groups
    where public.groups.id = group_id
      and public.groups.privacy = 'public'
  )
);

create policy "Users can join public groups"
on public.group_members
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role = 'member'
  and status = 'active'
  and exists (
    select 1
    from public.groups
    where public.groups.id = group_id
      and public.groups.privacy = 'public'
  )
);

create policy "Group admins can add or invite members"
on public.group_members
for insert
to authenticated
with check (
  public.is_group_admin(group_id, (select auth.uid()))
  and role in ('admin', 'member')
);

create policy "Users can accept own group invitation"
on public.group_members
for update
to authenticated
using (
  user_id = (select auth.uid())
  and status = 'pending'
)
with check (
  user_id = (select auth.uid())
  and status = 'active'
  and role = 'member'
);

create policy "Group admins can update members"
on public.group_members
for update
to authenticated
using (
  public.is_group_admin(group_id, (select auth.uid()))
)
with check (
  public.is_group_admin(group_id, (select auth.uid()))
);

create policy "Members can leave groups"
on public.group_members
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and role <> 'owner'
);

create policy "Group admins can remove non-owner members"
on public.group_members
for delete
to authenticated
using (
  public.is_group_admin(group_id, (select auth.uid()))
  and role <> 'owner'
);


-- GROUP MESSAGES
create policy "Group messages visible to active members"
on public.group_messages
for select
to authenticated
using (
  public.is_group_member(group_id, (select auth.uid()))
);

create policy "Active members can send group messages"
on public.group_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_group_member(group_id, (select auth.uid()))
);

create policy "Users can edit own group messages"
on public.group_messages
for update
to authenticated
using (
  sender_id = (select auth.uid())
)
with check (
  sender_id = (select auth.uid())
);

create policy "Users can delete own group messages"
on public.group_messages
for delete
to authenticated
using (
  sender_id = (select auth.uid())
);


-- GROUP WATCHLIST
create policy "Group watchlist visible to active members"
on public.group_watchlist
for select
to authenticated
using (
  public.is_group_member(group_id, (select auth.uid()))
);

create policy "Active members can add group titles"
on public.group_watchlist
for insert
to authenticated
with check (
  added_by = (select auth.uid())
  and public.is_group_member(group_id, (select auth.uid()))
);

create policy "Admins and title author can remove group titles"
on public.group_watchlist
for delete
to authenticated
using (
  added_by = (select auth.uid())
  or public.is_group_admin(group_id, (select auth.uid()))
);


-- RECOMMENDATIONS
create policy "Recommendations visible to sender or recipient"
on public.recommendations
for select
to authenticated
using (
  sender_id = (select auth.uid())
  or recipient_user_id = (select auth.uid())
  or (
    recipient_group_id is not null
    and public.is_group_member(
      recipient_group_id,
      (select auth.uid())
    )
  )
);

create policy "Authenticated users can send recommendations"
on public.recommendations
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and (
    recipient_user_id is not null
    or (
      recipient_group_id is not null
      and public.is_group_member(
        recipient_group_id,
        (select auth.uid())
      )
    )
  )
);

create policy "Recipients can update recommendation status"
on public.recommendations
for update
to authenticated
using (
  recipient_user_id = (select auth.uid())
  or (
    recipient_group_id is not null
    and public.is_group_member(
      recipient_group_id,
      (select auth.uid())
    )
  )
)
with check (
  recipient_user_id = (select auth.uid())
  or (
    recipient_group_id is not null
    and public.is_group_member(
      recipient_group_id,
      (select auth.uid())
    )
  )
);

create policy "Senders can delete recommendations"
on public.recommendations
for delete
to authenticated
using (
  sender_id = (select auth.uid())
);


-- NOTIFICATIONS
create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using (
  user_id = (select auth.uid())
);

create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);

create policy "Users can delete own notifications"
on public.notifications
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- TITLE DISCUSSIONS
create policy "Authenticated users can read title discussions"
on public.title_discussions
for select
to authenticated
using (true);

create policy "Users can create title discussions"
on public.title_discussions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

create policy "Users can update own title discussions"
on public.title_discussions
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);

create policy "Users can delete own title discussions"
on public.title_discussions
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- DISCUSSION LIKES
create policy "Authenticated users can read discussion likes"
on public.discussion_likes
for select
to authenticated
using (true);

create policy "Users can like discussions"
on public.discussion_likes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
);

create policy "Users can remove own discussion likes"
on public.discussion_likes
for delete
to authenticated
using (
  user_id = (select auth.uid())
);


-- --------------------------------------------------------------------
-- 11. REALTIME — POSTGRES CHANGES
-- Habilita as tabelas que precisam atualizar a interface imediatamente.
-- --------------------------------------------------------------------

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'friend_requests',
    'friendships',
    'messages',
    'group_messages',
    'recommendations',
    'notifications'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = realtime_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table
      );
    end if;
  end loop;
end;
$$;