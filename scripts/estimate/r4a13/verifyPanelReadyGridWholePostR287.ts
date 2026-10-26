import assert from 'node:assert/strict';
import fixture from '../../../data/estimate-benchmarks/fixtures/panel-ready-grid-whole-post-independent-r287.json';
import {panelReadyGridWholePackR287 as pack,panelReadyGridWholeRowR287 as rid} from './ownedDomain/panelReadyGridWholePostR287';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {master32PanelToolCompletenessR1} from '../../../src/lib/estimate/v4/master32PanelToolProvisionR1';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimateCompileCoreResult} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateOperationReferences} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {buildCanonicalRevisionCommitPayload} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds,canonicalArtifactMoney,escapeCanonicalArtifactHtml,canonicalArtifactVisibleRowTitle} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
export type PanelReadyGridVerificationR287=Readonly<{parent:AutomaticOwnerDefinition;model:AutomaticOwnerDefinition;
  onCoreCall?:(ordinal:number,id:string)=>void;onOutcome?:(name:string,value:unknown)=>void}>;
const expectedPublicNamesR287:Readonly<Record<string,string>>={"measured-panels":"Светильники","whole-labour":"Труд монтажа светильников","mount-included":"Установка панели в потолочную решётку","connection-included":"Подключение светильника","readiness-included":"Подготовка монтажного участка","qa-included":"Проверка подключения","completion-included":"Уборка монтажного участка","delivery":"Доставка комплектов","waste":"Вывоз упаковки"};
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
export function panelReadyGridCompletenessR287(){
  const base=master32PanelToolCompletenessR1(pack.catalogId);
  return {...base,contract:'rik-expo-app.s26-3.independent-completeness-map.v1',generatedFromCurrentRows:false,
    fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,
    entries:[...base.entries,...fixture.newRows.map(row=>({expectedResourceId:'panel-ready-grid-project:'+row.suffix,
      operationId:rid(row.requiredOperationIds[0]!),requiredOperationIds:row.requiredOperationIds.map(rid),
      category:['delivery','waste'].includes(row.suffix)?'service':'work',unitId:row.unitId,sourceId:pack.sourceId,
      condition:pack.methodRu+'; '+pack.qualificationRu,specification:row.suffix,
      quantityRule:row.suffix==='whole-labour'?'ACTUAL_TOTAL_PROJECT_HOURS_NO_PRODUCTIVITY_NORM':row.suffix==='qa-included'?'ACTUAL_ACCEPTED_QA_PROGRAM_COUNT':
        ['delivery','waste'].includes(row.suffix)?'ACTUAL_EXTERNAL_TRIPS_NO_AREA_OR_FIXTURE_CONVERSION':'EXPLICIT_QUALIFIED_COUNT_OR_SINGLE_POST_NO_PURCHASE_NORM',
      formulaId:rid('formula:'+row.suffix),resolution:row.parentCostOwnerSuffix===null?{kind:'ROW',rowId:rid(row.suffix)}:
        {kind:'INCLUDED_COMPONENT_ROW',rowId:rid(row.suffix),parentRowId:rid(row.parentCostOwnerSuffix)}}))]};
}
export function verifyPanelReadyGridPureR287(parent:AutomaticOwnerDefinition,model:AutomaticOwnerDefinition):void{
  assert.deepEqual([parent.parameters.length,parent.formulas.length,parent.resources.length],[30,112,112]);
  assert.deepEqual([model.parameters.length,model.formulas.length,model.resources.length],fixture.expectedShape);
  assert.deepEqual(model.parameters.slice(0,30),parent.parameters,'ALL_ACTUAL_V5_PARAMETER_DEFINITIONS_CONSTRAINTS_DEFAULTS_UNCHANGED');
  assert.deepEqual(model.formulas.slice(0,112),parent.formulas,'ALL_ACTUAL_V5_FORMULAS_UNCHANGED');
  const changed=new Set(fixture.conditionalOldNeedReplacements),active=model.resources.find(row=>row.row_id===rid('whole-labour'))?.inclusion_ast;assert(active);
  const legacy=fixture.legacyInput,current=fixture.independentTestInputs;
  for(const row of parent.resources){const next=model.resources.find(value=>value.row_id===row.row_id);assert(next);
    if(!changed.has(row.row_id)){assert.deepEqual(next,row,'OTHER_107_RETAINED_ROWS_BYTE_VALUE_EXACT');continue;}
    const {inclusion_ast:oldInclusion,row_sha256:_oldHash,...oldBody}=row,{inclusion_ast:newInclusion,row_sha256:_newHash,...newBody}=next;
    assert.deepEqual(newBody,oldBody,'EXACT_OLD_NEED_OWNER_SOURCE_FORMULA_PAID_PROC');
    assert.deepEqual(newInclusion,{kind:'and',operands:[oldInclusion,{kind:'not',operand:active}]});
    assert.deepEqual(resolveInclusionGraph(newInclusion,legacy),resolveInclusionGraph(oldInclusion,legacy));
    assert.equal(resolveInclusionGraph(newInclusion,current).value,false,'ONLY_FIVE_EXPLICIT_PROJECT_OPERATIONS_CONDITIONALLY_REPLACED');
  }
  const added=model.resources.slice(112);assert.equal(added.length,9);
  assert.deepEqual(added.filter(row=>row.resource_graph.costTreatment==='OWN_COST').map(row=>row.row_id),fixture.newPaidOwnerSuffixes.map(rid));
  assert.deepEqual(added.filter(row=>row.procurement_eligible).map(row=>row.row_id),fixture.newProcurementOwnerSuffixes.map(rid));
  for(const expected of fixture.newRows){const row=added.find(value=>value.row_id===rid(expected.suffix));assert(row);
    assert.equal(row.unit_id,expected.unitId);assert.equal(row.resource_graph.costTreatment,expected.costTreatment);assert.equal(row.procurement_eligible,expected.procurementEligible);
    assert.deepEqual(canonicalEstimateOperationReferences(row.resource_graph.operationCompositionV1).map(op=>op.operationId),expected.requiredOperationIds.map(rid));
    if(expected.parentCostOwnerSuffix!==null){assert.equal(row.resource_graph.parentCostOwnerId,rid(expected.parentCostOwnerSuffix));assert.equal(row.resource_graph.includedInResourceOwnerRowId,rid(expected.parentCostOwnerSuffix));}
    assert.equal(resolveInclusionGraph(row.inclusion_ast,legacy).value,false);
  }
  for(const id of [pack.retainedFactory.ownerRowId,pack.retainedToolPost.ownerRowId,...fixture.protectedOldNeedIds]){
    assert.deepEqual(model.resources.find(row=>row.row_id===id),parent.resources.find(row=>row.row_id===id),'EXISTING_FACTORY_TOOL_PROVISION_AND_17_PROTECTED_NEEDS_UNCHANGED');}
  for(const p of model.parameters.slice(30)){assert.equal(p.default_value,null);assert.equal(p.truth_metadata.value_source_role,'PROJECT_SPECIFIC_INPUT');
    assert.equal(p.truth_metadata.projectAuthenticated,false);const provenance=p.truth_metadata.provenance;assert(record(provenance));assert.equal(provenance.consumer_input_role_v1,'OBJECT_FACT');}
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:panelReadyGridCompletenessR287(),formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
  assert.equal(pack.sourceNormHoursAuthored,false);assert.equal(pack.sourceConnectorCountAuthored,false);assert.equal(pack.projectAuthenticated,false);assert.equal(pack.full,false);
}
/** Native v5 retains 63 definitions; its pre-existing false row is not an active resource. */
export function verifyPanelReadyGridLegacyIdentitiesR287(resources:readonly Readonly<{row_id:string;inclusion_ast:Record<string,unknown>}>[],
  rows:readonly Readonly<{row_id:string}>[],needs:readonly Readonly<{row_id:string}>[]):void{
  const stem='electrical_interior_lighting_install_technical_room_',blocked=stem+'materials_41';
  const legacy=resources.filter(row=>row.row_id.startsWith(stem));
  assert.equal(legacy.length,fixture.legacyExpectedResourceCount,'ALL_63_NATIVE_LEGACY_DEFINITIONS_RETAINED');
  assert.equal(legacy.length,63);assert.equal(new Set(legacy.map(row=>row.row_id)).size,63,'UNIQUE_NATIVE_LEGACY_DEFINITION_IDS');
  const disabled=legacy.find(row=>row.row_id===blocked);assert(disabled,'EXACT_NATIVE_DISABLED_ROW_RETAINED');
  assert.deepEqual(disabled.inclusion_ast,{kind:'and',operands:[{kind:'literal',value:false},
    {kind:'equals',value:fixture.legacyInput.m30_material_technology,parameterId:'m30_material_technology'}]},'NATIVE_DISABLED_AST_REMAINS_UNCHANGED');
  const resolved=legacy.map(row=>({id:row.row_id,resolution:resolveInclusionGraph(row.inclusion_ast,fixture.legacyInput)}));
  assert(resolved.every(row=>row.resolution.value!==null&&row.resolution.missingParameterIds.length===0),'NO_UNKNOWN_NATIVE_LEGACY_APPLICABILITY');
  assert.deepEqual(resolved.filter(row=>row.resolution.value===false).map(row=>row.id),[blocked],'ONLY_NATIVE_DISABLED_ROW_EXCLUDED');
  const active=resolved.filter(row=>row.resolution.value===true).map(row=>row.id).sort();assert.equal(active.length,62);
  assert.equal(needs.length,0,'NO_INVENTED_LEGACY_NEEDS');
  assert.equal(rows.length,new Set(rows.map(row=>row.row_id)).size,'UNIQUE_ACTIVE_LEGACY_RESULT_IDS');
  assert.deepEqual(rows.map(row=>row.row_id).sort(),active,'EXACT_62_ACTIVE_NATIVE_LEGACY_IDENTITIES_NO_MISSING_OR_EXTRA');
}
function saved(result:CanonicalEstimateCompileCoreResult,input:Record<string,unknown>){
  const checksum=hash(result.revisionProjection),payload=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,
    checksumSha256:checksum,compilerVersion:pack.contract,parameters:result.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,
    parentRevisionId:null,identityContract:{fixture:'TEST_ONLY_NOT_SAVED'},derivedParameters:result.derivedParameters,preliminaryNeeds:result.preliminaryNeeds,
    purchaseSupplyIndexV1:result.purchaseSupplyIndexV1,compositionSelectionV1:result.compositionSelectionV1});
  return{id:'TEST_ONLY_PANEL_PROJECT_POST',release_id:'TEST_ONLY_NOT_SAVED',catalog_id:pack.catalogId,checksum_sha256:checksum,row_count:result.rows.length,currency_code:'KGS',
    input_parameters:result.parameters,amendment_contract:{...payload,rowOverrides:{}}};
}
type Entry=Readonly<{id:string;mode?:string;input?:Readonly<Record<string,unknown>>;remove?:readonly string[];expectedTotal?:string;rejectCode?:string;
  expectedNeedSuffix?:string;expectedNeedQuantity?:string|null;expectedNeedState?:string}>;
