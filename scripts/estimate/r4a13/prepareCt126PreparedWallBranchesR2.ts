import {buildCanonicalRevisionCommitPayload} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalEstimateRevisionDetailFromStorage,canonicalEstimateRevisionRowFromStorage} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {projectCanonicalEstimatePreliminaryNeedTransport} from '../../../src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport';
import {canonicalEstimateOperationReferences,canonicalEstimateResourceOperationSections,canonicalEstimateWorkProcess} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {compileCanonicalEstimateCore} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {masterOperationValueSha256R1,assertMasterOperationCompositionDeclarationR1,assertMasterOperationCompositionComputationR1} from './masterOperationCompositionOnlyR1';
import {resolve} from 'node:path';
import type {CanonicalPublisherJson as Json} from './canonicalDefinitionPublisherR1';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {runMasterSingleDefinitionSuccessorR1,validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {buildCt126PreparedWallBranchesR2 as build,ct126PreparedWallBranchesPackR2 as pack,ct126PreparedWallCompletenessMapR2 as map,ct126PreparedWallParameterMapR2 as parameterMap} from '../../../src/lib/estimate/v4/ct126PreparedWallBranchesR2';
import {ct126PreparedSeriesSourceS2754 as prepared} from '../../../src/lib/estimate/v4/ct126PreparedSeriesS2754';
import oldSource from '../../../data/estimate-benchmarks/source-packs/ct126-dry-wall-s27-54.json';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import type {PurchaseGroupRepresentative as Rep} from './s2732PurchaseGroupOverlay';
const snapshot=require('../../../data/estimate-benchmarks/fixtures/ct126-current-four-v4-parents-r2.json') as {reps:Rep[];retainedCaptures:MasterRetainedParentCaptureR1[]};
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const masterPath='C:/Users/User/Downloads/GOX_BUILD_TZ_Single_Platform_Core_Sol61_2026-10-19(2).txt';
const packPath='data/estimate-benchmarks/source-packs/ct126-four-prepared-wall-branches-r2.json';
const subject='src/lib/estimate/v4/ct126PreparedWallBranchesR2.ts';
/** Exact R329 and current ELECOR presentation-only additions. Every retained field, source ID,
 * schema and binding is hashed after removing only these exact disjoint presentation IDs.
 * This does not forward any norm, owner, quantity or retained old89 row. */
const publicPresentationForwardR2:Record<string,{fromSha256:string;currentSha256:string;retainedSemanticSha256:string;
 arrays:Record<string,{identityFields:string[];added:(string|null)[][]}>}>={
  "data/estimate-benchmarks/source-packs/public-estimate-language-s27-50.json": {
  "fromSha256": "82c26fabe15fea774a4ac2f806b3490eeefae037f82b7aeb8e33bf25d716aed3",
  "currentSha256": "dcd44c10b370d0762ebbdab622d13a57dcd5b66dd2c4a8d664bab797617d6274",
  "retainedSemanticSha256": "bb7ae569b788cd8bcaa52b3065df42c23c469c955da51cc6c494a71f176ad6ed",
  "arrays": {
    "workBindings": {
      "identityFields": [
        "sourceTitleRu"
      ],
      "added": [
        [
          "Наплавление двух дополнительных слоёв ЭПП-4 в ендовах"
        ],
        [
          "Монтаж кабель-канала ELECOR"
        ],
        [
          "Материалы IEK ELECOR 60×40: прямой участок и крепёж по ППР — частичный состав"
        ]
      ]
    },
    "parameterBindings": {
      "identityFields": [
        "catalogId",
        "parameterId",
        "sourceTitleRu"
      ],
      "added": [
        [
          "canonical-work:base:roofing_interior_flat_roof_install_technical_room",
          "m212_roof_reuse_torch_primer_q",
          "Нормативная площадь кровли для огрунтовки, м²"
        ],
        [
          null,
          "elecor_fixing_method",
          "Принятый способ крепления ELECOR по ППР"
        ],
        [
          null,
          "elecor_fixing_product_sku",
          "Комплект DuoPower 6 × 30 с винтом Panhead 4,5 × 40, артикул 535463"
        ]
      ]
    },
    "choiceBindings": {
      "identityFields": ["sourceValue"],
      "added": [
        [
          "Механическое крепление к бетонной стене: комплект535463 по принятому ППР"
        ],
        [
          "Одна штука — полный комплект535463: дюбельDuoPower6×30 и винтPanhead4,5×40"
        ],
        [
          "Узел535463 на бетонной стене принят в ППР: нагрузка, отверстие, головка и полный состав проверены"
        ],
        [
          "ППР принимает белую заглушку КМЗ 60 × 40 для каждого указанного закрытого торца данного прямого участка; остальные примыкания и узлы не закрыты"
        ],
        [
          "Принята ведомость одиночных комплектных розеток069730L; готовое основание и крепёж; подготовленный совместимый обесточенный ввод; проверены маркировка изделия, проводники и программа электроиспытаний; работы выполняет допущенный персонал"
        ],
        [
          "50 комплектов в заводской коробке: 50 дюбелей DuoPower 6×30 и 50 винтов Panhead 4,5×40. Строка измеряется в комплектных парах, цена за одну пару, не за коробку."
        ]
      ]
    }
  }
},
  "data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json": {
    "fromSha256": "d46879709c79f99485203f86b86f631521fd11469597ed81c2c3703fd1b841d1",
    "currentSha256": "c74a1df4ebdea8590c0faaf62e767cad4f6ea726c369ad15375234eb58359e14",
    "retainedSemanticSha256": "65c96020400fa713b608e612b1d697fb5112d97132bc041a6403ef4c5f5c8e23",
    "arrays": {
      "bindings": {
        "identityFields": [
          "rowId",
          "sourceTitleRu"
        ],
        "added": [
          [
            "roof:torch-two:krer12-002-09:upper_isoplast_ekp_4_5",
            "Материал рулонный кровельный для верхнего слоя, изопласт ЭКП-4.5"
          ],
          [
            "roof:bitumen-tile:krer12-007-07:source-gap:mortar_sealing",
            "Раствор для заделки зазоров — расход не подтверждён источником"
          ],
          [
            "roof:torch-two:krer12-002-09:lower_isoplast_epp_4",
            "Материал рулонный кровельный для нижних слоев, изопласт ЭПП-4"
          ],
          [
            "roof:bitumen-tile:krer12-007-07:included_machine_operators",
            "Машинисты, включенные в эксплуатацию машин"
          ],
          [
            "roof:valley-torch-two:krer12-005-03:lower_isoplast_epp_4",
            "Материал рулонный кровельный для нижних слоев, изопласт ЭПП-4"
          ],
          [
            "roof:bitumen-tile:krer12-007-07:flat_bitumen_shingles",
            "Черепица битумная плоская Katepal размером 1000×317 мм"
          ]
        ]
      }
    }
  }
};
export function assertCt126RetainedPublicPresentationR2(path:string,document:unknown):void{
 const accepted=publicPresentationForwardR2[path];assert(accepted,'CT126_PUBLIC_FORWARD_EXACT_PATH');
 assert(document&&typeof document==='object'&&!Array.isArray(document),'CT126_PUBLIC_FORWARD_OBJECT');
 const retained={...(document as Record<string,unknown>)};
 for(const [arrayName,expectation] of Object.entries(accepted.arrays)){
  const rows=retained[arrayName];assert(Array.isArray(rows),'CT126_PUBLIC_FORWARD_ARRAY');
  const identity=(row:unknown)=>{assert(row&&typeof row==='object'&&!Array.isArray(row),'CT126_PUBLIC_FORWARD_BINDING');
   return JSON.stringify(expectation.identityFields.map(field=>(row as Record<string,unknown>)[field]??null));};
  const added=new Set(expectation.added.map(id=>JSON.stringify(id)));
  for(const id of added)assert.equal(rows.filter(row=>identity(row)===id).length,1,'CT126_PUBLIC_FORWARD_EXACT_ADDITIONS');
  retained[arrayName]=rows.filter(row=>!added.has(identity(row)));
 }
 assert.equal(createHash('sha256').update(canonicalEstimateStableJson(retained)).digest('hex'),accepted.retainedSemanticSha256,'CT126_PUBLIC_FORWARD_RETAINED_SEMANTICS');
}
const compile=(r:Rep,submittedParameters:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:r.definition.catalog_id,compilerVersion:pack.contract,primaryMeasureParameterId:'q',
 definition:{parameters:r.parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:r.formulas as unknown as AutomaticOwnerDefinition['formulas'],resources:r.resources as unknown as AutomaticOwnerDefinition['resources'],runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['q']},submittedParameters});
