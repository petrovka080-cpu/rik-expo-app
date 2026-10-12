import {overlayS2765FlatRoofScope as overlay} from '../../../../scripts/estimate/r4a13/s2765FlatRoofScopeOverlay';
import type {PurchaseGroupRepresentative} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import {compileCanonicalEstimateCore,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../estimateDeterministicHash';
import {flatRoofScopePackS2765 as pack} from './flatRoofScopeS2765';
import {canonicalApprovedBaselineRuntimeParameters} from '../backendPlatform/canonicalEstimateApprovedBaseline';
import {canonicalPublisherQuantityScopeIsConsistent} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {canonicalScopeRequirementDecisionV1 as decision,groupCanonicalScopeRequirementsV1} from '../backendPlatform/canonicalScopeRequirementV1';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {projectCanonicalEstimateParameterSessionSnapshot} from '../backendPlatform/canonicalEstimateParameterSessionSnapshot';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateRevisionView,type CanonicalEstimateCatalogItem} from '../backendPlatform/contracts';
import {canonicalEstimateRevisionRowFromStorage} from '../backendPlatform/canonicalEstimateRevisionReadMapper';
import {adaptCanonicalRevisionToStructuredEstimate} from '../backendPlatform/canonicalEstimateForemanAdapter';
import {buildStructuredEstimateRequestDraft} from '../../estimateStructuredPipeline/structuredEstimateRequestBinding';
import {buildRequestEstimateViewModel} from '../../../features/consumerRepair/requestEstimateViewModel';
import {buildCanonicalProfessionalPdfProjection} from '../backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactPreliminaryNeeds,type CanonicalArtifactRow} from '../backendPlatform/canonicalEstimateArtifactContract';
import {foundationDraftWithManualCatalogItem} from '../../../../tests/requestEstimate/requestEstimateBoqCatalogTestHelpers';
const fixture=require('../../../../data/estimate-benchmarks/fixtures/flat-roof-scope-parents-s27-65.json') as {sourceSnapshotSha256:string;reps:PurchaseGroupRepresentative[]};
const facts={q:'37.5',[pack.systemParameterId]:pack.systemYesRu,[pack.conditionsParameterId]:pack.conditionsYesRu,[pack.areaParameterId]:pack.areaYesRu};
const locators={roof:'CONTROL_ROOF',guidance:'CONTROL_GUIDANCE'},prefix=pack.prefix;
const compile=(r:PurchaseGroupRepresentative,input:Record<string,unknown>,extra:Partial<Parameters<typeof compileCanonicalEstimateCore>[0]>={})=>compileCanonicalEstimateCore({operation:'recalculate',catalogId:String(r.definition.catalog_id),compilerVersion:pack.contract,parameterDefinitions:r.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:r.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:r.resources as CanonicalEstimateResourceDefinition[],submittedParameters:input,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:r.resources.length,hashJson:async v=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex'),...extra});
const scope=(n:Record<string,unknown>)=>decision((n.calculation_trace as {resourceGraph:Record<string,unknown>}).resourceGraph.scopeRequirementDecisionV1)!;

test('forward-only scope successor preserves all256 owner identities and formulas, four fact inputs and PARTIAL status',()=>{
  expect(fixture.sourceSnapshotSha256).toBe(pack.parentSnapshotSha256);
  for(const parent of fixture.reps){const saved=JSON.stringify(parent),r=overlay(parent,locators).representative;
    expect(JSON.stringify(parent)).toBe(saved);expect(r.formulas).toEqual(parent.formulas);
    expect(r.resources.map(row=>[row.id,row.row_id,row.cost_owner_id,row.formula_id,row.unit_id])).toEqual(parent.resources.map(row=>[row.id,row.row_id,row.cost_owner_id,row.formula_id,row.unit_id]));
    expect(r.bindings).toHaveLength(parent.bindings.length);expect(new Set(r.bindings.map(b=>b.row_id)).size).toBe(r.bindings.length);
    expect(r.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id)).toEqual(['q',pack.systemParameterId,pack.conditionsParameterId,pack.areaParameterId]);
    expect(canonicalApprovedBaselineRuntimeParameters(r.baseline)).toEqual({});expect(canonicalPublisherQuantityScopeIsConsistent(r)).toBe(true);
    expect(r.passport.decision).toMatchObject({quantityScope:'PARTIAL',newNumericNormClosures:0,completeTechnicalEstimateAccepted:false});
    expect(r.parameters.filter(p=>p.parameter_id.startsWith('roof_open_')).every(p=>p.default_value===null&&p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM')).toBe(true);
  }
});
test.each(fixture.reps.map(r=>[String(r.definition.catalog_id),r] as const))('included stock/lifting, inapplicable wood, completed primer and process differ from conditional details: %s',async(_id,parent)=>{
  const r=overlay(parent,locators).representative,result=await compile(r,facts);
  expect(result.rows.filter(row=>row.included_in_estimate)).toHaveLength(8);expect(result.rows).toHaveLength(9);expect(result.preliminaryNeeds).toHaveLength(59);
  const bySuffix=(suffix:string)=>scope(result.preliminaryNeeds.find(n=>n.row_id===prefix+':remaining:'+suffix)!);
  for(const suffix of ['materials_37','waste_30','equipment_26','logistics_29'])expect(bySuffix(suffix).status).toBe('INCLUDED');
  for(const suffix of ['materials_03','labor_20','consumables_11'])expect(bySuffix(suffix).status).toBe('NOT_APPLICABLE');
  for(const suffix of ['preparation_14','preparation_45','preparation_15','labor_48','labor_18'])expect(bySuffix(suffix).status).toBe('COMPLETED');
  expect(bySuffix('quality_control_32').status).toBe('PROCESS_REQUIRED');expect(bySuffix('components_08').status).toBe('PROJECT_SCOPE_OPEN');expect(bySuffix('overhead_35').status).toBe('FINANCIAL_POLICY');
  expect(scope(result.preliminaryNeeds.find(n=>n.row_id===prefix+':source-gap:primer')!).status).toBe('COMPLETED');
  expect(result.preliminaryNeeds.every(n=>n.quantity===null&&n.unit_price===null&&n.need_state==='CONDITION_REQUIRED'&&n.missing_parameter_ids.length===0)).toBe(true);
  expect(result.preliminaryNeeds.every(n=>scope(n).numericNormAccepted===false&&scope(n).separatePaymentAccepted===false)).toBe(true);
  expect(result.rows.find(n=>n.row_id===prefix+':lower_isoplast_epp_4')?.quantity).toBe('43.5');expect(result.rows.find(n=>n.row_id===prefix+':upper_isoplast_ekp_4_5')?.quantity).toBe('42.75');expect(result.rows.find(n=>n.row_id===prefix+':propane_butane')?.quantity).toBe('2.5875');
});
test.each([undefined,pack.unknownChoiceRu,pack.legacyChoiceRu])('system sentinel distinguishes missing/unknown/legacy without hidden numeric input: %s',async value=>{
  const r=overlay(fixture.reps[0]!,locators).representative,input:Record<string,unknown>={q:'37.5'};if(value!==undefined)input[pack.systemParameterId]=value;
  const result=await compile(r,input),pending=result.preliminaryNeeds.find(n=>n.row_id===prefix+':remaining:scope_pending')!;
  expect(scope(pending).status).toBe(value===pack.legacyChoiceRu?'LEGACY_SOURCE_REQUIRED':'OBJECT_FACT_REQUIRED');
  expect(pending.need_state).toBe('CONDITION_REQUIRED');expect(pending.missing_parameter_ids).toEqual(value===pack.legacyChoiceRu?[]:[pack.systemParameterId]);
  if(value!==pack.legacyChoiceRu)expect(result.rows.some(n=>fixture.reps[0]!.resources.slice(0,59).some(old=>old.row_id===n.row_id))).toBe(false);
});
test('unconfirmed conditions never declare completed primer or inapplicable wood; exact selection closes only system choice',async()=>{
  const r=overlay(fixture.reps[0]!,locators).representative;
  for(const input of [{q:'37.5',[pack.systemParameterId]:pack.systemYesRu},{...facts,[pack.conditionsParameterId]:'Условия ещё не проверены'}]){
    const result=await compile(r,input);expect(result.preliminaryNeeds.some(n=>n.row_id===prefix+':remaining:scope_pending')).toBe(false);
    expect(scope(result.preliminaryNeeds.find(n=>n.row_id===prefix+':source-gap:primer')!).status).toBe('SCOPE_UNVERIFIED');
    expect(scope(result.preliminaryNeeds.find(n=>n.row_id===prefix+':remaining:materials_03')!).status).toBe('SCOPE_UNVERIFIED');
  }
});
test('scope classification cannot manufacture physical quantities, prices, or a second payer; legacy edits remain at their owner',async()=>{
  const r=overlay(fixture.reps[0]!,locators).representative,rowId=prefix+':source-gap:primer';
  await expect(compile(r,facts,{rowOverrides:{[rowId]:{quantity:'1',provenance:{kind:'manual',reason:'CONTROL'}}}})).rejects.toMatchObject({code:'ROW_AMENDMENT_INVALID'});
  const exact=await compile(r,facts,{rowOverrides:{[rowId]:{unitPrice:'99',includedInEstimate:true,includedInProcurement:true,provenance:{kind:'manual',reason:'CONTROL'}}}});
  expect(exact.preliminaryNeeds.find(n=>n.row_id===rowId)).toMatchObject({quantity:null,selected:false,procurement_eligible:false,unit_price:'99'});
  const old=r.resources[0]!,legacy=await compile(r,{q:'37.5',[pack.systemParameterId]:pack.legacyChoiceRu},{rowOverrides:{[old.row_id]:{quantity:'7',unitPrice:'17.25',titleRu:'Историческая цена',provenance:{kind:'manual',reason:'CONTROL'}}}});
  expect(legacy.rows.find(n=>n.row_id===old.row_id)).toMatchObject({quantity:'7',unit_price:'17.25',title_ru:'Историческая цена'});
});
test('compact transport, parameter session, reopened draft and PDF preserve the same semantic decisions without59 norm questions',async()=>{
  const r=overlay(fixture.reps[0]!,locators).representative,result=await compile(r,facts);
  const stored={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',catalog_id:String(r.definition.catalog_id),definition_version_id:String(r.definition.id),checksum_sha256:'a'.repeat(64),row_count:result.rows.length,input_parameters:result.parameters,totals:result.totals,amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
  const transport=projectCanonicalEstimatePreliminaryNeedTransport(stored);expect(transport.preliminaryNeeds).toHaveLength(59);
  expect(transport.preliminaryNeeds.every(n=>n.scopeRequirementDecision!=null&&!Object.prototype.hasOwnProperty.call(n,'calculationTrace'))).toBe(true);
  const catalog:CanonicalEstimateCatalogItem={catalogId:stored.catalog_id,releaseId:stored.release_id,namespace:'global',workKey:'scope-control',titleRu:'Монтаж плоской кровли',domain:'roofing',definitionVersion:1,applicability:{},professionalMetadata:{},parameterSchema:[]};
  const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:stored.id,parentRevisionId:null,releaseId:stored.release_id,catalogId:stored.catalog_id,revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:result.parameters,totals:result.totals,rowCount:result.rows.length,checksumSha256:stored.checksum_sha256,compilerVersion:pack.contract,createdAt:'2026-10-12T00:00:00Z',amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null,...transport.amendmentContract},preliminaryNeeds:transport.preliminaryNeeds};
  const session=projectCanonicalEstimateParameterSessionSnapshot({requestedRevisionId:stored.id,definitionVersionId:stored.definition_version_id,revision,parent:null,catalog});expect(session.revision.preliminaryNeeds?.every(n=>n.scopeRequirementDecision!=null)).toBe(true);
  const payload=adaptCanonicalRevisionToStructuredEstimate({catalog,revision,rows:result.rows.map(row=>canonicalEstimateRevisionRowFromStorage(row,null))});
  const draft=buildStructuredEstimateRequestDraft(payload),reopened=JSON.parse(JSON.stringify({...foundationDraftWithManualCatalogItem(),...draft,structuredEstimatePayload:payload}));
  const view=buildRequestEstimateViewModel(reopened)!;expect(view.sourceGates).toHaveLength(0);expect(view.preliminaryNeedCount).toBe(0);expect(view.calculatedItemCount).toBe(9);
  expect(view.scopeRequirementGroups).toEqual(groupCanonicalScopeRequirementsV1(result.preliminaryNeeds.map(scope)));
  const pdf=buildCanonicalProfessionalPdfProjection({revision:stored,rows:result.rows as CanonicalArtifactRow[],preliminaryNeeds:canonicalArtifactPreliminaryNeeds(stored),expectedProjectedRowCount:result.rows.length,workTitleRu:catalog.titleRu});
  expect(pdf.html).toContain('Состав и этапы');expect(pdf.html).toContain('Уже учтено в норме покрытия');expect(pdf.html).toContain('Отдельный состав зависит от проекта');expect(pdf.html).not.toContain('Количество нужно уточнить');expect(pdf.grandTotalStatus).toBe('PARTIAL_NEEDS_PRICE');
});
test('invalid coverage references cannot turn an unknown obligation into included scope',async()=>{
  const r=overlay(fixture.reps[0]!,locators).representative,row=r.resources.find(n=>n.row_id===prefix+':remaining:materials_37')!;
  (row.resource_graph.scopeRequirementV1 as {coveringRowIds:string[]}).coveringRowIds=['missing-owner'];
  await expect(compile(r,facts)).rejects.toMatchObject({code:'DEFINITION_INTEGRITY_FAILED'});
});
test('unrelated PVC and high-load targets cannot acquire this field classification',()=>{
  for(const suffix of ['standard','small_area','large_area','high_load'])expect(()=>overlay({...fixture.reps[0]!,definition:{...fixture.reps[0]!.definition,catalog_id:'canonical-work:base:roofing_interior_flat_roof_install_'+suffix}},locators)).toThrow('ROOF_SCOPE_EXACT_PARENT_DRIFT');
});
