import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {interiorWallFinishingGeometryPackR3 as pack, interiorWallFinishingGeometryGroupDefinitionR3 as definition,
 interiorWallFinishingGeometryParameterR3 as p, interiorWallFinishingGeometryRowR3 as r,
 interiorWallFinishingGeometryGroupMapR3 as groupMap,
 interiorWallFinishingIndependentCompletenessMapR3 as completenessMap} from './interiorWallFinishingGeometryGroupR3';
import {compileCanonicalEstimateCore, type CanonicalEstimateCompileCoreInput,
 type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateOperationReferences} from '../backendPlatform/canonicalEstimateOperationComposition';
import {assertCanonicalPurchaseReadinessV1, canonicalPurchaseShortagesV1} from '../backendPlatform/canonicalPurchaseBalanceV1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {isCanonicalEstimateConsumerSuppliedParameter} from '../backendPlatform/canonicalEstimateParameterSemantics';
import type {CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import {canonicalPublicResourceRowKindV1,parseCanonicalPublicResourcePresentationV1} from '../backendPlatform/canonicalPublicResourcePresentationV1';
import {validateIndependentCompletenessMapReferences} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {buildCanonicalProfessionalPdfProjection} from '../backendPlatform/canonicalProfessionalPdf';
import {buildCanonicalProcurementProjection,selectCanonicalArtifactRows,canonicalArtifactPreliminaryNeeds} from '../backendPlatform/canonicalEstimateArtifactContract';

type Json = Record<string, any>;
// Independently written expected composition, not generated from active rows.
// These are the obligations of the selected technology, including uncreated
// resources. Deleting a row must therefore fail this check, not improve FULL.
const expectedStageRows: Readonly<Record<string, readonly string[]>> = {
 preparation: ['truck', 'tool-dedust-brush', 'tool-floor-brush', 'tool-dustpan', 'tool-waste-bin', 'tool-waste-bin-lid', 'open-handling-profile', 'open-access', 'open-ppe'],
 'preputty-prime': ['preputty-primer-order', 'workers-preputty', 'lift-preputty', 'operators', 'truck',
  'rags-consumed', 'rags-contribution-preputty', 'tool-waterborne-brush', 'tool-application-pail', 'tool-application-pail-lid', 'open-washing-water', 'open-access', 'open-ppe', 'open-handling-profile'],
 'full-putty': ['ready-putty-order', 'workers', 'tool-putty-spatula', 'open-stirring-tool', 'open-washing-water', 'open-access', 'open-ppe'],
 'full-sand': ['abrasive-consumed', 'workers', 'tool-sanding-holder', 'tool-paper-shears', 'tool-paper-rule', 'tool-paper-mark', 'tool-abrasive-storage', 'abrasive-sheet-provision', 'tool-dedust-brush', 'tool-floor-brush', 'tool-dustpan', 'tool-waste-bin', 'tool-waste-bin-lid', 'open-access', 'open-ppe'],
 prime: ['primer-order', 'workers', 'tool-waterborne-brush', 'tool-application-pail', 'tool-application-pail-lid', 'open-washing-water', 'open-access', 'open-ppe'],
 'primer-sand': ['abrasive-consumed', 'workers', 'tool-sanding-holder', 'tool-paper-shears', 'tool-paper-rule', 'tool-paper-mark', 'tool-abrasive-storage', 'abrasive-sheet-provision', 'tool-dedust-brush', 'tool-floor-brush', 'tool-dustpan', 'tool-waste-bin', 'tool-waste-bin-lid', 'open-access', 'open-ppe'],
 'two-coat-paint': ['paint-order', 'workers', 'tool-waterborne-brush', 'tool-application-pail', 'tool-application-pail-lid', 'open-washing-water', 'open-access', 'open-ppe'],
 'ordinary-completion': ['rags-consumed', 'workers', 'tool-putty-spatula', 'tool-waterborne-brush', 'tool-application-pail', 'tool-application-pail-lid', 'open-washing-water', 'open-access', 'open-ppe'],
};
const expectedOrders = ['paint-order', 'preputty-primer-order', 'primer-order', 'ready-putty-order'].map(r).sort();
function assertExpectedComposition(rows: readonly CanonicalEstimateResourceDefinition[]) {
 assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap: completenessMap(),
  formulaDefinitions: definition().formulas, resourceDefinitions: rows}), []);
 const byId = new Map(rows.map(row => [row.row_id, row]));
 assert.equal(byId.size, rows.length, 'duplicate row identity');
 for (const [stage, keys] of Object.entries(expectedStageRows)) {
  assert(byId.has(r('process-' + stage)), 'missing process:' + stage);
  for (const key of [...keys, 'ordinary-access', 'ordinary-accompanying']) {
   const row = byId.get(r(key)); assert(row, 'missing required resource:' + key);
   assert(canonicalEstimateOperationReferences(row.resource_graph?.operationCompositionV1)
    .some(op => op.operationId === r('operation:' + stage)), 'wrong stage:' + stage + ':' + key);
  }
 }
 assert.deepEqual(rows.filter(row => row.procurement_eligible).map(row => row.row_id).sort(), expectedOrders,
  'only four compatible aggregate product orders; no duplicate consumable/tool order');
}

