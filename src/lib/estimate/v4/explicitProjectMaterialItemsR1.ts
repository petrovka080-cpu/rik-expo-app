/** Shared per-material quantities and one confirmed payment owner; no default facts. */
import {buildAutomaticConstructionOwnerR1, type AutomaticParameterSpec, type AutomaticRowSpec, type AutomaticInclusionCondition} from './automaticConstructionOwnerR1';
import {effectivePurchaseBalanceExpressionsR1} from './effectivePurchaseBalanceR1';
import type {CanonicalEstimateParameterDefinition as Parameter} from '../backendPlatform/canonicalEstimateCompileCore';
type Json = Record<string, unknown>;
const equals=(parameterId:string,value:string):AutomaticInclusionCondition=>({kind:'equals',parameterId,value});
const and=(...operands:AutomaticInclusionCondition[]):AutomaticInclusionCondition=>({kind:'and',operands});
export type ExplicitProjectMaterialPositionR1 = Readonly<{key:string;titleRu:string;unitId:string}>;
export type ExplicitProjectIncludedOwnerR1 = Readonly<{condition:AutomaticInclusionCondition;ownerRowId:string;titleRu:string}>;
export type ExplicitProjectMaterialItemsOptionsR1 = Readonly<{separateSupplyAllowed?:boolean}>;

/** Remove only the aggregate kit payment selector. Existing operation and
 * selected equipment-owner conditions remain the accepted shared predicates. */
