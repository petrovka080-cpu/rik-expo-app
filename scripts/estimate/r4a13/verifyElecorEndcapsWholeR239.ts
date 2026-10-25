import assert from 'node:assert/strict';
import independent from '../../../data/estimate-benchmarks/fixtures/elecor-endcaps-whole-independent-r239.json';
import {elecorEndcapPackR239 as pack,elecorEndcapOwnerR239 as owner,elecorEndcapRowIdR239 as rid,
  elecorProjectEndcapsDefinitionR239 as definition,elecorProjectEndcapsControlInputR239 as control} from '../../../src/lib/estimate/v4/elecorProjectEndcapsCompletionR239';
import {elecorMechanicalProjectFixingsDefinitionR1} from '../../../src/lib/estimate/v4/elecorMechanicalProjectFixingsCompletionR1';
import type {AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimateCompileCoreResult} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactPreliminaryNeeds} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {buildCanonicalRevisionCommitPayload} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';

type Entry=Readonly<{id:string;mode?:string;input?:Readonly<Record<string,unknown>>;remove?:readonly string[];
  manualOwner?:Readonly<{quantity:string;unitPrice?:string;titleRu?:string}>;
  legacyNeedManual?:Readonly<{quantity:string;unitPrice?:string}>;
  rejectCode?:string;expected?:Readonly<Record<string,string|number|boolean|null|undefined>>}>;
export type ElecorEndcapVerificationContextR239=Readonly<{model?:AutomaticOwnerDefinition;parent?:AutomaticOwnerDefinition;onCoreCall?:(count:number,name:string)=>void;
  onOutcome?:(name:string,value:unknown)=>void}>;
function record(value:unknown):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function hasCode(error:unknown,expected:string){return record(error)&&error.code===expected;}
const shared=['installation-labour','tools','access-protection','acceptance','delivery-handling','cleanup-disposal']
  .map(key=>'electrical:elecor-60x40-single-route:open-'+key);

