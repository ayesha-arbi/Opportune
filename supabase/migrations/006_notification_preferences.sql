-- ============================================
-- 004: NOTIFICATION PREFERENCES
-- Per-user reminder window and digest frequency.
-- ============================================

alter table public.profiles
add column if not exists reminder_days_before int default 3
    check (reminder_days_before between 0 and 14),
add column if not exists digest_frequency text default 'weekly'
    check (digest_frequency in ('off', 'weekly')),
add column if not exists last_digest_sent_at timestamptz;
