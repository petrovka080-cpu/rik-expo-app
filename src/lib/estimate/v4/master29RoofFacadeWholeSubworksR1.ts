import pack from '../../../../data/estimate-benchmarks/source-packs/master29-roof-facade-whole-subworks-r1.json';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1} from './sourcePinnedRoofNormOwnerR1';
import gutterPack from '../../../../data/estimate-benchmarks/source-packs/roof-hanging-gutters-companion-s27-67.json';
import trimPack from '../../../../data/estimate-benchmarks/source-packs/roof-metal-trim-companion-s27-67.json';
import {ct54Tesa2600DefinitionR1,ct54Tesa2600FilmReplacementR1,ct54Tesa2600TapeReplacementR1,
 ct54RectangularProtectionForwardDefinitionS2770,ct54ProtectionChoiceIdS2770,ct54ProtectionPackS2770} from './ct54RectangularProtectionS2770';
import {ct54ReadyFacadeExactS2763} from './ct54ReadyFacadeSeriesS2763';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {resolveCanonicalEstimateExplicitRowCategory} from '../backendPlatform/canonicalEstimateRowCategory';
import {estimateDeterministicHash as hash} from '../estimateDeterministicHash';
import type {PurchaseGroupRepresentative as Rep} from '../../../../scripts/estimate/r4a13/s2732PurchaseGroupOverlay';
type Json=Record<string,any>;
const fixture=require('../../../../data/estimate-benchmarks/fixtures/master29-roof-facade-current-twelve-r1.json') as {captures:Json[]};
export const master29RoofFacadePackR1=pack;
const copy=<T,>(value:T):T=>structuredClone(value);
const same=(a:unknown,b:unknown)=>hash(a)===hash(b);
const required=(v:unknown,code:string):void=>{if(!v)throw Error('M29_ROOF_FACADE_'+code);};
const declaration=(row:Json)=>Object.fromEntries(Object.entries(row).filter(([k])=>!['id','definition_version_id','created_at','updated_at','row_sha256'].includes(k)));
const hashed=(row:Json)=>{const{row_sha256:_old,...body}=row;return{...body,row_sha256:hash(body)};};
const typeOf=(category:string)=>{const value=resolveCanonicalEstimateExplicitRowCategory(category);required(value&&['material','work','equipment','service'].includes(value),'EXACT_RESOURCE_CATEGORY_REQUIRED');return value==='work'?'labor':value;};
const exact=(parameterId:string,value:string)=>({kind:'equals' as const,parameterId,value});
const and=(...operands:unknown[]):Json=>({kind:'and',operands});
export function master29CapturedRepresentativeR1(catalogId:string):Rep{
 const c=fixture.captures.find(c=>c.definition.catalog_id===catalogId);required(c,'EXACT_CURRENT_CAPTURE_REQUIRED');
 const rows=new Map(c!.resources.map((r:Json)=>[r.id,r.row_id]));
 return copy({definition:c!.definition,baseline:c!.baseline,passport:c!.contentPassport,parameters:c!.parameters,formulas:c!.formulas,resources:c!.resources,
  bindings:c!.bindings.map((b:Json)=>({row_id:rows.get(b.resource_spec_id),locator_id:b.locator_id,applicability:b.applicability}))}) as Rep;
}
function guarded(parent:Rep){
 const target=pack.targets.find(t=>t.catalogId===parent.definition.catalog_id),frozen=target?master29CapturedRepresentativeR1(target.catalogId):null;
 required(target&&frozen&&parent.definition.id===target.definitionId&&parent.definition.definition_sha256===target.definitionSha256
  &&parent.definition.definition_version===target.definitionVersion
  &&same([parent.parameters.length,parent.formulas.length,parent.resources.length],target.expectedParentShape),'EXACT_CURRENT_IDENTITY_SHAPE_REQUIRED');
 required(same({parameters:parent.parameters,formulas:parent.formulas,resources:parent.resources},{parameters:frozen!.parameters,formulas:frozen!.formulas,resources:frozen!.resources}),'CURRENT_CAPTURE_COMPUTATION_DRIFT');
 return target!;
}
const roofProfile=(key:string)=>{const p=pack.roofProfiles.find(p=>p.key===key);required(p,'ROOF_PROFILE_REQUIRED');return p!;};
/** Two existing whole, source-pinned rate kernels. No coefficient is authored here. */
export function master29RoofKernelR1(key:string):AutomaticOwnerDefinition{
 const p=roofProfile(key),source=key==='gutter'?gutterPack:trimPack;
 const config={...source,contract:pack.contract+'.'+p.key,systemParameterId:p.choiceId,conditionsParameterId:p.conditionsParameterId,areaParameterId:p.measurementParameterId,
  measurementParameterId:p.measureId,measurementUnitId:p.unitId,measurementConditional:true,quantityEditReasonRu:p.key==='gutter'?'Количество следует из подтверждённой нормы и измеренной длины именно подвесных желобов; изменяйте самостоятельную длину, м.':'Количество следует из подтверждённой нормы и измеренной площади именно малых металлических покрытий; изменяйте самостоятельную площадь, м².',
  systemYesRu:p.exactChoiceRu,conditionsYesRu:p.conditionsValueRu,areaYesRu:p.measurementValueRu,legacyChoiceRu:p.legacyChoiceRu,
  groupTitleRu:p.publicNameRu,operationTitleRu:p.publicNameRu,conditionsRu:p.conditionsValueRu,measurementRu:p.measurementValueRu,
  systemRu:p.scopeRu+' Проект подтверждает исполнение, готовое непосредственное основание и крепление. Норма не заменяет расчёт прочности и проект крепления.',
  measurementTitleRu:p.key==='gutter'?'Самостоятельная длина подвесных желобов, м':'Самостоятельная площадь покрытия парапетов, м²',
  measurementGuideRu:p.measurementValueRu,measurementChoiceTitleRu:'Проверен самостоятельный обмер этой подработы',systemChoiceTitleRu:'Способ выполнения работы',
  scopeRu:p.scopeRu+' Самостоятельная подработа на принятом основании, положительная температура, нормальные неосложнённые условия до15м включительно и местность ниже1500м. Остальные работы не объявляются выполненными.',
  remainingScopeRu:pack.roofOpenNeeds.map(n=>n.reasonRu)} as unknown as SourcePinnedRoofNormPackR1;
 return sourcePinnedRoofNormOwnerR1(config);
}
function roofMissingDefinition(key:string){
 const p=roofProfile(key),prefix=p.sourcePrefix,selected=exact(p.choiceId,p.exactChoiceRu),active=and(selected,{kind:'greater_than',parameterId:p.measureId,value:0});
 const ids=pack.roofOpenNeeds.map(n=>'m29_'+key.replaceAll('-','_')+'_open_'+n.id.replaceAll('-','_'));
 const d=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:p.sources[0]!.id,normId:p.normId,
  sourceMetadata:{source_title:p.publicNameRu,source_document_version:p.sources[0]!.printedEdition,definition_hash:p.sources[0]!.sha256,artifact_sha256:p.sources[0]!.sha256,exact_locator:p.sources[0]!.locators},
  applicabilityRu:p.scopeRu,ordinary:[],profile:[],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:pack.roofOpenNeeds.map(n=>n.reasonRu),
  conditional:pack.roofOpenNeeds.map((n,i)=>({id:ids[i]!,title:n.nameRu,kind:'conditional' as const,valueType:'decimal' as const,unitId:null,min:0})),
  rows:pack.roofOpenNeeds.map((n,i)=>({rowId:prefix+':m29-open:'+n.id,formulaId:prefix+':m29-formula:open:'+n.id,section:p.publicNameRu,
   title:n.nameRu,category:n.category,unitId:'',expression:ids[i]!,costTreatment:'INFORMATIONAL_SCOPE' as const,procurement:false}))});
 return{...d,parameters:d.parameters.map(p=>({...p,required:false,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Неизвестные состав, единица и количество требуют источника или подтверждённой комплектации; пользователь не вводит фиктивную норму.')})),
  resources:d.resources.map((r,i)=>({...r,inclusion_ast:active,source_metadata:{...r.source_metadata,sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],sourceNormQuantityAccepted:false,
   quantityUnitUnconfirmed:true,extraPaymentNotAssumed:true,full_technical_acceptance:false,unresolvedReasonRu:pack.roofOpenNeeds[i]!.reasonRu},resource_graph:{...r.resource_graph,
   inputParameterIds:[p.choiceId,p.measureId],operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:p.publicNameRu,
    operationId:prefix+':completion',operationTitleRu:'Обеспечить исполнение и завершить работы',processOrdinal:90,completionCriterionRu:'Реальные инструменты, защита, доставка и обращение с обрезками подтверждены; включённое обеспечение повторно не оплачивается.'},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,
    detailsRu:[pack.roofOpenNeeds[i]!.reasonRu,'Количество, единица и комплектация пока не подтверждены источником; отдельная оплата не принята.']}}}))};
}
const roofPublicNames:Record<string,string>={workers:'Работа по изготовлению и монтажу',included_machine_operators:'Труд машинистов строительных машин',tower_crane_8t:'Башенный кран, грузоподъёмность 8 т',truck_crane_10t:'Автомобильный кран, грузоподъёмность 10 т',flatbed_truck_to_5t:'Бортовой автомобиль, грузоподъёмность до 5 т',galvanized_nails_4_5x120:'Гвозди оцинкованные для асбестоцементной кровли, 4,5 × 120 мм',galvanized_forgings_2_825kg:'Поковки оцинкованные, масса 2,825 кг',galvanized_sheet_0_7mm:'Сталь листовая оцинкованная, толщина 0,7 мм',roofing_nails_3x40:'Гвозди толевые круглые, 3 × 40 мм',galvanized_rope_wire_3mm:'Проволока канатная оцинкованная, диаметр 3 мм'};
function append(result:Rep,shared:AutomaticOwnerDefinition,catalogId:string,extraGate?:unknown){
 for(const p of shared.parameters){required(!result.parameters.some(q=>q.parameter_id===p.parameter_id),'PARAMETER_COLLISION');result.parameters.push({...declaration(p),ordinal:result.parameters.length,required:p.required,default_value:null} as any);}
 for(const f of shared.formulas){required(!result.formulas.some(q=>q.formula_id===f.formula_id),'FORMULA_COLLISION');result.formulas.push(copy(f) as any);}
 for(const r of shared.resources){required(!result.resources.some(q=>q.row_id===r.row_id),'RESOURCE_COLLISION');const row=declaration(r);result.resources.push(hashed({...row,ordinal:result.resources.length,
  row_type:typeOf(String(row.category)),semantic_owner:catalogId+':'+row.row_id,...(extraGate?{inclusion_ast:and(extraGate,row.inclusion_ast)}:{})}) as any);}
}
function finish(result:Rep,target:typeof pack.targets[number]){
 const consumers=buildMasterParameterCalculationConsumers(result);
 for(const p of result.parameters){const id=p.parameter_id;p.truth_metadata={...p.truth_metadata,contract:pack.contract,semantic_parameter_key:target.catalogId+':'+id,
  formula_consumers:consumers.formulaConsumers[id],resource_branch_consumers:consumers.resourceConsumers[id]};
  result.baseline.formula_consumer_ids[id]=consumers.formulaConsumers[id];result.baseline.resource_consumer_row_ids[id]=consumers.resourceConsumers[id];
  result.baseline.uom_by_parameter[id]=p.unit_id;result.baseline.guide_provenance_ru[id]=p.truth_metadata.guide?.guide_short_ru??p.title_ru;
  result.baseline.normative_source_ids[id]??=p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[target.sourceId];}
 const missing=new Set(result.parameters.filter(p=>p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM').map(p=>p.parameter_id));
 const open=result.resources.filter(r=>result.formulas.find(f=>f.formula_id===r.formula_id)!.input_parameter_ids.some((id:string)=>missing.has(id))).map(r=>r.row_id);
 result.passport.decision={...result.passport.decision,quantityScope:'PARTIAL',technicalScopeStatus:'NEEDS_SOURCE',preliminaryCompositionOnly:true,
  unresolvedResourceRowIds:open,completeTechnicalEstimateAccepted:false,master29SubjectContract:pack.contract,newFullTechnologies:0,independentCompletenessMap:master29IndependentCompletenessMapR1(target.catalogId)};
 const full={capability:'FULL_APPLICABLE_SCOPE',status:'NEEDS_SOURCE',preliminaryCompositionOnly:true,unresolvedResourceRowIds:open};
 result.passport.capability_matrix=result.passport.capability_matrix.some((p:Json)=>p.capability===full.capability)?result.passport.capability_matrix.map((p:Json)=>p.capability===full.capability?full:p):[...result.passport.capability_matrix,full];
 return result;
}
/** Eight current retained consumers; legacy q is preserved only for legacy rows. */
export function buildMaster29RoofSuccessorR1(parent:Rep):Rep{
 const target=guarded(parent);required(target.group==='roof','ROOF_CURRENT_TARGET_REQUIRED');const p=roofProfile(target.profileKey),result=copy(parent),selected=exact(p.choiceId,p.exactChoiceRu),legacy=exact(p.choiceId,p.legacyChoiceRu);
 for(const row of result.resources)row.inclusion_ast=and(row.inclusion_ast,legacy);
 const q=result.parameters.find(q=>q.parameter_id==='q')!;required(q.truth_metadata.value_source_role==='VISIBLE_BASELINE_ASSUMPTION','HISTORICAL_Q_ROLE_REQUIRED');
 q.default_value=null;q.required=false;q.constraints_json={...q.constraints_json,requiredWhen:legacy};q.truth_metadata={...q.truth_metadata,visible_when:legacy};
 const kernel=master29RoofKernelR1(p.key);append(result,kernel,target.catalogId);append(result,roofMissingDefinition(p.key),target.catalogId);
 // Two actual branches only. Unknown selection stays null and asks for a choice;
 // it is never assigned a physical measure by the finite client contract.
 const selector=result.parameters.find(q=>q.parameter_id===p.choiceId)!;selector.constraints_json={...selector.constraints_json,values:[p.exactChoiceRu,p.legacyChoiceRu]};
 for(const r of result.resources.filter(r=>r.row_id.startsWith(p.sourcePrefix+':')&&!r.row_id.includes(':m29-open:'))){const key=r.row_id.slice(p.sourcePrefix.length+1),name=roofPublicNames[key];required(name,'ROOF_FUNCTIONAL_NAME_REQUIRED');
  r.resource_graph={...r.resource_graph,publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:r.resource_graph.publicResourcePresentationV1.detailsRu,
   nameRu:key==='workers'?(p.key==='gutter'?'Работа по изготовлению, установке и креплению желобов, средний разряд 3,0':'Работа по заготовке и креплению покрытий парапетов, средний разряд 3,0'):name},fullTechnicalAcceptance:false};}
 required(result.formulas.filter(f=>!parent.formulas.some(old=>old.formula_id===f.formula_id)).every(f=>!f.input_parameter_ids.includes('q')),'HISTORICAL_Q_IS_NOT_A_NEW_PHYSICAL_MEASURE');
 return finish(result,target);
}
const mapForward=<T,>(value:T):T=>{const walk=(x:any):any=>typeof x==='string'?(x===pack.facade.rawSourceChoiceRu?pack.facade.publicChoiceRu:x):Array.isArray(x)?x.map(walk):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,walk(v)])):x;return walk(value);};
const facadeNames:Record<string,string>={'covered-area':'Площадь прямоугольных укрытий','film-strip-area':'Площадь полос плёнки шириной 2,6 м','film-tail':'Концевые отрезки плёнки шириной 2,6 м','film-trim':'Обрезки плёнки по высоте','tape-length':'Длина ленты на боковые и нижние края','film-opened':'Плёнка с верхней лентой, рулон 14 × 2,6 м: открываемые рулоны','film-order':'Укрывная плёнка с верхней лентой, рулон 14 × 2,6 м','film-remaining':'Плёнка с верхней лентой, рулон 14 × 2,6 м: нераспечатанные рулоны','film-free':'Плёнка с верхней лентой, рулон 14 × 2,6 м: свободные рулоны','tape-opened':'Лента для краёв укрытия, рулон 25 м × 50 мм: открываемые рулоны','tape-order':'Лента для боковых и нижних краёв укрытия, рулон 25 м × 50 мм','tape-remaining':'Лента для краёв укрытия, рулон 25 м × 50 мм: нераспечатанные рулоны','tape-free':'Лента для краёв укрытия, рулон 25 м × 50 мм: свободные рулоны'};
/** One existing whole 2.6m cut-and-mask kit, with the same source constraints. */
export function master29FacadeKitR1():AutomaticOwnerDefinition{
 const original:AutomaticOwnerDefinition=ct54Tesa2600DefinitionR1(),d:AutomaticOwnerDefinition=mapForward(copy(original));
 for(const p of d.parameters){const source=original.parameters.find(q=>q.parameter_id===p.parameter_id)!;
  const owned=(p.truth_metadata.effective_resource_quantity_v1 as Json|undefined)?.sourceRowId;if(owned){const suffix=String(owned).slice(pack.facade.sourcePrefix.length+1);if(facadeNames[suffix])p.title_ru='Принятое количество: '+facadeNames[suffix];}
  if(p.parameter_id.startsWith('ct54_tesa2600_film_')||p.parameter_id.startsWith('ct54_tesa2600_tape_')){const material=p.parameter_id.includes('_film_')?'плёнки с верхней лентой, рулон14×2,6м':'ленты краёв укрытия, рулон25м×50мм';
   const title=p.parameter_id.endsWith('_stock')?'Пригодные целые рулоны ':p.parameter_id.endsWith('_reserve')?'Сохраняемый запас целых рулонов ':p.parameter_id.endsWith('_supplier_multiple')?'Кратность поставки целых рулонов ':null;
   if(title){p.title_ru=title+material;p.truth_metadata={...p.truth_metadata,source_parameter_title_ru:source.title_ru,guide:{...(p.truth_metadata.guide as Json),guide_short_ru:p.title_ru+'. Укажите фактическое значение; неизвестное не подставляется из другого изделия.'}};}}
 }
 for(const r of d.resources){const key=r.row_id.slice(pack.facade.sourcePrefix.length+1),name=facadeNames[key];required(name,'FACADE_FUNCTIONAL_NAME_REQUIRED');r.resource_graph={...r.resource_graph,
  operationCompositionV1:{...(r.resource_graph.operationCompositionV1 as Json),groupTitleRu:'Укрытие прямоугольных элементов плёнкой шириной 2,6 м',operationTitleRu:'Раскроить и закрепить укрывную плёнку и ленту'},
  publicResourcePresentationV1:{...(r.resource_graph.publicResourcePresentationV1 as Json),sourceTitleRu:r.title_ru,nameRu:name,specificationRu:key.startsWith('film-')?'Плёнка с верхней лентой, рулон14×2,6м; отдельная верхняя лента не добавляется.':key.startsWith('tape-')?'Лента для боковых и нижних краёв укрытия, рулон25м×50мм.':null,...(key==='film-order'||key==='tape-order'?{}:{rowKind:'CALCULATION_DETAIL'})}};
  r.source_metadata={...r.source_metadata,sourceChoiceValue:pack.facade.rawSourceChoiceRu,automaticGenericPriceInheritanceAllowed:false};}
 return d;
}
/** Four currently active parents. Historical eight-parent/retired overlays stay untouched. */
export function buildMaster29FacadeSuccessorR1(parent:Rep):Rep{
 const target=guarded(parent);required(target.group==='facade','FACADE_CURRENT_TARGET_REQUIRED');const result=copy(parent),shared=master29FacadeKitR1(),choice=result.parameters.find(p=>p.parameter_id===ct54ProtectionChoiceIdS2770)!;
 required(choice&&same(choice.constraints_json.values,[ct54ProtectionPackS2770.otherChoiceRu,ct54ProtectionPackS2770.exactChoiceRu]),'EXACT_EXISTING_1800_CHOICES_REQUIRED');
 required(!result.resources.some(r=>r.row_id.startsWith(pack.facade.sourcePrefix+':')),'FACADE_FORWARD_KIT_ALREADY_PRESENT');
 choice.constraints_json={...choice.constraints_json,values:[...choice.constraints_json.values,pack.facade.publicChoiceRu]};
 // Whole legacy forward applicability fix: N/W/H become explicit row inputs.
 for(const forward of ct54RectangularProtectionForwardDefinitionS2770().resources){const old=result.resources.find(r=>r.row_id===forward.row_id)!;required(old,'COMPLETE_1800_KIT_REQUIRED');old.resource_graph={...old.resource_graph,inputParameterIds:[...new Set([...(old.resource_graph.inputParameterIds??[]),...((forward.resource_graph as AutomaticOwnerDefinition['resources'][number]['resource_graph']).inputParameterIds as string[])])]};}
 for(const[rowId,replacement]of [[pack.facade.closedNeedIds[0],ct54Tesa2600FilmReplacementR1],[pack.facade.closedNeedIds[1],ct54Tesa2600TapeReplacementR1]] as const){const old=result.resources.find(r=>r.row_id===rowId)!;required(old&&old.source_metadata.sourceNormQuantityAccepted===false,'UNRESOLVED_PROTECTION_OWNER_REQUIRED');old.inclusion_ast=and(old.inclusion_ast,{kind:'not',operand:mapForward(replacement)});}
 const extra={...shared,parameters:shared.parameters.filter(p=>p.parameter_id!==ct54ProtectionChoiceIdS2770)};
 append(result,extra,target.catalogId,ct54ReadyFacadeExactS2763);
 return finish(result,target);
}
/** Source-authored expectations, independent of the generated current rows. */
export function master29IndependentCompletenessMapR1(catalogId:string){
 const target=pack.targets.find(t=>t.catalogId===catalogId);required(target,'MAP_CURRENT_TARGET_REQUIRED');
 if(target!.group==='roof'){
  const p=roofProfile(target!.profileKey),source=p.key==='gutter'?gutterPack:trimPack;
  return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,operationResourceBindingRequired:true,
   evidenceSha256:p.sources[0]!.sha256,evidenceReferences:p.sources.map(s=>s.locators),entries:[
    ...source.rates.map(rate=>({expectedResourceId:p.key+':'+rate.role,operationId:p.sourcePrefix+':installation',requiredOperationIds:[p.sourcePrefix+':installation'],category:rate.category,unitId:rate.unitId,
     specification:rate.titleRu,condition:p.exactChoiceRu+'; '+p.conditionsValueRu+'; '+p.measurementValueRu,sourceId:p.sources[0]!.id,
     quantityRule:'EXACT_SOURCE_COLUMN_WHOLE_SUBWORK_RATE_PER100_'+p.unitId,formulaId:p.sourcePrefix+':formula:'+rate.role,resolution:{kind:'ROW',rowId:p.sourcePrefix+':'+rate.role}})),
    ...pack.roofOpenNeeds.map(n=>({expectedResourceId:p.key+':open:'+n.id,operationId:p.sourcePrefix+':completion',requiredOperationIds:[p.sourcePrefix+':completion'],category:n.category,unitId:null,quantityUnitUnconfirmed:true,specification:n.nameRu,
     condition:p.exactChoiceRu,sourceId:p.sources[0]!.id,quantityRule:'SOURCE_REQUIRED_NOT_QUANTIFIED',formulaId:p.sourcePrefix+':m29-formula:open:'+n.id,resolution:{kind:'ROW',rowId:p.sourcePrefix+':m29-open:'+n.id}}))],fullTechnicalAcceptance:false};
 }
 const specs:[string,string,string][]=[['covered-area','m2','N*W*H'],['film-strip-area','m2','N*W*2.6'],['film-tail','m','OPENED_FILM_ROLLS*14-N*W'],['film-trim','m2','N*W*(2.6-H)'],['tape-length','m','N*(W+2*H)'],['film-opened','item','ceil(N/floor(14/W))'],['film-order','item','EFFECTIVE_ORDER_OF_WHOLE_FILM_ROLLS'],['film-remaining','item','UNOPENED_FILM_ROLLS_AFTER_CUT'],['film-free','item','FILM_REMAINING_MINUS_RESERVE'],['tape-opened','item','ADMITTED_COMPLETE_THREE_EDGE_KITS_IN_25M_ROLLS'],['tape-order','item','EFFECTIVE_ORDER_OF_WHOLE_TAPE_ROLLS'],['tape-remaining','item','UNOPENED_TAPE_ROLLS_AFTER_CUT'],['tape-free','item','TAPE_REMAINING_MINUS_RESERVE']];
 const primary=(require('../../../../data/estimate-benchmarks/source-packs/ct54-tesa4369-2600-eight-forward-r1.json') as Json).sources.tesa2026;
 return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PRODUCT_SYSTEM_TDS',generatedFromCurrentRows:false,operationResourceBindingRequired:true,evidenceSha256:primary.sha256,evidenceReferences:[primary.url,primary.locator],
  entries:specs.map(([id,unitId,quantityRule])=>({expectedResourceId:'facade-protection2600:'+id,operationId:pack.facade.sourcePrefix+':cut-and-mask',requiredOperationIds:[pack.facade.sourcePrefix+':cut-and-mask'],category:'material',unitId,specification:facadeNames[id],condition:pack.facade.publicChoiceRu+'; вся геометрия, пригодность крепления и ограничения источника подтверждены',sourceId:'tesa_4369_2600_4363_ct54_protection_forward_r1',quantityRule,formulaId:pack.facade.sourcePrefix+':formula:'+id,resolution:{kind:'ROW',rowId:pack.facade.sourcePrefix+':'+id}})),fullTechnicalAcceptance:false};
}
