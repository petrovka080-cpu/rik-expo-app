import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import bindingPack from '../../../data/estimate-benchmarks/source-packs/knauf-protektor105922-registry-binding-r1.json';
import compositePayload from '../../../data/estimate-benchmarks/source-packs/knauf-protektor105922-composite-locator-r1.json';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import {knaufProtektor105922PackR1 as sourcePack} from '../../../src/lib/estimate/v4/knaufProtektor105922ForwardR1';
import {createCanonicalDefinitionClonePlan, canonicalPublisherPriceBindingIsCompatible,
  canonicalPublisherQuantityScopeIsConsistent, type CanonicalDefinitionPublishPlan} from './canonicalDefinitionPublisherR1';
import {prepareKnaufProtektor105922UnboundSevenR1} from './knaufProtektor105922ForwardOverlayR1';
import {bindKnaufTechnicalPlanningDefaultsS2769, knaufTechnicalParameterSchemaSha256S2769}
  from './s2763KnaufInteriorPlasterMaterialsOverlay';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';

type Json = Record<string, any>;
export type KnaufProtektorRegistrySourceR1 = {
  id:string; source_key:string; title_ru:string; authority:string; official_url:string|null;
  artifact_sha256:string|null; effective_from:string|null; effective_to:string|null;
  metadata:Json; created_at:string;
};
export type KnaufProtektorRegistryLocatorR1 = {
  id:string; source_id:string; locator_key:string; locator:Json; excerpt_sha256:string|null;
};
export type KnaufProtektorRegistryRowsR1 = {
  sources:KnaufProtektorRegistrySourceR1[]; locators:KnaufProtektorRegistryLocatorR1[];
};
export type KnaufProtektorBoundAssemblerInputR1 = {
  parents:readonly {parent:PurchaseGroupRepresentative; manifest:Json; searchDocument:Json}[];
  registry:{inheritedPreimage:KnaufProtektorRegistryRowsR1; observed:KnaufProtektorRegistryRowsR1};
  context:{
    parentDefinitionReleaseId:string; parentSearchReleaseId:string; parentPointerSha256:string;
    successorReleaseId:string; sourceHead:string; sourceTree:string;
    sourceFreezeSha256:string; acceptanceEvidenceSha256:string;
    identities:readonly {catalogId:string; definitionId:string; baselineId:string; baselineKey:string;
      resourceIds:Readonly<Record<string,string>>}[];
  };
};

const hash = (value:unknown) => createHash('sha256').update(stringifyCanonicalEstimateJson(value)).digest('hex');
// Normalize both data graphs through the same host clone (also under Jest's
// VM realm). Unlike JSON roundtrip this retains undefined/absence and array
// shape; the registry boundary separately requires actual JSON values.
const equal = (left:unknown,right:unknown) => isDeepStrictEqual(structuredClone(left),structuredClone(right));
const sorted = (items:readonly string[]) => [...items].sort();
const unique = (items:readonly string[]) => [...new Set(items)];
const sourceKeys = ['id','source_key','title_ru','authority','official_url','artifact_sha256',
  'effective_from','effective_to','metadata','created_at'];
const locatorKeys = ['id','source_id','locator_key','locator','excerpt_sha256'];
function invariant(value:unknown,code:string):asserts value {
  if(!value) throw new Error('KNAUF_PROTEKTOR105922_BOUND:'+code);
}
function uuid(value:unknown,code:string):asserts value is string {
  invariant(typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(value),code);
}
function sha(value:unknown,code:string):asserts value is string {
  invariant(typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value),code);
}
function object(value:unknown):value is Json {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.prototype.toString.call(value) === '[object Object]';
}
function json(value:unknown):boolean {
  return value === null || typeof value === 'string' || typeof value === 'boolean'
    || typeof value === 'number' && Number.isFinite(value)
    || Array.isArray(value) && Object.keys(value).length === value.length
      && Object.keys(value).every((key,index)=>key === String(index)) && value.every(json)
    || object(value) && Object.values(value).every(json);
}
const omit = (value:Json,keys:readonly string[]) => Object.fromEntries(
  Object.entries(value).filter(([key])=>!keys.includes(key)));
