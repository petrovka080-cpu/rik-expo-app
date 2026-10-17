import fs from 'node:fs';import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {buildCuringMaterials36R1 as build,CURING36_ANTISOL_OWNER_R1 as exactOwner,CURING36_EXACT_QUOTE_PARAMETER_R1 as quoteId} from './curingMaterials36R1';
import {assembleCuringMaterials36ForwardR1 as assemble} from './curingMaterials36ForwardAssemblerR1';
import type {EmbeddedProjectMaterialParentR1 as Parent} from './embeddedProjectMaterialExpansionR1';
import {compileCanonicalEstimateCore as compile} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalManualPriceMigrationBindings as bindings,canonicalStoredManualPricesCanMigrate as canMigrate} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {foundationAtomicChoiceLabelRuR1 as label} from '../../../src/lib/estimate/v4/concreteFoundationAtomicConstructionR1';
import {concreteCuringAntisolPackS2763 as pack,concreteCuringAntisolReadyChoicesS2763 as ready,concreteCuringAntisolInterfaceS2763 as interfaceChoice} from '../../../src/lib/estimate/v4/concreteCuringAntisolMaterialS2763';

type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const methods=['WATER_CURING','WET_COVERING','IMPERVIOUS_SHEET','MEMBRANE_CURING_COMPOUND'];
const item='foundation_item_curing_material_fixing';
const separateRow='material:concrete:foundation-item-curing_material-fixing-separate';
const includedExactRow='material:concrete:foundation-item-curing_material-fixing-included-3';
const ownMode='Материал поставляется и оплачивается отдельными позициями';
export function curingMaterials36TestInputR1(model:ReturnType<typeof build>,method='IMPERVIOUS_SHEET',exact=false){
 const input:Json={cured_concrete_volume_m3:10,exposed_curing_surface_area_m2:49,concrete_mix_reference:'TEST explicit project mix',
  curing_location:'TEST explicit measured surface '+model.catalogId,approved_external_curing_method:method,
  curing_method_statement_reference:'TEST approved method, not a real project',curing_duration_day:7,curing_worker_h:2,
  application_equipment_required:false,quality_plan_reference:'TEST quality plan',quality_control_document_count:1};
 if(['WATER_CURING','WET_COVERING'].includes(method))Object.assign(input,{curing_water_m3:1,curing_water_source_reference:'TEST water schedule',curing_water_delivery_mode:'ON_SITE_SUPPLY'});
 if(method==='WET_COVERING')Object.assign(input,{wet_covering_material_designation:'TEST compatible wet cover',wet_covering_area_m2:55});
 if(method==='IMPERVIOUS_SHEET')Object.assign(input,{impervious_sheet_designation:'TEST compatible impervious sheet',impervious_sheet_area_m2:55});
 if(method==='MEMBRANE_CURING_COMPOUND'){
  input.antisol_material_choice=exact?pack.selectedProductRu:pack.legacyProductRu;
  if(exact)Object.assign(input,{antisol_surface_ready:ready[0],antisol_minimum_temperature_12h_c:20,
   antisol_subsequent_surface_use:interfaceChoice,antisol_usable_stock_l:0,antisol_retained_reserve_l:0});
  else Object.assign(input,{curing_compound_product_designation:'TEST specified generic compound',curing_compound_quantity_l:10});
 }
 for(const group of model.groups)for(const p of group.positions)input['foundation_item_'+group.key+'_'+p.key+'_applicability']=label('NOT_REQUIRED_BY_APPROVED_PROJECT');
 return input;
}
function requiredItem(input:Json,mode:string){return {...input,[item+'_applicability']:label('REQUIRED_BY_APPROVED_PROJECT'),
 [item+'_payment_mode']:mode,[item+'_designation']:'TEST individual compatible fixing F-2',[item+'_quantity']:2,
 [item+'_price_scope_reference']:'TEST quote covers this exact fixing and count, including previous paid supply when main order is zero',
 ...(mode===ownMode?{[item+'_stock']:0,[item+'_reserve']:1,[item+'_supplier_quantum']:3}:{})};}