export async function runInteriorWallFinishingGeometryChecksR3(canonicalRoot = 'C:/dev/rik-expo-app-r4a5-dc4f0ce7') {
 const subject = definition(), completed: string[] = [];
 const facts = (area: string | number = '20.1'): Json => ({[p(pack.areaId)]: area});
 const compile = (parameters: Json, rowOverrides: CanonicalEstimateCompileCoreInput['rowOverrides'] = {}) => compileCanonicalEstimateCore({
  operation: 'recalculate', catalogId: pack.selectedExistingCatalogId, compilerVersion: pack.contract,
  primaryMeasureParameterId: p(pack.areaId), parameterDefinitions: [...subject.parameters],
  formulaDefinitions: [...subject.formulas], resourceDefinitions: [...subject.resources],
  submittedParameters: parameters, confirmedParameters: {}, rowOverrides, priceItems: [], currencyCode: 'KGS',
  maximumResourceRows: subject.resources.length, hashJson: async value => estimateDeterministicHash(value)});
 type Result = Awaited<ReturnType<typeof compile>>;
 const row = (result: Result, key: string) => result.rows.find(row => row.row_id === r(key));
 const quantity = (result: Result, key: string) => Number(row(result, key)?.quantity);
 const check = async (name: string, fn: () => unknown | Promise<unknown>) => {await fn(); completed.push(name);};
 const provenance = {kind: 'manual' as const, reason: 'TEST_ONLY user edit, never source evidence'};
 await check('single crew whole-sheet supply preserves gross norm and gives one usable charge', async () => {
  const unitSheet = 230 * 280 / 1e6, charge = 115 * 280 / 1e6;
  assert.equal(unitSheet, .0644); assert.equal(charge, .0322);
  assert.equal(2 * charge, unitSheet, 'central cut gives two charges, no area loss');
  assert.equal((115 - 105) / 2, 5); assert.equal((280 - 212) / 2, 34);
  for (const [area, expectedSheets] of [[.0001, 1], [1, 1], [7.66, 1], [7.67, 2], [20.1, 3], [100, 14]]) {
   const actual = await compile(facts(area));
   assert.equal(quantity(actual, 'abrasive-sheet-provision'), expectedSheets, 'whole sheet provision:' + area);
   assert(Math.abs(quantity(actual, 'abrasive-consumed') - area * .0084) < 1e-12, 'exact gross normative m2, not holder contact area');
   assert(expectedSheets * .0644 >= area * .0084, 'provided gross paper covers aggregate norm');
   assert(expectedSheets * 2 >= 1, 'at least one mountable charge');
   for (const key of ['tool-sanding-holder', 'tool-paper-shears', 'tool-paper-rule', 'tool-paper-mark', 'tool-abrasive-storage',
    'tool-dedust-brush', 'tool-floor-brush', 'tool-dustpan', 'tool-waste-bin', 'tool-waste-bin-lid', 'tool-work-clothing', 'tool-waterproof-gloves'])
    assert.equal(quantity(actual, key), 1, 'one sequential post:' + key);
  }
  const normal = await compile(facts());
  assert(Math.abs(quantity(normal, 'abrasive-sheet-provision') * .0644 - .1932) < 1e-12);
  assert(Math.abs(.1932 - quantity(normal, 'abrasive-consumed') - .02436) < 1e-12,
   'gross excess is common remainder, not loss or a second assigned stock credit');
  assert.equal(subject.parameters.filter(q => /abrasive.*stock|stock.*abrasive/u.test(q.parameter_id)).length, 0);
  for (const key of ['tool-sanding-holder', 'tool-paper-shears', 'tool-paper-rule', 'tool-paper-mark', 'tool-abrasive-storage',
   'tool-dedust-brush', 'tool-floor-brush', 'tool-dustpan', 'tool-waste-bin', 'tool-waste-bin-lid', 'tool-work-clothing', 'tool-waterproof-gloves', 'abrasive-sheet-provision']) {
   const resource = subject.resources.find(row => row.row_id === r(key))!;
   assert.equal(resource.cost_owner_id, r('whole-work'));
   assert.equal(resource.procurement_eligible, false, 'inventory provided by one owner, no second purchase');
   assert(parseCanonicalPublicResourcePresentationV1(resource.resource_graph?.publicResourcePresentationV1));
   assert.equal(canonicalPublicResourceRowKindV1({rowId:resource.row_id,titleRu:resource.title_ru,category:resource.category,
    descriptor:resource.resource_graph?.publicResourcePresentationV1,graph:resource.resource_graph,
    costTreatment:resource.resource_graph?.costTreatment,unitPrice:null,amount:null}), 'RESOURCE');
   const zero = await compile(facts(), {[r(key)]: {quantity: '0', provenance}});
   const zeroRow = row(zero, key)!;
   assert.equal(zeroRow.quantity, '0');
   assert.equal((zeroRow.calculation_trace as Json).purchaseBalance.procurementReady, false);
   assert(canonicalPurchaseShortagesV1([zeroRow]).some(shortage => shortage.rowId === r(key)));
   assert.throws(() => assertCanonicalPurchaseReadinessV1([zeroRow]), (error: any) => error.code === 'PROCUREMENT_MATERIAL_SHORTAGE');
   await assert.rejects(() => compile(facts(), {[r(key)]: {quantity: '0.5', provenance}}), (error: any) => error.code === 'ROW_AMENDMENT_INVALID');
  }
  assert.deepEqual(pack.openSourceNeeds.map(need => need.id), ['stirring-tool', 'washing-water', 'access', 'ppe', 'handling-profile']);
  assert.equal(pack.fullTechnicalAcceptance, false, 'toolkit does not silently close water, dust safety, access or handling');
 });

 await check('independent manual crew composition rejects omission, wrong stage and duplicate purchase', () => {
  for (const key of ['tool-sanding-holder', 'abrasive-sheet-provision', 'tool-dedust-brush', 'tool-waste-bin']) {
   const missing = subject.resources.filter(row => row.row_id !== r(key));
   assert.throws(() => assertExpectedComposition(missing), /ROW_REFERENCE|missing required/u);
  }
  const misplaced = subject.resources.map(row => row.row_id !== r('tool-sanding-holder') ? row : ({...row,
   resource_graph: {...row.resource_graph, operationCompositionV1: {...row.resource_graph?.operationCompositionV1 as Json,
    additionalOperations: []}}}));
  assert.throws(() => assertExpectedComposition(misplaced), /OPERATION_BINDING|wrong stage/u);
  const doublePurchase = subject.resources.map(row => row.row_id !== r('abrasive-sheet-provision') ? row : ({...row,procurement_eligible:true}));
  assert.throws(() => assertExpectedComposition(doublePurchase), /only four/u);
 });
 await check('concise public names retain exact source titles and all unresolved physical resources', () => {
  const byKey = (key: string) => subject.resources.find(row => row.row_id === r(key))!;
  assert.equal((byKey('whole-work').resource_graph.publicResourcePresentationV1 as Json).nameRu, 'Работы по отделке стен');
  assert.equal((byKey('open-handling-profile').resource_graph.publicResourcePresentationV1 as Json).nameRu, 'Средства подачи материалов');
  for (const resource of subject.resources) {
   const display = parseCanonicalPublicResourcePresentationV1(resource.resource_graph.publicResourcePresentationV1)!;
   assert(display, resource.row_id); assert.equal(display.sourceTitleRu, resource.title_ru);
  }
  for (const need of pack.openSourceNeeds) {
   const resource = byKey('open-' + need.id), display = resource.resource_graph.publicResourcePresentationV1 as Json;
   assert.notEqual(display.rowKind, 'CALCULATION_DETAIL');
   assert.equal((resource.source_metadata as Json).unresolvedPhysicalResourceReasonRu, need.reasonRu);
  }
 });
 await check('primary source hashes and exact historical quantities remain separate from current VGT', () => {
  for (const source of pack.sources) {
   const f = resolve(canonicalRoot, source.path);
   assert.equal(createHash('sha256').update(readFileSync(f)).digest('hex'), source.sha256, source.id);
  }
  assert.equal(pack.exactLegacyNormMaterials.find(m => m.id === 'paint')?.sourcePer100M2, '0.03');
  assert.equal(pack.exactLegacyNormMaterials.find(m => m.id === 'ready-putty')?.sourcePer100M2, '0.051');
  assert.equal(pack.preputtyLegacyNormMaterial.genericPrimerTonnesPer100M2, '0.013');
  assert.equal(pack.materials.find(m => m.id === 'paint')?.perM2, '0.36');
  assert.equal(pack.materials.find(m => m.id === 'preputty-primer')?.perM2, '0.12');
  assert.equal(pack.masterSha256, '28089a66fa72e574dc730ed67beaec81e320380ee3dc8206561437c5cdcb9239');
 });
 await check('only area mandatory; optional whole compatible stock is not a customer technical norm', () => {
  assert.deepEqual(subject.ordinaryParameterIds, [p(pack.areaId)]);
  assert.deepEqual(subject.parameters.filter(q => q.required).map(q => q.parameter_id), [p(pack.areaId)]);
  assert.deepEqual(subject.runtimeInput, {});
  const apiSchema = (q: typeof subject.parameters[number]) => ({parameterId: q.parameter_id, ordinal: q.ordinal,
   valueType: q.value_type, unitId: q.unit_id, titleRu: q.title_ru, required: q.required,
   defaultValue: q.default_value, constraints: q.constraints_json,
   visibilityRole: q.truth_metadata.visibility_role, valueSourceRole: q.truth_metadata.value_source_role,
   provenance: q.truth_metadata.provenance, formulaConsumers: q.truth_metadata.formula_consumers,
  } as CanonicalEstimateCatalogItem['parameterSchema'][number]);
  assert.equal(isCanonicalEstimateConsumerSuppliedParameter(apiSchema(subject.parameters.find(q => q.parameter_id === p(pack.areaId))!)), true);
  for (const need of pack.openSourceNeeds) {
   const q = subject.parameters.find(q => q.parameter_id === p('need_' + need.id.replaceAll('-', '_')))!;
   assert.equal(q.truth_metadata.value_source_role, 'UNRESOLVED_APPLICATION_NORM');
   assert.equal(q.truth_metadata.visibility_role, 'INTERNAL_ONLY');
   assert.equal(isCanonicalEstimateConsumerSuppliedParameter(apiSchema(q)), false);
   const resource = subject.resources.find(row => row.row_id === r('open-' + need.id))!;
   assert.notEqual((resource.resource_graph?.publicResourcePresentationV1 as Json).rowKind, 'CALCULATION_DETAIL',
    'mandatory physical needs must remain public resources, not collapsed balance details');
  }
 });
 await check('independent20.1m2 control: four real packs and both complete labor norms', async () => {
  const result = await compile(facts());
  const controls: Record<string, number> = {
   'preputty-primer-consumed': 2.412, 'preputty-primer-order': 3, 'preputty-primer-packages': 3,
   'primer-consumed': 4.02, 'primer-order': 6, 'primer-packages': 2,
   'paint-consumed': 7.236, 'paint-order': 7.5, 'paint-packages': 5,
   'ready-putty-consumed': 28.14, 'ready-putty-order': 29, 'ready-putty-packages': 29,
   'abrasive-consumed': .16884, 'rags-consumed': .0804,
   workers: 8.75556, 'workers-preputty': 1.31655, 'workers-total': 10.07211,
   operators: .00603, lift: .00402, 'lift-preputty': .00201, truck: .03216,
  };
  for (const [key, expected] of Object.entries(controls)) assert.equal(quantity(result, key), expected, key);
  for (const key of ['preputty-primer', 'primer', 'paint', 'ready-putty']) assert.equal(quantity(result, key + '-shortage'), 0);
  assert.equal(result.rows.filter(row => row.procurement_eligible).length, 4);
  assert.equal(result.preliminaryNeeds.filter(n => n.need_state === 'QUANTITY_REQUIRED').length, 5,
   'known materials must not erase real profile and cleaning-water needs');
 });
 await check('one serial manual putty position has one specified functional spatula shared with later cleaning', async () => {
  const ordinary = await compile(facts()), larger = await compile(facts(100));
  const tool = subject.resources.find(row => row.row_id === r('tool-putty-spatula'))!;
  assert.equal(quantity(ordinary, 'tool-putty-spatula'), 1);
  assert.equal(quantity(larger, 'tool-putty-spatula'), 1, 'asset demand must not be multiplied by area');
  assert.equal(tool.procurement_eligible, false); assert.equal(tool.cost_owner_id, r('whole-work'));
  assert.equal((tool.source_metadata as Json).sourceRole, 'CAUSAL_SELECTED_SERIAL_STATION_ASSET_DEMAND_WITH_PRIMARY_ITEM_SPECIFICATION');
  assert.equal((tool.source_metadata as Json).manufacturerCrewNormClaimed, false);
  assert.equal((tool.source_metadata as Json).requiredSimultaneousFunctionalCount, 1);
  assert.equal(pack.handToolProfile.simultaneousPositions, 1);
  assert.equal(pack.handToolProfile.parallelWorkOrMultipleBrigadesAdmitted, false);
  assert.equal(pack.handToolProfile.completeItemSpecification.bladeWidthMm, 120);
  assert.deepEqual(pack.handToolProfile.completeItemSpecification.integralParts, ['stainless_blade120mm', 'two_component_handle']);
  assert.equal(Math.max(...pack.handToolProfile.uses.map(use => use.simultaneousPositions * use.toolsPerPosition)), 1);
  assert(pack.handToolProfile.uses[0].processOrdinal < pack.handToolProfile.uses[1].processOrdinal);
  assert.deepEqual(canonicalEstimateOperationReferences(tool.resource_graph?.operationCompositionV1).map(op => op.operationId),
   [r('operation:full-putty'), r('operation:ordinary-completion')]);
  assert.equal(row(ordinary, 'open-spatula'), undefined);
  assert(ordinary.preliminaryNeeds.some(need => need.row_id === r('open-stirring-tool')));
  assert(ordinary.preliminaryNeeds.some(need => need.row_id === r('open-washing-water')));
  assert.notEqual((tool.resource_graph?.publicResourcePresentationV1 as Json).rowKind, 'CALCULATION_DETAIL');
  await assert.rejects(compile({...facts(), [p('hand_tool_station_count')]: 2}), 'unsupported parallel profile is not an object fact');
 });
 await check('the concrete included spatula balance rejects fractional provision and exposes a manual zero shortage', async () => {
  const normal = await compile(facts());
  const provision = row(normal, 'tool-putty-spatula')!;
  const balance = (provision.calculation_trace as Json).purchaseBalance as Json;
  assert.equal(balance.unitId, 'item'); assert.equal(balance.consumed, '1');
  assert.equal(balance.quantum, '1'); assert.equal(balance.effectiveOrder, '1');
  assert.equal(balance.consumptionShortage, '0'); assert.equal(balance.procurementReady, true);
  assert.equal(provision.procurement_eligible, false); assert.equal(provision.included_in_procurement, false);
  assert.equal(provision.included_in_estimate, false); assert.equal(provision.amount, null);
  assert.doesNotThrow(() => assertCanonicalPurchaseReadinessV1([provision]));
  const zero = await compile(facts(), {[r('tool-putty-spatula')]: {quantity: '0', provenance}});
  const unprovided = row(zero, 'tool-putty-spatula')!;
  const shortage = (unprovided.calculation_trace as Json).purchaseBalance as Json;
  assert.equal(quantity(zero, 'tool-putty-spatula'), 0);
  assert.equal(shortage.consumed, '1'); assert.equal(shortage.effectiveOrder, '0');
  assert.equal(shortage.consumptionShortage, '1'); assert.equal(shortage.procurementReady, false);
  assert.equal(unprovided.procurement_readiness, 'SHORTAGE');
  assert.equal(unprovided.procurement_eligible, false); assert.equal(unprovided.included_in_procurement, false);
  assert.equal(unprovided.included_in_estimate, false); assert.equal(unprovided.amount, null);
  assert.deepEqual(canonicalPurchaseShortagesV1([unprovided]).map(item => ({rowId: item.rowId, unitId: item.unitId,
   consumptionShortage: item.consumptionShortage})), [{rowId: r('tool-putty-spatula'), unitId: 'item', consumptionShortage: '1'}]);
  assert.throws(() => assertCanonicalPurchaseReadinessV1([unprovided]),
   (error: any) => error.code === 'PROCUREMENT_MATERIAL_SHORTAGE'
    && error.shortages.length === 1 && error.shortages[0].rowId === r('tool-putty-spatula'));
  assert.deepEqual(zero.rows.filter(row => row.procurement_eligible).map(row => row.row_id).sort(), expectedOrders);
  await assert.rejects(compile(facts(), {[r('tool-putty-spatula')]: {quantity: '0.5', provenance}}),
   (error: any) => error.code === 'ROW_AMENDMENT_INVALID');
 });
 await check('one specified synthetic brush serves all liquid VGT stages and has its own included physical sufficiency balance', async () => {
  const normal = await compile(facts()), larger = await compile(facts(100));
  const brush = subject.resources.find(row => row.row_id === r('tool-waterborne-brush'))!;
  assert.equal(quantity(normal, 'tool-waterborne-brush'), 1); assert.equal(quantity(larger, 'tool-waterborne-brush'), 1);
  assert.equal(brush.procurement_eligible, false); assert.equal(brush.cost_owner_id, r('whole-work'));
  assert.equal(pack.manualApplicationProfile.completeItemSpecification.nominalWorkingWidthMm, 100);
  assert.deepEqual(pack.manualApplicationProfile.completeItemSpecification.integralParts,
   ['synthetic_bristle', 'nickel_plated_steel_ferrule', 'plastic_handle']);
  assert.equal(pack.manualApplicationProfile.uses[2].sequentialApplications, 2);
  assert.equal(pack.manualApplicationProfile.completeItemSpecification.workingVesselIncluded, false);
  assert.deepEqual(canonicalEstimateOperationReferences(brush.resource_graph?.operationCompositionV1).map(ref => ref.operationId),
   ['preputty-prime', 'prime', 'two-coat-paint', 'ordinary-completion'].map(id => r('operation:' + id)));
  const normalBrush = row(normal, 'tool-waterborne-brush')!;
  assert.doesNotThrow(() => assertCanonicalPurchaseReadinessV1([normalBrush]));
  assert.equal(normalBrush.included_in_estimate, false); assert.equal(normalBrush.included_in_procurement, false);
  assert.equal(normalBrush.amount, null);
  const zero = await compile(facts(), {[r('tool-waterborne-brush')]: {quantity: '0', provenance}});
  const shortageBrush = row(zero, 'tool-waterborne-brush')!;
  assert.equal(quantity(zero, 'tool-waterborne-brush'), 0);
  assert.deepEqual(canonicalPurchaseShortagesV1([shortageBrush]).map(item => [item.rowId, item.consumptionShortage]),
   [[r('tool-waterborne-brush'), '1']]);
  assert.throws(() => assertCanonicalPurchaseReadinessV1([shortageBrush]),
   (error: any) => error.code === 'PROCUREMENT_MATERIAL_SHORTAGE' && error.shortages[0].rowId === r('tool-waterborne-brush'));
  await assert.rejects(compile(facts(), {[r('tool-waterborne-brush')]: {quantity: '0.5', provenance}}),
   (error: any) => error.code === 'ROW_AMENDMENT_INVALID');
  assert.equal(quantity(normal, 'tool-application-pail'), 1);
  assert.equal(quantity(normal, 'tool-application-pail-lid'), 1);
  assert(normal.preliminaryNeeds.some(need => need.row_id === r('open-washing-water')));
 });
 await check('one Pelican pail and separately provided matching lid cover all serial liquid stages without repeat purchases', async () => {
  const normal = await compile(facts()), larger = await compile(facts(100));
  for (const key of ['tool-application-pail', 'tool-application-pail-lid']) {
   assert.equal(quantity(normal, key), 1); assert.equal(quantity(larger, key), 1);
   const component = subject.resources.find(row => row.row_id === r(key))!;
   assert.equal(component.cost_owner_id, r('whole-work')); assert.equal(component.procurement_eligible, false);
   assert.deepEqual(canonicalEstimateOperationReferences(component.resource_graph?.operationCompositionV1).map(ref => ref.operationId),
    ['preputty-prime', 'prime', 'two-coat-paint', 'ordinary-completion'].map(id => r('operation:' + id)));
   const supplied = row(normal, key)!;
   assert.equal(supplied.included_in_estimate, false); assert.equal(supplied.included_in_procurement, false); assert.equal(supplied.amount, null);
   assert.doesNotThrow(() => assertCanonicalPurchaseReadinessV1([supplied]));
   const zero = await compile(facts(), {[r(key)]: {quantity: '0', provenance}});
   const missing = row(zero, key)!;
   assert.deepEqual(canonicalPurchaseShortagesV1([missing]).map(item => [item.rowId, item.consumptionShortage]), [[r(key), '1']]);
   assert.throws(() => assertCanonicalPurchaseReadinessV1([missing]), (error: any) => error.code === 'PROCUREMENT_MATERIAL_SHORTAGE');
   await assert.rejects(compile(facts(), {[r(key)]: {quantity: '0.5', provenance}}), (error: any) => error.code === 'ROW_AMENDMENT_INVALID');
  }
  assert.equal(row(normal, 'open-application-vessel'), undefined);
  assert(normal.preliminaryNeeds.some(need => need.row_id === r('open-washing-water')));
  assert.equal(pack.manualApplicationVesselProfile.completeItemSpecification.capacityBelongsToPail8619NotLiner, true);
  assert.equal(pack.manualApplicationVesselProfile.completeItemSpecification.declaredUserPaintCapacityUSQuart, '1');
  assert.equal(pack.manualApplicationVesselProfile.completeItemSpecification.actualInnerDiameterClaimed, false);
  assert.equal(pack.manualApplicationVesselProfile.completeItemSpecification.lidIncludedInPailSku, false);
  assert.equal(pack.manualApplicationVesselProfile.completeItemSpecification.selectedLinerSku, null);
  assert.equal(pack.manualApplicationVesselProfile.uses[2].sequentialApplications, 2);
  assert.equal(pack.manualApplicationVesselProfile.inferenceBoundary.widthAccess,
   'ENGINEERING_INFERENCE_FROM_MANUFACTURER_FUNCTIONAL_ROLLER_WIDTH_NOT_INNER_DIAMETER');
 });
 await check('small area and exact next-package threshold use ceiling after total demand', async () => {
  const small = await compile(facts('0.01'));
  for (const [key, order] of [['preputty-primer', 1], ['primer', 3], ['paint', 1.5], ['ready-putty', 1]] as const)
   assert.equal(quantity(small, key + '-order'), order);
  const exact = await compile(facts('15')), next = await compile(facts('15.000001'));
  assert.equal(quantity(exact, 'primer-order'), 3); assert.equal(quantity(next, 'primer-order'), 6);
  assert.equal(quantity(exact, 'paint-order'), 6); assert.equal(quantity(next, 'paint-order'), 6);
  assert(quantity(next, 'paint-consumed') > quantity(exact, 'paint-consumed'));
 });
 await check('shared source contributions sum once and have one cost owner', async () => {
  const result = await compile(facts());
  assert.equal(quantity(result, 'rags-contribution-preputty'), .0201);
  assert.equal(quantity(result, 'rags-contribution-finish'), .0603);
  assert.equal(quantity(result, 'rags-consumed'), .0804);
  assert.equal(quantity(result, 'truck-contribution-preputty'), .00201);
  assert.equal(quantity(result, 'truck-contribution-finish'), .03015);
  assert.equal(quantity(result, 'truck'), .03216);
  for (const key of ['workers', 'workers-preputty', 'workers-total', 'operators', 'lift', 'lift-preputty', 'truck',
   'abrasive-consumed', 'rags-consumed', 'rags-contribution-preputty', 'rags-contribution-finish']) {
   const spec = subject.resources.find(row => row.row_id === r(key))!;
   assert.equal(spec.cost_owner_id, r('whole-work')); assert.equal(spec.procurement_eligible, false);
  }
 });
 await check('one stock assignment reduces one product order only; physical use and labor unchanged', async () => {
  const stocked = await compile({...facts(), [p('stock_paint_packages')]: 2});
  assert.equal(quantity(stocked, 'paint-order'), 4.5); assert.equal(quantity(stocked, 'paint-stock-credit'), 3);
  assert.equal(quantity(stocked, 'paint-consumed'), 7.236); assert.equal(quantity(stocked, 'paint-remaining'), .264);
  assert.equal(quantity(stocked, 'primer-order'), 6); assert.equal(quantity(stocked, 'ready-putty-order'), 29);
  assert.equal(quantity(stocked, 'workers-total'), 10.07211);
  await assert.rejects(compile({...facts(), [p('stock_paint_packages')]: -.1}));
  await assert.rejects(compile({...facts(), [p('stock_paint_packages')]: 1.5}));
 });
 await check('manual insufficient purchase keeps demand and an explicit shortage', async () => {
  const result = await compile(facts(), {[r('paint-order')]: {quantity: '6', provenance}});
  assert.equal(quantity(result, 'paint-order'), 6); assert.equal(quantity(result, 'paint-consumed'), 7.236);
  assert.equal(quantity(result, 'paint-shortage'), 1.236); assert.equal(quantity(result, 'workers-total'), 10.07211);
 });
 await check('prices on included components never duplicate whole work or material purchases', async () => {
  const overrides = Object.fromEntries(subject.resources.filter(row => row.unit_id !== '').map(row => [row.row_id,
   {unitPrice: row.row_id === r('whole-work') ? '2' : row.procurement_eligible ? '1' : '777', includedInEstimate: true, provenance}]));
  const result = await compile(facts(), overrides);
  assert.equal(result.totals.amount, '85.7');
  assert.equal(result.rows.filter(row => row.included_in_estimate).length, 5);
  assert.equal(result.preliminaryNeeds.filter(n => n.need_state === 'QUANTITY_REQUIRED').length, 5);
 });
 await check('source-owned missing tool/water quantities cannot be supplied by customer1', async () => {
  await assert.rejects(compile({...facts(), [p('need_washing_water')]: 1}));
  const normal = await compile(facts());
  for (const need of pack.openSourceNeeds) assert(normal.preliminaryNeeds.some(n => n.row_id === r('open-' + need.id)));
  assert.equal(pack.selectedScopeQuantitiesComplete, false); assert.equal(groupMap().selectedScopeQuantitiesComplete, false);
  assert.equal(groupMap().remainingApplicationSourceNeeds.length, 5);
 });
 await check('independent full expected composition covers every stage, including all physical gaps', () => {
  assertExpectedComposition(subject.resources);
  for (const resource of subject.resources) {const {row_sha256, ...body} = resource; assert.equal(row_sha256, estimateDeterministicHash(body));}
  assert.equal(groupMap().operations.length, 8);
 });
 await check('negative controls: forgotten material, wrong stage, duplicate purchase and missing gap all fail', () => {
  assert.throws(() => assertExpectedComposition(subject.resources.filter(row => row.row_id !== r('abrasive-consumed'))), /ROW_REFERENCE/);
  const wrong = subject.resources.map(row => row.row_id === r('paint-order') ? {...row, resource_graph: {...row.resource_graph,
   operationCompositionV1: {...row.resource_graph?.operationCompositionV1 as Json, operationId: r('operation:preparation'), additionalOperations: []}}} : row);
  assert.throws(() => assertExpectedComposition(wrong), /OPERATION_BINDING/);
  const paint = subject.resources.find(row => row.row_id === r('paint-order'))!;
  assert.throws(() => assertExpectedComposition([...subject.resources, {...paint, row_id: r('second-paint-order')}]), /only four/);
  assert.throws(() => assertExpectedComposition(subject.resources.filter(row => row.row_id !== r('open-washing-water'))), /ROW_REFERENCE/);
  assert.throws(() => assertExpectedComposition(subject.resources.filter(row => row.row_id !== r('tool-putty-spatula'))), /ROW_REFERENCE/);
  const wrongToolStage = subject.resources.map(row => row.row_id === r('tool-putty-spatula') ? {...row, resource_graph: {...row.resource_graph,
   operationCompositionV1: {...row.resource_graph?.operationCompositionV1 as Json,
    operationId: r('operation:ordinary-completion'), additionalOperations: []}}} : row);
  assert.throws(() => assertExpectedComposition(wrongToolStage), /OPERATION_BINDING/);
  assert.throws(() => assertExpectedComposition(subject.resources.filter(row => row.row_id !== r('tool-waterborne-brush'))), /ROW_REFERENCE/);
  const wrongBrush = subject.resources.map(row => row.row_id === r('tool-waterborne-brush') ? {...row, resource_graph: {...row.resource_graph,
   operationCompositionV1: {...row.resource_graph?.operationCompositionV1 as Json, operationId: r('operation:prime'), additionalOperations: []}}} : row);
  assert.throws(() => assertExpectedComposition(wrongBrush), /OPERATION_BINDING/);
  const brush = subject.resources.find(row => row.row_id === r('tool-waterborne-brush'))!;
  assert.throws(() => assertExpectedComposition([...subject.resources, {...brush, row_id: r('duplicate-brush-purchase'), procurement_eligible: true}]), /only four/);
  for (const key of ['tool-application-pail', 'tool-application-pail-lid']) {
   assert.throws(() => assertExpectedComposition(subject.resources.filter(row => row.row_id !== r(key))), /ROW_REFERENCE/);
   const wrong = subject.resources.map(row => row.row_id === r(key) ? {...row, resource_graph: {...row.resource_graph,
    operationCompositionV1: {...row.resource_graph?.operationCompositionV1 as Json, operationId: r('operation:ordinary-completion'), additionalOperations: []}}} : row);
   assert.throws(() => assertExpectedComposition(wrong), /OPERATION_BINDING/);
   const item = subject.resources.find(row => row.row_id === r(key))!;
   assert.throws(() => assertExpectedComposition([...subject.resources, {...item, row_id: r('duplicate-' + key), procurement_eligible: true}]), /only four/);
  }
  const duplicatedTool = subject.resources.find(row => row.row_id === r('tool-putty-spatula'))!;
  assert.throws(() => assertExpectedComposition([...subject.resources, {...duplicatedTool,
   row_id: r('duplicate-tool-purchase'), procurement_eligible: true}]), /only four/);
 });
 await check('zero area emits neither purchases nor gaps; unpriced ordinary case retains actual known quantities', async () => {
  const zero = await compile(facts(0)); assert.equal(zero.rows.length, 0); assert.equal(zero.preliminaryNeeds.length, 0);
  const unpriced = await compile(facts()); assert.equal(unpriced.totals.pricedRowCount, 0);
  assert.equal(quantity(unpriced, 'paint-consumed'), 7.236);
  await assert.rejects(compile(facts(-1)));
 });
 return {status: 'PASS_R3_KNOWN_QUANTITIES_AND_HONEST_RESOURCE_GAPS', checkCount: completed.length, completed,
  resourceRows: subject.resources.length, operations: 8, mainProductOrders: 4, openApplicationSourceNeeds: pack.openSourceNeeds.length,
  selectedScopeQuantitiesComplete: false, fullTechnicalAcceptance: false, published: false};
}

