import pack from '../../../../data/estimate-benchmarks/source-packs/masonry-m50-effective-lift-correction-r4.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasonryCeramic250WholeFamilySuccessorR2,MASONRY_CERAMIC250_WHOLE_FAMILY_COMPOSITION_R2 as whole,masonryCeramic250FamilyIdR2 as familyId} from './masonryCeramic250WholeFamilyCompositionR2';
import {MASONRY_M50_WHOLE_CYCLE_R2 as supply,masonryM50CycleIdR2 as id,masonryM50CycleRowR2 as supplyRow} from './masonryReadyM50WholeSupplyCycleR2';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileFormulaGraph} from '../backendPlatform/formulaGraph';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput,type CanonicalEstimateParameterDefinition,type CanonicalEstimateFormulaDefinition,type CanonicalEstimateResourceDefinition} from '../backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

// Opaque inherited publisher records remain at the existing legacy boundary.
import type {CanonicalPublisherJson as Json} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
export const MASONRY_M50_EFFECTIVE_LIFT_R4=pack;
export const m50LiftRowR4=(key:string)=>pack.prefix+':'+key;
export const m50LiftIdR4=(key:string)=>'m50lift4_'+key.replaceAll('-','_');
const check=(value:unknown,code:string):void=>{if(!value)throw Error('MASONRY_M50_EFFECTIVE_LIFT_R4_'+code);};
const rehash=(value:Json):Json=>{const{row_sha256:_old,...body}=value;return{...body,row_sha256:hash(body)};};
const declaration=(value:Json):Json=>Object.fromEntries(Object.entries(value).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));

/** Same tested maker physical expression, reusable for a compatible mortar
 * quantity owner. It carries no M50 consumption or financial rate. */
export function masonryThreeBoxEffectiveMassExpressionR4(effective:string,density:string):string{
 if(![effective,density].every(value=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)))throw Error('MASONRY_EFFECTIVE_MASS_PARAMETER_ID');
 return 'min('+effective+',3*min(0.25,500/'+density+'))*'+density+'+3*45';
}

/** Exact adapter over the frozen source composer. It changes no historical
 * definition, source norm, paid quantity, binding or common compiler contract. */
