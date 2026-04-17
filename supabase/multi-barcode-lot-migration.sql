begin;

create table if not exists public.product_barcodes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  site_id text not null references public.sites(id) on delete cascade,
  code_type text not null default 'ean',
  code_value text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_barcodes enable row level security;

create unique index if not exists product_barcodes_site_code_unique
  on public.product_barcodes (site_id, code_value);

create unique index if not exists product_barcodes_primary_per_product_unique
  on public.product_barcodes (product_id)
  where is_primary = true;

create index if not exists product_barcodes_product_idx
  on public.product_barcodes (product_id);

create index if not exists product_barcodes_site_product_idx
  on public.product_barcodes (site_id, product_id);

drop policy if exists "product_barcodes_select_by_site_access" on public.product_barcodes;
create policy "product_barcodes_select_by_site_access"
  on public.product_barcodes
  for select
  using (
    exists (
      select 1
      from public.user_site_access usa
      where usa.user_id = auth.uid()
        and usa.site_id = product_barcodes.site_id
        and coalesce(usa.status, 'active') = 'active'
    )
  );

drop policy if exists "product_barcodes_insert_by_site_access" on public.product_barcodes;
create policy "product_barcodes_insert_by_site_access"
  on public.product_barcodes
  for insert
  with check (
    exists (
      select 1
      from public.user_site_access usa
      where usa.user_id = auth.uid()
        and usa.site_id = product_barcodes.site_id
        and coalesce(usa.status, 'active') = 'active'
    )
  );

drop policy if exists "product_barcodes_update_by_site_access" on public.product_barcodes;
create policy "product_barcodes_update_by_site_access"
  on public.product_barcodes
  for update
  using (
    exists (
      select 1
      from public.user_site_access usa
      where usa.user_id = auth.uid()
        and usa.site_id = product_barcodes.site_id
        and coalesce(usa.status, 'active') = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.user_site_access usa
      where usa.user_id = auth.uid()
        and usa.site_id = product_barcodes.site_id
        and coalesce(usa.status, 'active') = 'active'
    )
  );

drop policy if exists "product_barcodes_delete_by_site_access" on public.product_barcodes;
create policy "product_barcodes_delete_by_site_access"
  on public.product_barcodes
  for delete
  using (
    exists (
      select 1
      from public.user_site_access usa
      where usa.user_id = auth.uid()
        and usa.site_id = product_barcodes.site_id
        and coalesce(usa.status, 'active') = 'active'
    )
  );

insert into public.product_barcodes (
  product_id,
  site_id,
  code_type,
  code_value,
  is_primary
)
select
  p.id,
  p.site_id,
  'ean',
  trim(p.ean),
  true
from public.products p
where coalesce(trim(p.ean), '') <> ''
on conflict (site_id, code_value) do nothing;

alter table public.stock
  add column if not exists lot text,
  add column if not exists expiry_date date,
  add column if not exists barcode_value text;

update public.stock s
set barcode_value = trim(p.ean)
from public.products p
where s.product_id = p.id
  and coalesce(trim(s.barcode_value), '') = ''
  and coalesce(trim(p.ean), '') <> '';

alter table public.stock drop constraint if exists unique_stock;
drop index if exists public.stock_location_product_unique;
drop index if exists public.unique_stock;

create unique index if not exists stock_site_location_product_lot_expiry_barcode_unique
  on public.stock (
    site_id,
    location_id,
    product_id,
    coalesce(nullif(trim(lot), ''), '__no_lot__'),
    coalesce(expiry_date, date '1900-01-01'),
    coalesce(nullif(trim(barcode_value), ''), '__no_barcode__')
  );

create index if not exists stock_site_location_idx
  on public.stock (site_id, location_id);

create index if not exists stock_site_product_idx
  on public.stock (site_id, product_id);

create index if not exists stock_site_lot_idx
  on public.stock (site_id, lot);

comment on table public.product_barcodes is
  'Wiele kodow kreskowych / EAN dla jednego SKU. Rekordy sa scopeowane po site_id.';

comment on column public.stock.barcode_value is
  'Migawka kodu uzytego przy imporcie lub identyfikacji pozycji. Pozwala rozroznic wiele EAN dla tego samego SKU.';

comment on column public.stock.lot is
  'Partia / LOT pozycji stockowej. Ten sam SKU moze wystapic wielokrotnie w lokalizacji z roznymi LOT-ami.';

comment on column public.stock.expiry_date is
  'Opcjonalna data waznosci pozycji stockowej. Razem z LOT-em rozdziela warianty tego samego SKU w lokalizacji.';

commit;
