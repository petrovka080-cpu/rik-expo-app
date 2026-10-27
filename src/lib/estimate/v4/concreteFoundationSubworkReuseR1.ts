/** WORK source composition only. No writer, migration, price or automatic adoption. */
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateResourceDefinition,
} from '../backendPlatform/canonicalEstimateCompileCore';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { canonicalEstimateSha256HexText } from '../backendPlatform/canonicalEstimateSha256';
import { stringifyCanonicalEstimateJson } from '../estimateDeterministicHash';
import { CONCRETE_SLAB_VIBRATION_PARAMETERS, CONCRETE_SLAB_VIBRATION_FORMULAS, CONCRETE_SLAB_VIBRATION_RESOURCES, CONCRETE_SLAB_VIBRATION_SOURCE_METADATA } from './concreteSlabVibrationR1';
import { CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS, CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS, CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES, CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA } from './concreteSlabEmbeddedItemsR1';
import { CONCRETE_SLAB_REPAIR_PARAMETERS, CONCRETE_SLAB_REPAIR_FORMULAS, CONCRETE_SLAB_REPAIR_RESOURCES, CONCRETE_SLAB_REPAIR_SOURCE_METADATA } from './concreteSlabRepairR1';
import { CONCRETE_SLAB_LEVELING_PARAMETERS, CONCRETE_SLAB_LEVELING_FORMULAS, CONCRETE_SLAB_LEVELING_RESOURCES, CONCRETE_SLAB_LEVELING_SOURCE_METADATA } from './concreteSlabLevelingR1';
import { CONCRETE_FOUNDATION_SUBWORK_REUSE_TARGETS, CONCRETE_FOUNDATION_PRESERVED_CURRENT_TARGETS } from './concreteFoundationSubworkReuseTargetsR1';

export { CONCRETE_FOUNDATION_SUBWORK_REUSE_TARGETS, CONCRETE_FOUNDATION_PRESERVED_CURRENT_TARGETS } from './concreteFoundationSubworkReuseTargetsR1';
export type ConcreteFoundationReuseTargetR1 = typeof CONCRETE_FOUNDATION_SUBWORK_REUSE_TARGETS[number];
type Operation = ConcreteFoundationReuseTargetR1['operation'];
type SourceComponent = Readonly<{
  parameters: readonly CanonicalEstimateParameterDefinition[];
  formulas: readonly CanonicalEstimateFormulaDefinition[];
  resources: readonly CanonicalEstimateResourceDefinition[];
  sourceMetadata: Readonly<Record<string, unknown>>;
  primaryMeasureParameterId: string;
}>;

const components: Readonly<Record<Operation, SourceComponent>> = Object.freeze({
  vibrate: { parameters: CONCRETE_SLAB_VIBRATION_PARAMETERS, formulas: CONCRETE_SLAB_VIBRATION_FORMULAS, resources: CONCRETE_SLAB_VIBRATION_RESOURCES, sourceMetadata: CONCRETE_SLAB_VIBRATION_SOURCE_METADATA, primaryMeasureParameterId: 'consolidated_concrete_volume_m3' },
  anchor: { parameters: CONCRETE_SLAB_EMBEDDED_ITEMS_PARAMETERS, formulas: CONCRETE_SLAB_EMBEDDED_ITEMS_FORMULAS, resources: CONCRETE_SLAB_EMBEDDED_ITEMS_RESOURCES, sourceMetadata: CONCRETE_SLAB_EMBEDDED_ITEMS_SOURCE_METADATA, primaryMeasureParameterId: 'embedded_item_count_piece' },
  repair: { parameters: CONCRETE_SLAB_REPAIR_PARAMETERS, formulas: CONCRETE_SLAB_REPAIR_FORMULAS, resources: CONCRETE_SLAB_REPAIR_RESOURCES, sourceMetadata: CONCRETE_SLAB_REPAIR_SOURCE_METADATA, primaryMeasureParameterId: 'repair_scope_volume_m3' },
  level: { parameters: CONCRETE_SLAB_LEVELING_PARAMETERS, formulas: CONCRETE_SLAB_LEVELING_FORMULAS, resources: CONCRETE_SLAB_LEVELING_RESOURCES, sourceMetadata: CONCRETE_SLAB_LEVELING_SOURCE_METADATA, primaryMeasureParameterId: 'leveled_concrete_volume_m3' },
});

