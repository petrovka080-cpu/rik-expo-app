import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {buildMasterParameterCalculationConsumers} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1';
import {ct54ReadyFacadeExactS2763} from '../../../src/lib/estimate/v4/ct54ReadyFacadeSeriesS2763';
import {
  ct54ProtectionChoiceIdS2770, ct54ProtectionPackS2770, ct54ProtectionPrefixS2770,
  ct54RectangularProtectionForwardDefinitionS2770,
  ct54Tesa2600PackR1 as pack, ct54Tesa2600PrefixR1, ct54Tesa2600DefinitionR1,
  ct54Tesa2600FilmReplacementR1, ct54Tesa2600TapeReplacementR1,
} from '../../../src/lib/estimate/v4/ct54RectangularProtectionS2770';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

const hash = (value:unknown) => createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex');
const sha = (value:unknown):value is string => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const uuid = (value:unknown):value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
function invariant(value:unknown,code:string):asserts value {
  if(!value) throw new Error('CT54_TESA2600_FORWARD:'+code);
}

/** Supplied only by a separately reviewed, fresh read-only selected-pair
 * snapshot. No historical definition/version is used as a default here.
 * This pure overlay does not establish DB freshness, publish or migrate a
 * saved revision. The future caller must recheck this tuple transactionally. */
export type Ct54CurrentEightParentGateR1 = Readonly<{
  status:'PASS_READ_ONLY_CURRENT_CT54_EIGHT_PARENT_SNAPSHOT';
  snapshotSha256:string;
  currentPointerSha256:string;
  definitionReleaseId:string;
  searchReleaseId:string;
  targets:readonly Readonly<{
    catalogId:string;
    definitionId:string;
    definitionVersion:number;
    baselineId:string;
    payloadSha256:string;
    parentInputSha256:string;
    manifestEntrySha256:string;
  }>[];
}>;

