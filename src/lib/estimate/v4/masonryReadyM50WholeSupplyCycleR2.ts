import pack from '../../../../data/estimate-benchmarks/source-packs/masonry-ready-m50-whole-supply-cycle-r2.json';
import passport from '../../../../data/estimate-benchmarks/fixtures/masonry-family-brick-current-passport-r2.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {compileMaster33MasonryR1} from './master33MasonryWallSystemsR1';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';

type Json=Record<string,any>;
const fixture=require('../../../../data/estimate-benchmarks/fixtures/masonry-family-brick-current-parent-r2.json') as Json;
const copy=<T,>(value:T):T=>structuredClone(value);
const check=(condition:unknown,code:string):void=>{if(!condition)throw Error('MASONRY_M50_WHOLE_CYCLE_R2_'+code);};
const decl=(value:Json):Json=>Object.fromEntries(Object.entries(value).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));
const rehash=(value:Json):Json=>{const{row_sha256:_old,...body}=value;return{...body,row_sha256:hash(body)};};
const selected=(parameterId:string,value:string)=>({kind:'selected',parameterId,value});
const and=(...operands:Json[])=>({kind:'and',operands});
export const MASONRY_M50_WHOLE_CYCLE_R2=pack;
export const masonryM50CycleIdR2=(key:string)=>'m50c2_'+key.replaceAll('-','_');
export const masonryM50CycleRowR2=(key:string)=>pack.prefix+':'+key;
const wall='(m33_masonry_wall_length_m*m33_masonry_wall_height_m-m33_masonry_openings_area_m2)*0.25-m33_masonry_nonmasonry_insert_volume_m3';
const mortar='('+wall+')*0.234';
const density=masonryM50CycleIdR2('density_kg_m3');
const boxUsableVolume='min(0.25,500/'+density+')';
// Source capacities give a physical upper bound, not a mortar-use coefficient,
// productivity norm, dispatch schedule or actual crane curve.
const worstLiftBoxesMass='min(('+mortar+'),3*('+boxUsableVolume+'))*'+density+'+3*45';
const active=and(selected(pack.parentSelector,pack.parentSelectedValue),selected(pack.selectorId,pack.selectorValue),{kind:'formula_greater_than',expression:wall,unitId:'m3',value:0});

export function assertMasonryM50CycleSourceR2(value:typeof pack=pack):void{
 check(value.source.sha256==='9f86c3fffc6471afcd249960e89e0cd4433ac4187098f04a21efd15fe0a4ad62','EXACT_MAKER_ORIGINAL');
 check(value.methodSource.sha256==='f5db7d0913d2d5f57634fb587a37fbccb61f9dda1787046fe13c30b096fe5b10','EXACT_KZ_METHOD');
 check(value.box.capacityM3==='0.25'&&value.box.payloadKg==='500'&&value.box.emptyMassKg==='45'&&value.box.chosenGarlandBoxes==='3'&&value.box.maxMakerGarlandBoxes==='5'&&value.box.minimumEyeSectionMm==='17'&&value.box.dimensionsMm.join('|')==='1300|600|400','EXACT_BOX_AND_GARLAND');
 check(value.roster.map(row=>[row.key,row.quantity,row.unitId].join('|')).join(';')==='boxes|3|piece;upper-handler|1|set;crane|1|piece;shovels|2|piece;trowels|2|piece;caliper|1|piece;riggers|2|person;crane-operator|1|person;helper|1|person','WHOLE_DECLARED_ROSTER');
 check(value.operations.map(operation=>operation.key).join('|')==='receive|prepare|load|feed|receive-front|remix|clean|inspect','WHOLE_DECLARED_PROCESS');
 check(value.parentMortarRateM3PerM3==='0.234'&&value.boundary.parentNeedsClosed===0&&value.boundary.full===0&&!value.boundary.wholeFamilyReady&&value.boundary.newPaidOwners===0&&value.boundary.newProcurementOwners===0,'NO_PARENT_NORM_REPLACEMENT_OR_FALSE_FULL');
}

export function masonryM50CycleCapturedRepresentativeR2():Rep{
 const source=copy(fixture),ids=new Map(source.resources.map((row:Json)=>[row.id,row.row_id]));
 return{definition:source.definition,baseline:source.baseline,parameters:source.parameters,formulas:source.formulas,resources:source.resources,passport:copy(passport),bindings:source.bindings.map((binding:Json)=>({row_id:ids.get(binding.resource_spec_id),locator_id:binding.locator_id,applicability:binding.applicability}))};
}

