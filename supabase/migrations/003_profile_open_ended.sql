-- Add open-ended profile fields for richer AI context
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists dream_opportunity text;
alter table public.profiles add column if not exists biggest_challenge text;
alter table public.profiles add column if not exists fun_fact text;
