insert into public.catalog_synonyms (term, rik_code, kind, confidence, matched_by)
select
  seed.term,
  seed.rik_code,
  'material',
  seed.confidence,
  'battle_seed_v2_utf8'
from (
  values
    (U&'\0430\0440\043c\0430\0442\0443\0440\0430 \0031\0032', 'MAT-REBAR-A500-12', 0.99::numeric),
    (U&'\0430\0440\043c\0430\0442\0443\0440\0430 \0434\0031\0032', 'MAT-REBAR-A500-12', 0.98::numeric),
    (U&'\0430\0440\043c\0430\0442\0443\0440\0430 \0031\0032 \043c\043c', 'MAT-REBAR-A500-12', 0.98::numeric),
    (U&'\0430\0440\043c\0430\0442\0443\0440\0430 d\0031\0032', 'MAT-REBAR-A500-12', 0.97::numeric)
) as seed(term, rik_code, confidence)
where exists (
  select 1
  from public.rik_items ri
  where trim(coalesce(ri.rik_code, '')) = seed.rik_code
)
and not exists (
  select 1
  from public.catalog_synonyms cs
  where cs.is_active = true
    and cs.term_normalized = public.foreman_ai_normalize_text_v1(seed.term)
    and coalesce(cs.kind, '') = 'material'
);
