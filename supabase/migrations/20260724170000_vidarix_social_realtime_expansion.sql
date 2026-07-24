-- ====================================================================
-- VIDARIX — EXPANSÃO DO REALTIME SOCIAL
-- Mantém grupos, participantes, discussões e perfis sincronizados
-- entre sessões sem exigir atualização manual da página.
-- ====================================================================

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'profiles',
    'conversations',
    'conversation_participants',
    'groups',
    'group_members',
    'group_watchlist',
    'title_discussions',
    'discussion_likes'
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