export async function verifyPanelReadyGridWholePostR287(context:PanelReadyGridVerificationR287){
  const {parent,model}=context;verifyPanelReadyGridPureR287(parent,model);let attempted=0,completed=0,results=0,rejects=0;
  const entries:readonly Entry[]=fixture.entries;
  const prices:NonNullable<CanonicalEstimateCompileCoreInput['priceItems']>=Object.entries(fixture.explicitTestOnlyPrices).map(([row_id,unit_price])=>{
    const row=model.resources.find(resource=>resource.row_id===row_id);assert(row,'EXACT_TEST_PRICE_RESOURCE');
    return{price_key:row_id,unit_id:row.unit_id,currency_code:'KGS',unit_price,snapshot_id:'TEST_ONLY_NOT_A_QUOTE'};});
  const payable=new Set([pack.retainedFactory.ownerRowId,pack.retainedToolPost.ownerRowId,...fixture.newPaidOwnerSuffixes.map(rid)]),procurement=new Set([pack.retainedFactory.ownerRowId,...fixture.newProcurementOwnerSuffixes.map(rid)]);
  for(const entry of entries){const input:Record<string,unknown>=entry.mode==='legacy'?{...fixture.legacyInput}:entry.mode==='retained'?{
      [pack.retainedFactory.selectorId]:pack.retainedFactory.choiceRu,[pack.countParameterId]:'3',
      [pack.retainedToolPost.methodId]:pack.retainedToolPost.methodRu,[pack.retainedToolPost.fitId]:pack.retainedToolPost.fitRu}:
      {...fixture.independentTestInputs,...entry.input};
    if(entry.mode==='zero')input[pack.countParameterId]='0';for(const key of entry.remove??[])delete input[key];
    const invoke=async()=>{attempted++;context.onCoreCall?.(attempted,entry.id);let value:CanonicalEstimateCompileCoreResult;
      try{value=await compileCanonicalEstimateCore({operation:'compile',catalogId:pack.catalogId,compilerVersion:pack.contract,
        primaryMeasureParameterId:entry.mode==='legacy'?'q':pack.countParameterId,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
        submittedParameters:input,confirmedParameters:{},priceItems:prices,currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:async value=>hash(value)});
      }catch(error){completed++;context.onOutcome?.('actual-core-'+entry.id,{kind:'REJECT',code:record(error)?error.code:null,message:error instanceof Error?error.message:String(error)});throw error;}
      completed++;context.onOutcome?.('actual-core-'+entry.id,{kind:'RESULT',value});return value;};
    if(entry.rejectCode){await assert.rejects(invoke,error=>record(error)&&error.code===entry.rejectCode);rejects++;continue;}
    const result=await invoke();results++;
    if(entry.mode==='legacy'||entry.mode==='retained'||entry.mode==='zero'){
      assert.equal([...result.rows,...result.preliminaryNeeds].some(row=>row.row_id.startsWith(pack.prefix+':')),false,'UNSELECTED_OR_ZERO_NEW_WHOLE_POST_NOT_ADDED');
      const oldIds=new Set(parent.resources.map(row=>row.row_id));
      assert([...result.rows,...result.preliminaryNeeds].every(row=>oldIds.has(row.row_id)),'ONLY_EXACT_RETAINED_IDENTITIES_NO_EXTRA_HIDDEN_CORE_CALLS');
      if(entry.mode==='legacy'){verifyPanelReadyGridLegacyIdentitiesR287(parent.resources,result.rows,result.preliminaryNeeds);
        assert.equal([...result.rows,...result.preliminaryNeeds].some(row=>row.row_id===pack.retainedFactory.ownerRowId||row.row_id===pack.retainedToolPost.ownerRowId),false);}
      if(entry.mode==='retained'){assert.equal(result.rows.find(row=>row.row_id===pack.retainedFactory.ownerRowId)?.quantity,'3');
        assert.equal(result.rows.find(row=>row.row_id===pack.retainedToolPost.ownerRowId)?.quantity,'1');assert.equal(result.totals.amount,'3200');
        for(const id of [...fixture.conditionalOldNeedReplacements,...fixture.protectedOldNeedIds])assert(result.preliminaryNeeds.some(row=>row.row_id===id),'RETAINED_CURRENT_22_NEEDS');}
      continue;
    }
    for(const row of result.rows){if(!payable.has(row.row_id))assert.equal(row.included_in_estimate,false,'NO_EXTRA_PAID_OWNER');if(!procurement.has(row.row_id))assert.equal(row.included_in_procurement,false,'NO_EXTRA_PROCUREMENT_OWNER');}
    for(const id of fixture.protectedOldNeedIds){const need=result.preliminaryNeeds.find(row=>row.row_id===id);assert(need,'EXACT_PROTECTED_NEED_REMAINS:'+id);assert.equal(Object.hasOwn(need,'amount'),false);}
    for(const id of fixture.conditionalOldNeedReplacements)assert.equal([...result.rows,...result.preliminaryNeeds].some(row=>row.row_id===id),false,'ONLY_EXPLICITLY_REPLACED_OLD_OPERATION_NEED_SUPPRESSED');
    if(entry.mode==='missing'){
      assert(entry.expectedNeedSuffix);const id=rid(entry.expectedNeedSuffix),need=result.preliminaryNeeds.find(row=>row.row_id===id);assert(need);
      assert.equal(result.rows.some(row=>row.row_id===id),false);assert.equal(need.quantity,entry.expectedNeedQuantity);assert.equal(need.need_state,entry.expectedNeedState);
      assert.equal(need.unit_price,null);assert.equal(Object.hasOwn(need,'amount'),false);assert.deepEqual(need.missing_parameter_ids,[...(entry.remove??[])]);
      const artifact=canonicalArtifactPreliminaryNeeds(saved(result,input)).find(row=>row.row_id===id);assert(artifact);assert.equal(artifact.quantity,entry.expectedNeedQuantity);
      assert.equal(artifact.amount,null);assert.equal(artifact.included_in_estimate,false);assert.equal(artifact.included_in_procurement,false);continue;
    }
    assert.equal(result.totals.amount,entry.expectedTotal);
    for(const [id,quantity]of Object.entries(fixture.expectedQualifiedQuantities)){
      const row=result.rows.find(value=>value.row_id===id);assert(row,'EXACT_KNOWN_QUALIFIED_ROW:'+id);assert.equal(row.quantity,quantity);}
    assert.equal(result.rows.find(row=>row.row_id===pack.retainedFactory.ownerRowId)?.amount,'3000');
    assert.equal(result.rows.find(row=>row.row_id===pack.retainedToolPost.ownerRowId)?.amount,'200','RETAINED_TOOL_PROVISION_NOT_SILENTLY_UNPAID');
    assert.equal(result.rows.find(row=>row.row_id===rid('whole-labour'))?.amount,'2000');
    assert.equal(result.rows.find(row=>row.row_id===rid('delivery'))?.amount,'100');
    assert.equal(result.rows.find(row=>row.row_id===rid('waste'))?.amount,'0');
    if(entry.mode==='public-money'){
      const raw=JSON.stringify(result),revision=saved(result,input);context.onOutcome?.('saved-revision-before-public-assert',{revision});
      const projection=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows,preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:'Монтаж внутреннего освещения'});
      assertCanonicalProfessionalPdfMoneyCells(projection.html);assert.equal(JSON.stringify(result),raw,'PUBLIC_PROJECTION_MUST_NOT_MUTATE_CORE');
      const actualPublicNames:Record<string,string>={};
      for(const[suffix,expected]of Object.entries(expectedPublicNamesR287)){const row=result.rows.find(value=>value.row_id===rid(suffix));assert(row,'EXACT_NEW_PUBLIC_ROW');
        const title=canonicalArtifactVisibleRowTitle(row,result.parameters);assert.equal(title,expected,'SHARED_ARTIFACT_PUBLIC_FALLBACK_NAME');
        assert.doesNotMatch(title,/(?:включено|общий труд|по ППР|фактическому ППР)/iu,'NO_SERVICE_PROSE_IN_PUBLIC_ROW_NAME');actualPublicNames[row.row_id]=title;}
      context.onOutcome?.('shared-public-functional-row-names',{status:'PASS_TEST_ONLY_EXISTING_PUBLIC_PROJECTOR',names:actualPublicNames,additionalCoreCalls:0});
      const informational=result.rows.find(row=>row.row_id===rid('measured-panels'));assert(informational);assert.equal(informational.amount,'33');assert.equal(informational.unit_price,'11');assert.equal(informational.included_in_estimate,false);assert.equal(informational.included_in_procurement,false);
      const trs=[...projection.html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gu)].map(match=>match[0]).filter(tr=>tr.includes(escapeCanonicalArtifactHtml(String(informational.title_ru))));assert(trs.length>0);
      for(const tr of trs){const cells=[...tr.matchAll(/<td\s+class="money">([\s\S]*?)<\/td>/gu)].map(match=>match[1]);
        assert.deepEqual(cells,[escapeCanonicalArtifactHtml(canonicalArtifactMoney('11','KGS')),'']);}
      context.onOutcome?.('shared-pdf-public-money-and-raw-immutability',{status:'PASS_TEST_ONLY',rawInformationalAmount:'33',price:'11',publicAmount:'',total:'5300'});
    }
  }
  assert.equal(attempted,13);assert.equal(completed,13);assert.equal(results,9);assert.equal(rejects,4);
  return{entries:13,actualCoreCalls:attempted,results,rejects,full:false,ready:false,newPublicCatalogs:0,protectedNeedIds:[...fixture.protectedOldNeedIds],sourceAuthority:false,projectAuthentication:false,priceNonoverlap:false};
}
