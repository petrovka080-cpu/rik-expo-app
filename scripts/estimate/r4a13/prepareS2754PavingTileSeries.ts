import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {floorDemolitionSeriesS2754Config} from './prepareS2754FloorDemolitionSeries';
import {pavingTileSourcePackS2754 as pack,pavingTileDefinitionS2754,pavingTileCompletenessMapS2754,compilePavingTileS2754,
 ownPavingMachinesS2754,hiredPavingMachinesS2754} from '../../../src/lib/estimate/v4/pavingTilePreparedBaseS2754';
export function pavingTileControlInputS2754(index:number){return {paving_area_m2:35.5,prepared_base:pack.preparedBaseValue,
 no_cut_layout:pack.noCutValue,traffic_condition:pack.trafficValue,water_transport_km:0,mechanism_fulfillment:ownPavingMachinesS2754};}
export function pavingTileConfigS2754(index:number,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
 const type=pack.types[index];if(!type)throw Error('S2754_EXACT_THREE_PAVING_COLUMNS_ONLY');
 const base=floorDemolitionSeriesS2754Config(0,parent),definition=pavingTileDefinitionS2754(index),prefix='paving-tile:'+type.key;
 const included=[pack.scopeRu,...pack.includedRu,'Три исходных материала и четыре конкретных механизма; общий труд машинистов показан справочно без второй цены'];
 return {...base,contract:pack.contract,stopCode:'S2754_PAVING_'+index,applicationName:'s2754-paving-tile-'+type.key,
 outputRoot:resolve('.release-runtime/r568/s27-54/paving-tile-series/publication/'+type.key),catalogId:type.catalogId,sourceId:pack.sourceId,normId:type.column,
 sourcePaths:['scripts/estimate/r4a13/prepareS2754PavingTileSeries.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
  'src/lib/estimate/v4/pavingTilePreparedBaseS2754.ts','data/estimate-benchmarks/source-packs/paving-tile-prepared-base-s27-54.json',
  'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',pack.source.localArtifact],
 sourceMetadata:{source_title:'КРЕР27-2015, покрытие из тротуарной плитки '+type.column,source_authority:'Министерство строительства Кыргызской Республики',
  source_kind:'OFFICIAL_EXACT_PAVING_NORMATIVE_PROCESS_ADDITIONAL_SCOPE_UNRESOLVED',official_url:pack.source.officialUrl,
  artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu+' Плотность'+type.density+'шт./м²; только обычный режим движения и доставка воды до5км. Полная комплектация всего участка не присвоена.'},
 parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
 shortInput:{paving_area_m2:35.5},acceptanceInput:pavingTileControlInputS2754(index),
 validationScenario:'S2754_EXACT_PAVING_COLUMNS_CONSUMPTION_PRICE_OWNERS_AND_FOUR_OPEN_ADDITIONAL_NEEDS',
 passport:{canonicalRuName:type.titleRu,workKey:type.workKey,physicalResultRu:'Подтверждён весь указанный нормативный процесс на готовом основании, включая очистку поверхности. Дополнительная комплектация участка требует подтверждения.',
  includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(gap=>prefix+':'+gap.id),
  independentCompletenessMap:pavingTileCompletenessMapS2754(index)},
 applicability:{country:'KG',exactRateColumn:type.column,pieceDensityPerM2:type.density,preparedBaseRequired:true,cuttingExcluded:true,
  adjacentSystematicTrafficExcluded:true,waterTransportMaxKm:5,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
 binding:{rowId:prefix+':labor',applicability:{exactRateColumn:type.column,pieceDensityPerM2:type.density,fullTechnicalAcceptance:false}},
 locator:{key:'s2754-paving-'+type.key,payload:{sourcePack:pack,type,fullTechnicalAcceptance:false,
  includedSurfaceCleaningAndLevelCheckNotDuplicated:true,operatorDistributionNotInvented:true,secondTwoPercentReserveForbidden:true}},
 search:{primaryUom:'m2',canonicalNameRu:type.titleRu,aliases:['Тротуарная плитка '+type.density+'шт./м² на готовом основании','Мощение без резки '+type.density+'шт./м²'],
  shortScopeRu:pack.scopeRu+' Плотность'+type.density+'шт./м². Известны расход плитки, песка, воды и нормативные механизмы.',
  keyDistinguishingParameters:['prepared_base','no_cut_layout','traffic_condition','water_transport_km','tile_specification'],
  clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
  includedBoundaries:included,excludedBoundaries:pack.excludedRu,extraSearchTermsRu:'тротуар плитка дорожка мощение песок вода швы виброплита готовое основание',
  sourceProvenance:{sourcePack:'paving-tile-prepared-base-s27-54.json',primaryMeasureParameterId:'paving_area_m2',exactRateColumn:type.column,fullTechnicalAcceptance:false}},
 catalogAppend:{identity:{namespace:'global',domain:'transport',sourceIdentity:'krer27-2015:paving-tile:'+type.column,
  workKey:type.workKey,titleRu:type.titleRu,denominatorEligible:true},searchPlacement:{...base.catalogAppend!.searchPlacement,
  groupMode:'join',groupId:'wg:expanded:sidewalks',groupNameRu:'Дороги, транспорт и площадки: устройство тротуаров',domainId:'transport',systemId:'transport',
  subsystemId:'wg:expanded:sidewalks',assemblyId:'wg:expanded:sidewalks',workFamilyId:'wg:expanded:sidewalks',breadcrumb:['Дороги, транспорт и площадки: устройство тротуаров'],
  membershipOrdinal:1+index,groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},
  independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,preliminaryNormativeCoreOnly:true},
  operationKind:'NEW_INSTALLATION',constructionState:'NEW',technologyVariant:type.column+'; '+type.density+'шт./м²; без резки',
  normativeClassifiers:[type.column],applicabilityTags:['PAVING_TILE','PREPARED_BASE','NO_CUT','NORMAL_TRAFFIC','DENSITY_'+type.density]}},
 forbiddenAdjacentMatchers:[/27-07-005-0[4567]|cutting_disc|diamond_disc|curb_install|base_install/iu],owner:'S2754_PAVING_SINGLE_WRITER',receiptFileStem:'paving_'+index,
 verifyCore:async()=>{
  assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:pavingTileCompletenessMapS2754(index),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
  const input=pavingTileControlInputS2754(index),r=await compilePavingTileS2754(index,input);
  for(const [id,qty] of [['labor',['37.275','41.89','63.545'][index]],['operator','0.213'],['forklift-own','0.1065'],['plate-own','2.0235'],
   ['water-truck-own','0.1065'],['truck-own','0.1065'],['water-consumed','0.71'],['sand-consumed','0.1775'],['tile-consumed','36.21']])
   assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,qty,id);
  assert.equal(r.rows.length,13);assert.equal(r.preliminaryNeeds.length,7);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,0);
  const operator=r.rows.find(row=>row.row_id===prefix+':operator');assert.equal(operator?.included_in_estimate,false);assert.equal(operator?.unit_price,null);
  const hired=await compilePavingTileS2754(index,{...input,mechanism_fulfillment:hiredPavingMachinesS2754});
  assert.equal(hired.rows.filter(row=>row.category==='equipment').length,4);assert.equal(hired.rows.filter(row=>row.included_in_procurement).length,4);
  const withoutSpecification=await compilePavingTileS2754(index,{...input,tile_stock:0,tile_reserve:0,tile_quantum:1});
  assert(!withoutSpecification.rows.some(row=>row.row_id===prefix+':tile'));
  assert(withoutSpecification.preliminaryNeeds.find(row=>row.row_id===prefix+':tile')?.missing_parameter_ids.includes('tile_specification'));
  const order=await compilePavingTileS2754(index,{...input,tile_stock:0,tile_reserve:0,tile_quantum:1,
   tile_specification:'КОНТРОЛЬНАЯ СПЕЦИФИКАЦИЯ ДЛЯ ПРОВЕРКИ ГРАНИЦЫ; не изделие и не проект объекта'});
  assert.equal(order.rows.find(row=>row.row_id===prefix+':tile')?.quantity,'37');
  const notPrepared=await compilePavingTileS2754(index,{...input,prepared_base:undefined});assert.equal(notPrepared.rows.length,0);
  await assert.rejects(()=>compilePavingTileS2754(index,{...input,water_transport_km:5.1}));
  await assert.rejects(()=>compilePavingTileS2754(index,{...input,no_cut_layout:'Требуется резка'}));
  await assert.rejects(()=>compilePavingTileS2754(index,{...input,traffic_condition:'Систематическое движение на другой половине проезжей части'}));
  return {status:'GREEN_LIMITED_EXACT_PAVING_NORMATIVE_PROCESS',column:type.column,density:type.density,knownRows:13,needs:7,
   knownMaterialConsumptions:3,includedCleaningAndLevelCheck:true,operatorAggregateOnly:true,exactProductRequiredForOrder:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
 }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754PavingTileSeries.ts')){
 const index=Number(process.argv.find(a=>a.startsWith('--index='))?.split('=')[1]),current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 void runMasterSingleDefinitionSuccessorR1(pavingTileConfigS2754(index,{releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
 .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