export function buildMasonryCeramic250EffectiveLiftSuccessorR4(parent:Rep):Rep{
 check(parent.definition.id===pack.parentDefinitionId&&parent.definition.definition_sha256===pack.parentDefinitionSha256,'EXACT_PARENT');
 const result=buildMasonryCeramic250WholeFamilySuccessorR2(parent);
 const effective=pack.effectiveMortarParameterId;
 const owner=result.resources.find(resource=>resource.row_id===pack.mortarRowId);
 const input=result.parameters.find(parameter=>parameter.parameter_id===effective);
 check(owner?.resource_graph.effectiveQuantityOutputV1?.parameterId===effective&&owner.resource_graph.effectiveQuantityOutputV1.unitId==='m3','EXACT_EFFECTIVE_MORTAR_OWNER');
 check(input?.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'&&input.unit_id==='m3'&&input.truth_metadata.effective_resource_quantity_v1?.sourceRowId===pack.mortarRowId,'EXACT_DERIVED_MORTAR_PARAMETER');
 const processIds=new Set(supply.operations.map(operation=>supplyRow('formula:operation:'+operation.key)));
 let replaced=0;
 result.formulas=result.formulas.map(formula=>{
  if(!processIds.has(formula.formula_id))return formula;
  check(formula.output_unit_id==='m3'&&formula.expression_source.includes('0.234'),'EXACT_NOMINAL_PROCESS_PREIMAGE');
  const compiled=compileFormulaGraph(effective);replaced++;
  return{...formula,expression_source:effective,ast:compiled.ast,input_parameter_ids:compiled.inputParameterIds,ast_sha256:hash(compiled.ast)};
 });
 check(replaced===8,'ALL_EIGHT_PROCESS_VOLUMES');
 // These checks were evaluated before resource-derived outputs existed.
 // Only the new post-derivation controls below own the mass comparisons.
 const obsoleteBounds=new Set(['upper_allowable_kg','crane_available_kg','waste_mortar_kg'].map(id));
 result.parameters=result.parameters.map(parameter=>{
  if(!obsoleteBounds.has(parameter.parameter_id))return parameter;
  const{forbiddenWhen:_old,...constraints}=parameter.constraints_json;
  return{...parameter,constraints_json:constraints};
 });
 const baseFeed=result.resources.find(resource=>resource.row_id===supplyRow('operation:feed'));
 check(baseFeed,'SOURCE_FLOW_ACTIVATION');
 const active=structuredClone(baseFeed!.inclusion_ast);
 const returned=m50LiftIdR4('effective_return_kg'),waste=m50LiftIdR4('effective_waste_kg');
 const ordinaryIds=[effective,id('density_kg_m3'),id('upper_mass_kg'),id('upper_allowable_kg'),id('crane_available_kg'),id('adoption_reference'),id('handler_reference'),id('crane_reference'),id('return-waste_reference')];
 const external:AutomaticParameterSpec[]=ordinaryIds.map(parameterId=>{
  const found=result.parameters.find(parameter=>parameter.parameter_id===parameterId);check(found,'EXTERNAL:'+parameterId);
  return{id:parameterId,title:found!.title_ru,valueType:found!.value_type,unitId:found!.unit_id,kind:'ordinary'} as AutomaticParameterSpec;
 });
 const internal:AutomaticParameterSpec[]=[
  {id:returned,title:'Сохранённое количество возврата готового раствора',valueType:'decimal',unitId:'kg',kind:'internal',effectiveQuantitySourceRowId:supplyRow('returned-mortar')},
  {id:waste,title:'Сохранённое количество отходов готового раствора',valueType:'decimal',unitId:'kg',kind:'internal',effectiveQuantitySourceRowId:supplyRow('waste-mortar')}
 ];
 const density=id('density_kg_m3');
 const boxes=masonryThreeBoxEffectiveMassExpressionR4(effective,density);
 const controlSpecs=[
  {key:'upper-load',title:'Контроль допустимой нагрузки грузозахвата',expression:'max(0,('+boxes+')-'+id('upper_allowable_kg')+')',facts:[id('adoption_reference'),id('handler_reference')],reason:'Масса трёх ящиков с фактическим количеством раствора превышает допустимую нагрузку полного грузозахвата в принятой схеме.'},
  {key:'crane-load',title:'Контроль допустимой нагрузки на крюк крана',expression:'max(0,('+boxes+')+'+id('upper_mass_kg')+'-'+id('crane_available_kg')+')',facts:[id('adoption_reference'),id('crane_reference')],reason:'Масса раствора, трёх ящиков и полного грузозахвата превышает доступную грузоподъёмность крана по принятой характеристике.'},
  {key:'return-balance',title:'Контроль возврата и отходов готового раствора',expression:'max(0,'+returned+'+'+waste+'-'+effective+'*'+density+')',facts:[id('adoption_reference'),id('return-waste_reference')],reason:'Сохранённая масса возврата и отходов превышает массу фактического количества готового раствора.'}
 ];
 const rows:AutomaticRowSpec[]=controlSpecs.map(control=>({rowId:m50LiftRowR4(control.key),formulaId:m50LiftRowR4('formula:'+control.key),section:'Приёмка, подача и возврат готового кладочного раствора',title:control.title,category:'service',unitId:'kg',expression:control.expression,inputParameterIds:control.facts,costTreatment:'INFORMATIONAL_SCOPE',procurement:false,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg',minimum:0,maximum:0,reasonRu:control.reason}}));
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:'SOURCE_PHYSICAL_LIMITS_AND_EFFECTIVE_RESOURCE_QUANTITY_NOT_A_NEW_RATE',sourceMetadata:{source_title:'Контроль фактической нагрузки растворного цикла',source_document_version:'Corrective adapter r4; original maker and method editions preserved',definition_hash:pack.makerEvidence.sha256,artifact_sha256:pack.makerEvidence.sha256,exact_locator:pack.makerEvidence.locator},applicabilityRu:'Точный последовательный растворный цикл с тремя ящиками по исходным паспортам. Проверки используют сохранённые эффективные количества; новые нормы и факты не создаются.',ordinary:[...external,...internal],profile:[],conditional:[],rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['No nominal mortar demand after explicit amendment','No new crane curve or rate','No source completeness or FULL from load checks']});
 for(const parameter of built.parameters.filter(parameter=>internal.some(item=>item.id===parameter.parameter_id)))result.parameters.push({...declaration(parameter),required:false,default_value:null,ordinal:result.parameters.length});
 for(const formula of built.formulas)result.formulas.push({...declaration(formula),ordinal:result.formulas.length});
 for(const resource of built.resources){
  const key=resource.row_id.slice(pack.prefix.length+1),control=controlSpecs.find(item=>item.key===key)!;
  const formula=built.formulas.find(item=>item.formula_id===resource.formula_id)!;
  const requiredFacts=[...new Set([...formula.input_parameter_ids,...control.facts])];
  result.resources.push(rehash({...declaration(resource),ordinal:result.resources.length,inclusion_ast:active,resource_graph:{...resource.resource_graph,
   scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:pack.prefix,groupTitleRu:'Контроль растворного цикла',titleRu:control.title,reasonRu:'Проверку фактической нагрузки и баланса нельзя исключить отдельно от выбранного растворного цикла.',exactScopeWhen:active,sourceEvidence:[pack.makerEvidence,pack.methodEvidence],coveringRowIds:[],originalRowIds:[pack.mortarRowId],objectFactParameterId:id('adoption_reference'),unknownObjectValues:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:requiredFacts},
   derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'kg',parameterIds:formula.input_parameter_ids,reasonRu:'Контроль вычисляется из сохранённого количества раствора и документированных характеристик; ручная правка строки не отменяет проверку формулы.'},
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:'Контроль растворного цикла',operationId:m50LiftRowR4('operation:'+key),operationTitleRu:control.title,processOrdinal:35,completionCriterionRu:'Фактическая нагрузка и баланс соответствуют подтверждённым характеристикам.'}
  },source_metadata:{...resource.source_metadata,sourceRole:'MANDATORY_POST_DERIVATION_PHYSICAL_CONTROL',source_artifact_sha256:pack.makerEvidence.sha256,method_source_artifact_sha256:pack.methodEvidence.sha256,effectiveMortarOwnerRowId:pack.mortarRowId,noNewFinancialNorm:true,newPaidOwner:false,newProcurementOwner:false,full_technical_acceptance:false}}));
 }
 result.resources=result.resources.map(resource=>{
  const output=resource.row_id===supplyRow('returned-mortar')?returned:resource.row_id===supplyRow('waste-mortar')?waste:null;
  if(output)return rehash({...resource,resource_graph:{...resource.resource_graph,effectiveQuantityOutputV1:{parameterId:output,unitId:'kg'}}});
  if(processIds.has(resource.formula_id))return rehash({...resource,source_metadata:{...resource.source_metadata,quantityBasis:'RETAINED_EFFECTIVE_MORTAR_OUTPUT_NOT_NOMINAL_GEOMETRY',effectiveMortarOwnerRowId:pack.mortarRowId}});
  return resource;
 });
 // Only declarations authored by the unsealed R2 components are reclassified.
 // Historical parent inputs retain their identity and semantics. The source
 // profile is still incomplete: moving its records out of the public editor
 // neither supplies missing developer norms nor grants whole-cycle readiness.
 const oldIds=new Set(parent.parameters.map(parameter=>parameter.parameter_id));
 const passportIds=new Set([...['upper_mass_kg','upper_allowable_kg','crane_available_kg'].map(id),...['panel_handler_mass_kg','panel_handler_allowable_kg','panel_crane_available_kg','receiver_payload_kg'].map(familyId)]);
 for(const parameter of result.parameters){
  if(oldIds.has(parameter.parameter_id)||!/^m(?:50c2|cf2)_/.test(parameter.parameter_id))continue;
  const sourceRole=parameter.parameter_id===supply.selectorId||parameter.parameter_id===whole.selectorId?'SOURCE_BACKED_PRELIMINARY_PROFILE':passportIds.has(parameter.parameter_id)?'SELECTED_EQUIPMENT_PASSPORT':parameter.parameter_id===id('density_kg_m3')?'MANUFACTURER_CONFIRMED':parameter.parameter_id.endsWith('_reference')?'PROJECT_DOCUMENTATION':'SITE_SURVEY';
  parameter.default_value=null;
  parameter.truth_metadata={...parameter.truth_metadata,visibility_role:'INTERNAL_ONLY',value_source_role:sourceRole,source_confirmation_required:true,runtime_profile_value:false,hidden_default_forbidden:true,provenance:{...parameter.truth_metadata.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL',input_channel_v1:'CONFIRMED_SOURCE_OR_OBJECT_IMPORT_NOT_CONSUMER_FORM',unresolved_source_facts_not_ready_profile:true},guide:{...parameter.truth_metadata.guide,guide_kind:'PROJECT_DEFINED',source_role:sourceRole,guide_short_ru:'Внутреннее значение выбранной технологии из привязанного первичного источника или отдельного документа объекта. Обычная форма его не запрашивает. Неизвестное значение остаётся неизвестным и не доказывает полноту технологии.'}};
 }
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const key=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[key],resource_branch_consumers:consumers.resourceConsumers[key]};result.baseline.formula_consumer_ids[key]=consumers.formulaConsumers[key];result.baseline.resource_consumer_row_ids[key]=consumers.resourceConsumers[key];result.baseline.uom_by_parameter[key]=parameter.unit_id;result.baseline.guide_provenance_ru[key]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;if(!oldIds.has(key)&&internal.some(item=>item.id===key))result.baseline.normative_source_ids[key]=[pack.sourceId];}
 const completeness=structuredClone(result.passport.decision.independentCompletenessMap);
 for(const resource of built.resources)completeness.entries.push({expectedResourceId:m50LiftRowR4('expected:'+resource.row_id.slice(pack.prefix.length+1)),operationId:m50LiftRowR4('operation:'+resource.row_id.slice(pack.prefix.length+1)),requiredOperationIds:[m50LiftRowR4('operation:'+resource.row_id.slice(pack.prefix.length+1))],sourceId:pack.sourceId,category:'service',unitId:'kg',specification:resource.title_ru,quantityRule:'MANDATORY_ZERO_EXCESS_FROM_EFFECTIVE_MORTAR_AND_ACTUAL_LIMITS',formulaId:resource.formula_id,resolution:{kind:'ROW',rowId:resource.row_id}});
 result.definition.applicability={...result.definition.applicability,masonryM50EffectiveLiftCorrectionR4:{contract:pack.contract,effectiveMortarParameterId:effective,mandatoryPhysicalControls:3,unknownReturnsRemainUnknown:true,fullTechnicalAcceptance:false}};
 result.passport.decision={...result.passport.decision,independentCompletenessMap:completeness,masonryM50EffectiveLiftCorrectionR4:{contract:pack.contract,sourceOnly:true,newPaidOwners:0,newProcurementOwners:0,closedOldNeeds:0,full:0}};
 return result;
}

