import {canonicalScopeRequirementDecisionV1,canonicalScopeRequirementDecisionIsOpenV1,canonicalScopeRequirementDecisionsEqualV1,canonicalScopeRequirementHasAdditionalObligationsV1} from '../estimate/backendPlatform/canonicalScopeRequirementV1';
import {canonicalEstimateStableJson} from '../estimate/backendPlatform/canonicalEstimateDeterminism';
import type {CanonicalEstimateRevisionView} from '../estimate/backendPlatform/contracts';
import type { ConsumerRepairDraftBundle } from './consumerRequestTypes';
import { consumerCanonicalMissingRequirements } from './consumerCanonicalParameterRequirements';
import { consumerEstimateManualPreliminaryItems, consumerEstimateOpenScopeGroups,
  consumerEstimateScopeDecision, consumerEstimateUnresolvedQuantityItems } from './consumerEstimateReadiness';
import { consumerRepairPendingCanonicalParameterCollection } from './consumerCanonicalParameterCollection';
import {canonicalPreliminaryNamingEvidenceReadRevisionIds,projectedRow} from './consumerCanonicalBackendRevisionProjection';

/** Human acknowledgment of an exact saved version, never admission of a catalog
 * norm or promotion of an unresolved resource into cost/procurement. */
export type ConsumerEstimateManualQuantityApproval = Readonly<{
  mode: 'MANUAL_QUANTITIES' | 'MANUAL_PRELIMINARY'; revisionId: string; releaseId: string; checksumSha256: string;
  rowIds: readonly string[]; sourceParameterIds: readonly string[];
  /** Explicit null quantities retained by this saved preliminary acknowledgment. */
  unresolvedQuantityRowIds?: readonly string[];
  /** An explicit saved-version acknowledgment; never artifact or engineering admission. */
  basis?: 'SAVED_VERSION_REVIEW'; definitionVersionId?: string; unknownQuantityCount?: number; savedReviewAuditSha256?:string;
  acknowledgmentOnly?: true; pdfReady?: false; full?: false; paymentAdmission?: false; procurementAdmission?: false;
}>;

/** A closed informational scope is not a numeric/source admission. The original
 * missing input and row remain; only the exact derived closed question qualifies. */
