-- Add criado_por to contatos (authorship tracking, consistent with clientes and notas)
alter table contatos
  add column criado_por uuid references auth.users(id) on delete set null;

-- Reuse the set_criado_por() trigger function defined in migration 001
create trigger set_contatos_criado_por
  before insert on contatos
  for each row execute function set_criado_por();

-- Protect audit column from client writes
revoke insert (criado_por) on contatos from authenticated;
revoke update (criado_por) on contatos from authenticated;

-- Transactional cascade delete: removes notas, contatos, then the cliente atomically
create or replace function delete_cliente_cascade(p_cliente_id uuid)
  returns void language plpgsql security invoker as $$
begin
  delete from notas    where cliente_id = p_cliente_id;
  delete from contatos where cliente_id = p_cliente_id;
  delete from clientes where id         = p_cliente_id;
end;
$$;

grant execute on function delete_cliente_cascade(uuid) to authenticated;