if (typeof it === 'function') it('R3 VGT finite wall group: independent quantities, full expected resources, source gaps and no double purchase', async () => {
 await runInteriorWallFinishingGeometryChecksR3();
});

if (typeof it === 'function') it('included physical consumables, labour and machines remain real resources while arithmetic stays in details', () => {
 const rows = definition().resources;
 assert.equal(pack.publicPhysicalScopeDetailsRu.join(' '), pack.physicalScopeRu.trim());
 for (const row of rows) assert(parseCanonicalPublicResourcePresentationV1(row.resource_graph.publicResourcePresentationV1), row.row_id);
 const kind = (key: string) => {
  const row = rows.find(row => row.row_id === r(key))!;
  assert(row, key);
  return canonicalPublicResourceRowKindV1({rowId: row.row_id, titleRu: row.title_ru, category: row.category,
   graph: row.resource_graph, descriptor: row.resource_graph.publicResourcePresentationV1,
   costTreatment: row.resource_graph.costTreatment});
 };
 for (const key of ['abrasive-consumed', 'rags-consumed', 'workers', 'workers-preputty', 'operators',
  'lift', 'lift-preputty', 'truck', 'tool-putty-spatula', 'tool-waterborne-brush', 'tool-application-pail', 'tool-application-pail-lid']) assert.equal(kind(key), 'RESOURCE', key);
 for (const key of ['paint-consumed', 'paint-packages', 'paint-remaining', 'workers-total',
  'rags-contribution-preputty', 'truck-contribution-finish']) assert.equal(kind(key), 'CALCULATION_DETAIL', key);
});

