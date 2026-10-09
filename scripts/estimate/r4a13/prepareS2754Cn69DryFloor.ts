import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {cn87SeparationConfigS2754} from './prepareS2754Cn87SeparationScreed';
import {cn69DryFloorPackS2754 as pack,cn69DryFloorDefinitionS2754 as definition,cn69DryFloorCompletenessMapS2754,compileCn69DryFloorS2754,cn69DryFloorPrefixS2754 as prefix} from '../../../src/lib/estimate/v4/cn69DryFloorS2754';
export function cn69ControlInputS2754(){return {floor_area_m2:35.5,layer_thickness_mm:4,base_confirmed:pack.baseValue,moisture_ingress_prevented:pack.moistureValue,
 conditions_confirmed:pack.conditionsValue,primer_drying_confirmed:pack.primerValue,product_variant_confirmed:pack.productValue,ct17_container:'5 л'};}
export function cn69ExplicitControlS2754(){return {...cn69ControlInputS2754(),cn69_stock:0,cn69_reserve:0,cn69_supplier_bag_multiple:1,
 ct17_rate_l_m2:0.2,ct17_coat_count:1,ct17_stock:0,ct17_reserve:0,ct17_5l_supplier_multiple:1,cn69_water_l_per_25kg:5.8,water_stock:0,water_reserve:0,water_quantum_l:1};}
