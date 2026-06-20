do $$
begin
  if not exists (select 1 from pg_type where typname = 'case_status') then
    create type public.case_status as enum ('open', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'case_image_label') then
    create type public.case_image_label as enum ('front', 'left', 'right', 'posterior', 'lateral', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'case_assignment_role') then
    create type public.case_assignment_role as enum ('primary', 'emergency');
  end if;
end $$;

create sequence if not exists public.client_code_seq;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_code text not null,
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  previous_hospitals text[] not null default '{}',
  trauma_history text,
  notes text,
  first_visit_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, client_code)
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  title text not null default 'Untitled case',
  status public.case_status not null default 'open',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  record_number integer not null,
  modality public.study_modality not null default 'xray',
  body_part text not null default 'Chest',
  notes text,
  clinical_checks jsonb not null default '{}'::jsonb,
  status public.study_status not null default 'uploaded',
  risk_score integer,
  risk_level public.risk_level,
  summary text,
  raw_findings jsonb,
  model_id text,
  report_model_id text,
  analysis_duration_ms integer,
  analysis_error text,
  created_by uuid references public.profiles(id) on delete set null,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, record_number),
  constraint case_records_risk_score_range check (risk_score is null or (risk_score >= 0 and risk_score <= 100))
);

create table if not exists public.case_images (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.case_records(id) on delete cascade,
  label public.case_image_label not null,
  label_note text,
  storage_path text not null,
  image_mime_type text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.case_record_findings (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.case_records(id) on delete cascade,
  label text not null,
  zone text not null,
  confidence integer not null,
  raw_probability numeric(6, 5) not null,
  created_at timestamptz not null default now(),
  constraint case_record_findings_confidence_range check (confidence >= 0 and confidence <= 100),
  constraint case_record_findings_zone_allowed check (zone in ('left_upper', 'left_lower', 'right_upper', 'right_lower', 'center')),
  unique (record_id, label, zone)
);

create table if not exists public.case_record_reports (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null unique references public.case_records(id) on delete cascade,
  summary text not null,
  comparison text not null default 'No prior record on file.',
  recommendation text not null,
  disclaimer text not null default 'AI-assisted draft. Not a clinical diagnosis; radiologist review is required.',
  raw_llm_response text,
  model_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.case_assignment_role not null default 'primary',
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (case_id, profile_id, role)
);

create table if not exists public.case_shares (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  shared_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (case_id, department_id)
);

alter table public.alerts alter column study_id drop not null;
alter table public.alerts add column if not exists case_record_id uuid references public.case_records(id) on delete cascade;

create unique index if not exists alerts_case_record_id_unique
on public.alerts(case_record_id)
where case_record_id is not null;

create or replace function public.set_client_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_code is null or btrim(new.client_code) = '' then
    new.client_code = 'AM' || lpad(nextval('public.client_code_seq')::text, 5, '0') || 'I';
  end if;

  return new;
end;
$$;

drop trigger if exists clients_set_client_code on public.clients;
create trigger clients_set_client_code
before insert on public.clients
for each row execute function public.set_client_code();

create or replace function public.set_case_record_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.record_number is null then
    select coalesce(max(record_number), 0) + 1
    into new.record_number
    from public.case_records
    where case_id = new.case_id;
  end if;

  return new;
end;
$$;

drop trigger if exists case_records_set_record_number on public.case_records;
create trigger case_records_set_record_number
before insert on public.case_records
for each row execute function public.set_case_record_number();

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

drop trigger if exists cases_set_updated_at on public.cases;
create trigger cases_set_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

drop trigger if exists case_records_set_updated_at on public.case_records;
create trigger case_records_set_updated_at
before update on public.case_records
for each row execute function public.set_updated_at();

drop trigger if exists case_record_reports_set_updated_at on public.case_record_reports;
create trigger case_record_reports_set_updated_at
before update on public.case_record_reports
for each row execute function public.set_updated_at();

create or replace function public.can_view_case(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cases c
    where c.id = target_case_id
      and public.is_org_member(c.organization_id)
      and (
        public.is_org_admin(c.organization_id)
        or c.department_id is null
        or c.department_id = public.current_department_id()
        or exists (
          select 1
          from public.case_shares sh
          where sh.case_id = c.id
            and sh.department_id = public.current_department_id()
        )
        or exists (
          select 1
          from public.case_assignments ca
          where ca.case_id = c.id
            and ca.profile_id = auth.uid()
        )
      )
  );
$$;

alter table public.clients enable row level security;
alter table public.cases enable row level security;
alter table public.case_records enable row level security;
alter table public.case_images enable row level security;
alter table public.case_record_findings enable row level security;
alter table public.case_record_reports enable row level security;
alter table public.case_assignments enable row level security;
alter table public.case_shares enable row level security;

drop policy if exists "Members can read organization clients" on public.clients;
create policy "Members can read organization clients"
on public.clients
for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Members can create organization clients" on public.clients;
create policy "Members can create organization clients"
on public.clients
for insert
to authenticated
with check (public.is_org_member(organization_id));

drop policy if exists "Members can update organization clients" on public.clients;
create policy "Members can update organization clients"
on public.clients
for update
to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "Members can read accessible cases" on public.cases;
create policy "Members can read accessible cases"
on public.cases
for select
to authenticated
using (public.can_view_case(id));

drop policy if exists "Members can create cases in their organization" on public.cases;
create policy "Members can create cases in their organization"
on public.cases
for insert
to authenticated
with check (
  public.is_org_member(organization_id)
  and (department_id is null or department_id = public.current_department_id() or public.is_org_admin(organization_id))
);

drop policy if exists "Members can update accessible cases" on public.cases;
create policy "Members can update accessible cases"
on public.cases
for update
to authenticated
using (public.can_view_case(id))
with check (public.is_org_member(organization_id));

drop policy if exists "Members can read accessible case records" on public.case_records;
create policy "Members can read accessible case records"
on public.case_records
for select
to authenticated
using (public.can_view_case(case_id));

drop policy if exists "Members can write accessible case records" on public.case_records;
create policy "Members can write accessible case records"
on public.case_records
for all
to authenticated
using (public.can_view_case(case_id))
with check (public.is_org_member(organization_id) and public.can_view_case(case_id));

drop policy if exists "Members can read accessible case images" on public.case_images;
create policy "Members can read accessible case images"
on public.case_images
for select
to authenticated
using (
  exists (
    select 1
    from public.case_records cr
    where cr.id = record_id
      and public.can_view_case(cr.case_id)
  )
);

drop policy if exists "Members can write accessible case images" on public.case_images;
create policy "Members can write accessible case images"
on public.case_images
for all
to authenticated
using (
  exists (
    select 1
    from public.case_records cr
    where cr.id = record_id
      and public.can_view_case(cr.case_id)
  )
)
with check (
  exists (
    select 1
    from public.case_records cr
    where cr.id = record_id
      and public.can_view_case(cr.case_id)
  )
);

drop policy if exists "Members can read accessible case findings" on public.case_record_findings;
create policy "Members can read accessible case findings"
on public.case_record_findings
for select
to authenticated
using (
  exists (
    select 1
    from public.case_records cr
    where cr.id = record_id
      and public.can_view_case(cr.case_id)
  )
);

drop policy if exists "Members can write accessible case findings" on public.case_record_findings;
create policy "Members can write accessible case findings"
on public.case_record_findings
for all
to authenticated
using (
  exists (
    select 1
    from public.case_records cr
    where cr.id = record_id
      and public.can_view_case(cr.case_id)
  )
)
with check (
  exists (
    select 1
    from public.case_records cr
    where cr.id = record_id
      and public.can_view_case(cr.case_id)
  )
);

drop policy if exists "Members can read accessible case reports" on public.case_record_reports;
create policy "Members can read accessible case reports"
on public.case_record_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.case_records cr
    where cr.id = record_id
      and public.can_view_case(cr.case_id)
  )
);

