import {strict as assert} from 'node:assert';
import {createHash} from 'node:crypto';
import type {EmbeddedProjectMaterialParentR1 as Parent} from './embeddedProjectMaterialExpansionR1';

type Json=Record<string,any>;
export const foundationSpecialPaymentThreeContractR1='rik-expo-app.foundation-special3-payment-boundaries.r1';
const prefix='canonical-work:base:concrete_foundation_interior_';
export const FOUNDATION_SPECIAL_PAYMENT3_CATALOG_IDS_R1=[prefix+'slab_foundation_pour_repair',prefix+'slab_foundation_pour_standard',prefix+'strip_foundation_pour_large_area'];
export const SLAB_TRANSPORT_PAYMENT_ROWS_R1=[
 {rowId:'slab-full:09:delivery:mixer-trips',group:'main_concrete',basis:'PER_TRIP'},
 {rowId:'slab-full:09:delivery:ready-mix-distance',group:'main_concrete',basis:'PER_M3_KM'},
 {rowId:'slab-full:09:equipment:mixer-truck-time',group:'main_concrete',basis:'PER_MACHINE_HOUR'},
 {rowId:'slab-full:02:delivery:soil-trips',group:'soil',basis:'PER_TRIP'},
 {rowId:'slab-full:02:equipment:soil-trucks',group:'soil',basis:'PER_MACHINE_HOUR'},
] as const;
const policy='Одна подтверждённая схема отдельной оплаты перевозки. Выбранный тариф охватывает всю указанную перевозку; альтернативные единицы оплаты не суммируются. Смешанный тариф требует отдельного согласования состава.';
const policyHash=createHash('sha256').update(policy).digest('hex');

/** A narrow successor of each actual parent, without replacing its full-cycle
 * quantities, preliminary profile, normative bindings or primary measure. */
export function buildFoundationSpecialPaymentThreeR1(parent:Parent){
 const catalogId=parent.definition.catalog_id;assert(FOUNDATION_SPECIAL_PAYMENT3_CATALOG_IDS_R1.includes(catalogId));
 const slab=catalogId.includes('_slab_foundation_');
 assert.equal(parent.resources.length,slab?109:38);assert.equal(parent.formulas.length,slab?127:16);assert.equal(parent.parameters.length,slab?79:26);
 assert.equal(parent.definition.definition_version,catalogId.endsWith('slab_foundation_pour_standard')?7:8);
 const parameters:Array<Parent['parameters'][number]&{ordinal?:number;title_ru?:string}>=structuredClone([...parent.parameters]);
 const formulas=structuredClone([...parent.formulas]),resources=structuredClone([...parent.resources]);
 const changedPriceRowIds:string[]=[],newParameterIds:string[]=[];
 if(slab){
  for(const group of ['main_concrete','soil']){
   const name=group==='main_concrete'?'доставки основного бетона':'вывоза грунта',base=`slab_${group}_transport_`;
   for(const reference of [false,true]){
    const id=base+(reference?'price_scope_reference':'pricing_basis');newParameterIds.push(id);
    parameters.push({parameter_id:id,ordinal:parameters.length,value_type:reference?'text':'enum',unit_id:null,
     title_ru:reference?`Подтверждение тарифа и состава ${name}`:`Единственная схема оплаты ${name}`,required:true,default_value:null,
     constraints_json:reference?{minLength:1}:{values:group==='main_concrete'?['PER_TRIP','PER_M3_KM','PER_MACHINE_HOUR']:['PER_TRIP','PER_MACHINE_HOUR']},
     truth_metadata:{contract:foundationSpecialPaymentThreeContractR1,semantic_parameter_key:`${catalogId}:${id}`,synthetic:false,visibility_role:'USER_INPUT',
      value_source_role:'PROJECT_DEFINED',input_origin_class:'CONFIRMED_PROJECT_TARIFF',runtime_profile_value:false,hidden_default_forbidden:true,source_confirmation_required:true,
      guide:{guide_kind:reference?'PROJECT_DEFINED':'ENUM_DECISION_RULE',guide_short_ru:policy,source_role:'PROJECT_CONTRACT_PAYMENT_BOUNDARY',guide_version:foundationSpecialPaymentThreeContractR1,
       source_snapshot_hash:policyHash,applicability:'Только соответствующая отдельно оплачиваемая перевозка в этой смете.',verified_at:'2026-10-17T00:00:00Z'}}});
   }
  }
  for(const rule of SLAB_TRANSPORT_PAYMENT_ROWS_R1){
   const row=resources.find(r=>r.row_id===rule.rowId)!;assert(row);assert.equal(row.resource_graph.costTreatment,'OWN_COST');
   assert.deepEqual(row.inclusion_ast,{kind:'literal',value:true});
   const selector=`slab_${rule.group}_transport_pricing_basis`,reference=`slab_${rule.group}_transport_price_scope_reference`;
   row.inclusion_ast={kind:'equals',parameterId:selector,value:rule.basis};
   const previousInputs=row.resource_graph.inputParameterIds;assert(previousInputs==null||Array.isArray(previousInputs));
   row.resource_graph={...row.resource_graph,inputParameterIds:[...new Set([...(previousInputs as string[]??[]),selector,reference])]};
   row.source_metadata={...row.source_metadata,automaticGenericPriceInheritanceAllowed:false,priceScopeRu:policy};changedPriceRowIds.push(row.row_id);
  }
 }else{
  const operator=resources.find(r=>r.row_id==='strip-pour:included:vibrator-operator')!;assert(operator);
  assert.equal(operator.resource_graph.parentCostOwnerId,'strip-pour:equipment:vibrator');
  operator.resource_graph={...operator.resource_graph,parentCostOwnerId:'strip-pour:work:consolidate',includedInResourceOwnerRowId:'strip-pour:work:consolidate',costTreatment:'INCLUDED_IN_RESOURCE_ROWS',costOwner:'scope',payable:false};operator.procurement_eligible=false;
  for(const row of resources.filter(r=>r.resource_graph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS')){
   assert(row.resource_graph.parentCostOwnerId);row.resource_graph={...row.resource_graph,includedInResourceOwnerRowId:row.resource_graph.parentCostOwnerId};
  }
  const scopes:Record<string,string>={
   'strip-pour:work:consolidate':'Послойное виброуплотнение, включая труд оператора. Вибратор и его эксплуатационные расходные материалы оплачиваются отдельной позицией механизма.',
   'strip-pour:equipment:vibrator':'Глубинный вибратор и включённые эксплуатационные расходные материалы. Труд оператора включён в работу по виброуплотнению и повторно в ставке механизма не оплачивается.',
  };
  for(const [id,scope] of Object.entries(scopes)){
   const row=resources.find(r=>r.row_id===id)!;assert(row);row.title_ru=scope;
   row.source_metadata={...row.source_metadata,priceScopeRu:scope,automaticGenericPriceInheritanceAllowed:false};changedPriceRowIds.push(id);
  }
 }
 return {contract:foundationSpecialPaymentThreeContractR1,catalogId,titleRu:String(parent.definition.passport.canonicalRuName),
  primaryMeasureParameterId:slab?'slab_area_m2':'plan_dimension_concrete_volume_m3',parameters,formulas,resources,newParameterIds,changedPriceRowIds,
  unchangedResourceIds:resources.filter(r=>JSON.stringify(r)===JSON.stringify(parent.resources.find(p=>p.row_id===r.row_id))).map(r=>r.row_id)};
}
