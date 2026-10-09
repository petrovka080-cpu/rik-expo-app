import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {floorDemolitionSeriesS2754Config} from './prepareS2754FloorDemolitionSeries';
import {ledGridPanelSourcePackS2754 as pack,ledGridPanelDefinitionS2754 as definition,ledGridCompletenessMapS2754,compileLedGridPanelS2754} from '../../../src/lib/estimate/v4/ledGridPanelDvo6560S2754';
const prefix='led-grid:dvo6560-6562';
export function ledGridControlInputS2754(index=1){return {panel_count:11,selected_panel_sku:pack.products[index].sku,
 grid_ready_confirmed:pack.gridValue,supply_ready_confirmed:pack.supplyValue,operating_conditions_confirmed:pack.conditionsValue,
 installation_detail_reference:'КОНТРОЛЬНЫЙ ВВОД ДЛЯ ПРОВЕРКИ; не проект объекта и не одобрение узлаIEK–WAGO'};}
export function ledGridConfigS2754(parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
 const base=floorDemolitionSeriesS2754Config(0,parent),included=[pack.scopeRu,pack.includedAssemblyRu,
  'Один выбранный заводской артикул; разные исполнения и запасы не суммируются','Чистая потребность известна отдельно от заказа; наличие, резерв и упаковка фактические'],
  unresolved=[...pack.sourceNeeds.map(gap=>prefix+':'+gap.id),prefix+':'+pack.connectorCandidate.id];
 return {...base,contract:pack.contract,stopCode:'S2754_LED_GRID_PANEL',applicationName:'s2754-led-grid-panel',
  outputRoot:resolve('.release-runtime/r568/s27-54/led-grid-panel/publication'),catalogId:pack.catalogId,sourceId:pack.sourceId,normId:pack.normId,
  sourcePaths:['scripts/estimate/r4a13/prepareS2754LedGridPanel.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
   'src/lib/estimate/v4/ledGridPanelDvo6560S2754.ts','data/estimate-benchmarks/source-packs/led-grid-panel-dvo6560-6562-s27-54.json',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',pack.source.localArtifact],
  sourceMetadata:{source_title:'IEK: руководствоДВО6560–6562, издание5; паспорт и установка в потолок600×600',source_authority:'ИзготовительIEK; первичный паспорт панели. КандидатWAGO имеет отдельные ссылки без байтового хеша.',
   source_kind:'MANUFACTURER_PRODUCT_AND_MOUNTING_INSTRUCTIONS_NO_LABOR_NORM',official_url:pack.source.officialUrl,
   artifact_sha256:pack.source.sha256,exact_locator:pack.source.locatorRu,
   use_restriction:pack.scopeRu+' Монтажные часы и дополнительный состав не подтверждены; WAGO221-412 не считается одобренным узлом. Полная техническая приёмка не присвоена.'},
  parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
  shortInput:{panel_count:11},acceptanceInput:ledGridControlInputS2754(),
  validationScenario:'S2754_ONE_LED_GRID_WORK_SIX_EXACT_PRODUCT_VARIANTS_NO_SURFACE_NORMS',
  passport:{canonicalRuName:pack.titleRu,workKey:pack.workKey,physicalResultRu:'Подтверждено изделие и способ установки в готовую решётку; часы, узел подключения и дополнительная комплектация остаются открытыми.',
   includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:unresolved,
   independentCompletenessMap:ledGridCompletenessMapS2754()},
  applicability:{country:'KG',manufacturerProductFamily:'DVO6560_6561_6562',mounting:'EXISTING_600X600_GRID',panelSizeMm:[595,595,20],panelMassKg:2,
   oneWorkSixProductVariants:true,surfaceInstallationExcluded:true,confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
  binding:{rowId:prefix+':installation-labor',applicability:{manufacturerScopeOnly:true,mounting:'EXISTING_600X600_GRID',fullTechnicalAcceptance:false}},
  locator:{key:'s2754-led-grid-panel',payload:{sourcePack:pack,oneWorkSixProductVariants:true,fullTechnicalAcceptance:false,
   includedPartsNotOrderedTwice:true,wagoJointApproved:false,threeConnectorsPerPanelNotAssumed:true,oldSurfaceDefinitionNotReplaced:true}},
  search:{primaryUom:'pcs',canonicalNameRu:pack.titleRu,aliases:['Монтаж LED-панели в готовый потолок600×600','Установка ДВО6560,6561,6562 в решёткуArmstrong'],
   shortScopeRu:pack.scopeRu+' Артикул, характеристики, комплектность и чистая потребность раскрыты; монтажный труд и дополнительные ресурсы ещё требуют источника.',
   keyDistinguishingParameters:['selected_panel_sku','grid_ready_confirmed','supply_ready_confirmed','operating_conditions_confirmed'],
   clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),
   includedBoundaries:included,excludedBoundaries:pack.excludedRu,extraSearchTermsRu:'LED светодиод панель ДВО6560 ДВО6561 ДВО6562 потолок Армстронг решётка600×600 36Вт IP40 WAGO221-412',
   sourceProvenance:{sourcePack:'led-grid-panel-dvo6560-6562-s27-54.json',primaryMeasureParameterId:'panel_count',fullTechnicalAcceptance:false}},
  catalogAppend:{identity:{namespace:'global',domain:'electrical',sourceIdentity:'iek-edition5:dvo6560-6562:existing-grid-600x600',workKey:pack.workKey,titleRu:pack.titleRu,denominatorEligible:true},
   searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:'join',groupId:'wg:base:electrical_interior_lighting_install',
    groupNameRu:'монтаж освещения для высокой нагрузки',domainId:'electrical',systemId:'electrical',subsystemId:'wg:base:electrical_interior_lighting_install',
    assemblyId:'wg:base:electrical_interior_lighting_install',workFamilyId:'wg:base:electrical_interior_lighting_install',breadcrumb:['монтаж освещения для высокой нагрузки'],
    membershipOrdinal:6,groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},
    independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,preliminaryManufacturerScopeOnly:true},
    operationKind:'NEW_INSTALLATION',constructionState:'EXISTING_GRID',technologyVariant:'DVO6560_6562_EXISTING_GRID_600X600_PRODUCT_SUPPORTED',
    normativeClassifiers:['IEK_EDITION5_MOUNTING_4_7'],applicabilityTags:['INTERIOR_LED_PANEL','EXISTING_600_GRID','CLASS_I_PE','PRODUCT_SUPPORTED_PARTIAL']}},
  forbiddenAdjacentMatchers:[/surface_drilling|surface_anchor|surface_install_labor|mini_column|mini-column|08-02-429/iu],
  owner:'S2754_LED_GRID_SINGLE_WRITER',receiptFileStem:'led_grid_panel',
  verifyCore:async()=>{
   assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:ledGridCompletenessMapS2754(),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
   for(let index=0;index<6;index++){
    const p=pack.products[index],r=await compileLedGridPanelS2754(ledGridControlInputS2754(index));
    assert.equal(r.rows.length,3);assert.equal(r.preliminaryNeeds.length,9);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,0);
    assert.equal(r.rows.find(row=>row.row_id===prefix+':'+p.key+'-consumed')?.quantity,'11');
    const connectorNeed=r.preliminaryNeeds.find(row=>row.row_id===prefix+':'+pack.connectorCandidate.id);
    assert(connectorNeed?.missing_parameter_ids.includes('connector_joint_approval'));
    assert(connectorNeed?.missing_parameter_ids.includes('open_qty_wago_221_412'));
    assert.equal(r.rows.find(row=>row.row_id===prefix+':'+p.key+'-included')?.included_in_estimate,false);
    assert(!r.rows.some(row=>pack.products.some(other=>other.key!==p.key&&row.row_id.startsWith(prefix+':'+other.key))));
   }
   const p=pack.products[1],ids=p.key.replaceAll('-','_'),input=ledGridControlInputS2754();
   const ordered=await compileLedGridPanelS2754({...input,[ids+'_stock']:4,[ids+'_reserve']:2,[ids+'_quantum']:2});
   assert.equal(ordered.rows.find(row=>row.row_id===prefix+':'+p.key)?.quantity,'10');assert.equal(ordered.rows.filter(row=>row.included_in_procurement).length,1);
   const changed=await compileLedGridPanelS2754({...input,[ids+'_stock']:4,[ids+'_reserve']:2,[ids+'_quantum']:2,selected_panel_sku:pack.products[0].sku});
   assert.equal(changed.rows.filter(row=>row.included_in_procurement).length,0);
   assert(changed.preliminaryNeeds.some(row=>row.row_id===prefix+':'+pack.products[0].key));
   const noGrid=await compileLedGridPanelS2754({...input,grid_ready_confirmed:undefined});assert.equal(noGrid.rows.length,0);
   await assert.rejects(()=>compileLedGridPanelS2754({...input,selected_panel_sku:'DVO6567'}));
   const connectorSource=definition.resources.find(row=>row.row_id===prefix+':'+pack.connectorCandidate.id)?.source_metadata;
   assert.equal(connectorSource?.source_artifact_sha256,null);
   assert.equal(connectorSource?.official_url,pack.connectorCandidate.sources[0].url);
   return {status:'GREEN_LIMITED_MANUFACTURER_PRODUCT_SCOPE',workTypes:1,productVariants:6,knownRows:3,needs:9,
    oneSelectedSkuOnly:true,includedPartsNotProcuredAgain:true,stockNotReusedForAnotherSku:true,confirmedLaborNorm:false,wagoJointApproved:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
  },
 };
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754LedGridPanel.ts')){
 const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
 void runMasterSingleDefinitionSuccessorR1(ledGridConfigS2754({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
 .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