export function ct126PreparedWallControlR2(index:number|'retained',bag=20):Record<string,unknown>{
 const p=index==='retained'?oldSource:prepared.variants[index]!.pack,m=index==='retained'?Object.fromEntries(['putty_area_m2','layer_thickness_mm','base_confirmed','conditions_confirmed','product_variant_confirmed','selected_ct126_bag','water_stock_l','water_reserve_l','water_quantum_l','ct126_'+bag+'kg_planned_whole_batches','ct126_'+bag+'kg_stock_bags','ct126_'+bag+'kg_reserve_bags','ct126_'+bag+'kg_supplier_bag_multiple'].map(id=>[id,id==='putty_area_m2'?'q':'ct126_wall_'+id])):parameterMap(index),key='ct126_'+bag+'kg';
 const input:Record<string,unknown>={putty_area_m2:35.5,layer_thickness_mm:5,base_confirmed:p.baseValue,conditions_confirmed:p.conditionsValue,product_variant_confirmed:p.productValue,selected_ct126_bag:bag+' кг',
  [key+'_planned_whole_batches']:bag===20?11:43,[key+'_stock_bags']:0,[key+'_reserve_bags']:0,[key+'_supplier_bag_multiple']:1,water_stock_l:0,water_reserve_l:0,water_quantum_l:1,
  ...(index==='retained'?{}:{base_acceptance_reference:'CONTROL_ONLY: источник и приёмка основания; не акт реального объекта'})};
 return{...Object.fromEntries(Object.entries(input).map(([id,value])=>[m[id]!,value])),wall_leveling_technology_choice:index==='retained'?pack.exactChoiceRu:pack.profiles.find(p=>p.preparedIndex===index)!.choiceValue};
}
/** Four bounded recipes for the existing sequential single-definition writer. */
export function ct126PreparedWallMasterConfigR2(parent:{releaseId:string;searchReleaseId:string;outputRoot?:string},catalogId:string):MasterSingleDefinitionSuccessorConfig{
 const target=pack.targets.find(t=>t.catalogId===catalogId),rep=snapshot.reps.find(r=>r.definition.catalog_id===catalogId),capture=snapshot.retainedCaptures.find(r=>r.definition.catalog_id===catalogId);
 assert(target&&rep&&capture,'CT126_R2_CURRENT_ACTIVE_TARGET_REQUIRED');
 assert.equal(sha(pack.parentSnapshot),pack.parentSnapshotSha256,'CT126_R2_IMMUTABLE_CURRENT_CAPTURE');
 for(const pin of pack.sourcePins){
  const publicForward=publicPresentationForwardR2[pin.path];
  if(publicForward){
   assert.equal(pin.sha256,publicForward.fromSha256,'CT126_PUBLIC_FORWARD_ORIGINAL_PIN');
   const raw=readFileSync(pin.path);
   assertCt126RetainedPublicPresentationR2(pin.path,JSON.parse(raw.toString('utf8')));
   assert.equal(createHash('sha256').update(raw).digest('hex'),publicForward.currentSha256,'CT126_PUBLIC_FORWARD_R329_BYTES');
   continue;
  }
  // Exact forward of the source-authored labour relationships. Retained pack
  // and historical rows stay frozen; no other source pin is relaxed.
  const expected=pin.path==='src/lib/estimate/v4/ct126DryWallS2754.ts'
   &&pin.sha256==='0388b23ef901934aec2789d076c508c509b1915a61a8969f0e96cae611b577cc'
   ?'14f290a79f4ab34e9b781fbbf6901d424679d0844b097af2d6e6ee429ec9dea6':pin.sha256;
  assert.equal(sha(pin.path),expected,'CT126_R2_SOURCE_PIN:'+pin.path);
 }
 // Raw historical formula records retain PG microseconds for the strict retained guard.
 const model=build({...rep,formulas:structuredClone(capture.formulas)} as Rep),allMap=map(),sourceId=target.sourceId,newRows=model.resources.filter(r=>!rep.resources.some(old=>old.row_id===r.row_id)),
  bound=pack.profiles.flatMap(p=>['net-mixture','5kg-mix-water-consumed','20kg-mix-water-consumed'].map(s=>p.sourcePrefix+':'+s)),newParameters=model.parameters.filter(p=>!rep.parameters.some(old=>old.parameter_id===p.parameter_id)),
  newParameterSources=Object.fromEntries(newParameters.map(p=>[p.parameter_id,{kind:p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?'UNRESOLVED' as const:String(p.truth_metadata.value_source_role).includes('DERIVED')?'DERIVED' as const:'KNOWN' as const,sourceIds:p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[sourceId]}])),
  open=model.passport.decision.unresolvedResourceRowIds as string[],input=ct126PreparedWallControlR2('retained'),key=catalogId.split('_level_')[1]!;
 const sourcePaths=[subject,'src/lib/estimate/v4/ct126PreparedWallBranchesR2.test.ts',packPath,pack.parentSnapshot,
  'scripts/estimate/r4a13/prepareCt126PreparedWallBranchesR2.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts',
  'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
  'src/lib/estimate/backendPlatform/canonicalCt126SixDryWallMigrationS2769.ts','scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts',
  'src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts','src/lib/estimate/backendPlatform/canonicalEstimateRowCategory.ts','src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts',
  'src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',pack.source.localArtifact,...pack.sourcePins.map(p=>p.path)];
 return{contract:pack.contract,stopCode:'CT126_PREPARED_WALL_R2_'+key.toUpperCase(),applicationName:'ct126-prepared-wall-r2-'+key,
  expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256:pack.masterSha256,parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,
  currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:parent.outputRoot??'.release-runtime/r568/ct126-four-prepared-r2/'+key,
  sourcePaths,catalogId,sourceId,normId:'CT126_THREE_WHOLE_READY_DRY_WALL_PROFILES_R2',
  sourceMetadata:{source_title:'Три подтверждённых профиля ручного выравнивания сухих внутренних стен, слой2–10мм',source_authority:'Henkel/Ceresit: исходная TDS; два существующих prepared-профиля переиспользованы целиком',
   source_kind:'COMPOSITE_PRIMARY_SOURCE_PROFILE_REUSE',official_url:pack.source.officialUrl,artifact_sha256:sha(packPath),exact_locator:pack.source.locatorRu,use_restriction:pack.scopeRu},
  parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,expectedParentShape:[33,89,89],benchmarkOrdinal:0,
  shortInput:{q:35.5},acceptanceInput:input,runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},validationScenario:'CT126_R2_RETAINED_EXACT_AND_TWO_DISTINCT_PREPARED_BASES',
  passport:{canonicalRuName:String(rep.definition.passport.titleRu),workKey:catalogId.replace('canonical-work:base:',''),physicalResultRu:pack.scopeRu,
   includedScopeRu:[...rep.passport.included_scope_ru,...pack.profiles.map(p=>p.scopeRu)],excludedScopeRu:rep.passport.excluded_scope_ru,
   independentCompletenessMap:allMap,unresolvedApplicableResourceRowIds:open},
  applicability:{...rep.definition.applicability,primaryMeasureParameterId:'q',preparedWallContractR2:pack.contract,sourceProfilesPerCatalog:3,additionalCalculableBranches:2,
   retainedParentCaptureSha256:masterRetainedParentCaptureSha256R1(capture),fullTechnicalAcceptance:false,newFullTechnologies:0},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),ct126PreparedWallMigrationR2:true,
   applicability:{contract:pack.contract,sourceProfiles:pack.profiles.map(p=>({choice:p.choiceValue,scopeRu:p.scopeRu,sourceCatalogId:p.sourceCatalogId})),oneSelectedProfileOnly:true,fullTechnicalAcceptance:false},
   applicabilityByRowId:Object.fromEntries(bound.map(rowId=>{const p=pack.profiles.find(p=>rowId.startsWith(p.sourcePrefix+':'))!;return[rowId,{contract:pack.contract,choice:p.choiceValue,scopeRu:p.scopeRu,sourceCatalogId:p.sourceCatalogId,priorPrimer:p.priorPrimer,baseAcceptanceReferenceRequired:true,layerMm:[2,10],fullTechnicalAcceptance:false}];})),
   retainParentBindings:{capturedParent:capture,capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),newParameterSources,capturedSourcePreimage:{sourceKey:sourceId,expected:null}}},
  locator:{key:'ct126-prepared-wall-r2-'+key,payload:{contract:pack.contract,source:pack.source,preparedProfiles:pack.profiles,sourcePins:pack.sourcePins,newOfficialNorms:0,fullTechnicalAcceptance:false}},
  search:{primaryUom:'m2',canonicalNameRu:String(rep.definition.passport.titleRu),aliases:['Ручное выравнивание сухой гипсовой шпаклёвкой','Шпаклевание принятой цементной штукатурки','Шпаклевание принятого гладкого бетона'],
   shortScopeRu:'Три подтверждённых основания сухой внутренней стены, один слой 2–10 мм. Подготовка основания принята; труд, полный инструмент и завершающие операции сохраняют 11 обязательных неизвестных потребностей выбранного профиля.',
   keyDistinguishingParameters:['wall_leveling_technology_choice'],clarificationFields:['q','wall_leveling_technology_choice'],includedBoundaries:[pack.scopeRu],excludedBoundaries:rep.passport.excluded_scope_ru,
   extraSearchTermsRu:'сухая гипсовая шпаклевка цементно известковая цементная штукатурка гладкий бетон готовое основание проникающий адгезионный грунт 2 10 мм',sourceProvenance:{contract:pack.contract,newOfficialNorms:0,fullTechnicalAcceptance:false}},
  forbiddenAdjacentMatchers:[/CT127|CM11|VGT/iu],owner:'ROOT_SINGLE_WRITER_CT126_PREPARED_R2',receiptFileStem:'ct126_prepared_wall_r2_'+key,
  verifyCore:async()=>{assert.equal(newRows.length,60);assert.equal(newParameters.length,64);assert.equal(open.length,33);
   assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:allMap,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
   for(const selected of ['retained',0,1] as const)for(const bag of [5,20]){const result=await compile(model,ct126PreparedWallControlR2(selected,bag)),prefix=selected==='retained'?'putty:ct126-dry-wall':pack.profiles.find(p=>p.preparedIndex===selected)!.sourcePrefix;
    assert.equal(result.rows.length,10);assert.equal(result.preliminaryNeeds.length,11);assert(result.rows.every(r=>r.row_id.startsWith(prefix+':')));assert.equal(result.rows.filter(r=>r.included_in_procurement).length,2);
    assert.equal(result.rows.find(r=>r.row_id===prefix+':'+bag+'kg-mix-water-consumed')?.quantity,bag===20?'77':'77.4');}
   return{status:'PASS_CT126_THREE_EXCLUSIVE_WHOLE_PARTIAL_PROFILES',shape:[97,149,149],activeNeeds:11,potentialNeeds:33,additionalBranches:2,newFullTechnologies:0};}
 };
}
export const ct126PreparedWallMasterRecipeRegistryR2=pack.targets.map(t=>({catalogId:t.catalogId,sourceId:t.sourceId,configFactory:ct126PreparedWallMasterConfigR2}));