/** Uses the existing common core. This thin test/admission entry point adds
 * composition-selection transport that the R2 helper does not expose. */
export function compileMasonryM50EffectiveLiftR4(model:Rep,parameters:Record<string,unknown>,options:Partial<Pick<CanonicalEstimateCompileCoreInput,'rowOverrides'|'compositionSelectionV1'|'confirmedParameters'>>={}){
 // The common compiler already separates trusted source/object imports from
 // submitted form values. This test/admission transport is not an import UI.
 const confirmedParameters=options.confirmedParameters??{};
 const selectedNewScope=(parameters[supply.parentSelector]??confirmedParameters[supply.parentSelector])===supply.parentSelectedValue;
 return compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:model.definition.catalog_id,primaryMeasureParameterId:selectedNewScope?'m33_masonry_wall_length_m':'measured_net_brick_wall_area_m2',parameterDefinitions:model.parameters as CanonicalEstimateParameterDefinition[],formulaDefinitions:model.formulas as CanonicalEstimateFormulaDefinition[],resourceDefinitions:model.resources as CanonicalEstimateResourceDefinition[],submittedParameters:parameters,confirmedParameters,rowOverrides:options.rowOverrides??{},compositionSelectionV1:options.compositionSelectionV1,priceItems:[],currencyCode:'KGS',maximumResourceRows:model.resources.length,hashJson:hash});
}