function targetFor(catalogId: string): ConcreteFoundationReuseTargetR1 {
  if (CONCRETE_FOUNDATION_PRESERVED_CURRENT_TARGETS.some(item => item.catalogId === catalogId)) {
    throw Error('CONCRETE_FOUNDATION_CURRENT_PARENT_ALREADY_OWNED_PRESERVE_S2733');
  }
  const target = CONCRETE_FOUNDATION_SUBWORK_REUSE_TARGETS.find(item => item.catalogId === catalogId);
  if (!target) throw Error('CONCRETE_FOUNDATION_REUSE_CATALOG_NOT_IN_FINITE_SERIES');
  return target;
}

function publicLabel(text: string, target: ConcreteFoundationReuseTargetR1): string {
  const genitive = target.family === 'strip_foundation' ? 'ленточного фундамента' : 'плитного фундамента';
  return text.replaceAll('свежеуложенной бетонной плиты', 'свежеуложенного бетона ' + genitive)
    .replaceAll('бетонной плиты', genitive)
    .replaceAll('бетонной плитой', target.family === 'strip_foundation' ? 'ленточным фундаментом' : 'плитным фундаментом')
    .replaceAll('бетонной плите', target.family === 'strip_foundation' ? 'ленточном фундаменте' : 'плитном фундаменте')
    .replaceAll('плиты', genitive);
}

/** Keep accepted formula IDs, AST, units, applicability guards and source trace.
 * Project schedules are still required; no fixture values become defaults.
 * Resource identities remain local to one definition. Combining this atomic
 * operation with placement requires a separately reviewed paid-owner plan. */
export function buildConcreteFoundationSubworkSourceR1(catalogId: string) {
  const target = targetFor(catalogId);
  const source = components[target.operation];
  const parameters = source.parameters.map(parameter => {
    const clone = structuredClone(parameter) as CanonicalEstimateParameterDefinition & { title_ru?: string };
    if (typeof clone.title_ru === 'string') clone.title_ru = publicLabel(clone.title_ru, target);
    return clone;
  });
  const resources = source.resources.map(resource => {
    const clone = structuredClone(resource);
    const row = { ...clone, title_ru: publicLabel(clone.title_ru, target) };
    const { row_sha256: _oldHash, ...content } = row;
    return { ...row, row_sha256: estimateDeterministicHash(content) };
  });
  return {
    contract: 'concrete-foundation-subwork-source-reuse/r1' as const,
    status: 'SOURCE_COMPOSITION_ONLY_NOT_ADOPTED' as const,
    target, primaryMeasureParameterId: source.primaryMeasureParameterId,
    parameters, formulas: source.formulas, resources,
    sourceMetadata: source.sourceMetadata,
    integrationNeeds: [
      'NEW_ATOMIC_MODEL_DECISION_WITH_EXACT_59_ROW_LINEAGE_REQUIRED',
      'REUSE_EXISTING_OPERATION_COMPLETION_AND_INCLUDED_KIT_GUARDS',
      'EXACT_MODEL_HASH_APPROVAL_NOT_REPLACED_BY_PUBLIC_LEDGER_SNAPSHOT',
      'REPLACE_OR_PRESERVE_EACH_OLD_ROW_WITH_MANUAL_OVERRIDE_LINEAGE',
      'ONE_PAID_OWNER_WITH_ANY_PLACEMENT_OR_COMPLETE_WORK',
      'PROJECT_METHOD_AND_DIRECT_RESOURCE_SCHEDULE',
      'EXACT_SUCCESSOR_WRITER_AND_SEARCH_BINDING',
      'TYPECHECK_TEST_DB_WEB_ANDROID_ACCEPTANCE',
    ] as const,
  };
}

