-- ============================================================
-- شغّل هذا الملف كاملاً مرة واحدة في Supabase SQL Editor
-- ============================================================

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  low_stock_threshold int default 3,
  created_at timestamptz default now()
);

create table public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('owner', 'employee')) default 'employee',
  store_id uuid not null references public.stores(id),
  created_at timestamptz default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  name text not null,
  category text,
  created_at timestamptz default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color text,
  size text,
  barcode text unique,
  cost_price numeric(10,2) not null,
  sale_price numeric(10,2) not null,
  quantity int not null default 0,
  last_sold_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  variant_id uuid not null references public.product_variants(id),
  quantity_sold int not null,
  sale_price_at_time numeric(10,2) not null,
  cost_price_at_time numeric(10,2) not null,
  net_profit numeric(10,2) generated always as
    ((sale_price_at_time - cost_price_at_time) * quantity_sold) stored,
  sold_by uuid references public.users_profile(id),
  sold_at timestamptz default now(),
  synced boolean default true
);

create index idx_variants_product on public.product_variants(product_id);
create index idx_variants_barcode on public.product_variants(barcode);
create index idx_sales_store_date on public.sales(store_id, sold_at);

-- الزبائن (لذاكرة الزبون الذكية)
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  name text not null,
  phone text,
  created_at timestamptz default now()
);

-- الديون (دفتر الديون الذكي)
create table public.debts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  customer_id uuid references public.customers(id),
  customer_name text not null,
  amount numeric(10,2) not null,
  note text,
  paid boolean default false,
  created_at timestamptz default now(),
  paid_at timestamptz
);

-- ربط المبيعات بالزبون واحتمال البيع بالدين
alter table public.sales add column customer_id uuid references public.customers(id);
alter table public.sales add column on_credit boolean default false;

create index idx_debts_store on public.debts(store_id, paid);
create index idx_customers_store on public.customers(store_id);

-- تحديث last_sold_at تلقائياً في المنتج عند كل عملية بيع
create or replace function public.touch_last_sold_at()
returns trigger language plpgsql as $$
begin
  update public.product_variants
  set last_sold_at = new.sold_at, updated_at = now()
  where id = new.variant_id;
  return new;
end;
$$;

create trigger trg_touch_last_sold_at
after insert on public.sales
for each row execute function public.touch_last_sold_at();

-- الصلاحيات (RLS)
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.sales enable row level security;
alter table public.users_profile enable row level security;
alter table public.stores enable row level security;
alter table public.customers enable row level security;
alter table public.debts enable row level security;

create or replace function public.current_user_role()
returns text language sql security definer stable as $$
  select role from public.users_profile where id = auth.uid();
$$;

create or replace function public.current_user_store()
returns uuid language sql security definer stable as $$
  select store_id from public.users_profile where id = auth.uid();
$$;

create policy "read_own_profile" on public.users_profile
  for select using (id = auth.uid());

create policy "read_own_store" on public.stores
  for select using (id = current_user_store());

create policy "read_own_store_products" on public.products
  for select using (store_id = current_user_store());

create policy "owner_manage_products" on public.products
  for all using (store_id = current_user_store() and current_user_role() = 'owner');

create policy "read_own_store_variants" on public.product_variants
  for select using (
    exists (select 1 from public.products p where p.id = product_variants.product_id and p.store_id = current_user_store())
  );

create policy "owner_manage_variants" on public.product_variants
  for insert with check (
    exists (select 1 from public.products p where p.id = product_variants.product_id and p.store_id = current_user_store() and current_user_role() = 'owner')
  );

create policy "owner_update_variants" on public.product_variants
  for update using (
    exists (select 1 from public.products p where p.id = product_variants.product_id and p.store_id = current_user_store())
  );

create policy "owner_delete_variants" on public.product_variants
  for delete using (
    exists (select 1 from public.products p where p.id = product_variants.product_id and p.store_id = current_user_store() and current_user_role() = 'owner')
  );

create policy "insert_sale_any_role" on public.sales
  for insert with check (store_id = current_user_store());

create policy "read_sales_own_store" on public.sales
  for select using (store_id = current_user_store());

create policy "owner_only_delete_sales" on public.sales
  for delete using (store_id = current_user_store() and current_user_role() = 'owner');

-- الزبائن: الجميع يقرأ ويضيف زبائن محله
create policy "read_own_store_customers" on public.customers
  for select using (store_id = current_user_store());

create policy "any_role_add_customers" on public.customers
  for insert with check (store_id = current_user_store());

-- الديون: الجميع يقرأ ويضيف، لكن المالك فقط يحذف
create policy "read_own_store_debts" on public.debts
  for select using (store_id = current_user_store());

create policy "any_role_add_debts" on public.debts
  for insert with check (store_id = current_user_store());

create policy "any_role_update_debts" on public.debts
  for update using (store_id = current_user_store());

create policy "owner_only_delete_debts" on public.debts
  for delete using (store_id = current_user_store() and current_user_role() = 'owner');