if (typeof it === 'function') it('the actual document projections preserve stage provision and aggregate orders including unpriced and unselected needs', async () => {
 const subject=definition(),compiled=await compileCanonicalEstimateCore({operation:'compile',catalogId:pack.selectedExistingCatalogId,
  compilerVersion:pack.contract,primaryMeasureParameterId:p(pack.areaId),parameterDefinitions:[...subject.parameters],
  formulaDefinitions:[...subject.formulas],resourceDefinitions:[...subject.resources],submittedParameters:{[p(pack.areaId)]:'20.1'},
  confirmedParameters:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:subject.resources.length,
  hashJson:value=>createHash('sha256').update(JSON.stringify(value)).digest('hex')}),
  revision={id:'DOC-PROJECTION-CONTROL',release_id:'TEST',catalog_id:pack.selectedExistingCatalogId,checksum_sha256:'a'.repeat(64),
   row_count:compiled.rows.length,currency_code:'KGS',input_parameters:compiled.parameters,
   amendment_contract:{parameterSources:{preliminaryNeeds:compiled.preliminaryNeeds}}},
  selected=selectCanonicalArtifactRows(compiled.rows),pdf=buildCanonicalProfessionalPdfProjection({revision,
   rows:selected.professionalPdfRows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),
   expectedProjectedRowCount:selected.professionalPdfRows.length,workTitleRu:pack.titleRu}),
  procurement=buildCanonicalProcurementProjection({revision,procurementRows:selected.procurementRows,sourceRows:compiled.rows});
 assert.equal(pdf.preliminaryNeedCount,compiled.preliminaryNeeds.length);
 assert.equal(compiled.preliminaryNeeds.filter(need=>need.need_state==='QUANTITY_REQUIRED').length,pack.openSourceNeeds.length);
 assert.deepEqual(compiled.preliminaryNeeds.filter(need=>need.need_state==='CONDITION_REQUIRED').map(need=>need.row_id).sort(),
  ['ordinary-access','ordinary-accompanying'].map(r).sort());
 for(const need of pack.openSourceNeeds){const resource=subject.resources.find(resource=>resource.row_id===r('open-'+need.id))!;
  assert(pdf.html.includes((resource.resource_graph.publicResourcePresentationV1 as Json).nameRu),need.id);}
 for(const key of ['tool-putty-spatula','tool-waterborne-brush','tool-application-pail','tool-application-pail-lid']){
  const resource=subject.resources.find(resource=>resource.row_id===r(key))!;
  assert(pdf.html.includes((resource.resource_graph.publicResourcePresentationV1 as Json).nameRu),key);
 }
 assert.deepEqual(procurement.rows.map(resource=>resource.rowId).sort(),expectedOrders);
 assert.deepEqual(procurement.rows.map(resource=>resource.quantity).sort(),['3','6','7.5','29'].sort());
 assert(!pdf.html.includes('Без доплаты'));assert(!pdf.html.includes('Требуется цена'));
 assert(pdf.html.includes('<td class="money"></td>'));assert(pdf.html.includes('полный итог не рассчитан'));
});