function buildCyclePart(parent:Rep){
 assertMasonryM50CycleSourceR2();
 const externalIds=[...pack.geometryIds,pack.parentSelector,pack.incompatibleSelector];
 const external=externalIds.map(id=>{const parameter=parent.parameters.find(row=>row.parameter_id===id);check(parameter,'EXACT_PARENT_INPUT:'+id);return{id,title:parameter!.title_ru,valueType:parameter!.value_type,unitId:parameter!.unit_id,kind:'ordinary',...(parameter!.constraints_json?.values?{values:parameter!.constraints_json.values}:{}),...(parameter!.constraints_json?.min==null?{}:{min:parameter!.constraints_json.min})} as AutomaticParameterSpec;});
 const ordinary:AutomaticParameterSpec[]=[...external,{id:pack.selectorId,title:'Способ обеспечения готовым раствором',valueType:'enum',unitId:null,kind:'ordinary',values:[pack.noValue,pack.selectorValue]},
  ...pack.records.map(record=>({id:masonryM50CycleIdR2(record.key+'_reference'),title:record.titleRu,valueType:'text' as const,unitId:null,kind:'ordinary' as const})),
  ...pack.measurements.map(record=>({id:masonryM50CycleIdR2(record.key),title:record.titleRu,valueType:'decimal' as const,unitId:record.unitId,kind:'ordinary' as const,min:record.min}))];
 const id=masonryM50CycleIdR2,row=masonryM50CycleRowR2;
 const projectFacts=pack.records.filter(record=>record.key!=='return-waste').map(record=>id(record.key+'_reference'));
 const safetyMeasurements=pack.measurements.filter(record=>!['returned_mortar_kg','waste_mortar_kg'].includes(record.key)).map(record=>id(record.key));
 const spec=(key:string,title:string,category:string,unitId:string,expression:string,inputParameterIds:string[]=[]):AutomaticRowSpec=>({rowId:row(key),formulaId:row('formula:'+key),section:pack.titleRu,title,category,unitId,expression,inputParameterIds,costTreatment:'INFORMATIONAL_SCOPE',procurement:false});
 const specs:AutomaticRowSpec[]=[
  ...pack.roster.map(item=>spec(item.key,item.titleRu,item.category,item.unitId,item.quantity)),
  ...pack.operations.map(operation=>spec('operation:'+operation.key,operation.titleRu,'work','m3',mortar,[...projectFacts,...safetyMeasurements])),
  spec('returned-mortar','Возврат готового раствора по фактическому акту','material','kg',id('returned_mortar_kg'),[id('return-waste_reference')]),
  spec('waste-mortar','Отходы готового раствора по фактическому акту','material','kg',id('waste_mortar_kg'),[id('return-waste_reference')])];
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:pack.prefix,sourceId:pack.sourceId,normId:'KG08-02-001-07/08; maker/KZ physical method adaptation',sourceMetadata:{source_title:pack.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:pack.source.locator},
  applicabilityRu:'Один последовательный процесс подачи готового М50 тройкой точных ящиков 0,25 м³ с ручным перелопачиванием и очисткой кельмой; проектная адаптация. Реальная грузовая характеристика, полный верхний захват, доставка, защищённые места и смежные доступ/СИЗ подтверждаются собственными документами. Этот компонент не закрывает всё семейство.',
  ordinary,profile:[],conditional:[],rows:specs,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.boundary.notClaimed});
 const forbiddenCapacity=(expression:string)=>and(active,{kind:'formula_greater_than',expression,unitId:'kg',value:0});
 const parameters=built.parameters.map(parameter=>{
  if(externalIds.includes(parameter.parameter_id))return parameter;
  const isSelector=parameter.parameter_id===pack.selectorId,isAfterFact=[id('returned_mortar_kg'),id('waste_mortar_kg'),id('return-waste_reference')].includes(parameter.parameter_id);
  const forbidden=isSelector?and(selected(pack.selectorId,pack.selectorValue),{kind:'or',operands:[{kind:'not',operand:selected(pack.parentSelector,pack.parentSelectedValue)},selected(pack.incompatibleSelector,pack.incompatibleValue)]}):parameter.parameter_id===id('upper_allowable_kg')?forbiddenCapacity('('+worstLiftBoxesMass+')-'+id('upper_allowable_kg')):parameter.parameter_id===id('crane_available_kg')?forbiddenCapacity('('+worstLiftBoxesMass+')+'+id('upper_mass_kg')+'-'+id('crane_available_kg')):parameter.parameter_id===id('waste_mortar_kg')?forbiddenCapacity(id('waste_mortar_kg')+'+'+id('returned_mortar_kg')+'-('+mortar+')*'+density):undefined;
  return{...parameter,required:false,default_value:null,constraints_json:{...parameter.constraints_json,...(!isSelector&&!isAfterFact?{requiredWhen:active}:{}),...(forbidden?{forbiddenWhen:forbidden}:{})},truth_metadata:{...parameter.truth_metadata,visibility_role:'USER_INPUT',value_source_role:'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,preliminary_compilation_allowed:true,visible_when:isSelector?selected(pack.parentSelector,pack.parentSelectedValue):active,provenance:{consumer_input_role_v1:'OBJECT_FACT'},guide:{...(parameter.truth_metadata.guide as Json),guide_kind:'PROJECT_DEFINED',source_role:isSelector?'DECLARED_WORK_SCOPE':'PROJECT_DOCUMENTATION',source_document:isSelector?pack.sourceId:'ACTUAL_MASONRY_PPR_PRODUCT_SUPPLY_OR_MEASURED_RETURN_RECORD',source_snapshot_hash:pack.source.sha256,guide_short_ru:isSelector?'Отдельная полная последовательность подачи в точном профиле; выбор не доказывает выполнение или полноту кладки.':parameter.title_ru+': реальное свойство, проектный документ или измерение; это не коэффициент расхода и не подтверждение неизвестной нормы.'}}};
 });
 const resources=built.resources.map(resource=>{
  const key=resource.row_id.slice(pack.prefix.length+1),literal=pack.roster.find(item=>item.key===key),marker=key.startsWith('operation:'),actualReturn=['returned-mortar','waste-mortar'].includes(key);
  const operationKeys=literal?.operations??[marker?key.slice('operation:'.length):'clean'];
  const operation=(key:string)=>{const entry=pack.operations.find(value=>value.key===key)!;return{operationId:row('operation:'+entry.key),operationTitleRu:entry.titleRu,processOrdinal:entry.ordinal,completionCriterionRu:'Состав и физическая вместимость подтверждены первичными источниками; конкретное обеспечение и выполнение проверяются по отдельным документам объекта.'};};
  const operations=operationKeys.map(operation);
  return rehash({...resource,inclusion_ast:active,resource_graph:{...resource.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:pack.prefix,groupTitleRu:pack.titleRu,...operations[0],...(operations.length>1?{additionalOperations:operations.slice(1)}:{})},publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:resource.title_ru,nameRu:resource.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[]}},source_metadata:{...resource.source_metadata,sourceRole:actualReturn?'ACTUAL_MEASURED_MORTAR_RETURN_OR_WASTE':marker?'SOURCE_WHOLE_FLOW_OPERATION_SCOPE':'SOURCE_WHOLE_FLOW_PHYSICAL_ROSTER',exact_locator:literal?.locator??pack.methodSource.locator,source_artifact_sha256:pack.source.sha256,method_source_artifact_sha256:pack.methodSource.sha256,sourceLiteralQuantity:literal?.quantity??null,quantityBasis:actualReturn?'ACTUAL_OBJECT_RECORD_NOT_A_PER_M3_ALLOWANCE':marker?'RETAINED_KG_M50_VOLUME_PASSING_THROUGH_THE_DECLARED_PROCESS':'ONE_SEQUENTIAL_DECLARED_SOURCE_FRONT_NOT_PER_M3',sourceInventoryNotConsumption:!!literal,headcountNotLabourHours:literal?.unitId==='person',operationMarkerNotPhysicalInventoryCount:marker,actualQuantityNotAnAutomaticWasteFactor:actualReturn,initialProcurementHeld:true,automaticGenericPriceInheritanceAllowed:false,closedParentNeeds:0,full_technical_acceptance:false,actualExecutionAccepted:false,nominalCraneRatingIsNotActualCurve:true,upperHandlerExactBranchConfigurationRequired:true,noImportedKzMachineHours:true,noAddedLabourHours:true,noAddedPaidOwner:true,noAddedProcurementOwner:true}});
 });
 return{...built,parameters,resources,externalIds};
}