const find = <T extends {id:string}>(rows:readonly T[],id:string) => rows.find(row=>row.id === id);
const directSources = (r:PurchaseGroupRepresentative) => sorted(unique(
  Object.values(r.baseline.normative_source_ids).flatMap((value:unknown)=> {
    invariant(Array.isArray(value) && value.every(item=>typeof item === 'string'),'BASELINE_SOURCE_MAP_SHAPE');
    return value as string[];
  })));

function validateRegistryRows(rows:KnaufProtektorRegistryRowsR1,label:string) {
  invariant(Array.isArray(rows.sources) && Array.isArray(rows.locators),'REGISTRY_ARRAYS:'+label);
  invariant(unique(rows.sources.map(row=>row.id)).length === rows.sources.length
    && unique(rows.sources.map(row=>row.source_key)).length === rows.sources.length,
  'REGISTRY_SOURCE_DUPLICATE:'+label);
  invariant(unique(rows.locators.map(row=>row.id)).length === rows.locators.length
    && unique(rows.locators.map(row=>row.source_id+':'+row.locator_key)).length === rows.locators.length,
  'REGISTRY_LOCATOR_DUPLICATE:'+label);
  for(const row of rows.sources) {
    invariant(object(row) && equal(sorted(Object.keys(row)),sorted(sourceKeys)) && json(row)
      && object(row.metadata) && [row.source_key,row.title_ru,row.authority,row.created_at]
        .every(value=>typeof value === 'string' && value.length > 0)
      && [row.official_url,row.effective_from,row.effective_to].every(value=>value === null || typeof value === 'string')
      && (row.artifact_sha256 === null || /^[0-9a-f]{64}$/u.test(row.artifact_sha256)),
    'REGISTRY_SOURCE_FULL_ROW:'+label);
    uuid(row.id,'REGISTRY_SOURCE_ID:'+label);
  }
  for(const row of rows.locators) {
    invariant(object(row) && equal(sorted(Object.keys(row)),sorted(locatorKeys)) && json(row)
      && object(row.locator) && typeof row.locator_key === 'string' && row.locator_key.length > 0
      && (row.excerpt_sha256 === null || /^[0-9a-f]{64}$/u.test(row.excerpt_sha256)),
    'REGISTRY_LOCATOR_FULL_ROW:'+label);
    uuid(row.id,'REGISTRY_LOCATOR_ID:'+label);uuid(row.source_id,'REGISTRY_LOCATOR_SOURCE_ID:'+label);
    invariant(find(rows.sources,row.source_id),'REGISTRY_LOCATOR_SOURCE_MISSING:'+label);
  }
}

/** Compares the entire supplied read set, including full source metadata and
 * created_at. This is a data consistency check, NOT authentication of that read
 * set, a DB lock, a fresh collision proof or permission to publish. */
