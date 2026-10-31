import type {CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import {masterRetainedParentCaptureSha256R1} from './masterSingleDefinitionRetainParentBindingsR1';
import {masterOperationValueSha256R1,assertMasterOperationCompositionDeclarationR1,
  assertMasterOperationCompositionComputationR1} from './masterOperationCompositionOnlyR1';
import reviewedCartridgeOperationsR388 from '../../../data/estimate-benchmarks/fixtures/prepared-cartridge-reviewed-operation-maps-r388.json';
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {cn87SeparationConfigS2754} from './prepareS2754Cn87SeparationScreed';
import {preparedCartridgePackS2754 as pack,preparedCartridgeDefinitionS2754,preparedCartridgeCompletenessMapS2754,
  preparedCartridgePrefixS2754,compilePreparedCartridgeS2754} from '../../../src/lib/estimate/v4/preparedCartridgeFinishesS2754';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {buildCanonicalRevisionCommitPayload} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalEstimateRevisionDetailFromStorage} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';

import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections,canonicalEstimateWorkProcess} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';

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
      'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts','src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts','src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts',
      'src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper.ts',...pack.types.map(t=>t.source.localArtifact)],
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
      const input=preparedCartridgeExplicitControlS2754(index),
        hashJson=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex'),
        r=await compileCanonicalEstimateCore({operation:'compile',compilerVersion:pack.contract,catalogId:type.catalogId,
          primaryMeasureParameterId:'work_length_m',parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],
          resourceDefinitions:[...definition.resources],submittedParameters:input,confirmedParameters:{...definition.runtimeInput},currencyCode:'KGS',
          priceItems:[],maximumResourceRows:definition.resources.length,hashJson}),qty=(id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
      assert.equal(r.rows.length,8);assert.equal(r.preliminaryNeeds.length,type.sourceNeeds.length);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,1);
      assert.equal(qty('reference-use'),index===0?'617.5':'600');assert.equal(qty('planned-use'),index===0?'650':'620');
      assert.equal(qty('cartridge-order'),index===0?'3':'2');assert.equal(qty('unopened-remaining'),'0');assert.equal(qty('unused-opened-volume'),index===0?'190':'0');
      // Exact durable path: the local formula wrapper's eh_ identities are not
      // valid saved need hashes. Use the real server SHA/core/commit/read mapper.
      const rawLabor=r.preliminaryNeeds.find(need=>need.row_id===prefix+':labor')!;assert(rawLabor);
      const {need_sha256,...hashBasis}=rawLabor;assert.match(need_sha256,/^[0-9a-f]{64}$/);assert.equal(hashJson(hashBasis),need_sha256);
      const commit=buildCanonicalRevisionCommitPayload({rowCount:r.rows.length,currencyCode:'KGS',totals:r.totals,
        checksumSha256:hashJson(r.revisionProjection),compilerVersion:pack.contract,parameters:r.parameters,approvedTemplateBaselineId:null,
        baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,derivedParameters:r.derivedParameters,
        identityContract:{},preliminaryNeeds:r.preliminaryNeeds,purchaseSupplyIndexV1:r.purchaseSupplyIndexV1});
      assert.equal((commit.parameterSources as Record<string,unknown>).preliminaryNeeds,r.preliminaryNeeds);
      const stored={id:'11111111-1111-4111-8111-111111111111',release_id:'22222222-2222-4222-8222-222222222222',
        definition_version_id:'33333333-3333-4333-8333-333333333333',catalog_id:type.catalogId,price_snapshot_ids:r.priceSnapshotIds,
        input_parameters:commit.resolvedParameters,totals:commit.totals,row_count:commit.rowCount,revision_number:1,status:'ready',currency_code:'KGS',
        compiler_version:pack.contract,created_at:'2026-10-26T00:00:00Z',checksum_sha256:commit.checksumSha256,amendment_contract:{parameterSources:commit.parameterSources}};
      const storedBefore=JSON.stringify(stored),transport=projectCanonicalEstimatePreliminaryNeedTransport(stored),detail=canonicalEstimateRevisionDetailFromStorage(stored);
      assert.deepEqual(detail.preliminaryNeeds,transport.preliminaryNeeds);
      assert.deepEqual(transport.preliminaryNeeds.map(need=>need.rowId),r.preliminaryNeeds.map(need=>need.row_id));
      const invalid=structuredClone(stored);(invalid.amendment_contract.parameterSources as {preliminaryNeeds:Record<string,unknown>[]})
        .preliminaryNeeds.find(need=>need.row_id===prefix+':labor')!.need_sha256='eh_'+'0'.repeat(16);
      assert.equal(projectCanonicalEstimatePreliminaryNeedTransport(invalid).preliminaryNeeds.some(need=>need.rowId===prefix+':labor'),false);
      assert.equal(JSON.stringify(stored),storedBefore);
      const before=JSON.stringify(transport),reopened=JSON.parse(JSON.stringify(detail)) as typeof detail;assert(reopened.preliminaryNeeds);
      const labor=reopened.preliminaryNeeds.find(need=>need.rowId===prefix+':labor')!;
      assert(labor);assert.equal(labor.quantity,null);assert.equal(labor.unitPrice,null);assert.equal(Object.prototype.hasOwnProperty.call(labor,'calculationTrace'),false);
      const stages=index===0?['application','masking','finishing','cleaning']:['application','cleaning'];
      assert.deepEqual(canonicalEstimateOperationReferences(labor.operation).map(ref=>ref.operationId),stages.map(stage=>prefix+':'+stage));
      const resources=reopened.preliminaryNeeds.map(need=>({rowId:need.rowId,operation:need.operation,titleRu:need.titleRu,category:need.category}));
      const sections=canonicalEstimateResourceOperationSections(resources),process=canonicalEstimateWorkProcess(resources);
      assert.equal(sections.filter(section=>section.resourceIds.includes(labor.rowId)).length,1);
      for(const stage of stages.slice(1)){
        const section=sections.find(section=>section.operation?.operationId===prefix+':'+stage)!;assert(section);
        assert.equal(section.resourceIds.includes(labor.rowId),false);assert.equal(section.sharedResources.filter(row=>row.rowId===labor.rowId).length,1);
        assert.equal(process.flatMap(group=>group.operations).find(step=>step.operationId===prefix+':'+stage)!.resourceIds.filter(id=>id===labor.rowId).length,1);
      }
      if(index===0){const finishing=sections.find(section=>section.operation?.operationId===prefix+':finishing')!;
        assert.equal(finishing.sharedResources.filter(row=>row.rowId===prefix+':tools').length,1);}
      const primaryOnly=resources.map(row=>row.rowId===labor.rowId?{...row,operation:{...labor.operation!,additionalOperations:undefined}}:row);
      assert.equal(canonicalEstimateResourceOperationSections(primaryOnly).find(section=>section.operation?.operationId===prefix+':cleaning')?.sharedResources.some(row=>row.rowId===labor.rowId),false);
      const missingRelationship=definition.resources.map(row=>row.row_id===labor.rowId?{...row,resource_graph:{...row.resource_graph,
        operationCompositionV1:{...(row.resource_graph.operationCompositionV1 as Record<string,unknown>),additionalOperations:undefined}}}:row);
      assert(validateIndependentCompletenessMapReferences({completenessMap:preparedCartridgeCompletenessMapS2754(index),formulaDefinitions:definition.formulas,resourceDefinitions:missingRelationship}).some(error=>error.endsWith('_OPERATION_BINDING')));
      assert.equal(JSON.stringify(transport),before);
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
const preparedCartridgeCurrentFixtureR388='data/estimate-benchmarks/fixtures/prepared-cartridge-current-operation-captures-r388.json';
/** Genuine current captures; importing this module does not read or publish them. */
export function preparedCartridgeCurrentRecordsR388():Json[]{
  const bytes=readFileSync(resolve(__dirname,'../../..',preparedCartridgeCurrentFixtureR388));assert.equal(createHash('sha256').update(bytes).digest('hex'),'71b9bfc1b3e540774c052b3e2b09b59583213a3b867c1437d7f1ba26f7b9e732');
  const value=JSON.parse(bytes.toString('utf8'));assert.equal(value.status,'ACTUAL_R387_TWO_CURRENT_PARENTS_NO_FUTURE_IDS');
  assert.equal(value.records.length,2);return value.records;
}
/** Metadata-only retained replacement, using the same existing Master publisher.
 * Never rebuild the current model from an old factory or append another card. */