/** Actual current inputs, loaded only on explicit use. No current DB authority
 * is inferred from this retained artifact; the writer rechecks current tuples. */
export function ct126CurrentMetadataRecordsR411():Json[]{
 const bytes=readFileSync(resolve(__dirname,'../../..',"data/estimate-benchmarks/fixtures/finishing-current12-metadata-records-r411.json"));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),"d3fd4fa3f0ee4c229624180b93fd0c08d01b8c7bca4ab91ca88ada7367b43348",'EXACT_CURRENT_METADATA_INPUT_BYTES');
 const value=JSON.parse(bytes.toString('utf8'));assert.equal(value.status,'ACTUAL_CURRENT_TWELVE_RECIPE_INPUTS_NOT_ADMITTED');
 return (value.records as Json[]).filter(row=>row.family.startsWith("CT126"));
}

/** Existing Master retained recipe. Every current row/source/baseline is kept;
 * only the reviewed operation field may change. Literal admission stays closed
 * until ROOT accepts the genuine helper hashes and a separate guard forward. */
export function ct126CurrentRetainedMetadataConfigR411(record:Json,parent:{releaseId:string;searchReleaseId:string;outputRoot?:string}):MasterSingleDefinitionSuccessorConfig{
 const pinned=ct126CurrentMetadataRecordsR411().find(row=>row.catalogId===record.catalogId);assert(pinned,'EXACT_CURRENT_METADATA_CATALOG');
 assert.deepEqual(record,pinned,'EXACT_CURRENT_METADATA_RECORD');
 const raw=record.capture as MasterRetainedParentCaptureR1,c=raw,p=record.contentPassport,s=record.searchDocument,membership=record.membership;
 // Frozen origin is evidence, not a claim that its old global release is
 // still the current pointer after another card's successor. The existing
 // writer validates active parent, whole membership/capture twice under locks.
 assert.equal(membership.release_id,s.definition_release_id,'EXACT_CAPTURED_ORIGIN_TUPLE');
 const parentId=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
 assert.match(parent.releaseId,parentId,'ACTIVE_PARENT_ID_SHAPE_ONLY_NOT_AUTHORITY');
 assert.match(parent.searchReleaseId,parentId,'ACTIVE_SEARCH_ID_SHAPE_ONLY_NOT_AUTHORITY');
 assert.equal(s.definition_version_id,c.definition.id);assert.equal(membership.approved_template_baseline_id,c.baseline.id);
 const map=record.operationByRowId as Record<string,Json|null>,captureSha=masterRetainedParentCaptureSha256R1(c);
 const mode={contract:'master-operation-composition-only/r1' as const,capturedContentPassport:p,capturedContentPassportSha256:masterOperationValueSha256R1(p),
  operationByRowId:map,operationMapSha256:masterOperationValueSha256R1(map),unchangedAbsentOperationRows:record.unchangedAbsentOperationRows};
 // Intentionally HOLD with today's guard. Computing a hash never enrolls a new
 // catalog/definition in its existing literal reviewed allowlist.
 assertMasterOperationCompositionDeclarationR1({catalogId:record.catalogId,capture:c,captureSha256:captureSha,mode,newParameterSources:{}});
 const resources=c.resources.map(row=>map[row.row_id]===null?row:{...row,resource_graph:{...row.resource_graph,operationCompositionV1:map[row.row_id]}});
 assertMasterOperationCompositionComputationR1(c,mode,{parameters:c.parameters,formulas:c.formulas,resources},'REPRESENTATIVE');
 const source=c.normativeSources.find(row=>row.source_key===record.sourceKey);assert(source);
 const locators=c.normativeLocators.filter(row=>row.source_id===source.id);assert.equal(locators.length,1);
 const locator=locators[0]!,bound=c.bindings.filter(row=>row.locator_id===locator.id);assert(bound.length>0);
 const rowIds=bound.map(binding=>{const row=c.resources.find(row=>row.id===binding.resource_spec_id);assert(row);return row.row_id as string;});
 const ownSourceKeys=c.normativeSources.map(row=>row.source_key),fixtureSources=Object.fromEntries(Object.entries(c.baseline.normative_source_ids)
  .map(([id,keys])=>[id,(keys as string[]).filter(key=>!ownSourceKeys.includes(key))]).filter(([,keys])=>(keys as string[]).length));
 const compileCurrent=(rows:readonly Json[],input:Record<string,unknown>=c.baseline.input_values)=>compileCanonicalEstimateCore({operation:'recalculate',compilerVersion:'finishing-current-operation-only/r411',catalogId:record.catalogId,
  primaryMeasureParameterId:'q',parameterDefinitions:[...c.parameters] as Parameters<typeof compileCanonicalEstimateCore>[0]['parameterDefinitions'],formulaDefinitions:[...c.formulas] as Parameters<typeof compileCanonicalEstimateCore>[0]['formulaDefinitions'],
  resourceDefinitions:[...rows] as Parameters<typeof compileCanonicalEstimateCore>[0]['resourceDefinitions'],submittedParameters:input,confirmedParameters:{},currencyCode:'KGS',maximumResourceRows:rows.length,
  hashJson:(value:unknown)=>createHash('sha256').update(canonicalEstimateStableJson(value)).digest('hex')});
 return{contract:pack.contract,stopCode:'CT126_CURRENT_OPERATION_ONLY_R411',applicationName:'finishing-current-operation-'+record.catalogId.split(':').at(-1),expectedBranch:'codex/r4-a5-clean-08b18902',
  masterPath:'C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_21_2026-10-26.txt',masterSha256:'3f5f8c0e2f0ad1cdaf960d66d7561853fa0e5f70d269b6a8227cea549dcbe602',
  parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
  outputRoot:parent.outputRoot??('.release-runtime/r568/finishing-current-operation-r411/'+record.catalogId.replaceAll(':','_')),
  sourcePaths:["data/estimate-benchmarks/fixtures/current-finishing-reviewed-operation-maps-r414.json","data/estimate-benchmarks/fixtures/finishing-current12-metadata-records-r411.json","scripts/estimate/r4a13/prepareCt126PreparedWallBranchesR2.ts",'scripts/estimate/r4a13/masterOperationCompositionOnlyR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts','src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts','src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper.ts','src/lib/estimate/backendPlatform/canonicalEstimatePreliminaryNeedTransport.ts','src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition.ts',packPath],
  catalogId:record.catalogId,sourceId:record.sourceKey,normId:'CT126_THREE_WHOLE_READY_DRY_WALL_PROFILES_R2',
  sourceMetadata:{source_title:source.title_ru,source_authority:source.authority,official_url:source.official_url,artifact_sha256:source.artifact_sha256,
   source_kind:source.metadata.sourceKind,exact_locator:pack.source.locatorRu,use_restriction:source.metadata.useRestriction},
  parameterDefinitions:c.parameters,formulaDefinitions:c.formulas,resourceDefinitions:resources,shortInput:c.baseline.input_values,acceptanceInput:c.baseline.input_values,
  runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[c.parameters.length,c.formulas.length,c.resources.length],benchmarkOrdinal:0,
  validationScenario:'EXACT_CURRENT_WHOLE_MODEL_OPERATION_METADATA_ONLY',
  passport:{canonicalRuName:c.definition.passport.canonicalRuName,workKey:c.definition.passport.workKey,physicalResultRu:c.definition.passport.physicalResultRu,
   includedScopeRu:p.included_scope_ru,excludedScopeRu:p.excluded_scope_ru,
   ...(p.decision.independentCompletenessMap?{independentCompletenessMap:p.decision.independentCompletenessMap}:{}),
   ...(p.decision.unresolvedResourceRowIds?{unresolvedApplicableResourceRowIds:p.decision.unresolvedResourceRowIds}:{})},
  applicability:c.definition.applicability,
  binding:{rowId:rowIds[0]!,...(rowIds.length>1?{additionalRowIds:rowIds.slice(1)}:{}),applicability:bound[0]!.applicability,
   applicabilityByRowId:Object.fromEntries(bound.map(binding=>[c.resources.find(row=>row.id===binding.resource_spec_id)!.row_id,binding.applicability])),
   retainParentBindings:{capturedParent:c,capturedParentSha256:captureSha,newParameterSources:{},operationCompositionOnly:mode,
    ...(Object.keys(fixtureSources).length?{legacyCapturedFixtureSources:{contract:'master-retained-captured-fixture-provenance/r1' as const,parameterSources:fixtureSources as Record<string,string[]>}}:{})},
   reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1',locatorExcerptHashKind:'CAPTURED_PARENT_OPERATION_COMPOSITION_ONLY_R1',source,locators}},
  locator:{key:locator.locator_key,payload:locator.locator},
  search:{primaryUom:s.primary_uom,canonicalNameRu:s.canonical_name_ru,aliases:s.aliases,shortScopeRu:s.short_scope_ru,keyDistinguishingParameters:s.key_distinguishing_parameters,
   clarificationFields:s.clarification_fields,includedBoundaries:s.included_boundaries,excludedBoundaries:s.excluded_boundaries,extraSearchTermsRu:'',sourceProvenance:s.source_provenance},
  forbiddenAdjacentMatchers:[/CT127|CM11|VGT/iu],owner:'ROOT_SINGLE_WRITER_CT126_PREPARED_R2',receiptFileStem:record.catalogId.split(':').at(-1)+'-current-operation-r411',
  verifyCore:async()=>{
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
   const actualBaselineDurable=durable(after,c.baseline.input_values,['putty:ct126-dry-wall:labor']);
   const controlEvidence:Json[]=[];
   for(const selected of [0,1] as const){
    const input=ct126PreparedWallControlR2(selected,20),prefix=pack.profiles.find(profile=>profile.preparedIndex===selected)!.sourcePrefix;
    const activeBefore=await compileCurrent(c.resources,input),activeAfter=await compileCurrent(resources,input);assert.deepEqual(arithmetic(activeAfter),arithmetic(activeBefore));
    const required=(record.changedRowIds as string[]).filter(id=>id.startsWith(prefix+':'));assert.equal(required.length,9);
    controlEvidence.push({basis:'EXISTING_EXPLICIT_CONTROL_NOT_CAPTURED_BASELINE_OR_OBJECT_FACT',profile:selected,...durable(activeAfter,input,required)});
   }
   return{status:'PASS_CURRENT_MODEL_METADATA_ARITHMETIC_INVARIANT_ONLY',catalogId:record.catalogId,capturedResources:c.resources.length,
    changedOperationRows:record.changedRowIds,retainedMissingOperations:record.unchangedAbsentOperationRows.length,
    currentKnownRows:after.rows.length,currentNeeds:after.preliminaryNeeds.length,currentProcurementRows:after.rows.filter(row=>row.included_in_procurement).length,
    sourceQuantityNormsChanged:false,actualObjectFactsAccepted:false,actualBaselineDurable,controlEvidence,wholeDeliveryAcceptance:false,FULL:false};
  }};
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareCt126PreparedWallBranchesR2.ts')){
 const catalogId=process.argv.find(a=>a.startsWith('--catalog-id='))?.slice('--catalog-id='.length);if(!catalogId)throw Error('CT126_R2_EXACT_CATALOG_ID_REQUIRED');
 if(process.argv.includes('--allow-hashed-dirty-source'))process.env.R4A13_ALLOW_HASHED_DIRTY_SOURCE='true';
 const current=JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json','utf8'));
 void runMasterSingleDefinitionSuccessorR1(ct126PreparedWallMasterConfigR2({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId},catalogId)).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
