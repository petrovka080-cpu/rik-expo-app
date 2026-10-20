// WORK-only config factory. No on-import I/O, DB client, writer or CLI invocation.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {facadeCeresitCt190PackR1 as pack, facadeCeresitCt190SuccessorDefinitionR1,
 facadeCeresitCt190ChoiceParameterR1 as choice, facadeCeresitCt190ConditionsR1 as conditions} from '../../src/lib/estimate/v4/facadeCeresitCt190MaterialSubworksR1';
import {FACADE_MINERAL_WOOL_INSTALLATION_ACCEPTANCE_INPUT as legacyFacts} from '../../src/lib/estimate/v4/facadeMineralWoolInstallationR1';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {effectiveResourceQuantityParameterId} from '../../src/lib/estimate/v4/effectivePurchaseBalanceR1';
import {CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT} from '../../scripts/estimate/r4a13/catalogFirstEstimateMinimumInputAudit.shared';
import {masterRetainedParentCaptureSha256R1, prepareMasterRetainedBindingRepresentativeR1,
 type MasterRetainedParentCaptureR1, type MasterRetainParentBindingsR1} from '../../scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1';
import {resolveMasterScopedNormativeRegistryOptInR1, type MasterCapturedScopedNormativeRegistryR1,
 type MasterScopedNormativeRegistryInputR1} from '../../scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1, resolveMasterSingleDefinitionLocatorExcerptSha256R1,
 validateIndependentCompletenessMapReferences, type MasterSingleDefinitionSuccessorConfig} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';

type Json = Record<string, any>;
type Pin = Readonly<{path: string; sha256: string}>;
const contract = 'gox-build.facade-ct190-kz-material-retained/r1';
const target = {definitionId: 'b81c1af8-53a6-5be6-86b9-3d2396734e99', baselineId: 'a415f7d6-7b3c-5c9f-92b4-8625df55a087',
 definitionSha256: '0e9798db5f884130e610692cb7be84a9220fc3a618d34dc219b02a9d76400373', version: 4};
const p = pack.prefix, id = (key: string) => p + ':' + key;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
const hash = (v: unknown) => hashMasterSingleDefinitionSuccessorReceiptR1(v);
const HASH = /^[a-f0-9]{64}$/u, UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
const sourceBoundKeys = ['attachment-consumed', 'base-layer-consumed', 'dry-mix-consumed', 'water-min', 'water-max'] as const;
const scopeRu = 'Прежний монтаж фасадной минераловатной плиты 120 мм по проекту сохраняется. Только при явном выборе CT 190 KZ добавлены предварительные материальные количества приклеивания и отдельно измеренного защитного слоя. Сетка, труд защитного слоя, инструмент и логистика не объявлены полностью нормированными. Декоративная штукатурка и окраска исключены.';
const legacyGuideScopeRu = 'Эти исходные параметры относятся к прежнему монтажу минераловатных плит 120 мм с креплением по проектной системе. Прежний клей применяется только в старой выбранной ветви. Отдельная ветвь CT 190 KZ содержит лишь предварительные материальные количества приклеивания и защитного слоя по двум измеренным площадям; полная работа защитного слоя, сетка и декоративная отделка здесь не подтверждены.';

