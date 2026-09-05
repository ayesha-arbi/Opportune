-- Ensure source_url is unique for upsert matching
do $$ begin
    if not exists (
        select 1 from pg_constraint where conname = 'opportunities_source_url_key'
    ) then
        alter table public.opportunities add constraint opportunities_source_url_key unique (source_url);
    end if;
end $$;
