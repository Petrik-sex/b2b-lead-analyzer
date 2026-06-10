create extension if not exists "uuid-ossp";

create type lead_status as enum (
  'new',
  'contacted',
  'interested',
  'not_interested',
  'callback',
  'closed'
);

create table if not exists leads (
  id uuid primary key default uuid_generate_v4(),
  company_name text not null,
  industry text not null,
  city text not null,
  website text,
  public_phone text,
  public_email text,
  google_maps_url text,
  social_url text,
  data_source text not null,
  contact_source text not null,
  description text,
  status lead_status not null default 'new',
  desired_service text check (desired_service in ('webstránky', 'VR prehliadky', 'marketing', 'chatbot')),
  web_analysis jsonb,
  ai_analysis jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_source_required check (length(trim(contact_source)) > 0),
  constraint no_empty_generated_contacts check (
    public_phone is not null
    or public_email is not null
    or website is not null
    or google_maps_url is not null
  )
);

create index if not exists leads_city_idx on leads (city);
create index if not exists leads_industry_idx on leads (industry);
create index if not exists leads_status_idx on leads (status);
create index if not exists leads_ai_analysis_gin_idx on leads using gin (ai_analysis);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at
before update on leads
for each row
execute function set_updated_at();