function uuid(seed: string): string {
 const b = Buffer.from(hash(seed).slice(0, 32), 'hex'); b[6] = (b[6]! & 15) | 80; b[8] = (b[8]! & 63) | 128;
 const h = b.toString('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

/** Exact managed descriptor for the existing scoped registry reader/capture arm.
 * Its identity seeds and excerpt function are the actual common publisher's. */
export function facadeCt190RegistryDescriptorWorkR1() {
 const sourceMetadata = {source_title: 'Ceresit CT 190 KZ: предварительный материальный расход для приклеивания и защитного слоя',
  source_authority: 'Henkel / Ceresit, технический паспорт исполнения KZ', source_kind: 'MANUFACTURER_TDS_APPROXIMATE_MATERIAL_ONLY',
  official_url: pack.source.url, artifact_sha256: pack.source.sha256, exact_locator: pack.source.locatorRu,
  use_restriction: scopeRu + ' Около 5 и 5,8 кг/м²; вода 5,75–6,25 л на 25 кг расходуемой смеси. Не нормы труда, техники или текущие цены. Расхождение времени использования смеси остаётся открытым.'};
 const locator = {key: 'CERESIT-CT190-KZ-20251127-MATERIAL-COVERAGE-ATTACHMENT-AND-BASE-COAT', payload: {
  kind: 'MANUFACTURER_APPROXIMATE_MATERIAL_SUBSET_NOT_FULL_FACADE_NORM', normId: pack.normId,
  sourceArtifact: pack.source.artifactRelativePath, sourceArtifactSha256: pack.source.sha256, edition: pack.source.edition,
  sourceNormativeBindingRowIds: sourceBoundKeys.map(id), rates: clone(pack.rates), operations: clone(pack.operations),
  sourceFactsNotUniversalProductivity: true, oneSharedDryMixPurchaseOwner: id('dry-mix-order'),
  separatelyMeasuredAreasRequired: ['area_m2', 'ct190_base_layer_area_m2'], fullTechnicalAcceptance: false,
  potlifeClarificationRemainsOpen: true, legacyBranchUnchanged: true}};
 const sourceId = uuid(`${contract}:${pack.sourceId}:source`), locatorId = uuid(`${contract}:${pack.sourceId}:${locator.key}:locator`);
 const managedSource = {id: sourceId, source_key: pack.sourceId, title_ru: sourceMetadata.source_title, authority: sourceMetadata.source_authority,
  official_url: sourceMetadata.official_url, artifact_sha256: pack.source.sha256, effective_from: null, effective_to: null,
  metadata: {contract, sourceKind: sourceMetadata.source_kind, useRestriction: sourceMetadata.use_restriction,
   universalProductivityClaimed: false, universalConsumptionClaimed: false, activationAllowed: false}};
 const managedLocators = [{id: locatorId, source_id: sourceId, locator_key: locator.key, locator: clone(locator.payload),
  excerpt_sha256: resolveMasterSingleDefinitionLocatorExcerptSha256R1({stopCode: 'FACADE_CT190_RETAINED_R1', sourceMetadata, locator,
   binding: {rowId: id(sourceBoundKeys[0]), additionalRowIds: sourceBoundKeys.slice(1).map(id), applicability: {materialOnly: true}}})}];
 return {sourceMetadata, locator, managedSource, managedLocators, scope: {artifactSha256: pack.source.sha256, normId: pack.normId,
  sourceKey: pack.sourceId, generatedSourceId: sourceId, generatedLocatorIds: [locatorId], generatedLocatorKeys: [locator.key]}};
}

/** Pass this input to the EXISTING captureMasterScopedNormativeRegistryPreimageR1
 * in A's owned repeatable-read read-only transaction; no alternate registry read. */
export function facadeCt190RegistryCaptureInputWorkR1(): MasterScopedNormativeRegistryInputR1 {
 const r = facadeCt190RegistryDescriptorWorkR1();
 return {config: {stopCode: 'FACADE_CT190_RETAINED_R1', normId: pack.normId,
  binding: {retainParentBindings: {capturedSourcePreimage: {sourceKey: pack.sourceId, expected: null}}}},
  newSource: r.managedSource, newLocators: r.managedLocators};
}

export type FacadeCt190CapturedDraftWorkR1 = Readonly<{capturedParent: MasterRetainedParentCaptureR1; capturedParentSha256: string;
 parentPassport: Json; parentSearch: Json; parentPriceBindings: readonly Json[]}>;

/** Full actual captured rows retain private UUIDs, source bindings and payment.
 * The authored successor supplies ONLY new rows/parameters and two old gates. */
export function prepareFacadeCt190RetainedDraftWorkR1(input: FacadeCt190CapturedDraftWorkR1) {
 const c = clone(input.capturedParent), passport = clone(input.parentPassport), search = clone(input.parentSearch);
 assert(HASH.test(input.capturedParentSha256)); assert.equal(masterRetainedParentCaptureSha256R1(c), input.capturedParentSha256);
 assert.equal(c.definition.id, target.definitionId); assert.equal(c.definition.definition_sha256, target.definitionSha256);
 assert.equal(c.definition.definition_version, target.version); assert.equal(c.definition.catalog_id, pack.catalogId);
 assert.equal(c.baseline.id, target.baselineId); assert.equal(c.baseline.definition_version_id, c.definition.id);
 assert.equal(passport.definition_version_id, c.definition.id); assert.equal(passport.catalog_id, pack.catalogId);
 assert.deepEqual([c.parameters.length, c.formulas.length, c.resources.length], [17, 8, 8]);
 assert.deepEqual([passport.parameter_count, passport.formula_count, passport.resource_count], [17, 8, 8]);
 assert.equal(search.catalog_id, pack.catalogId); assert.equal(search.primary_uom, 'm2');
 assert(Array.isArray(input.parentPriceBindings)); assert(c.bindings.length > 0 && c.bindings.length <= 64);
 assert(c.normativeSources.every(s => s.source_key !== pack.sourceId));
 assert(!c.definition.source_metadata?.retainedParentBindingSuccessorV1, 'CT190_FIRST_RETAINED_SUCCESSOR_REQUIRED');
 const candidate = facadeCeresitCt190SuccessorDefinitionR1();
 const orderedParameters = [...c.parameters].sort((a,b) => a.ordinal - b.ordinal), orderedResources = [...c.resources].sort((a,b) => a.ordinal - b.ordinal);
 assert.deepEqual(orderedParameters.map(q => q.ordinal), Array.from({length:17},(_,i)=>i));
 assert.deepEqual(orderedResources.map(r => r.ordinal), Array.from({length:8},(_,i)=>i));
 const oldParams = new Map(orderedParameters.map(q => [q.parameter_id, q])), oldRows = new Map(orderedResources.map(r => [r.row_id, r]));
 assert.deepEqual(candidate.resources.slice(0,8).map(r => r.row_id).sort(), [...oldRows.keys()].sort());
 const selected = {kind: 'equals', parameterId: choice, value: pack.selectedValueRu};
 const legacy = {kind: 'equals', parameterId: choice, value: pack.legacyValueRu};
 const parameters: Json[] = [...orderedParameters.map(q => {
  const authored = candidate.parameters.find(x => x.parameter_id === q.parameter_id)!;
  assert(authored && authored.value_type === q.value_type && authored.unit_id === q.unit_id);
  const gated = [pack.legacyOwner.quantityParameterId, pack.legacyOwner.designationParameterId].includes(q.parameter_id);
  const oldGuide = clone(q.truth_metadata.guide);
  return {...q, ...(gated ? {required: false, constraints_json: {...q.constraints_json, requiredWhen: legacy}} : {}),
   truth_metadata: {...q.truth_metadata, ct190PublicGuideScopeSuccessorV1: {contract, previousGuide: oldGuide, interpretationOnlyNoNormChange: true},
    guide: {...oldGuide, applicability: legacyGuideScopeRu, full_condition_ru: legacyGuideScopeRu, guide_version: contract}}};
 }), ...candidate.parameters.filter(q => !oldParams.has(q.parameter_id))].map((q, ordinal) => ({...q, ordinal}));
 const oldFormulaIds = new Set(c.formulas.map(f => f.formula_id));
 const formulas = [...c.formulas, ...candidate.formulas.filter(f => !oldFormulaIds.has(f.formula_id))];
 const resources = [...orderedResources.map(r => {
  if (r.row_id !== pack.legacyOwner.rowId) return r;
  assert.equal(r.formula_id, pack.legacyOwner.formulaId); assert.equal(r.unit_id, 'kg'); assert.equal(r.cost_owner_id, r.row_id);
  const {row_sha256: _old, ...body} = r; const changed = {...body, inclusion_ast: legacy};
  return {...changed, row_sha256: estimateDeterministicHash(changed)};
 }), ...candidate.resources.filter(r => !oldRows.has(r.row_id))].map((r, ordinal) => ({...r, ordinal}));
 // Independent subject inventory: branch choice + eight CT190 facts + seven
 // unresolved application needs + one derived balance. area_m2 is reused once.
 const expectedNewParameterIds = [choice,'ct190_base_layer_area_m2','ct190_product_scope','ct190_conditions','ct190_supply_reference',
  'ct190_usable_stock_kg','ct190_stock_reference','ct190_required_reserve_kg','ct190_actual_water_l_per_25kg',
  ...pack.needs.map(n => 'ct190_application_need_' + n.id.replaceAll('-','_')),effectiveResourceQuantityParameterId(id('dry-mix-order'))];
 assert.equal(expectedNewParameterIds.length,17); assert.equal(new Set(expectedNewParameterIds).size,17);
 assert.deepEqual(parameters.filter(q => !oldParams.has(q.parameter_id)).map(q => q.parameter_id).sort(), expectedNewParameterIds.slice().sort());
 assert.deepEqual([parameters.length, formulas.length, resources.length], [34,29,29]);
 const newParameterSources: MasterRetainParentBindingsR1['newParameterSources'] = Object.fromEntries(parameters.filter(q => !oldParams.has(q.parameter_id)).map(q => {
  const role = String(q.truth_metadata.value_source_role);
  return [q.parameter_id, role === 'UNRESOLVED_APPLICATION_NORM' ? {kind: 'UNRESOLVED' as const, sourceIds: []}
   : role.includes('DERIVED') ? {kind: 'DERIVED' as const, sourceIds: []} : {kind: 'KNOWN' as const, sourceIds: [pack.sourceId]}];
 }));
 const retained: MasterRetainParentBindingsR1 = {capturedParent: c, capturedParentSha256: input.capturedParentSha256, newParameterSources,
  capturedSourcePreimage: {sourceKey: pack.sourceId, expected: null}};
 const applicabilityByRowId = Object.fromEntries(sourceBoundKeys.map(key => [id(key), {sourceArtifactSha256: pack.source.sha256,
  selectedOnly: selected, materialEdition: 'KZ', approximate: true, quantityBasis: key === 'attachment-consumed' ? 'AREA_M2_TIMES_APPROX5'
   : key === 'base-layer-consumed' ? 'SEPARATELY_MEASURED_BASE_AREA_M2_TIMES_APPROX5_8'
   : key === 'dry-mix-consumed' ? 'SUM_TWO_MATERIAL_CONSUMPTIONS_ONE_OWNER' : 'DECLARED_WATER_RANGE_PER25KG_CONSUMED_MIX',
  laborMachineOrMeshNormClaimed: false, fullTechnicalAcceptance: false}]));
 const binding = {rowId: id(sourceBoundKeys[0]), additionalRowIds: sourceBoundKeys.slice(1).map(id),
  applicability: {materialOnly: true, fullTechnicalAcceptance: false}, applicabilityByRowId, retainParentBindings: retained};
 const openRows = pack.needs.map(n => id('open-' + n.id));
 const included = [...passport.included_scope_ru,
  'При явном выборе CT 190 исполнения KZ: предварительный расход около 5 кг/м² приклеивания и около 5,8 кг/м² отдельно измеренного защитного слоя.',
  'Один общий заказ CT 190 в мешках 25 кг с подтверждённым остатком и резервом; вода только на расходуемую смесь, 5,75–6,25 л/25 кг.',
  'Прежняя проектная клеевая ветвь и её ручные количество, цена, название и исключение сохраняются. Технологические строки не дают второй оплаты труда.'];
 const excluded = passport.excluded_scope_ru.map((s: string) => s.includes('базовый армирующий слой')
  ? 'Декоративная штукатурка и окраска исключены. В прежней ветви защитный слой с сеткой по-прежнему исключён; новая ветвь CT 190 содержит только его предварительную материальную часть.' : s);
 assert(excluded.some((s: string) => s.includes('прежней ветви')), 'CT190_EXPLICIT_OLD_BASE_LAYER_EXCLUSION_REWRITE_REQUIRED');
 excluded.push('Сетка, труд защитного слоя, инструмент, доставка, подготовка/защита и уточнение времени использования смеси остаются открытыми. Полная техническая готовность и текущие цены не заявлены.');
 const entry = (row: string, formula: string, operation: string, source: string, condition: string, quantityRule: string) => ({
  expectedResourceId: contract + ':' + row, operationId: operation, sourceId: source, condition, quantityRule, formulaId: formula, resolution: {kind: 'ROW', rowId: row}});
 const oldRoles = [
  ['rc09:facade_mineral_wool_install','facade_mineral_wool_install_area_v1','project-installation'],
  ['rc09:facade_mineral_wool_board_120mm','facade_mineral_wool_board_quantity_v1','project-board-layout'],
  ['rc09:facade_mineral_wool_adhesive','facade_mineral_wool_adhesive_mass_v1','legacy-adhesive'],
  ['rc09:facade_disc_dowel_200mm_metal_pin','facade_disc_dowel_quantity_v1','project-fasteners'],
  ['rc09:facade_insulation_lift','facade_insulation_lift_shift_v1','project-lift'],
  ['rc09:facade_insulation_pullout_control','facade_insulation_pullout_control_count_v1','project-fastener-control'],
  ['rc09:mineral_wool_fire_barrier_lamella','mineral_wool_fire_barrier_lamella_length_v1','project-fire-barrier'],
  ['rc09:facade_start_profile','facade_start_profile_length_v1','project-start-profile'],
 ];
 const materialRoles = ['attachment-consumed','base-layer-consumed','dry-mix-consumed','dry-mix-order','dry-mix-bags','dry-mix-remaining',
  'dry-mix-free','dry-mix-shortage','dry-mix-reserve-deficit','water-min','water-max','water-used','process-attachment','process-base-layer'];
 const map = {contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT, sourceKind: 'PRODUCT_SYSTEM_TDS', generatedFromCurrentRows: false,
  evidenceSha256: pack.source.sha256, evidenceReferences: [pack.source.url, pack.source.artifactRelativePath, input.capturedParentSha256],
  predecessorPassportRetainedAsEvidence: clone(passport), fullTechnicalAcceptance: false,
  entries: [...oldRoles.map(([row, formula, operation]) => entry(row!, formula!, operation!, c.definition.source_metadata.sourceId,
   row === pack.legacyOwner.rowId ? 'EXPLICIT_LEGACY_MIX_BRANCH_ONLY' : 'EXACT_CAPTURED_PROJECT_SCOPE_WITH_ORIGINAL_CONDITIONAL_GATES', 'UNCHANGED_CAPTURED_PROJECT_FACT_OR_GEOMETRY')),
   ...materialRoles.map(key => entry(id(key), id('formula:' + key), key.includes('base-layer') ? 'ct190-base-layer' : 'ct190-attachment-and-balance', pack.sourceId,
    'EXPLICIT_CT190_KZ_BRANCH_ONLY', sourceBoundKeys.some(k => k === key) ? 'APPROXIMATE_MANUFACTURER_MATERIAL_QUANTITY' : 'DERIVED_BALANCE_OR_EXPLICIT_PROJECT_WATER_DOSE_OR_INFORMATIONAL_PROCESS')),
   ...pack.needs.map(n => entry(id('open-' + n.id), id('formula:open-' + n.id), 'ct190-' + n.operationId, 'UNRESOLVED_APPLICATION_NORM',
    'EXPLICIT_CT190_KZ_BRANCH_ONLY', 'UNKNOWN_UNIT_AND_QUANTITY_NOT_A_USER_SUPPLIED_NORM'))]};
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap: map, formulaDefinitions: formulas, resourceDefinitions: resources}), []);
 const {adjacentDecorativeFacadeLayersExcluded: _oldBroadExclusion, ...oldApplicability} = c.definition.applicability;
 const applicability = {...oldApplicability, ct190MaterialCompletionContract: contract, legacyApplicability: clone(c.definition.applicability),
  materialSystemByExplicitChoice: {[pack.legacyValueRu]: c.definition.applicability.materialSystem, [pack.selectedValueRu]: 'CERESIT_WM_CT190_EXACT_KZ_MATERIAL_SUBSET'},
  decorativePlasterAndPaintExcluded: true, protectiveBaseLayerMaterialOnlyInCt190Branch: true, independentBaseLayerAreaRequired: true,
  primaryMeasureParameterId: 'area_m2', preliminaryCompositionOnly: true, fullTechnicalAcceptance: false};
 const compile = (facts: Json, defs: {parameters: readonly Json[]; formulas: readonly Json[]; resources: readonly Json[]}, edits: Json = {}, prices: CanonicalEstimateCompileCoreInput['priceItems'] = []) => compileCanonicalEstimateCore({
  operation: 'recalculate', catalogId: pack.catalogId, compilerVersion: contract, primaryMeasureParameterId: 'area_m2',
  parameterDefinitions: defs.parameters as CanonicalEstimateCompileCoreInput['parameterDefinitions'], formulaDefinitions: defs.formulas as CanonicalEstimateCompileCoreInput['formulaDefinitions'],
  resourceDefinitions: defs.resources as CanonicalEstimateCompileCoreInput['resourceDefinitions'], submittedParameters: facts, confirmedParameters: {},
  rowOverrides: edits, priceItems: prices, currencyCode: 'KGS', maximumResourceRows: defs.resources.length, hashJson: async v => estimateDeterministicHash(v)});
 const next = {parameters, formulas, resources};
 const verifyCore = async () => {
  const registry = facadeCt190RegistryDescriptorWorkR1();
  const representative = prepareMasterRetainedBindingRepresentativeR1({config: {stopCode: 'FACADE_CT190_RETAINED_R1', catalogId: pack.catalogId,
   parentReleaseId: c.definition.release_id, binding}, newSource: registry.managedSource, newLocators: registry.managedLocators}, {...next,
   newBindings: Object.entries(applicabilityByRowId).map(([row_id, applicability]) => ({row_id, locator_id: registry.managedLocators[0]!.id, applicability})),
   successorProvenance: {contract, sourceId: pack.sourceId, normId: pack.normId, parentDefinitionId: c.definition.id, parentBaselineId: c.baseline.id, capturedParentSha256: input.capturedParentSha256}});
  assert.equal(representative.expectedNormativeBindingCount, c.bindings.length + 5);
  for (const q of c.parameters) assert.deepEqual(representative.normativeSourceIds[q.parameter_id], c.baseline.normative_source_ids[q.parameter_id]);
  const edits = {[pack.legacyOwner.rowId]: {quantity: '77', unitPrice: '2', titleRu: 'TEST_ONLY retained legacy mix', provenance: {kind: 'manual', reason: 'TEST_ONLY preservation verification'}}};
  const old = await compile({...legacyFacts}, c, edits), same = await compile({...legacyFacts, [choice]: pack.legacyValueRu}, next, edits);
  const view = (r: typeof old) => r.rows.map(q => [q.row_id,q.quantity,q.unit_price,q.amount,q.title_ru,q.included_in_estimate,q.included_in_procurement]);
  assert.deepEqual(view(same), view(old)); assert.equal(same.totals.amount, '154');
  const excludedEdits = {[pack.legacyOwner.rowId]: {...edits[pack.legacyOwner.rowId], includedInEstimate: false, includedInProcurement: false}};
  const oldExcluded = await compile({...legacyFacts}, c, excludedEdits);
  const sameExcluded = await compile({...legacyFacts, [choice]: pack.legacyValueRu}, next, excludedEdits);
  assert.deepEqual(view(sameExcluded), view(oldExcluded)); assert.equal(sameExcluded.totals.amount, '0');
  const f: Json = {...legacyFacts, [choice]: pack.selectedValueRu, area_m2: '100', ct190_base_layer_area_m2: '100',
   ct190_product_scope: pack.selectedValueRu, ct190_conditions: conditions,
   ct190_supply_reference: 'TEST_ONLY exact KZ 25kg batch', ct190_usable_stock_kg: '0', ct190_required_reserve_kg: '0'};
  delete f.facade_adhesive_mass_kg; delete f.facade_adhesive_designation;
  const chosen = await compile(f, next, {}, [{price_key: pack.legacyOwner.rowId, unit_id: 'kg', currency_code: 'KGS', unit_price: '77', snapshot_id: 'TEST_ONLY_LEGACY_PRICE'}]);
  assert(!chosen.rows.some(r => r.row_id === pack.legacyOwner.rowId));
  assert.equal(chosen.rows.find(r => r.row_id === id('dry-mix-order'))?.quantity, '1100');
  assert.equal(chosen.rows.find(r => r.row_id === id('dry-mix-order'))?.unit_price, null); assert.equal(chosen.totals.amount, '0');
  assert(openRows.every(row => chosen.preliminaryNeeds.some(n => n.row_id === row)));
  return {status: 'PASS_CT190_RETAINED_DRAFT_PURE_ONLY', shape: [34,29,29], retainedShape: [17,8,8], oldBindings: c.bindings.length,
   newBindings: 5, oldSourceArrays: 17, newSourceArrays: Object.keys(newParameterSources).length, originalPriceBindingRows: input.parentPriceBindings.length,
   legacyManualQuantityPriceTitleExclusionPolicyPreserved: true, newGenericPriceInheritanceAllowed: false, unresolvedNeeds: 7,
   independentMapEntries: map.entries.length, fullTechnicalAcceptance: false, publicationPerformed: false};
 };
 return {capture: c, passport, search, next, binding, applicability, included, excluded, completenessMap: map, openRows, verifyCore};
}

