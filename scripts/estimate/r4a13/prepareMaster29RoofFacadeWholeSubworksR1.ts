import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runMasterSingleDefinitionSuccessorR1,validateIndependentCompletenessMapReferences,type MasterSingleDefinitionSuccessorConfig} from './prepareMasterSingleDefinitionSuccessorR1';
import {masterRetainedParentCaptureSha256R1,type MasterRetainedParentCaptureR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {buildMaster29RoofSuccessorR1,buildMaster29FacadeSuccessorR1,master29CapturedRepresentativeR1,master29RoofFacadePackR1 as pack,master29IndependentCompletenessMapR1} from '../../../src/lib/estimate/v4/master29RoofFacadeWholeSubworksR1';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from '../../../src/lib/estimate/v4/automaticConstructionOwnerR1';
import {ct54ReadyFacadeControlFactsS2763} from '../../../src/lib/estimate/v4/ct54ReadyFacadeSeriesS2763';
import forwardPack from '../../../data/estimate-benchmarks/source-packs/ct54-tesa4369-2600-eight-forward-r1.json';
import type {PurchaseGroupRepresentative as Rep} from './s2732PurchaseGroupOverlay';
const fixture=require('../../../data/estimate-benchmarks/fixtures/master29-roof-facade-current-twelve-r1.json') as {captures:MasterRetainedParentCaptureR1[]};
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const packPath='data/estimate-benchmarks/source-packs/master29-roof-facade-whole-subworks-r1.json';
export const master29RoofControlR1=(key:string,measure:unknown='100'):Record<string,unknown>=>{const p=pack.roofProfiles.find(p=>p.key===key);assert(p);return{[p.choiceId]:p.exactChoiceRu,[p.measureId]:measure,[p.conditionsParameterId]:p.conditionsValueRu,[p.measurementParameterId]:p.measurementValueRu};};
export const master29FacadeControlR1=(n:unknown='3',w:unknown='1.2',h:unknown='2.2'):Record<string,unknown>=>({...ct54ReadyFacadeControlFactsS2763,
 selected_delivery_selection:'NOT_SELECTED',selected_paint_can_l:'15',ct54_15l_stock_cans:'0',ct54_15l_reserve_cans:'0',ct54_15l_supplier_can_multiple:'1',
 ct54_protection_method:pack.facade.publicChoiceRu,ct54_tesa2600_site:forwardPack.exactSiteRu,
 ct54_tesa2600_rectangle_count:n,ct54_tesa2600_cut_width_m:w,ct54_tesa2600_cut_height_m:h,
 ct54_tesa2600_film_stock:'0',ct54_tesa2600_film_reserve:'0',ct54_tesa2600_film_supplier_multiple:'1',ct54_tesa2600_tape_stock:'0',ct54_tesa2600_tape_reserve:'0',ct54_tesa2600_tape_supplier_multiple:'1'});
export const compileMaster29RoofFacadeDemoR1=(model:Rep,input:Record<string,unknown>)=>{const target=pack.targets.find(t=>t.catalogId===model.definition.catalog_id)!;return compileAutomaticConstructionOwnerR1({catalogId:target.catalogId,compilerVersion:pack.contract,
 primaryMeasureParameterId:target.group==='roof'?pack.roofProfiles.find(p=>p.key===target.profileKey)!.measureId:'q',
 definition:{parameters:model.parameters as unknown as AutomaticOwnerDefinition['parameters'],formulas:model.formulas as unknown as AutomaticOwnerDefinition['formulas'],resources:model.resources as unknown as AutomaticOwnerDefinition['resources'],runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:[]},submittedParameters:input});};
/** Twelve bounded retained-parent recipes. Only the existing Master runs writes. */
export function master29RoofFacadeMasterConfigR1(parent:{releaseId:string;searchReleaseId:string;outputRoot?:string},catalogId:string):MasterSingleDefinitionSuccessorConfig{
 const target=pack.targets.find(t=>t.catalogId===catalogId),capture=fixture.captures.find(c=>c.definition.catalog_id===catalogId);assert(target&&capture,'MASTER29_EXACT_CURRENT_TARGET_REQUIRED');
 assert.equal(sha(pack.snapshotPath),pack.snapshotSha256,'MASTER29_IMMUTABLE_CURRENT_CAPTURE');for(const pin of pack.sourcePins)assert.equal(sha(pin.path),pin.sha256,'MASTER29_SOURCE_PIN:'+pin.path);
 const old=master29CapturedRepresentativeR1(catalogId),model=target.group==='roof'?buildMaster29RoofSuccessorR1(old):buildMaster29FacadeSuccessorR1(old),roof=pack.roofProfiles.find(p=>p.key===target.profileKey),sourceId=target.sourceId,
  addedRows=model.resources.filter(r=>!old.resources.some(p=>p.row_id===r.row_id)),bound=addedRows.filter(r=>r.source_metadata.sourceRole!=='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id),
  addedParameters=model.parameters.filter(p=>!old.parameters.some(q=>q.parameter_id===p.parameter_id)),newParameterSources=Object.fromEntries(addedParameters.map(p=>[p.parameter_id,{kind:p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?'UNRESOLVED' as const:String(p.truth_metadata.value_source_role).includes('DERIVED')?'DERIVED' as const:'KNOWN' as const,sourceIds:p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?[]:[sourceId]}])),
  open=model.passport.decision.unresolvedResourceRowIds as string[],allMap=master29IndependentCompletenessMapR1(catalogId),key=catalogId.replace('canonical-work:base:',''),publicTitle=roof?.publicNameRu??'Окраска подготовленного цементного фасада',
  scope=roof?.scopeRu??'Окраска принятого простого цементного фасада; дополнительный целый комплект укрытия шириной2,6м по фактической геометрии. Сохранены все прочие потребности.',
  // The old q=100 remains the EXACT historical ASSUMPTION baseline for the
  // legacy branch/retained-source gate. It is never new project geometry.
  acceptanceInput=target.group==='roof'?{q:100,...master29RoofControlR1(target.profileKey)}:master29FacadeControlR1(),
  sourceMetadata={source_title:roof?.publicNameRu??'Комплект укрытия шириной2,6м: плёнка с верхней лентой и лента трёх краёв',source_authority:roof?'Госстрой Кыргызской Республики: существующая принятая нормативная колонка и общие указания':'tesa: размеры изделий; существующая принятая геометрическая модель раскроя',
   source_kind:roof?'EXISTING_WHOLE_KRER_SUBWORK_SOURCE_REUSE':'EXISTING_WHOLE_MANUFACTURER_DIMENSION_CUT_KIT_REUSE',official_url:roof?.sources[0]?.officialUrl??forwardPack.sources.tesa2026.url,artifact_sha256:sha(packPath),
   exact_locator:roof?.sources[0]?.locators??forwardPack.sources.tesa2026.locator,use_restriction:roof?roof.scopeRu+' '+roof.conditionsValueRu:forwardPack.scopeRu};
 const primarySources=roof?roof.sources:Object.values(forwardPack.sources);for(const pin of primarySources)assert.equal(sha(pin.localArtifact),pin.sha256,'MASTER29_PRIMARY_BYTES:'+pin.localArtifact);const primaryArtifacts=primarySources.map(s=>s.localArtifact);
 return{contract:pack.contract,stopCode:'MASTER29_'+key.toUpperCase(),applicationName:'master29-'+key,expectedBranch:'codex/r4-a5-clean-08b18902',masterPath:pack.masterPath,masterSha256:pack.masterSha256,
  parentReleaseId:parent.releaseId,parentSearchReleaseId:parent.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:parent.outputRoot??'.release-runtime/r568/master29-roof-facade/'+key,
  sourcePaths:[packPath,pack.snapshotPath,'data/estimate-benchmarks/fixtures/master29-roof-facade-independent-expected-r1.json','src/lib/estimate/v4/master29RoofFacadeWholeSubworksR1.ts','src/lib/estimate/v4/master29RoofFacadeWholeSubworksR1.test.ts','scripts/estimate/r4a13/prepareMaster29RoofFacadeWholeSubworksR1.ts',
   'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/canonicalDefinitionPublisherR1.ts',
   'src/lib/estimate/backendPlatform/canonicalDefinitionParameterConsumersR1.ts','src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts','src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline.ts','src/features/consumerRepair/consumerCanonicalBaselineCompile.ts','src/lib/estimate/estimateDeterministicHash.ts',...pack.sourcePins.map(p=>p.path),...primaryArtifacts],
  catalogId,sourceId,normId:roof?.normId??'CT54_2600_WHOLE_CUT_AND_MASK_KIT',sourceMetadata,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
  shortInput:roof?{[roof.measureId]:100}:{q:35.5},acceptanceInput,runtimeProfileInput:roof?{q:100}:{},runtimeProfileClassification:roof?{q:'ASSUMPTION'}:{},runtimeProfileSourceIds:roof?{q:capture.baseline.normative_source_ids.q}:{},
  expectedParentShape:target.expectedParentShape as [number,number,number],benchmarkOrdinal:0,validationScenario:'DEMO_ONLY_MASTER29_WHOLE_SUBWORK_NOT_REAL_OBJECT',
  passport:{canonicalRuName:publicTitle,workKey:key,physicalResultRu:scope,includedScopeRu:[...old.passport.included_scope_ru,scope],excludedScopeRu:[...old.passport.excluded_scope_ru,...(roof?pack.roofOpenNeeds.map(n=>n.reasonRu):forwardPack.excludedRu)],independentCompletenessMap:allMap,unresolvedApplicableResourceRowIds:open},
  applicability:{...old.definition.applicability,primaryMeasureParameterId:roof?.measureId??'q',master29WholeSubworkContract:pack.contract,retainedParentCaptureSha256:masterRetainedParentCaptureSha256R1(capture),fullTechnicalAcceptance:false,newFullTechnologies:0,
   ...(roof?{primaryMeasureSelectionV1:{contract:'canonical-primary-measure-selection/v1',selectorParameterId:roof.choiceId,selections:[{selectorValue:roof.exactChoiceRu,primaryMeasureParameterId:roof.measureId,unitId:roof.unitId},{selectorValue:roof.legacyChoiceRu,primaryMeasureParameterId:'q',unitId:capture.parameters.find(p=>p.parameter_id==='q')!.unit_id}]},historicalQNotProjectMeasure:true,physicalNormNotActualRentalOrPurchase:true,measurementUnitId:roof.unitId}:{protection2600IsAdditionalWholeKit:true,old1800SavedChoiceUnchanged:true})},
  binding:{rowId:bound[0]!,additionalRowIds:bound.slice(1),applicability:{contract:pack.contract,profileKey:target.profileKey,fullTechnicalAcceptance:false,scopeRu:scope},
   applicabilityByRowId:Object.fromEntries(bound.map(rowId=>[rowId,{contract:pack.contract,profileKey:target.profileKey,rowId,unitId:model.resources.find(r=>r.row_id===rowId)!.unit_id,
    sourceRateAccepted:roof?model.resources.find(r=>r.row_id===rowId)!.source_metadata.sourceNormQuantityAccepted:true,physicalNormNotActualRentalOrPurchase:!!roof,fullTechnicalAcceptance:false}])),
   retainParentBindings:{capturedParent:capture,capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),newParameterSources,
    ...(roof?{legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1' as const,templateId:capture.definition.source_metadata.templateId,parameterSources:{q:capture.baseline.normative_source_ids.q}}}:{})}},
  // Same exact source+locator for each of the four consumers of a profile.
  // Default absent-or-managed-exact guard admits the first and strict reuses;
  // the capture proved absence. No overwrite or gate exemption is introduced.
  locator:{key:'master29-'+target.profileKey,payload:{contract:pack.contract,profileKey:target.profileKey,sourcePins:pack.sourcePins,sourceProfile:roof??pack.facade,targetCatalogIds:pack.targets.filter(t=>t.profileKey===target.profileKey).map(t=>t.catalogId),newPhysicalNorms:0,fullTechnicalAcceptance:false}},
  search:{primaryUom:roof?.unitId??'m2',canonicalNameRu:publicTitle,aliases:roof?[roof.publicNameRu]:['Окраска фасада с укрытием прямоугольных элементов','Плёнка для укрытия, ширина2,6м'],shortScopeRu:scope,
   keyDistinguishingParameters:roof?[roof.choiceId,roof.measureId]:['facade_technology_choice','ct54_protection_method'],clarificationFields:roof?[roof.measureId,roof.choiceId,roof.conditionsParameterId,roof.measurementParameterId]:['q','facade_technology_choice','ct54_protection_method','ct54_tesa2600_rectangle_count','ct54_tesa2600_cut_width_m','ct54_tesa2600_cut_height_m'],
   includedBoundaries:[scope],excludedBoundaries:old.passport.excluded_scope_ru,extraSearchTermsRu:roof?'желоба парапеты оцинкованная сталь 0,7мм самостоятельный обмер длина площадь':'фасад окраска укрытие плёнка верхняя лента 14м 2,6м прямоугольники',sourceProvenance:{contract:pack.contract,profileKey:target.profileKey,newFullTechnologies:0,newPhysicalNorms:0}},
  forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_WRITER_MASTER29_B',receiptFileStem:'master29_'+key,
  verifyCore:async()=>{assert(addedRows.length>0);assert(open.length>0);assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:allMap,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
   const r=await compileMaster29RoofFacadeDemoR1(model,roof?master29RoofControlR1(roof.key):master29FacadeControlR1());
   if(roof){assert.equal(r.rows.length,roof.rateRows);assert.equal(r.preliminaryNeeds.length,pack.roofOpenNeeds.length);assert(r.rows.every(r=>r.row_id.startsWith(roof.sourcePrefix+':')));assert(r.preliminaryNeeds.every(n=>n.row_id.startsWith(roof.sourcePrefix+':m29-open:')));assert(r.rows.every(r=>!r.included_in_procurement));}
   else{assert.equal(r.rows.filter(r=>r.row_id.startsWith(pack.facade.sourcePrefix+':')).length,13);assert(r.preliminaryNeeds.length>0);for(const rowId of pack.facade.closedNeedIds)assert(!r.preliminaryNeeds.some(n=>n.row_id===rowId));}
   return{status:'PASS_MASTER29_DEMO_WHOLE_SUBWORK_PARTIAL',sourceProfile:target.profileKey,newRows:addedRows.length,newParameters:addedParameters.length,potentialNeeds:open.length,activeNeeds:r.preliminaryNeeds.length,newFullTechnologies:0};}
 };
}
export const master29RoofFacadeMasterRecipeRegistryR1=pack.targets.map(t=>({catalogId:t.catalogId,sourceId:t.sourceId,configFactory:master29RoofFacadeMasterConfigR1}));
if(process.argv[1]?.replaceAll('\\','/').endsWith('/prepareMaster29RoofFacadeWholeSubworksR1.ts')){
 const catalogId=process.argv.find(a=>a.startsWith('--catalog-id='))?.slice('--catalog-id='.length);if(!catalogId)throw Error('MASTER29_EXACT_CATALOG_ID_REQUIRED');
 if(process.argv.includes('--allow-hashed-dirty-source'))process.env.R4A13_ALLOW_HASHED_DIRTY_SOURCE='true';
 const current=JSON.parse(readFileSync('data/estimate-benchmarks/r568-local-developer-canonical-release.json','utf8'));
 void runMasterSingleDefinitionSuccessorR1(master29RoofFacadeMasterConfigR1({releaseId:current.definitionReleaseId,searchReleaseId:current.searchReleaseId},catalogId)).catch(error=>{process.stderr.write(String(error.stack??error)+'\n');process.exitCode=1;});
}
