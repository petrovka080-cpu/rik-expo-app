type Row = Readonly<Record<string, unknown>>;
const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
// Same upper bound as the existing request contract and v2 SQL writer.
const validSelection = (value: unknown): value is readonly string[] => Array.isArray(value) && value.length <= 64
  && Array.from(value).every(id => typeof id === 'string' && UUID.test(id));

/** Necessary price-selection gate after independently proving the bounded
 * explicit-clear source/identity/consent contract. It does not authorize a
 * migration or prove effective source-price route equivalence. Intake persists
 * this concrete array before job/idempotency creation; worker rechecks it.
 * An empty parent selection must stay empty and never select current defaults. */
export function canonicalDerivedQuantityClearParentPricesV1(input: {
  parentSelection: unknown;
  request: unknown;
  phase: 'INTAKE' | 'WORKER';
}): string[] | null {
  const parent = input.parentSelection;
  if (!validSelection(parent) || !isRow(input.request)
    || !['INTAKE', 'WORKER'].includes(input.phase)) return null;
  const hasRequestedSelection = Object.hasOwn(input.request, 'priceSnapshotIds');
  if (!hasRequestedSelection) return input.phase === 'INTAKE' ? [...parent] : null;
  const requested = input.request.priceSnapshotIds;
  if (!validSelection(requested) || requested.length !== parent.length
    || requested.some((id, index) => id !== parent[index])) return null;
  return [...parent];
}
