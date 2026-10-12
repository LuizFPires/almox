begin;
select plan(2);

select ok(
  exists (select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'unidade'),
  'unidade publicada no Realtime (estoque ao vivo)'
);
select ok(
  exists (select 1 from pg_publication_tables
           where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'movimento'),
  'movimento continua publicado'
);

select * from finish();
rollback;
