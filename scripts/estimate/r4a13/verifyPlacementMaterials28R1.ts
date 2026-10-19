import fs from 'node:fs';import {strict as assert} from 'node:assert';import {createHash} from 'node:crypto';
import {buildPlacementMaterials28R1 as build} from './placementMaterials28R1';
import type {EmbeddedProjectMaterialParentR1 as Parent} from './embeddedProjectMaterialExpansionR1';
import {compileCanonicalEstimateCore as compile} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {resolveInclusionGraph} from '../../../src/lib/estimate/backendPlatform/inclusionGraph';
import {canonicalManualPriceMigrationBindings as bindings,canonicalStoredManualPricesCanMigrate as migrate} from '../../../src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {foundationAtomicChoiceLabelRuR1 as label} from '../../../src/lib/estimate/v4/concreteFoundationAtomicConstructionR1';
import {buildExplicitProjectMaterialItemsR1} from '../../../src/lib/estimate/v4/explicitProjectMaterialItemsR1';
import {buildCanonicalProfessionalPdfProjection} from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';

type Json=Record<string,any>;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const separate=label('SEPARATE_CONFIRMED_SUPPLY');
/** Explicit TEST schedule only. Historical examples are copied into this
 * isolated verifier input, never into a definition or runtime baseline. */
export function placementMaterials28TestInputR1(parent:Parent,model=build(parent)){
 const context=model.catalogId.split('_pour_')[1]!,equipment=['large_area','technical_room'].includes(context);
 const input:Json={...(parent as any).baseline.input_values,
  surface_finishing_method:equipment?'PROJECT_SELECTED_EQUIPMENT':'MANUAL_TOOLS',surface_finishing_equipment_machine_h:equipment?2:0,
  surface_finishing_price_scope_reference:'TEST retained labor and equipment scope excludes separately selected parts',
  surface_finishing_equipment_specification:'TEST compatible surface finishing equipment',surface_finishing_delivery_mode:'SEPARATE_CONFIRMED_TRIPS',surface_finishing_delivery_reference:'TEST one confirmed finishing trip',surface_finishing_delivery_trip_count:1,
  curing_water_m3:2,curing_water_source_reference:'TEST confirmed project water schedule',curing_water_equipment_required:context==='repair'?'NOT_REQUIRED':'REQUIRED',
  curing_water_equipment_designation:'TEST confirmed wetting device',curing_water_equipment_machine_h:2,curing_water_delivery_mode:'SEPARATE_DELIVERY',curing_water_delivery_vehicle_specification:'TEST water delivery tank',curing_water_delivery_capacity_m3:3,
  vibration_equipment_specification:'TEST compatible deep vibrator',vibration_equipment_price_scope_reference:'TEST vibrator quote excludes separately supplied head',
  vibration_equipment_delivery_mode:'SEPARATE_CONFIRMED_TRIPS',vibration_equipment_delivery_reference:'TEST one confirmed vibrator trip',vibration_equipment_delivery_trip_count:1,
  placement_equipment_specification:'TEST compatible selected placement equipment',placement_equipment_price_scope_reference:'TEST selected placement equipment and operator boundary, individual parts confirmed',
  placement_equipment_delivery_mode:'SEPARATE_CONFIRMED_TRIPS',placement_equipment_delivery_reference:'TEST one confirmed placement equipment trip',placement_equipment_delivery_trip_count:1,
  construction_joint_mode:context==='wet_zone'?'WATERSTOP':'NONE',construction_joint_waterstop_length_m:context==='wet_zone'?5:0,construction_joint_installation_worker_h:context==='wet_zone'?2:0,
  construction_joint_waterstop_specification:'TEST project waterstop',construction_joint_equipment_pricing_mode:'SEPARATE_EQUIPMENT_RATE',construction_joint_equipment_specification:'TEST compatible joint tools',construction_joint_equipment_machine_h:1,
  construction_joint_method_statement_reference:'TEST approved project joint method',construction_joint_quality_program_reference:'TEST approved joint quality program',
  construction_joint_supply_delivery_mode:'SEPARATE_CONFIRMED_TRIPS',construction_joint_supply_delivery_reference:'TEST joint supply trip',construction_joint_supply_delivery_trip_count:1,
  winter_heating_system_reference:'TEST project heating system',winter_heating_cable_specification:'TEST main heating cable already counted',winter_heating_equipment_specification:'TEST compatible heating transformer',
  winter_heating_price_scope_reference:'TEST transformer excludes separately selected connection wire; main heating cable and energy retain existing owners',
  winter_heating_energy_pricing_mode:model.catalogId.includes('_belt_')?'INCLUDED_IN_EQUIPMENT_RATE':'SEPARATE_ENERGY_RATE',winter_heating_energy_kwh:20,winter_heating_energy_reference:'TEST project energy schedule',
  winter_heating_delivery_mode:'SEPARATE_CONFIRMED_TRIPS',winter_heating_delivery_reference:'TEST heating equipment trip',winter_heating_delivery_trip_count:1,
 };
 if(input.construction_joint_mode==='NONE')for(const id of ['construction_joint_waterstop_specification','construction_joint_waterstop_length_m','construction_joint_installation_worker_h'])delete input[id];
 for(const id of model.retiredAggregateParameterIds)delete input[id];
 for(const group of model.groups)for(const part of group.positions){
  const key=`foundation_item_${group.key}_${part.key}`,active=resolveInclusionGraph(group.active,input).value===true;
  input[key+'_applicability']=label(active?'REQUIRED_BY_APPROVED_PROJECT':'NOT_REQUIRED_BY_APPROVED_PROJECT');
  if(!active)continue;
  const own=group.key==='vibration'&&part.key==='head'||group.key==='winter_heating'&&part.key==='connection_wire';
  Object.assign(input,{[key+'_designation']:`TEST fixture: ${group.key} ${part.key} P-2`,[key+'_quantity']:2,
   [key+'_price_scope_reference']:'TEST exact physical item and confirmed quote boundary; no repeated main product, operator, energy or delivery',
   [key+'_payment_mode']:own?separate:'Включено в подтверждённую ставку: '+group.includedOwnerTitleRu,
   ...(own?{[key+'_stock']:0,[key+'_reserve']:1,[key+'_supplier_quantum']:3}:{})});
 }
 return input;
}
export async function verifyPlacementMaterialModelsR1(parents:readonly Parent[],builder:typeof build,expectedCount:number){
 assert.equal(parents.length,expectedCount);const models:Json[]=[],cases:Json[]=[];
 for(const parent of parents){
  const before=hash(parent),model=builder(parent);assert.equal(hash(parent),before);assert.equal(model.preservedParentRowIds.length,23);assert.equal(model.retiredAggregateRowIds.length,13);assert.equal(model.modifiedOwnerInputRows.length,5);
  assert.equal(model.resources.length,82);assert.equal(model.formulas.length,82);assert.equal(model.parameters.length,287);
  for(const id of model.preservedParentRowIds)assert.deepEqual(model.resources.find(r=>r.row_id===id),parent.resources.find(r=>r.row_id===id),'UNCHANGED_PARENT_ROW_CHANGED:'+id);
  assert.deepEqual(model.formulas.slice(0,41),parent.formulas);
  const old=bindings(parent),next=bindings(model);
  for(const id of model.preservedParentRowIds)assert.equal(next[id],old[id],'UNCHANGED_PRICE_BINDING_CHANGED:'+id);
  for(const id of [...model.modifiedOwnerInputRows,...model.retiredAggregateRowIds])assert(!migrate({rowOverrides:{[id]:{unitPrice:'100',provenance:{kind:'manual'}}},customRows:[],fromBindings:old,toBindings:next}),'CHANGED_MANUAL_PRICE_SILENTLY_MIGRATED');
  for(const id of model.modifiedOwnerInputRows){const a=parent.resources.find(r=>r.row_id===id)!,b=model.resources.find(r=>r.row_id===id)!;assert.deepEqual({...b,resource_graph:a.resource_graph,source_metadata:a.source_metadata},a);}
  const input=placementMaterials28TestInputR1(parent,model);
  const execute=(submittedParameters:Json,extra:Json={})=>compile({operation:'compile',compilerVersion:'placement28-offline-test-r1',catalogId:model.catalogId,primaryMeasureParameterId:model.primaryMeasureParameterId,
   parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,submittedParameters,confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:128,priceItems:[],hashJson:async v=>hash(v),...extra});
  const result=await execute(input);assert.equal(result.preliminaryNeeds.length,0,'TEST_SCHEDULE_NEEDS:'+JSON.stringify(result.preliminaryNeeds));
  const head=result.rows.find(r=>r.row_id==='material:concrete:foundation-item-vibration-head-separate');assert.equal(head?.quantity,'3');
  assert(!result.rows.some(r=>model.retiredAggregateRowIds.includes(r.row_id)&&r.included_in_estimate));
  for(const row of result.rows)if(row.row_id.startsWith('material:concrete:foundation-item-')&&row.row_id.includes('-included-')){
   const graph=(row.calculation_trace as Json).resourceGraph,owner=result.rows.find(r=>r.row_id===graph.includedInResourceOwnerRowId);assert(owner&&Number(owner.quantity)>0,'INCLUDED_ITEM_WITHOUT_POSITIVE_OWNER');assert.equal(row.included_in_procurement,false);
  }
  for(const part of model.groups.find(g=>g.key==='curing_water')!.positions){
   const key=`foundation_item_curing_water_${part.key}`,p=model.parameters.find(p=>p.parameter_id===key+'_payment_mode')!;
   assert.equal((p.constraints_json!.values as unknown[]).length,1);assert(!model.parameters.some(p=>p.parameter_id===key+'_stock'));
   const row=model.resources.find(r=>r.row_id===`material:concrete:foundation-item-curing_water-${part.key}-included-0`)!;
   assert.equal((row.resource_graph.individualMaterialPaymentV1 as Json).paymentParameterId,key+'_payment_mode');assert.equal((row.resource_graph.individualMaterialPaymentV1 as Json).priceScopeParameterId,key+'_price_scope_reference');
   assert.equal(row.resource_graph.includedInResourceOwnerRowId,'equipment:concrete:curing-water-application');
  }
  const unknown={...input};delete unknown.foundation_item_vibration_head_stock;
  assert((await execute(unknown)).preliminaryNeeds.some(n=>n.row_id===head!.row_id),'UNKNOWN_STOCK_BECAME_ZERO');
  const inactive=await execute({...input,foundation_item_vibration_head_applicability:label('NOT_REQUIRED_BY_APPROVED_PROJECT')});assert(!inactive.rows.some(r=>r.row_id===head!.row_id&&r.included_in_estimate));
  if(input.placement_method==='pump'){
   const bad={...input,pump_machine_h:0};let rejection:any;try{await execute(bad);}catch(e){rejection=e;}assert.equal(rejection?.code,'PARAMETER_VALIDATION_FAILED');assert(String(rejection.message).includes('foundation_item_placement_pump_'),'WRONG_ZERO_OWNER_REJECTION');
   const wrong={...input,foundation_item_placement_pump_hose_payment_mode:'Включено в подтверждённую ставку: '+parent.resources.find(r=>r.row_id==='equipment:concrete:crane-bucket')!.title_ru};
   await assert.rejects(()=>execute(wrong),(e:any)=>e.code==='PARAMETER_VALIDATION_FAILED');
  }
  if(input.surface_finishing_method==='PROJECT_SELECTED_EQUIPMENT')await assert.rejects(()=>execute({...input,surface_finishing_equipment_machine_h:0}),(e:any)=>e.code==='PARAMETER_VALIDATION_FAILED'&&String(e.message).includes('foundation_item_finishing_equipment_'));
  const included=model.resources.find(r=>r.row_id.startsWith('material:concrete:foundation-item-vibration-shaft-included'))!;
  const excluded=await execute(input,{operation:'recalculate',rowOverrides:{'equipment:concrete:deep-vibrator':{includedInEstimate:false,provenance:{kind:'manual',reason:'TEST excluded owner'}}}});
  const child=excluded.rows.find(r=>r.row_id===included.row_id)!;
  assert(child,'INCLUDED_PART_TEST_MISSING');
  assert.equal(excluded.rows.find(r=>r.row_id==='equipment:concrete:deep-vibrator')!.included_in_estimate,false);
  const orphanView=buildCanonicalProfessionalPdfProjection({revision:{id:'TEST',revision_no:1,currency_code:'KGS',parameters:input,row_count:2} as any,rows:[excluded.rows.find(r=>r.row_id==='equipment:concrete:deep-vibrator')!,child],workTitleRu:'TEST excluded paid owner'});
  assert(!orphanView.html.includes('стоимость включена в позицию'),'EXCLUDED_OWNER_STILL_CLAIMED');
  const operation=(included.resource_graph.operationCompositionV1 as Json),key=JSON.stringify([operation.groupId,operation.operationId]);
  const removed=await execute(input,{operation:'recalculate',compositionSelectionV1:{contractVersion:'canonical-estimate-composition-selection/v1',excludedOperationKeys:[key],excludedRowIds:[]}});
  assert(!removed.rows.some(r=>r.row_id===included.row_id&&r.included_in_estimate),'EXCLUDED_OPERATION_KEPT_INCLUDED_PART');
  cases.push({catalogId:model.catalogId,context:model.catalogId.split('_interior_')[1],fixtureKind:'EXPLICIT_TEST_SCHEDULE_NOT_REAL_PROJECT',input,calculatedRows:result.rows.length,openNeeds:0,explicitVibratorHeadOrderQuantity:'3',realProjectEstimateAccepted:false,confirmedOrder:false});
  models.push({catalogId:model.catalogId,parentSha256:before,modelSha256:hash(model),parameters:287,formulas:82,resources:82,preservedResources:23,retiredAggregateRows:13,changedOwnerInputRows:model.modifiedOwnerInputRows});
 }
 assert.throws(()=>buildExplicitProjectMaterialItemsR1('TEST','empty',{kind:'greater_than',parameterId:'q',value:0},[],[],[],'0'.repeat(64),{separateSupplyAllowed:false}),/INCLUDED_ONLY_OWNER_REQUIRED/u);
 return {status:`PASS_${expectedCount}_CURRENT_PARENTS_BRANCH_OWNERS_PAYMENT_MIGRATION_AND_UNKNOWN_FACTS`,models,cases,calculatedTypesWithExplicitTestFacts:expectedCount,realProjectEstimatesAccepted:0,publicationPerformed:false};
}
export const verifyPlacementMaterials28R1=(parents:readonly Parent[])=>verifyPlacementMaterialModelsR1(parents,build,28);
async function main(){const context=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/u,''));assert.equal(context.status,'PASS_READ_ONLY_PLACEMENT28_CURRENT_FULL_PARENTS');const result=await verifyPlacementMaterials28R1(context.parents);fs.writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,models:28}));}
if(process.argv[1]?.endsWith('verifyPlacementMaterials28R1.ts'))void main().catch(error=>{console.error(error);process.exitCode=1;});