function validateRegistry(input:KnaufProtektorBoundAssemblerInputR1) {
  const before = input.registry.inheritedPreimage, observed = input.registry.observed;
  validateRegistryRows(before,'before');validateRegistryRows(observed,'observed');
  const oldLocatorIds = sorted(unique(input.parents.flatMap(item=>item.parent.bindings.map(b=>String(b.locator_id)))));
  invariant(equal(sorted(before.locators.map(row=>row.id)),oldLocatorIds),'EXACT_INHERITED_LOCATOR_SET');
  invariant(equal(sorted(before.sources.map(row=>row.id)),sorted(unique(before.locators.map(row=>row.source_id)))),
    'EXACT_INHERITED_SOURCE_SET');
  for(const row of before.sources) invariant(equal(find(observed.sources,row.id),row),'HISTORICAL_SOURCE_CHANGED:'+row.id);
  for(const row of before.locators) invariant(equal(find(observed.locators,row.id),row),'HISTORICAL_LOCATOR_CHANGED:'+row.id);
  for(const anchor of bindingPack.historicalObservedSourceProjections) {
    const row = find(before.sources,anchor.id);
    invariant(row && equal({id:row.id,source_key:row.source_key,title_ru:row.title_ru,authority:row.authority,
      official_url:row.official_url,artifact_sha256:row.artifact_sha256,
      contract:row.metadata.contract??null,logical_source_id:row.metadata.sourceId??null,
      logical_artifact_id:row.metadata.sourceArtifactId??null,source_role:row.metadata.sourceRole??null},anchor),
    'OBSERVED_HISTORICAL_SOURCE_ANCHOR:'+anchor.id);
  }
  for(const anchor of bindingPack.historicalObservedLocatorRows) {
    invariant(equal(find(before.locators,anchor.id),anchor),'OBSERVED_HISTORICAL_LOCATOR_ANCHOR:'+anchor.id);
  }
  const newSources = bindingPack.newSources.map(expected=> {
    const row = observed.sources.find(item=>item.source_key === expected.sourceKey);
    invariant(row && !find(before.sources,row.id),'NEW_SOURCE_REQUIRED:'+expected.logicalRole);
    invariant(equal(omit(row,['id','created_at']),expected.proposedRowWithoutIdOrCreatedAt),
      'NEW_SOURCE_FULL_CONTENT:'+expected.logicalRole);
    return row;
  });
  invariant(equal(sorted(observed.sources.map(row=>row.id)),sorted([...before.sources,...newSources].map(row=>row.id))),
    'EXACT_OBSERVED_SOURCE_SET');
  const matches = observed.locators.filter(row=>row.locator_key === bindingPack.composite.locatorKey);
  invariant(matches.length === 1,'COMPOSITE_LOCATOR_GLOBAL_KEY_AMBIGUOUS');
  const locator = matches[0]!;
  const product = newSources.find(row=>row.source_key === bindingPack.composite.sourceKey)!;
  invariant(!find(before.locators,locator.id) && locator.source_id === product.id,'COMPOSITE_LOCATOR_IDENTITY');
  invariant(equal(locator.locator,compositePayload),'COMPOSITE_FULL_PAYLOAD');
  const excerptSha256 = hash(compositePayload);
  invariant(excerptSha256 === bindingPack.candidateCompositeCanonicalDigest
    && locator.excerpt_sha256 === excerptSha256,'COMPOSITE_CANONICAL_EXCERPT');
  invariant(equal(sorted(observed.locators.map(row=>row.id)),sorted([...before.locators.map(row=>row.id),locator.id])),
    'EXACT_OBSERVED_LOCATOR_SET');
  // Declaration and moisture sources have no separate direct locator. Their
  // entire rows were checked above; direct-source closure alone is insufficient.
  invariant(bindingPack.composite.corroboratingSourceKeys.every(key=>newSources.some(row=>row.source_key === key)),
    'NESTED_CORROBORATING_SOURCES_REQUIRED');
  for(const item of input.parents) {
    const keys = sorted(unique(item.parent.bindings.map(binding=> {
      const historical = find(before.locators,String(binding.locator_id))!;
      return find(before.sources,historical.source_id)!.source_key;
    })));
    invariant(equal(keys,directSources(item.parent)),'INHERITED_DIRECT_SOURCE_CLOSURE:'+item.parent.definition.catalog_id);
  }
  return {locator,product,newSources,excerptSha256};
}

function pendingRows(representative:PurchaseGroupRepresentative) {
  const pending = representative.parameters.filter(p=>p.truth_metadata.value_source_role === 'UNRESOLVED_APPLICATION_NORM');
  const ids = new Set(pending.map(p=>p.parameter_id));
  const required = new Set(pending.filter(p=>p.required === true).map(p=>p.parameter_id));
  return representative.resources.filter(row=>representative.formulas.some(formula=>formula.formula_id === row.formula_id
    && formula.input_parameter_ids.some((id:string)=>ids.has(id)))
    || row.resource_graph.inputParameterIds?.some((id:string)=>required.has(id))).map(row=>String(row.row_id));
}