export function overlayCt54Tesa2600ForwardR1(
  parent:PurchaseGroupRepresentative,
  gate:Ct54CurrentEightParentGateR1,
  locator:Readonly<{id:string;artifactSha256:string;locatorRu:string}>,
) {
  invariant(gate?.status === 'PASS_READ_ONLY_CURRENT_CT54_EIGHT_PARENT_SNAPSHOT'
    && sha(gate.snapshotSha256) && sha(gate.currentPointerSha256)
    && uuid(gate.definitionReleaseId) && uuid(gate.searchReleaseId)
    && Array.isArray(gate.targets) && gate.targets.length === 8,
  'FRESH_CURRENT_EIGHT_PARENT_SNAPSHOT_REQUIRED');
  invariant(hash(gate.targets.map(t=>t.catalogId).sort()) === hash([...pack.targetCatalogIds].sort())
    && new Set(gate.targets.map(t=>t.catalogId)).size === 8
    && gate.targets.every(t=>uuid(t.definitionId) && uuid(t.baselineId)
      && Number.isSafeInteger(t.definitionVersion) && t.definitionVersion > 0
      && sha(t.payloadSha256) && sha(t.parentInputSha256) && sha(t.manifestEntrySha256)),
  'EXACT_EIGHT_CURRENT_IDENTITIES_REQUIRED');
  const target = gate.targets.find(t=>t.catalogId === parent.definition.catalog_id);
  invariant(target && parent.definition.id === target.definitionId
    && parent.definition.definition_version === target.definitionVersion
    && parent.baseline.id === target.baselineId
    && parent.passport.payload_sha256 === target.payloadSha256
    && hash(JSON.parse(JSON.stringify(parent))) === target.parentInputSha256,
  'EXACT_CURRENT_PARENT_PAYLOAD_REQUIRED');
  invariant(uuid(locator.id) && locator.artifactSha256 === pack.sources.tesa2026.sha256
    && locator.locatorRu === pack.sources.tesa2026.locator,
  'EXACT_REVIEWED_4369_2600_AND_4363_LOCATOR_REQUIRED');

  const result = structuredClone(parent);
  const shared = ct54Tesa2600DefinitionR1();
  invariant(!result.resources.some(r=>String(r.row_id).startsWith(ct54Tesa2600PrefixR1+':')),
    'FORWARD_VARIANT_ALREADY_PRESENT');
  // The existing 1.8 m branch is retained in place, including prices/defaults
  // in the representative. Only the common choice gains one explicit value.
  const method = result.parameters.find(p=>p.parameter_id === ct54ProtectionChoiceIdS2770);
  invariant(method && Array.isArray(method.constraints_json?.values)
    && hash(method.constraints_json.values) === hash([ct54ProtectionPackS2770.otherChoiceRu,ct54ProtectionPackS2770.exactChoiceRu]),
  'ORIGINAL_EXPLICIT_METHOD_CHOICES_REQUIRED');
  invariant(['covered-area','film-strip-area','film-tail','film-trim','tape-length',
    'film-opened','film-order','film-remaining','film-free',
    'tape-opened','tape-order','tape-remaining','tape-free'].every(suffix=>
      result.resources.filter(r=>r.row_id === ct54ProtectionPrefixS2770+':'+suffix).length === 1),
  'COMPLETE_ORIGINAL_1800_BRANCH_REQUIRED');
  method.constraints_json = {...method.constraints_json,values:[...method.constraints_json.values,pack.exactChoiceRu]};

  // Source-confirmed forward correction: requiredWhen alone does not block a
  // missing H globally. Bind N/W/H to each original row in the new successor,
  // retaining its formula, title, ID, prices and complete-geometry quantities.
  // The original factory/saved definitions are untouched historical inputs.
  const forwardLegacy = ct54RectangularProtectionForwardDefinitionS2770();
  const strengthenedLegacyRowIds:string[] = [];
  for(const forwardRow of forwardLegacy.resources) {
    const row = result.resources.find(r=>r.row_id === forwardRow.row_id)!;
    invariant(Array.isArray(row.resource_graph?.inputParameterIds)
      && Array.isArray((forwardRow.resource_graph as typeof forwardRow.resource_graph & {inputParameterIds: unknown[]}).inputParameterIds),'LEGACY_RESOURCE_INPUT_SHAPE_REQUIRED');
    const inputParameterIds = [...new Set([...row.resource_graph.inputParameterIds,
      ...(forwardRow.resource_graph as typeof forwardRow.resource_graph & {inputParameterIds: unknown[]}).inputParameterIds])];
    if(hash(inputParameterIds) === hash(row.resource_graph.inputParameterIds)) continue;
    const {row_sha256:_oldHash,...body} = row;
    const updated = {...body,resource_graph:{...row.resource_graph,inputParameterIds},
      source_metadata:{...row.source_metadata,forwardGeometryApplicabilityGate:{contract:pack.contract,
        requiredHeightBeforeFilmOrder:true,originalFormulaAndPriceOwnerRetained:true}}};
    Object.assign(row,updated,{row_sha256:hash(updated)});
    strengthenedLegacyRowIds.push(row.row_id);
  }

  for(const [rowId,replacement] of [
    [pack.originalOpenRowIds[0],ct54Tesa2600FilmReplacementR1],
    [pack.originalOpenRowIds[1],ct54Tesa2600TapeReplacementR1],
  ] as const) {
    const old = result.resources.find(r=>r.row_id === rowId);
    invariant(old && old.source_metadata?.sourceNormQuantityAccepted === false,
      'ORIGINAL_UNRESOLVED_PROTECTION_OWNER_REQUIRED');
    const {row_sha256:_oldHash,...body} = old;
    // Retain the existing 1.8 m replacement gate as an untouched child. The
    // new branch cannot weaken it, auto-select a product or close a kit gap.
    const updated = {...body,inclusion_ast:{kind:'and',operands:[old.inclusion_ast,{kind:'not',operand:replacement}]},
      source_metadata:{...old.source_metadata,tesa2600ForwardConditionalReplacement:{
        contract:pack.contract,originalCostOwnerId:old.cost_owner_id,originalFormulaId:old.formula_id,
        explicitChoiceRequired:true,oldManualValuesPreserved:true,sourceNormAcceptedWhenNotReplaced:false,
      }}};
    Object.assign(old,updated,{row_sha256:hash(updated)});
  }
  for(const p of shared.parameters) {
    if(p.parameter_id === ct54ProtectionChoiceIdS2770) continue;
    invariant(!result.parameters.some(old=>old.parameter_id === p.parameter_id),'NEW_PARAMETER_COLLISION');
    const visibility = p.truth_metadata.visibility_role === 'INTERNAL_ONLY' ? {} : {
      visible_when:{kind:'and',operands:[ct54ReadyFacadeExactS2763,p.truth_metadata.visible_when]},
    };
    result.parameters.push({...p,ordinal:result.parameters.length,truth_metadata:{...p.truth_metadata,
      semantic_parameter_key:target.catalogId+':'+p.parameter_id,...visibility}});
  }
  for(const f of shared.formulas) {
    invariant(!result.formulas.some(old=>old.formula_id === f.formula_id),'NEW_FORMULA_COLLISION');
    result.formulas.push({...f,ast_sha256:hash(f.ast)});
  }
  const addedRowIds:string[] = [];
  for(const r of shared.resources) {
    invariant(!result.resources.some(old=>old.row_id === r.row_id),'NEW_ROW_COLLISION');
    const {row_sha256:_oldHash,...body} = r;
    const value = {...body,ordinal:result.resources.length,row_type:r.category,
      semantic_owner:target.catalogId+':'+r.row_id,
      inclusion_ast:{kind:'and',operands:[ct54ReadyFacadeExactS2763,r.inclusion_ast]}};
    result.resources.push({...value,row_sha256:hash(value)});
    addedRowIds.push(r.row_id);
    result.bindings.push({row_id:r.row_id,locator_id:locator.id,applicability:{
      contract:pack.contract,currentParentDefinitionId:target.definitionId,
      currentParentSnapshotSha256:gate.snapshotSha256,scopeRu:pack.scopeRu,
      geometryModel:pack.geometryModel,fullTechnicalAcceptance:false,
    }});
  }
  const consumers = buildMasterParameterCalculationConsumers(result);
  for(const p of result.parameters) {
    const id = p.parameter_id;
    p.truth_metadata = {...p.truth_metadata,formula_consumers:consumers.formulaConsumers[id],
      resource_branch_consumers:consumers.resourceConsumers[id]};
    result.baseline.formula_consumer_ids[id] = consumers.formulaConsumers[id];
    result.baseline.resource_consumer_row_ids[id] = consumers.resourceConsumers[id];
    result.baseline.uom_by_parameter[id] = p.unit_id;
    result.baseline.normative_source_ids[id] ??= [];
    result.baseline.guide_provenance_ru[id] ??= p.truth_metadata.guide?.guide_short_ru ?? p.title_ru;
  }
  result.baseline.parameter_schema_sha256 = hash(result.parameters.map(p=>({parameterId:p.parameter_id,
    unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
  result.passport.decision = {...result.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',
    completeTechnicalEstimateAccepted:false,wholeFacadeGroupComplete:false,
    tesa2600ForwardScope:{contract:pack.contract,scopeRu:pack.scopeRu,
      sourceSnapshotSha256:gate.snapshotSha256,definitionReleaseId:gate.definitionReleaseId,
      searchReleaseId:gate.searchReleaseId,oldRevisionAutoMigration:false,
      automaticStockReserveQuantumOrPriceTransfer:false,newPaidLabour:0,
      allOtherUnresolvedNeedsRetained:true}};
  return {representative:result,addedRowIds,strengthenedLegacyRowIds,conditionallyReplacedRowIds:[...pack.originalOpenRowIds],
    originalDefinitionId:target.definitionId,currentParentSnapshotSha256:gate.snapshotSha256,
    savedRevisionMigrationPerformed:false as const};
}

/** One bounded eight-consumer authoring packet. It is returned only after all
 * eight independently pinned current parents pass; no persistence is performed. */
export function prepareCt54Tesa2600ForwardEightR1(
  currentParents:readonly PurchaseGroupRepresentative[],
  gate:Ct54CurrentEightParentGateR1,
  locator:Readonly<{id:string;artifactSha256:string;locatorRu:string}>,
) {
  invariant(currentParents.length === 8
    && new Set(currentParents.map(p=>p.definition.catalog_id)).size === 8
    && hash(currentParents.map(p=>p.definition.catalog_id).sort()) === hash([...pack.targetCatalogIds].sort()),
  'ALL_EIGHT_CURRENT_PARENTS_REQUIRED');
  const entries = pack.targetCatalogIds.map(catalogId=>overlayCt54Tesa2600ForwardR1(
    currentParents.find(p=>p.definition.catalog_id === catalogId)!,gate,locator));
  invariant(entries.every(entry=>entry.addedRowIds.length === 13),'THIRTEEN_NEW_BOUND_ROWS_PER_CONSUMER_REQUIRED');
  return {contract:pack.contract,currentParentSnapshotSha256:gate.snapshotSha256,entries,
    publicationPerformed:false as const,savedRevisionMigrationPerformed:false as const,
    fullTechnicalEstimateAccepted:false as const};
}
