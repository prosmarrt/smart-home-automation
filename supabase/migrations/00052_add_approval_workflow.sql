-- Add approval fields to quotations table
alter table quotations
add column if not exists approved_by uuid references auth.users(id),
add column if not exists approved_at timestamptz,
add column if not exists approval_notes text,
add column if not exists rejected_by uuid references auth.users(id),
add column if not exists rejected_at timestamptz,
add column if not exists rejection_reason text;

-- Add pending price fields to device_prices table
alter table device_prices
add column if not exists pending_price numeric,
add column if not exists pending_approval boolean default false,
add column if not exists price_change_requested_by uuid references auth.users(id),
add column if not exists price_change_requested_at timestamptz;

-- Create price_approvals table for tracking approval history
create table if not exists price_approvals (
  id uuid primary key default gen_random_uuid(),
  device_price_id uuid references device_prices(id) on delete cascade,
  device_name text not null,
  device_category text not null,
  old_price numeric not null,
  new_price numeric not null,
  requested_by uuid references auth.users(id),
  requested_at timestamptz default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejected_by uuid references auth.users(id),
  rejected_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text,
  approval_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for faster queries
create index if not exists idx_price_approvals_status on price_approvals(status);
create index if not exists idx_price_approvals_device_price_id on price_approvals(device_price_id);
create index if not exists idx_device_prices_pending_approval on device_prices(pending_approval);
create index if not exists idx_quotations_approved_by on quotations(approved_by);

-- RLS policies for price_approvals
alter table price_approvals enable row level security;

create policy "Authenticated users can view price approvals"
  on price_approvals for select
  to authenticated
  using (true);

create policy "Authenticated users can insert price approvals"
  on price_approvals for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update price approvals"
  on price_approvals for update
  to authenticated
  using (true);