export function preparedCartridgeCurrentRetainedConfigR388(record:Json,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig{
  const index=record.index;assert(index===0||index===1);const type=pack.types[index],c=record.capture,p=record.contentPassport,s=record.searchDocument;
  assert.equal(record.catalogId,type.catalogId);assert.equal(c.definition.catalog_id,record.catalogId);
  assert.equal(record.parentReleaseId,parent.releaseId);assert.equal(record.parentSearchReleaseId,parent.searchReleaseId);
  assert.equal(c.baseline.definition_version_id,c.definition.id);assert.equal(p.definition_version_id,c.definition.id);assert.equal(s.definition_version_id,c.definition.id);
  assert.equal(s.definition_release_id,parent.releaseId);assert.equal(s.search_release_id,parent.searchReleaseId);
  assert.equal(masterRetainedParentCaptureSha256R1(c),record.capturedParentSha256);assert.equal(masterOperationValueSha256R1(p),record.contentPassportSha256);
  const base=preparedCartridgeConfigS2754(index,parent),map=(reviewedCartridgeOperationsR388 as Record<string,Record<string,Json>>)[record.catalogId];assert(map);
  const desired=preparedCartridgeDefinitionS2754(index);
  assert.deepEqual(Object.keys(map).sort(),c.resources.map((r:Json)=>r.row_id).sort());
  assert.deepEqual(desired.resources.map(r=>r.row_id).sort(),c.resources.map((r:Json)=>r.row_id).sort());
  // A stage has one descriptor in the existing strict guard. Related links
  // reuse the already current primary criterion, preserving its scope.
  const primaryById=new Map<string,Json>(c.resources.map((row:Json)=>{const op=row.resource_graph.operationCompositionV1;return[op.operationId,op];}));
  for(const row of desired.resources){
    const declared=row.resource_graph.operationCompositionV1 as Json;
    const expected={...declared,...(declared.additionalOperations?{additionalOperations:declared.additionalOperations.map((related:Json)=>{
      const primary=primaryById.get(related.operationId);assert(primary);
      return{...related,completionCriterionRu:primary.completionCriterionRu};})}:{})};
    assert.deepEqual(expected,map[row.row_id],'EXACT_EXISTING_PRODUCER_OPERATION_MAP');
  }
  const resources=c.resources.map((row:Json)=>({...row,resource_graph:{...row.resource_graph,operationCompositionV1:map[row.row_id]}}));
  const mode={contract:'master-operation-composition-only/r1' as const,capturedContentPassport:p,capturedContentPassportSha256:record.contentPassportSha256,
    operationByRowId:map,operationMapSha256:masterOperationValueSha256R1(map)};
  assertMasterOperationCompositionDeclarationR1({catalogId:record.catalogId,capture:c,captureSha256:record.capturedParentSha256,mode,newParameterSources:{}});
  assertMasterOperationCompositionComputationR1(c,mode,{parameters:c.parameters,formulas:c.formulas,resources},'REPRESENTATIVE');
  const locator=c.normativeLocators.find((l:Json)=>l.locator_key===base.locator.key);assert(locator);
  const source=c.normativeSources.find((r:Json)=>r.id===locator.source_id);assert(source);assert.equal(source.source_key,type.sourceId);
  assert.equal(source.artifact_sha256,type.source.sha256);
  const locators=c.normativeLocators.filter((l:Json)=>l.source_id===source.id);
  const sourceKeys=c.normativeSources.map((r:Json)=>r.source_key);
  const fixtureSources=Object.fromEntries(Object.entries(c.baseline.normative_source_ids).map(([id,keys])=>[id,(keys as string[]).filter(k=>!sourceKeys.includes(k))]).filter(([,keys])=>(keys as string[]).length));
  const {catalogAppend:_append,...retainedBase}=base;
  const compile=(rows:Json[],input:Record<string,unknown>=c.baseline.input_values)=>compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'prepared-cartridge-current-operation-only/r388',catalogId:record.catalogId,
    primaryMeasureParameterId:'work_length_m',parameterDefinitions:c.parameters,formulaDefinitions:c.formulas,resourceDefinitions:rows as Parameters<typeof compileCanonicalEstimateCore>[0]['resourceDefinitions'],
    submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:rows.length,
    hashJson:(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
  return {...retainedBase,masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_21_2026-10-26.txt',masterSha256:'3f5f8c0e2f0ad1cdaf960d66d7561853fa0e5f70d269b6a8227cea549dcbe602',
    sourcePaths:[...new Set([...base.sourcePaths,preparedCartridgeCurrentFixtureR388,'data/estimate-benchmarks/fixtures/prepared-cartridge-reviewed-operation-maps-r388.json','scripts/estimate/r4a13/masterOperationCompositionOnlyR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts'])],
    parameterDefinitions:c.parameters,formulaDefinitions:c.formulas,resourceDefinitions:resources,
    shortInput:c.baseline.input_values,acceptanceInput:c.baseline.input_values,
    expectedParentShape:[c.parameters.length,c.formulas.length,c.resources.length],
    passport:{canonicalRuName:c.definition.passport.canonicalRuName,workKey:c.definition.passport.workKey,physicalResultRu:c.definition.passport.physicalResultRu,
      includedScopeRu:p.included_scope_ru,excludedScopeRu:p.excluded_scope_ru},applicability:c.definition.applicability,
    binding:{rowId:c.resources.find((r:Json)=>r.id===c.bindings[0].resource_spec_id).row_id,applicability:c.bindings[0].applicability,
      retainParentBindings:{capturedParent:c,capturedParentSha256:record.capturedParentSha256,newParameterSources:{},operationCompositionOnly:mode,
        ...(Object.keys(fixtureSources).length?{legacyCapturedFixtureSources:{contract:'master-retained-captured-fixture-provenance/r1' as const,parameterSources:fixtureSources as Record<string,string[]>}}:{})},
      reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1',locatorExcerptHashKind:'CAPTURED_PARENT_OPERATION_COMPOSITION_ONLY_R1',source,locators}},
    locator:{key:locator.locator_key,payload:locator.locator},
    search:{primaryUom:s.primary_uom,canonicalNameRu:s.canonical_name_ru,aliases:s.aliases,shortScopeRu:s.short_scope_ru,
      keyDistinguishingParameters:s.key_distinguishing_parameters,clarificationFields:s.clarification_fields,includedBoundaries:s.included_boundaries,
      excludedBoundaries:s.excluded_boundaries,extraSearchTermsRu:'',sourceProvenance:s.source_provenance},
    validationScenario:'EXACT_CURRENT_CARTRIDGE_OPERATION_LINKS_NO_QUANTITY_DELTA',receiptFileStem:type.key+'-current-operation-r388',
    verifyCore:async()=>{
      const before=await compile(c.resources),after=await compile(resources);
      const arithmetic=(result:typeof before)=>({parameters:result.parameters,rows:result.rows.map(r=>({id:r.row_id,quantity:r.quantity,unit:r.unit_id,included:r.included_in_estimate,procurement:r.included_in_procurement,procurementEligible:r.procurement_eligible,ownership:r.ownership_status,price:r.unit_price,amount:r.amount})),
        needs:JSON.parse(JSON.stringify(result.preliminaryNeeds,(key,value)=>key==='operationCompositionV1'||key==='need_sha256'?undefined:value)),totals:result.totals});
      assert.deepEqual(arithmetic(after),arithmetic(before));
      const baselineInputBefore=JSON.stringify(c.baseline.input_values),orderId=preparedCartridgePrefixS2754(index)+':cartridge-order';
      const orderDefinition=c.resources.find((row:Json)=>row.row_id===orderId);assert(orderDefinition);
      const orderFormula=c.formulas.find((formula:Json)=>formula.formula_id===orderDefinition.formula_id);assert(orderFormula);
      const missingOrderInputs=(orderFormula.input_parameter_ids as string[]).filter(id=>c.baseline.input_values[id]==null
        &&c.parameters.find((parameter:Json)=>parameter.parameter_id===id)?.default_value==null).sort();
      assert.deepEqual(missingOrderInputs,['supplier_cartridge_multiple','unopened_reserve_cartridges','unopened_stock_cartridges']);
      assert.equal(orderDefinition.procurement_eligible,true);assert.equal(orderDefinition.cost_owner_id,orderId);
      const orderNeed=after.preliminaryNeeds.find(need=>need.row_id===orderId);assert(orderNeed);
      assert.equal(orderNeed.need_state,'QUANTITY_REQUIRED');assert.equal(orderNeed.quantity,null);
      assert.deepEqual([...orderNeed.missing_parameter_ids].sort(),missingOrderInputs);
      assert.equal(orderNeed.selected,true);assert.equal(orderNeed.procurement_eligible,true);
      assert.equal(after.rows.some(row=>row.row_id===orderId),false);
      assert.equal(before.rows.filter(row=>row.included_in_procurement).length,0);
      assert.equal(after.rows.filter(row=>row.included_in_procurement).length,0);
      // CONTROL-only closure of exactly these existing three purchase facts.
      // It does not write or supplement the actual current captured baseline.
      const control=preparedCartridgeExplicitControlS2754(index);
      const controlInput={...c.baseline.input_values,unopened_stock_cartridges:control.unopened_stock_cartridges,
        unopened_reserve_cartridges:control.unopened_reserve_cartridges,supplier_cartridge_multiple:control.supplier_cartridge_multiple};
      assert.equal(controlInput.unopened_stock_cartridges,0);assert.equal(controlInput.unopened_reserve_cartridges,0);assert.equal(controlInput.supplier_cartridge_multiple,1);
      const activeBefore=await compile(c.resources,controlInput),activeAfter=await compile(resources,controlInput);
      assert.deepEqual(arithmetic(activeAfter),arithmetic(activeBefore));
      const activePurchases=activeAfter.rows.filter(row=>row.included_in_procurement);
      assert.deepEqual(activePurchases.map(row=>row.row_id),[orderId]);
      assert.equal(activePurchases[0]!.quantity,String(c.baseline.input_values.planned_open_cartridges));
      assert.equal(activePurchases[0]!.procurement_eligible,true);assert.equal(activePurchases[0]!.ownership_status,'OWNED');
      assert.equal(activeAfter.preliminaryNeeds.some(need=>need.row_id===orderId),false);
      assert.equal(JSON.stringify(c.baseline.input_values),baselineInputBefore);
      // Apply the existing real commit/detail/transport path to this current
      // retained model, rather than replaying the old factory control fixture.
      const prefix=preparedCartridgePrefixS2754(index),hashJson=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');
      const commit=buildCanonicalRevisionCommitPayload({rowCount:after.rows.length,currencyCode:'KGS',totals:after.totals,
        checksumSha256:hashJson(after.revisionProjection),compilerVersion:'prepared-cartridge-current-operation-only/r388',parameters:after.parameters,
        approvedTemplateBaselineId:c.baseline.id,baselineAssumptions:{},effectiveUserParameters:c.baseline.input_values,parentRevisionId:null,
        derivedParameters:after.derivedParameters,identityContract:{},preliminaryNeeds:after.preliminaryNeeds,purchaseSupplyIndexV1:after.purchaseSupplyIndexV1});
      const stored={id:'11111111-1111-4111-8111-111111111111',release_id:parent.releaseId,definition_version_id:c.definition.id,catalog_id:record.catalogId,
        price_snapshot_ids:after.priceSnapshotIds,input_parameters:commit.resolvedParameters,totals:commit.totals,row_count:commit.rowCount,
        revision_number:1,status:'ready',currency_code:'KGS',compiler_version:'prepared-cartridge-current-operation-only/r388',created_at:'2026-10-26T00:00:00Z',
        checksum_sha256:commit.checksumSha256,amendment_contract:{parameterSources:commit.parameterSources}};
      const storedBefore=JSON.stringify(stored),transport=projectCanonicalEstimatePreliminaryNeedTransport(stored),detail=canonicalEstimateRevisionDetailFromStorage(stored);
      assert.deepEqual(detail.preliminaryNeeds,transport.preliminaryNeeds);
      assert.deepEqual(transport.preliminaryNeeds.map(n=>n.rowId),after.preliminaryNeeds.map(n=>n.row_id));
      const invalid=structuredClone(stored);(invalid.amendment_contract.parameterSources as {preliminaryNeeds:Record<string,unknown>[]})
        .preliminaryNeeds.find(n=>n.row_id===prefix+':labor')!.need_sha256='eh_'+'0'.repeat(16);
      assert.equal(projectCanonicalEstimatePreliminaryNeedTransport(invalid).preliminaryNeeds.some(n=>n.rowId===prefix+':labor'),false);
      const reopened=JSON.parse(JSON.stringify(detail)) as typeof detail;assert(reopened.preliminaryNeeds);
      const coldResources=reopened.preliminaryNeeds.map(n=>({rowId:n.rowId,operation:n.operation,titleRu:n.titleRu,category:n.category}));
      const sections=canonicalEstimateResourceOperationSections(coldResources),process=canonicalEstimateWorkProcess(coldResources);
      for(const rowId of record.changedRowIds as string[]){
        const resource=coldResources.find(r=>r.rowId===rowId);assert(resource);
        const raw=after.preliminaryNeeds.find(n=>n.row_id===rowId)!;assert.match(raw.need_sha256,/^[0-9a-f]{64}$/);
        const {need_sha256:_hash,...basis}=raw;assert.equal(hashJson(basis),raw.need_sha256);
        assert.deepEqual(canonicalEstimateOperationReferences(resource.operation),canonicalEstimateOperationReferences(map[rowId]));
        assert.equal(sections.filter(section=>section.resourceIds.includes(rowId)).length,1);
        for(const related of map[rowId].additionalOperations){
          const section=sections.find(section=>section.operation?.operationId===related.operationId);assert(section);
          assert.equal(section.resourceIds.includes(rowId),false);assert.equal(section.sharedResources.filter(r=>r.rowId===rowId).length,1);
          const step=process.flatMap(group=>group.operations).find(step=>step.operationId===related.operationId);assert(step);
          assert.equal(step.resourceIds.filter(id=>id===rowId).length,1);
        }
      }
      const primaryOnly=coldResources.map(r=>({...r,operation:{...r.operation,additionalOperations:undefined}}));
      assert.equal(canonicalEstimateResourceOperationSections(primaryOnly).some(section=>section.sharedResources.some(r=>(record.changedRowIds as string[]).includes(r.rowId))),false);
      assert.equal(JSON.stringify(stored),storedBefore);
      return{status:'PASS_CURRENT_CARTRIDGE_RETAINED_OPERATION_ONLY',catalogId:record.catalogId,quantitySourcesChanged:false,contentScopeUnchanged:true,
        capturedRows:c.resources.length,changedRows:record.changedRowIds,
        currentBaselineAvailability:'HOLD_MISSING_EXPLICIT_PURCHASE_INPUTS',currentBaselineProcurementRows:0,currentBaselineMissingPurchaseInputs:missingOrderInputs,
        procurementRows:activePurchases.length,procurementRowsBasis:'EXPLICIT_CONTROL_ONLY_NOT_CAPTURED_BASELINE',confirmedControlProcurementRows:1,
        confirmedControlOrderCartridges:activePurchases[0]!.quantity,actualObjectFactsAccepted:false,acceptedNewCompleteTypes:0,FULL:false};
    }};
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754PreparedCartridgeFinishes.ts')){
  const key=process.argv.find(a=>a.startsWith('--type='))?.slice(7)??pack.types[0].key,index=pack.types.findIndex(t=>t.key===key);if(index<0)throw Error('EXACT_PREPARED_CARTRIDGE_TYPE_REQUIRED');
  const c=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  const currentParent={releaseId:c.definitionReleaseId,searchReleaseId:c.searchReleaseId};const record=process.argv.includes('--retained-current-r388')?preparedCartridgeCurrentRecordsR388().find(r=>r.catalogId===pack.types[index].catalogId):null;if(process.argv.includes('--retained-current-r388'))assert(record,'EXACT_CURRENT_CAPTURE_REQUIRED');
  void runMasterSingleDefinitionSuccessorR1(record?preparedCartridgeCurrentRetainedConfigR388(record,currentParent):preparedCartridgeConfigS2754(index,currentParent)).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