/** For candidate tests and source proof only; not a production route. */
export async function compileConcreteFoundationSubworkSourceR1(
  catalogId: string,
  submittedParameters: Record<string, unknown>,
) {
  const model = buildConcreteFoundationSubworkSourceR1(catalogId);
  return compileCanonicalEstimateCore({
    operation: 'compile', compilerVersion: 'canonical-estimate-compiler.concrete-foundation-subwork-source-reuse-r1',
    catalogId, primaryMeasureParameterId: model.primaryMeasureParameterId,
    parameterDefinitions: model.parameters, formulaDefinitions: [...model.formulas],
    resourceDefinitions: model.resources, submittedParameters, confirmedParameters: {},
    currencyCode: 'KGS', priceItems: [], maximumResourceRows: 64,
    hashJson: async value => estimateDeterministicHash(value),
  });
}

export type ConcreteFoundationActualParentR1 = Readonly<{
  target: Readonly<{ release_id: string; catalog_id: string; definition_version_id: string; definition_hash: string }>;
  definition: Readonly<{ id: string; catalog_id: string; definition_version: number; definition_sha256: string; release_id: string }>;
  parameters: readonly unknown[];
  formulas: readonly unknown[];
  resources: readonly unknown[];
  bindings: readonly unknown[];
  baseline: unknown;
  passport: unknown;
}>;
export type ConcreteFoundationParentPinR1 = Readonly<{
  catalogId: string; definitionId: string; version: number; definitionSha256: string;
  selectedReleaseId: string; definitionReleaseId: string; completeModelSha256: string;
}>;
const sha = (value: unknown): string => canonicalEstimateSha256HexText(stringifyCanonicalEstimateJson(value));

/** Validation creates a reviewable binding only. It never replaces parent rows,
 * edits historical models or writes a release. The packet pins 34 reconstructed public models. These are observed
 * immutable parents, never permission to adopt or retire any historical row. */
export function bindConcreteFoundationActualParentR1(input: Readonly<{
  catalogId: string;
  actualParent: ConcreteFoundationActualParentR1;
  approvedActualParentPin: ConcreteFoundationParentPinR1 | null;
  currentDefinitionReleaseId: string;
}>) {
  const composition = buildConcreteFoundationSubworkSourceR1(input.catalogId);
  const pin = input.approvedActualParentPin;
  if (!pin) throw Error('CONCRETE_FOUNDATION_ACTUAL_PARENT_PIN_REQUIRED');
  const parent = input.actualParent;
  const definition = parent.definition;
  const observed = composition.target.observedParent;
  if (pin.definitionId !== observed.definitionId || pin.version !== observed.version
    || pin.definitionSha256 !== observed.definitionSha256 || pin.selectedReleaseId !== observed.selectedReleaseId
    || pin.definitionReleaseId !== observed.definitionReleaseId || pin.completeModelSha256 !== observed.completeModelSha256) {
    throw Error('CONCRETE_FOUNDATION_ACTUAL_PARENT_OR_RELEASE_DRIFT');
  }
  if (pin.catalogId !== input.catalogId || definition.catalog_id !== input.catalogId
    || definition.id !== pin.definitionId || definition.definition_version !== pin.version
    || definition.definition_sha256 !== pin.definitionSha256 || definition.release_id !== pin.definitionReleaseId
    || parent.target.release_id !== pin.selectedReleaseId || parent.target.catalog_id !== input.catalogId
    || parent.target.definition_version_id !== pin.definitionId || parent.target.definition_hash !== pin.definitionSha256
    || input.currentDefinitionReleaseId !== pin.selectedReleaseId || sha(parent) !== pin.completeModelSha256) {
    throw Error('CONCRETE_FOUNDATION_ACTUAL_PARENT_OR_RELEASE_DRIFT');
  }
  return { composition, parentIdentity: { ...pin }, adoptionAllowed: false as const,
    directConnectionAllowed: false as const, completeParentObserved: true as const,
    classification: composition.target.admissibility, operationGate: composition.target.operationGate,
    remainingGate: 'NEW_ATOMIC_MODEL_REQUIRED_NO_SAFE_BROAD59_ROW_REPLACEMENT' as const };
}