drop policy if exists "Members can write accessible case reports" on public.case_record_reports;
create policy "Members can write accessible case reports"
on public.case_record_reports
for all
to authenticated
using (
  exists (
    select 1
    from public.case_records cr
    where cr.id = record_id
      and public.can_view_case(cr.case_id)
  )
)
with check (
  exists (
    select 1
    from public.case_records cr
    where cr.id = record_id
      and public.can_view_case(cr.case_id)
  )
);

drop policy if exists "Members can read accessible case assignments" on public.case_assignments;
create policy "Members can read accessible case assignments"
on public.case_assignments
for select
to authenticated
using (public.can_view_case(case_id));

drop policy if exists "Admins can manage case assignments" on public.case_assignments;
create policy "Admins can manage case assignments"
on public.case_assignments
for all
to authenticated
using (
  exists (
    select 1
    from public.cases c
    where c.id = case_id
      and public.is_org_admin(c.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.cases c
    where c.id = case_id
      and public.is_org_admin(c.organization_id)
  )
);

drop policy if exists "Members can read case shares" on public.case_shares;
create policy "Members can read case shares"
on public.case_shares
for select
to authenticated
using (public.can_view_case(case_id));

drop policy if exists "Members can create case shares" on public.case_shares;
create policy "Members can create case shares"
on public.case_shares
for insert
to authenticated
with check (public.can_view_case(case_id));

create index if not exists clients_organization_id_idx on public.clients(organization_id);
create index if not exists clients_client_code_idx on public.clients(client_code);
create index if not exists clients_name_idx on public.clients(last_name, first_name);
create index if not exists cases_organization_id_idx on public.cases(organization_id);
create index if not exists cases_client_id_idx on public.cases(client_id);
create index if not exists cases_department_id_idx on public.cases(department_id);
create index if not exists case_records_organization_id_idx on public.case_records(organization_id);
create index if not exists case_records_case_id_idx on public.case_records(case_id);
create index if not exists case_records_created_at_idx on public.case_records(created_at desc);
create index if not exists case_records_risk_score_idx on public.case_records(risk_score desc nulls last);
create index if not exists case_images_record_id_idx on public.case_images(record_id);
create index if not exists case_record_findings_record_id_idx on public.case_record_findings(record_id);
create index if not exists case_assignments_case_id_idx on public.case_assignments(case_id);
create index if not exists case_assignments_profile_id_idx on public.case_assignments(profile_id);
create index if not exists case_shares_case_id_idx on public.case_shares(case_id);
create index if not exists case_shares_department_id_idx on public.case_shares(department_id);
create index if not exists alerts_case_record_id_idx on public.alerts(case_record_id);
