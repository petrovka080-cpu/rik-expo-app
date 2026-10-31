import source from '../../../../data/estimate-benchmarks/source-packs/masonry-silicate65-m75-own-cycle-r4.json';
import flow from '../../../../data/estimate-benchmarks/source-packs/masonry-ready-m50-whole-supply-cycle-r2.json';
import front from '../../../../data/estimate-benchmarks/source-packs/masonry-ceramic250-whole-family-composition-r2.json';
import {buildMasonryCeramic250OrdinaryCurrentCardR4,compileMasonryCeramic250OrdinaryCurrentCardR4,MASONRY_CERAMIC250_SOURCE_PROFILE_R4} from './masonryCeramic250OrdinaryCurrentCardR4';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {masonryThreeBoxEffectiveMassExpressionR4} from './masonryM50EffectiveLiftCorrectionR4';
import {masonrySilicate65M75IndependentCompletenessR4} from './masonrySilicate65M75CompletenessR4';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {canonicalEstimateOperationReferences,type CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
import type {CanonicalPublisherJson as Json} from '../../../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';

type OperationUse=NonNullable<CanonicalEstimateOperationReference['additionalOperations']>[number];

export const MASONRY_SILICATE65_M75_R4=source;
export const MASONRY_SILICATE65_M75_PROFILE_R4={[source.selectorId]:source.selectorValue};
const row=(key:string)=>source.prefix+':'+key;
const id=(key:string)=>'ms75r4_'+key.replaceAll('-','_');
const selected={kind:'selected',parameterId:source.selectorId,value:source.selectorValue};
const active={kind:'and',operands:[selected,{kind:'formula_greater_than',expression:source.primaryId,unitId:'m3',value:0}]};
const check=(value:unknown,code:string):void=>{if(!value)throw Error('MASONRY_SILICATE65_M75_R4_'+code);};
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const object=(value:unknown):Record<string,unknown>=>{if(!record(value))throw Error('MASONRY_SILICATE65_M75_R4_RECORD');return value;};
// Source packs retain their captured locator/locators spelling. The existing
// scope contract requires one singular locator for every evidence item.
const objectSourceEvidence=source.sources.map(item=>{
 const locator='locator' in item?item.locator:item.locators;
 check(typeof locator==='string'&&locator.trim()&&/^[a-f0-9]{64}$/.test(item.sha256),'OWN_SCOPE_SOURCE_EVIDENCE');
 return{sha256:item.sha256,locator,path:item.path};
});
const decl=(value:Json):Json=>Object.fromEntries(Object.entries(value).filter(([key])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(key)));
const rehash=(value:Json):Json=>{const{row_sha256:_old,...body}=value;return{...body,row_sha256:hash(body)};};
const marker=(key:string)=>row('operation:'+key);
const effective=id('effective_mortar_m3');
const density=id('mortar_density_kg_m3');
const effectiveReturned=id('effective_returned_kg'),effectiveWaste=id('effective_waste_kg');
const objectFacts=[
 {key:'material-batch-ref',title:'Документ партии собственного силикатного кирпича и готового раствора марки 75',role:'MANUFACTURER_CONFIRMED'},
 {key:'method-comparison-ref',title:'Привязанное сопоставление материала, раствора и исходного способа',role:'PROJECT_DOCUMENTATION'},
 {key:'structural-design-ref',title:'Конструктивный проект ненесущей стены, опирания и сейсмических связей',role:'ENGINEERING_DESIGN'},
 {key:'actual-front-safety-ref',title:'Фактический полный рабочий фронт и действующая защита',role:'PROJECT_DOCUMENTATION'},
] as const;
// Keep the source flow's whole document boundary. The M50 batch reference is
// deliberately not reused as proof for a different mortar/product profile.
const flowFacts=flow.records.map(fact=>({key:'flow-'+fact.key+'-ref',
 title:fact.key==='batch'?'Паспорт фактической партии готового цементно-известкового раствора марки 75':fact.titleRu,
 role:fact.key==='batch'?'MANUFACTURER_CONFIRMED':fact.key==='handler'||fact.key==='crane'?'SELECTED_EQUIPMENT_PASSPORT':'PROJECT_DOCUMENTATION'}));
const measuredFacts=[
 {key:'mortar_density_kg_m3',title:'Фактическая плотность готового раствора марки 75',unit:'kg/m3',role:'MANUFACTURER_CONFIRMED',min:0},
 {key:'upper_mass_kg',title:'Собственная масса фактического верхнего грузозахвата',unit:'kg',role:'SELECTED_EQUIPMENT_PASSPORT',min:0},
 {key:'upper_limit_kg',title:'Допускаемая нагрузка фактического верхнего грузозахвата',unit:'kg',role:'SELECTED_EQUIPMENT_PASSPORT',min:0},
 {key:'crane_available_kg',title:'Допускаемая масса на фактическом вылете крана',unit:'kg',role:'SELECTED_EQUIPMENT_PASSPORT',min:0},
 {key:'box1_eye_mm',title:'Наименьшее измеренное сечение грузовых петель первого ящика',unit:'mm',role:'SITE_SURVEY',min:17},
 {key:'box2_eye_mm',title:'Наименьшее измеренное сечение грузовых петель второго ящика',unit:'mm',role:'SITE_SURVEY',min:17},
 {key:'box3_eye_mm',title:'Наименьшее измеренное сечение грузовых петель третьего ящика',unit:'mm',role:'SITE_SURVEY',min:17},
 {key:'returned_kg',title:'Измеренная масса возвращаемого раствора марки 75',unit:'kg',role:'SITE_SURVEY',min:0},
 {key:'waste_kg',title:'Измеренная масса передаваемых в отходы остатков раствора марки 75',unit:'kg',role:'SITE_SURVEY',min:0},
] as const;

/** A new compatible material profile of the SAME current brick card. The old
 * source IDs/formulas/payment records survive; M75 is not relabelled M50.
 * Source quantities remain preliminary until the actual own-producer method,
 * quality, structural and complete-work requirements are genuinely proved. */
export function buildMasonrySilicate65M75CurrentCardR4(parent:Rep):Rep{
 const result=buildMasonryCeramic250OrdinaryCurrentCardR4(parent);
 check(result.definition.catalog_id===source.catalogId&&parent.definition.id===source.parentDefinitionId
  &&parent.definition.definition_sha256===source.parentDefinitionSha256,'EXACT_EXISTING_CARD_PARENT');
 check(!result.resources.some(resource=>resource.row_id.startsWith(source.prefix+':')),'ONCE');
 const before=structuredClone(result),selector=result.parameters.find(parameter=>parameter.parameter_id===source.selectorId),primary=result.parameters.find(parameter=>parameter.parameter_id===source.primaryId);
 check(selector&&primary,'EXISTING_SELECTOR_AND_PRIMARY');
 check(selector!.truth_metadata.visibility_role==='INTERNAL_ONLY'&&selector!.truth_metadata.provenance?.consumer_input_role_v1==='APPLICATION_TECHNICAL','TRUSTED_EXISTING_SELECTOR');
 const oldValues=selector!.constraints_json.values;
 check(Array.isArray(oldValues)&&oldValues.length===1&&oldValues[0]===flow.parentSelectedValue,'EXACT_OLD_ENUM_DOMAIN');
 selector!.constraints_json={...selector!.constraints_json,values:[...oldValues,source.selectorValue]};
 selector!.default_value=null;
 const oldSelectorLinks=selector!.truth_metadata.normative_links;
 check(oldSelectorLinks==null||Array.isArray(oldSelectorLinks),'OPTIONAL_SELECTOR_SOURCE_LINK_ARRAY');
 check(Array.isArray(primary!.truth_metadata.normative_links),'MANDATORY_PRIMARY_SOURCE_LINK_ARRAY');
 const ownLink={sourceId:source.sourceId,documentTitleRu:'Собственный силикатный профиль кирпичной кладки на готовом растворе марки 75',editionStatus:'KG2015 explicit silicate scope; own producer SGB5.1-2025, not automatic project conformity',locator:'KG08PDF5p1.2/6p1.6,column07; KG03PDF27,03-0405-0004; SGB5.11',applicabilityRu:'Собственный полнотелый силикатный кирпич250×120×65, внутренняя ненесущая стена250мм, готовый цементно-известковыйМ75, этаждо4м',verifiedSource:'EXACT_SAVED_PRIMARY'};
 selector!.truth_metadata={...selector!.truth_metadata,provenance:{...object(selector!.truth_metadata.provenance??{}),silicate65M75SelectorScopeV1:{ownSourceId:source.sourceId,ownMaterialAndGradeComparisonRequired:true,oldProfilePreserved:true}},guide:{...object(selector!.truth_metadata.guide),applicability:'Exact ceramic250/M50 or own solid silicate65/readycement-limeM75/internalwall250mm/storey<=4m; actual method, quality and whole supply comparison mandatory.',source_locator:'KG08PDF5p1.2/6p1.6,column07; KG03PDF27,03-0405-0004; SGB5.11',guide_short_ru:'Приложение выбирает исходный керамический способ наМ50 либо собственный силикатный способ наМ75. Выбор не подтверждает проект и фактическое обеспечение.'},normative_links:[...(oldSelectorLinks??[]),ownLink]};
 const producer=object(primary!.truth_metadata.preliminary_value_formula_v1);
 check(producer.explicitValuePolicy==='REQUIRE_MATCH','SOURCE_PROVED_PRIMARY');
 primary!.truth_metadata={...primary!.truth_metadata,preliminary_value_formula_v1:{...producer,when:{kind:'or',operands:[{kind:'selected',parameterId:source.selectorId,value:flow.parentSelectedValue},selected]}},
  guide:{...object(primary!.truth_metadata.guide),applicability:'Exact source ceramic250/M50 or own solid silicate65/M75 inner wall250mm, storey<=4m; same net geometry, no q fallback or automatic project conformity.',source_locator:'KG08-2015 PDF5p1.2/6p1.6/8p2.3-2.5; own column07, netV=(L*H-openings)*0.25-inserts'},
  provenance:{...object(primary!.truth_metadata.provenance??{}),silicate65M75PrimaryScopeV1:{contract:source.contract,ownNorm:'KG08-02-001-07;general1.2/1.6',materialScope:'solid silicate250x120x65 and own readycement-limeM75; <=4m',legacyQNotUsed:true}},
  normative_links:[...primary!.truth_metadata.normative_links,{...ownLink,locator:ownLink.locator+'; KG08PDF8p2.3-2.5 net geometry'}]};

 // An unrecognised value in the old source selector would otherwise make an
 // older NOT-ceramic/legacy branch true. Explicitly exclude every old row for
 // the new profile, then reattach only whole compatible physical components.
 result.resources=result.resources.map(resource=>rehash({...resource,inclusion_ast:{kind:'and',operands:[resource.inclusion_ast,{kind:'not',operand:selected}]}}));
 const facts:AutomaticParameterSpec[]=[{id:source.primaryId,title:primary!.title_ru,valueType:'decimal',unitId:'m3',kind:'internal',min:0},...[...objectFacts,...flowFacts].map(fact=>({id:id(fact.key),title:fact.title,valueType:'text' as const,unitId:null,kind:'ordinary' as const})),
  ...measuredFacts.map(fact=>({id:id(fact.key),title:fact.title,valueType:'decimal' as const,unitId:fact.unit,kind:'ordinary' as const,min:fact.min})),
  {id:effective,title:'Фактическое сохранённое количество готового раствора марки 75',valueType:'decimal',unitId:'m3',kind:'internal',min:0,effectiveQuantitySourceRowId:row('ready-m75-mortar')},
  {id:effectiveReturned,title:'Сохранённая масса возврата раствора марки 75',valueType:'decimal',unitId:'kg',kind:'internal',effectiveQuantitySourceRowId:row('returned')},
  {id:effectiveWaste,title:'Сохранённая масса передаваемых остатков раствора марки 75',valueType:'decimal',unitId:'kg',kind:'internal',effectiveQuantitySourceRowId:row('waste')},
  ...source.wholeOpenNeeds.map(gap=>({id:id('unresolved_'+gap.key),title:gap.titleRu,valueType:'decimal' as const,unitId:'set',kind:'ordinary' as const,min:0}))];
 const mass=masonryThreeBoxEffectiveMassExpressionR4(effective,density);
 const specs:AutomaticRowSpec[]=[...source.rates.map(rate=>({rowId:row(rate.key),formulaId:row('formula:'+rate.key),section:source.publicTitleRu,title:rate.titleRu,category:rate.category,unitId:rate.unitId,
  expression:rate.perM3+'*'+source.primaryId,costTreatment:rate.informational?'INFORMATIONAL_SCOPE' as const:'OWN_COST' as const,procurement:false})),
  ...source.flowOperations.map(operation=>({rowId:marker(operation.key),formulaId:row('formula:operation:'+operation.key),section:'Подача готового раствора марки 75',title:operation.titleRu,category:'work',unitId:'m3',expression:effective,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false})),
  {rowId:row('upper-control'),formulaId:row('formula:upper-control'),section:'Фактический подъём раствора марки 75',title:'Превышение допускаемой нагрузки верхнего захвата',category:'service',unitId:'kg',expression:'max(0,('+mass+')-'+id('upper_limit_kg')+')',costTreatment:'INFORMATIONAL_SCOPE',procurement:false,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg',minimum:0,maximum:0,reasonRu:'Фактическая масса трёх ящиков с сохранённым количеством раствора превышает допустимую нагрузку захвата.'}},
  {rowId:row('crane-control'),formulaId:row('formula:crane-control'),section:'Фактический подъём раствора марки 75',title:'Превышение допускаемой массы на фактическом вылете крана',category:'service',unitId:'kg',expression:'max(0,('+mass+')+'+id('upper_mass_kg')+'-'+id('crane_available_kg')+')',costTreatment:'INFORMATIONAL_SCOPE',procurement:false,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg',minimum:0,maximum:0,reasonRu:'Фактическая масса ящиков, раствора и грузозахвата превышает доступную массу по характеристике крана.'}},
  {rowId:row('returned'),formulaId:row('formula:returned'),section:'Возврат и остатки раствора марки 75',title:'Фактический возврат раствора марки 75',category:'material',unitId:'kg',expression:id('returned_kg'),costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
  {rowId:row('waste'),formulaId:row('formula:waste'),section:'Возврат и остатки раствора марки 75',title:'Фактически передаваемые остатки раствора марки 75',category:'material',unitId:'kg',expression:id('waste_kg'),costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
  {rowId:row('return-balance'),formulaId:row('formula:return-balance'),section:'Возврат и остатки раствора марки 75',title:'Превышение фактического количества возврата и остатков',category:'service',unitId:'kg',expression:'max(0,'+effectiveReturned+'+'+effectiveWaste+'-'+effective+'*'+density+')',costTreatment:'INFORMATIONAL_SCOPE',procurement:false,formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'kg',minimum:0,maximum:0,reasonRu:'Сохранённый возврат и остатки превышают массу сохранённого фактического количества раствора.'}},
  {rowId:row('actual-scope'),formulaId:row('formula:actual-scope'),section:'Применимость собственного способа',title:'Соответствие фактических материалов, проекта и полного обеспечения стены',category:'service',unitId:'set',expression:'0',inputParameterIds:objectFacts.map(fact=>id(fact.key)),costTreatment:'INFORMATIONAL_SCOPE',procurement:false},
  ...source.wholeOpenNeeds.map(gap=>({rowId:row('need:'+gap.key),formulaId:row('formula:need:'+gap.key),section:'Полное обеспечение силикатной кладки',title:gap.titleRu,category:'service',unitId:'set',expression:id('unresolved_'+gap.key),costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false}))];
 const built=buildAutomaticConstructionOwnerR1({contract:source.contract,semanticOwner:source.prefix,sourceId:source.sourceId,normId:'KG08-02-001-07_SILICATE65_READY_M75_OWN_SCOPE',sourceMetadata:{source_title:source.publicTitleRu,source_document_version:'KG2015 own explicit brick scope and grade comparison; SGB5.1-2025 own producer nonbearing constraints',definition_hash:source.sources.find(item=>item.role==='kg08')!.sha256,artifact_sha256:source.sources.find(item=>item.role==='maker')!.sha256,exact_locator:'KG08PDF5p1.2/6p1.6,column07; SGB5.11 andown laying/bond constraints'},applicabilityRu:'Силикатный полнотелый кирпич250×120×65 собственного производителя, готовый цементно-известковыйМ75, внутренняя ненесущая стена250мм, этаждо4м. Известный исходный расход не подтверждает конкретный объект и полное обеспечение.',ordinary:facts,profile:[],conditional:[],rows:specs,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['No M50 material/old source mutation','No q fallback or simultaneous M50 payment','No worker headcount as hours or PPE issue','No catalogue gross mass as actual density/load','No borrowed AAC/CT21 material or quantities','No ready/full from source selection']});
 const scopeFacts=[...[...objectFacts,...flowFacts].map(fact=>id(fact.key)),...measuredFacts.map(fact=>id(fact.key)),...front.records.map(fact=>'mcf2_'+(fact.key+'_reference').replaceAll('-','_')),...front.measurements.map(fact=>'mcf2_'+fact.key.replaceAll('-','_'))];
 const gapIds=new Map(source.wholeOpenNeeds.map(gap=>[id('unresolved_'+gap.key),gap]));
 for(const parameter of built.parameters){
  if(parameter.parameter_id===source.primaryId)continue;
  const gap=gapIds.get(parameter.parameter_id),fact=[...objectFacts,...flowFacts].find(fact=>id(fact.key)===parameter.parameter_id),measurement=measuredFacts.find(fact=>id(fact.key)===parameter.parameter_id);
  const constraints=object(parameter.constraints_json??{}),provenance=object(parameter.truth_metadata.provenance??{}),guide=object(parameter.truth_metadata.guide);
  let truth=parameter.truth_metadata;
  if(gap)truth=unresolvedApplicationNormTruthR1(truth,gap.reason);
  else if([effective,effectiveReturned,effectiveWaste].includes(parameter.parameter_id))truth={...truth,visibility_role:'INTERNAL_ONLY',value_source_role:'COMPILER_DERIVED_RESOURCE_QUANTITY'};
  else{check(fact||measurement,'DECLARED_TECHNICAL_FACT');truth={...truth,value_source_role:fact?.role??measurement!.role};}
  const {requiredWhen:_old,...rest}=constraints;
  const role=String(truth.value_source_role);
  // As in the accepted M50 correction, only post-derivation zero-excess rows
  // compare loads. A parameter precheck must not consume nominal/stale volume.
  result.parameters.push({...decl(parameter),ordinal:result.parameters.length,required:false,default_value:null,constraints_json:{...rest,...([density,id('upper_limit_kg'),id('crane_available_kg')].includes(parameter.parameter_id)?{exclusiveMin:0}:{})},truth_metadata:{...truth,visibility_role:'INTERNAL_ONLY',visible_when:{kind:'literal',value:false},provenance:{...provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'},guide:{...guide,source_role:role,guide_short_ru:gap?'Недостающая норма приложения не подтверждается пользовательским значением.':[effective,effectiveReturned,effectiveWaste].includes(parameter.parameter_id)?'Количество выводится из собственного единственного владельца после сохранённых ручных правок.':'Отдельная привязанная запись фактического объекта; обычная форма этого не запрашивает.'}}});
 }
 for(const formula of built.formulas)result.formulas.push({...decl(formula),ordinal:result.formulas.length});
 const operation=(key:string)=>{const original=flow.operations.find(operation=>operation.key===key);return{operationId:original?flow.prefix+':operation:'+key:row('operation-scope:'+key),operationTitleRu:original?.titleRu??source.publicTitleRu,completionCriterionRu:'Сохранены целая исходная подработа, фактическое количество и единственный владелец; применимость и полное обеспечение не подставлены.',processOrdinal:original?.ordinal??0};};
 for(const resource of built.resources){
  const suffix=resource.row_id.slice(source.prefix.length+1),scope=suffix==='actual-scope',flowKey=suffix.startsWith('operation:')?suffix.slice(10):suffix==='upper-control'||suffix==='crane-control'?'feed':suffix==='returned'||suffix==='waste'?'clean':null;
  const reference=operation(flowKey??'lay-bond-fit');
  const control=['upper-control','crane-control','return-balance'].includes(suffix),formula=built.formulas.find(formula=>formula.formula_id===resource.formula_id)!;
  const requiredFacts=[...new Set([...formula.input_parameter_ids,id('method-comparison-ref')])];
  const graph={...resource.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:source.groupId,groupTitleRu:source.groupTitleRu,...reference},
   ...(suffix==='ready-m75-mortar'?{effectiveQuantityOutputV1:{parameterId:effective,unitId:'m3'}}:suffix==='returned'?{effectiveQuantityOutputV1:{parameterId:effectiveReturned,unitId:'kg'}}:suffix==='waste'?{effectiveQuantityOutputV1:{parameterId:effectiveWaste,unitId:'kg'}}:{}),
   ...(control?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'kg',parameterIds:formula.input_parameter_ids,reasonRu:'Контроль рассчитывается после сохранённых правок собственных владельцев; ручной ноль и исключение его не отменяют.'},scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:row('load-and-balance'),groupTitleRu:'Фактические нагрузки и баланс раствора марки 75',titleRu:resource.title_ru,reasonRu:'Фактический подъём и баланс нельзя исключить из выбранного способа.',exactScopeWhen:active,sourceEvidence:[flow.source,flow.methodSource],coveringRowIds:[],originalRowIds:[row('ready-m75-mortar')],objectFactParameterId:id('method-comparison-ref'),unknownObjectValues:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:requiredFacts}}:{}),
   ...(scope?{inputParameterIds:scopeFacts,scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',groupId:row('actual-scope'),groupTitleRu:'Применимость собственного силикатного способа',titleRu:resource.title_ru,reasonRu:'Собственный расход не подтверждает производителя, партию, марку раствора, ненесущую роль, сейсмические связи и действующее полное обеспечение. Документы не создают недостающие нормы.',exactScopeWhen:active,sourceEvidence:objectSourceEvidence,coveringRowIds:[],originalRowIds:[row('main-labour'),row('solid-silicate-brick'),row('ready-m75-mortar')],objectFactParameterId:id('material-batch-ref'),unknownObjectValues:[],objectFactMode:'PROJECT_APPLICABILITY_ONLY',requiredFactParameterIds:scopeFacts}}:{})};
  result.resources.push(rehash({...decl(resource),ordinal:result.resources.length,inclusion_ast:active,resource_graph:graph,source_metadata:{...resource.source_metadata,ownSilicate65M75Source:true,oneExclusiveFinancialBranch:true,sourceSelectionNotObjectApproval:true,actualDensityNotCatalogueGross:true,sourceQuantityNotActualSupply:true,fullTechnicalAcceptance:false}}));
 }
 // The nine complete source-flow stock owners remain the same. Eight M75
 // markers use their own effective mortar producer; old M50 markers stay off.
 const physical=new Set(flow.roster.map(item=>flow.prefix+':'+item.key));
 let reused=0;
 result.resources=result.resources.map(resource=>{
  if(!physical.has(resource.row_id))return resource;reused++;
  const prior=before.resources.find(prior=>prior.row_id===resource.row_id)!;
  check(prior&&resource.resource_graph.costTreatment==='INFORMATIONAL_SCOPE'&&!resource.procurement_eligible,'EXACT_PHYSICAL_SOURCE_OWNER');
  const composition=object(resource.resource_graph.operationCompositionV1),related=Array.isArray(composition.additionalOperations)?composition.additionalOperations:[];
  const additional=related.map(value=>{const reference=object(value),key=String(reference.operationId).startsWith(flow.prefix+':operation:')?String(reference.operationId).slice((flow.prefix+':operation:').length):null;return key?{...reference,whenResourcePresent:[...new Set([...(Array.isArray(reference.whenResourcePresent)?reference.whenResourcePresent:[]),marker(key)])]}:reference;});
  return rehash({...resource,inclusion_ast:{kind:'or',operands:[resource.inclusion_ast,active]},resource_graph:{...resource.resource_graph,operationCompositionV1:{...composition,groupId:source.groupId,groupTitleRu:source.groupTitleRu,additionalOperations:additional},silicate65M75WholeFlowReuseV1:{sourceProfile:source.selectorValue,ownMortarOwner:row('ready-m75-mortar'),m50FinancialRatesNotCopied:true,onePhysicalStockOwner:true,actualLoadCompatibilityUnconfirmed:true}}});
 });
 check(reused===9,'WHOLE_NINE_PHYSICAL_OWNERS');
 const frontIds=new Set([...front.stock.map(item=>front.prefix+':'+item.key),...front.panelProduct.perCompletePanel.map(item=>front.prefix+':'+item.key),...front.operationKeys.map(key=>front.prefix+':operation:'+key)]);
 let frontReused=0;
 result.resources=result.resources.map(resource=>{
  if(!frontIds.has(resource.row_id))return resource;frontReused++;
  const composition=object(resource.resource_graph.operationCompositionV1);
  return rehash({...resource,inclusion_ast:{kind:'or',operands:[resource.inclusion_ast,active]},resource_graph:{...resource.resource_graph,operationCompositionV1:{...composition,groupId:source.groupId,groupTitleRu:source.groupTitleRu},silicate65M75WholeFrontReuseV1:{wholeSourceStock29:true,wholePanelComponentTypes9:true,actualProducerBondAndQualityComparisonUnconfirmed:true,sourceInventoryNotActualPpeOrSupply:true,newPayment:false}}});
 });
 check(frontReused===frontIds.size&&front.stock.length===29&&front.panelProduct.perCompletePanel.length===9,'WHOLE_FRONT_NO_SUBSET');
 // Retain every old limit and apply its exact physical meaning to the new
 // material branch. The0.1m3 receiver uses M75 density, never an M50 value.
 const excess=(expression:string,unitId:string)=>({kind:'and',operands:[active,{kind:'formula_greater_than',expression,unitId,value:0}]});
 const limits:Record<string,Json>={
  mcf2_actual_ppr_served_height_m:excess('m33_masonry_wall_height_m-mcf2_actual_ppr_served_height_m','m'),
  mcf2_receiver_payload_kg:excess('0.1*'+density+'-mcf2_receiver_payload_kg','kg'),
  mcf2_panel_handler_allowable_kg:excess('740+mcf2_panel_extra_lifted_mass_kg-mcf2_panel_handler_allowable_kg','kg'),
  mcf2_panel_crane_available_kg:excess('740+mcf2_panel_extra_lifted_mass_kg+mcf2_panel_handler_mass_kg-mcf2_panel_crane_available_kg','kg'),
  mcf2_actual_panel_loaded_kg_m2:excess('mcf2_actual_panel_loaded_kg_m2-400','kg/m2'),
 };
 for(const [parameterId,limit] of Object.entries(limits)){
  const parameter=result.parameters.find(parameter=>parameter.parameter_id===parameterId);check(parameter,'EXISTING_PHYSICAL_LIMIT_PARAMETER:'+parameterId);
  const constraints=object(parameter!.constraints_json??{});
  parameter!.constraints_json={...constraints,forbiddenWhen:constraints.forbiddenWhen?{kind:'or',operands:[constraints.forbiddenWhen,limit]}:limit};
 }
 const completeRows=[...physical,...source.flowOperations.map(operation=>marker(operation.key)),...frontIds];
 const coverage=buildAutomaticConstructionOwnerR1({contract:source.contract,semanticOwner:source.prefix,sourceId:source.sourceId,normId:'WHOLE_EXISTING_SOURCE_COMPONENT_COVERAGE_NOT_ANOTHER_PAYMENT',sourceMetadata:{source_title:source.publicTitleRu,source_document_version:'Own saved source method/grade and complete source front',definition_hash:flow.source.sha256,artifact_sha256:flow.source.sha256,exact_locator:flow.source.locator+'; '+flow.methodSource.locator},applicabilityRu:'Прежние физические владельцы, полный состав рабочего фронта и восемь стадий подачи связаны с новым единственным владельцем готовогоМ75. Исключение части комплекта сохраняет открытое требование.',ordinary:[],profile:[],conditional:[],rows:[{rowId:row('whole-physical-coverage'),formulaId:row('formula:whole-physical-coverage'),section:'Сохранность целого исходного комплекта',title:'Сохранность всех применимых позиций подачи и рабочего фронта',category:'service',unitId:'set',expression:'0',costTreatment:'INFORMATIONAL_SCOPE',procurement:false}],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:['Source stock is not actual availability','No current PPE approval from old brigade quantities','No duplicate paid owner']});
 result.formulas.push({...decl(coverage.formulas[0]!),ordinal:result.formulas.length});
 const cover=coverage.resources[0]!;
 result.resources.push(rehash({...decl(cover),ordinal:result.resources.length,inclusion_ast:active,resource_graph:{...cover.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:source.groupId,groupTitleRu:source.groupTitleRu,...operation('prepare')},scopeRequirementV1:{contractVersion:'canonical-scope-requirement/v1',kind:'INCLUDED',groupId:row('whole-physical-coverage'),groupTitleRu:'Целый исходный комплект силикатной кладки',titleRu:cover.title_ru,reasonRu:'Часть целой подработы исключена; это не подтверждает сохранение полной технологии.',exactScopeWhen:active,sourceEvidence:[flow.source,flow.methodSource],coveringRowIds:completeRows,originalRowIds:[row('ready-m75-mortar'),row('main-labour')],costExclusionBreaksScopeV1:true}},source_metadata:{...cover.source_metadata,actualSupplyNotConfirmed:true,fullTechnicalAcceptance:false}}));
 const frontReference=(key:string)=>{
  const old=before.resources.find(resource=>resource.row_id===front.prefix+':operation:'+key);check(old,'SOURCE_FRONT_OPERATION:'+key);
  const reference=canonicalEstimateOperationReferences(old!.resource_graph.operationCompositionV1)[0];check(reference,'REAL_SOURCE_FRONT_REFERENCE:'+key);return{...reference,groupId:source.groupId,groupTitleRu:source.groupTitleRu,whenResourcePresent:[front.prefix+':operation:'+key]};
 };
 const normReference=(key:'masonry'|'handling')=>({operationId:source.groupId+':operation:'+key,operationTitleRu:key==='masonry'?'Кладка внутренней кирпичной стены':'Подача материалов внутренней кирпичной кладки',completionCriterionRu:'Использован один собственный владелец исходного нормативного количества; применимость объекта и полное обеспечение проверяются отдельно.',processOrdinal:key==='masonry'?1:2});
 result.resources=result.resources.map(resource=>{
  const rate=source.rates.find(rate=>resource.row_id===row(rate.key));if(!rate)return resource;
  const uses=rate.operationKeys.flatMap<OperationUse>(key=>key==='ready-mortar-post'?source.flowOperations.map(step=>({...operation(step.key),whenResourcePresent:[marker(step.key)]})):key==='control-and-protect'?[frontReference('control')]:key==='clean-return-waste'?[{...operation('clean'),whenResourcePresent:[marker('clean')]},frontReference('clean-return')]:[normReference(key==='receive-store'?'handling':'masonry')]);
  const unique=uses.filter((reference,index,array)=>array.findIndex(prior=>prior.operationId===reference.operationId)===index),primaryReference=normReference(rate.key==='tower-crane'||rate.key==='operators-included'?'handling':'masonry');
  return rehash({...resource,resource_graph:{...resource.resource_graph,operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:source.groupId,groupTitleRu:source.groupTitleRu,...primaryReference,additionalOperations:unique.filter(reference=>reference.operationId!==primaryReference.operationId)},silicate65M75SingleNormOwnerV1:{ownColumn07:true,ratePerM3:rate.perM3,secondPaymentAtRelatedOperations:false}}});
 });
 for(const old of before.resources){const actual=result.resources.find(resource=>resource.row_id===old.row_id)!;for(const field of ['unit_id','formula_id','category','row_type','cost_owner_id','semantic_owner','procurement_eligible','source_metadata'])check(JSON.stringify(actual[field])===JSON.stringify(old[field]),'OLD_PROTECTED_FIELD:'+old.row_id+':'+field);check(actual.resource_graph.costTreatment===old.resource_graph.costTreatment,'OLD_PAYMENT');}
 check(JSON.stringify(result.formulas.slice(0,before.formulas.length))===JSON.stringify(before.formulas)&&JSON.stringify(result.bindings)===JSON.stringify(before.bindings),'OLD_FORMULAS_AND_BINDINGS');
 for(const resource of result.resources.filter(resource=>physical.has(resource.row_id)))check(canonicalEstimateOperationReferences(resource.resource_graph.operationCompositionV1).length>0,'ACTUAL_PROJECTOR_REFERENCE');
 const consumers=buildMasterParameterCalculationConsumers(result);
 const oldParameterIds=new Set(before.parameters.map(parameter=>parameter.parameter_id));
 for(const parameter of result.parameters){const key=parameter.parameter_id;parameter.truth_metadata={...parameter.truth_metadata,formula_consumers:consumers.formulaConsumers[key],resource_branch_consumers:consumers.resourceConsumers[key]};result.baseline.formula_consumer_ids[key]=consumers.formulaConsumers[key];result.baseline.resource_consumer_row_ids[key]=consumers.resourceConsumers[key];result.baseline.uom_by_parameter[key]=parameter.unit_id;result.baseline.guide_provenance_ru[key]=parameter.truth_metadata.guide?.guide_short_ru??parameter.title_ru;if(!oldParameterIds.has(key))result.baseline.normative_source_ids[key]=parameter.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'||String(parameter.truth_metadata.value_source_role).includes('DERIVED')?[]:[source.sourceId];}
 result.definition.applicability={...result.definition.applicability,primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',selectorParameterId:source.selectorId,selections:[{selectorValue:flow.parentSelectedValue,primaryMeasureParameterId:source.primaryId,unitId:'m3'},{selectorValue:source.selectorValue,primaryMeasureParameterId:source.primaryId,unitId:'m3'}]},masonrySilicate65M75CurrentCardR4:{contract:source.contract,sameExistingCard:true,sourceCountry:'Kyrgyzstan',sourceEdition:'2015',ownMakerEdition:'SGB5.1-2025',newOrdinaryFacts:0,existingOrdinaryFacts:5,oldHistoryUnmodified:true,legacyQFallbackDisabled:true,wholePhysicalFlowStockReused:9,sourceMethodCrane10tVersusNorm8tCompatibilityHeld:true,foreignCraneHoursTransferred:false,sourceProfileNotObjectApproval:true,full:false}};
 result.passport.decision={...result.passport.decision,completeTechnicalEstimateAccepted:false,independentCompletenessMap:masonrySilicate65M75IndependentCompletenessR4(result.passport.decision.independentCompletenessMap),masonrySilicate65M75CurrentCardR4:{contract:source.contract,ownNormColumn:'08-02-001-07',m50AndM75MutuallyExclusive:true,oneOwnM75MortarOwner:row('ready-m75-mortar'),oneMainLabourOwner:row('main-labour'),oldM50HistoryUnchanged:true,wholeFrontAdaptationStillOpen:true,closedParentNeeds:0,full:0}};
 return result;
}

/** The existing compiler/primary mechanism is reused verbatim. */
export const compileMasonrySilicate65M75CurrentCardR4=compileMasonryCeramic250OrdinaryCurrentCardR4;
export const MASONRY_BRICK_R4_SOURCE_PROFILES={ceramicM50:MASONRY_CERAMIC250_SOURCE_PROFILE_R4,silicateM75:MASONRY_SILICATE65_M75_PROFILE_R4};