/** Source-only component for the family composer. It does not publish or close
 * parent needs; ordinary family admission remains the sole final boundary. */
export function buildMasonryM50CycleSuccessorR2(parent:Rep):Rep{
 const frozen=masonryM50CycleCapturedRepresentativeR2();
 check(parent.definition.catalog_id===pack.catalogId&&parent.definition.id===pack.currentDefinitionId&&parent.definition.definition_version===pack.currentDefinitionVersion&&parent.definition.definition_sha256===pack.currentDefinitionSha256,'EXACT_CAPTURED_PARENT');
 check(hash([parent.parameters,parent.formulas,parent.resources,parent.passport])===hash([frozen.parameters,frozen.formulas,frozen.resources,frozen.passport]),'EXACT_CURRENT_PARENT_COMPUTATION_AND_PASSPORT');
 const result=copy(parent),part=buildCyclePart(parent),oldIds=new Set(parent.parameters.map(parameter=>parameter.parameter_id));
 for(const parameter of part.parameters.filter(parameter=>!part.externalIds.includes(parameter.parameter_id)))result.parameters.push({...decl(parameter),ordinal:result.parameters.length} as any);
 for(const formula of part.formulas)result.formulas.push({...decl(formula),ordinal:result.formulas.length} as any);
 for(const resource of part.resources)result.resources.push(rehash({...decl(resource),ordinal:result.resources.length}) as any);
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const parameter of result.parameters){const key=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[key],resource_branch_consumers:consumers.resourceConsumers[key]};result.baseline.formula_consumer_ids[key]=consumers.formulaConsumers[key];result.baseline.resource_consumer_row_ids[key]=consumers.resourceConsumers[key];result.baseline.uom_by_parameter[key]=parameter.unit_id;result.baseline.guide_provenance_ru[key]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;if(!oldIds.has(key))result.baseline.normative_source_ids[key]=[pack.sourceId];}
 result.definition.applicability={...result.definition.applicability,masonryReadyM50WholeCycleR2:{contract:pack.contract,selectorId:pack.selectorId,sequentialThreeBoxCycle:true,ownSourceRoster:true,actualProjectAdaptationRequired:true,parentNeedsClosed:0,fullTechnicalAcceptance:false}};
 result.passport.included_scope_ru=[...parent.passport.included_scope_ru,'В отдельном профиле: последовательный процесс приёмки, подачи, ручного перелопачивания и возврата готового раствора с точными ящиками 0,25 м³; без дополнительных часов и покупки инвентаря из источникового наличия.'];
 result.passport.excluded_scope_ru=[...parent.passport.excluded_scope_ru,'Растворный процесс сам по себе не подтверждает полный объектный комплект крана, верхнего захвата, доступа, СИЗ, сторонней доставки и отходов; эти ресурсы и факты связывает семейная композиция.'];
 result.passport.decision={...parent.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,completeTechnicalEstimateAccepted:false,newFullTechnologies:0,unresolvedResourceRowIds:[...(parent.passport.decision?.unresolvedResourceRowIds??[])],masonryReadyM50WholeCycleR2:{sourceOperationCount:8,sourcePhysicalRosterCount:9,parentNeedsClosed:0,familyComplete:false,actualExecutionAccepted:false,newPaidOwners:0,newProcurementOwners:0},independentCompletenessMap:masonryM50CycleCompletenessR2(parent)};
 return result;
}

