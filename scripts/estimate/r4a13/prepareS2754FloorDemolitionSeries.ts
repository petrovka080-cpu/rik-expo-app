import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {floorDemolitionDefinitionS2752,floorDemolitionControlInputS2752,floorDemolitionCompletenessMapS2752,compileFloorDemolitionS2752,
 FLOOR_DEMOLITION_SERIES_S2752 as pack,FLOOR_DEMOLITION_SOURCE_METADATA_S2752 as source} from '../../../src/lib/estimate/v4/floorDemolitionSeriesS2752';
const groupId='demolition_floor_coverings_krer_4604010_s2754',groupNameRu='Демонтаж покрытий полов';
const expected=[['10.83815','1.29575'],['16.33355','0.6248'],['7.242',null],['23.643','3.4222'],['21.3994','4.9913']];
export function floorDemolitionSeriesS2754Config(index:number,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
 const type=pack.types[index];if(!type)throw new Error('EXACT_PREPARED_FIVE_TYPES_ONLY');
 const definition=floorDemolitionDefinitionS2752(index),prefix=`floor-demolition:${type.key}`;
 const included=['Разборка только указанного покрытия по точной колонке КРЕР',
  'Нормативный труд рабочих и конкретные механизмы; машинист включён в стоимость механизма',
  'Уборка, сортировка, штабелирование; перемещения до 130 м суммарно, до 50 м от объекта, спуск через окно в лотках',
  'При необходимости отдельная согласованная услуга дополнительного обращения с отходами; один владелец её полной цены'];
 const excluded=['Основание пола, лаги, стяжка и новое покрытие','Другая колонка, материал и агрессивная среда',
  'Масса, мешки, рейсы и пригодный выход из площади не вычисляются','Исторические базовые цены не используются как текущие'];
 return {contract:pack.contract,stopCode:'S2754_FLOOR_'+type.key.toUpperCase().replaceAll('-','_'),
 applicationName:'s2754-floor-demolition-'+type.key,expectedBranch:'codex/r4-a5-clean-08b18902',
 masterPath:'C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (93).md',
 masterSha256:'3238f07235f59b3efca468f44c6d34c92a2d804e973f2228b8193ccf4503a2fc',
 parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,
 currentReleasePath:resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),
 outputRoot:resolve('.release-runtime/r568/s27-51/floor-demolition-series/publication/'+type.key),
 sourcePaths:['scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts','src/lib/estimate/v4/floorDemolitionSeriesS2752.ts',
  'data/estimate-benchmarks/source-packs/floor-demolition-series-s27-52.json',
  'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  'src/lib/estimate/v4/automaticConstructionOwnerR1.ts',pack.source.localArtifact],
 catalogId:type.catalogId,sourceId:pack.sourceId,normId:type.column,sourceMetadata:{...source,source_kind:'OFFICIAL_KG_RECONSTRUCTION_RATE_AND_EXPLICIT_PROJECT_WASTE_SCOPE'},
 parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
 shortInput:{floor_covering_area_m2:35.5},acceptanceInput:floorDemolitionControlInputS2752(index),
 runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[0,0,0],
 benchmarkOrdinal:index,validationScenario:'S2754_FIVE_EXACT_KRER_FLOOR_TYPES_NO_DUPLICATE_INCLUDED_COST',
 passport:{canonicalRuName:type.titleRu,workKey:type.workKey,physicalResultRu:`Снято ${type.confirmedMaterialRu}; предусмотренные уборка и обращение с отходами учтены по выбранной схеме.`,
  includedScopeRu:included,excludedScopeRu:excluded,independentCompletenessMap:floorDemolitionCompletenessMapS2752(index)},
 applicability:{country:'KG',rateColumn:type.column,sourceArtifactSha256:pack.source.sha256,
  existingCovering:type.confirmedMaterialRu,ordinaryReconstructionOnly:true,otherLayersExcluded:true,
  retainedOnSiteRequiresNoAdditionalHandling:true,externalServiceRequiresConfirmedMassAndScope:true,
  operatorIncludedInMachine:true,sourcePricesNotCurrent:true},
 binding:{rowId:prefix+':labor',applicability:{exactRateColumn:type.column,existingCovering:type.confirmedMaterialRu}},
 locator:{key:'s2754-floor-'+type.key,payload:{primarySource:pack.source,exactType:type,
  normativeScope:pack.sourceScopeRu,wasteSchemeChoices:[pack.retainModeValue,pack.onSiteExtraModeValue,pack.contractorModeValue],
  noMassOrSalvageYieldDerived:true,fullExternalWasteChainNotProvenByRetainControl:true}},
 search:{primaryUom:'m2',canonicalNameRu:type.titleRu,aliases:[type.confirmedMaterialRu,'Демонтаж '+type.confirmedMaterialRu],
  shortScopeRu:`${type.confirmedMaterialRu}; ${type.column}. Конкретные труд и механизмы. Включённая уборка не оплачивается повторно; внешний вывоз определяется отдельно по согласованной услуге.`,
  keyDistinguishingParameters:['existing_covering_confirmed','object_conditions','waste_handling_mode'],
  clarificationFields:definition.parameters.map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:excluded,
  extraSearchTermsRu:'снять разобрать демонтаж пол покрытие '+type.confirmedMaterialRu,
  sourceProvenance:{sourcePack:'floor-demolition-series-s27-52.json',exactRateColumn:type.column,primaryMeasureParameterId:'floor_covering_area_m2'}},
 catalogAppend:{identity:{namespace:'global',domain:'demolition',sourceIdentity:'krer46-2015:floor-covering:'+type.column,
  workKey:type.workKey,titleRu:type.titleRu,denominatorEligible:true},
  searchPlacement:{groupMode:index===0?'create':'join',groupId,groupNameRu,domainId:'demolition',systemId:'demolition',
   subsystemId:groupId,assemblyId:groupId,workFamilyId:'demolition',breadcrumb:[groupNameRu],
   groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP',exactRateFamily:'KRER_46_04_010'},
   membershipOrdinal:index,independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,appendedWithoutReplacingExistingIdentity:true},
   elementType:'WORK',operationKind:'DEMOLITION',technologyVariant:type.column+'; '+type.confirmedMaterialRu,
   constructionState:'EXISTING',normativeClassifiers:[type.column],applicabilityTags:['FLOOR_COVERING_DEMOLITION',type.key.toUpperCase()],
   publicationState:'ADMITTED_BACKEND',catalogOrigin:'GLOBAL',adjudicationClass:'EFFECTIVE_WORK',selectable:true}},
 forbiddenAdjacentMatchers:[/46-04-010-05|46-04-011|new_floor|screed_install|новое покрытие|агрессивн.*среда/iu],
 owner:'S2754_FIVE_FLOOR_TYPES_SINGLE_WRITER',receiptFileStem:'floor_'+type.key,
 verifyCore:async()=>{
  assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
  const input=floorDemolitionControlInputS2752(index),result=await compileFloorDemolitionS2752(index,input);
  assert.equal(result.preliminaryNeeds.length,0);assert.equal(result.rows.find(r=>r.row_id===prefix+':labor')?.quantity,expected[index][0]);
  if(type.machine)assert.equal(result.rows.find(r=>r.row_id===prefix+':machine')?.quantity,expected[index][1]);
  assert.equal(result.rows.filter(r=>r.included_in_procurement).length,0);
  assert(result.rows.filter(r=>(r.calculation_trace as {resourceGraph:{costTreatment:string}}).resourceGraph.costTreatment==='INCLUDED_IN_RESOURCE_ROWS').every(r=>!r.included_in_estimate));
  const extra=await compileFloorDemolitionS2752(index,{...input,waste_handling_mode:pack.onSiteExtraModeValue});
  const onsite=extra.preliminaryNeeds.find(r=>r.row_id===prefix+':waste-onsite-service');assert(onsite);
  assert(!onsite.missing_parameter_ids.includes('haul_distance_km'));
  const external=await compileFloorDemolitionS2752(index,{...input,waste_handling_mode:pack.contractorModeValue});
  assert(external.preliminaryNeeds.some(r=>r.row_id===prefix+':waste-service'&&r.missing_parameter_ids.includes('floor_waste_mass_t')));
  if(type.machine){const hired=await compileFloorDemolitionS2752(index,{...input,mechanism_fulfillment:'Требуется аренда механизма с машинистом; единая ставка за машино-час'});
   assert.equal(hired.rows.filter(r=>r.category==='equipment').length,1);assert.equal(hired.rows.filter(r=>r.included_in_procurement).length,1);
   assert.equal(hired.rows.find(r=>r.row_id===prefix+':machine-hired')?.quantity,expected[index][1]);}
  return {status:'GREEN_EXACT_KRER_FLOOR_TYPE',column:type.column,verifiedLabor:expected[index][0],verifiedMachine:expected[index][1],
   includedCostsNotDuplicated:true,retainedOnSiteControl:true,unresolvedExternalServiceNotFalselyCalculated:true};
 },
 };
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754FloorDemolitionSeries.ts')){
 const index=Number(process.argv.find(a=>a.startsWith('--index='))?.split('=')[1]);
 const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 void runMasterSingleDefinitionSuccessorR1(floorDemolitionSeriesS2754Config(index,{releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
  .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