function withoutAggregateKitPayment(condition:AutomaticInclusionCondition):AutomaticInclusionCondition|null {
 if(condition.kind==='equals'&&condition.parameterId.endsWith('_accessories_pricing_mode'))return null;
 if(condition.kind==='and'||condition.kind==='or'){
  const operands=condition.operands.map(withoutAggregateKitPayment).filter((v):v is AutomaticInclusionCondition=>v!==null);
  return operands.length===0?null:operands.length===1?operands[0]!:({...condition,operands});
 }
 return condition;
}
export function requireExplicitMaterialOperationR1(condition:AutomaticInclusionCondition):AutomaticInclusionCondition {
 const result=withoutAggregateKitPayment(condition);if(!result)throw Error('FOUNDATION_ITEM_OPERATION_CONDITION_REQUIRED');return result;
}
export function buildExplicitProjectMaterialItemsR1(catalogId:string,key:string,active:AutomaticInclusionCondition,included:readonly ExplicitProjectIncludedOwnerR1[],
 sourceParameters:readonly Parameter[],positions:readonly ExplicitProjectMaterialPositionR1[],sourceGuideSha256:string,options:ExplicitProjectMaterialItemsOptionsR1={}) {
 const separateSupplyAllowed=options.separateSupplyAllowed!==false;
 const effectiveOwners=[...included,...(separateSupplyAllowed?[null]:[])];
 if(!effectiveOwners.length)throw Error('FOUNDATION_ITEM_INCLUDED_ONLY_OWNER_REQUIRED');
 const conditional:AutomaticParameterSpec[]=[];const rows:AutomaticRowSpec[]=[];
 const includedOwnerPaymentGuards=new Map<string,Json>();
 const referenced=new Set<string>();
 const collect=(value:unknown):void=>{if(!value||typeof value!=='object')return;if(Array.isArray(value)){value.forEach(collect);return;}
  const object=value as Json;if(typeof object.parameterId==='string')referenced.add(object.parameterId);Object.values(object).forEach(collect);};
 collect([active,included.map(v=>v.condition)]);
 const ordinary:AutomaticParameterSpec[]=[...referenced].map(id=>{const old=sourceParameters.find(p=>p.parameter_id===id);if(!old)throw Error('FOUNDATION_BOM_CONDITION_INPUT_MISSING:'+id);
  return {id,title:'Существующее условие конкретной подработы',valueType:old.value_type==='boolean'?'enum':old.value_type as AutomaticParameterSpec['valueType'],unitId:old.unit_id??null,kind:'ordinary'};});
 for(const item of positions){
  const prefix='foundation_item_'+key+'_'+item.key,choice=prefix+'_applicability',name=prefix+'_designation',quantity=prefix+'_quantity',payment=prefix+'_payment_mode';
  const scope=prefix+'_price_scope_reference',stock=prefix+'_stock',reserve=prefix+'_reserve',quantum=prefix+'_supplier_quantum';
  const applicable=and(active,equals(choice,'REQUIRED_BY_APPROVED_PROJECT'));
  const separateMode='Материал поставляется и оплачивается отдельными позициями';
  const includedModes=included.map(owner=>'Включено в подтверждённую ставку: '+owner.titleRu);
  if(new Set(includedModes).size!==includedModes.length)throw Error('FOUNDATION_ITEM_OWNER_LABEL_AMBIGUOUS');
  const payable=and(applicable,equals(payment,separateMode));
  if(included.length)includedOwnerPaymentGuards.set(payment,{kind:'or',operands:included.map((owner,index)=>({
   kind:'and',operands:[applicable,equals(payment,includedModes[index]!),{kind:'not',operand:owner.condition}],
  }))});
  const parameter=(id:string,title:string,valueType:AutomaticParameterSpec['valueType'],unitId:string|null,condition:AutomaticInclusionCondition,extra:Partial<AutomaticParameterSpec>={}):AutomaticParameterSpec=>({id,title,valueType,unitId,kind:'conditional',requiredWhen:condition,...extra});
  conditional.push(parameter(choice,item.titleRu+': применимость по утверждённому методу','enum',null,active,{values:['NOT_REQUIRED_BY_APPROVED_PROJECT','REQUIRED_BY_APPROVED_PROJECT']}),
   parameter(payment,item.titleRu+': собственный подтверждённый режим оплаты этой позиции','enum',null,applicable,{values:[...includedModes,...(separateSupplyAllowed?[separateMode]:[])]}),
   parameter(name,item.titleRu+': полное проектное наименование, подтверждённые типоразмер/марка/совместимость','text',null,applicable),
   parameter(quantity,item.titleRu+': фактическое количество этой позиции по ведомости',item.unitId==='piece'?'integer':'decimal',item.unitId,applicable,{min:item.unitId==='piece'?1:0.001}),
   parameter(scope,item.titleRu+': подтверждённый источник и граница оплаты именно этой позиции; без повторно учтённых изделий, энергии и оператора','text',null,applicable));
  if(separateSupplyAllowed)conditional.push(
   parameter(stock,item.titleRu+': фактически имеющееся количество, неизвестное не равно нулю',item.unitId==='piece'?'integer':'decimal',item.unitId,payable,{min:0}),
   parameter(reserve,item.titleRu+': подтверждённый резерв',item.unitId==='piece'?'integer':'decimal',item.unitId,payable,{min:0}),
   parameter(quantum,item.titleRu+': подтверждённая кратность заказа поставщика',item.unitId==='piece'?'integer':'decimal',item.unitId,payable,{min:item.unitId==='piece'?1:0.001}));
  for(const [index,owner] of effectiveOwners.entries()){
   const own=owner===null,condition=owner?and(owner.condition,equals(payment,includedModes[index]!)):equals(payment,separateMode);
   const rowId='material:concrete:foundation-item-'+key+'-'+item.key+'-'+(own?'separate':'included-'+index);
   const balance=own?effectivePurchaseBalanceExpressionsR1({ownerRowId:rowId,orderUnitId:item.unitId,consumed:quantity,stock,reserve,quantum}):null;
   const orderExpression=`ceil(max(0,${quantity}+${reserve}-${stock})/${quantum})*${quantum}`;
   rows.push({rowId,formulaId:'foundation_item_'+key+'_'+item.key+'_'+index+'_actual_v1',expression:own?orderExpression:quantity,section:item.titleRu,category:'material',title:item.titleRu,
    unitId:item.unitId,procurement:own,costTreatment:own?'OWN_COST':'INCLUDED_IN_RESOURCE_ROWS',inclusion:and(applicable,condition),
    inputParameterIds:[name,quantity,payment,scope,...(own?[stock,reserve,quantum]:[])],titleParameterIds:[name],
    ...(balance?{purchaseBalance:balance.owner.purchaseBalance,effectiveQuantityOutput:balance.owner.effectiveQuantityOutput}:{})});
  }
 }
 const addition=buildAutomaticConstructionOwnerR1({contract:'foundation-explicit-project-material-items/r2',semanticOwner:catalogId,
  sourceId:'project_foundation_itemised_material_takeoff',normId:'direct-project-physical-item-not-a-universal-norm',
  sourceMetadata:{source_title:'Утверждённая проектная поштучная ведомость материалов конкретной подработы',source_document_version:'project-defined-individual-item-owner-no-defaults',definition_hash:sourceGuideSha256,artifact_sha256:sourceGuideSha256,exact_locator:'Каждая применимая позиция отдельно: полное наименование, единица, фактическое количество, собственный подтверждённый владелец и режим оплаты; наличие, резерв и кратность отдельной поставки.'},
  applicabilityRu:'Смешанные режимы оплаты допускаются в одной подработе; включение отдельной позиции подтверждается у конкретного существующего владельца. Общий selector комплекта не управляет позицией.',ordinary,profile:[],conditional,rows,deferMissingProjectFactsToRows:true,
  excludedUnownedAssumptions:['material automatically required','unknown stock equals zero','generic old price compatibility','invented supplier SKU or grade','aggregate kit payment decides each physical item']});
 // Use the existing persisted JSON conditional constraint after the shared
 // factory. Unknown owner facts remain unknown; inactive items stay allowed.
 const guardedParameters=addition.parameters.map(parameter=>{
  const forbiddenWhen=includedOwnerPaymentGuards.get(parameter.parameter_id);if(!forbiddenWhen)return parameter;
  const constraints=parameter.constraints_json??{};
  return {...parameter,constraints_json:{...constraints,forbiddenWhen:constraints.forbiddenWhen
   ?{kind:'or',operands:[constraints.forbiddenWhen,forbiddenWhen]}:forbiddenWhen}};
 });
 return {...addition,parameters:guardedParameters,resources:addition.resources.map((r,i)=>{
  const branchIndex=i%effectiveOwners.length,position=positions[Math.floor(i/effectiveOwners.length)]!;
  const actualOwner=effectiveOwners[branchIndex]?.ownerRowId??null;
  return {...r,resource_graph:{...r.resource_graph,...(actualOwner?{includedInResourceOwnerRowId:actualOwner}:{}),materialPositionIsExplicit:true,
   individualMaterialPaymentV1:{paymentParameterId:'foundation_item_'+key+'_'+position.key+'_payment_mode',priceScopeParameterId:'foundation_item_'+key+'_'+position.key+'_price_scope_reference',aggregateSelectorInherited:false,confirmedIncludedOwnerRowIds:included.map(owner=>owner.ownerRowId)}},
   source_metadata:{...r.source_metadata,automaticGenericPriceInheritanceAllowed:false,projectTakeoffNotNorm:true,universal_consumption_claimed:false,universal_productivity_claimed:false}};})};
}
