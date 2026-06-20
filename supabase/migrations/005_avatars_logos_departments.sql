alter table public.organizations
add column if not exists logo_url text;

alter table public.profiles
add column if not exists avatar_url text;

-- Seed standard departments for existing organizations
insert into public.departments (organization_id, name, icon, location)
select o.id, dept.name, dept.icon, 'Main campus'
from public.organizations o
cross join (
  values
    ('Radiology', 'scan'),
    ('Neurology', 'brain'),
    ('Emergency', 'ambulance'),
    ('Cardiology', 'heart')
) as dept(name, icon)
on conflict (organization_id, name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-assets',
  'org-assets',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read avatars" on storage.objects;
create policy "Users can read avatars"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Members can read org assets" on storage.objects;
create policy "Members can read org assets"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'org-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = (storage.foldername(name))[1]
      and p.onboarding_complete = true
  )
);

drop policy if exists "Admins can upload org assets" on storage.objects;
create policy "Admins can upload org assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'org-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
      and p.organization_id::text = (storage.foldername(name))[1]
      and p.onboarding_complete = true
  )
);

drop policy if exists "Admins can update org assets" on storage.objects;
create policy "Admins can update org assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'org-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
      and p.organization_id::text = (storage.foldername(name))[1]
      and p.onboarding_complete = true
  )
)
with check (
  bucket_id = 'org-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
      and p.organization_id::text = (storage.foldername(name))[1]
      and p.onboarding_complete = true
  )
);

drop policy if exists "Admins can delete org assets" on storage.objects;
create policy "Admins can delete org assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'org-assets'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
      and p.organization_id::text = (storage.foldername(name))[1]
      and p.onboarding_complete = true
  )
);