/** Pure bound-plan assembler, not a publisher or registry writer. Its caller
 * must obtain the inputs under separately reviewed transaction/lock/collision
 * controls and then run the existing shared preflight and publisher. No boolean
 * or callback supplied here can prove those external controls. No ID is minted.
 * The saved source pack retains null production IDs/excerpt and UNKNOWN status.
 */
export function prepareKnaufProtektor105922BoundSevenR1(input:KnaufProtektorBoundAssemblerInputR1) {
  const context = input.context, gate = sourcePack.currentParentGate;
  invariant(equal(bindingPack.currentParentGate,gate),'SOURCE_GATE_DRIFT');
  invariant(context.parentDefinitionReleaseId === gate.definitionReleaseId
    && context.parentSearchReleaseId === gate.searchReleaseId
    && context.parentPointerSha256 === gate.currentPointerAtCaptureSha256,'SELECTED_PARENT_PAIR_OR_POINTER');
  invariant(input.parents.length === 7 && unique(input.parents.map(item=>String(item.parent.definition.catalog_id))).length === 7,
    'EXACT_SEVEN_PARENTS');
  invariant(context.identities.length === 7 && equal(sorted(context.identities.map(item=>item.catalogId)),sorted(sourcePack.targetCatalogIds)),
    'EXACT_SEVEN_TARGET_IDENTITIES');
  for(const item of input.parents) {
    const target = gate.targets.find(t=>t.catalogId === item.parent.definition.catalog_id);
    invariant(target && hash(item.manifest) === target.manifestSha256 && hash(item.searchDocument) === target.searchDocumentSha256,
      'CAPTURED_MANIFEST_OR_SEARCH:'+item.parent.definition.catalog_id);
  }
  sha(context.sourceFreezeSha256,'SOURCE_FREEZE_SHA256');sha(context.acceptanceEvidenceSha256,'ACCEPTANCE_EVIDENCE_SHA256');
  invariant(/^[0-9a-f]{40}$/u.test(context.sourceHead) && /^[0-9a-f]{40}$/u.test(context.sourceTree),'SOURCE_HEAD_AND_TREE');
  uuid(context.successorReleaseId,'SUCCESSOR_RELEASE_ID');
  invariant(context.successorReleaseId !== context.parentDefinitionReleaseId
    && context.successorReleaseId !== context.parentSearchReleaseId,'SUCCESSOR_RELEASE_REUSES_PARENT');
  const drafts = prepareKnaufProtektor105922UnboundSevenR1(input.parents.map(item=>item.parent),gate);
  const registry = validateRegistry(input);
  const historicalIds = new Set(input.parents.flatMap(item=>[String(item.parent.definition.id),String(item.parent.baseline.id),
    ...item.parent.resources.map(row=>String(row.id))]));
  const allNewIds = [context.successorReleaseId,...registry.newSources.map(row=>row.id),registry.locator.id];
  for(const entry of drafts.entries) {
    const catalogId = entry.previewRepresentative.definition.catalog_id;
    const identity = context.identities.find(item=>item.catalogId === catalogId)!;
    uuid(identity.definitionId,'NEW_DEFINITION_ID');uuid(identity.baselineId,'NEW_BASELINE_ID');
    invariant(typeof identity.baselineKey === 'string' && identity.baselineKey.trim().length > 0,'NEW_BASELINE_KEY');
    invariant(!input.parents.some(item=>item.parent.baseline.baseline_key === identity.baselineKey),'BASELINE_KEY_REUSES_PARENT');
    invariant(equal(sorted(Object.keys(identity.resourceIds)),sorted(entry.previewRepresentative.resources.map(row=>String(row.row_id)))),
      'EXACT_RESOURCE_ID_MAP:'+catalogId);
    Object.values(identity.resourceIds).forEach(id=>uuid(id,'NEW_RESOURCE_ID'));
    allNewIds.push(identity.definitionId,identity.baselineId,...Object.values(identity.resourceIds));
  }
  invariant(unique(context.identities.map(item=>item.baselineKey)).length === 7,'DUPLICATE_NEW_BASELINE_KEY');
  invariant(unique(allNewIds).length === allNewIds.length && allNewIds.every(id=>!historicalIds.has(id)
    && !find(input.registry.inheritedPreimage.sources,id) && !find(input.registry.inheritedPreimage.locators,id)),
  'NEW_IDS_REUSED_OR_DUPLICATE');

  const plans:CanonicalDefinitionPublishPlan[] = [];
  const transitions:Json[] = [];
  let inheritedBindings = 0, defaultsKept = 0;
  for(const entry of drafts.entries) {
    const r = entry.previewRepresentative, catalogId = String(r.definition.catalog_id);
    const parent = input.parents.find(item=>item.parent.definition.catalog_id === catalogId)!.parent;
    const identity = context.identities.find(item=>item.catalogId === catalogId)!;
    const mapping = bindingPack.parentBindings.find(item=>item.catalogId === catalogId)!;
    invariant(hash(parent.bindings) === mapping.oldBindingArrayCanonicalSha256,'OLD_BINDING_ARRAY:'+catalogId);
    r.bindings = r.bindings.map(binding=>binding.row_id === bindingPack.ownerRowId
      ? {...binding,locator_id:registry.locator.id,applicability:structuredClone(mapping.newCornerBindingApplicabilityPlan)}
      : binding);
    invariant(r.bindings.length === 29 && r.bindings.filter(b=>b.row_id === bindingPack.ownerRowId).length === 1,
      'ONE_COMPOSITE_BINDING_PER_OWNER');
    inheritedBindings += r.bindings.filter(b=>b.row_id !== bindingPack.ownerRowId
      && equal(b,parent.bindings.find(old=>old.row_id === b.row_id))).length;
    r.baseline.normative_source_ids[bindingPack.baselineSourceMap.oldCornerScopeParameter] = [registry.product.source_key];
    r.baseline.normative_source_ids[bindingPack.baselineSourceMap.newProductSelectionParameter] = [registry.product.source_key];
    invariant(equal(directSources(r),sorted(mapping.plannedSuccessorDirectBaselineSourceKeys)),'SUCCESSOR_SOURCE_CLOSURE:'+catalogId);
    const changedRowIds = new Set([bindingPack.ownerRowId,...entry.addedRowIds]);
    for(const row of r.resources) if(changedRowIds.has(row.row_id)) {
      invariant(row.source_metadata.automaticGenericPriceInheritanceAllowed === false,'TYPED_PRICE_OPT_OUT');
      row.source_metadata = {...row.source_metadata,sourceRole:'SOURCE_PRODUCT_GEOMETRY_BOUND_PLAN_CANDIDATE',
        sourceRegistrySourceId:registry.product.id,sourceRegistryLocatorId:registry.locator.id,
        sourceRegistryExcerptSha256:registry.excerptSha256,priorCornerScopeBindingRetained:false,
        priorCornerScopeBindingRetainedInComposite:true,
        normativeTrace:[{normId:sourcePack.normIdCandidate,sourceId:registry.product.source_key,
          sourceDocument:registry.product.title_ru,sourceLocator:registry.locator.locator_key,
          sourceSnapshotHash:registry.product.artifact_sha256}],
        sourceNormQuantityAccepted:false,full_technical_acceptance:false,savedRevisionMigration:false};
      if(row.row_id === bindingPack.ownerRowId) {
        row.resource_graph.publicResourcePresentationV1 = {...row.resource_graph.publicResourcePresentationV1,
          detailsRu:[...compositePayload.publicPresentation.ownerDetailsRu,compositePayload.publicPresentation.plainSupplierWarningRu]};
      }
    }
    const corner = r.resources.find(row=>row.row_id === bindingPack.ownerRowId)!;
    invariant(corner.unit_id === 'm' && corner.cost_owner_id === bindingPack.ownerRowId
      && corner.resource_graph.costTreatment === 'OWN_COST'
      && r.resources.filter(row=>row.row_id === bindingPack.ownerRowId).length === 1,'ONE_EXISTING_PAID_OWNER');
    invariant(canonicalPublisherPriceBindingIsCompatible({sourceResource:parent.resources.find(row=>row.row_id === bindingPack.ownerRowId)!,
      targetResource:corner,sourceBindingPriceKey:bindingPack.ownerRowId}) === false,'SHARED_PRICE_OPT_OUT_REQUIRED');
    for(const p of r.parameters) p.truth_metadata = {...p.truth_metadata,contract:bindingPack.contract};
    const defaultValues = parent.parameters.filter(p=>p.default_value != null).map(p=>[p.parameter_id,p.default_value]);
    invariant(defaultValues.length === mapping.oldNonNullParameterDefaultCount,'CAPTURED_DEFAULT_COUNT');
    if(defaultValues.length > 0) bindKnaufTechnicalPlanningDefaultsS2769(r,{definitionId:identity.definitionId,
      baselineId:identity.baselineId,releaseId:context.successorReleaseId,evidenceSha256:context.acceptanceEvidenceSha256});
    else r.baseline.parameter_schema_sha256 = knaufTechnicalParameterSchemaSha256S2769(r.parameters);
    invariant(equal(r.parameters.filter(p=>p.default_value != null).map(p=>[p.parameter_id,p.default_value]),defaultValues)
      && equal(r.baseline.input_values,parent.baseline.input_values)
      && equal(r.baseline.input_classification,parent.baseline.input_classification),'DEFAULT_VALUES_OR_BASELINE_INPUTS_CHANGED');
    invariant(bindingPack.newFactParameterIds.every(id=>r.parameters.find(p=>p.parameter_id === id)?.default_value == null
      && !Object.hasOwn(r.baseline.input_values,id)),'NEW_FACT_DEFAULT_FORBIDDEN');
    defaultsKept += defaultValues.length;
    const unresolved = pendingRows(r);
    invariant(equal(sorted(unresolved),sorted(parent.passport.decision.unresolvedResourceRowIds
      .filter((id:string)=>id !== bindingPack.ownerRowId))),'UNRELATED_NEEDS_CHANGED');
    r.passport.capability_matrix = r.passport.capability_matrix.map((capability:Json)=>capability.capability === 'FULL_APPLICABLE_SCOPE'
      ? {...capability,status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:unresolved} : capability);
    const decision = {...parent.passport.decision,status:'GREEN',allowed:true,waveContract:bindingPack.contract,
      predecessorWaveContract:parent.passport.decision.waveContract,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',
      preliminaryCompositionOnly:true,unresolvedResourceRowIds:unresolved,
      activationAllowed:false,productionEligible:false,completeTechnicalEstimateAccepted:false,
      protektorBoundAssembly:{contract:bindingPack.contract,sourceContract:sourcePack.contract,
        sourceRegistryLocatorId:registry.locator.id,excerptSha256:registry.excerptSha256,
        boundedGeometryRowId:bindingPack.ownerRowId,projectFactsAndSupplierMultipleStillRequired:true,
        commonPreflightAndPublicationStillRequired:true,registryTransactionAuthenticated:false,
        savedRevisionMigration:false,priceCompatibilityAccepted:false,newQuantityNorms:0,sourceNeedsClosed:0}};
    const definitionSha256 = hash({contract:bindingPack.contract,predecessorHash:parent.definition.definition_sha256,
      parameters:r.parameters,formulas:r.formulas,resources:r.resources,bindings:r.bindings,
      registryExcerptSha256:registry.excerptSha256});
    const plan = createCanonicalDefinitionClonePlan({contract:bindingPack.contract,
      definition:{id:identity.definitionId,releaseId:context.successorReleaseId,catalogId,
        definitionVersion:Number(parent.definition.definition_version)+1,passport:{...r.definition.passport,protektorContract:sourcePack.contract},
        applicability:r.definition.applicability,definitionSha256,
        sourceMetadata:{...r.definition.source_metadata,contract:bindingPack.contract,
          predecessorDefinitionId:parent.definition.id,protektorContract:sourcePack.contract,
          sourceFreezeSha256:context.sourceFreezeSha256,activationAllowed:false,productionEligible:false}},
      representative:r,parameterTruthMetadata:p=>p.truth_metadata,resourceId:row=>identity.resourceIds[row.row_id]!,
      resourceSemanticOwner:row=>String(row.semantic_owner),resourceSha256:row=>hash({contract:bindingPack.contract,catalogId,row}),
      baseline:{id:identity.baselineId,key:identity.baselineKey,sourceDefinitionVersionId:parent.definition.id,
        validationScenarioRefs:[...(parent.baseline.validation_scenario_refs??[]),{scenario:'KNAUF_PROTEKTOR105922_BOUND_SEVEN',
          acceptanceEvidenceSha256:context.acceptanceEvidenceSha256,sourceFreezeSha256:context.sourceFreezeSha256,
          completeTechnicalEstimateAccepted:false}],acceptanceEvidenceSha256:context.acceptanceEvidenceSha256,
        acceptedReleaseId:context.successorReleaseId,supersedesBaselineId:parent.baseline.id},
      passport:{physicalResultRu:String(parent.passport.physical_result_ru),excludedScopeRu:r.passport.excluded_scope_ru,
        decision,payloadSha256:hash({predecessor:parent.passport.payload_sha256,definitionSha256,
          evidence:context.acceptanceEvidenceSha256}),sourceHead:context.sourceHead,sourceTree:context.sourceTree},
      bindingApplicability:binding=>structuredClone(binding.applicability),expectedNormativeBindingCount:29});
    // The shared clone initializes defaults to null; its normal writer applies
    // them after inserting the baseline. Reuse the existing KNAUF provenance
    // binder, then carry only the 16 already observed planning defaults.
    for(const parameter of plan.parameters) parameter.default_value = r.parameters.find(p=>p.parameter_id === parameter.parameter_id)!.default_value;
    invariant(knaufTechnicalParameterSchemaSha256S2769(plan.parameters) === plan.baseline.parameter_schema_sha256,
      'FINAL_PARAMETER_SCHEMA_DIGEST');
    invariant(canonicalPublisherQuantityScopeIsConsistent(plan),'SHARED_PARTIAL_SCOPE_CONTRACT');
    invariant(plan.bindings.length === 29 && unique(plan.bindings.map(binding=>String(binding.resource_spec_id))).length === 29,
      'SHARED_ONE_BINDING_PER_RESOURCE');
    plans.push(plan);
    transitions.push({catalogId,predecessorDefinitionId:parent.definition.id,successorDefinitionId:identity.definitionId,
      predecessorBaselineId:parent.baseline.id,successorBaselineId:identity.baselineId,
      oldBindingCount:29,newBindingCount:29,unrelatedLogicalBindings:28,newCompositeBindings:1,
      inheritedDefaultCount:defaultValues.length});
  }
  invariant(inheritedBindings === 196 && defaultsKept === 16,'EXACT_SEVEN_INHERITANCE_TOTALS');
  return {contract:bindingPack.contract,status:'BOUND_PLAN_DATA_PREPARED_NOT_PUBLISHED' as const,plans,transitions,
    registryDataDigest:hash(input.registry),compositeExcerptSha256:registry.excerptSha256,
    transactionAuthenticated:false as const,collisionProofAccepted:false as const,publicationReady:false as const,
    commonPublisherPreflightExecuted:false as const,priceCompatibilityAccepted:false as const,
    oldRegistryRowsChanged:false as const,savedRevisionMigrationPerformed:false as const,
    sourceNeedsClosed:0 as const,newCompleteTechnicalTypes:0 as const};
}
