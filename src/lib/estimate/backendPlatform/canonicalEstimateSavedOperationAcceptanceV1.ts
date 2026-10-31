import type {CanonicalProfessionalPdfIssuancePurpose,CanonicalProfessionalPdfReviewAcknowledgmentV1} from './contracts';
import {resolveProfessionalUnitDefinition} from '../professionalUnitRegistry';
import {assertCanonicalPurchaseSupplyRowV1,assertCanonicalPurchaseSupplyRevisionV1} from './canonicalPurchaseSupplyReadinessV1';
import {canonicalArtifactVisibleRowTitle} from './canonicalEstimateArtifactContract';
import {canonicalSavedDefinitionCompositionScopeV1} from './canonicalEstimateDefinitionCompositionScopeV1';
import {canonicalEstimateStableJson} from './canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from './canonicalEstimateSha256';
import {canonicalScopeRequirementDecisionV1,canonicalScopeRequirementDecisionIsOpenV1} from './canonicalScopeRequirementV1';
import {
  auditCanonicalEstimateOperationResourcesV1, canonicalEstimateOperationReference,canonicalEstimateOperationReferences, canonicalEstimatePublicResourceNameIsValidV1, canonicalLegacyResourceKindV1,
  canonicalLegacyResourceNameV1, resolveCanonicalLegacyOperationDisplayV1,
  type CanonicalEstimateOperationResourceAcceptanceV1,
} from './canonicalEstimateOperationComposition';
import {canonicalPublicResourceDisplayPresentationV1,canonicalPublicResourceKindFromCategoryV1,canonicalPublicResourcePresentationKindV1,
  parseCanonicalPublicResourcePresentationV1,canonicalPublicSavedResourceRowKindV1} from './canonicalPublicResourcePresentationV1';

type Storage = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is Storage => value != null && typeof value === 'object' && !Array.isArray(value);
const record = (value: unknown): Storage => value != null && typeof value === 'object' && !Array.isArray(value)
  ? value as Storage : {};