export type FacadeCt190RootBindingWorkR1 = Readonly<{status: 'ROOT_VERIFIED_CURRENT_FACADE_CT190_RETAINED_R1'; contract: typeof contract;
 executionContext: Readonly<{sourceHead: string; recordedReleaseSourceCommit: string; definitionReleaseId: string; searchReleaseId: string}>;
 currentPointerPin: Pin; rootDecisionPin: Pin; freshParentCapturePin: Pin; closedCaptureGuardPin: Pin; freshScopedCapturePin: Pin;
 masterPath: string; masterSha256: string; parent: FacadeCt190CapturedDraftWorkR1; capturedScopedNormativeRegistry: MasterCapturedScopedNormativeRegistryR1;
 freshParentBodySha256: string; freshScopedCaptureValueSha256: string;
 sharedSourcePins: readonly Pin[]; acceptedSubjectProofPins: readonly Pin[]; automaticRebaseAllowed: false;
 readOnly: true; allTransactionsRolledBack: true; allConnectionsClosed: true; databaseWritesPerformed: false}>;

function exactBytes(pin: Pin): Buffer {
 assert(HASH.test(pin.sha256)); const bytes = readFileSync(resolve(pin.path)); assert.equal(sha(bytes), pin.sha256, 'CT190_ROOT_PIN:' + pin.path);
 return bytes;
}
function load(pin: Pin): Json {return JSON.parse(exactBytes(pin).toString('utf8'));}
/** Requires a real fresh ROOT binding; this file never authors/approves one. */
export function prepareFacadeCt190RetainedWorkR1(input: Readonly<{rootBindingPin: Pin; outputRoot: string}>): MasterSingleDefinitionSuccessorConfig {
 const b = load(input.rootBindingPin) as FacadeCt190RootBindingWorkR1, x = b.executionContext;
 assert.equal(b.status, 'ROOT_VERIFIED_CURRENT_FACADE_CT190_RETAINED_R1'); assert.equal(b.contract, contract);
 assert.equal(b.automaticRebaseAllowed, false); assert.equal(b.readOnly, true); assert.equal(b.allTransactionsRolledBack, true);
 assert.equal(b.allConnectionsClosed, true); assert.equal(b.databaseWritesPerformed, false);
 assert(/^[a-f0-9]{40}$/u.test(x.sourceHead) && /^[a-f0-9]{40}$/u.test(x.recordedReleaseSourceCommit));
 assert(UUID.test(x.definitionReleaseId) && UUID.test(x.searchReleaseId)); assert(HASH.test(b.masterSha256));
 assert.equal(sha(readFileSync(b.masterPath)), b.masterSha256);
 const pointer = load(b.currentPointerPin); assert.equal(pointer.definitionReleaseId, x.definitionReleaseId); assert.equal(pointer.searchReleaseId, x.searchReleaseId);
 const decision = load(b.rootDecisionPin); assert.equal(decision.publicationDesignAdmitted, true); assert.equal(decision.fullTechnicalAcceptance, false);
 assert.equal(decision.catalogId, pack.catalogId); assert.equal(decision.oldDefinitionSha256, target.definitionSha256);
 assert.equal(decision.capturedParentSha256, b.parent.capturedParentSha256); assert.equal(decision.explicitBaseLayerMaterialScopeAdmitted, true);
 assert.equal(decision.legacyGuidesAndPassportExclusionsUpdated, true); assert.equal(decision.legacyManualEditsAndAllOldBindingsPreserved, true);
 assert.equal(hash(b.parent), b.freshParentBodySha256); assert.equal(hash(b.capturedScopedNormativeRegistry), b.freshScopedCaptureValueSha256);
 assert.equal(decision.freshParentCaptureSha256, b.freshParentCapturePin.sha256); assert.equal(decision.freshScopedCaptureSha256, b.freshScopedCapturePin.sha256);
 assert.equal(decision.freshParentBodySha256, b.freshParentBodySha256); assert.equal(decision.freshScopedCaptureValueSha256, b.freshScopedCaptureValueSha256);
 load(b.freshParentCapturePin); load(b.freshScopedCapturePin);
 const guard = load(b.closedCaptureGuardPin); assert.equal(guard.error, null); assert.deepEqual(guard.cleanupErrors, []); assert.deepEqual(guard.remainingOwnedProcesses, []);
 assert.deepEqual(b.sharedSourcePins.map(p => p.path).sort(), ['scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
  'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1.ts',
  'scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts'].sort());
 for (const pin of b.sharedSourcePins) exactBytes(pin);
 assert(b.acceptedSubjectProofPins.length > 0);
 for (const pin of b.acceptedSubjectProofPins) load(pin);
 const draft = prepareFacadeCt190RetainedDraftWorkR1(b.parent), registry = facadeCt190RegistryDescriptorWorkR1();
 assert.deepEqual(b.capturedScopedNormativeRegistry.scope, registry.scope);
 assert(resolveMasterScopedNormativeRegistryOptInR1({config: {stopCode: 'FACADE_CT190_RETAINED_R1', normId: pack.normId,
  capturedScopedNormativeRegistry: b.capturedScopedNormativeRegistry, binding: draft.binding}, newSource: registry.managedSource, newLocators: registry.managedLocators}));
 const sourcePaths = [...new Set(['work/stream-c-facade-ct190/prepareFacadeCt190RetainedWorkR1.ts',
  'src/lib/estimate/v4/facadeCeresitCt190MaterialSubworksR1.ts','src/lib/estimate/v4/facadeMineralWoolInstallationR1.ts',
  'data/estimate-benchmarks/source-packs/facade-ceresit-ct190-kz-material-subworks-r1.json',pack.source.artifactRelativePath,
  ...b.sharedSourcePins.map(p => p.path), ...b.acceptedSubjectProofPins.map(p => p.path), input.rootBindingPin.path,
  b.rootDecisionPin.path,b.freshParentCapturePin.path,b.closedCaptureGuardPin.path,b.freshScopedCapturePin.path])];
 assert(!sourcePaths.includes(b.currentPointerPin.path), 'CT190_MUTABLE_POINTER_NOT_SOURCE_PIN');
 const config: MasterSingleDefinitionSuccessorConfig = {contract, stopCode: 'FACADE_CT190_RETAINED_R1', applicationName: 'facade-ct190-kz-material-retained-r1',
  expectedBranch: 'codex/r4-a5-clean-08b18902', masterPath: b.masterPath, masterSha256: b.masterSha256,
  parentReleaseId: x.definitionReleaseId, parentSearchReleaseId: x.searchReleaseId, currentReleasePath: b.currentPointerPin.path, outputRoot: input.outputRoot, sourcePaths,
  catalogId: pack.catalogId, sourceId: pack.sourceId, normId: pack.normId, sourceMetadata: registry.sourceMetadata, capturedScopedNormativeRegistry: b.capturedScopedNormativeRegistry,
  parameterDefinitions: draft.next.parameters, formulaDefinitions: draft.next.formulas, resourceDefinitions: draft.next.resources,
  expectedParentShape: [17,8,8], benchmarkOrdinal: 0, validationScenario: 'CT190_RETAIN17_8_8_LEGACY154_EXPLICIT100_AND100_APPROX1080_ORDER1100_SEVEN_OPEN_NEEDS',
  shortInput: {area_m2: '100'}, acceptanceInput: {...legacyFacts, [choice]: pack.legacyValueRu}, runtimeProfileInput: {}, runtimeProfileClassification: {}, runtimeProfileSourceIds: {},
  passport: {canonicalRuName: draft.capture.definition.passport.canonicalRuName, workKey: draft.capture.definition.passport.workKey,
   physicalResultRu: 'Монтаж фасадного минераловатного утеплителя 120 мм; условная частичная материальная ветвь CT 190 KZ для приклеивания и отдельно измеренного защитного слоя.',
   includedScopeRu: draft.included, excludedScopeRu: draft.excluded, independentCompletenessMap: draft.completenessMap, unresolvedApplicableResourceRowIds: draft.openRows},
  applicability: draft.applicability, binding: draft.binding, locator: registry.locator,
  search: {primaryUom: 'm2', canonicalNameRu: draft.capture.definition.passport.canonicalRuName,
   aliases: [...draft.search.aliases,'CT 190 KZ приклеивание минваты и предварительный материал защитного слоя'],
   shortScopeRu: scopeRu, keyDistinguishingParameters: ['area_m2',choice,'ct190_base_layer_area_m2','ct190_product_scope'],
   clarificationFields: draft.next.parameters.filter(q => q.truth_metadata.visibility_role === 'USER_INPUT').map(q => q.parameter_id),
   includedBoundaries: draft.included, excludedBoundaries: draft.excluded, extraSearchTermsRu: 'Ceresit WM CT190 KZ 25 кг 5 5,8 предварительная смесь защитный слой',
   sourceProvenance: {contract, exactLegacySourceRetained: true, currentCaptureSha256: b.parent.capturedParentSha256, fullTechnicalAcceptance: false, materialOnly: true}},
  forbiddenAdjacentMatchers: [/facade\.decorative\.plaster|facade\.paint|professional_.*_set/iu], owner: 'ROOT_SINGLE_INTEGRATOR', receiptFileStem: 'facade_ct190_material_retained_r1',
  verifyCore: draft.verifyCore};
 assert.equal(config.catalogAppend, undefined); return config;
}
