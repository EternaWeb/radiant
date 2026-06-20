create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'clinical_role') then
    create type public.clinical_role as enum (
      'radiologist',
      'emergency_doctor',
      'department_doctor',
      'administrator'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'workspace_role') then
    create type public.workspace_role as enum ('admin', 'participant');
  end if;
end $$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  icon text not null default 'scan',
  location text not null default 'Main campus',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  clinical_role public.clinical_role not null,
  workspace_role public.workspace_role not null default 'participant',
  is_admin boolean not null default false,
  organization_id uuid references public.organizations(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_admin_consistency check (is_admin = (workspace_role = 'admin')),
  constraint profiles_department_org_required check (
    (department_id is null and organization_id is null)
    or organization_id is not null
  )
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  email text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  clinical_role public.clinical_role not null,
  workspace_role public.workspace_role not null default 'participant',
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invites_participant_only check (workspace_role = 'participant')
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists invites_set_updated_at on public.invites;
create trigger invites_set_updated_at
before update on public.invites
for each row execute function public.set_updated_at();

create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_workspace_role()
returns public.workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select workspace_role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select is_admin from public.profiles where id = auth.uid();
$$;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and organization_id = org_id
      and onboarding_complete = true
  );
$$;

create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and organization_id = org_id
      and is_admin = true
      and onboarding_complete = true
  );
$$;

alter table public.organizations enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;

drop policy if exists "Members can read their organization" on public.organizations;
create policy "Members can read their organization"
on public.organizations
for select
to authenticated
using (public.is_org_member(id));

drop policy if exists "Admins can update their organization" on public.organizations;
create policy "Admins can update their organization"
on public.organizations
for update
to authenticated
using (public.is_org_admin(id))
with check (public.is_org_admin(id));

drop policy if exists "Members can read organization departments" on public.departments;
create policy "Members can read organization departments"
on public.departments
for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Admins can insert organization departments" on public.departments;
create policy "Admins can insert organization departments"
on public.departments
for insert
to authenticated
with check (public.is_org_admin(organization_id));

drop policy if exists "Admins can update organization departments" on public.departments;
create policy "Admins can update organization departments"
on public.departments
for update
to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

drop policy if exists "Admins can delete organization departments" on public.departments;
create policy "Admins can delete organization departments"
on public.departments
for delete
to authenticated
using (public.is_org_admin(organization_id));

drop policy if exists "Users can read own profile and org directory" on public.profiles;
create policy "Users can read own profile and org directory"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists "Users can update their own profile basics" on public.profiles;
create policy "Users can update their own profile basics"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and workspace_role = public.current_workspace_role()
  and is_admin = public.current_is_admin()
  and organization_id = public.current_organization_id()
  and department_id = public.current_department_id()
);

drop policy if exists "Admins can read organization invites" on public.invites;
create policy "Admins can read organization invites"
on public.invites
for select
to authenticated
using (public.is_org_admin(organization_id));

drop policy if exists "Admins can create organization invites" on public.invites;
create policy "Admins can create organization invites"
on public.invites
for insert
to authenticated
with check (public.is_org_admin(organization_id));

drop policy if exists "Admins can update organization invites" on public.invites;
create policy "Admins can update organization invites"
on public.invites
for update
to authenticated
using (public.is_org_admin(organization_id))
with check (public.is_org_admin(organization_id));

create index if not exists departments_organization_id_idx on public.departments(organization_id);
create index if not exists profiles_organization_id_idx on public.profiles(organization_id);
create index if not exists profiles_department_id_idx on public.profiles(department_id);
create index if not exists invites_token_idx on public.invites(token);
create index if not exists invites_organization_id_idx on public.invites(organization_id);
