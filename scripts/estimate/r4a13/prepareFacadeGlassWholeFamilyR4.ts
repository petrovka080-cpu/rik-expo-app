import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import source from '../../../data/estimate-benchmarks/source-packs/facade-glass-whole-existing-owner-r4.json';
import vacuumSource from '../../../data/estimate-benchmarks/source-packs/facade-glass-vacuum-whole-device-r5.json';
import {masterFacadeGlassCapturedParentR4 as captured,masterFacadeGlassRepresentativeR4 as original,buildMasterFacadeGlassWholeSuccessorR4 as build,compileMasterFacadeGlassWholeR4 as compile,masterFacadeGlassWholeControlR4 as control,masterFacadeGlassLegacyInputR4 as legacy,facadeGlassFamilySourceIdR4 as sourceId,facadeGlassSelectorR4 as selector,facadeGlassFamilyChoiceR4 as choice,facadeGlassFamilyParameterIdR4 as methodParameterId} from '../../../src/lib/estimate/v4/masterFacadeGlassWholeFamilyR4';
import {facadeGlassWholePackR4 as pack,facadeGlassWholeOwnerR4 as catalogId,type FacadeGlassWholeMethodKeyR4 as Key} from '../../../src/lib/estimate/v4/facadeGlassWholeMethodsR4';
import {compileFacadeGlassOriginalParentR3 as independentOriginal} from './facadeGlassCapturedParentReplaysR3';
const approvedSourceValue:unknown=JSON.parse(readFileSync(resolve(__dirname,'../../../data/estimate-benchmarks/fixtures/master-retained-approved-template-source-evidence-r5.json'),'utf8'));
const approvedSourceRecord=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
assert(approvedSourceRecord(approvedSourceValue)&&typeof approvedSourceValue.currentDefinitionId==='string'&&typeof approvedSourceValue.currentBaselineId==='string'&&approvedSourceRecord(approvedSourceValue.capturedSourceDefinition),'GLASS_R5_APPROVED_SOURCE_WITNESS_SHAPE');
const approvedSource={currentDefinitionId:approvedSourceValue.currentDefinitionId,currentBaselineId:approvedSourceValue.currentBaselineId,capturedSourceDefinition:approvedSourceValue.capturedSourceDefinition};
import {masterRetainedParentCaptureSha256R1,masterRetainParentBindingsOptInR1,prepareMasterRetainedBindingRepresentativeR1,type MasterRetainedBindingGuardInputR1,type MasterRetainedParentCaptureR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {compareFormulaGraphDecimals as cmp} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {validateIndependentCompletenessMapReferences,buildMasterPublicationResourceRowsR1,resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId,resolveMasterSingleDefinitionLocatorExcerptSha256R1,hashMasterSingleDefinitionSuccessorReceiptR1,type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';
const packPath='data/estimate-benchmarks/source-packs/facade-glass-whole-existing-owner-r4.json',fixturePath='data/estimate-benchmarks/fixtures/facade-glass-original-parents-r3.json',sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const keys:readonly Key[]=['stick','structural','semi-structural','unitized','point-fixed'];
const same=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const consumerIdsR5=new Set([selector,'glass_facade_area_m2','glazing_area_m2','floors']);
const legacyGeometryR5=()=>Object.fromEntries(Object.entries(legacy()).filter(([id])=>consumerIdsR5.has(id)));
const legacyReadbackR5=()=>Object.fromEntries(Object.entries(legacy()).filter(([id,value])=>!consumerIdsR5.has(id)&&value!=null));
// Only the exact method name is fixed by the selected source card. Actual
// project acceptance, BOM, passports, lifting plans and equipment stay readback.
const fixedSourceMethodsR5=()=>Object.fromEntries(keys.map(key=>[methodParameterId(key,'glass_exact_method'),choice(key)]));
function compileSourceFixtureR5(model:Parameters<typeof compile>[0],fixture:Record<string,unknown>){
 const submitted=Object.fromEntries(Object.entries(fixture).filter(([id])=>consumerIdsR5.has(id)));
 const confirmedParameters=Object.fromEntries(Object.entries(fixture).filter(([id])=>!consumerIdsR5.has(id)));
 return compile(model,submitted,{confirmedParameters});
}
/** Exact normal retain-parent declaration. Old source IDs remain logical
 * historical ASSUMPTION provenance, not registered physical quantity norms. */
export function facadeGlassWholeRetainedOptionsR4():MasterRetainParentBindingsR1{
 const c=captured()as MasterRetainedParentCaptureR1,next=build(original()),oldIds=new Set(c.parameters.map(q=>q.parameter_id));
 const legacyTemplateAssumptionSources={contract:'master-retained-legacy-template-assumptions/r1'as const,templateId:String(c.definition.source_metadata.templateId),parameterSources:structuredClone(c.baseline.normative_source_ids),approvedSourceEvidence:{contract:'master-retained-approved-template-source-evidence/v1'as const,capturedSourceDefinition:structuredClone(approvedSource.capturedSourceDefinition),capturedSourceDefinitionSha256:createHash('sha256').update(JSON.stringify(stable(approvedSource.capturedSourceDefinition))).digest('hex')}};
 assert.equal(approvedSource.currentDefinitionId,c.definition.id);assert.equal(approvedSource.currentBaselineId,c.baseline.id);
 return{capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),capturedSourcePreimage:{sourceKey:sourceId,expected:null},legacyTemplateAssumptionSources,newParameterSources:Object.fromEntries(next.parameters.filter(q=>!oldIds.has(q.parameter_id)).map(q=>[q.parameter_id,q.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:q.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?{kind:'DERIVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[sourceId]}]))};
}
/** Same deterministic source/locator identities as the existing publisher.
 * This pure Config check assembles no release, target definition or DB client. */
function retainedRegistryIdentityR5(seed:string):string{
 const bytes=Buffer.from(hashMasterSingleDefinitionSuccessorReceiptR1(seed).slice(0,32),'hex');
 bytes[6]=(bytes[6]!&15)|80;bytes[8]=(bytes[8]!&63)|128;
 const h=bytes.toString('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
/** One ordinary retained-owner factory/config. It creates no client, writer,
 * launcher, newcatalog or alternate admission; ROOT executes standardpublisher.
 * General approved-source evidence uses normal/locked/PG historical readback. */
export function facadeGlassWholeFamilyMasterConfigR4(context:{releaseId:string;searchReleaseId:string;outputRoot?:string;sourceRoot?:string}):Config{
 const own=(p:string)=>resolve(context.sourceRoot??'.',p),c=captured(),old=original(),next=build(old),retained=facadeGlassWholeRetainedOptionsR4(),oldRows=new Set(old.resources.map(r=>r.row_id)),fresh=next.resources.filter(r=>!oldRows.has(r.row_id)&&r.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id),map=next.passport.decision.independentCompletenessMap;
 const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_14_2026-10-23.txt',masterSha256='e24f52197dab5a1bb4bbca8d139b5b6a5c722efce6c758b3efffd6266f1d78ed';assert.equal(sha(masterPath),masterSha256);assert.equal(sha(own(fixturePath)),source.existingParentCaptureSha256);
 const sourceDocs=[...new Map(source.profiles.flatMap(p=>p.sources).map(s=>[s.path,s])).values()];
 for(const s of sourceDocs)assert.equal(sha(own(s.path)),s.sha256,'GLASS_R4_EXACT_PRIMARY_DOCUMENT_REQUIRED');
 const vacuumPackPath='data/estimate-benchmarks/source-packs/facade-glass-vacuum-whole-device-r5.json',vacuumReference=source.reusedWholeSourceComponents.find(c=>c.key==='exact-vacuum-whole-device-r5');
 assert(vacuumReference);assert.equal(sha(own(vacuumPackPath)),vacuumReference.sha256);assert.equal(vacuumReference.exactSelectedSourceProfile,vacuumSource.scope.internalExactDevice);for(const d of vacuumSource.sources)assert.equal(sha(own(d.path)),d.sha256,'GLASS_R5_REUSED_WHOLE_DEVICE_SOURCE_BYTES');
 const paths=[packPath,vacuumPackPath,...vacuumSource.sources.map(s=>s.path),'src/lib/estimate/v4/facadeGlassVacuumWholeDeviceR5.ts','src/lib/estimate/v4/facadeGlassVacuumWholeDeviceR5.test.ts',fixturePath,'data/estimate-benchmarks/fixtures/master-retained-approved-template-source-evidence-r5.json',...sourceDocs.map(s=>s.path),'src/lib/estimate/v4/facadeGlassWholeMethodsR4.ts','src/lib/estimate/v4/facadeGlassWholeMethodsR4.test.ts','src/lib/estimate/v4/masterFacadeGlassWholeFamilyR4.ts','src/lib/estimate/v4/masterFacadeGlassWholeFamilyR4.test.ts','scripts/estimate/r4a13/prepareFacadeGlassWholeFamilyR4.ts','scripts/estimate/r4a13/facadeGlassCapturedParentReplaysR3.ts','scripts/estimate/r4a13/facadeGlassCapturedParentReplaysR3.test.ts','scripts/estimate/r4a13/facadeFamilyReadyRecipesR2.ts','src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/backendPlatform/canonicalPrimaryMeasureSelectionV1.ts','src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts','scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts','scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'];
 assert(paths.every(p=>existsSync(own(p))),'GLASS_R4_ALL_SOURCE_DEPENDENCIES_REQUIRED');
 const config:Config={contract:source.contract,stopCode:'FACADE_GLASS_WHOLE_R4',applicationName:'facade-glass-whole-r4',expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256,parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',outputRoot:context.outputRoot??'.release-runtime/r568/facade-glass-whole-r4',sourcePaths:[...new Set(paths)],catalogId,sourceId,normId:'FIVE_EXACT_WHOLE_GLASS_METHODS_WITH_ORIGINAL_LEGACY_OWNER',sourceMetadata:{source_title:'Стеклянный фасад: пять согласованных исходных методов и сохранённый прежний расчёт',source_authority:'Полные первичные документы системодержателей; исходные проектные ведомости; ограниченная историческая lineage без переноса её норм',source_kind:'COMPOSITE_WHOLE_PRIMARY_METHODS_AND_EXACT_RETAINED_OWNER',official_url:sourceDocs[0]!.url,artifact_sha256:sha(own(packPath)),exact_locator:'Exact6whole-glass-documents;5methods;original5/45/45;optionalwhole-vacuum-device2documentsandpinnedcomponentpack',use_restriction:'Только точные исходные методы и принятые проектные материалы/узлы/ведомости. Зарубежный документ не является автоматическим допускомКР. Неизвестные внутренние нормы видимы; FULL0.'},parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,shortInput:legacyGeometryR5(),acceptanceInput:{...legacyGeometryR5(),...legacyReadbackR5(),...fixedSourceMethodsR5()},runtimeProfileInput:{...legacyReadbackR5(),...fixedSourceMethodsR5()},runtimeProfileClassification:{...Object.fromEntries(Object.keys(legacyReadbackR5()).map(id=>[id,'ASSUMPTION'])),...Object.fromEntries(Object.keys(fixedSourceMethodsR5()).map(id=>[id,'NORMATIVE']))},runtimeProfileSourceIds:{...Object.fromEntries(Object.keys(legacyReadbackR5()).map(id=>[id,c.baseline.normative_source_ids[id]])),...Object.fromEntries(Object.keys(fixedSourceMethodsR5()).map(id=>[id,[sourceId]]))},expectedParentShape:[5,45,45],benchmarkOrdinal:0,validationScenario:'EXACT_OLD45_UNCHANGED_AND_FIVE_NEW_METHOD_SOURCE_ORACLES',
 passport:{canonicalRuName:'Монтаж стеклянного фасада',workKey:'curtain_wall_system',physicalResultRu:'Стеклянный фасад по явно выбранной согласованной системе с сохранением прежнего расчёта; ресурсная готовность предварительная до закрытия внутренних потребностей.',includedScopeRu:next.passport.included_scope_ru,excludedScopeRu:next.passport.excluded_scope_ru,independentCompletenessMap:map,unresolvedApplicableResourceRowIds:next.passport.decision.unresolvedResourceRowIds},applicability:{...next.definition.applicability,retainedParentCaptureSha256:retained.capturedParentSha256,approvedInputSourceEvidence:'master-retained-approved-template-source-evidence/v1;exact historical definition and approved baseline proposal source refs;not a quantity norm',normalLockedPreflightRequired:true},binding:{rowId:fresh[0]!,additionalRowIds:fresh.slice(1),retainParentBindings:retained,applicability:{contract:source.contract,selectorParameterId:selector,oneExistingCatalogOwner:true,originalParentDefinitionId:c.definition.id,fullTechnicalAcceptance:false},applicabilityByRowId:Object.fromEntries(fresh.map(id=>[id,{contract:source.contract,source_artifact_sha256:next.resources.find(r=>r.row_id===id)!.source_metadata?.source_artifact_sha256,sourceRole:next.resources.find(r=>r.row_id===id)!.source_metadata?.sourceRole,automaticLegacyQuantityOrPriceTransferAllowed:false}]))},locator:{key:'facade-glass-whole-existing-owner-r4',payload:{contract:source.contract,sourcePack:source,exactOriginalCaptureSha256:source.existingParentCaptureSha256,independentCompletenessMap:map,registeredCompositeSourceKey:sourceId,logicalSourceMemberIdentities:[...keys.map(k=>'gox_facade_glass_whole_r4_'+k),'gox_facade_glass_vacuum_whole_r5'],logicalMembersRegisteredByThisFactory:false,originalLegacyLogicalSourceNotPhysicalNorm:true,fullTechnicalAcceptance:false}},search:{primaryUom:'m2',canonicalNameRu:'Монтаж стеклянного фасада',aliases:['Стеклянный фасад по согласованной системе'],shortScopeRu:'Сохранённый расчёт либо пять точных методов с отдельными проектными ведомостями и видимыми потребностями полного обеспечения.',keyDistinguishingParameters:[selector],clarificationFields:[selector],includedBoundaries:keys.map(choice),excludedBoundaries:['Стекло, нагрузки, толщина, масса и анкеры не выводятся из площади.','Допуск территории и совместимость исходной системы проверяются по проекту.','Старые количества/цены не переносятся; FULLне присваивается.'],extraSearchTermsRu:'стеклянный фасад стоечно ригельный структурный полуструктурный модульный точечный',sourceProvenance:{contract:source.contract,originalParentDefinitionId:c.definition.id,additionalTwoExistingGlassOwnersUntouched:true,newCatalogIds:0,newFullTechnologies:0}},forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_FACADE_NEXT_VERSION',receiptFileStem:'facade_glass_whole_r4',verifyCore:async()=>{
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
  const before=await independentOriginal('curtain_wall_system'),after=await compileSourceFixtureR5(next,legacy()),view=(r:typeof before)=>({rows:r.rows.map(x=>[x.row_id,x.quantity,x.unit_price,x.amount,x.included_in_estimate,x.included_in_procurement]),needs:r.preliminaryNeeds,totals:r.totals});assert.deepEqual(view(after),view(before));
  for(const key of keys){const p=pack(key),result=await compileSourceFixtureR5(next,control(key));assert.equal(result.preliminaryNeeds.length,p.needs.length);assert(result.rows.every(r=>r.row_id.startsWith(p.prefix+':')));assert(result.rows.every(r=>r.unit_price===null));if(key==='point-fixed')assert.equal(cmp(result.rows.find(r=>r.row_id===p.prefix+':source:fitting-o-rings')!.quantity,'80'),0);}
  // Reuse the existing ordinary publisher/retainer assembly, not a second
  // admission path. A source-only witness cannot authorize publication.
  const generatedSourceId=retainedRegistryIdentityR5(`${config.contract}:${config.sourceId}:source`);
  const locatorId=retainedRegistryIdentityR5(`${config.contract}:${config.sourceId}:${config.locator.key}:locator`),metadata=config.sourceMetadata;
  const guardInput:MasterRetainedBindingGuardInputR1={config,newSource:{id:generatedSourceId,source_key:config.sourceId,
    title_ru:metadata.source_title,authority:metadata.source_authority,official_url:metadata.official_url??null,
    artifact_sha256:metadata.artifact_sha256??null,effective_from:metadata.effective_from??null,effective_to:null,
    metadata:{contract:config.contract,sourceKind:metadata.source_kind??'PROJECT_DOCUMENTATION_REQUIRED',useRestriction:metadata.use_restriction,
      universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
    newLocators:[{id:locatorId,source_id:generatedSourceId,locator_key:config.locator.key,locator:config.locator.payload,
      excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
  assert(masterRetainParentBindingsOptInR1(guardInput),'GLASS_R5_STANDARD_RETAINED_DECLARATION_REQUIRED');
  const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),oldFormulaIds=new Set(retained.capturedParent.formulas.map(f=>f.formula_id));
  const formulas=config.formulaDefinitions.map(f=>({...f,ast_sha256:oldFormulaIds.has(f.formula_id)?f.ast_sha256:hashMasterSingleDefinitionSuccessorReceiptR1(f.ast)}));
  const applicability=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,[locatorId]);
  const bindings=resolveMasterSingleDefinitionBindingRowIds(config,resources,[locatorId]).map(row_id=>({row_id,locator_id:locatorId,applicability:applicability[row_id]}));
  const sourceHashes=config.sourcePaths.map(path=>({path,sha256:sha(own(path))}));
  const sourceWitness=hashMasterSingleDefinitionSuccessorReceiptR1({purpose:'PURE_CONFIG_RETAINED_REPRESENTATIVE_NOT_PUBLICATION_IDENTITY',
    contract:config.contract,capturedParentSha256:retained.capturedParentSha256,sourceHashes,source:guardInput.newSource,locators:guardInput.newLocators});
  const retainedRepresentative=prepareMasterRetainedBindingRepresentativeR1(guardInput,{parameters:config.parameterDefinitions,formulas,resources,newBindings:bindings,
    successorProvenance:{contract:config.contract,sourceId:config.sourceId,normId:config.normId,parentDefinitionId:c.definition.id,parentBaselineId:c.baseline.id,
      capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:sourceWitness},
    lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:sourceWitness}});
  for(const id of Object.keys(c.baseline.normative_source_ids))assert.deepEqual(retainedRepresentative.normativeSourceIds[id],c.baseline.normative_source_ids[id]);
  assert.equal(c.resources.length,45);assert.equal(resources.filter(r=>oldRows.has(r.row_id)).length,45);
  return{status:'ACTUAL_CONFIG_CORE_AND_EXISTING_RETAINED_REPRESENTATIVE',original45Preserved:true,wholeMethods:5,sourcePrimaryDocuments:sourceDocs.length,
    reusedWholeDeviceSourceDocuments:vacuumSource.sources.length,legacyAssumptionsNotPromotedToPhysicalNorms:true,
    standardRetainedRepresentative:{oldResources:45,newBindings:bindings.length,expectedNormativeBindingCount:retainedRepresentative.expectedNormativeBindingCount,
      sourceWitnessKind:'PURE_CONFIG_NOT_PUBLICATION_IDENTITY',sourceWitnessSha256:sourceWitness,sourceFiles:sourceHashes.length},
    normalLockedDbPreflight:'STILL_REQUIRED',newFull:0};
 }};
 return config;
}
