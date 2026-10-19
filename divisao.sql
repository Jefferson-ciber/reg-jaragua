-- Permite que cada integrante veja a lista da PRÓPRIA divisão (nome, foto, cargo e grau).
-- Não expõe e-mail, WhatsApp nem outros dados pessoais.
create or replace function public.division_roster()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(json_agg(json_build_object(
           'id', m.id,
           'display_name', m.display_name,
           'photo_url', m.photo_url,
           'cargo_id', m.cargo_id,
           'grade_id', m.grade_id
         ) order by m.display_name), '[]'::json)
  from public.member_profiles m
  where m.is_active
    and m.division_id is not null
    and m.division_id = (select division_id from public.member_profiles where id = auth.uid());
$$;

revoke all on function public.division_roster() from public;
grant execute on function public.division_roster() to authenticated;
