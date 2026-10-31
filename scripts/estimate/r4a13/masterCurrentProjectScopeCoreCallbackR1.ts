// SOURCE_ONLY ROOT review: a caller proof over the existing compiler, not a
// publisher, fact reader, source admission or another calculation engine.
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult}
  from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalApprovedBaselineRuntimeParameters,canonicalApprovedBaselineRuntimeDefaultValue}
  from '../../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {canonicalScopeRequirementDecisionV1,canonicalScopeRequirementDecisionIsOpenV1}
  from '../../../src/lib/estimate/backendPlatform/canonicalScopeRequirementV1';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionDefinitionR1';
import {prepareMasterRetainedBindingRepresentativeR1,masterProjectScopeMetadataCompactR1,
  type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';

type Json=Record<string,unknown>;
type Definitions=Readonly<{captured:AutomaticOwnerDefinition;candidate:AutomaticOwnerDefinition}>;
const stable=canonicalEstimateStableJson;
const hash=(value:unknown):string=>canonicalEstimateSha256HexText(stable(value));
const object=(value:unknown):Json|null=>value!=null&&typeof value==='object'&&!Array.isArray(value)?value as Json:null;
function check(value:unknown,code:string):asserts value {
  if(!value)throw Error('ROOT_CURRENT_SCOPE_CORE_'+code);
}
const ids=(result:CanonicalEstimateCompileCoreResult)=>[...result.rows,...result.preliminaryNeeds].map(row=>row.row_id);
const ordered=(value:readonly string[])=>[...value].sort();
const rowMoney=(row:CanonicalEstimateCompileCoreResult['rows'][number]|CanonicalEstimateCompileCoreResult['preliminaryNeeds'][number])=>({
  rowId:row.row_id,resourceSpecId:row.resource_spec_id,unitId:row.unit_id,quantity:row.quantity,
  unitPrice:row.unit_price,amount:row.amount??null,currencyCode:row.currency_code??null,
  priceSnapshotId:row.price_snapshot_id??null,procurementEligible:row.procurement_eligible});
const byId=<T extends {rowId:string}>(rows:readonly T[])=>[...rows].sort((a,b)=>a.rowId.localeCompare(b.rowId));

/** Bind this one callback to the existing cfg433 verifyCurrentScopeCore slot.
 * It accepts source-owned native/candidate definitions from that slot only.
 * The native baseline is an immutable diagnostic input, never object evidence.
 * Publisher pointer/normal+locked source/DB preflights remain downstream. */
export function createMasterCurrentProjectScopeCoreCallbackR1(input:Readonly<{
  guardInput:MasterRetainedBindingGuardInputR1;compilerVersion:string;currencyCode:string;
}>):(value:Definitions)=>Promise<Json> {
  return async({captured,candidate})=>{
    const retained=input.guardInput.config.binding.retainParentBindings,mode=retained?.projectScopeMetadataOnlyV1;
    check(retained&&mode,'EXPLICIT_REGISTERED_SCOPE_MODE_REQUIRED');
    const c=retained.capturedParent,baseline=object(c.baseline.input_values);
    check(baseline&&input.compilerVersion.trim()&&input.currencyCode.trim(),'BASELINE_AND_COMPILER_CONTEXT_REQUIRED');
    check(stable([captured.parameters,captured.formulas,captured.resources])===stable([c.parameters,c.formulas,c.resources]),
      'NATIVE_DEFINITION_CAPTURE_MISMATCH');
    const frozen=hash({guardInput:input.guardInput,captured,candidate});
    // Reuse the actual pure retained preflight: exact registered capture,
    // mode/schema/graph hashes, all native numeric/source/owner semantics.
    prepareMasterRetainedBindingRepresentativeR1(input.guardInput,{
      parameters:[...candidate.parameters],formulas:[...candidate.formulas],resources:[...candidate.resources],newBindings:[],
      successorProvenance:{parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,
        capturedParentSha256:retained.capturedParentSha256,projectScopeMetadataOnlyV1:masterProjectScopeMetadataCompactR1(retained)}});
    const defaults=canonicalApprovedBaselineRuntimeParameters(c.baseline);
    for(const id of mode.newProjectParameterIds)check(!Object.hasOwn(baseline,id)&&!Object.hasOwn(defaults,id)
      &&canonicalApprovedBaselineRuntimeDefaultValue(c.baseline,id)===null,'OBJECT_FACT_DEFAULT_OR_BASELINE_VALUE');
    const compile=(definition:AutomaticOwnerDefinition)=>compileCanonicalEstimateCore({
      operation:'recalculate',compilerVersion:input.compilerVersion,catalogId:input.guardInput.config.catalogId,
      primaryMeasureParameterId:c.definition.applicability.primaryMeasureParameterId,
      parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],
      submittedParameters:{...baseline},confirmedParameters:{},priceItems:[],currencyCode:input.currencyCode,
      maximumResourceRows:definition.resources.length,hashJson:hash});
    // Sequential calls keep one real compiler invocation live at a time.
    const before=await compile(captured),after=await compile(candidate);
    check(hash({guardInput:input.guardInput,captured,candidate})===frozen,'SOURCE_INPUT_MUTATED');
    check(stable(before.parameters)===stable(after.parameters)&&stable(before.derivedParameters)===stable(after.derivedParameters),
      'NATIVE_EFFECTIVE_PARAMETERS_CHANGED');
    for(const id of mode.newProjectParameterIds)check(!Object.hasOwn(before.parameters,id)&&!Object.hasOwn(after.parameters,id),
      'MISSING_OBJECT_FACT_PROMOTED');
    const beforeIds=ids(before),afterIds=ids(after);
    check(new Set(beforeIds).size===beforeIds.length&&new Set(afterIds).size===afterIds.length
      &&stable(ordered(beforeIds))===stable(ordered(afterIds)),'ACTIVE_NATIVE_IDS_CHANGED');
    const active=new Set(afterIds),inactive=c.resources.filter(row=>!active.has(row.row_id));
    for(const row of inactive)check(resolveInclusionGraph(row.inclusion_ast,before.parameters).value===false
      &&resolveInclusionGraph(row.inclusion_ast,after.parameters).value===false,'INACTIVE_NATIVE_INCLUSION_CHANGED');
    const accounted=[...afterIds,...inactive.map(row=>String(row.row_id))];
    check(new Set(accounted).size===c.resources.length&&stable(ordered(accounted))===stable(ordered(c.resources.map(row=>String(row.row_id)))),
      'NATIVE_ROW_LEDGER_INCOMPLETE');
    check(stable(byId([...before.rows,...before.preliminaryNeeds].map(rowMoney)))
      ===stable(byId([...after.rows,...after.preliminaryNeeds].map(rowMoney))),'NATIVE_QUANTITY_OR_MONEY_CHANGED');
    const payable=(r:CanonicalEstimateCompileCoreResult)=>byId(r.rows.filter(row=>row.included_in_estimate).map(rowMoney));
    const procurement=(r:CanonicalEstimateCompileCoreResult)=>byId(r.rows.filter(row=>row.included_in_procurement).map(rowMoney));
    check(stable(payable(before))===stable(payable(after))&&stable(procurement(before))===stable(procurement(after)),
      'PAYMENT_OR_PROCUREMENT_OWNERS_CHANGED');
    const {excludedRowCount:beforeExcluded,...beforeMoney}=before.totals,{excludedRowCount:afterExcluded,...afterMoney}=after.totals;
    check(stable(beforeMoney)===stable(afterMoney)
      &&beforeExcluded+before.preliminaryNeeds.length===afterExcluded+after.preliminaryNeeds.length
      &&stable(before.priceSnapshotIds)===stable(after.priceSnapshotIds),'MONEY_TOTAL_OR_NATIVE_DISPOSITION_CHANGED');
    const decisionId=mode.newProjectParameterIds[mode.newProjectParameterIds.length-1];
    const carriers=candidate.resources.filter(row=>object(row.resource_graph.scopeRequirementV1)?.objectFactParameterId===decisionId);
    check(carriers.length===1,'ONE_EXISTING_SCOPE_CARRIER_REQUIRED');
    const carrier=carriers[0]!,needs=after.preliminaryNeeds.filter(need=>need.row_id===carrier.row_id);
    check(needs.length===1&&!after.rows.some(row=>row.row_id===carrier.row_id),'OPEN_SCOPE_SAME_NATIVE_NEED_REQUIRED');
    const need=needs[0]!,graph=object(object(need.calculation_trace)?.resourceGraph);
    const decision=canonicalScopeRequirementDecisionV1(graph?.scopeRequirementDecisionV1);
    check(graph?.costTreatment==='INFORMATIONAL_SCOPE'&&decision&&decision.kind==='OBJECT_SCOPE'
      &&decision.rowId===carrier.row_id&&decision.status==='OBJECT_FACT_REQUIRED'&&canonicalScopeRequirementDecisionIsOpenV1(decision)
      &&decision.missingObjectFactParameterIds.length>0&&decision.missingObjectFactParameterIds.every(id=>mode.newProjectParameterIds.includes(id))
      &&decision.numericNormAccepted===false&&decision.separatePaymentAccepted===false
      &&need.need_state==='CONDITION_REQUIRED'&&need.selected===false&&need.procurement_eligible===false,'REAL_OBJECT_SCOPE_MUST_STAY_OPEN');
    return {contract:'root-existing-current-project-scope-core-proof/r1',proofScope:'SOURCE_METADATA_DIAGNOSTIC_BASELINE_ONLY',
      catalogId:input.guardInput.config.catalogId,capturedParentSha256:retained.capturedParentSha256,
      baselineInputSha256:hash(baseline),beforeProjectionSha256:hash(before.revisionProjection),afterProjectionSha256:hash(after.revisionProjection),
      nativeResourceCount:c.resources.length,activeNativeIds:ordered(afterIds),
      inactiveNativeIds:ordered(inactive.map(row=>String(row.row_id))),inactiveReason:'EXISTING_INCLUSION_FALSE',
      absentProjectParameterIds:[...mode.newProjectParameterIds],scopeCarrierRowId:carrier.row_id,
      scopeStatus:decision.status,actualScopeMissingParameterIds:[...decision.missingObjectFactParameterIds],
      nativeQuantitiesUnchanged:true,nativePaymentAndProcurementOwnersUnchanged:true,diagnosticMoneyUnchanged:true,
      priceEvidence:'NONE_INTRODUCED_UNKNOWN_PRICES_REMAIN_NULL',newRows:0,newPaidOwners:0,
      sourceAdmission:false,engineeringAcceptance:false,documentContentsAuthenticated:false,actualProjectReadback:false,FULL:false};
  };
}
