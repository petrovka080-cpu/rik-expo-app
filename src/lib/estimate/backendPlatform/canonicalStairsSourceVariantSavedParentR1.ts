type Json = Record<string, unknown>;

export const canonicalStairsSourceVariantCatalogR1 =
  'canonical-work:base:concrete_foundation_interior_stairs_concrete_form_standard';
export const canonicalStairsSourceVariantParameterR1 = 'stairs_quantity_source_variant';
export const canonicalStairsSourceVariantDokaR1 = 'KRER06_111_01_DOKA';
export const canonicalStairsSourceVariantLegacyR1 = 'EXISTING_PROJECT_SCHEDULE';

export type CanonicalStairsSourceVariantSavedParentInputR1 = Readonly<{
  phase: 'INTAKE' | 'WORKER';
  operation: string;
  catalogId: string;
  /** Trusted existing server parent read, never a parent object from HTTP. */
  parent: Readonly<{ catalogId: string; parameters: unknown }> | null;
  submittedParameters: unknown;
  /** Worker: final confirmed+submitted values supplied to the existing compiler. */
  effectiveParameters?: unknown;
}>;

function refuse(reason: string): never {
  throw Object.assign(new Error(
    'Способ расчёта количеств лестницы нельзя менять в сохранённой смете. '
      + 'Для другого способа создайте новую смету. Исходная смета и ручные данные сохранены.',
  ), { code: 'STAIRS_SOURCE_VARIANT_CHANGE_REVIEW_REQUIRED', httpStatus: 409, reason });
}

function record(value: unknown, reason: string): Json {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) refuse(reason);
  return value as Json;
}

function method(parameters: Json, reason: string): 'LEGACY' | 'DOKA' {
  const id = canonicalStairsSourceVariantParameterR1;
  const value = Object.hasOwn(parameters, id) ? parameters[id] : undefined;
  if (value === undefined || value === null || value === canonicalStairsSourceVariantLegacyR1) return 'LEGACY';
  if (value === canonicalStairsSourceVariantDokaR1) return 'DOKA';
  // No free text, trimming, case alias or invalid value is silently reclassified as legacy.
  return refuse(reason);
}

/** Narrow command admission only. Does not alter parameters, overrides, prices,
 * exclusions, parent state or the compiler. All other catalogs are unchanged. */
export function assertCanonicalStairsSourceVariantSavedParentR1(
  input: CanonicalStairsSourceVariantSavedParentInputR1,
): void {
  if (input.catalogId !== canonicalStairsSourceVariantCatalogR1) return;
  if (input.phase !== 'INTAKE' && input.phase !== 'WORKER') refuse('INVALID_PHASE');
  if (input.operation === 'compile') {
    if (input.parent !== null) refuse('NEW_ESTIMATE_HAS_PARENT');
    return; // Explicit new-estimate Doka is allowed; ordinary parameter/source gates still apply.
  }
  if (input.operation !== 'recalculate') refuse('INVALID_OPERATION');
  if (!input.parent || input.parent.catalogId !== input.catalogId) refuse('EXACT_SAVED_PARENT_REQUIRED');
  const parent = method(record(input.parent.parameters, 'INVALID_PARENT_PARAMETERS'), 'INVALID_PARENT_SELECTOR');
  const submitted = record(input.submittedParameters, 'INVALID_SUBMITTED_PARAMETERS');
  const id = canonicalStairsSourceVariantParameterR1;
  // Omission is a no-change command intent. Null is an explicit legacy value.
  // Undefined cannot occur in JSON; treat it as omitted rather than invent a value.
  const requested = !Object.hasOwn(submitted, id) || submitted[id] === undefined
    ? parent : method(submitted, 'INVALID_SUBMITTED_SELECTOR');
  if (requested !== parent) refuse('SAVED_SOURCE_VARIANT_SWITCH');
  if (input.phase === 'WORKER') {
    // Recheck actual effective values, so omitted input cannot lose an inherited
    // Doka selector during release/baseline resolution and quietly activate old rows.
    const effective = method(record(input.effectiveParameters, 'EFFECTIVE_WORKER_PARAMETERS_REQUIRED'),
      'INVALID_EFFECTIVE_SELECTOR');
    if (effective !== parent) refuse('EFFECTIVE_SAVED_SOURCE_VARIANT_SWITCH');
  }
}
