import type {CanonicalPurchaseBalanceV1} from '../backendPlatform/canonicalPurchaseBalanceV1';
import pack from '../../../../data/estimate-benchmarks/source-packs/masonry-wall-krer08-systems-r1.json';
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec,type AutomaticRowSpec} from './automaticConstructionOwnerR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../backendPlatform/canonicalEstimateCompileCore';
import {effectivePurchaseBalanceExpressionsR1,effectiveResourceQuantityParameterId} from './effectivePurchaseBalanceR1';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

type Json=Record<string,unknown>;
export type MasonryWallSystemKrer08R1='ceramic-brick'|'aac-400'|'aac-500';
export type MasonryWallSourceProfileKrer08R1=typeof pack.profiles[number];
export const masonryWallKrer08PackR1=pack;
export const masonryWallKrer08FactIdsR1=['kg_project_basis','source_system_conformance','approved_masonry_design_reference'] as const;
export const masonryWallKrer08NeedParameterIdsR1=pack.residual.map(n=>'wall_krer08_unresolved_'+n.key.replaceAll('-','_'));
const profileNeeds=(p:MasonryWallSourceProfileKrer08R1)=>pack.residual.map(n=>({...n,...(p.system==='ceramic-brick'?(pack.residualFamilyOverrides['ceramic-brick'] as Record<string,Partial<typeof n>>)[n.key]??{}:{})}));
const geometry=['wall_length_m','wall_height_m','openings_area_m2','nonmasonry_insert_volume_m3','storey_height_m'] as const;
const primary='wall_length_m';
const keys={brick:['labour','operators','tower-crane','water','brick','timber','mortar'],aac:['labour','operators','tower-crane','truck-crane','perforator','flatbed-truck','water','primer','adhesive','anchor-steel','aac-block']} as const;
const units:Record<string,string>={labour:'man_hour',operators:'man_hour','tower-crane':'machine_hour','truck-crane':'machine_hour',perforator:'machine_hour','flatbed-truck':'machine_hour',water:'m3',brick:'piece',timber:'m3',mortar:'m3',primer:'kg',adhesive:'kg','anchor-steel':'kg','aac-block':'m3'};
const signatures:Record<string,string>={
 '08-02-001-07':'5.21|0.4|0.4|0.44|395|0.0005|0.234',
 '08-02-001-08':'5.05|0.35|0.35|0.44|395|0.0005|0.234',
 '08-03-004-01':'3.65|0.08|0.03|0.05|0.03|0.05|0.00414|0.077|20.5|0.78|1.01',
 '08-03-004-02':'2.81|0.08|0.03|0.05|0.03|0.05|0.00414|0.051|20.5|0.78|1.01',
 '08-03-004-03':'4.47|0.08|0.03|0.05|0.05|0.05|0.00575|0.077|28.47|1.24|1.01',
 '08-03-004-04':'3.39|0.08|0.03|0.05|0.05|0.05|0.00552|0.053|27.3|1.24|1.01',
};
const ensure=(ok:unknown,code:string):void=>{if(!ok)throw Error('MASONRY_WALL_KRER08_'+code);};
const rehash=<T extends {row_sha256:string}>(r:T):T=>{const{row_sha256:_old,...body}=r;return {...body,row_sha256:estimateDeterministicHash(body)} as T;};
/** Independent source roster guard. A matching display name never authorizes another row, unit or column. */
export function assertMasonryWallSourcePackKrer08R1(p:typeof pack=pack):void{
 ensure(p.source.jurisdiction==='KG'&&p.source.sha256==='cb6a446ea8b7deeedcf433661a3d1c4145707334edb7328d3d251adf26dde436','EXACT_PRIMARY_SOURCE');
 ensure(p.profiles.length===6&&new Set(p.profiles.map(x=>x.normId)).size===6,'SIX_DISTINCT_SOURCE_COLUMNS');
 for(const x of p.profiles){const expected=x.system==='ceramic-brick'?keys.brick:keys.aac;
  ensure(x.rows.map(r=>r.key).join('|')===expected.join('|')&&x.rows.map(r=>r.ratePerM3).join('|')===signatures[x.normId],'SOURCE_ROSTER_INTEGRITY');
  ensure(x.rows.every(r=>units[r.key]===r.unitId&&r.category===(r.key==='labour'||r.key==='operators'?'labor':r.unitId==='machine_hour'?'equipment':'material')&&r.costTreatment===(r.key==='labour'?'OWN_COST':'INFORMATIONAL_SCOPE')&&r.procurement===false),'SOURCE_UNIT_CATEGORY_PAYMENT');
  ensure(x.thicknessM===(x.system==='ceramic-brick'?'0.25':x.system==='aac-400'?'0.4':'0.5'),'EXACT_SYSTEM_THICKNESS');
  ensure(x.rows.find(r=>r.key==='labour')?.resourceCode===(x.system==='ceramic-brick'?'000-1002-7':x.storeyHeightBand==='LTE4'?'000-1003-1':'000-1003-3'),'WORKER_GRADE_IS_NOT_MULTIPLIER');
  ensure(x.rows.find(r=>r.key==='tower-crane')?.resourceCode===(x.system==='ceramic-brick'?'02-0005':'02-0004'),'NO_NEIGHBOUR_MACHINE');
  const codes:Record<string,string|null>={operators:null,water:'01-0601-0001',brick:'01-3306-0005',timber:'01-6302-0095',mortar:'03-0405-0003','truck-crane':'02-0075',perforator:'33-0462','flatbed-truck':'40-0001',primer:'01-1704-0005',adhesive:'01-3502-0001','anchor-steel':'03-0102-0040','aac-block':'05-0402-0045'};
  ensure(x.rows.every(r=>['labour','tower-crane'].includes(r.key)||r.resourceCode===codes[r.key]),'EXACT_PRINTED_RESOURCE_CODES');
  const expectedSystem=x.normId.startsWith('08-02')?'ceramic-brick':x.normId.endsWith('01')||x.normId.endsWith('02')?'aac-400':'aac-500';
  const expectedBand=['08-02-001-07','08-03-004-01','08-03-004-03'].includes(x.normId)?'LTE4':'GT4';
  ensure(x.system===expectedSystem&&x.storeyHeightBand===expectedBand&&x.key===expectedSystem+(expectedBand==='LTE4'?'-upto4':'-above4')&&x.manufacturerInternal===(expectedSystem==='ceramic-brick'?null:'AEROC'),'COLUMN_SYSTEM_AND_BAND_IDENTITY');
 }
 ensure(p.residual.length===8&&p.newFULL===0&&p.publicationAllowed===false,'HONEST_PARTIAL_BOUNDARY');
}
/** The classifier chooses a published source column from geometry; it never calculates a resource quantity. */
export function selectMasonryWallProfileKrer08R1(system:MasonryWallSystemKrer08R1,storeyHeight:string|number):MasonryWallSourceProfileKrer08R1{
 ensure(['ceramic-brick','aac-400','aac-500'].includes(system),'UNSUPPORTED_MATERIAL_SYSTEM');
 const n=typeof storeyHeight==='number'?storeyHeight:Number(storeyHeight);ensure(Number.isFinite(n)&&n>0,'POSITIVE_FINITE_STOREY_HEIGHT');
 const p=pack.profiles.find(x=>x.system===system&&x.storeyHeightBand===(n<=4?'LTE4':'GT4'));ensure(p,'EXACT_SOURCE_PROFILE_REQUIRED');return p!;
}
export function assertMasonryWallConsumerKrer08R1(catalogId:string,system:MasonryWallSystemKrer08R1){
 const t=pack.targets.find(t=>t.catalogId===catalogId);ensure(t&&t.decision==='REUSE_WITH_PROVEN_ADAPTATION','EXACT_COMPATIBLE_EXISTING_CONSUMER');
 ensure((system==='ceramic-brick')===(t!.systemFamily==='ceramic-brick'),'MATERIAL_SYSTEM_CONSUMER_MISMATCH');return t!;
}
export function assertMasonryWallCurrentParentKrer08R1(header:{catalog_id:string;id:string;definition_version:number;definition_sha256:string},system:MasonryWallSystemKrer08R1):void{
 const t=assertMasonryWallConsumerKrer08R1(header.catalog_id,system);ensure(header.id===t.currentDefinitionId&&header.definition_version===t.currentDefinitionVersion&&header.definition_sha256===t.currentDefinitionSha256,'EXACT_CURRENT_PARENT_REQUIRED');
}
export const masonryWallKrer08RegistryR1=Object.freeze(pack.targets.map(t=>({...t,sourceProfileKeys:[...t.applicableSourceProfiles],sourceOnly:true as const,catalogCreated:false as const,fullTechnicalAcceptance:false as const})));
function volumeExpression(p:MasonryWallSourceProfileKrer08R1){return '(wall_length_m*wall_height_m-openings_area_m2)*'+p.thicknessM+'-nonmasonry_insert_volume_m3';}
function operations(p:MasonryWallSourceProfileKrer08R1){const list=p.system==='ceramic-brick'?pack.operationMaps['ceramic-brick']:pack.operationMaps.aac;return list.filter(o=>o.key!=='access'||p.storeyHeightBand==='LTE4');}
/** A source quantity definition through the existing shared core. No catalogue identity, publisher or second calculator. */
export function masonryWallDefinitionKrer08R1(profileKey:string):AutomaticOwnerDefinition{
 assertMasonryWallSourcePackKrer08R1();const p=pack.profiles.find(x=>x.key===profileKey);ensure(p,'EXACT_SOURCE_PROFILE_REQUIRED');const chosen=p!;
 const prefix=chosen.prefix,volume=volumeExpression(chosen),positive={kind:'formula_greater_than' as const,expression:volume,unitId:'m3',value:0},rid=(key:string)=>prefix+':'+key;
 const row=(key:string,title:string,category:string,unitId:string,expression:string,extra:Partial<AutomaticRowSpec>={}):AutomaticRowSpec=>({rowId:rid(key),formulaId:rid('formula:'+key),section:chosen.titleRu,category,title,unitId,expression,procurement:false,...extra});
 const facts:AutomaticParameterSpec[]=[{id:'kg_project_basis',title:'Принятая территориальная нормативная база проекта',valueType:'enum',kind:'conditional',unitId:null,values:[pack.projectBasisValue],requiredWhen:positive},
  {id:'source_system_conformance',title:'Подтверждённое проектное применение точной системы',valueType:'enum',kind:'conditional',unitId:null,values:[pack.sourceFactValue],requiredWhen:positive},
  {id:'approved_masonry_design_reference',title:'Принятый проект кладки и границы исходной операции',valueType:'text',kind:'conditional',unitId:null,requiredWhen:positive},
  ...chosen.rows.filter(r=>r.category==='equipment').map(r=>({id:'machine_fulfillment_'+r.key.replaceAll('-','_'),title:'Обеспечение: '+r.titleRu,valueType:'enum' as const,kind:'conditional' as const,unitId:null,values:[pack.machineFulfillmentChoices.own,pack.machineFulfillmentChoices.hired],requiredWhen:positive})),
  ...profileNeeds(chosen).map((n,i)=>({id:masonryWallKrer08NeedParameterIdsR1[i]!,title:n.titleRu,valueType:'decimal' as const,kind:'conditional' as const,unitId:null,min:0})),
 ];
 const allOps=operations(chosen),rows:AutomaticRowSpec[]=[row('net-volume','Объём кладки за вычетом проёмов и отдельных вставок','work','m3',volume,{costTreatment:'INFORMATIONAL_SCOPE',formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1',unitId:'m3',minimum:0,reasonRu:'Проёмы и отдельные вставки не могут превышать геометрический объём стены; вставки не вычитаются дважды.'}}),
  ...chosen.rows.flatMap(r=>{
   const demand='('+volume+')*'+r.ratePerM3,context=[...masonryWallKrer08FactIdsR1];
   if(r.key==='labour'||r.key==='operators')return [row(r.key,r.titleRu,r.category,r.unitId,demand,{inclusion:positive,costTreatment:r.key==='labour'?'OWN_COST':'INFORMATIONAL_SCOPE',inputParameterIds:context})];
   const consumedId=rid(r.key+'-consumed'),effective=effectiveResourceQuantityParameterId(consumedId),consumed=row(r.key+'-consumed','Нормативный расход: '+r.titleRu,r.category,r.unitId,demand,{inclusion:positive,costTreatment:'INFORMATIONAL_SCOPE',inputParameterIds:context,effectiveQuantityOutput:{parameterId:effective,unitId:r.unitId},...(r.category==='material'?{purchaseBalanceOwnerRowId:rid(r.key)}:{})});
   if(r.category==='equipment')return [consumed,...(['own','hired'] as const).map(mode=>row(r.key+'-'+mode,r.titleRu+(mode==='own'?' — собственная эксплуатация':' — полная эксплуатация по услуге'),r.category,r.unitId,effective,{inclusion:{kind:'and',operands:[positive,{kind:'equals',parameterId:'machine_fulfillment_'+r.key.replaceAll('-','_'),value:pack.machineFulfillmentChoices[mode]}]},costTreatment:'OWN_COST',procurement:mode==='hired',inputParameterIds:context}))];
   const balance=r.unitId==='piece'?effectivePurchaseBalanceExpressionsR1({ownerRowId:rid(r.key),orderUnitId:r.unitId,consumed:effective,stock:'0',reserve:'0',quantum:'1'}):effectivePurchaseBalanceExpressionsR1({ownerRowId:rid(r.key),orderUnitId:r.unitId,consumed:effective,stock:'0',reserve:'0',quantityMode:'canonical_decimal',balanceScope:'new_order_vs_required_consumption'});
   return [consumed,row(r.key,r.titleRu,r.category,r.unitId,r.unitId==='piece'?'ceil('+effective+')':effective,{inclusion:positive,costTreatment:'OWN_COST',procurement:true,inputParameterIds:context,...balance.owner,purchaseBalance:{...balance.owner.purchaseBalance!,balanceScope:'new_order_vs_required_consumption',requirementBasis:'selected_supply_order',plannedConsumptionExpression:effective} as CanonicalPurchaseBalanceV1})];
  }),
  ...allOps.map(o=>row('operation:'+o.key,o.titleRu,'work','m3',volume,{inclusion:positive,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',inputParameterIds:[...masonryWallKrer08FactIdsR1]})),
  ...profileNeeds(chosen).map((n,i)=>row('need:'+n.key,n.titleRu,'service','',masonryWallKrer08NeedParameterIdsR1[i]!,{inclusion:positive,costTreatment:'INFORMATIONAL_SCOPE'})),
 ];
 const built=buildAutomaticConstructionOwnerR1({contract:pack.contract,semanticOwner:prefix,sourceId:pack.sourceId,normId:chosen.normId,sourceMetadata:{source_title:chosen.titleRu,source_document_version:pack.source.edition,definition_hash:pack.source.sha256,artifact_sha256:pack.source.sha256,exact_locator:'КРЕР'+chosen.normId+',PDF'+chosen.sourcePages.join(',')+'; per1m3'},
  applicabilityRu:chosen.titleRu+'; только точная исходная система и явно принятая базаKG/КРЕР2015. Остальные части полного цикла остаются отдельными потребностями.',
  ordinary:[{id:primary,title:'Длина стены',valueType:'decimal',kind:'ordinary',unitId:'m',min:0},{id:'wall_height_m',title:'Высота стены',valueType:'decimal',kind:'ordinary',unitId:'m',min:0,numericPeerConstraints:{lessThanOrEqualParameter:'storey_height_m'}},
   {id:'openings_area_m2',title:'Суммарная площадь проёмов по наружному обводу коробок',valueType:'decimal',kind:'ordinary',unitId:'m2',min:0},{id:'nonmasonry_insert_volume_m3',title:'Объём отдельных конструкций другого материала вне уже вычтенных проёмов',valueType:'decimal',kind:'ordinary',unitId:'m3',min:0},
   {id:'storey_height_m',title:'Высота этажа',valueType:'decimal',kind:'ordinary',unitId:'m',min:0.000000001,...(chosen.storeyHeightBand==='LTE4'?{max:4}:{})}],profile:[],conditional:facts,rows,deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:[...pack.geometry.rules,'Нет автоматическихD500/300мм, силикатного кирпича, чужого клея, конструктивного армирования, проектных перемычек или источниковых цен2015.','Машино-часы не означают приобретение/аренду машины или её полный физический комплект.','Источник не задаёт универсальную торговую фасовку, склад, запас либо число постов.']});
 return {...built,parameters:built.parameters.map(q=>{
  if(masonryWallKrer08NeedParameterIdsR1.includes(q.parameter_id))return {...q,truth_metadata:unresolvedApplicationNormTruthR1(q.truth_metadata,'Открытый состав требует отдельного документа/нормы по типу gapKind. Это внутренняя задача разработки или реальный проектный факт; количества0/1/77 не принимаются как норма.')};
  if(q.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY')return q;
  if(q.parameter_id==='storey_height_m'&&chosen.storeyHeightBand==='GT4')q={...q,constraints_json:{...q.constraints_json,exclusiveMin:4}};
  return {...q,truth_metadata:{...q.truth_metadata,source_confirmation_required:false,...(!geometry.includes(q.parameter_id as typeof geometry[number])?{value_source_role:'PROJECT_SPECIFIC_INPUT',provenance:{consumer_input_role_v1:'OBJECT_FACT'}}:{provenance:{consumer_input_role_v1:'OBJECT_GEOMETRY'}})}};
 }),resources:built.resources.map(r=>{
  const key=r.row_id.slice(prefix.length+1),source=chosen.rows.find(x=>x.key===key||[x.key+'-consumed',x.key+'-own',x.key+'-hired'].includes(key)),need=profileNeeds(chosen).find(n=>key==='need:'+n.key),included=key.startsWith('operation:'),own=key==='labour';
  const formula=built.formulas.find(f=>f.formula_id===r.formula_id)!;
  const opKey=included?key.slice('operation:'.length):(source?.operation==='access'&&chosen.storeyHeightBand==='GT4'?'masonry':source?.operation)??(need?'need:'+need.key:'geometry');
  const op=allOps.find(o=>o.key===opKey),opTitle=op?.titleRu??need?.titleRu??'Определить геометрический объём стены';
  const materialOwner=source?.category==='material'&&key===source.key,machineOwner=source?.category==='equipment'&&(key===source.key+'-own'||key===source.key+'-hired');
  const extraOps=own?allOps.filter(o=>o.key!==opKey):source?.key==='aac-block'?allOps.filter(o=>['handling','cutting'].includes(o.key)):source?.key==='adhesive'?allOps.filter(o=>o.key==='masonry'):[];
  return rehash({...r,...(included?{cost_owner_id:rid('labour')}:{}),resource_graph:{...r.resource_graph,
   ...(!need?{derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:r.unit_id,parameterIds:[...formula.input_parameter_ids],reasonRu:'Автоматический расход меняется через геометрию и принятый профиль. Явная ручная правка сохраняет исходное вычисленное количество и не изменяет норму источника.'}}:{}),
   ...(included?{parentCostOwnerId:rid('labour'),includedInResourceOwnerRowId:rid('labour')}:{}),
   operationCompositionV1:{contractVersion:'canonical-operation-resource/v1',groupId:prefix,groupTitleRu:chosen.titleRu,operationId:rid('operation:'+opKey),operationTitleRu:opTitle,processOrdinal:need?100:included?20:10,completionCriterionRu:need?'Устранён конкретный проектный или нормативный пробел с полным применимым составом.':'Доказан исходный количественный состав; фактическая стройготовность и полный цикл этим не приняты.',...(extraOps.length?{additionalOperations:extraOps.map(o=>({operationId:rid('operation:'+o.key),operationTitleRu:o.titleRu,processOrdinal:20}))}:{})},
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,detailsRu:[]}},
   source_metadata:{...r.source_metadata,automaticGenericPriceInheritanceAllowed:false,normativeTrace:need?[]:[{sourceId:pack.sourceId,normId:chosen.normId,source_artifact_sha256:pack.source.sha256,official_url:pack.source.officialUrl,exact_locator:'КРЕР'+chosen.normId+',PDF'+chosen.sourcePages.join(',')+';1m3'}],
    ...(need?{sourceRole:'UNRESOLVED_SEPARATE_MASONRY_CYCLE_OBLIGATION',normative_source_ids:[],gapKind:need.kind,missingFact:need.missingRu,resolutionOwner:need.owner}:{sourceRole:source?'EXACT_KG_KRER08_SOURCE_CONSUMPTION_NORM':'SOURCE_OPERATION_COMPOSITION',resourceCode:source?.resourceCode??null,sourceQuantityRatePerM3:source?.ratePerM3??null,sourceQuantityBasisUnit:'m3',source_artifact_sha256:pack.source.sha256,exact_column:chosen.normId,physicalDemandOnly:!own&&!materialOwner&&!machineOwner,sourceNormPrices2015NotImported:true}),
    ...(included?{wholeLabourNotDivided:true,operationMarkerIsNotPhysicalToolOrScaffoldCount:true}:{}),
    ...(machineOwner?{normativeResourceCode:source!.resourceCode,machinePriceCoverageRequired:'FULL_MACHINE_SOURCE_COST',machinePriceOperationScope:'FULL_SOURCE_OPERATION',operatorAdditionalPaidOwnerAdmitted:false}:{}),
    ...(key==='operators'?{informationalNotAdditionalPaidOwner:true,operatorPriceIncludedInSourceMachineOperation:true}:{}),
    ...(source?.category==='equipment'?{physicalNormOwnerRowId:rid(source.key+'-consumed')}:{}),
    ...(materialOwner?{baseUnitMaterialSupplyOwner:true,newOrderScopeNotWarehouseStock:true,retailPackagingAssumed:false}:{}),
    full_technical_acceptance:false,purchase_order_admission:materialOwner,sourcePacketAuthorDoesNotPublish:true}});
 })};
}
/** TEST_ONLY examples must never become profile defaults or project approval. */
export function masonryWallScenarioFactsKrer08R1(input:Record<string,string|number>){return {...input,kg_project_basis:pack.projectBasisValue,source_system_conformance:pack.sourceFactValue,approved_masonry_design_reference:'TEST_ONLY источник и проект выбранного профиля; не фактический акт/конструктивный расчёт'};}
export async function compileMasonryWallSourceKrer08R1(input:{catalogId:string;profileKey:string;parameters:Record<string,unknown>;rowOverrides?:CanonicalEstimateCompileCoreInput['rowOverrides'];priceItems?:CanonicalEstimateCompileCoreInput['priceItems']}){
 const p=pack.profiles.find(p=>p.key===input.profileKey);ensure(p,'EXACT_SOURCE_PROFILE_REQUIRED');assertMasonryWallConsumerKrer08R1(input.catalogId,p!.system as MasonryWallSystemKrer08R1);const d=masonryWallDefinitionKrer08R1(p!.key);
 const compiled=await compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:pack.contract,catalogId:input.catalogId,primaryMeasureParameterId:primary,parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:input.parameters,confirmedParameters:{},rowOverrides:input.rowOverrides??{},priceItems:input.priceItems??[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:async v=>estimateDeterministicHash(v)});
 return {profileKey:p!.key,normId:p!.normId,identityAdmitted:false,publicationAllowed:false,fullTechnicalAcceptance:false,compiled} as const;
}
export function masonryWallCompletenessMapKrer08R1(profileKey:string){
 const p=pack.profiles.find(x=>x.key===profileKey);ensure(p,'EXACT_SOURCE_PROFILE_REQUIRED');const id=(key:string)=>p!.prefix+':'+key;
 return {contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',generatedFromCurrentRows:false,fullTechnicalAcceptance:false,sourceEvidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,'КРЕР'+p!.normId],entries:[
  ...p!.rows.map(r=>({expectedResourceId:p!.normId+':'+r.key,operationId:id('operation:'+(r.operation==='access'&&p!.storeyHeightBand==='GT4'?'masonry':r.operation)),requiredOperationIds:[id('operation:'+(r.operation==='access'&&p!.storeyHeightBand==='GT4'?'masonry':r.operation))],category:r.category,unitId:r.unitId,specification:r.titleRu,condition:p!.key,sourceId:pack.sourceId,quantityRule:'EXACT_SOURCE_SCALAR_PER_NET_M3',formulaId:id('formula:'+r.key+(!['labour','operators'].includes(r.key)?'-consumed':'')),resolution:{kind:'ROW',rowId:id(r.key+(!['labour','operators'].includes(r.key)?'-consumed':''))}})),
  ...operations(p!).map(o=>({expectedResourceId:p!.normId+':operation:'+o.key,operationId:id('operation:'+o.key),requiredOperationIds:[id('operation:'+o.key)],category:'work',unitId:'m3',specification:o.source,condition:p!.key,sourceId:pack.sourceId,quantityRule:'INCLUDED_WHOLE_LABOUR_NO_DIVISION',formulaId:id('formula:operation:'+o.key),resolution:{kind:'INCLUDED_COMPONENT_ROW',rowId:id('operation:'+o.key),parentRowId:id('labour')}})),
  ...profileNeeds(p!).map(n=>({expectedResourceId:p!.normId+':need:'+n.key,operationId:id('operation:need:'+n.key),requiredOperationIds:[id('operation:need:'+n.key)],category:'service',unitId:null,specification:n.missingRu,condition:p!.key,sourceId:pack.sourceId,sourceNormQuantityAccepted:false,quantityRule:n.kind,formulaId:id('formula:need:'+n.key),resolution:{kind:'ROW',rowId:id('need:'+n.key)}}))],residual:profileNeeds(p!)};
}
