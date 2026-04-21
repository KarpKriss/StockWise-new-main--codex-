begin;

alter table public.locations
  add column if not exists aisle text,
  add column if not exists level text,
  add column if not exists location_type text;

create index if not exists locations_site_zone_type_aisle_idx
  on public.locations (site_id, zone, location_type, aisle, code);

create index if not exists locations_site_level_idx
  on public.locations (site_id, level);

commit;
