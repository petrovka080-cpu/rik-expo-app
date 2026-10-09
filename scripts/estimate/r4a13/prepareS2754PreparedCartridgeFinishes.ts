import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {cn87SeparationConfigS2754} from './prepareS2754Cn87SeparationScreed';
import {preparedCartridgePackS2754 as pack,preparedCartridgeDefinitionS2754,preparedCartridgeCompletenessMapS2754,
  preparedCartridgePrefixS2754,compilePreparedCartridgeS2754} from '../../../src/lib/estimate/v4/preparedCartridgeFinishesS2754';

export function preparedCartridgeControlS2754(index:number){const type=pack.types[index];return {
  work_length_m:index===0?12.35:20,product_confirmed:type.productValue,ready_scope_confirmed:type.readyValue,conditions_confirmed:type.conditionsValue,method_confirmed:type.methodValue,
  supplied_product_reference:'CONTROL_ONLY: выбранные продукт, упаковка и пригодное невскрытое наличие; не подтверждение поставки объекта',
  ready_node_reference:'CONTROL_ONLY: готовый узел указан только для проверки, проектная приёмка не выполнена',
  application_plan_reference:'CONTROL_ONLY: явный план расходования и вскрытия; не гарантированный расход производителя и не проект объекта',
  planned_use_ml:index===0?650:620,planned_open_cartridges:index===0?3:2,...(type.selectedReferenceRate?{reference_rate_ml_per_m:30}:{})};}
