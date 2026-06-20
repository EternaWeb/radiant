alter table public.studies
  add column if not exists summary text,
  add column if not exists raw_findings jsonb;

alter table public.study_findings
  add column if not exists zone text not null default 'center';

alter table public.study_findings
  drop constraint if exists study_findings_zone_allowed;

alter table public.study_findings
  add constraint study_findings_zone_allowed
  check (zone in ('left_upper', 'left_lower', 'right_upper', 'right_lower', 'center'));

alter table public.study_findings
  drop constraint if exists study_findings_study_id_label_key;

create unique index if not exists study_findings_study_id_label_zone_key
  on public.study_findings (study_id, label, zone);
