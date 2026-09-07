-- ============================================
-- 003: PGVECTOR SEMANTIC MATCHING (Phase 8)
-- Adds embedding columns and a cosine-similarity match function.
-- Requires the pgvector extension (available on all Supabase projects).
-- ============================================

create extension if not exists vector;

-- 1536 dimensions = OpenAI text-embedding-3-small (the default embedding
-- model in .env). If you switch to a different embedding model, change the
-- dimension here AND re-run the backfill for all rows.
alter table public.opportunities
add column if not exists embedding vector(1536),
add column if not exists embedding_model text;

alter table public.profiles
add column if not exists embedding vector(1536),
add column if not exists embedding_model text,
add column if not exists embedding_updated_at timestamptz;

-- HNSW index for fast approximate nearest-neighbor search on cosine distance.
create index if not exists opportunities_embedding_idx
on public.opportunities using hnsw (embedding vector_cosine_ops);

-- Semantic match: hard filters first, then rank by cosine similarity.
-- Invoker rights, so RLS applies — users can only match opportunities
-- they could read anyway.
create or replace function public.match_opportunities(
    query_embedding vector(1536),
    match_count int default 10,
    filter_type text default null,
    remote_only boolean default null,
    deadline_after timestamptz default null,
    deadline_before timestamptz default null
)
returns table (
    id uuid,
    similarity float
)
language sql
stable
as $$
    select
        o.id,
        1 - (o.embedding <=> query_embedding) as similarity
    from public.opportunities o
    where o.is_active
      and o.embedding is not null
      and (filter_type is null or o.type = filter_type)
      and (remote_only is null or remote_only = false or o.is_remote = true)
      and (deadline_after is null or o.deadline >= deadline_after)
      and (deadline_before is null or o.deadline <= deadline_before)
    order by o.embedding <=> query_embedding
    limit least(greatest(match_count, 1), 20);
$$;