export async function verifyCuringMaterials36R1(parents:readonly Parent[]){
 assert.equal(parents.length,36);const models:Json[]=[],cases:Json[]=[];
 const primaryGuardCases:Json[]=[];
 for(const parent of parents){
  const primaryMutations:readonly [string,(p:Json,q:Json)=>void][]=[
   ['missing-primary',p=>{p.parameters=p.parameters.filter((q:Json)=>q.parameter_id!=='cured_concrete_volume_m3');}],
   ['changed-unit',(_p,q)=>{q.unit_id='m2';}],['changed-value-type',(_p,q)=>{q.value_type='string';}],
   ['changed-semantic-binding',(_p,q)=>{q.truth_metadata.semantic_parameter_key='other:surface';}],
   ['changed-source-role',(_p,q)=>{q.truth_metadata.value_source_role='RUNTIME_DEFAULT';}],
   ['duplicate-primary',(p,q)=>{p.parameters.push(structuredClone(q));}],
   ['hidden-numeric-default',(_p,q)=>{q.default_value=1;}],
   ['hidden-default-permitted',(_p,q)=>{q.truth_metadata.hidden_default_forbidden=false;}],
  ];
  for(const [scenario,mutate] of primaryMutations){
   const changed:Json=structuredClone(parent),primary=changed.parameters.find((p:Json)=>p.parameter_id==='cured_concrete_volume_m3');
   mutate(changed,primary);const beforeRejected=hash(changed);let rejection:unknown;
   try{build(changed as Parent);}catch(e){rejection=e;}
   assert.equal((rejection as {code?:string}|undefined)?.code,'RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED',scenario);
   assert.equal(hash(changed),beforeRejected);primaryGuardCases.push({catalogId:parent.definition.catalog_id,scenario,expectedBindingReview:true});
  }

  const before=hash(parent),model=build(parent);assert.equal(hash(parent),before);
  assert.equal(model.resources.length,46);assert.equal(model.retiredAggregateRowIds.length,7);assert.equal(model.preservedParentRowIds.length,11);
  assert.deepEqual(model.formulas.slice(0,23),parent.formulas,'EXISTING_CURING_OR_ANTISOL_FORMULA_CHANGED');
  for(const id of model.preservedParentRowIds)assert.deepEqual(model.resources.find(r=>r.row_id===id),parent.resources.find(r=>r.row_id===id));
  for(const old of parent.parameters.filter(p=>!model.retiredAggregateParameterIds.includes(p.parameter_id)&&p.parameter_id!==quoteId))assert.deepEqual(model.parameters.find(p=>p.parameter_id===old.parameter_id),old);
  for(const id of model.modifiedOwnerPriceRows){const old=parent.resources.find(r=>r.row_id===id)!,next=model.resources.find(r=>r.row_id===id)!;
   assert.deepEqual({...next,source_metadata:old.source_metadata},old);assert.deepEqual(next.source_metadata,{...old.source_metadata,automaticGenericPriceInheritanceAllowed:false});}
  const oldBindings=bindings(parent as any),newBindings=bindings(model);
  for(const id of model.preservedParentRowIds)assert.equal(newBindings[id],oldBindings[id]);
  for(const id of [...model.retiredAggregateRowIds,...model.modifiedOwnerPriceRows])assert(!canMigrate({rowOverrides:{[id]:{unitPrice:'100',provenance:{kind:'manual',reason:'TEST'}}},customRows:[],fromBindings:oldBindings,toBindings:newBindings}));
  for(const id of model.retiredAggregateRowIds)for(const change of [{quantity:'35'},{titleRu:'TEST old kit title'},{includedInEstimate:false}])assert(!canMigrate({rowOverrides:{[id]:{...change,provenance:{kind:'manual',reason:'TEST'}}},customRows:[],fromBindings:oldBindings,toBindings:newBindings}));
  const execute=async(input:Json,name:string)=>{
   const r=await compile({operation:'compile',compilerVersion:'curing36-offline-project-schedule-verification-r1',catalogId:model.catalogId,
    primaryMeasureParameterId:model.primaryMeasureParameterId,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,
    resourceDefinitions:model.resources,submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',priceItems:[],maximumResourceRows:128,hashJson:async v=>hash(v)});
   assert(!r.rows.some(x=>model.retiredAggregateRowIds.includes(x.row_id)&&x.included_in_estimate));
   cases.push({catalogId:model.catalogId,scenario:name,calculatedRows:r.rows.length,openQuantityNeeds:r.preliminaryNeeds.length});return r;
  };
  for(const method of methods){const r=await execute(curingMaterials36TestInputR1(model,method),'baseline-'+method);assert.equal(r.preliminaryNeeds.length,0,'BASELINE_OPEN_NEEDS:'+method+':'+JSON.stringify(r.preliminaryNeeds));}
  const separate=requiredItem(curingMaterials36TestInputR1(model),ownMode),r=await execute(separate,'individual-fixing-separate-quantum');
  assert.equal(r.preliminaryNeeds.length,0);assert.equal(String(r.rows.find(x=>x.row_id===separateRow)?.quantity),'3');
  const missing={...separate};delete missing[item+'_stock'];const mr=await execute(missing,'unknown-stock-blocks-own-material');assert(mr.preliminaryNeeds.some(n=>n.row_id===separateRow));
  const inactive={...separate,[item+'_applicability']:label('NOT_REQUIRED_BY_APPROVED_PROJECT')};const absent=await execute(inactive,'unselected-position-not-purchased');assert(!absent.rows.some(x=>x.row_id===separateRow&&x.included_in_estimate));
  const sheetTitle=parent.resources.find(x=>x.row_id==='material:concrete:impervious-curing-sheet')!.title_ru;
  const includedSheet=requiredItem(curingMaterials36TestInputR1(model),'Включено в подтверждённую ставку: '+sheetTitle);
  const sr=await execute(includedSheet,'included-sheet-fixing-no-separate-purchase');assert.equal(sr.preliminaryNeeds.length,0);assert(!sr.rows.some(x=>x.row_id===separateRow&&x.included_in_procurement));
  for(const [method,ownerId] of [['WET_COVERING','material:concrete:wet-curing-covering'],['MEMBRANE_CURING_COMPOUND','material:concrete:membrane-curing-compound']]){
   const ownerTitle=parent.resources.find(x=>x.row_id===ownerId)!.title_ru;
   const rr=await execute(requiredItem(curingMaterials36TestInputR1(model,method),'Включено в подтверждённую ставку: '+ownerTitle),'included-selected-'+method+'-no-exact-quote');
   assert.equal(rr.preliminaryNeeds.length,0);assert(!rr.rows.some(x=>x.row_id===includedExactRow));
  }
  const equipmentInput=curingMaterials36TestInputR1(model,'WATER_CURING');Object.assign(equipmentInput,{application_equipment_required:true,application_equipment_designation:'TEST actual pump with compatible equipment',application_equipment_machine_h:1,equipment_mobilization_pricing_mode:'INCLUDED_IN_EQUIPMENT_RATE'});
  const hose='foundation_item_curing_application_hose',equipmentTitle=parent.resources.find(x=>x.row_id==='equipment:concrete:curing-application')!.title_ru;
  Object.assign(equipmentInput,{[hose+'_applicability']:label('REQUIRED_BY_APPROVED_PROJECT'),[hose+'_payment_mode']:'Включено в подтверждённую ставку: '+equipmentTitle,[hose+'_designation']:'TEST compatible hose H-2',[hose+'_quantity']:2,[hose+'_price_scope_reference']:'TEST equipment quote expressly includes hose H-2 length2m'});
  const eq=await execute(equipmentInput,'included-equipment-hose-retained-without-separate-cost');assert.equal(eq.preliminaryNeeds.length,0);
  assert.equal(String(eq.rows.find(x=>x.row_id==='material:concrete:foundation-item-curing_application-hose-included-0')?.quantity),'2');
  const exactTitle=parent.resources.find(x=>x.row_id===exactOwner)!.title_ru,exactMode='Включено в подтверждённую ставку: '+exactTitle;
  let rejection:any;try{await execute(requiredItem(curingMaterials36TestInputR1(model),exactMode),'INVALID-inactive-owner');}catch(e){rejection=e;}
  assert.equal(rejection?.code,'PARAMETER_VALIDATION_FAILED');assert(String(rejection.message).includes(item+'_payment_mode'));
  cases.push({catalogId:model.catalogId,scenario:'inactive-Antisol-owner-rejected',expectedRejection:rejection.code});
  const exactInput=requiredItem(curingMaterials36TestInputR1(model,'MEMBRANE_CURING_COMPOUND',true),exactMode);
  exactInput[quoteId]='TEST actual quote lists fixing F-2 count2, covers prior paid supply if order0';
  const er=await execute(exactInput,'exact-Antisol-confirmed-included-item');assert.equal(er.preliminaryNeeds.length,0);
  assert.equal(String(er.rows.find(x=>x.row_id===exactOwner)?.quantity),'19');assert.equal(String(er.rows.find(x=>x.row_id===includedExactRow)?.quantity),'2');
  const noQuote={...exactInput};delete noQuote[quoteId];const qr=await execute(noQuote,'exact-included-missing-quote-blocks-row');assert(qr.preliminaryNeeds.some(n=>n.row_id===includedExactRow&&n.missing_parameter_ids.includes(quoteId)));
  const zero:Json={...exactInput,antisol_usable_stock_l:100};const zr=await execute(zero,'zero-Antisol-order-retains-included-physical-item');
  assert.equal(zr.preliminaryNeeds.length,0);assert.equal(String(zr.rows.find(x=>x.row_id===exactOwner)?.quantity),'0');
  const child=zr.rows.find(x=>x.row_id===includedExactRow);assert(child);assert.equal(String(child.quantity),'2');
  const trace=child.calculation_trace as Json;assert(trace&&typeof trace==='object');
  assert.equal(trace.resourceGraph.includedInResourceOwnerRowId,exactOwner);
  assert.equal(trace.resourceGraph.costTreatment,'INCLUDED_IN_RESOURCE_ROWS');
  assert.equal(child.included_in_estimate,false,'INCLUDED_ITEM_MUST_NOT_BE_PAID_TWICE');assert.equal(child.included_in_procurement,false);
  const zeroMissing={...zero};delete zeroMissing[quoteId];const zq=await execute(zeroMissing,'zero-order-still-needs-confirmed-included-quote');assert(zq.preliminaryNeeds.some(n=>n.row_id===includedExactRow));
  const zeroSeparate=requiredItem(curingMaterials36TestInputR1(model,'MEMBRANE_CURING_COMPOUND',true),ownMode);zeroSeparate.antisol_usable_stock_l=100;
  const zs=await execute(zeroSeparate,'zero-Antisol-order-separate-item-still-purchased');assert.equal(zs.preliminaryNeeds.length,0);assert.equal(String(zs.rows.find(x=>x.row_id===separateRow)?.quantity),'3');
  const noStock={...exactInput};delete noStock.antisol_usable_stock_l;const ns=await execute(noStock,'unknown-Antisol-stock-remains-unknown');assert(ns.preliminaryNeeds.some(n=>n.row_id===exactOwner));
  models.push({catalogId:model.catalogId,parentSha256:before,modelSha256:hash(model),parameters:model.parameters.length,formulas:model.formulas.length,resources:model.resources.length,retiredKits:7,changedPriceOwners:5,preservedResources:11,
   acceptanceInput:separate,explicitTestOnly:true,realProjectAccepted:false});
 }
 assert.equal(primaryGuardCases.length,288);
 return {primaryBindingRejections:primaryGuardCases.length,primaryGuardCases,status:'PASS_CURING36_PROJECT_ITEMS_OWNERS_ZERO_PURCHASE_AND_IMMUTABLE_FORMULAS',models,cases,coreScenarios:cases.length,calculatedTestTypes:36,realProjectEstimatesAccepted:0,confirmedSupplierOrders:0,publicationPerformed:false,verifierWritesProductSource:false,nativeAccepted:false};
}
async function main(){const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/u,''));
 assert.equal(context.status,'PASS_READ_ONLY_CURING36_PARENTS_AND_CURRENT18_SIX_PDFS_DURABILITY');
 const result=await verifyCuringMaterials36R1(context.parents);
 const assembled=assemble({...context,releaseId:'11111111-1111-5111-8111-111111111111',sourceHead:'TEST_ONLY',sourceTree:'TEST_ONLY',sourceFingerprint:'TEST_ONLY',sourceFreezeSha256:'TEST_ONLY',masterSha256:'TEST_ONLY',acceptanceEvidenceSha256:'TEST_ONLY'});
 assert.equal(assembled.models.length,36);
 for(const m of assembled.models){assert.equal(m.searchPatch.primary_uom,'м³');assert.equal(m.plan.resources.length,46);assert.equal(m.plan.bindings.length,16);}
 Object.assign(result,{forwardPlans:36,forwardBindingsPerModel:16,primaryUomUnchanged:true});
 fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:result.status,models:result.models.length,coreScenarios:result.coreScenarios}));}
if(process.argv[1]?.endsWith('verifyCuringMaterials36R1.ts'))void main().catch(e=>{console.error(e);process.exitCode=1;});