export function preparedCartridgeExplicitControlS2754(index:number){return {...preparedCartridgeControlS2754(index),unopened_stock_cartridges:0,unopened_reserve_cartridges:0,supplier_cartridge_multiple:1};}
export function preparedCartridgeConfigS2754(index:number,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
  const type=pack.types[index];if(!type)throw Error('EXACT_TWO_PREPARED_CARTRIDGE_TYPES_ONLY');
  const base=cn87SeparationConfigS2754(parent),definition=preparedCartridgeDefinitionS2754(index),prefix=preparedCartridgePrefixS2754(index);
  const gid=index===0?'wg:master:cs25_ready_joint_10x5_existing_pe':'wg:base:flooring_interior_baseboard_glue',gname=index===0?'Герметизация готового шва CS 25':'приклейка плинтуса для высокой нагрузки';
  const included=[type.scopeRu,type.productNameRu,'План вскрытия и общего расходования явный; баланс только целых невскрытых картриджей',
    'Неиспользованный вскрытый объём отделён; его пригодность и удаление не назначены автоматически',
    'Ранее принятая подготовка и её материалы учтены отдельно; новые источник/цена для незакрытых услуг и оснастки обязательны'];
  return {...base,contract:pack.contract,stopCode:'S2754_PREPARED_CARTRIDGE_'+index,applicationName:'s2754-'+type.key,
    outputRoot:resolve('.release-runtime/r568/s27-54/prepared-cartridge-finishes/publication/'+type.key),expectedParentShape:[0,0,0],catalogId:type.catalogId,sourceId:type.sourceId,normId:type.normId,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754PreparedCartridgeFinishes.ts','src/lib/estimate/v4/preparedCartridgeFinishesS2754.ts','src/lib/estimate/v4/unopenedCartridgeSupplyR1.ts',
      'data/estimate-benchmarks/source-packs/prepared-cartridge-finishes-s27-54.json','scripts/estimate/r4a13/prepareS2754Cn87SeparationScreed.ts','scripts/estimate/r4a13/prepareS2754FloorDemolitionSeries.ts',
      'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
      'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',...pack.types.map(t=>t.source.localArtifact)],
    sourceMetadata:{source_title:type.productNameRu,source_authority:index===0?'Ceresit/Henkel':'Forbo Eurocol',source_kind:'EXACT_PRODUCT_PACKAGING_AND_CONFIRMED_PROJECT_APPLICATION_PLAN',
      official_url:type.source.officialUrl,artifact_sha256:type.source.sha256,exact_locator:type.source.locatorRu,use_restriction:type.scopeRu+' Полной технической приёмки и нормы труда нет.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,shortInput:{work_length_m:index===0?12.35:20},
    acceptanceInput:preparedCartridgeControlS2754(index),validationScenario:'S2754_UNOPENED_CARTRIDGE_LEDGER_'+type.key,
    passport:{canonicalRuName:type.titleRu,workKey:type.workKey,physicalResultRu:'Конкретный герметик или клей связан с нанесением по готовому узлу; невскрытый запас отделён от вскрытых остатков. Расход по принятому плану, дополнительные нормы открыты.',
      includedScopeRu:included,excludedScopeRu:type.excludedRu,unresolvedApplicableResourceRowIds:type.sourceNeeds.map(g=>prefix+':'+g.id),independentCompletenessMap:preparedCartridgeCompletenessMapS2754(index)},
    applicability:{country:'KG',product:type.brandRu,capacityMl:type.capacityMl,readyNodeRequired:true,openingPlanRequired:true,onlyUnopenedCartridgesInStockLedger:true,
      openedUnusedVolumeNotStockOrAutomaticWaste:true,approximateReferenceNotGuarantee:true,supplierShippingBoxNotAssumed:true,confirmedLaborNorm:false,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':cartridge-order',applicability:{exactProductAndPackage:true,projectOpeningPlanRequired:true}},
    locator:{key:'s2754-'+type.key,payload:{sourcePack:pack,selectedType:type.key,fullTechnicalAcceptance:false}},
    search:{primaryUom:'linear_m',canonicalNameRu:type.titleRu,aliases:[type.titleRu,type.productNameRu],shortScopeRu:type.scopeRu,
      keyDistinguishingParameters:['work_length_m','planned_use_ml','planned_open_cartridges','ready_node_reference'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:type.excludedRu,
      extraSearchTermsRu:index===0?'Ceresit CS 25 силикон герметик белый01 280мл готовый шов 10x5 ПЭ уплотнение':'Forbo Eurocol 232 Eurosol Montage клей монтажный деревянный плинтус готовый бетон 310мл',
      sourceProvenance:{sourcePack:'prepared-cartridge-finishes-s27-54.json',primaryMeasureParameterId:'work_length_m',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{namespace:'global',domain:type.domain,sourceIdentity:'prepared-cartridge:'+type.key,workKey:type.workKey,titleRu:type.titleRu,denominatorEligible:true},
      searchPlacement:{...base.catalogAppend!.searchPlacement,groupMode:index===0?'create':'join',groupId:gid,groupNameRu:gname,domainId:type.domain,systemId:type.domain,
        subsystemId:gid,assemblyId:gid,workFamilyId:gid,breadcrumb:[gname],membershipOrdinal:index===0?0:6,groupOracleDisposition:{contract:pack.contract,disposition:'EXACT_PHYSICAL_WORK_GROUP'},
        independentDisposition:{contract:pack.contract,classification:'CANONICAL_VISIBLE',exactPhysicalIdentity:true,manufacturerScopeOnly:true},operationKind:'NEW_INSTALLATION',
        constructionState:'READY_ACCEPTED_NODE_AND_MATERIALS',technologyVariant:type.key,normativeClassifiers:[index===0?'CS25_RUKZ_TDS':'FORBO232_OFFICIAL_CARD'],
        applicabilityTags:[type.key,'READY_NODE','UNOPENED_STOCK_ONLY','PROJECT_APPLICATION_PLAN','MANUFACTURER_PARTIAL']}},
    forbiddenAdjacentMatchers:index===0?[/PR102|roof_lantern|drinking_water|forbo232/iu]:[/gerflor|cs25|styropor|wall_paint/iu],
    owner:'S2754_PREPARED_CARTRIDGE_SINGLE_WRITER',receiptFileStem:type.key,verifyCore:async()=>{
      assert.equal(createHash('sha256').update(readFileSync(type.source.localArtifact)).digest('hex'),type.source.sha256);
      assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:preparedCartridgeCompletenessMapS2754(index),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
      const input=preparedCartridgeExplicitControlS2754(index),r=await compilePreparedCartridgeS2754(index,input),qty=(id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
      assert.equal(r.rows.length,8);assert.equal(r.preliminaryNeeds.length,type.sourceNeeds.length);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,1);
      assert.equal(qty('reference-use'),index===0?'617.5':'600');assert.equal(qty('planned-use'),index===0?'650':'620');
      assert.equal(qty('cartridge-order'),index===0?'3':'2');assert.equal(qty('unopened-remaining'),'0');assert.equal(qty('unused-opened-volume'),index===0?'190':'0');
      const stocked=await compilePreparedCartridgeS2754(index,{...input,unopened_stock_cartridges:5,unopened_reserve_cartridges:1});
      assert.equal(stocked.rows.find(row=>row.row_id===prefix+':cartridge-order')?.quantity,'0');assert.equal(stocked.rows.find(row=>row.row_id===prefix+':unopened-remaining')?.quantity,index===0?'2':'3');
      const reserve=await compilePreparedCartridgeS2754(index,{...input,unopened_reserve_cartridges:1,supplier_cartridge_multiple:2});
      assert.equal(reserve.rows.find(row=>row.row_id===prefix+':cartridge-order')?.quantity,'4');assert.equal(reserve.rows.find(row=>row.row_id===prefix+':unused-opened-volume')?.quantity,qty('unused-opened-volume'));
      for(const changes of [{planned_open_cartridges:1},{planned_open_cartridges:1.5},{planned_use_ml:type.capacityMl*10},{supplier_cartridge_multiple:0},{open_qty_labor:1}])
        await assert.rejects(()=>compilePreparedCartridgeS2754(index,{...input,...changes}));
      for(const fact of ['ready_scope_confirmed','ready_node_reference','application_plan_reference','conditions_confirmed','supplied_product_reference'])
        assert.equal((await compilePreparedCartridgeS2754(index,{...input,[fact]:undefined})).rows.length,0);
      if(type.selectedReferenceRate){for(const dose of [19,41])await assert.rejects(()=>compilePreparedCartridgeS2754(index,{...input,reference_rate_ml_per_m:dose}));}
      assert(definition.parameters.filter(p=>/stock|reserve|supplier|planned|reference_rate/.test(p.parameter_id)).every(p=>p.default_value==null));
      return {status:'GREEN_LIMITED_PREPARED_CARTRIDGE',key:type.key,shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],knownRows:8,
        needs:type.sourceNeeds.length,procurementRows:1,plannedUseMl:input.planned_use_ml,openedCartridges:input.planned_open_cartridges,capacityMl:type.capacityMl,
        orderCartridges:qty('cartridge-order'),unopenedRemainder:qty('unopened-remaining'),unusedOpenedVolumeMl:qty('unused-opened-volume'),fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
    }};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754PreparedCartridgeFinishes.ts')){
  const key=process.argv.find(a=>a.startsWith('--type='))?.slice(7)??pack.types[0].key,index=pack.types.findIndex(t=>t.key===key);if(index<0)throw Error('EXACT_PREPARED_CARTRIDGE_TYPE_REQUIRED');
  const c=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(preparedCartridgeConfigS2754(index,{releaseId:c.definitionReleaseId,searchReleaseId:c.searchReleaseId})).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
