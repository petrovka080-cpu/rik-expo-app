alter table public.market_listings
  add column if not exists client_mutation_id text;

create unique index if not exists market_listings_user_client_mutation_id_key
  on public.market_listings (user_id, client_mutation_id);

comment on column public.market_listings.client_mutation_id is
  'Stable service-layer idempotency key for marketplace publish retries.';

comment on index public.market_listings_user_client_mutation_id_key is
  'Prevents duplicate marketplace listing rows for repeated publish attempts from the same user and mutation intent.';
