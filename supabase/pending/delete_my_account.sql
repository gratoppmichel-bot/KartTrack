-- Run this once in the Supabase dashboard: SQL Editor -> paste -> Run.
-- (The MCP tool used during development hangs on statements containing DELETE/DROP,
--  so this function could not be created from the session.)

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from sessions where user_id = uid;
  -- own tracks that nobody else drove on disappear; shared ones stay, but become public
  delete from tracks t where t.created_by = uid
    and not exists (select 1 from sessions s where s.track_id = t.id);
  update tracks set is_custom = false where created_by = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