export async function verifyElecorEndcapsWholeR239(context:ElecorEndcapVerificationContextR239={}){
  const parent=context.parent??elecorMechanicalProjectFixingsDefinitionR1(),model=context.model??definition(parent);
  assert.deepEqual([model.parameters.length,model.formulas.length,model.resources.length],[48,40,40]);
  assert.deepEqual(model.parameters.slice(0,39),parent.parameters);
  assert.deepEqual(model.formulas.slice(0,32),parent.formulas);
  for(const old of parent.resources){
    const after=model.resources.find(r=>r.row_id===old.row_id);assert(after);
    assert.equal(after.unit_id,old.unit_id);assert.equal(after.formula_id,old.formula_id);
    assert.equal(after.cost_owner_id,old.cost_owner_id);assert.equal(after.procurement_eligible,old.procurement_eligible);
    if(old.row_id!==pack.existingNeedRowId&&!shared.includes(old.row_id))assert.deepEqual(after,old);
    if(shared.includes(old.row_id)){
      const references=canonicalEstimateOperationReferences(after.resource_graph.operationCompositionV1);
      assert.equal(references.filter(ref=>ref.operationId==='accepted-end-cap-material').length,1);
    }
  }
  const addedParameters=model.parameters.slice(39);
  assert.equal(addedParameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').length,8);
  assert.equal(addedParameters.filter(p=>p.truth_metadata.visibility_role==='INTERNAL_ONLY').length,1);
  assert(addedParameters.every(p=>p.default_value===null),'NO_FAKE_PROJECT_OR_INVENTORY_DEFAULTS');
  assert(addedParameters.every(p=>!p.parameter_id.includes('factory_piece_count')),'SOURCE_SET4_IS_READBACK_NOT_CONSUMER_QUESTION');
  for(const p of addedParameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT')){
    assert.equal(p.truth_metadata.value_source_role,'PROJECT_SPECIFIC_INPUT');
    assert(record(p.truth_metadata.provenance));
    assert(['OBJECT_FACT','ADVANCED_OPTION'].includes(String(p.truth_metadata.provenance.consumer_input_role_v1)));
  }
  const added=model.resources.slice(32);
  assert(added.every(r=>!/ELECOR|IEK|CKMP10D/iu.test(r.title_ru)),'FUNCTIONAL_PUBLIC_RESOURCE_NAMES');
  assert(added.every(r=>r.source_metadata?.exactManufacturerArticle==='CKMP10D-Z-060-040-K01'),'PRIVATE_EXACT_ARTICLE_RETAINED');
  for(const r of added){const presentation=r.resource_graph.publicResourcePresentationV1;assert(record(presentation));
    assert.equal(presentation.nameRu,r.title_ru);assert.equal(presentation.brandAndModelRu,'IEK ELECOR КМЗ CKMP10D-Z-060-040-K01');}
  assert.deepEqual(added.filter(r=>r.resource_graph.costTreatment==='OWN_COST').map(r=>r.row_id),[owner]);
  assert.deepEqual(added.filter(r=>r.procurement_eligible).map(r=>r.row_id),[owner]);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:independent.completenessMap,
    formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
  assert.equal(independent.completenessMap.entries.length,20);
  const sections=canonicalEstimateResourceOperationSections(model.resources.map(r=>({rowId:r.row_id,titleRu:r.title_ru,
    operation:r.resource_graph.operationCompositionV1})));
  const end=sections.find(section=>section.operation?.operationId==='accepted-end-cap-material');assert(end);
  for(const id of shared){assert(end.sharedResources.some(ref=>ref.rowId===id));
    assert.equal(sections.filter(section=>section.resourceIds.includes(id)).length,1,'ONE_EXISTING_PHYSICAL_NEED_OWNER');}
  context.onOutcome?.('pure-exact-model-and-independent-map',{shape:[48,40,40],mapEntries:20,sharedExistingOwners:shared,
    oneNewPaidOwner:owner,full:false,currentDbAdmission:'UNRUN'});

  let attempted=0,completed=0,results=0,rejects=0;
  const raw=(r:CanonicalEstimateCompileCoreResult,suffix:string)=>r.rows.find(row=>row.row_id===rid(suffix));
  const fixture:readonly Entry[]=independent.entries;
  for(const entry of fixture){
    const input:Record<string,unknown>={...control(),...entry.input};
    if(entry.mode==='legacy')input[pack.methodParameterId]=pack.unresolvedMethod;
    for(const id of entry.remove??[])delete input[id];
    const provenance={kind:'manual' as const,reason:'TEST_ONLY independent whole-set quantity/price and no legacy transfer'};
    const overrides:CanonicalEstimateCompileCoreInput['rowOverrides']=entry.manualOwner
      ?{[owner]:{...entry.manualOwner,provenance}}
      :entry.legacyNeedManual?{[pack.existingNeedRowId]:{...entry.legacyNeedManual,provenance}}:undefined;
    const invoke=async()=>{
      attempted++;context.onCoreCall?.(attempted,entry.id);
      let value:CanonicalEstimateCompileCoreResult;
      try{
        value=await compileCanonicalEstimateCore({operation:overrides?'recalculate':'compile',catalogId:pack.catalogId,
          compilerVersion:pack.contract,primaryMeasureParameterId:'elecor_route_m',parameterDefinitions:[...model.parameters],
          formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],submittedParameters:input,
          confirmedParameters:{},rowOverrides:overrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:model.resources.length,
          hashJson:async value=>hash(value)});
      }catch(error){
        completed++;context.onOutcome?.('actual-core-'+entry.id,{kind:'REJECT',
          code:record(error)?error.code:null,message:error instanceof Error?error.message:String(error)});throw error;
      }
      completed++;context.onOutcome?.('actual-core-'+entry.id,{kind:'RESULT',value});return value;
    };
    const rejectCode=entry.rejectCode;
    if(rejectCode){await assert.rejects(invoke,err=>hasCode(err,rejectCode));rejects++;continue;}
    const result=await invoke();results++;const expected=entry.expected;assert(expected);
    if(entry.mode==='legacy'){
      assert.equal(result.rows.some(row=>row.row_id===owner),false);
      assert.equal(result.preliminaryNeeds.some(row=>row.row_id===pack.existingNeedRowId),true);
      assert.equal(result.preliminaryNeeds.length,expected.legacyNeeds);continue;
    }
    for(const id of shared)assert(result.preliminaryNeeds.some(row=>row.row_id===id),'PROTECTED_SHARED_NEED:'+id);
    if(expected.newOwnerPreliminary===true){
      assert.equal(result.rows.some(row=>row.row_id===owner),false);
      const need=result.preliminaryNeeds.find(row=>row.row_id===owner);assert(need);
      assert.equal(need.quantity,null);assert.equal(need.amount,null);continue;
    }
    for(const [key,value]of Object.entries(expected)){
      if(['ownerAmount','totalAmount','procurement','procurementReadiness','knownBalanceAllowed'].includes(key))continue;
      assert.equal(raw(result,key)?.quantity,value,'EXACT_COMPLETE4_BALANCE:'+entry.id+':'+key);
    }
    const paid=raw(result,'order');assert(paid);assert.equal(paid.unit_id,'set');
    for(const row of result.rows.filter(row=>row.row_id.startsWith(pack.prefix+':')&&row.row_id!==owner)){
      assert.equal(row.included_in_estimate,false);assert.equal(row.included_in_procurement,false);
    }
    if(expected.knownBalanceAllowed===false){
      assert.equal(paid.amount,null);assert.equal(paid.included_in_procurement,false);
      assert.equal(paid.procurement_readiness,'SUPPLY_CONFIRMATION_REQUIRED');
      for(const key of['remaining-sets','free-sets','consumption-shortage','reserve-deficit']){
        assert.equal(raw(result,key),undefined,'BLOCKED_EFFECTIVE_QUANTITY_IS_NOT_ZERO:'+key);
        const need=result.preliminaryNeeds.find(row=>row.row_id===rid(key));assert(need);assert.equal(need.quantity,null);assert.equal(need.amount,null);
      }
      continue;
    }
    assert.equal(result.preliminaryNeeds.length,6);
    if(Object.hasOwn(expected,'ownerAmount'))assert.equal(paid.amount,expected.ownerAmount);
    if(Object.hasOwn(expected,'totalAmount'))assert.equal(result.totals.amount,expected.totalAmount);
    if(entry.id==='08-manual-whole-order-price'){
      assert.equal(paid.unit_price,'100');assert.equal(paid.title_ru,'Мой комплект заглушек');
      assert.equal(result.rows.filter(row=>row.amount!==null).length,1);
      const before=JSON.stringify(result);assert(overrides);
      const checksum=hash(result.revisionProjection);
      const saved=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,
        checksumSha256:checksum,compilerVersion:pack.contract,parameters:result.parameters,
        approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,
        identityContract:{fixture:'TEST_ONLY_NOT_SAVED'},derivedParameters:result.derivedParameters,
        preliminaryNeeds:result.preliminaryNeeds,purchaseSupplyIndexV1:result.purchaseSupplyIndexV1,
        compositionSelectionV1:result.compositionSelectionV1});
      const revision={id:'TEST_ONLY_ELECOR_ENDCAPS',release_id:'TEST_ONLY_NOT_SAVED',
        catalog_id:pack.catalogId,checksum_sha256:checksum,row_count:result.rows.length,currency_code:'KGS',input_parameters:result.parameters,
        amendment_contract:{...saved,rowOverrides:structuredClone(overrides)}};
      context.onOutcome?.('shared-pdf-saved-revision-before-assert',{revision});
      const projection=buildCanonicalProfessionalPdfProjection({revision,rows:result.rows,
        preliminaryNeeds:canonicalArtifactPreliminaryNeeds(revision),workTitleRu:'Материалы прямого участка кабель-канала 60×40 мм'});
      assertCanonicalProfessionalPdfMoneyCells(projection.html);
      assert.equal(projection.preliminaryNeedCount,6);assert.equal(projection.categoryTotals.material,400);
      assert(projection.html.includes('Мой комплект заглушек'));assert.equal(JSON.stringify(result),before);
      context.onOutcome?.('shared-pdf-public-money-and-raw-immutability',{amount:'400',preliminaryNeeds:6,rawUnchanged:true});
    }
  }
  assert.deepEqual({attempted,completed,results,rejects},{attempted:14,completed:14,results:10,rejects:4});
  return{status:'PASS_SCOPED_ELECOR_COMPLETE_ENDCAP_SET_ONLY',entries:14,actualCoreCalls:attempted,completedCoreCalls:completed,
    results,rejects,shape:[48,40,40],mapEntries:20,newPaidOwners:1,newProcurementOwners:1,
    selectedLegacyNeeds:6,unselectedLegacyNeeds:7,actualProjectAuthenticated:false,full:false,newCatalogs:0};
}