function verifiedClosedScopeProofs(bundle:ConsumerRepairDraftBundle,
 authority?:CanonicalEstimateRevisionView['preliminaryNeeds']):Map<string,Set<string>>{
 const backend=bundle.structuredEstimatePayload?.canonicalBackend??bundle.canonicalBackendApprovalEvidence,
  state=bundle.estimateDraftRevisionState,current=state?.revisions.find(r=>r.revisionId===state.currentRevisionId),proofs=new Map<string,Set<string>>();
 if(!backend||!current)return proofs;
 for(const need of authority??backend.preliminaryNeeds??[]){
  const matches=bundle.items.filter(i=>i.sourceParameters?.rowCode===need.rowId),item=matches[0],
    saved=current.preliminaryRows?.find(r=>r.rowId===need.rowId);
  if(matches.length!==1||!item||!saved||item.sourceParameters?.rowSha256!==need.needSha256
    ||saved.canonicalNeedAdmissionV1?.needSha256!==need.needSha256)continue;
  const raw=need.scopeRequirementDecision,traceRaw=(need.calculationTrace?.resourceGraph as Record<string,unknown>|undefined)?.scopeRequirementDecisionV1,
    decision=canonicalScopeRequirementDecisionV1(raw??traceRaw),itemDecision=consumerEstimateScopeDecision(item);
  if(!decision||decision.rowId!==need.rowId||!itemDecision||canonicalScopeRequirementDecisionIsOpenV1(decision)
    ||decision.missingObjectFactParameterIds.length!==0||canonicalScopeRequirementHasAdditionalObligationsV1(raw)
    ||canonicalScopeRequirementHasAdditionalObligationsV1(traceRaw)||canonicalScopeRequirementHasAdditionalObligationsV1(item.sourceParameters?.canonicalScopeRequirementDecisionV1)
    ||!canonicalScopeRequirementDecisionsEqualV1(decision,itemDecision))continue;
  if(raw!=null&&traceRaw!=null){
    const traced=canonicalScopeRequirementDecisionV1(traceRaw);
    if(!traced||!canonicalScopeRequirementDecisionsEqualV1(decision,traced))continue;
  }
  const requirements=consumerCanonicalMissingRequirements(item,bundle.canonicalParameterRequirementTables);
  if(!need.missingParameterIds.length||requirements.length!==need.missingParameterIds.length
    ||requirements.some(r=>typeof r.parameterId!=='string'||!need.missingParameterIds.includes(r.parameterId)
      ||r.visibilityRole!=='INTERNAL_ONLY'||r.valueSourceRole!=='COMPILER_DERIVED_RESOURCE_QUANTITY'
      ||r.unitId!=null||r.sourceConfirmationRequired!==false))continue;
  proofs.set(need.rowId,new Set(need.missingParameterIds));
 }
 return proofs;
}
function closedScopeParameterIds(proofs:ReadonlyMap<string,ReadonlySet<string>>):Set<string>{
 return new Set([...proofs.values()].flatMap(ids=>[...ids]));
}
function closedScopeReadMatches(bundle:ConsumerRepairDraftBundle,revision:CanonicalEstimateRevisionView):boolean{
 const cached=verifiedClosedScopeProofs(bundle);
 if(cached.size>0&&!Array.isArray(revision.preliminaryNeeds))return false;
 const fresh=verifiedClosedScopeProofs(bundle,revision.preliminaryNeeds??[]);
 return cached.size===fresh.size&&[...cached].every(([rowId,ids])=>{
   const read=fresh.get(rowId);
   return read!=null&&ids.size===read.size&&[...ids].every(id=>read.has(id));
 });
}
function consumerEstimateKnownManualQuantityApprovalCandidate(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerEstimateManualQuantityApproval | null {
  if (!bundle || consumerRepairPendingCanonicalParameterCollection(bundle)) return null;
  const backend = bundle.structuredEstimatePayload?.canonicalBackend ?? bundle.canonicalBackendApprovalEvidence;
  const state = bundle.estimateDraftRevisionState;
  const current = state?.revisions.find(revision => revision.revisionId === state.currentRevisionId);
  const session = bundle.canonicalParameterSession;
  if (!backend || backend.compilerOwner !== 'backend' || !/^[a-f0-9]{64}$/iu.test(backend.checksumSha256)
    || !current || current.revisionId !== backend.revisionId || state?.revisions.at(-1)?.revisionId !== backend.revisionId
    || current.status === 'blocking_required' || current.resolvedIdentity?.canonicalModelVersion !== backend.releaseId
    || !canonicalPreliminaryNamingEvidenceReadRevisionIds(bundle).includes(backend.revisionId)
    || !current.resolvedIdentity.sourceBindingVersions.some(source=>source.sourceId===backend.releaseId&&source.version===backend.checksumSha256)
    || backend.contentWithdrawalReasonRu
    // Exact revision sessions are transient editor projections. The repository
    // retains only precompile sessions; immutable missingInputs remains the
    // service-side authority when that transient projection is absent.
    || session && (session.draftId !== bundle.draft.id || session.revisionId !== backend.revisionId
      || session.contentWithdrawalReasonRu || ['BLOCKING_REQUIRED', 'INVALID'].includes(session.status)
      || session.blockingMissingParameterIds.length || session.invalidParameterIds.length)
    || bundle.items.length === 0 || bundle.items.some(item => item.sourceParameters?.canonicalBackendRevisionId !== backend.revisionId
      || item.sourceParameters?.canonicalBackendReleaseId !== backend.releaseId)
    || consumerEstimateOpenScopeGroups(bundle).length || consumerEstimateUnresolvedQuantityItems(bundle).length) return null;
  const needs = bundle.items.filter(item => item.sourceParameters?.canonicalPreliminaryNeed === true
    && consumerEstimateScopeDecision(item) == null);
  const manual = consumerEstimateManualPreliminaryItems(bundle);
  if (!needs.length || needs.length !== manual.length) return null;
  const ids = new Set<string>(), rowIds = new Set<string>();
  for (const item of needs) {
    const source = item.sourceParameters!;
    const rowId = source.rowCode;
    const requirements = consumerCanonicalMissingRequirements(item, bundle.canonicalParameterRequirementTables);
    if (typeof rowId !== 'string' || !rowId.trim() || rowIds.has(rowId) || !requirements.length
      || requirements.some(requirement => typeof requirement.parameterId !== 'string'
        || requirement.valueSourceRole !== 'UNRESOLVED_APPLICATION_NORM'
        || requirement.visibilityRole !== 'INTERNAL_ONLY' || requirement.unitId !== item.unit)) return null;
    rowIds.add(rowId);
    for (const requirement of requirements) ids.add(requirement.parameterId as string);
  }
  const closedProofs=verifiedClosedScopeProofs(bundle);
  const savedNeeds = (backend.preliminaryNeeds ?? []).filter(need => need.needState !== 'CONDITION_REQUIRED'&&!closedProofs.has(need.rowId));
  if (savedNeeds.length !== needs.length || savedNeeds.some(need => {
    const item = needs.find(row => row.sourceParameters?.rowCode === need.rowId);
    return !item || need.manualQuantityOverride !== true || need.quantity == null
      || Number(need.quantity) !== item.quantity || need.unitId !== item.unit
      || need.missingParameterIds.some(id => !ids.has(id));
  })) return null;
  // Only the source gaps of those very rows may remain. Object, safety,
  // packaging and unrelated contract requirements retain their normal gates.
  const closed=closedScopeParameterIds(closedProofs),allowed=(id:string)=>ids.has(id)||closed.has(id);
  if (!current.missingInputs.length || current.missingInputs.some(input => input.requiredFor !== 'contract_ready'
    || input.blocksPreliminaryEstimate || !allowed(input.key))
    || session?.contractMissingParameterIds.some(id => !allowed(id))) return null;
  return { mode: 'MANUAL_QUANTITIES', revisionId: backend.revisionId, releaseId: backend.releaseId,
    checksumSha256: backend.checksumSha256, rowIds: [...rowIds].sort(), sourceParameterIds: [...ids].sort() };
}

/** The same revision-bound receipt can acknowledge an honest saved preliminary
 * version. Null quantities stay null and non-payable; only application-owned
 * norm gaps qualify. Object/safety/applicability/supply gates remain closed. */
function consumerEstimateManualPreliminaryApprovalCandidate(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerEstimateManualQuantityApproval | null {
  if (!bundle || consumerRepairPendingCanonicalParameterCollection(bundle)) return null;
  const backend = bundle.structuredEstimatePayload?.canonicalBackend ?? bundle.canonicalBackendApprovalEvidence;
  const state = bundle.estimateDraftRevisionState;
  const current = state?.revisions.find(revision => revision.revisionId === state.currentRevisionId);
  const session = bundle.canonicalParameterSession;
  if (!backend || backend.compilerOwner !== 'backend' || !/^[a-f0-9]{64}$/iu.test(backend.checksumSha256)
    || !current || current.revisionId !== backend.revisionId || state?.revisions.at(-1)?.revisionId !== backend.revisionId
    || current.status === 'blocking_required' || current.resolvedIdentity?.canonicalModelVersion !== backend.releaseId
    || !canonicalPreliminaryNamingEvidenceReadRevisionIds(bundle).includes(backend.revisionId)
    || !current.resolvedIdentity.sourceBindingVersions.some(source=>source.sourceId===backend.releaseId&&source.version===backend.checksumSha256)
    || backend.contentWithdrawalReasonRu
    // Exact revision sessions are transient editor projections. The repository
    // retains only precompile sessions; immutable missingInputs remains the
    // service-side authority when that transient projection is absent.
    || session && (session.draftId !== bundle.draft.id || session.revisionId !== backend.revisionId
      || session.contentWithdrawalReasonRu || ['BLOCKING_REQUIRED', 'INVALID'].includes(session.status)
      || session.blockingMissingParameterIds.length || session.invalidParameterIds.length)
    || bundle.items.length === 0 || bundle.items.some(item => item.sourceParameters?.canonicalBackendRevisionId !== backend.revisionId
      || item.sourceParameters?.canonicalBackendReleaseId !== backend.releaseId)
    || consumerEstimateOpenScopeGroups(bundle).length
    || bundle.items.some(item => {const blocks=item.sourceParameters?.canonicalPurchaseSupplyBlocksV1;return Array.isArray(blocks)&&blocks.length>0;})) return null;
  const needs = bundle.items.filter(item => item.sourceParameters?.canonicalPreliminaryNeed === true
    && consumerEstimateScopeDecision(item) == null);
  if (!needs.length || !needs.some(item => item.quantity == null)
    || needs.some(item => item.sourceParameters?.includedInEstimate !== false
      || item.sourceParameters?.includedInProcurement !== false || item.sourceParameters?.payable !== false)) return null;
  const ids = new Set<string>(), rowIds = new Set<string>();
  for (const item of needs) {
    const source = item.sourceParameters!;
    const rowId = source.rowCode;
    const requirements = consumerCanonicalMissingRequirements(item, bundle.canonicalParameterRequirementTables);
    if (typeof rowId !== 'string' || !rowId.trim() || rowIds.has(rowId) || !requirements.length
      || requirements.some(requirement => typeof requirement.parameterId !== 'string'
        || requirement.valueSourceRole !== 'UNRESOLVED_APPLICATION_NORM'
        || requirement.visibilityRole !== 'INTERNAL_ONLY'
        || !(requirement.unitId === item.unit || (requirement.unitId == null && item.unit === '')))) return null;
    rowIds.add(rowId);
    for (const requirement of requirements) ids.add(requirement.parameterId as string);
  }
  const closedProofs=verifiedClosedScopeProofs(bundle);
  const savedNeeds = (backend.preliminaryNeeds ?? []).filter(need => need.needState !== 'CONDITION_REQUIRED'&&!closedProofs.has(need.rowId));
  if (savedNeeds.length !== needs.length || savedNeeds.some(need => {
    const item = needs.find(row => row.sourceParameters?.rowCode === need.rowId);
    return !item || (need.quantity == null ? item.quantity != null
      : item.quantity == null || !Number.isFinite(item.quantity) || item.quantity < 0 || Number(need.quantity) !== item.quantity)
      || (need.manualQuantityOverride === true) !== (item.sourceParameters?.manualQuantityOverride === true)
      || !(need.unitId === item.unit || (need.unitId == null && item.unit === ''))
      || need.missingParameterIds.some(id => !ids.has(id));
  })) return null;
  // Only the source gaps of those very rows may remain. Object, safety,
  // packaging and unrelated contract requirements retain their normal gates.
  const closed=closedScopeParameterIds(closedProofs),allowed=(id:string)=>ids.has(id)||closed.has(id);
  if (!current.missingInputs.length || current.missingInputs.some(input => input.requiredFor !== 'contract_ready'
    || input.blocksPreliminaryEstimate || !allowed(input.key))
    || session?.contractMissingParameterIds.some(id => !allowed(id))) return null;
  return { mode: 'MANUAL_PRELIMINARY', revisionId: backend.revisionId, releaseId: backend.releaseId,
    checksumSha256: backend.checksumSha256, rowIds: [...rowIds].sort(), sourceParameterIds: [...ids].sort(),
    unresolvedQuantityRowIds: needs.filter(item => item.quantity == null).map(item => String(item.sourceParameters!.rowCode)).sort() };
}

/** Complete saved projection parity is independent from artifact issuance. */
function consumerEstimateSavedProjectionParity(bundle:ConsumerRepairDraftBundle|null|undefined,allowUnknownRegularQuantity:boolean,
 freshNeeds?:CanonicalEstimateRevisionView['preliminaryNeeds']):boolean{
 if(!bundle)return false;
 const backend=bundle.structuredEstimatePayload?.canonicalBackend??bundle.canonicalBackendApprovalEvidence,state=bundle.estimateDraftRevisionState,
  current=state?.revisions.find(r=>r.revisionId===state.currentRevisionId);
 if(!backend||!current||current.revisionId!==backend.revisionId||state?.revisions.at(-1)?.revisionId!==backend.revisionId
   ||current.resolvedIdentity?.canonicalModelVersion!==backend.releaseId||!canonicalPreliminaryNamingEvidenceReadRevisionIds(bundle).includes(backend.revisionId))return false;
 const ordinary=bundle.items.filter(i=>i.sourceParameters?.canonicalPreliminaryNeed!==true),needs=bundle.items.filter(i=>i.sourceParameters?.canonicalPreliminaryNeed===true),
  paid=new Map(current.boq.rows.map(r=>[r.rowId,r])),preliminary=new Map((current.preliminaryRows??[]).map(r=>[r.rowId,r])),ids=new Set<string>();
 if(paid.size!==current.boq.rows.length||paid.size!==ordinary.length||preliminary.size!==(current.preliminaryRows??[]).length||preliminary.size!==needs.length)return false;
 const freshById=freshNeeds==null?null:new Map(freshNeeds.map(need=>[need.rowId,need]));
 if(freshNeeds&&freshById&&(freshById.size!==freshNeeds.length||freshById.size!==preliminary.size))return false;
 for(const item of bundle.items){
  const source=item.sourceParameters,id=source?.rowCode;
  if(typeof id!=='string'||!id||ids.has(id)||source?.canonicalBackendRevisionId!==backend.revisionId||source?.canonicalBackendReleaseId!==backend.releaseId||(source.canonicalBackendCatalogId!=null&&source.canonicalBackendCatalogId!==backend.catalogId))return false;
  ids.add(id);
  if(source.canonicalPreliminaryNeed===true){
   const saved=preliminary.get(id),need=backend.preliminaryNeeds?.find(n=>n.rowId===id);
   const fresh=freshById?.get(id),localGraph=need?.calculationTrace?.resourceGraph as Record<string,unknown>|undefined,
    freshGraph=fresh?.calculationTrace?.resourceGraph as Record<string,unknown>|undefined,
    localCoverage=need?.commercialCostCoverageDecision??localGraph?.commercialCostCoverageDecisionV1??null,
    freshCoverage=fresh?.commercialCostCoverageDecision??freshGraph?.commercialCostCoverageDecisionV1??null,
    localTreatment=need?.costTreatment??localGraph?.costTreatment??null,
    freshTreatment=fresh?.costTreatment??freshGraph?.costTreatment??null;
   // The PDF projection keeps the saved selection ledger. It never grants a
   // need payment; fresh server fields, rather than local toggles, own flags.
   if(freshById&&(!fresh||!need||!saved
     ||fresh.needSha256!==saved.canonicalNeedAdmissionV1?.needSha256||need.needSha256!==fresh.needSha256
     ||need.selected!==fresh.selected||need.procurementEligible!==fresh.procurementEligible
     ||typeof fresh.selected!=='boolean'||typeof fresh.procurementEligible!=='boolean'
     ||need.needState!==fresh.needState||need.titleRu!==fresh.titleRu||need.unitId!==fresh.unitId
     ||need.quantity!==fresh.quantity||need.unitPrice!==fresh.unitPrice
     ||canonicalEstimateStableJson(need.calculationTrace??null)!==canonicalEstimateStableJson(fresh.calculationTrace??null)
     ||canonicalEstimateStableJson(localCoverage)!==canonicalEstimateStableJson(freshCoverage)
     ||localTreatment!==freshTreatment))return false;
   const includedInEstimate=fresh?.selected??false,
    includedInProcurement=fresh!=null&&fresh.selected&&fresh.procurementEligible&&freshCoverage==null;
   if(!saved||!need||saved.quantity!==(item.quantity??null)||saved.titleRu!==item.titleRu
     ||(saved.unit??'')!==(item.unit??'')||(saved.unitPrice??null)!==(item.unitPrice??null)
     ||source.includedInEstimate!==includedInEstimate||source.includedInProcurement!==includedInProcurement||source.payable!==false
     ||fresh!=null&&(source.procurementEligible!==fresh.procurementEligible
       ||(source.canonicalCostTreatment??null)!==freshTreatment
       ||canonicalEstimateStableJson(source.canonicalCommercialCostCoverageDecisionV1??null)!==canonicalEstimateStableJson(freshCoverage))
     ||!saved.canonicalNeedAdmissionV1||typeof saved.canonicalNeedAdmissionV1.needSha256!=='string'||!/^[a-f0-9]{64}$/iu.test(saved.canonicalNeedAdmissionV1.needSha256)||source.rowSha256!==saved.canonicalNeedAdmissionV1.needSha256
     ||need.currencyCode!=null&&item.currency!==need.currencyCode||source.canonicalBackendOwnershipStatus!=='PRELIMINARY_NEED')return false;
   const compact=canonicalScopeRequirementDecisionV1(need.scopeRequirementDecision),
     traceRaw=(need.calculationTrace?.resourceGraph as Record<string,unknown>|undefined)?.scopeRequirementDecisionV1,
     traced=canonicalScopeRequirementDecisionV1(traceRaw),itemDecision=consumerEstimateScopeDecision(item);
   if(need.scopeRequirementDecision!=null||traceRaw!=null||source.canonicalScopeRequirementDecisionV1!=null){
     const authority=compact??traced;
     if(!authority||!itemDecision||authority.rowId!==id||!canonicalScopeRequirementDecisionsEqualV1(authority,itemDecision)
       ||need.scopeRequirementDecision!=null&&!compact||traceRaw!=null&&!traced
       ||compact&&traced&&!canonicalScopeRequirementDecisionsEqualV1(compact,traced))return false;
   }
   try{if(canonicalEstimateStableJson(item.calculationTrace?JSON.parse(item.calculationTrace):null)!==canonicalEstimateStableJson(need.calculationTrace??null))return false;}catch{return false;}
  }else{
   const saved=paid.get(id),projected=projectedRow(item);
   if(!saved||(item.quantity==null?!allowUnknownRegularQuantity:!Number.isFinite(item.quantity)||item.quantity<0)||(saved.quantity??null)!==(item.quantity??null)
     ||saved.titleRu!==item.titleRu||saved.unit!==item.unit||(saved.unitPrice??null)!==(item.unitPrice??null)||saved.currency!==item.currency
     ||saved.rowType!==projected.rowType||(saved.category??null)!==projected.category
     ||saved.includedInProcurement!==projected.includedInProcurement||(saved.payable??null)!==projected.payable
     ||(saved.calculationTrace??null)!==(item.calculationTrace??null)
     ||(saved.sourceParameters?.rowSha256??null)!==(source.rowSha256??null))return false;
   for(const key of ['canonicalBackendRevisionId','canonicalBackendReleaseId','canonicalBackendCatalogId','includedInEstimate','includedInProcurement','payable','semanticOwner','costOwnershipId','physicalResourceKey','paymentOwnerRowId','procurementOwnerRowId'])
     if((saved.sourceParameters?.[key]??null)!==(source[key]??null))return false;
   for(const key of ['resourceGraph','canonicalResourceGraph','canonicalOperationCompositionV1','canonicalOperationComposition','publicResourcePresentation','canonicalPublicResourcePresentationV1','costTreatment','canonicalSharedResourceUseV1'])
     if(canonicalEstimateStableJson(saved.sourceParameters?.[key]??null)!==canonicalEstimateStableJson(source[key]??null))return false;
  }
 }
 return true;
}
/** Manual acknowledgment still requires numeric ordinary rows. */
export function consumerEstimateManualSavedProjectionParity(bundle:ConsumerRepairDraftBundle|null|undefined):boolean{
 return consumerEstimateSavedProjectionParity(bundle,false);
}
/** Read-only saved PDF may show an unknown quantity; all identity, financial,
 * provenance and item-to-saved-projection checks are otherwise identical. */
export function consumerEstimateSavedProjectionParityForPdfReview(bundle:ConsumerRepairDraftBundle|null|undefined,
 revision:CanonicalEstimateRevisionView):boolean{
 const backend=bundle?.structuredEstimatePayload?.canonicalBackend??bundle?.canonicalBackendApprovalEvidence;
 if(!backend||revision.revisionId!==backend.revisionId||revision.releaseId!==backend.releaseId
   ||revision.catalogId!==backend.catalogId||revision.checksumSha256!==backend.checksumSha256
   ||revision.preliminaryNeeds!=null&&!Array.isArray(revision.preliminaryNeeds))return false;
 const freshNeeds=revision.preliminaryNeeds??[];
 if(freshNeeds.some(need=>Object.hasOwn(need,'purchaseSupplyBlocks')
   &&(!Array.isArray(need.purchaseSupplyBlocks)||need.purchaseSupplyBlocks.length>0)))return false;
 return !manualApprovalSupplyBlocked(bundle)&&consumerEstimateSavedProjectionParity(bundle,true,freshNeeds);
}
/** A new commit needs a fresh same-tuple server read, including live withdrawal. */
export function consumerEstimateManualCommitRevisionMatches(bundle:ConsumerRepairDraftBundle,ack:ConsumerEstimateManualQuantityApproval,
 revision:CanonicalEstimateRevisionView|null|undefined):boolean{
 const backend=bundle.structuredEstimatePayload?.canonicalBackend??bundle.canonicalBackendApprovalEvidence;
 return Boolean(revision&&backend&&revision.revisionId===ack.revisionId&&revision.releaseId===ack.releaseId
  &&revision.catalogId===backend.catalogId&&revision.checksumSha256===ack.checksumSha256&&revision.definitionVersionId
  &&!revision.contentWithdrawalReasonRu&&!backend.contentWithdrawalReasonRu&&(revision.compilerOwner??'backend')==='backend'
  &&consumerEstimateManualSavedProjectionParity(bundle)&&closedScopeReadMatches(bundle,revision)&&consumerEstimateManualQuantityApprovalMatches(bundle,ack,revision));
}
function manualApprovalSupplyBlocked(bundle:ConsumerRepairDraftBundle|null|undefined):boolean{
 return Boolean(bundle?.items.some(item=>{
   const source=item.sourceParameters;
   return source!=null&&Object.hasOwn(source,'canonicalPurchaseSupplyBlocksV1')
     &&(!Array.isArray(source.canonicalPurchaseSupplyBlocksV1)||source.canonicalPurchaseSupplyBlocksV1.length>0);
 }));
}
export function consumerEstimateManualQuantityApprovalCandidate(bundle: ConsumerRepairDraftBundle | null | undefined): ConsumerEstimateManualQuantityApproval | null {
  // Do not parse a blocked supply record while rendering an approval action.
  // Neither manual mode can acknowledge an unresolved supply discrepancy.
  if(manualApprovalSupplyBlocked(bundle)||!consumerEstimateManualSavedProjectionParity(bundle))return null;
  return consumerEstimateKnownManualQuantityApprovalCandidate(bundle) ?? consumerEstimateManualPreliminaryApprovalCandidate(bundle);
}

/** Checks a fresh server-owned result only; no client audit waiver or PDF rule. */
export function consumerEstimateSavedReviewEligible(revision:CanonicalEstimateRevisionView|null|undefined):boolean{
 const e=revision?.manualPreliminaryReviewEligibilityV1;
 return Boolean(revision&&e?.contractVersion==='canonical-manual-preliminary-review-eligibility/v1'
   &&e.eligible===true&&e.status==='ELIGIBLE'&&e.revisionId===revision.revisionId&&e.releaseId===revision.releaseId
   &&e.definitionVersionId===revision.definitionVersionId&&e.checksumSha256===revision.checksumSha256
   &&Number.isSafeInteger(e.unknownQuantityCount)&&e.unknownQuantityCount>=0&&/^[a-f0-9]{64}$/iu.test(e.auditSha256));
}
/** Exact read-only saved tuple. Missing graph/presentation is acknowledged as
 * preliminary; object/safety/supply/version checks remain independent gates. */
export function consumerEstimateSavedPreliminaryApprovalCandidate(
 bundle: ConsumerRepairDraftBundle|null|undefined, revision?: CanonicalEstimateRevisionView|null,
):ConsumerEstimateManualQuantityApproval|null {
 if(!bundle||!revision||consumerRepairPendingCanonicalParameterCollection(bundle)||manualApprovalSupplyBlocked(bundle)||!consumerEstimateManualSavedProjectionParity(bundle))return null;
 const eligibility=revision.manualPreliminaryReviewEligibilityV1;
 if(!eligibility||!consumerEstimateSavedReviewEligible(revision)||eligibility.unknownQuantityCount!==0)return null;
 const backend=bundle.structuredEstimatePayload?.canonicalBackend??bundle.canonicalBackendApprovalEvidence,
  state=bundle.estimateDraftRevisionState,current=state?.revisions.find(r=>r.revisionId===state.currentRevisionId),session=bundle.canonicalParameterSession;
 if(!backend||backend.compilerOwner!=='backend'||!current||state?.revisions.at(-1)?.revisionId!==backend.revisionId
  ||current.revisionId!==backend.revisionId||current.status==='blocking_required'||current.missingInputs.length>0
  ||current.resolvedIdentity?.canonicalModelVersion!==backend.releaseId
  ||!canonicalPreliminaryNamingEvidenceReadRevisionIds(bundle).includes(backend.revisionId)
  ||!current.resolvedIdentity.sourceBindingVersions.some(s=>s.sourceId===backend.releaseId&&s.version===backend.checksumSha256)
  ||backend.contentWithdrawalReasonRu||revision.contentWithdrawalReasonRu
  ||revision.revisionId!==backend.revisionId||revision.releaseId!==backend.releaseId||revision.catalogId!==backend.catalogId
  ||revision.checksumSha256!==backend.checksumSha256||!/^[a-f0-9]{64}$/iu.test(revision.checksumSha256)
  ||!revision.definitionVersionId||!['STRUCTURE_INVALID','COMPOSITION_UNVERIFIED'].includes(String(revision.operationResourceAcceptanceV1?.status))
  ||revision.operationResourceAcceptanceV1?.pdfAllowed!==false
  ||session&&(session.draftId!==bundle.draft.id||session.revisionId!==backend.revisionId||session.contentWithdrawalReasonRu
    ||['BLOCKING_REQUIRED','INVALID'].includes(session.status)||session.blockingMissingParameterIds.length||session.invalidParameterIds.length||session.contractMissingParameterIds.length)
  ||consumerEstimateOpenScopeGroups(bundle).length||bundle.items.length===0||bundle.items.length!==revision.rowCount
  ||(backend.preliminaryNeeds?.length??0)>0||(revision.preliminaryNeeds?.length??0)>0)return null;
 const savedRows=current.boq.rows,savedById=new Map(savedRows.map(row=>[row.rowId,row]));
 if(savedRows.length!==bundle.items.length||savedById.size!==savedRows.length)return null;
 const rowIds=new Set<string>();
 for(const item of bundle.items){const source=item.sourceParameters,blocks=source?.canonicalPurchaseSupplyBlocksV1,rowId=source?.rowCode;
  if(source?.canonicalBackendRevisionId!==backend.revisionId||source?.canonicalBackendReleaseId!==backend.releaseId
   ||typeof rowId!=='string'||!rowId.trim()||rowIds.has(rowId)||item.quantity==null||!Number.isFinite(item.quantity)||item.quantity<0
   ||Array.isArray(blocks)&&blocks.length>0)return null;
  const saved=savedById.get(rowId);
  if(!saved||saved.quantity!==item.quantity||saved.unit!==item.unit||saved.titleRu!==item.titleRu
   ||(saved.unitPrice??null)!==(item.unitPrice??null)||saved.currency!==item.currency)return null;
  const projected=projectedRow(item);
  if(saved.rowType!==projected.rowType||(saved.category??null)!==projected.category
    ||saved.includedInProcurement!==projected.includedInProcurement||(saved.payable??null)!==projected.payable)return null;
  for(const key of ['canonicalBackendRevisionId','canonicalBackendReleaseId','canonicalBackendCatalogId','includedInEstimate','includedInProcurement','payable','semanticOwner','costOwnershipId','physicalResourceKey','paymentOwnerRowId','procurementOwnerRowId'])
    if((saved.sourceParameters?.[key]??null)!==(source?.[key]??null))return null;
  for(const key of ['resourceGraph','canonicalResourceGraph','canonicalOperationCompositionV1','publicResourcePresentation','costTreatment'])
    if(canonicalEstimateStableJson(saved.sourceParameters?.[key]??null)!==canonicalEstimateStableJson(source?.[key]??null))return null;
  rowIds.add(rowId);}
 return{mode:'MANUAL_PRELIMINARY',basis:'SAVED_VERSION_REVIEW',revisionId:backend.revisionId,releaseId:backend.releaseId,
  definitionVersionId:revision.definitionVersionId,savedReviewAuditSha256:eligibility.auditSha256,checksumSha256:backend.checksumSha256,rowIds:[...rowIds].sort(),sourceParameterIds:[],
  unresolvedQuantityRowIds:[],unknownQuantityCount:0,acknowledgmentOnly:true,pdfReady:false,full:false,paymentAdmission:false,procurementAdmission:false};
}
function manualApprovalRecord(value: unknown): ConsumerEstimateManualQuantityApproval | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const validIds = (ids: unknown): ids is string[] => Array.isArray(ids) && ids.length > 0
    && ids.every(id => typeof id === 'string' && id.trim().length > 0) && new Set(ids).size === ids.length;
  if (!['MANUAL_QUANTITIES','MANUAL_PRELIMINARY'].includes(String(record.mode)) || typeof record.revisionId !== 'string' || !record.revisionId.trim()
    || typeof record.releaseId !== 'string' || !record.releaseId.trim()
    || typeof record.checksumSha256 !== 'string' || !/^[a-f0-9]{64}$/iu.test(record.checksumSha256)
    || !validIds(record.rowIds)) return null;
  const savedReview=record.mode==='MANUAL_PRELIMINARY'&&record.basis==='SAVED_VERSION_REVIEW';
  if(record.basis!==undefined&&!savedReview)return null;
  if(savedReview){
    if(!Array.isArray(record.sourceParameterIds)||record.sourceParameterIds.length!==0||typeof record.definitionVersionId!=='string'||!record.definitionVersionId.trim()||typeof record.savedReviewAuditSha256!=='string'||!/^[a-f0-9]{64}$/iu.test(record.savedReviewAuditSha256)
      ||record.unknownQuantityCount!==0||record.acknowledgmentOnly!==true||record.pdfReady!==false||record.full!==false
      ||record.paymentAdmission!==false||record.procurementAdmission!==false)return null;
  }else if(!validIds(record.sourceParameterIds))return null;
  const unresolved = record.unresolvedQuantityRowIds;
  if(record.mode==='MANUAL_PRELIMINARY'){
    if(!Array.isArray(unresolved)||!unresolved.every(id=>typeof id==='string'))return null;
    if(savedReview?unresolved.length!==0:!validIds(unresolved))return null;
    if(unresolved.some(id=>!(record.rowIds as string[]).includes(id)))return null;
  }
  return { mode: record.mode as ConsumerEstimateManualQuantityApproval['mode'], revisionId: record.revisionId, releaseId: record.releaseId,
    checksumSha256: record.checksumSha256, rowIds: [...record.rowIds], sourceParameterIds: [...record.sourceParameterIds as string[]],
    ...(record.mode === 'MANUAL_PRELIMINARY' ? {unresolvedQuantityRowIds: [...unresolved as string[]]} : {}),
    ...(savedReview?{basis:'SAVED_VERSION_REVIEW' as const,definitionVersionId:record.definitionVersionId as string,savedReviewAuditSha256:record.savedReviewAuditSha256 as string,unknownQuantityCount:0,
      acknowledgmentOnly:true as const,pdfReady:false as const,full:false as const,paymentAdmission:false as const,procurementAdmission:false as const}:{}) };
}

/** A retained acknowledgment describes this immutable approved version only.
 * Durable summaries intentionally have no structured payload, rows or events. */
export function consumerEstimateManualQuantityApprovalRecord(
  bundle: ConsumerRepairDraftBundle | null | undefined,
): ConsumerEstimateManualQuantityApproval | null {
  if (!bundle || !['consumer_approved', 'sent_to_marketplace', 'archived'].includes(bundle.draft.status)) return null;
  const backend = bundle.structuredEstimatePayload?.canonicalBackend;
  const state = bundle.estimateDraftRevisionState;
  const current = state?.revisions.find(revision => revision.revisionId === state.currentRevisionId);
  const summary = bundle.durableHistorySummary;
  const revisionId = backend?.revisionId ?? bundle.items[0]?.sourceParameters?.canonicalBackendRevisionId
    ?? current?.revisionId ?? summary?.sourceRevisionId;
  const releaseId = backend?.releaseId ?? bundle.items[0]?.sourceParameters?.canonicalBackendReleaseId
    ?? current?.resolvedIdentity?.canonicalModelVersion ?? summary?.sourceReleaseId;
  if (typeof revisionId !== 'string' || typeof releaseId !== 'string'
    || bundle.items.some(item => (item.sourceParameters?.canonicalBackendRevisionId != null
      || item.sourceParameters?.canonicalBackendReleaseId != null)
      && (item.sourceParameters?.canonicalBackendRevisionId !== revisionId
        || item.sourceParameters?.canonicalBackendReleaseId !== releaseId))
    || state && (!current || current.revisionId !== revisionId
      || current.resolvedIdentity?.canonicalModelVersion !== releaseId)) return null;
  const projectionChecksum = current?.resolvedIdentity?.sourceBindingVersions.find(source => source.sourceId === releaseId)?.version;
  const checksum = backend?.checksumSha256 ?? projectionChecksum ?? summary?.canonicalRevisionChecksumSha256;
  if (backend && backend.compilerOwner !== 'backend'
    || backend && projectionChecksum && projectionChecksum !== backend.checksumSha256) return null;
  const records = bundle.events.filter(event => ['consumer_approved_canonical_backend_pdf','consumer_approved_canonical_preliminary','consumer_approved_canonical_manual_quantities'].includes(event.eventType))
    .map(event => event.payload.manualQuantityApproval).reverse();
  records.push(summary?.manualQuantityApproval);
  for (const value of records) {
    const record = manualApprovalRecord(value);
    if (record && record.revisionId === revisionId && record.releaseId === releaseId
      && (!checksum || record.checksumSha256 === checksum)) return record;
  }
  return null;
}

export function consumerEstimateHasConfirmedManualQuantities(bundle: ConsumerRepairDraftBundle | null | undefined): boolean {
  return consumerEstimateManualQuantityApprovalRecord(bundle) != null;
}

export function consumerEstimateManualQuantityApprovalMatches(
  bundle: ConsumerRepairDraftBundle | null | undefined,
  acknowledgment: ConsumerEstimateManualQuantityApproval | null | undefined,
  savedRevisionRead?:CanonicalEstimateRevisionView|null,
): boolean {
  const candidate = acknowledgment?.basis==='SAVED_VERSION_REVIEW'
    ?consumerEstimateSavedPreliminaryApprovalCandidate(bundle,savedRevisionRead):consumerEstimateManualQuantityApprovalCandidate(bundle);
  return Boolean(candidate && acknowledgment?.mode === candidate.mode
    && acknowledgment.revisionId === candidate.revisionId && acknowledgment.releaseId === candidate.releaseId
    && acknowledgment.checksumSha256 === candidate.checksumSha256
    && (candidate.basis!=='SAVED_VERSION_REVIEW'||acknowledgment.basis===candidate.basis
      &&acknowledgment.definitionVersionId===candidate.definitionVersionId&&acknowledgment.savedReviewAuditSha256===candidate.savedReviewAuditSha256&&acknowledgment.unknownQuantityCount===0
      &&acknowledgment.acknowledgmentOnly===true&&acknowledgment.pdfReady===false&&acknowledgment.full===false
      &&acknowledgment.paymentAdmission===false&&acknowledgment.procurementAdmission===false)
    && JSON.stringify(acknowledgment.rowIds) === JSON.stringify(candidate.rowIds)
    && JSON.stringify(acknowledgment.sourceParameterIds) === JSON.stringify(candidate.sourceParameterIds)
    && JSON.stringify(acknowledgment.unresolvedQuantityRowIds ?? []) === JSON.stringify(candidate.unresolvedQuantityRowIds ?? []));
}

/** Mode-aware wording never claims all quantities are entered for a null snapshot. */
export function consumerEstimateManualApprovalStatusRu(bundle: ConsumerRepairDraftBundle | null | undefined): string | null {
 const record=consumerEstimateManualQuantityApprovalRecord(bundle);
 return record?.mode==='MANUAL_PRELIMINARY' ? 'Подтверждена вручную как предварительная'
  : record ? 'Подтверждена с ручными количествами' : null;
}
