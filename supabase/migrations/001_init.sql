-- ============================================
-- OPPORTUNE DATABASE SCHEMA
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- HELPERS & TRIGGERS
-- ============================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- ============================================
-- PROFILES
-- ============================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    full_name text,
    education_level text,
    field_of_study text,
    university text,
    interests text[] default '{}',
    skills text[] default '{}',
    goals text[] default '{}',
    goal_type text,
    location text,
    remote_preference boolean,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================
-- OPPORTUNITIES
-- ============================================

create table if not exists public.opportunities (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    description text,
    type text not null check (type in (
        'hackathon', 'fellowship', 'competition', 'research', 'grant', 'other'
    )),
    field_tags text[] default '{}',
    eligibility jsonb,
    organizer text,
    location text,
    is_remote boolean default false,
    deadline timestamptz,
    start_date timestamptz,
    end_date timestamptz,
    prize_info text,
    source_url text not null,
    source_name text,
    application_url text,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

drop trigger if exists set_opportunities_updated_at on public.opportunities;
create trigger set_opportunities_updated_at
before update on public.opportunities
for each row execute function public.set_updated_at();

-- ============================================
-- USER ↔ OPPORTUNITY TRACKER
-- ============================================

create table if not exists public.user_opportunities (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    opportunity_id uuid not null references public.opportunities(id) on delete cascade,
    status text not null default 'saved' check (status in (
        'saved', 'applied', 'submitted', 'accepted', 'rejected'
    )),
    notes text,
    reminder_sent boolean default false,
    applied_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(user_id, opportunity_id)
);

drop trigger if exists set_user_opportunities_updated_at on public.user_opportunities;
create trigger set_user_opportunities_updated_at
before update on public.user_opportunities
for each row execute function public.set_updated_at();

-- ============================================
-- CHAT HISTORY
-- ============================================

create table if not exists public.chat_messages (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    conversation_id uuid,
    role text not null check (role in ('user', 'assistant', 'tool')),
    content text,
    tool_calls jsonb,
    created_at timestamptz default now()
);

create index if not exists chat_messages_conversation_idx
on public.chat_messages(user_id, conversation_id, created_at);

-- ============================================
-- INDEXES
-- ============================================

create index if not exists opportunities_active_deadline_idx
on public.opportunities(is_active, deadline);

create index if not exists opportunities_type_idx
on public.opportunities(type);

create index if not exists opportunities_field_tags_idx
on public.opportunities using gin(field_tags);

create index if not exists user_opportunities_user_idx
on public.user_opportunities(user_id);

create index if not exists user_opportunities_user_status_idx
on public.user_opportunities(user_id, status);

create index if not exists chat_messages_user_created_idx
on public.chat_messages(user_id, created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.user_opportunities enable row level security;
alter table public.chat_messages enable row level security;

do $$ begin
    if not exists (select 1 from pg_policies where policyname = 'Users can view their own profile') then
        create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can create their own profile') then
        create policy "Users can create their own profile" on public.profiles for insert with check (auth.uid() = id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can update their own profile') then
        create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Authenticated users can view opportunities') then
        create policy "Authenticated users can view opportunities" on public.opportunities for select to authenticated using (true);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can view their tracked opportunities') then
        create policy "Users can view their tracked opportunities" on public.user_opportunities for select using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can track opportunities') then
        create policy "Users can track opportunities" on public.user_opportunities for insert with check (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can update their tracked opportunities') then
        create policy "Users can update their tracked opportunities" on public.user_opportunities for update using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can delete their tracked opportunities') then
        create policy "Users can delete their tracked opportunities" on public.user_opportunities for delete using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can view their chat history') then
        create policy "Users can view their chat history" on public.chat_messages for select using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can insert their chat messages') then
        create policy "Users can insert their chat messages" on public.chat_messages for insert with check (auth.uid() = user_id);
    end if;
end $$;
