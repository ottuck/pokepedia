-- The remote project does not auto-grant new public tables to the Data API roles
-- (config: api.auto_expose_new_tables = false), so the sync RPC, which runs as the caller
-- (service_role), was refused on its first remote run. Grant exactly what the sync needs.
grant select, insert, update, delete
  on public.pokemon, public.ability, public.pokemon_ability
  to service_role;
