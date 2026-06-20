do $$
begin
  if not exists (select 1 from pg_type where typname = 'study_modality') then
    create type public.study_modality as enum ('xray', 'ct', 'mri', 'ultrasound');
  end if;

  if not exists (select 1 from pg_type where typname = 'study_status') then
    create type public.study_status as enum ('uploaded', 'analyzing', 'analyzed', 'reviewed', 'critical', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'risk_level') then
    create type public.risk_level as enum ('low', 'medium', 'high');
  end if;
end $$;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  external_id text not null,
  display_name text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, external_id)
);

create table if not exists public.studies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  patient_id uuid not null references public.patients(id) on delete cascade,
  modality public.study_modality not null default 'xray',
  body_part text not null default 'Chest',
  storage_path text not null,
  heatmap_storage_path text,
  image_mime_type text not null,
  status public.study_status not null default 'uploaded',
  risk_score integer,
  risk_level public.risk_level,
  model_id text,
  report_model_id text,
  analysis_duration_ms integer,
  analysis_error text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint studies_risk_score_range check (risk_score is null or (risk_score >= 0 and risk_score <= 100))
);

create table if not exists public.study_clinical_context (
  study_id uuid primary key references public.studies(id) on delete cascade,
  spo2 integer,
  fever boolean not null default false,
  symptoms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_context_spo2_range check (spo2 is null or (spo2 >= 40 and spo2 <= 100))
);

create table if not exists public.study_findings (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies(id) on delete cascade,
  label text not null,
  confidence integer not null,
  raw_probability numeric(6, 5) not null,
  created_at timestamptz not null default now(),
  constraint study_findings_confidence_range check (confidence >= 0 and confidence <= 100),
  unique (study_id, label)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null unique references public.studies(id) on delete cascade,
  summary text not null,
  comparison text not null default 'No prior study on file.',
  recommendation text not null,
  disclaimer text not null default 'AI-assisted draft. Not a clinical diagnosis; radiologist review is required.',
  raw_llm_response text,
  model_used text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  study_id uuid not null unique references public.studies(id) on delete cascade,
  title text not null,
  risk_score integer not null,
  notified_departments text[] not null default '{}',
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alerts_risk_score_range check (risk_score >= 0 and risk_score <= 100)
);