export function masonryM50CycleCompletenessR2(parent:Rep=masonryM50CycleCapturedRepresentativeR2()){
 const inherited=parent.passport.decision?.independentCompletenessMap as Json|undefined,row=masonryM50CycleRowR2;
 const entries=[...pack.roster.map(item=>({expectedResourceId:row('expected:'+item.key),operationId:row('operation:'+item.operations[0]),requiredOperationIds:item.operations.map(key=>row('operation:'+key)),sourceId:pack.sourceId,category:item.category,unitId:item.unitId,specification:item.titleRu,quantityRule:'WHOLE_DECLARED_SEQUENTIAL_FRONT_LITERAL_'+item.quantity,formulaId:row('formula:'+item.key),resolution:{kind:'ROW',rowId:row(item.key)}})),
  ...pack.operations.map(operation=>({expectedResourceId:row('expected:operation:'+operation.key),operationId:row('operation:'+operation.key),requiredOperationIds:[row('operation:'+operation.key)],sourceId:pack.sourceId,category:'work',unitId:'m3',specification:operation.titleRu,quantityRule:'RETAINED_KG_M50_VOLUME_OPERATION_MARKER_NOT_PHYSICAL_RESOURCE_COUNT',formulaId:row('formula:operation:'+operation.key),resolution:{kind:'ROW',rowId:row('operation:'+operation.key)}})),
  ...(['returned-mortar','waste-mortar'] as const).map(key=>({expectedResourceId:row('expected:'+key),operationId:row('operation:clean'),requiredOperationIds:[row('operation:clean')],sourceId:pack.sourceId,category:'material',unitId:'kg',specification:key==='returned-mortar'?'Фактический возврат раствора':'Фактические отходы раствора',quantityRule:'ACTUAL_OBJECT_RECORD_NOT_A_UNIVERSAL_CONSUMPTION_FACTOR',formulaId:row('formula:'+key),resolution:{kind:'ROW',rowId:row(key)}}))];
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:pack.source.sha256,evidenceReferences:[...(inherited?.evidenceReferences??[]),pack.source.path,pack.methodSource.path],entries:[...(inherited?.entries??[]),...entries],parentNeedsClosed:0,newFullTechnologies:0,fullTechnicalAcceptance:false,wholeMasonryFamilyStillUnderComposition:true};
}

export function compileMasonryM50CycleR2(model:Rep,input:Record<string,unknown>,options:{rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides']}={}){return compileMaster33MasonryR1(model,input,options);}
