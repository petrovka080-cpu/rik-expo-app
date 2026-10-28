import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {floorDemolitionSeriesS2754Config} from './prepareS2754FloorDemolitionSeries';
import {ceilingThirdPuttyDefinitionS2754 as definition,ceilingThirdPuttySourcePackS2754 as pack,compileCeilingThirdPuttyS2754} from '../../../src/lib/estimate/v4/mineralCeilingThirdPuttyCoatS2754';
const prefix='ceiling-third-putty:krer150402706';
export const ceilingThirdPuttyControlInputS2754={ceiling_area_m2:35.5,ceiling_substrate:pack.substrateValue,
 third_coat_project_justification:pack.justificationValue,third_coat_project_reference:'КОНТРОЛЬНЫЙ СЦЕНАРИЙ, не проект объекта',room_height_m:3,
 room_conditions:'Сухое помещение; применение исходного масляно-клеевого состава подтверждено проектом'};
export function ceilingThirdPuttyConfigS2754(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
 const base=floorDemolitionSeriesS2754Config(0,parent),groupId='mineral_ceiling_third_putty_krer150402706',
  included=['Нормативное ядро: назначенный третий слой и его шлифование; исходный масляно-клеевой состав',
   'Три конкретных расходника и исходные труд/машины по колонке06; машинист не оплачивается повторно',
   'Нормативный расход отдельно от заказа; запас, наличие и квант поставки не назначены автоматически'],
  excluded=[...pack.excludedRu,'Полная техническая и закупочная готовность до закрытия дополнительных потребностей'];
 return {...base,contract:pack.contract,stopCode:'S2754_CEILING_THIRD_PUTTY',applicationName:'s2754-ceiling-third-putty',
 outputRoot:resolve('.release-runtime/r568/s27-54/ceiling-third-putty/publication'),catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
 sourcePaths:['scripts/estimate/r4a13/prepareS2754MineralCeilingThirdPutty.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
  'src/lib/estimate/v4/mineralCeilingThirdPuttyCoatS2754.ts','data/estimate-benchmarks/source-packs/mineral-ceiling-third-putty-coat-s27-54.json',
  'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
  'src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts','src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.test.ts',
  'src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts','src/lib/estimate/backendPlatform/canonicalProfessionalPdf.test.ts',pack.source.localArtifact],
 sourceMetadata:{source_title:'КРЕР15-2015, третий слой на потолках15-04-027-06',source_authority:'Министерство строительства Кыргызской Республики',
  source_kind:'OFFICIAL_ORIGINAL_NORMATIVE_CORE_ADDITIONAL_SCOPE_UNRESOLVED',official_url:pack.source.officialUrl,artifact_sha256:pack.source.sha256,
  exact_locator:'Стр.8 п.1.1(г); стр.8–9 п.1.2(а); стр.11 п.1.17; стр.191–192, таблица15-04-027, колонка06',
  use_restriction:pack.scopeRu+' Семь дополнительных потребностей не закрыты. Абразив0,00044м²/100м² сохранён буквально, без числа листов. Полная приёмка не присвоена.'},
 parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
 shortInput:{ceiling_area_m2:35.5},acceptanceInput:ceilingThirdPuttyControlInputS2754,
 validationScenario:'S2754_CEILING_THIRD_PUTTY_ORIGINAL_NORMATIVE_CORE_SEVEN_OPEN_SCOPE_NEEDS',
 passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Источник подтверждает третий слой и шлифование; полный состав дополнительных операций ещё требует подтверждения.',
  includedScopeRu:included,excludedScopeRu:excluded,unresolvedApplicableResourceRowIds:pack.openAdditionalScope.map(gap=>prefix+':'+gap.id),
  independentCompletenessMap:{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'NORMATIVE_OPERATION_MAP',
   generatedFromCurrentRows:false,evidenceSha256:pack.source.sha256,evidenceReferences:[pack.source.officialUrl,'КРЕР15, стр.8–11,191–192'],
   entries:pack.resourceTable.map(resource=>({expectedResourceId:'norm:'+resource.resourceCode+':'+resource.id,
    operationId:resource.operation,category:resource.category,specification:resource.nameRu,condition:'PROJECT_JUSTIFIED_THIRD_COAT_PREPARED_MINERAL_CEILING_HEIGHT_MAX_3_5M',
    sourceId:pack.sourceId,unitId:resource.unitId,quantityRule:'EXACT_OFFICIAL_RATE_PER_100_M2',
    formulaId:prefix+':formula:'+resource.id+(resource.category==='material'?'-consumed':''),
    resolution:resource.id==='operator'?{kind:'INCLUDED_COMPONENT_ROW',rowId:prefix+':operator',parentRowId:prefix+':lift'}:
     {kind:'ROW',rowId:prefix+':'+resource.id+(resource.category==='material'?'-consumed':'')}}))}},
 applicability:{country:'KG',exactRateColumn:pack.normId,originalMaterialOnly:true,projectJustificationRequired:true,
  roomHeightMaxM:3.5,preparedMineralCeilingOnly:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
 binding:{rowId:prefix+':labor',applicability:{exactRateColumn:pack.normId,projectJustificationRequired:true,fullTechnicalAcceptance:false}},
 locator:{key:'s2754-ceiling-third-putty',payload:{sourcePack:pack,fullTechnicalAcceptance:false,knownMaterialConsumptionNotOrder:true}},
 search:{primaryUom:'m2',canonicalNameRu:pack.titleRu,aliases:['Третий слой шпаклёвки на минеральном потолке','Шлифование третьего слоя потолка'],
  shortScopeRu:pack.scopeRu+' Известен исходный нормативный расход шпаклёвки, шкурки и ветоши. Дополнительный состав ещё не подтверждён.',
  keyDistinguishingParameters:['ceiling_substrate','third_coat_project_justification','room_height_m','room_conditions'],
  clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
  includedBoundaries:included,excludedBoundaries:excluded,extraSearchTermsRu:'потолок третий слой масляно клеевая шпаклевка шлифовальная шкурка ветошь',
  sourceProvenance:{sourcePack:'mineral-ceiling-third-putty-coat-s27-54.json',primaryMeasureParameterId:'ceiling_area_m2',fullTechnicalAcceptance:false}},
 catalogAppend:{identity:{namespace:'global',domain:'plaster_paint',sourceIdentity:'krer15-2015:prepared-mineral-ceiling:15-04-027-06',
  workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},searchPlacement:{...base.catalogAppend!.searchPlacement,
   groupMode:'create',groupId,groupNameRu:'Шпаклевание минеральных потолков',domainId:'plaster_paint',systemId:'plaster_paint',
   subsystemId:groupId,assemblyId:groupId,workFamilyId:'plaster_paint',breadcrumb:['Шпаклевание минеральных потолков'],
   groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP',exactRateFamily:pack.normId},
   independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,preliminaryNormativeCoreOnly:true},
   operationKind:'NEW_INSTALLATION',technologyVariant:pack.normId+'; исходная масляно-клеевая система',
   normativeClassifiers:[pack.normId],applicabilityTags:['MINERAL_CEILING','THIRD_PUTTY_COAT','PROJECT_JUSTIFIED','HEIGHT_MAX_3_5M']}},
 forbiddenAdjacentMatchers:[/CT127|drywall|гипсокартон|15-04-027-05|wood_putty/iu],
 owner:'S2754_FINISHING_SINGLE_WRITER',receiptFileStem:'ceiling_third_putty',
 verifyCore:async()=>{
  assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
  const r=await compileCeilingThirdPuttyS2754(ceilingThirdPuttyControlInputS2754);assert.equal(r.rows.length,9);assert.equal(r.preliminaryNeeds.length,10);
  for(const [id,qty] of [['labor','5.8575'],['lift','0.00355'],['truck','0.0142'],['putty-consumed','11.36'],['abrasive-consumed','0.0001562'],['rags-consumed','0.05325']])
   assert.equal(r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity,qty);
  assert.equal(r.rows.filter(row=>row.included_in_procurement).length,0);
  await assert.rejects(()=>compileCeilingThirdPuttyS2754({...ceilingThirdPuttyControlInputS2754,room_height_m:3.6}));
  await assert.rejects(()=>compileCeilingThirdPuttyS2754({...ceilingThirdPuttyControlInputS2754,ceiling_substrate:'ГКЛ'}));
  return {status:'GREEN_LIMITED_ORIGINAL_NORMATIVE_CORE',knownRows:9,needs:10,sourceMaterialConsumptions:3,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
 }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754MineralCeilingThirdPutty.ts')){
 const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 void runMasterSingleDefinitionSuccessorR1(ceilingThirdPuttyConfigS2754({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
 .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