export type CanonicalOperationCompositionEvidenceV1 = Readonly<{
  contractVersion: 'canonical-operation-composition-evidence/v1';
  releaseId: string; definitionVersionId: string; mapSha256: string;
  sourcePassportPayloadSha256: string; independentComposition: unknown;
}>;
const evidenceHash = (value: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
/** Server-owned constructor: caller must supply the exact pinned DB passport,
 * never request-body metadata or a current definition/factory. */
export function canonicalOperationCompositionEvidenceFromPassportV1(input: {
  releaseId: string; definitionVersionId: string; passport: Storage;
}): CanonicalOperationCompositionEvidenceV1 | undefined {
  const map = record(input.passport.decision).independentCompletenessMap;
  if (map == null) return undefined;
  if (String(input.passport.definition_version_id ?? '') !== input.definitionVersionId
      || !/^[0-9a-f]{64}$/u.test(String(input.passport.payload_sha256 ?? '')))
    throw new Error('OPERATION_COMPOSITION_PASSPORT_BINDING_INVALID');
  return {contractVersion:'canonical-operation-composition-evidence/v1', releaseId:input.releaseId,
    definitionVersionId:input.definitionVersionId, mapSha256:evidenceHash(map),
    sourcePassportPayloadSha256:String(input.passport.payload_sha256),
    independentComposition:JSON.parse(JSON.stringify(map))};
}
/** Immutable saved bytes are the authority on read. Hash checks detect corruption;
 * authority is provided by the server-only write path, not a caller's self-hash. */
export function canonicalSavedOperationCompositionEvidenceV1(revision: Storage): {
  independentComposition?: unknown; issue?: string;
} {
  const raw = record(record(revision.amendment_contract).parameterSources).operationCompositionEvidenceV1;
  if (raw === undefined) return {};
  const e = record(raw);
  try {
    if (e.contractVersion !== 'canonical-operation-composition-evidence/v1'
      || typeof revision.release_id !== 'string' || !revision.release_id
      || typeof revision.definition_version_id !== 'string' || !revision.definition_version_id
      || e.releaseId !== revision.release_id || e.definitionVersionId !== revision.definition_version_id
      || !/^[0-9a-f]{64}$/u.test(String(e.sourcePassportPayloadSha256 ?? ''))
      || e.independentComposition == null || e.mapSha256 !== evidenceHash(e.independentComposition))
      return {issue:'SAVED_OPERATION_COMPOSITION_EVIDENCE_INVALID'};
    return {independentComposition:e.independentComposition};
  } catch { return {issue:'SAVED_OPERATION_COMPOSITION_EVIDENCE_INVALID'}; }
}

/** Projection only: ALL saved rows plus preliminary needs, before pagination,
 * ownership filtering or cache lookup. Never imports a current definition. */
export function canonicalEstimateSavedOperationAcceptanceV1(input: {
  revision: Storage; resources: readonly Storage[];
  /** Only this revision's saved definition map; absence stays unverified. */
  savedIndependentComposition?: unknown;
}): CanonicalEstimateOperationResourceAcceptanceV1 {
  const evidence = canonicalSavedOperationCompositionEvidenceV1(input.revision);
  let evidenceIssue = evidence.issue;
  if (input.savedIndependentComposition !== undefined) {
    try {
      if (evidence.independentComposition === undefined
        || evidenceHash(input.savedIndependentComposition) !== evidenceHash(evidence.independentComposition))
        evidenceIssue = 'SAVED_OPERATION_COMPOSITION_EVIDENCE_CONFLICT';
    } catch { evidenceIssue = 'SAVED_OPERATION_COMPOSITION_EVIDENCE_CONFLICT'; }
  }
  const parameters = record(input.revision.input_parameters);
  let scopedComposition:unknown=evidence.independentComposition;
  try{scopedComposition=canonicalSavedDefinitionCompositionScopeV1({independentComposition:scopedComposition,
    savedResources:input.resources,savedParameters:parameters}).independentComposition;}
  catch{return {contractVersion:'canonical-operation-resource-acceptance/v1',status:'STRUCTURE_INVALID',
    issues:[{code:'SAVED_DEFINITION_COMPOSITION_SCOPE_INVALID'}],pdfAllowed:false,definitionAdmissionAllowed:false,completeClaimAllowed:false};}
  const originals = input.resources.map(row => ({rowId: String(row.row_id ?? ''),
    operation: record(record(row.calculation_trace).resourceGraph).operationCompositionV1}));
  const context = {revisionId: String(input.revision.id ?? ''), releaseId: String(input.revision.release_id ?? ''),
    checksumSha256: String(input.revision.checksum_sha256 ?? ''), savedResources: originals};
  const display = resolveCanonicalLegacyOperationDisplayV1(originals, context);
  // Read immutable compiler evidence before omitting documentary scope
  // rows from the physical composition. A numeric gap is not an object fact.
  const unresolvedConditionRowIds = input.resources.filter(row => {
    const trace = record(row.calculation_trace), graph = record(trace.resourceGraph);
    const scope = canonicalScopeRequirementDecisionV1(graph.scopeRequirementDecisionV1);
    return row.need_state === 'CONDITION_REQUIRED' || trace.needState === 'CONDITION_REQUIRED'
      || (Array.isArray(trace.unresolvedConditionParameterIds) && trace.unresolvedConditionParameterIds.length > 0)
      || (scope != null && scope.rowId === row.row_id && canonicalScopeRequirementDecisionIsOpenV1(scope));
  }).map(row => String(row.row_id ?? ''));
  const acceptance = auditCanonicalEstimateOperationResourcesV1({unresolvedConditionRowIds,
    resources: input.resources.flatMap((row, index) => {
    // The complete immutable input above remains the legacy guard authority.
    // Only authenticated scope decisions and the same public-row classifier as
    // PDF identify nonphysical checks/counters. Never filter by financial flags.
    const sourceGraph=record(record(row.calculation_trace).resourceGraph);
    const scope=canonicalScopeRequirementDecisionV1(sourceGraph.scopeRequirementDecisionV1);
    if(scope?.rowId===row.row_id || canonicalPublicSavedResourceRowKindV1(row)!=='RESOURCE')return [];
    const trace = record(row.calculation_trace), graph = record(trace.resourceGraph);
    const rowId = originals[index].rowId, manualTitleOverride = trace.manualTitleOverride === true;
    const sourceNameRu = manualTitleOverride
      ? parseCanonicalPublicResourcePresentationV1(graph.publicResourcePresentationV1)?.sourceTitleRu
      : String(row.title_ru ?? '');
    const presentation = canonicalPublicResourceDisplayPresentationV1({rowId,
      titleRu: String(row.title_ru ?? ''), descriptor: graph.publicResourcePresentationV1,
      manualTitleOverride, graph, parameters, compactPreliminaryNeed: row.ownership_status === 'PRELIMINARY_NEED'});
    const legacyName = canonicalLegacyResourceNameV1(rowId, context, manualTitleOverride);
    return [{rowId, unitId:typeof row.unit_id==='string'?row.unit_id:null, sourceNameRu, nameRu: manualTitleOverride ? String(row.title_ru ?? '')
        : legacyName ?? presentation?.nameRu ?? String(row.title_ru ?? ''),
      resourceKind: canonicalLegacyResourceKindV1(rowId, context) ?? presentation?.resourceKind
        ?? canonicalPublicResourcePresentationKindV1({titleRu:String(row.title_ru ?? ''),
          descriptor:graph.publicResourcePresentationV1,manualTitleOverride})
        ?? canonicalPublicResourceKindFromCategoryV1(row.category),
      operation: display[index].operation, manualTitleOverride,
      publicNameVerified: manualTitleOverride || legacyName != null || presentation != null,
      quantityKnown: row.quantity != null}];
  }), independentComposition: scopedComposition,
    requireIndependentComposition: evidence.independentComposition !== undefined});
  return evidenceIssue ? {...acceptance, status:'STRUCTURE_INVALID', pdfAllowed:false,
    definitionAdmissionAllowed:false, completeClaimAllowed:false,
    issues:[...acceptance.issues,{code:evidenceIssue}]} : acceptance;
}

/** Reads expose diagnostics; artifact issuance asserts the same common result. */
export function assertCanonicalEstimateSavedArtifactStructureV1(acceptance: CanonicalEstimateOperationResourceAcceptanceV1): void {
  if (!acceptance.pdfAllowed) {
    const unverified = acceptance.status === 'COMPOSITION_UNVERIFIED';
    const conditionRequired = acceptance.issues.some(issue => issue.code === 'RESOURCE_CONDITION_UNRESOLVED');
    throw Object.assign(new Error(conditionRequired
      ? 'Не подтверждены обязательные условия выполнения работы. PDF пока недоступен.'
      : unverified
      ? 'Состав подработ не проверен. PDF пока недоступен.'
      : 'В составе подработ обнаружены ошибки. PDF пока недоступен.'), {
      code: unverified ? 'ARTIFACT_OPERATION_COMPOSITION_UNVERIFIED' : 'ARTIFACT_OPERATION_RESOURCE_STRUCTURE_INVALID',
      httpStatus:409,operationResourceAcceptanceV1:acceptance});
  }
}

export function canonicalProfessionalPdfIssuancePurposeV1(value:unknown):CanonicalProfessionalPdfIssuancePurpose {
  if(value===undefined || value==='STANDARD')return 'STANDARD';
  if(value==='PRELIMINARY_REVIEW')return value;
  throw Object.assign(new Error('Некорректный режим PDF.'),{code:'ARTIFACT_PURPOSE_INVALID',httpStatus:400});
}
function reviewFailure(code='ARTIFACT_PRELIMINARY_REVIEW_NOT_ELIGIBLE'):never {
  throw Object.assign(new Error('Предварительный PDF недоступен для этой версии. Проверьте состав и исходные данные.'),{code,httpStatus:409});
}
function reviewIdentity(revision:Storage){return {revisionId:String(revision.id??''),releaseId:String(revision.release_id??''),
  definitionVersionId:String(revision.definition_version_id??''),checksumSha256:String(revision.checksum_sha256??'')};}
const hasNewContract=(value:Storage)=>Object.keys(value).some(key=>/V\d+$/u.test(key));
const decimal=(value:unknown)=> (typeof value==='string'&&/^-?\d+(?:\.\d+)?$/u.test(value)
  ||typeof value==='number')&&Number.isFinite(Number(value))&&Number(value)>=0;
/** Narrow raw-absence path. It never filters audit codes or fabricates references.
 * Supplied newer metadata (even null/malformed) must use the strict contract. */
export function assertCanonicalLegacyReviewSnapshotV1(input:{revision:Storage;resources:readonly Storage[]}):void {
  const {revision,resources}=input;
  const isRecord=(v:unknown)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  if(Object.hasOwn(revision,'amendment_contract')&&!isRecord(revision.amendment_contract))reviewFailure();
  const amendment=record(revision.amendment_contract);
  if(Object.hasOwn(amendment,'parameterSources')&&!isRecord(amendment.parameterSources))reviewFailure();
  const ps=record(amendment.parameterSources);
  if(Object.hasOwn(ps,'preliminaryNeeds')&&(!Array.isArray(ps.preliminaryNeeds)||ps.preliminaryNeeds.length!==0))reviewFailure();
  assertCanonicalPurchaseSupplyRevisionV1(resources,revision.amendment_contract);
  if(!revision.id||!revision.release_id||!revision.definition_version_id
    ||!/^[a-f0-9]{64}$/u.test(String(revision.checksum_sha256))
    ||revision.definition_withdrawal_reason!==null || hasNewContract(ps)
    ||!resources.length || resources.filter(r=>r.ownership_status!=='PRELIMINARY_NEED').length!==Number(revision.row_count))reviewFailure();
  const ids=new Set<string>(),ordinals=new Set<number>(),owners=new Set<string>();
  for(const row of resources){
    const trace=record(row.calculation_trace),graph=record(trace.resourceGraph),id=String(row.row_id??'');
    if(row.calculation_trace==null||typeof row.calculation_trace!=='object'||Array.isArray(row.calculation_trace)
      ||Object.hasOwn(trace,'resourceGraph')&&(trace.resourceGraph==null||typeof trace.resourceGraph!=='object'||Array.isArray(trace.resourceGraph)))reviewFailure();
    // Object/safety/supply/graph metadata cannot disappear through a permissive parser.
    if(!id||ids.has(id)||!Number.isSafeInteger(row.ordinal)||ordinals.has(Number(row.ordinal))
      ||row.revision_id!==revision.id||hasNewContract(graph)||hasNewContract(trace)
      ||Object.hasOwn(graph,'operationCompositionV1')||Object.hasOwn(graph,'originalOperationCompositionV1')
      ||Object.hasOwn(graph,'publicResourcePresentationV1')||trace.needState==='CONDITION_REQUIRED'
      ||Object.hasOwn(row,'need_state')&&row.need_state!=='QUANTITY_REQUIRED'
      ||Object.hasOwn(trace,'needState')&&trace.needState!=='QUANTITY_REQUIRED'
      ||Object.hasOwn(trace,'unresolvedConditionParameterIds')
      ||Object.hasOwn(graph,'parentCostOwnerId')||Object.hasOwn(graph,'includedInResourceOwnerRowId')
      ||Object.hasOwn(graph,'costTreatment')||Object.hasOwn(graph,'purchaseBalanceOwnerRowId')
      ||Object.hasOwn(graph,'costOwnerId')||Object.hasOwn(graph,'costOwner')||Object.hasOwn(row,'cost_owner_id')
      ||canonicalPublicSavedResourceRowKindV1(row)!=='RESOURCE')reviewFailure();
    const owner=row.semantic_owner;
    const storedUnit=typeof row.unit_id==='string'?resolveProfessionalUnitDefinition(row.unit_id):null;
    const graphUnit=typeof graph.canonicalUnit==='string'?resolveProfessionalUnitDefinition(graph.canonicalUnit):null;
    if(row.ownership_status!=='OWNED'||typeof owner!=='string'||!owner.trim()||owners.has(owner)||owner!==String(revision.catalog_id)+':'+id
      ||graph.semanticOwner!==owner||Object.hasOwn(graph,'canonicalUnit')&&(!storedUnit||!graphUnit||storedUnit.code!==graphUnit.code)
      ||typeof row.procurement_eligible!=='boolean'||row.included_in_procurement===true&&row.procurement_eligible!==true
      // Stored coarse type is copied from exact resource_spec.row_type by the
      // existing writer. Graph physicalRowType is the saved category namespace.
      ||!['material','labor','equipment','service','waste','other'].includes(String(row.physical_row_type))
      ||Object.hasOwn(graph,'physicalRowType')&&graph.physicalRowType!==row.category)reviewFailure();
    ids.add(id);ordinals.add(Number(row.ordinal));owners.add(owner);
    if(typeof row.unit_id!=='string'||!storedUnit
      ||!canonicalEstimatePublicResourceNameIsValidV1(String(row.title_ru??''),trace.manualTitleOverride===true)
      ||!canonicalEstimatePublicResourceNameIsValidV1(canonicalArtifactVisibleRowTitle(row,record(revision.input_parameters)),trace.manualTitleOverride===true)
      ||!canonicalPublicResourceKindFromCategoryV1(row.category)
      ||typeof row.included_in_estimate!=='boolean'||typeof row.included_in_procurement!=='boolean'
      ||row.quantity!=null&&!decimal(row.quantity)||row.unit_price!=null&&!decimal(row.unit_price)
      ||row.amount!=null&&!decimal(row.amount)
      ||row.included_in_estimate!==true&&row.amount!=null&&Number(row.amount)!==0
      ||row.quantity==null&&(row.included_in_estimate||row.included_in_procurement||row.amount!=null))reviewFailure();
  }
}
/** Modern preview validates all raw saved needs before their display adapter can
 * clear payment fields. Missing metadata remains unverified; supplied conflicts
 * never become numeric omissions. No approval, source lookup or quantity fill. */
export function assertCanonicalModernReviewSnapshotV1(input:{revision:Storage;resources:readonly Storage[]}):void {
  const {revision,resources}=input,isRecord=(v:unknown):v is Storage=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  if(!isRecord(revision.amendment_contract)||!isRecord(revision.amendment_contract.parameterSources))reviewFailure();
  const ps=revision.amendment_contract.parameterSources,rawNeeds=ps.preliminaryNeeds??[];
  if(Object.hasOwn(ps,'preliminaryNeeds')&&!Array.isArray(ps.preliminaryNeeds)||!Array.isArray(rawNeeds))reviewFailure();
  if(!revision.id||!revision.release_id||!revision.definition_version_id||!revision.catalog_id
    ||!/^[a-f0-9]{64}$/u.test(String(revision.checksum_sha256))||revision.definition_withdrawal_reason!==null
    ||!Number.isSafeInteger(Number(revision.row_count))||Number(revision.row_count)<0||!resources.length)reviewFailure();
  const evidence=canonicalSavedOperationCompositionEvidenceV1(revision);if(evidence.issue)reviewFailure();
  const needs=new Map<string,Storage>();
  for(const value of rawNeeds){
    if(!isRecord(value))reviewFailure();
    const {need_sha256,...basis}=value;
    const manualTrace=record(value.calculation_trace),manualProvenance=record(manualTrace.manualAmendment);
    const manual=value.resource_spec_id===null&&value.formula_id==='manual_custom_quantity'
      &&typeof value.row_id==='string'&&/^manual:[A-Za-z0-9._:-]+$/u.test(value.row_id)
      &&manualTrace.rowId===value.row_id&&manualTrace.semanticOwner===value.row_id&&manualTrace.preliminaryNeed===true
      &&manualTrace.physicalRowType===value.category&&manualProvenance.kind==='manual'
      &&(manualProvenance.reason===undefined||typeof manualProvenance.reason==='string'&&manualProvenance.reason.length<=500);
    if(typeof value.row_id!=='string'||!value.row_id||needs.has(value.row_id)
      ||typeof need_sha256!=='string'||!/^[a-f0-9]{64}$/u.test(need_sha256)||evidenceHash(basis)!==need_sha256
      ||!Number.isSafeInteger(value.ordinal)||(!manual&&(typeof value.resource_spec_id!=='string'||!value.resource_spec_id))
      ||value.need_state!=='QUANTITY_REQUIRED'||typeof value.selected!=='boolean'||typeof value.procurement_eligible!=='boolean'
      ||!Array.isArray(value.missing_parameter_ids)||value.missing_parameter_ids.some(id=>typeof id!=='string'||!id)
      ||Object.hasOwn(value,'amount')&&value.amount!==null
      ||Object.hasOwn(value,'included_in_estimate')&&value.included_in_estimate!==false
      ||Object.hasOwn(value,'included_in_procurement')&&value.included_in_procurement!==false
      ||Object.hasOwn(value,'ownership_status')&&value.ownership_status!=='PRELIMINARY_NEED')reviewFailure();
    assertCanonicalPurchaseSupplyRowV1(value,revision.amendment_contract);needs.set(value.row_id,value);
  }
  const regular=resources.filter(row=>row.ownership_status!=='PRELIMINARY_NEED');
  if(regular.length!==Number(revision.row_count)||resources.length!==regular.length+needs.size)reviewFailure();
  assertCanonicalPurchaseSupplyRevisionV1(resources,revision.amendment_contract);
  // A nonphysical note has no quantity unit. Only an exact saved empty string
  // with the safe declared note role qualifies; null/unknown/physical units do not.
  const emptyProcessNoteUnit=(row:Storage)=>{
    const graph=record(record(row.calculation_trace).resourceGraph),need=needs.get(String(row.row_id));
    return row.unit_id===''&&canonicalPublicSavedResourceRowKindV1(row)==='PROCESS_NOTE'
      &&['INFORMATIONAL_SCOPE','CONTROL_OR_DOCUMENT'].includes(String(graph.costTreatment))
      &&row.included_in_estimate===false&&row.included_in_procurement===false&&row.unit_price==null&&row.amount===null
      &&(!need||need.selected===false)&&(!Object.hasOwn(graph,'canonicalUnit')||graph.canonicalUnit==='');
  };
  const ids=new Set<string>(),ordinals=new Set<number>(),paidOwners=new Set<string>();
  const checkOperation=(raw:unknown)=>{
    const primary=canonicalEstimateOperationReference(raw);if(!primary)reviewFailure();
    if(Object.hasOwn(primary,'additionalOperations')&&(!Array.isArray(primary.additionalOperations)
      ||canonicalEstimateOperationReferences(primary).length!==primary.additionalOperations.length+1))reviewFailure();
  };
  for(const row of resources){
    const id=row.row_id,trace=row.calculation_trace;
    if(typeof id!=='string'||!id||ids.has(id)||!Number.isSafeInteger(row.ordinal)||ordinals.has(Number(row.ordinal))
      ||!isRecord(trace)||Object.hasOwn(trace,'resourceGraph')&&!isRecord(trace.resourceGraph))reviewFailure();
    const graph=record(trace.resourceGraph),need=needs.get(id),preliminary=row.ownership_status==='PRELIMINARY_NEED';
    if(preliminary!==Boolean(need)||!preliminary&&(row.revision_id!==revision.id||typeof row.row_sha256!=='string'||!/^[a-f0-9]{64}$/u.test(row.row_sha256)
        ||!['material','labor','equipment','service','waste','other'].includes(String(row.physical_row_type))))reviewFailure();
    if(need&&(row.row_sha256!==need.need_sha256||row.ordinal!==need.ordinal||row.quantity!==need.quantity||row.unit_price!==need.unit_price
      ||row.unit_id!==need.unit_id||row.title_ru!==need.title_ru||row.resource_spec_id!==need.resource_spec_id
      ||evidenceHash(trace)!==evidenceHash(need.calculation_trace)))reviewFailure();
    if(!['OWNED','OWNED_EXCLUDED','MANUAL_SERVER_OWNED','PRELIMINARY_NEED'].includes(String(row.ownership_status)))reviewFailure();
    const storedUnit=typeof row.unit_id==='string'?resolveProfessionalUnitDefinition(row.unit_id):null,
      graphUnit=typeof graph.canonicalUnit==='string'?resolveProfessionalUnitDefinition(graph.canonicalUnit):null;
    if(!emptyProcessNoteUnit(row)&&(!storedUnit||Object.hasOwn(graph,'canonicalUnit')&&(!graphUnit||graphUnit.code!==storedUnit.code))
      ||!canonicalEstimatePublicResourceNameIsValidV1(String(row.title_ru??''),trace.manualTitleOverride===true)
      ||!canonicalEstimatePublicResourceNameIsValidV1(canonicalArtifactVisibleRowTitle(row,record(revision.input_parameters)),trace.manualTitleOverride===true)
      ||typeof row.included_in_estimate!=='boolean'||typeof row.included_in_procurement!=='boolean'||typeof row.procurement_eligible!=='boolean'
      ||row.included_in_procurement===true&&row.procurement_eligible!==true
      ||row.quantity!=null&&!decimal(row.quantity)||row.unit_price!=null&&!decimal(row.unit_price)||row.amount!=null&&!decimal(row.amount)
      ||row.included_in_estimate!==true&&row.amount!=null&&Number(row.amount)!==0
      ||row.quantity==null&&(row.included_in_estimate||row.included_in_procurement||row.amount!=null)
      ||row.unit_price==null&&row.amount!=null&&(row.included_in_estimate===true||Number(row.amount)!==0)
      ||row.unit_price!=null&&row.currency_code!==revision.currency_code)reviewFailure();
    if(preliminary&&(row.included_in_estimate||row.included_in_procurement||row.procurement_eligible||row.amount!==null))reviewFailure();
    if(Object.hasOwn(row,'need_state')&&row.need_state!=='QUANTITY_REQUIRED'
      ||Object.hasOwn(trace,'needState')&&trace.needState!=='QUANTITY_REQUIRED'
      ||Object.hasOwn(trace,'unresolvedConditionParameterIds')&&(!Array.isArray(trace.unresolvedConditionParameterIds)||trace.unresolvedConditionParameterIds.length)
      ||trace.needState!==undefined&&row.need_state!==undefined&&trace.needState!==row.need_state)reviewFailure();
    if(Object.hasOwn(graph,'scopeRequirementDecisionV1')){
      const scope=canonicalScopeRequirementDecisionV1(graph.scopeRequirementDecisionV1);
      if(!scope||scope.rowId!==id||canonicalScopeRequirementDecisionIsOpenV1(scope))reviewFailure();
    }
    for(const key of ['operationCompositionV1','originalOperationCompositionV1'])if(Object.hasOwn(graph,key))checkOperation(graph[key]);
    if(Object.hasOwn(graph,'publicResourcePresentationV1')){
      if(!parseCanonicalPublicResourcePresentationV1(graph.publicResourcePresentationV1)
        ||trace.manualTitleOverride!==true&&!canonicalPublicResourceDisplayPresentationV1({rowId:id,titleRu:String(row.title_ru),
          descriptor:graph.publicResourcePresentationV1,graph,parameters:record(revision.input_parameters),compactPreliminaryNeed:preliminary}))reviewFailure();
    }
    if(Object.hasOwn(graph,'physicalRowType')&&graph.physicalRowType!==row.category)reviewFailure();
    const treatment=graph.costTreatment;
    if(treatment!==undefined&&!['OWN_COST','INCLUDED_IN_RESOURCE_ROWS','INFORMATIONAL_SCOPE','CONTROL_OR_DOCUMENT'].includes(String(treatment)))reviewFailure();
    if(['INCLUDED_IN_RESOURCE_ROWS','INFORMATIONAL_SCOPE','CONTROL_OR_DOCUMENT'].includes(String(treatment))
      &&(row.included_in_estimate||row.included_in_procurement||row.amount!=null&&Number(row.amount)!==0))reviewFailure();
    if(treatment==='INCLUDED_IN_RESOURCE_ROWS'&&(typeof graph.includedInResourceOwnerRowId!=='string'
      ||!resources.some(owner=>owner.row_id===graph.includedInResourceOwnerRowId)||graph.includedInResourceOwnerRowId===id))reviewFailure();
    for(const key of ['parentCostOwnerId','costOwnerId','costOwner'])if(Object.hasOwn(graph,key)&&(typeof graph[key]!=='string'||!String(graph[key]).trim()))reviewFailure();
    if(!preliminary){
      const manual=record(row.legacy_row_payload),provenance=record(trace.manualAmendment);
      const custom=row.ownership_status==='MANUAL_SERVER_OWNED'&&row.resource_spec_id===null
        &&typeof row.row_id==='string'&&/^manual:[A-Za-z0-9._:-]+$/u.test(row.row_id)
        &&manual.kind==='manual_server_owned_v1'&&row.row_id==='manual:'+String(manual.clientRowId)
        &&trace.rowId===row.row_id&&trace.semanticOwner===row.row_id&&provenance.kind==='manual'
        &&trace.physicalRowType===row.category;
      const owner=row.semantic_owner??(custom?trace.semanticOwner:undefined);
      if(typeof owner!=='string'||!owner.trim()||Object.hasOwn(graph,'semanticOwner')&&graph.semanticOwner!==owner
        ||Object.hasOwn(row,'cost_owner_id')&&(typeof row.cost_owner_id!=='string'||!row.cost_owner_id))reviewFailure();
      if(row.included_in_estimate===true){
        // Existing factories use resource as an ownership role, not a shared
        // payer ID. Explicit IDs and historical non-role IDs keep precedence.
        const financial=String(row.cost_owner_id??graph.costOwnerId??(graph.costOwner==='resource'?undefined:graph.costOwner)??owner);
        for(const key of ['semantic:'+owner,'financial:'+financial]){if(paidOwners.has(key))reviewFailure();paidOwners.add(key);}
      }
    }
    ids.add(id);ordinals.add(Number(row.ordinal));
  }
  for(const row of resources){
    if(record(record(row.calculation_trace).resourceGraph).costTreatment!=='INCLUDED_IN_RESOURCE_ROWS')continue;
    const visited=new Set<string>();let owner:Storage=row;
    while(record(record(owner.calculation_trace).resourceGraph).costTreatment==='INCLUDED_IN_RESOURCE_ROWS'){
      const id=String(owner.row_id);if(visited.has(id))reviewFailure();visited.add(id);
      const target=record(record(owner.calculation_trace).resourceGraph).includedInResourceOwnerRowId;
      const next=resources.find(candidate=>candidate.row_id===target);if(!next)reviewFailure();owner=next;
    }
    const terminal=record(record(owner.calculation_trace).resourceGraph).costTreatment;
    if(terminal!==undefined&&terminal!=='OWN_COST'||needs.has(String(owner.row_id))&&needs.get(String(owner.row_id))!.selected!==true)reviewFailure();
  }
  // Older source maps can have real entries but no newer roster/class-review
  // fields. Validate their supplied bindings; never manufacture missing fields.
  let shapeRevision=revision,completeMap=evidence.independentComposition!==undefined;
  const map=record(evidence.independentComposition);
  if(evidence.independentComposition!==undefined&&!Object.hasOwn(map,'operationRoster')&&!Object.hasOwn(map,'operationRequirements')){
    if(map.contract!=='rik-expo-app.s26-3.independent-completeness-map.v1'
      ||!['NORMATIVE_OPERATION_MAP','TECHNOLOGY_MAP','PRODUCT_SYSTEM_TDS','PROJECT_SYSTEM'].includes(String(map.sourceKind))
      ||map.generatedFromCurrentRows!==false||!/^[a-f0-9]{64}$/u.test(String(map.evidenceSha256))||!Array.isArray(map.entries)||!map.entries.length)reviewFailure();
    for(const raw of map.entries){
      if(!isRecord(raw)||!isRecord(raw.resolution)||typeof raw.sourceId!=='string'||!raw.sourceId
        ||typeof raw.operationId!=='string'||!raw.operationId||typeof raw.expectedResourceId!=='string'||!raw.expectedResourceId
        ||typeof raw.condition!=='string'||!raw.condition)reviewFailure();
      const resolution=raw.resolution;
      if(resolution.kind==='NOT_APPLICABLE'){if(typeof resolution.reasonRu!=='string'||!resolution.reasonRu)reviewFailure();continue;}
      if(!['ROW','INCLUDED_COMPONENT_ROW','INCLUDED_IN_PARENT'].includes(String(resolution.kind)))reviewFailure();
      const row=resources.find(row=>row.row_id===(resolution.rowId??resolution.parentRowId));if(!row)reviewFailure();
      const trace=record(row.calculation_trace),graph=record(trace.resourceGraph);
      if(Object.hasOwn(raw,'publicNameRu')&&(typeof raw.publicNameRu!=='string'||!raw.publicNameRu
        ||trace.manualTitleOverride!==true&&raw.publicNameRu!==canonicalArtifactVisibleRowTitle(row,record(revision.input_parameters))))reviewFailure();
      if(Object.hasOwn(raw,'resourceKind')){
        const expected=canonicalPublicResourcePresentationKindV1({titleRu:String(row.title_ru),descriptor:graph.publicResourcePresentationV1,manualTitleOverride:trace.manualTitleOverride===true})
          ??canonicalPublicResourceKindFromCategoryV1(row.category);
        if(!expected||raw.resourceKind!==expected)reviewFailure();
      }
      if(Object.hasOwn(raw,'formulaId')&&raw.formulaId!==trace.formulaId)reviewFailure();
      if(Object.hasOwn(raw,'unitId')){
        const supplied=typeof raw.unitId==='string'?resolveProfessionalUnitDefinition(raw.unitId):null,
          stored=typeof row.unit_id==='string'?resolveProfessionalUnitDefinition(row.unit_id):null;
        if(!(emptyProcessNoteUnit(row)&&raw.unitId==='')&&(!supplied||!stored||supplied.code!==stored.code))reviewFailure();
      }
      if(Object.hasOwn(raw,'requiredOperationIds')){
        if(!Array.isArray(raw.requiredOperationIds)||!raw.requiredOperationIds.length||raw.requiredOperationIds.some(id=>typeof id!=='string'||!id))reviewFailure();
        const refs=canonicalEstimateOperationReferences(graph.operationCompositionV1);
        if(!refs.length||raw.requiredOperationIds.some(id=>!refs.some(op=>op.operationId===id)))reviewFailure();
      }
    }
    const {operationCompositionEvidenceV1:_notACompleteRoster,...remaining}=ps;
    shapeRevision={...revision,amendment_contract:{...revision.amendment_contract,parameterSources:remaining}};completeMap=false;
  }
  // This projection checks only supplied structure through the existing common
  // audit. The original revision/audit/evidence are never changed or promoted.
  const shapeRows=!completeMap?resources.filter(row=>canonicalPublicSavedResourceRowKindV1(row)==='RESOURCE'
    &&Object.hasOwn(record(record(row.calculation_trace).resourceGraph),'operationCompositionV1')):resources;
  if(shapeRows.length&&canonicalEstimateSavedOperationAcceptanceV1({revision:shapeRevision,resources:shapeRows}).status==='STRUCTURE_INVALID')reviewFailure();
}

/** One explicit preview purpose: old raw-absence and modern saved metadata are
 * separate validated input shapes; neither grants source/full/payment status. */
/** Existing source/readiness diagnostic, independent of report readability. */
export function assertCanonicalProfessionalPdfReadinessSnapshotV1(input:{revision:Storage;resources:readonly Storage[]}):void {
  if(input.resources.some(row=>row.included_in_estimate===true&&(row.quantity==null||row.unit_price==null)&&row.amount!=null))reviewFailure();
  const ps=record(record(input.revision.amendment_contract).parameterSources),needs=ps.preliminaryNeeds;
  const modern=Object.hasOwn(ps,'operationCompositionEvidenceV1')||Array.isArray(needs)&&needs.length>0||input.resources.some(row=>row.ownership_status==='MANUAL_SERVER_OWNED')
    ||input.resources.some(row=>{const graph=record(record(row.calculation_trace).resourceGraph);return Object.hasOwn(graph,'operationCompositionV1')||Object.hasOwn(graph,'publicResourcePresentationV1');});
  if(modern)assertCanonicalModernReviewSnapshotV1(input);else assertCanonicalLegacyReviewSnapshotV1(input);
}

/** Read-only report authority is the exact server-read snapshot, not its
 * engineering readiness. The original operation audit remains diagnostic. */
export function assertCanonicalProfessionalPdfReviewSnapshotV1(input:{revision:Storage;resources:readonly Storage[]}):void {
 const identity=reviewIdentity(input.revision),ps=record(record(input.revision.amendment_contract).parameterSources),raw=ps.preliminaryNeeds;
 if(Object.values(identity).some(v=>!v)||!/^[a-f0-9]{64}$/iu.test(identity.checksumSha256)
   ||!String(input.revision.catalog_id??'')||!Number.isSafeInteger(input.revision.row_count)||Number(input.revision.row_count)<0
   ||raw!==undefined&&!Array.isArray(raw))reviewFailure('ARTIFACT_SAVED_SNAPSHOT_UNREADABLE');
 const rawNeeds=Array.isArray(raw)?raw:[],needIds=new Map<string,Storage>();
 for(const value of rawNeeds){
  if(!isRecord(value)||typeof value.row_id!=='string'||!value.row_id||needIds.has(value.row_id))reviewFailure('ARTIFACT_SAVED_SNAPSHOT_UNREADABLE');
  const{need_sha256,...basis}=value;
  if(typeof need_sha256!=='string'||!/^[a-f0-9]{64}$/iu.test(need_sha256)||evidenceHash(basis)!==need_sha256)
   reviewFailure('ARTIFACT_SAVED_SNAPSHOT_UNREADABLE');
  needIds.set(value.row_id,value);
 }
 const ids=new Set<string>();let ordinary=0;
 for(const row of input.resources){
  const id=row.row_id;
  if(typeof id!=='string'||!id||ids.has(id)||row.revision_id!=null&&row.revision_id!==input.revision.id)
   reviewFailure('ARTIFACT_SAVED_SNAPSHOT_UNREADABLE');
  const need=needIds.get(id),sha=need?.need_sha256??row.row_sha256;
  if(typeof sha!=='string'||!/^[a-f0-9]{64}$/iu.test(sha)||need&&row.row_sha256!==sha)
   reviewFailure('ARTIFACT_SAVED_SNAPSHOT_UNREADABLE');
  if(!need)ordinary++;ids.add(id);
 }
 if(ordinary!==input.revision.row_count||input.resources.length!==ordinary+needIds.size
   ||[...needIds.keys()].some(id=>!ids.has(id)))reviewFailure('ARTIFACT_SAVED_SNAPSHOT_UNREADABLE');
}
export function canonicalProfessionalPdfReportOriginalAuditV1(input:{revision:Storage;resources:readonly Storage[]}):CanonicalEstimateOperationResourceAcceptanceV1 {
 try{return canonicalEstimateSavedOperationAcceptanceV1(input);}catch{
  return{contractVersion:'canonical-operation-resource-acceptance/v1',status:'STRUCTURE_INVALID',pdfAllowed:false,
   definitionAdmissionAllowed:false,completeClaimAllowed:false,issues:[{code:'INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED'}]};
 }
}
/** Bind the unchanged raw capture and live source warning, never a safe display
 * copy. Create, worker, cache and signed file must supply the same capture. */
export function canonicalProfessionalPdfReviewSnapshotDigestV1(input:{revision:Storage;resources:readonly Storage[]}):string {
 const ps=record(record(input.revision.amendment_contract).parameterSources);
 return evidenceHash({contractVersion:'canonical-saved-report-snapshot/v1',...reviewIdentity(input.revision),catalogId:input.revision.catalog_id,
  withdrawalStatusSupplied:Object.hasOwn(input.revision,'definition_withdrawal_reason'),withdrawalReason:input.revision.definition_withdrawal_reason??null,
  rawResources:input.resources,rawPreliminaryNeeds:ps.preliminaryNeeds??[],audit:canonicalProfessionalPdfReportOriginalAuditV1(input)});
}
const reviewUnknownQuantityCount=(resources:readonly Storage[])=>resources.filter(row=>!decimal(row.quantity)&&canonicalPublicSavedResourceRowKindV1(row)==='RESOURCE').length;

/** Server-owned transient PDF eligibility, independent of manual approval. */
export function canonicalProfessionalPdfReviewEligibilityV1(input:{revision:Storage;resources:readonly Storage[]}):
 import('./contracts').CanonicalProfessionalPdfReviewEligibilityV1 {
  let eligible=false;
  try{assertCanonicalProfessionalPdfReviewSnapshotV1(input);eligible=true;}catch{/* retain original audit and blocked reason */}
  return{contractVersion:'canonical-professional-pdf-review-eligibility/v1',...reviewIdentity(input.revision),
    eligible,status:eligible?'ELIGIBLE':'BLOCKED',unknownQuantityCount:reviewUnknownQuantityCount(input.resources),
    auditSha256:canonicalProfessionalPdfReviewSnapshotDigestV1(input),reasonRu:eligible?'Можно открыть отчёт по сохранённым данным. Незавершённые проверки и предупреждения показаны в документе.':'Не удалось прочитать точную сохранённую версию для отчёта.'};
}
export function canonicalProfessionalPdfReviewAcknowledgmentV1(input:{revision:Storage;resources:readonly Storage[];
  request:unknown;actorUserId:string;acknowledgedAt:string}):CanonicalProfessionalPdfReviewAcknowledgmentV1 {
  assertCanonicalProfessionalPdfReviewSnapshotV1(input);
  const request=record(input.request),identity=reviewIdentity(input.revision);
  if(request.acknowledgedPreliminaryReview!==true||Object.entries(identity).some(([k,v])=>request[k]!==v)
    ||!input.actorUserId||!Number.isFinite(Date.parse(input.acknowledgedAt)))reviewFailure('ARTIFACT_REVIEW_REQUEST_INVALID');

  return {contractVersion:'canonical-professional-pdf-review-ack/v1',issuancePurpose:'PRELIMINARY_REVIEW',
    ...identity,acknowledgedPreliminaryReview:true,
    actorUserId:input.actorUserId,acknowledgedAt:input.acknowledgedAt,
    unknownQuantityCount:input.resources.filter(row=>row.quantity==null).length,auditSha256:canonicalProfessionalPdfReviewSnapshotDigestV1(input)};
}
/** Pure projection validates supplied live annotations and saved monetary pairs.
 * It does not turn an absent live annotation into source/issuance authority. */
export function assertCanonicalProfessionalPdfSavedValuesV1(input:{revision:Storage;resources:readonly Storage[]}):void {
  if(Object.hasOwn(input.revision,'definition_withdrawal_reason')&&input.revision.definition_withdrawal_reason!==null)
    throw Object.assign(new Error('Источник сохранённой сметы недоступен. PDF пока нельзя открыть.'),{code:'REVISION_CONTENT_QUARANTINED',httpStatus:409});
  if(input.resources.some(row=>row.included_in_estimate===true&&(row.quantity==null||row.unit_price==null)&&row.amount!=null))
    reviewFailure('ARTIFACT_MONEY_SNAPSHOT_INVALID');
}
/** Shared create/worker/renderer/cache/file decision. The original audit remains unchanged. */
export function assertCanonicalProfessionalPdfIssuanceV1(input:{revision:Storage;resources:readonly Storage[];
  issuancePurpose?:unknown;reviewAcknowledgmentV1?:unknown}):CanonicalEstimateOperationResourceAcceptanceV1 {
  if(canonicalProfessionalPdfIssuancePurposeV1(input.issuancePurpose)==='STANDARD'){
    assertCanonicalProfessionalPdfSavedValuesV1(input);
    if(!Object.hasOwn(input.revision,'definition_withdrawal_reason'))
      throw Object.assign(new Error('Не удалось проверить источник сохранённой сметы. Повторите чтение версии.'),{code:'ARTIFACT_SOURCE_STATUS_UNVERIFIED',httpStatus:409});
    const acceptance=canonicalEstimateSavedOperationAcceptanceV1(input);
    assertCanonicalEstimateSavedArtifactStructureV1(acceptance);return acceptance;
  }
  const acceptance=canonicalProfessionalPdfReportOriginalAuditV1(input);
  assertCanonicalProfessionalPdfReviewSnapshotV1(input);
  const ack=record(input.reviewAcknowledgmentV1),identity=reviewIdentity(input.revision);
  if(ack.contractVersion!=='canonical-professional-pdf-review-ack/v1'||ack.issuancePurpose!=='PRELIMINARY_REVIEW'
    ||ack.acknowledgedPreliminaryReview!==true||Object.entries(identity).some(([k,v])=>ack[k]!==v)
    ||typeof ack.actorUserId!=='string'||!ack.actorUserId||!Number.isFinite(Date.parse(String(ack.acknowledgedAt)))
    ||ack.unknownQuantityCount!==input.resources.filter(row=>row.quantity==null).length
    ||ack.auditSha256!==canonicalProfessionalPdfReviewSnapshotDigestV1(input))reviewFailure('ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID');
  return acceptance;
}
export function assertCanonicalProfessionalPdfPurposeMatchesV1(metadata:unknown,expectedPurpose?:unknown):void {
  const actual=canonicalProfessionalPdfIssuancePurposeV1(record(metadata).issuancePurpose);
  if(actual!==canonicalProfessionalPdfIssuancePurposeV1(expectedPurpose))reviewFailure('ARTIFACT_PURPOSE_CONFLICT');
}
/** Same raw guard as PDF review, evaluated only from authorized server read bytes.
 * Missing/failed diagnostics never grant eligibility. Nothing is written here. */
export function canonicalManualPreliminaryReviewEligibilityV1(input:{revision:Storage;resources:readonly Storage[]}):
  import('./contracts').CanonicalManualPreliminaryReviewEligibilityV1 {
  const acceptance=canonicalEstimateSavedOperationAcceptanceV1(input);
  let eligible=false;
  try{assertCanonicalLegacyReviewSnapshotV1(input);eligible=true;}catch{/* honest blocked result; no metadata synthesis */}
  return {contractVersion:'canonical-manual-preliminary-review-eligibility/v1',...reviewIdentity(input.revision),
    eligible,status:eligible?'ELIGIBLE':'BLOCKED',unknownQuantityCount:input.resources.filter(row=>row.quantity==null).length,
    auditSha256:evidenceHash(acceptance),reasonRu:eligible
      ?'Сохранённая версия доступна для явного предварительного подтверждения. Состав остаётся непроверенным.'
      :'Предварительное подтверждение недоступно. Проверьте состав и обязательные исходные данные сохранённой версии.'};
}