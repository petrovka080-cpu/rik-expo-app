
import currentCe40Record from '../../../data/estimate-benchmarks/fixtures/ce40-current-one-operation-metadata-r501.json';
import {isDeepStrictEqual} from 'node:util';
import type {CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {assertMasterOperationCompositionDeclarationR1,assertMasterOperationCompositionComputationR1,masterOperationValueSha256R1,type MasterOperationCompositionOnlyR1} from './masterOperationCompositionOnlyR1';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {buildCanonicalRevisionCommitPayload} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalEstimateRevisionDetailFromStorage,canonicalEstimateRevisionRowFromStorage} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections,canonicalEstimateWorkProcess} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {createHash} from 'node:crypto';import {strict as assert} from 'node:assert';
import {runMasterSingleDefinitionSuccessorR1,type MasterSingleDefinitionSuccessorConfig,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
import {ce40ReadyCeramicConfigS2754,ce40ExplicitControlS2754} from './prepareS2754Ce40ReadyCeramicSeries';
import {ce40ReadyCeramicPackS2754 as floor} from '../../../src/lib/estimate/v4/ce40ReadyCeramicGroutingS2754';
import {ce40ReadyWallPackS2754 as pack,ce40ReadyWallDefinitionS2754,ce40ReadyWallCompletenessMapS2754,
  ce40ReadyWallPrefixS2754,compileCe40ReadyWallS2754} from '../../../src/lib/estimate/v4/ce40ReadyWallGroutingS2754';

export function ce40WallControlS2754(index:number){return {...ce40ExplicitControlS2754(index),ready_joints_confirmed:pack.readyValue,protection_method_confirmed:pack.protectionValue};}
export function ce40ReadyWallConfigS2754(index:number,parent:{releaseId:string;searchReleaseId:string}):MasterSingleDefinitionSuccessorConfig {
  const type=pack.types[index],base=ce40ReadyCeramicConfigS2754(index,parent),definition=ce40ReadyWallDefinitionS2754(index),prefix=ce40ReadyWallPrefixS2754(index),
    gid='wg:base:tile_stone_interior_tile_wall_grout',gname='затирка плиточной стены на большой площади',
    included=[pack.scopeRu,`Выбрана одна точная строка: ${type.tileCm} см / ${type.jointMm} мм, около ${type.rateKgM2} кг/м² облицовки; коэффициент на вертикаль не назначен`,
      'CE 40 Aquastatic ru_KZ, цвет 1 Белый, ведро2кг; принята одна пригодная партия на плоскость',
      'Явный план смешиваемой сухой массы, одна принятая доза0,56–0,60л/2кг; закупка и сухой резерв не увеличивают воду замеса',
      'Влажная очистка примерно15мин, удаление сухого налёта не позднее8ч; защита от пересыхания24ч и контакта с водой7дней',
      'Доступ к высоте стены и СИЗ раскрыты без автоматических лесов, часов и повторной оплаты оснащения исполнителя'];
  return {...base,contract:pack.contract,stopCode:'S2754_CE40_WALL_'+type.key,applicationName:'s2754-ce40-wall-'+type.key,
    outputRoot:resolve('.release-runtime/r568/s27-54/ce40-ready-wall-series/publication/'+type.key),catalogId:type.catalogId,sourceId:pack.sourceId,
    sourcePaths:['scripts/estimate/r4a13/prepareS2754Ce40ReadyWallSeries.ts','src/lib/estimate/v4/ce40ReadyWallGroutingS2754.ts',
      'data/estimate-benchmarks/source-packs/ce40-ready-wall-grouting-s27-54.json',...base.sourcePaths],
    sourceMetadata:{...base.sourceMetadata,source_title:'Ceresit CE 40 Aquastatic ru_KZ: шесть точных пар для готовой внутренней стеновой облицовки',exact_locator:pack.source.locatorRu,
      use_restriction:pack.scopeRu+' Ориентировочный расход не гарантирует достаточность; часы и дополнительные количества открыты.'},
    parameterDefinitions:definition.parameters,formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources,
    acceptanceInput:ce40WallControlS2754(index),validationScenario:'S2754_CE40_READY_WALL_'+type.key,
    passport:{...base.passport,canonicalRuName:type.titleRu,workKey:type.workKey,physicalResultRu:'Конкретные CE 40 и вода связаны с затворением для обычных швов готовой стены; заполнение, очистка, защита и доступ раскрыты. Количества неподтверждённых дополнительных ресурсов не назначены.',
      includedScopeRu:included,excludedScopeRu:pack.excludedRu,unresolvedApplicableResourceRowIds:pack.sourceNeeds.map(g=>prefix+':'+g.id),independentCompletenessMap:ce40ReadyWallCompletenessMapS2754(index)},
    applicability:{...base.applicability,readyIndoorFloor:false,readyIndoorWall:true,wallHeating:false,verticalRateMultiplierNotInvented:true,wallAccessNotAutomaticallyScaffolding:true,
      dryHazeRemovalWithinHours:8,protectionFromDryingHours:24,protectionFromWaterDays:7,walkingTimeNotApplicableToWall:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0},
    binding:{rowId:prefix+':ce40-table-quantity',applicability:{...base.binding.applicability,installation_location:'INDOOR_WALL',prepared_glazed_ceramic:true}},
    locator:{key:'s2754-ce40-wall-'+type.key,payload:{sourcePack:pack,selectedTablePair:type,existingFloorFactoryAndTableReused:true,floorDefinitionsUnchanged:true,fullTechnicalAcceptance:false}},
    search:{...base.search,canonicalNameRu:type.titleRu,aliases:[type.titleRu,`Затирка готовой стены CE40 ${type.tileCm} см ${type.jointMm} мм`],shortScopeRu:pack.scopeRu,
      keyDistinguishingParameters:['ready_joints_confirmed','geometry_confirmed','measured_joint_depth_mm','geometry_acceptance_reference','planned_mixed_dry_kg','water_l_per_2kg'],
      clarificationFields:definition.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').map(p=>p.parameter_id),includedBoundaries:included,excludedBoundaries:pack.excludedRu,
      extraSearchTermsRu:`Ceresit CE 40 Aquastatic белая затирка стена готовая глазурованная керамика обычные швы ведро2кг ${type.tileCm} см ${type.jointMm} мм`,
      sourceProvenance:{sourcePack:'ce40-ready-wall-grouting-s27-54.json',primaryMeasureParameterId:'grout_area_m2',fullTechnicalAcceptance:false}},
    catalogAppend:{identity:{...base.catalogAppend!.identity,sourceIdentity:'ceresit-ce40:rukz:white1:ready-glazed-wall:'+type.key,workKey:type.workKey,titleRu:type.titleRu},
      searchPlacement:{...base.catalogAppend!.searchPlacement,groupId:gid,groupNameRu:gname,subsystemId:gid,assemblyId:gid,workFamilyId:gid,breadcrumb:[gname],membershipOrdinal:5+index,
        constructionState:'READY_GLAZED_CERAMIC_WALL_JOINTS',technologyVariant:'CE40_RUKZ_WHITE1_WALL_'+type.key,
        applicabilityTags:['CE40','WHITE_1','INDOOR_WALL','EXACT_TABLE_PAIR','APPROXIMATE_RATE','PROJECT_MIX_PLAN','MANUFACTURER_PARTIAL']}},
    forbiddenAdjacentMatchers:[/CS25|CM11|floor|heated|epoxy|old_grout/iu],owner:'S2754_CE40_WALL_SINGLE_WRITER',receiptFileStem:'ce40_wall_'+type.key,
    verifyCore:()=>verifyCe40WallS2754(index)};
}
export async function verifyCe40WallS2754(index:number){
  const type=pack.types[index],definition=ce40ReadyWallDefinitionS2754(index),prefix=ce40ReadyWallPrefixS2754(index),input=ce40WallControlS2754(index),
    compile=(p:Record<string,unknown>)=>compileCe40ReadyWallS2754(index,p),r=await compile(input),qty=(id:string)=>r.rows.find(row=>row.row_id===prefix+':'+id)?.quantity;
  assert.equal(createHash('sha256').update(readFileSync(pack.source.localArtifact)).digest('hex'),pack.source.sha256);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:ce40ReadyWallCompletenessMapS2754(index),formulaDefinitions:definition.formulas,resourceDefinitions:definition.resources}),[]);
  assert.equal(r.rows.length,9);assert.equal(r.preliminaryNeeds.length,7);assert.equal(r.rows.filter(row=>row.included_in_procurement).length,2);
  assert.equal(qty('ce40-table-quantity'),['21.3','24.85','14.2','14.2','14.2','17.75'][index]);
  assert.equal(qty('ce40-order'),['22','26','16','16','16','18'][index]);assert.equal(qty('water-mixing'),['6.38','7.25','4.35','4.35','4.35','5.22'][index]);
  assert.equal(qty('water-order'),['7','8','5','5','5','6'][index]);
  for(const fact of ['ready_joints_confirmed','measured_joint_depth_mm','geometry_acceptance_reference','mixing_plan_reference','protection_method_confirmed'])
    assert.equal((await compile({...input,[fact]:undefined})).rows.length,0);
  await assert.rejects(()=>compile({...input,ready_joints_confirmed:floor.readyValue}));
  await assert.rejects(()=>compile({...input,geometry_confirmed:ce40WallControlS2754((index+1)%6).geometry_confirmed}));
  await assert.rejects(()=>compile({...input,open_qty_wall_access_protection:1}));
  await assert.rejects(()=>compile({...input,planned_mixed_dry_kg:1}));
  await assert.rejects(()=>compile({...input,water_l_per_2kg:0.61}));
  const reserved=await compile({...input,ce40_reserve_kg:8,ce40_supplier_bucket_multiple:2});
  assert.equal(reserved.rows.find(row=>row.row_id===prefix+':water-mixing')?.quantity,qty('water-mixing'));
  assert(definition.parameters.every(p=>p.default_value==null));assert(!JSON.stringify(definition.resources).includes('технологический проход не раньше'));
  return {key:type.key,shape:[definition.parameters.length,definition.formulas.length,definition.resources.length],knownRows:9,sourceNeeds:7,procurementRows:2,
    approximateGroutKg:qty('ce40-table-quantity'),mixedDryKg:input.planned_mixed_dry_kg,groutOrderKg:qty('ce40-order'),waterMixL:qty('water-mixing'),waterOrderL:qty('water-order'),
    wallGated:true,oneExactTablePair:true,verticalMultiplierNotInvented:true,fullTechnicalAcceptance:false,acceptedNewCompleteTypes:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareS2754Ce40ReadyWallSeries.ts')){
  const index=Number(process.argv.find(arg=>arg.startsWith('--index='))?.split('=')[1]);if(!Number.isInteger(index)||index<0||index>5)throw Error('EXACT_CE40_WALL_INDEX_REQUIRED');
  const current=JSON.parse(readFileSync(resolve('data/estimate-benchmarks/r568-local-developer-canonical-release.json'),'utf8'));
  void runMasterSingleDefinitionSuccessorR1(ce40ReadyWallConfigS2754(index,{releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId}))
    .catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}