create table if not exists public.study_shares (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.studies(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  shared_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (study_id, department_id)
);

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at
before update on public.patients
for each row execute function public.set_updated_at();

drop trigger if exists studies_set_updated_at on public.studies;
create trigger studies_set_updated_at
before update on public.studies
for each row execute function public.set_updated_at();

drop trigger if exists study_clinical_context_set_updated_at on public.study_clinical_context;
create trigger study_clinical_context_set_updated_at
before update on public.study_clinical_context
for each row execute function public.set_updated_at();

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

drop trigger if exists alerts_set_updated_at on public.alerts;
create trigger alerts_set_updated_at
before update on public.alerts
for each row execute function public.set_updated_at();

create or replace function public.can_view_study(target_study_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.studies s
    where s.id = target_study_id
      and public.is_org_member(s.organization_id)
      and (
        public.is_org_admin(s.organization_id)
        or s.department_id is null
        or s.department_id = public.current_department_id()
        or exists (
          select 1
          from public.study_shares sh
          where sh.study_id = s.id
            and sh.department_id = public.current_department_id()
        )
      )
  );
$$;

alter table public.patients enable row level security;
alter table public.studies enable row level security;
alter table public.study_clinical_context enable row level security;
alter table public.study_findings enable row level security;
alter table public.reports enable row level security;
alter table public.alerts enable row level security;
alter table public.study_shares enable row level security;

drop policy if exists "Members can read organization patients" on public.patients;
create policy "Members can read organization patients"
on public.patients
for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Members can create organization patients" on public.patients;
create policy "Members can create organization patients"
on public.patients
for insert
to authenticated
with check (public.is_org_member(organization_id));

drop policy if exists "Members can update organization patients" on public.patients;
create policy "Members can update organization patients"
on public.patients
for update
to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "Members can read accessible studies" on public.studies;
create policy "Members can read accessible studies"
on public.studies
for select
to authenticated
using (public.can_view_study(id));

drop policy if exists "Members can create studies in their organization" on public.studies;
create policy "Members can create studies in their organization"
on public.studies
for insert
to authenticated
with check (
  public.is_org_member(organization_id)
  and (department_id is null or department_id = public.current_department_id() or public.is_org_admin(organization_id))
);

drop policy if exists "Members can update accessible studies" on public.studies;
create policy "Members can update accessible studies"
on public.studies
for update
to authenticated
using (public.can_view_study(id))
with check (public.is_org_member(organization_id));

drop policy if exists "Members can read accessible clinical context" on public.study_clinical_context;
create policy "Members can read accessible clinical context"
on public.study_clinical_context
for select
to authenticated
using (public.can_view_study(study_id));

drop policy if exists "Members can write accessible clinical context" on public.study_clinical_context;
create policy "Members can write accessible clinical context"
on public.study_clinical_context
for all
to authenticated
using (public.can_view_study(study_id))
with check (public.can_view_study(study_id));

drop policy if exists "Members can read accessible findings" on public.study_findings;
create policy "Members can read accessible findings"
on public.study_findings
for select
to authenticated
using (public.can_view_study(study_id));

drop policy if exists "Members can write accessible findings" on public.study_findings;
create policy "Members can write accessible findings"
on public.study_findings
for all
to authenticated
using (public.can_view_study(study_id))
with check (public.can_view_study(study_id));

drop policy if exists "Members can read accessible reports" on public.reports;
create policy "Members can read accessible reports"
on public.reports
for select
to authenticated
using (public.can_view_study(study_id));

drop policy if exists "Members can write accessible reports" on public.reports;
create policy "Members can write accessible reports"
on public.reports
for all
to authenticated
using (public.can_view_study(study_id))
with check (public.can_view_study(study_id));

drop policy if exists "Members can read organization alerts" on public.alerts;
create policy "Members can read organization alerts"
on public.alerts
for select
to authenticated
using (public.is_org_member(organization_id));

drop policy if exists "Members can write organization alerts" on public.alerts;
create policy "Members can write organization alerts"
on public.alerts
for all
to authenticated
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists "Members can read study shares" on public.study_shares;
create policy "Members can read study shares"
on public.study_shares
for select
to authenticated
using (public.can_view_study(study_id));

drop policy if exists "Members can create study shares" on public.study_shares;
create policy "Members can create study shares"
on public.study_shares
for insert
to authenticated
with check (public.can_view_study(study_id));

create index if not exists patients_organization_id_idx on public.patients(organization_id);
create index if not exists patients_external_id_idx on public.patients(external_id);
create index if not exists studies_organization_id_idx on public.studies(organization_id);
create index if not exists studies_department_id_idx on public.studies(department_id);
create index if not exists studies_patient_id_idx on public.studies(patient_id);
create index if not exists studies_created_at_idx on public.studies(created_at desc);
create index if not exists studies_risk_score_idx on public.studies(risk_score desc nulls last);
create index if not exists study_findings_study_id_idx on public.study_findings(study_id);
create index if not exists alerts_organization_id_idx on public.alerts(organization_id);
create index if not exists alerts_created_at_idx on public.alerts(created_at desc);
create index if not exists study_shares_study_id_idx on public.study_shares(study_id);
create index if not exists study_shares_department_id_idx on public.study_shares(department_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studies',
  'studies',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Members can read organization study objects" on storage.objects;
create policy "Members can read organization study objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'studies'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = (storage.foldername(name))[1]
      and p.onboarding_complete = true
  )
);

drop policy if exists "Members can upload organization study objects" on storage.objects;
create policy "Members can upload organization study objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'studies'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = (storage.foldername(name))[1]
      and p.onboarding_complete = true
  )
);