export function cn69DryFloorConfigS2754(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
 const base=cn87SeparationConfigS2754(parent),included=[pack.scopeRu,'Переиспользован принятый CN69global25кг: площадь×фактическая толщина×приблизительно1,3кг/м²/мм',
  'CT17global: фактический расход, проходы, полное высыхание и одна фасовка1/2/5/10л','Вода5,5–6л/25кг смешиваемой массы отдельно от заказа'];
 const gid='floor_leveling_cn69_global_s2754',gname='Выравнивание пола самонивелирующимися смесями';
 return {...base,contract:pack.contract,stopCode:'S2754_CN69_DRY_FLOOR',applicationName:'s2754-cn69-dry-floor',outputRoot:resolve('.release-runtime/r568/s27-54/cn69-dry-floor/publication'),
  expectedParentShape:[0,0,0],catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourcePaths:['scripts/estimate/r4a13/prepareS2754Cn69DryFloor.ts','scripts/estimate/r4a13/prepareS2754Cn87SeparationScreed.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
   'src/lib/estimate/v4/cn69DryFloorS2754.ts','data/estimate-benchmarks/source-packs/cn69-dry-floor-s27-54.json',pack.acceptedPhysicalSourcePack,
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',...Object.values(pack.sources).map(s=>s.localArtifact)],
  sourceMetadata:{source_title:'Ceresit CN69 NIVEL SUPERglobal25кг и CT17global03.24: сухой внутренний пол',source_authority:'Изготовитель Ceresit/Henkel; принятый физический профиль переиспользован',
   source_kind:'MANUFACTURER_APPROXIMATE_CONSUMPTION_WITH_STRICT_DRY_INDOOR_SCOPE',official_url:pack.sources.cn69.officialUrl,artifact_sha256:pack.sources.cn69.sha256,
   exact_locator:pack.sources.cn69.locatorRu,use_restriction:pack.scopeRu+' КлассC25/C35, часы и дополнительные количества не назначены; полный тип не принят.'},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{floor_area_m2:35.5},acceptanceInput:cn69ControlInputS2754(),validationScenario:'S2754_CN69_GLOBAL_DRY_FLOOR_2_10MM_ONE_PRIMER_CONTAINER',
  passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Раскрыты CN69, CT17, вода и конкретный инструмент; полный труд, контроль и завершение требуют источника.',
   includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(gap=>prefix+':'+gap.id),independentCompletenessMap:cn69DryFloorCompletenessMapS2754()},
  applicability:{country:'KG',product:'CN69global25kg',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,layerMm:[2,10],dryIndoor:true,underfloorHeating:false,
   floorTemperatureStrictlyAbove15:true,airTemperatureStrictlyAbove18:true,humidityStrictlyBelow75:true,strengthClassNotAssigned:true,sourceClassConflictC25C35:true,
   confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
  binding:{rowId:prefix+':cn69-consumed',applicability:{approximateRateKgM2Mm:1.3,layerMm:[2,10],global25KgOnly:true}},
  locator:{key:'s2754-cn69-dry-floor',payload:{sourcePack:pack,acceptedProfileReused:true,oneCt17ContainerOnly:true,oldBroadFlooringDefinitionUntouched:true,
   noStrengthClassAssigned:true,waterNotFromOrder:true,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['Ручное выравнивание CN69global25кг по готовой цементной стяжке','Наливной выравнивающий слой CN69 с CT17 в сухом помещении'],
   shortScopeRu:pack.scopeRu+' Смесь, грунтовка, вода и инструмент раскрыты; часы и завершение требуют источника.',
   keyDistinguishingParameters:['layer_thickness_mm','product_variant_confirmed','moisture_ingress_prevented','conditions_confirmed','ct17_container'],
   clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
   extraSearchTermsRu:'CN69 NIVEL SUPER Ceresit наливной выравнивание пол CT17 грунтовка игольчатый валик ракля миксер вода25кг2–10мм',
   sourceProvenance:{sourcePack:'cn69-dry-floor-s27-54.json',acceptedPhysicalProfileId:pack.acceptedPhysicalProfileId,primaryMeasureParameterId:'floor_area_m2',fullTechnicalAcceptance:false}},
  catalogAppend:{identity:{namespace:'global',domain:'flooring',sourceIdentity:'ceresit-cn69-global25kg:tds0420:manual-dry-indoor-cement-2to10mm',workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},
   searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:'create',groupId:gid,groupNameRu:gname,domainId:'flooring',systemId:'flooring',subsystemId:gid,assemblyId:gid,workFamilyId:gid,
    breadcrumb:[gname],membershipOrdinal:0,groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},
    independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerScopeOnly:true},
    constructionState:'READY_DRY_ABSORBENT_CEMENT_FLOOR',technologyVariant:'CN69_GLOBAL25KG_2_10MM_MANUAL_CT17_GLOBAL',normativeClassifiers:['C_CN69_TDS_1_0420','CT17_PROFI_03_24'],
    applicabilityTags:['CN69_GLOBAL_25KG','DRY_INDOOR','EXACT_2_10MM','MEDIUM_TRAFFIC','MANUFACTURER_PARTIAL']}},
  forbiddenAdjacentMatchers:[/CN87|CM11|gypsum_machine|CL51|ламинат|плинтус/iu],owner:'S2754_CN69_SINGLE_WRITER',receiptFileStem:'cn69_dry_floor',
  verifyCore:async()=>{
   for(const source of Object.values(pack.sources))assert.equal(createHash('sha256').update(readFileSync(source.localArtifact)).digest('hex'),source.sha256);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:cn69DryFloorCompletenessMapS2754(),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
   const minimal=await compileCn69DryFloorS2754(cn69ControlInputS2754());assert.equal(minimal.rows.length,3);assert.equal(minimal.rows.filter(row=>row.included_in_procurement).length,0);
   const input=cn69ExplicitControlS2754(),r=await compileCn69DryFloorS2754(input);assert.equal(r.rows.length,10);assert.equal(r.preliminaryNeeds.length,9);
   for(const [id,quantity] of [['cn69-consumed','184.6'],['cn69-order','200'],['cn69-bags','8'],['ct17-consumed','7.1'],['ct17-5l-order','10'],['ct17-5l-containers','2'],
    ['water-consumed','42.8272'],['water-order','43'],['water-min','40.612'],['water-max','44.304']])assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,quantity,id);
   assert.equal(r.rows.filter(row=>row.included_in_procurement).length,3);
   for(const size of pack.primerContainerSizesL){const selected=await compileCn69DryFloorS2754({...input,ct17_container:size+' л',['ct17_'+size+'l_supplier_multiple']:1});
    assert.equal(selected.rows.filter(row=>row.included_in_procurement&&row.row_id.includes(':ct17-')).length,1);}
   for(const value of [2,10]){const layer=await compileCn69DryFloorS2754({...input,layer_thickness_mm:value});assert.equal(layer.rows.find(row=>row.row_id===prefix+':cn69-consumed')?.quantity,String(35.5*value*1.3));}
   const stock=await compileCn69DryFloorS2754({...input,cn69_stock:50,cn69_reserve:10,cn69_supplier_bag_multiple:2});assert.equal(stock.rows.find(row=>row.row_id===prefix+':cn69-order')?.quantity,'150');
   assert.equal(stock.rows.find(row=>row.row_id===prefix+':water-consumed')?.quantity,'42.8272');
   const noMoisture=await compileCn69DryFloorS2754({...input,moisture_ingress_prevented:undefined});assert.equal(noMoisture.rows.length,0);
   const noProduct=await compileCn69DryFloorS2754({...input,product_variant_confirmed:undefined});assert.equal(noProduct.rows.length,0);
   await assert.rejects(()=>compileCn69DryFloorS2754({...input,layer_thickness_mm:1.99}));await assert.rejects(()=>compileCn69DryFloorS2754({...input,layer_thickness_mm:10.01}));
   await assert.rejects(()=>compileCn69DryFloorS2754({...input,conditions_confirmed:'Пол15°C, воздух18°C, RH75%'}));
   await assert.rejects(()=>compileCn69DryFloorS2754({...input,cn69_water_l_per_25kg:6.1}));
   const cleaning=definition.resources.find(row=>row.row_id===prefix+':water-cleaning');assert.equal((cleaning?.resource_graph.publicResourcePresentationV1 as {specificationRu:string|null}).specificationRu,null);
   assert(definition.parameters.filter(p=>p.parameter_id.includes('stock')||p.parameter_id.includes('reserve')||p.parameter_id==='ct17_rate_l_m2').every(p=>p.default_value==null));
   return {status:'GREEN_LIMITED_CN69_CT17_DRY_FLOOR',knownRows:10,needs:9,procurementRows:3,approximateCn69Kg:184.6,cn69OrderedKg:200,bags25Kg:8,
    ct17ConsumedL:7.1,ct17OrderedL:10,waterConsumedL:42.8272,waterOrderedL:43,oneCt17ContainerOnly:true,waterNotBasedOnOrder:true,
    strictClimateBoundariesPreserved:true,noStrengthClassAssigned:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
  }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Cn69DryFloor.ts')){
 const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 void runMasterSingleDefinitionSuccessorR1(cn69DryFloorConfigS2754({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
 .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