export type Ce40CurrentOperationRecordS2754={catalogId:string;sourceKey:string;profileIndex:number;capture:MasterRetainedParentCaptureR1;
 contentPassport:MasterOperationCompositionOnlyR1['capturedContentPassport'];membership:Json;publicIdentity:Json;searchDocument:Json;
 operationByRowId:MasterOperationCompositionOnlyR1['operationByRowId'];changedRowIds:string[];capturedOriginWholeParentSha256:string};
/** Portable immutable data, not a fresh DB authority or a new admitted work. */
export function ce40CurrentOperationRecordS2754():Ce40CurrentOperationRecordS2754{
 return structuredClone(currentCe40Record) as Ce40CurrentOperationRecordS2754;
}
/** Same existing wall preparer and Master writer. This route changes one saved
 * labor operation field; the source-only +3 physical branch is not selected. */
export function ce40CurrentOperationOnlyConfigS2754(record:Ce40CurrentOperationRecordS2754,
 parent:{releaseId:string;searchReleaseId:string;outputRoot:string;masterPath:string;masterSha256:string;expectedBranch:string}):MasterSingleDefinitionSuccessorConfig{
 assert(isDeepStrictEqual(record,currentCe40Record),'EXACT_REVIEWED_CE40_CURRENT_RECORD');
 const raw=record.capture,p=record.contentPassport,s=record.searchDocument,m=record.membership;
 assert.equal(record.profileIndex,0);assert.equal(record.catalogId,'canonical-work:master:ce40_glazed_ceramic_ready_wall_5x5cm_2mm_standard');
 assert.equal(raw.definition.id,'142305a1-5be0-5c8c-a6c6-c1f78377c2e5');assert.equal(raw.definition.definition_version,1);
 assert.equal(raw.baseline.id,'83877aba-1237-5250-a2f3-c871719f5070');assert.deepEqual([raw.parameters.length,raw.formulas.length,raw.resources.length],[27,16,16]);
 assert.equal(raw.bindings.length,1);assert.equal(raw.normativeSources.length,1);assert.equal(raw.normativeLocators.length,6);
 assert.equal(raw.definition.id,m.definition_version_id);assert.equal(raw.baseline.id,m.approved_template_baseline_id);
 assert.equal(raw.definition.release_id,m.source_release_id);assert.equal(m.release_id,s.definition_release_id);assert.equal(p.definition_version_id,raw.definition.id);
 assert.equal(s.definition_version_id,raw.definition.id);assert.equal(p.catalog_id,record.catalogId);
 const selected=raw.normativeLocators.filter(row=>row.id===raw.bindings[0]!.locator_id),siblings=raw.normativeLocators.filter(row=>row.id!==raw.bindings[0]!.locator_id);
 assert.equal(selected.length,1);assert.equal(siblings.length,5);assert.equal(selected[0]!.locator_key,'s2754-ce40-wall-5x5-2mm');
 const c:MasterRetainedParentCaptureR1={...raw,normativeLocators:selected},map=record.operationByRowId;
 const contracts=[...new Set(c.parameters.map(row=>row.truth_metadata?.contract))];assert.equal(contracts.length,1);
 const contract=contracts[0];assert(typeof contract==='string'&&contract.trim().length>0);assert.equal(contract,c.definition.source_metadata.contract);
 const mode:MasterOperationCompositionOnlyR1={contract:'master-operation-composition-only/r1',capturedContentPassport:p,
  capturedContentPassportSha256:masterOperationValueSha256R1(p),operationByRowId:map,operationMapSha256:masterOperationValueSha256R1(map)};
 const captureSha=masterRetainedParentCaptureSha256R1(c);
 assertMasterOperationCompositionDeclarationR1({catalogId:record.catalogId,capture:c,captureSha256:captureSha,mode,newParameterSources:{}});
 const resources=c.resources.map(row=>({...row,resource_graph:{...row.resource_graph,operationCompositionV1:map[row.row_id]}}));
 assertMasterOperationCompositionComputationR1(c,mode,{parameters:c.parameters,formulas:c.formulas,resources},'REPRESENTATIVE');
 const source=c.normativeSources[0]!,locator=selected[0]!,binding=c.bindings[0]!,boundRow=c.resources.find(row=>row.id===binding.resource_spec_id);assert(boundRow);
 const sourceKeys=c.normativeSources.map(row=>row.source_key),fixtureSources=Object.fromEntries(Object.entries(c.baseline.normative_source_ids).map(([id,keys])=>[id,(keys as string[]).filter(key=>!sourceKeys.includes(key))]).filter(([,keys])=>(keys as string[]).length));
 const compileCurrent=(rows:readonly Json[],input:Record<string,unknown>=c.baseline.input_values)=>compileCanonicalEstimateCore({operation:'recalculate',
  compilerVersion:'finishing-current-operation-only/r411',catalogId:record.catalogId,primaryMeasureParameterId:'grout_area_m2',
  parameterDefinitions:[...c.parameters] as Parameters<typeof compileCanonicalEstimateCore>[0]['parameterDefinitions'],
  formulaDefinitions:[...c.formulas] as Parameters<typeof compileCanonicalEstimateCore>[0]['formulaDefinitions'],
  resourceDefinitions:[...rows] as Parameters<typeof compileCanonicalEstimateCore>[0]['resourceDefinitions'],submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:rows.length,
  hashJson:(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
 const native=ce40ReadyWallConfigS2754(0,parent),{catalogAppend:_append,binding:_oldBinding,...ordinary}=native;
 const currentSources=[
  "data/estimate-benchmarks/fixtures/ce40-current-one-operation-metadata-r501.json",
  "data/estimate-benchmarks/fixtures/current-finishing-reviewed-operation-maps-r414.json",
  "data/estimate-benchmarks/source-packs/aggressive-floor-actual-thickness-four-s27-69.json",
  "data/estimate-benchmarks/source-packs/concrete-floor-base-demolition-s27-54.json",
  "data/estimate-benchmarks/source-packs/public-calculation-detail-roles-r1.json",
  "data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json",
  "data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json",
  "data/estimate-benchmarks/source-packs/roof-screed25-five-bindings-s27-69.json",
  "scripts/estimate/r4a13/masterOperationCompositionOnlyR1.ts",
  "scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts",
  "scripts/estimate/r4a13/prepareS2754Ce40ReadyWallSeries.ts",
  "src/lib/estimate/backendPlatform/canonicalEffectiveResourceQuantityV1.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompositionSelectionV1.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.test.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateSha256.ts",
  "src/lib/estimate/backendPlatform/canonicalFormulaOutputBounds.ts",
  "src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts",
  "src/lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration.ts",
  "src/lib/estimate/backendPlatform/canonicalPublicEstimateInputWordingRu.ts",
  "src/lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu.ts",
  "src/lib/estimate/backendPlatform/canonicalPublicSelectedSpecificationV1.ts",
  "src/lib/estimate/backendPlatform/canonicalScopeRequirementV1.ts",
  "src/lib/estimate/backendPlatform/canonicalSourceProfileSelectionV1.ts",
  "src/lib/estimate/backendPlatform/formulaGraph.ts",
  "src/lib/estimate/backendPlatform/inclusionGraph.ts",
  "src/lib/estimate/backendPlatform/numericParameterRelations.ts",
  "src/lib/estimate/v4/automaticConstructionDefinitionR1.ts"
];
 return {...ordinary,contract,masterPath:parent.masterPath,masterSha256:parent.masterSha256,expectedBranch:parent.expectedBranch,
  stopCode:'S2754_CE40_CURRENT_OPERATION_ONLY',applicationName:'ce40-current-operation-only',outputRoot:parent.outputRoot,
  expectedParentShape:[27,16,16],sourcePaths:[...new Set([...native.sourcePaths,...currentSources])],
  sourceId:record.sourceKey,normId:String(c.definition.source_metadata.normId),
  parameterDefinitions:c.parameters,formulaDefinitions:c.formulas,resourceDefinitions:resources,
  shortInput:c.baseline.input_values,acceptanceInput:c.baseline.input_values,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},
  validationScenario:'EXACT_CURRENT_CE40_ONE_LABOR_OPERATION_METADATA_ONLY',
  passport:{canonicalRuName:c.definition.passport.canonicalRuName,workKey:c.definition.passport.workKey,physicalResultRu:c.definition.passport.physicalResultRu,
   includedScopeRu:p.included_scope_ru,excludedScopeRu:p.excluded_scope_ru,
   ...(p.decision.independentCompletenessMap?{independentCompletenessMap:p.decision.independentCompletenessMap}:{}),
   ...(p.decision.unresolvedResourceRowIds?{unresolvedApplicableResourceRowIds:p.decision.unresolvedResourceRowIds}:{})},
  applicability:c.definition.applicability,
  binding:{rowId:boundRow.row_id,applicability:binding.applicability,applicabilityByRowId:{[boundRow.row_id]:binding.applicability},
   retainParentBindings:{capturedParent:c,capturedParentSha256:captureSha,newParameterSources:{},operationCompositionOnly:mode,
    ...(Object.keys(fixtureSources).length?{legacyCapturedFixtureSources:{contract:'master-retained-captured-fixture-provenance/r1',parameterSources:fixtureSources}}:{})},
   reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1',locatorExcerptHashKind:'CAPTURED_PARENT_OPERATION_COMPOSITION_ONLY_R1',source,locators:selected}},
  locator:{key:locator.locator_key,payload:locator.locator},
  search:{primaryUom:s.primary_uom,canonicalNameRu:s.canonical_name_ru,aliases:s.aliases,shortScopeRu:s.short_scope_ru,keyDistinguishingParameters:s.key_distinguishing_parameters,
   clarificationFields:s.clarification_fields,includedBoundaries:s.included_boundaries,excludedBoundaries:s.excluded_boundaries,extraSearchTermsRu:'',sourceProvenance:s.source_provenance},
  receiptFileStem:'ce40-current-one-labor-operation-only',verifyCore:async()=>{
   const before=await compileCurrent(c.resources),after=await compileCurrent(resources);
   const arithmetic=(result:typeof before)=>({parameters:result.parameters,rows:result.rows.map(row=>({id:row.row_id,quantity:row.quantity,unit:row.unit_id,
    included:row.included_in_estimate,procurement:row.included_in_procurement,eligible:row.procurement_eligible,ownership:row.ownership_status,price:row.unit_price,amount:row.amount})),
    needs:JSON.parse(JSON.stringify(result.preliminaryNeeds,(key,value)=>key==='operationCompositionV1'||key==='need_sha256'?undefined:value)),totals:result.totals});
   assert.deepEqual(arithmetic(after),arithmetic(before));

   const hashJson=(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex');
   const durable=(result:typeof after,input:Record<string,unknown>,requiredIds:readonly string[])=>{
    const commit=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,
     checksumSha256:hashJson(result.revisionProjection),compilerVersion:'finishing-current-operation-only/r411',parameters:result.parameters,
     approvedTemplateBaselineId:c.baseline.id,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,
     derivedParameters:result.derivedParameters,identityContract:{},preliminaryNeeds:result.preliminaryNeeds,purchaseSupplyIndexV1:result.purchaseSupplyIndexV1});
    const stored={id:'11111111-1111-4111-8111-111111111111',release_id:parent.releaseId,definition_version_id:c.definition.id,catalog_id:record.catalogId,
     price_snapshot_ids:result.priceSnapshotIds,input_parameters:commit.resolvedParameters,totals:commit.totals,row_count:commit.rowCount,revision_number:1,status:'ready',currency_code:'KGS',
     compiler_version:'finishing-current-operation-only/r411',created_at:'2026-10-26T00:00:00Z',checksum_sha256:commit.checksumSha256,amendment_contract:{parameterSources:commit.parameterSources}};
    const bytes=JSON.stringify(stored),transport=projectCanonicalEstimatePreliminaryNeedTransport(stored),detail=canonicalEstimateRevisionDetailFromStorage(stored);
    assert.deepEqual(detail.preliminaryNeeds,transport.preliminaryNeeds);assert.deepEqual(transport.preliminaryNeeds.map(need=>need.rowId),result.preliminaryNeeds.map(need=>need.row_id));
    const reopened=JSON.parse(JSON.stringify(detail)) as typeof detail;
    const known=JSON.parse(JSON.stringify(result.rows)).map((row:Json)=>canonicalEstimateRevisionRowFromStorage(row,null,null,stored.amendment_contract));
    const coldResources=[...known.map((row:ReturnType<typeof canonicalEstimateRevisionRowFromStorage>)=>({rowId:row.rowId,titleRu:row.titleRu,category:row.category,
     operation:(row.calculationTrace.resourceGraph as Json).operationCompositionV1})),...reopened.preliminaryNeeds!.map(need=>({rowId:need.rowId,titleRu:need.titleRu,category:need.category,operation:need.operation}))];
    const sections=canonicalEstimateResourceOperationSections(coldResources),process=canonicalEstimateWorkProcess(coldResources);
    for(const id of requiredIds){const resource=coldResources.find(row=>row.rowId===id);assert(resource,'ACTUAL_CORE_ROW_OR_NEED_FOR_OPERATION:'+id);
     assert.deepEqual(canonicalEstimateOperationReferences(resource.operation),canonicalEstimateOperationReferences(map[id]));
     const operation=map[id]!;
     for(const related of operation.additionalOperations??[]){
      assert.equal(sections.filter(section=>section.resourceIds.includes(id)).length,1);
      const section=sections.find(section=>section.operation?.operationId===related.operationId);assert(section);
      assert.equal(section.resourceIds.includes(id),false);assert.equal(section.sharedResources.filter(row=>row.rowId===id).length,1);
      assert.equal(process.flatMap(group=>group.operations).find(step=>step.operationId===related.operationId)!.resourceIds.filter(rowId=>rowId===id).length,1);
     }
    }
    const firstNeed=result.preliminaryNeeds.find(need=>requiredIds.includes(need.row_id));
    if(firstNeed){assert.match(firstNeed.need_sha256,/^[0-9a-f]{64}$/);const {need_sha256:_hash,...basis}=firstNeed;assert.equal(hashJson(basis),firstNeed.need_sha256);
     const invalid=structuredClone(stored);(invalid.amendment_contract.parameterSources as {preliminaryNeeds:Json[]}).preliminaryNeeds.find(need=>need.row_id===firstNeed.row_id)!.need_sha256='eh_'+'0'.repeat(16);
     assert.equal(projectCanonicalEstimatePreliminaryNeedTransport(invalid).preliminaryNeeds.some(need=>need.rowId===firstNeed.row_id),false);}
    assert.equal(JSON.stringify(stored),bytes);return{known:known.length,needs:reopened.preliminaryNeeds!.length,assertedRows:requiredIds.length};
   };
   const actualBaselineDurable=durable(after,c.baseline.input_values,record.changedRowIds);
   return{status:'PASS_CURRENT_CE40_ONE_LABOR_METADATA_ARITHMETIC_AND_TEST_ONLY_TRANSPORT',catalogId:record.catalogId,capturedResources:c.resources.length,
    changedOperationRows:record.changedRowIds,currentKnownRows:after.rows.length,currentNeeds:after.preliminaryNeeds.length,
    currentProcurementRows:after.rows.filter(row=>row.included_in_procurement).length,actualBaselineDurable,
    sourceQuantityNormsChanged:false,actualObjectFactsAccepted:false,TEST_ONLYStoredRow:true,actualDurableStoreTransaction:false,FULL:false};
  }};
}
