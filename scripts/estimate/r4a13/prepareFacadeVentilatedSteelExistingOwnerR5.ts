import {canonicalProfessionalPdfReviewAcknowledgmentV1,canonicalProfessionalPdfReportOriginalAuditV1} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import independent from '../../../data/estimate-benchmarks/fixtures/facade-steel-siding-whole-independent-r59.json';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import steel from '../../../data/estimate-benchmarks/source-packs/facade-steel-siding-historical-06501-r2.json';
import oracle from '../../../data/estimate-benchmarks/fixtures/facade-steel-siding-independent-oracle-r2.json';
import {facadeVentilatedThermowoodRetainedOptionsR5} from './prepareFacadeVentilatedThermowoodR5';
import {facadeSteelSidingScenarioFactsR2,facadeSteelSidingNeedsR2} from '../../../src/lib/estimate/v4/facadeSteelSidingKrer15R2';
import {facadeVentilatedSteelCapturedParentR5 as captured,facadeVentilatedSteelDefinitionR5 as definition,
  facadeVentilatedSteelCompletenessR5 as completeness,facadeVentilatedSteelPrimarySelectionR5 as selection,
  facadeVentilatedSteelCatalogR5 as catalogId,facadeVentilatedSteelSelectorR5 as selector,
  facadeVentilatedSteelChoiceR5 as choice,facadeVentilatedSteelAreaR5 as area,
  compileFacadeVentilatedSteelR5 as compile,type FacadeVentilatedSteelReadbackR5} from '../../../src/lib/estimate/v4/facadeVentilatedSteelExistingOwnerR5';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {canonicalEstimateStableJson} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {assertCanonicalMachineHourDefinitionV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {compareFormulaGraphDecimals as cmp} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {canonicalManualMachineHourPriceCoverageV1,canonicalMachineHourRowPriceDecisionV1} from '../../../src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';
import {buildCanonicalProfessionalPdfProjection,assertCanonicalProfessionalPdfMoneyCells} from '../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf';
import {canonicalArtifactVisibleRowTitle,canonicalArtifactPreliminaryNeeds,canonicalArtifactMoney,escapeCanonicalArtifactHtml} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {facadeSteelSidingDefinitionR59 as currentChild} from '../../../src/lib/estimate/v4/facadeSteelSidingWholeR59';
import type {CanonicalEstimateCompileCoreInput,CanonicalEstimateCompileCoreResult} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {masterRetainedParentCaptureSha256R1,masterRetainedLineageValueSha256V1 as valueSha,
  prepareMasterRetainedBindingRepresentativeR1,type MasterRetainParentBindingsR1,type MasterRetainedBindingGuardInputR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {buildMasterPublicationResourceRowsR1,resolveMasterSingleDefinitionBindingRowIds,
  resolveMasterSingleDefinitionBindingApplicabilityByRowId,resolveMasterSingleDefinitionLocatorExcerptSha256R1,
  hashMasterSingleDefinitionSuccessorReceiptR1,validateIndependentCompletenessMapReferences,
  type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';

// Current source-only retained composition; no publication or new public owner.
// Exact R57 parent/source/row identities are reused. Its prior four core results
// are historical evidence, not the result counter of this changed whole gate.
const contract='gox.facade.ventilated.steel-existing-owner/r5',sourceId=steel.sourceId;
const paths={module:'src/lib/estimate/v4/facadeVentilatedSteelExistingOwnerR5.ts',
  config:'scripts/estimate/r4a13/prepareFacadeVentilatedSteelExistingOwnerR5.ts',
  test:'scripts/estimate/r4a13/facadeVentilatedSteelExistingConsumerR5.test.ts',
  capture:'data/estimate-benchmarks/fixtures/facade-ventilated-current-v6-parent-source-r5.json',
  sourceReadback:'data/estimate-benchmarks/fixtures/facade-steel-siding-current-identity-readback-r5-57.json',
  nativePack:'data/estimate-benchmarks/source-packs/facade-steel-siding-historical-06501-r2.json',
  originalOracle:'data/estimate-benchmarks/fixtures/facade-steel-siding-independent-oracle-r2.json'};
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const textList=(value:unknown,message:string):string[]=>{assert(Array.isArray(value)&&value.every(item=>typeof item==='string'),message);return[...value];};

/** Same approved predecessor and append contract used by the exact v6 Fibre
 * candidate. This never publishes the two candidates independently from v6. */
export function facadeVentilatedSteelRetainedOptionsR5(sourceRoot?:string):MasterRetainParentBindingsR1{
  const packet=captured(),c=packet.capture,model=definition(),old=facadeVentilatedThermowoodRetainedOptionsR5(sourceRoot);
  const legacy=old.legacyTemplateAssumptionSources;assert(legacy?.approvedSourceEvidence);
  assert.deepEqual(stable(packet.approvedSourceDefinition),stable(old.capturedParent.definition));
  assert.equal(legacy.approvedSourceEvidence.capturedSourceDefinition.id,old.capturedParent.baseline.source_definition_version_id);
  const metadata=c.definition.source_metadata,previous=metadata.retainedParentBindingSuccessorV1;
  assert(record(previous));assert.equal(previous.parentDefinitionId,old.capturedParent.definition.id);
  assert.equal(previous.parentBaselineId,old.capturedParent.baseline.id);assert.equal(previous.capturedParentSha256,old.capturedParentSha256);
  const oldIds=new Set(c.parameters.map(p=>p.parameter_id));
  return{capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
    capturedSourcePreimage:{sourceKey:sourceId,expected:null},
    legacyTemplateAssumptionSources:{...legacy,approvedTemplatePredecessor:{capturedParent:old.capturedParent,capturedParentSha256:old.capturedParentSha256}},
    successorProvenanceAppendV1:{contract:'master-retained-binding-append/v1',capturedSourceMetadata:structuredClone(metadata),
      capturedSourceMetadataSha256:valueSha(metadata),capturedPreviousSuccessorSha256:valueSha(previous)},
    newParameterSources:Object.fromEntries(model.parameters.filter(p=>!oldIds.has(p.parameter_id)).map(p=>[p.parameter_id,
      p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED' as const,sourceIds:[]}:
        p.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?{kind:'DERIVED' as const,sourceIds:[]}:
          {kind:'KNOWN' as const,sourceIds:[sourceId]}]))};
}

function assertCapturedSourceKeyAbsentR57(own:(path:string)=>string):void{
  const path=own(paths.sourceReadback),bytes=readFileSync(path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'922293ce786a9527d84ab0220e039d1313183bed7765ef2e51f2a700bd9d9e4c');
  const proof:unknown=JSON.parse(bytes.toString('utf8'));assert(record(proof)&&record(proof.input)&&record(proof.proof));
  assert.equal(proof.input.sourceKey,sourceId);assert.equal(proof.readOnly,true);assert.equal(proof.rolledBack,true);
  assert.equal(proof.databaseWrites,0);assert.equal(proof.sameRawRowsReadTwice,true);assert.equal(proof.timeZone,'UTC');
  const scope:unknown=proof.proof.normativeSourceExactKey;assert(record(scope));assert.equal(scope.count,0);assert.deepEqual(scope.rows,[]);
  // Other6 scopes refer to a held proposed catalog. They do NOT authorize a new
  // public identity and cannot establish the current existing facade preimage.
}

export function facadeVentilatedSteelMasterConfigR5(context:Readonly<{
  releaseId:string;searchReleaseId:string;sourceRoot?:string;outputRoot?:string;
  onCoreCall?:(count:number)=>void;onCoreResult?:(phase:string,result:unknown)=>void;
}>):Config{
  const own=(path:string)=>resolve(context.sourceRoot??'.',path),packet=captured(),c=packet.capture,model=definition(),map=completeness();
  const retained=facadeVentilatedSteelRetainedOptionsR5(context.sourceRoot),passport=packet.contentPassport,decision=passport.decision;
  assert(record(decision));const oldNeeds=textList(decision.unresolvedResourceRowIds,'STEEL_VENT_CAPTURED_NEEDS_REQUIRED');
  const included=textList(passport.included_scope_ru,'STEEL_VENT_CAPTURED_SCOPE_REQUIRED');
  const excluded=textList(passport.excluded_scope_ru,'STEEL_VENT_CAPTURED_EXCLUSIONS_REQUIRED');
  assertCapturedSourceKeyAbsentR57(own);assert.equal(sha(own(steel.source.path)),steel.source.sha256);
  assert.equal(sha(own(steel.book01.path)),steel.book01.sha256);
  for(const source of steel.additionalSources)assert.equal(sha(own(source.path)),source.sha256);
  const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_16_2026-10-24.txt';
  const masterSha256='541bc82df10231ca885288a7937283729b08484bd8301a22cd57a7b5c221eb40';assert.equal(sha(masterPath),masterSha256);
  const sourcePaths=[...Object.values(paths),steel.source.path,steel.book01.path,...steel.additionalSources.map(s=>s.path),
    'src/lib/estimate/v4/facadeSteelSidingWholeR59.ts',
    'data/estimate-benchmarks/source-packs/facade-steel-siding-current-whole-r59.json',
    'data/estimate-benchmarks/fixtures/facade-steel-siding-whole-independent-r59.json',
    'data/estimate-benchmarks/source-packs/facade-steel-siding-operation-provision-r2.json',
    'data/estimate-benchmarks/source-packs/facade-ventilated-thermowood-existing-owner-r5.json',
    'data/estimate-benchmarks/source-packs/facade-ventilated-hpl-existing-owner-r5.json',
    'data/estimate-benchmarks/fixtures/facade-ventilated-current-parent-source-r5.json',
    'data/estimate-benchmarks/fixtures/facade-ventilated-approved-template-source-r5.json',
    'src/lib/estimate/v4/facadeSteelSidingKrer15R2.ts','src/lib/estimate/v4/effectivePurchaseBalanceR1.ts',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts',
    'scripts/estimate/r4a13/prepareFacadeVentilatedThermowoodR5.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
    'src/lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1.ts',
    'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
    'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'];
  for(const path of sourcePaths)sha(own(path));
  const oldRows=new Set(c.resources.map(r=>r.row_id));
  const bindingRows=model.resources.filter(r=>!oldRows.has(r.row_id)&&r.source_metadata?.sourceRole!=='UNRESOLVED_APPLICATION_NORM').map(r=>r.row_id);
  assert.equal(bindingRows.length,43);
  const config:Config={contract,stopCode:'FACADE_VENTILATED_STEEL_R5',applicationName:'facade-ventilated-steel-existing-owner-r5',
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256,parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,
    currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
    outputRoot:context.outputRoot??'.release-runtime/r568/facade-ventilated-steel-existing-owner-r5',sourcePaths:[...new Set(sourcePaths)],
    catalogId,sourceId,normId:steel.normId,sourceMetadata:{source_title:'Вентилируемый фасад со стальным сайдингом: точный исходный метод',
      source_authority:'Кыргызская Республика;КРЕР15-2015',source_kind:'EXACT_WHOLE_KG_COLUMN_IN_CAPTURED_EXISTING_VENT_OWNER',
      official_url:steel.source.officialUrl,artifact_sha256:steel.source.sha256,exact_locator:'КРЕР15-2015;15-01-065-01;PDF118–119;100m2;ресурсные книги01/09',
      use_restriction:steel.scopeRu+';не переносит исходные нормы/ведомости иных профилей;проектные количества и физический пост отдельно;FULL0.'},
    parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,
    shortInput:structuredClone(c.baseline.input_values),acceptanceInput:structuredClone(c.baseline.input_values),
    runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[52,76,76],benchmarkOrdinal:0,
    validationScenario:'CURRENT_RETAINED_WHOLE_STEEL_13_ENTRIES_8_RESULTS_5_REJECTS_EXISTING_NVF_OWNER',
    passport:{canonicalRuName:'Монтаж вентилируемого фасада',workKey:'ventilated_facade',
      physicalResultRu:'Вентилируемый фасад по явно выбранному исходному методу;полное обеспечение отдельно не принято.',
      includedScopeRu:[...included,'Исходный целый метод облицовки стальным сайдингом с утеплением по отдельной принятой ведомости.'],
      excludedScopeRu:excluded,independentCompletenessMap:map,
      unresolvedApplicableResourceRowIds:[...oldNeeds,...facadeSteelSidingNeedsR2.map(n=>n.needId)]},
    applicability:{...structuredClone(c.definition.applicability),primaryMeasureSelectionV1:selection(),
      sourceProfilesByExplicitChoice:{...c.definition.applicability.sourceProfilesByExplicitChoice,[choice]:{
        exactSourceProfile:'historical_steel_siding_06501',territory:'KG',pinnedEdition:'КРЕР15-2015',sourceColumn:steel.normId,
        sourceSha256:steel.source.sha256,noModernFrameEquivalence:true,noLegacyQuantityOrPriceTransfer:true,
        actualApprovedProjectBOMRequired:true,normalLockedActualParentCheckRequired:true,fullTechnicalAcceptance:false}},
      retainedParentCaptureSha256:retained.capturedParentSha256,normalLockedPreflightRequired:true,fullTechnicalAcceptance:false},
    binding:{rowId:bindingRows[0]!,additionalRowIds:bindingRows.slice(1),retainParentBindings:retained,
      applicability:{contract,oneExistingCatalogOwner:true,originalParentDefinitionId:c.definition.id,fullTechnicalAcceptance:false},
      applicabilityByRowId:Object.fromEntries(bindingRows.map(row=>[row,{contract,source_artifact_sha256:steel.source.sha256,
        exact_column:steel.normId,exactSourceProfile:'historical_steel_siding_06501',automaticLegacyQuantityOrPriceTransferAllowed:false}]))},
    locator:{key:'facade-ventilated-steel-existing-owner-r5',payload:{contract,originalSteelSourcePack:steel,
      independentCompletenessMap:map,registeredSourceKey:sourceId,originalOwnerCatalogId:catalogId,
      exactParentDefinitionId:c.definition.id,fullTechnicalAcceptance:false}},
    search:{primaryUom:'m2',canonicalNameRu:'Монтаж вентилируемого фасада',
      aliases:['Облицовка фасада термодревесной доской','Облицовка фасада компактными плитами','Облицовка фасада стальным сайдингом'],
      shortScopeRu:'Сохранённый расчёт либо точный исходный способ облицовки с отдельной принятой ведомостью и незакрытыми потребностями.',
      keyDistinguishingParameters:[selector],clarificationFields:[selector],includedBoundaries:selection().selections.map(s=>s.selectorValue),
      excludedBoundaries:['Облегчённая современная подсистема не признана равной исходной.','Ведомость и оснащение не определяются площадью.','Полное обеспечение фасада не принято.'],
      extraSearchTermsRu:'вентилируемый фасад термодерево компактная плита стальной сайдинг утепление',
      sourceProvenance:{contract,exactParentDefinitionId:c.definition.id,exactSteelColumn:steel.normId,newCatalogIds:0,newFullTechnologies:0}},
    forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_FACADE_EXISTING_VENT_OWNER',receiptFileStem:'facade_ventilated_steel_existing_owner_r5',
    verifyCore:async()=>{verifyFacadeVentilatedSteelRetainedR5(config,own);assertFacadeVentilatedSteelMachineAdmissionsR5(config);
      const result=await verifyFacadeVentilatedSteelConsumersR5(config,context);return{...result,normalRetainedRepresentative:'ACTUAL_STANDARD_GUARD_NOT_PUBLISHER_OR_DB_ACCEPTANCE'};}};
  return config;
}

/** Pure existing guard, before ANY new core call. No SQL/registration/writer. */
export function verifyFacadeVentilatedSteelRetainedR5(config:Config,own:(path:string)=>string):void{
  const retained=config.binding.retainParentBindings;assert(retained);
  const uuid=(seed:string)=>{const b=Buffer.from(hashMasterSingleDefinitionSuccessorReceiptR1(seed).slice(0,32),'hex');b[6]=(b[6]!&15)|80;b[8]=(b[8]!&63)|128;
    const h=b.toString('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
  const id=uuid(`${contract}:${sourceId}:source`),locator=uuid(`${contract}:${sourceId}:${config.locator.key}:locator`),m=config.sourceMetadata;
  const input:MasterRetainedBindingGuardInputR1={config,newSource:{id,source_key:sourceId,title_ru:m.source_title,authority:m.source_authority,
    official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:m.effective_from??null,effective_to:null,
    metadata:{contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,universalProductivityClaimed:false,
      universalConsumptionClaimed:false,activationAllowed:false}},
    newLocators:[{id:locator,source_id:id,locator_key:config.locator.key,locator:config.locator.payload,
      excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
  const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),oldFormulaIds=new Set(retained.capturedParent.formulas.map(f=>f.formula_id));
  const formulas=config.formulaDefinitions.map(f=>({...f,ast_sha256:oldFormulaIds.has(f.formula_id)?f.ast_sha256:hashMasterSingleDefinitionSuccessorReceiptR1(f.ast)}));
  const applicable=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,[locator]);
  const bindings=resolveMasterSingleDefinitionBindingRowIds(config,resources,[locator]).map(row_id=>({row_id,locator_id:locator,applicability:applicable[row_id]}));
  const fingerprint=hashMasterSingleDefinitionSuccessorReceiptR1({purpose:'PURE_STEEL_EXISTING_VENT_CONFIG_STANDARD_RETAINED_REPRESENTATIVE_NOT_PUBLICATION',
    capturedParentSha256:retained.capturedParentSha256,sourceHashes:config.sourcePaths.map(path=>({path,sha256:sha(own(path))})),source:input.newSource,locators:input.newLocators});
  const result=prepareMasterRetainedBindingRepresentativeR1(input,{parameters:config.parameterDefinitions,formulas,resources,newBindings:bindings,
    successorProvenance:{contract,sourceId,normId:config.normId,parentDefinitionId:retained.capturedParent.definition.id,
      parentBaselineId:retained.capturedParent.baseline.id,capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:fingerprint},
    lifecycleMetadata:{contract,masterSha256:config.masterSha256,sourceFingerprint:fingerprint}});
  for(const[id,sources]of Object.entries(retained.capturedParent.baseline.normative_source_ids))assert.deepEqual(stable(result.normativeSourceIds[id]),stable(sources));
  assert.equal(result.expectedNormativeBindingCount,47);
}

export function assertFacadeVentilatedSteelMachineAdmissionsR5(config:Config):void{
  let count=0;
  for(const machine of steel.rows.filter(r=>r.category==='equipment'))for(const mode of ['own','hired']){
    const rowId=steel.prefix+':'+machine.key+'-'+mode,row=config.resourceDefinitions.find(r=>r.row_id===rowId);assert(row);
    const admitted=assertCanonicalMachineHourDefinitionV1({catalogId:config.catalogId,rowId,unitId:row.unit_id,sourceMetadata:row.source_metadata});
    assert(admitted,'STEEL_EXISTING_VENT_EXACT_MACHINE_CATALOG_ADMISSION_REQUIRED');
    assert.equal(admitted.resourceCode,machine.resourceCode);assert.equal(admitted.operationScope,'FULL_SOURCE_OPERATION');count++;
  }
  assert.equal(count,8);
}

function testReadback(areaM2:string):FacadeVentilatedSteelReadbackR5{
  return{sourceNormId:'15-01-065-01',sourceSha256:steel.source.sha256,netFacadeAreaM2:areaM2,
    projectDocumentSha256:'f'.repeat(64),approvedProjectReference:'TEST_ONLY synthetic whole BOM; no actual project authentication',
    projectBasis:steel.projectBasisValue,methodConformanceDeclaration:steel.sourceFitValue,
    productionConditions:'ИСХОДНЫЕ_НОРМАЛЬНЫЕ_УСЛОВИЯ_КРЕР15_ПРИНЯТЫ_ПРОЕКТОМ',
    projectBOM:{...independent.testOnlyProjectBOM},
    machineFulfilment:Object.fromEntries(steel.rows.filter(row=>row.category==='equipment').map(row=>[row.key,'hired' as const]))};
}

/** Current whole source/map/public-owner delta only. Old R57 four calls are not
 * invoked, added to this counter, or treated as current publication evidence. */
export async function verifyFacadeVentilatedSteelConsumersR5(config:Config,observer:Readonly<{
  onCoreCall?:(count:number)=>void;onCoreResult?:(phase:string,result:unknown)=>void;
}>|((phase:string,result:unknown)=>void)={},pdfIssuancePurpose:'STANDARD'|'PRELIMINARY_REVIEW'='STANDARD'):Promise<Record<string,unknown>>{
  const callbacks=typeof observer==='function'?{onCoreResult:observer}:observer;
  let pdfReviewNegativeCases=0;
  const packet=captured(),parent=packet.capture,model=definition(),child=currentChild(),map=completeness();
  const oldRows=new Set(parent.resources.map(row=>row.row_id)),oldFormulas=new Set(parent.formulas.map(row=>row.formula_id));
  assert.deepEqual(stable(model.resources.filter(row=>oldRows.has(row.row_id))),stable(parent.resources),'EXACT_OLD_76_ROWS');
  assert.deepEqual(stable(model.formulas.filter(row=>oldFormulas.has(row.formula_id))),stable(parent.formulas),'EXACT_OLD_76_FORMULAS');
  assert.equal(model.parameters.length,parent.parameters.length+child.parameters.length);
  assert.equal(model.resources.length,140);assert.equal(model.formulas.length,140);
  // The historical54 expected IDs omit11 existing purchase-owner outputs.
  // Keep every original ID and admit only the exact compiler-derived bindings.
  const expectedNative54=[
    "steel_siding_cladding_area_m2",
    "kg_project_basis",
    "source_system_conformance",
    "approved_facade_project_reference",
    "source_conditions",
    "project_dowel_screw",
    "project_levelling_bracket",
    "project_stud_profile",
    "project_expansion_dowel",
    "project_steel_siding",
    "project_insulation",
    "project_cover_strip",
    "project_starter_strip",
    "project_corner_strip",
    "machine_fulfillment_screwdriver",
    "machine_fulfillment_electric_grinding_machine",
    "machine_fulfillment_perforator",
    "machine_fulfillment_flatbed",
    "steel_unresolved_general_source_component_identity",
    "steel_unresolved_general_fire_ventilation",
    "steel_unresolved_general_anchor_tests",
    "steel_unresolved_general_access_rigging_power",
    "steel_unresolved_general_workstation_wear",
    "steel_unresolved_general_qc_services",
    "steel_unresolved_general_cleanup_logistics",
    "steel_unresolved_tool_screwdriver_bits",
    "steel_unresolved_tool_drill_anchor_bits",
    "steel_unresolved_tool_hole_brush_pump",
    "steel_unresolved_tool_nonabrasive_sheet_cutter",
    "steel_unresolved_tool_cutter_working_parts",
    "steel_unresolved_tool_insulation_knife",
    "steel_unresolved_tool_layout_instruments",
    "steel_unresolved_tool_rivet_tool",
    "steel_unresolved_tool_torque_key_heads",
    "steel_unresolved_tool_feeler01",
    "steel_unresolved_tool_survey_instruments",
    "steel_unresolved_tool_lifting_working_parts",
    "steel_unresolved_tool_storage_bearers",
    "steel_unresolved_tool_ppe",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_screwdriver_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_electric_grinding_machine_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_perforator_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_flatbed_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_dowel_screw_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_screw_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_levelling_bracket_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_stud_profile_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_expansion_dowel_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_steel_siding_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_insulation_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_weather_membrane_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_cover_strip_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_starter_strip_consumed",
    "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_corner_strip_consumed"
] as const;
  const expectedSupplyOutputs11=[
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_dowel_screw",
        "facade:steel-siding:krer15-06501:r2:dowel-screw",
        "piece"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_screw",
        "facade:steel-siding:krer15-06501:r2:screw",
        "piece"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_levelling_bracket",
        "facade:steel-siding:krer15-06501:r2:levelling-bracket",
        "piece"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_stud_profile",
        "facade:steel-siding:krer15-06501:r2:stud-profile",
        "m"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_expansion_dowel",
        "facade:steel-siding:krer15-06501:r2:expansion-dowel",
        "piece"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_steel_siding",
        "facade:steel-siding:krer15-06501:r2:steel-siding",
        "m"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_insulation",
        "facade:steel-siding:krer15-06501:r2:insulation",
        "m3"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_weather_membrane",
        "facade:steel-siding:krer15-06501:r2:weather-membrane",
        "m2"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_cover_strip",
        "facade:steel-siding:krer15-06501:r2:cover-strip",
        "m"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_starter_strip",
        "facade:steel-siding:krer15-06501:r2:starter-strip",
        "m"
    ],
    [
        "effective_resource_quantity_facade_steel_siding_krer15_06501_r2_corner_strip",
        "facade:steel-siding:krer15-06501:r2:corner-strip",
        "m"
    ]
] as const;
  assert.equal(expectedNative54.length,54);assert.equal(expectedSupplyOutputs11.length,11);
  const expectedChildIds=[...expectedNative54,...expectedSupplyOutputs11.map(([id])=>id)];
  assert.equal(new Set(expectedChildIds).size,65);
  assert.equal(new Set(child.parameters.map(p=>p.parameter_id)).size,65);
  assert.deepEqual(child.parameters.map(p=>p.parameter_id).sort(),[...expectedChildIds].sort(),'EXACT_NATIVE54_AND_DERIVED_SUPPLY11');
  for(const [parameterId,sourceRowId,unitId] of expectedSupplyOutputs11){
    const parameter=child.parameters.find(p=>p.parameter_id===parameterId);assert(parameter);
    assert.equal(parameter.value_type,'decimal');assert.equal(parameter.unit_id,unitId);
    assert.equal(parameter.required,false);assert.equal(parameter.default_value,null);
    assert.equal(parameter.truth_metadata.visibility_role,'INTERNAL_ONLY');
    assert.equal(parameter.truth_metadata.value_source_role,'COMPILER_DERIVED_RESOURCE_QUANTITY');
    assert.equal(parameter.truth_metadata.hidden_default_forbidden,true);
    assert.deepEqual(parameter.truth_metadata.effective_resource_quantity_v1,{sourceRowId,unitId});
    assert(record(parameter.truth_metadata.guide));
    assert.equal(parameter.truth_metadata.guide.source_document,steel.sourceId);
    assert.equal(parameter.truth_metadata.guide.source_snapshot_hash,steel.source.sha256);
    assert(!child.ordinaryParameterIds.includes(parameterId),'DERIVED_SUPPLY_OUTPUT_IS_NOT_A_QUESTION');
    const owners=child.resources.filter(r=>record(r.resource_graph?.effectiveQuantityOutputV1)
      &&r.resource_graph.effectiveQuantityOutputV1.parameterId===parameterId);
    assert.equal(owners.length,1);const owner=owners[0];assert(owner);
    assert.equal(owner.row_id,sourceRowId);assert.equal(owner.unit_id,unitId);
    assert.equal(owner.resource_graph?.costTreatment,'OWN_COST');
    assert.deepEqual(owner.resource_graph?.effectiveQuantityOutputV1,{parameterId,unitId});
    assert(record(owner.resource_graph?.purchaseBalanceV1));
    assert.equal(owner.resource_graph.purchaseBalanceV1.unitId,unitId);
    assert.equal(owner.source_metadata?.purchase_order_admission,true);
    const consumedRowId=sourceRowId+'-consumed';
    const consumed=child.resources.find(r=>r.row_id===consumedRowId);assert(consumed);
    assert.equal(consumed.unit_id,unitId);
    assert.equal(consumed.resource_graph?.costTreatment,'INFORMATIONAL_SCOPE');
    assert.equal(consumed.resource_graph?.purchaseBalanceOwnerRowId,sourceRowId);
    assert.equal(consumed.source_metadata?.resourceCode,owner.source_metadata?.resourceCode);
    assert.equal(child.resources.filter(r=>r.source_metadata?.baseUnitMaterialSupplyOwner===true
      &&r.source_metadata?.resourceCode===owner.source_metadata?.resourceCode).length,1);
    const sourceEntries=map.entries.filter(entry=>record(entry)&&record(entry.resolution)
      &&entry.resolution.kind==='ROW'&&entry.resolution.rowId===consumedRowId);
    assert.equal(sourceEntries.length,1);const sourceEntry=sourceEntries[0];assert(record(sourceEntry));
    assert.equal(sourceEntry.expectedResourceId,steel.normId+':'+sourceRowId.slice(steel.prefix.length+1));
    assert.equal(sourceEntry.sourceId,steel.sourceId);assert.equal(sourceEntry.unitId,unitId);
  }
  const oldParameters=new Set(parent.parameters.map(p=>p.parameter_id));
  assert.deepEqual(model.ordinaryParameterIds.filter(id=>!oldParameters.has(id)),[area],'ONLY_ONE_NEW_MEASURED_PUBLIC_PARAMETER');
  for(const old of parent.parameters){
    const next=model.parameters.find(p=>p.parameter_id===old.parameter_id);assert(next);
    if(old.parameter_id===selector){
      const values=old.constraints_json?.values;assert(Array.isArray(values));
      assert.deepEqual(next.constraints_json?.values,[...values,choice]);continue;
    }
    const withoutConsumers=(p:typeof old)=>{const{formula_consumers:_f,resource_branch_consumers:_r,...truth}=p.truth_metadata;return{...p,truth_metadata:truth};};
    assert.deepEqual(stable(withoutConsumers(next)),stable(withoutConsumers(old)),'RETAIN_OLD_PARAMETER_TRUTH:'+old.parameter_id);
  }
  assert.deepEqual(model.formulas.slice(76),child.formulas,'EXACT_CHILD_NUMERICAL_FORMULAS');
  assert.equal(independent.generatedFromImplementation,false);assert.equal(oracle.sourcePackGeneratedFromImplementation,false);
  assert.deepEqual(oracle.cases,independent.sourceRawCases,'SAME_THREE_INDEPENDENT_LITERAL_SOURCE_CASES');
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
  // Reference checking only: the runtime Config retains one unified map.
  // This projects its11 physical material expectations onto their existing
  // sole order owners; it is not a second source oracle or persisted map.
  const materialOwnerReferences=expectedSupplyOutputs11.map(([,sourceRowId])=>{
    const entry=map.entries.find(e=>record(e)&&record(e.resolution)&&e.resolution.rowId===sourceRowId+'-consumed');
    assert(record(entry));const owner=child.resources.find(r=>r.row_id===sourceRowId);assert(owner);
    return{...entry,formulaId:owner.formula_id,resolution:{kind:'ROW',rowId:sourceRowId}};
  });
  assert.equal(materialOwnerReferences.length,11);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:{...map,entries:materialOwnerReferences},
    formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
  assert.equal(map.entries.length,84);assert.equal(config.passport.unresolvedApplicableResourceRowIds?.length,46);
  assert.equal(config.catalogId,'canonical-work:expanded:ventilated_facade');assert.equal(config.sourceId,steel.sourceId);
  assert.equal(config.normId,'15-01-065-01');assert.equal(config.catalogAppend,undefined);
  assert.deepEqual(config.runtimeProfileInput,{});assert.equal(selection().selections.length,4);
  let coreCalls=0,savedResults=0,coreRejects=0,preCoreRejects=0;
  const call=async(phase:string,amount:string,options:Parameters<typeof compile>[1]={})=>{
    coreCalls++;callbacks.onCoreCall?.(coreCalls);
    try{const result=await compile({[selector]:choice,[area]:amount},{...options,
      hashJson:value=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(value))});
      savedResults++;callbacks.onCoreResult?.(phase,result);return result;
    }catch(error){coreRejects++;callbacks.onCoreResult?.(phase,{expectedReject:phase.includes('reject'),
      code:error!==null&&typeof error==='object'&&'code'in error?error.code:null,
      message:error instanceof Error?error.message:null});throw error;}
  };
  const rid=(key:string)=>steel.prefix+':'+key;
  const row=(r:CanonicalEstimateCompileCoreResult,key:string)=>{const found=r.rows.find(row=>row.row_id===rid(key));assert(found,key);return found;};
  const quantity=(r:CanonicalEstimateCompileCoreResult,key:string,value:string)=>assert.equal(cmp(row(r,key).quantity,value),0,key);
  const protectedNeeds=(r:CanonicalEstimateCompileCoreResult,exact=true)=>{
    for(const need of independent.protectedNeeds)assert(r.preliminaryNeeds.some(n=>n.row_id===need.rowId&&n.quantity===null),'PROTECTED:'+need.rowId);
    if(exact)assert.equal(r.preliminaryNeeds.length,21);
  };
  const whole=(r:CanonicalEstimateCompileCoreResult,index:number)=>{
    const sample=independent.sourceRawCases[index];assert(sample);
    for(const[key,value]of Object.entries(sample.raw))quantity(r,key+(key==='labour'?'':'-consumed'),value);
    for(const owner of independent.materialOwners)if(owner.projectQuantityKey){
      const expected=(independent.testOnlyProjectBOM as Record<string,string>)[owner.projectQuantityKey];assert(expected);
      quantity(r,owner.owner,expected);if(owner.literalP)quantity(r,owner.consumed,expected);
    }
    for(const[key,name]of Object.entries(independent.publicResourceNames)){
      const found=r.rows.find(r=>r.row_id===rid(key));if(found)assert.equal(canonicalArtifactVisibleRowTitle(found,r.parameters),name,'CURRENT_FUNCTIONAL_PUBLIC_NAME:'+key);
    }
    protectedNeeds(r);assert(!r.rows.some(r=>r.row_id===rid('operators')||r.row_id===rid('operators-consumed')));
  };
  const ordinary=await call('actual-core-01-ordinary-no-project','100');
  assert.equal(ordinary.rows.length,0);assert.equal(ordinary.preliminaryNeeds.length,64);protectedNeeds(ordinary,false);
  assert.equal(cmp(ordinary.totals.amount,'0'),0);
  const full=await call('actual-core-02-whole100','100',{readback:testReadback('100')});whole(full,0);
  const fractional=await call('actual-core-03-fractional12_5','12.5',{readback:testReadback('12.5')});whole(fractional,1);quantity(fractional,'screw','115');
  const doubled=await call('actual-core-04-area200-same-actual-bom','200',{readback:testReadback('200')});whole(doubled,2);
  for(const material of independent.materialOwners)if(material.projectQuantityKey)
    assert.equal(cmp(row(full,material.owner).quantity,row(doubled,material.owner).quantity),0,'ACTUAL_BOM_NOT_AREA_RATE:'+material.key);
  for(const result of[ordinary,full,fractional,doubled])assert(result.rows.every(r=>r.unit_price===null));
  const prices=(mode:'own'|'hired'):NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']>=>{
    const overrides:NonNullable<CanonicalEstimateCompileCoreInput['rowOverrides']>={
      [rid('labour')]:{unitPrice:independent.testOnlyLabourUnitPrice,provenance:{kind:'manual',reason:'TEST_ONLY independent price'}}};
    for(const material of independent.materialOwners){
      overrides[rid(material.owner)]={unitPrice:material.unitPrice,provenance:{kind:'manual',reason:'TEST_ONLY whole supply price'}};
      overrides[rid(material.consumed)]={unitPrice:material.unitPrice,includedInEstimate:true,includedInProcurement:true,
        provenance:{kind:'manual',reason:'TEST_ONLY raw reference cannot create another payment or order'}};
    }
    for(const machine of independent.machineOwners){const id=rid(machine[mode]);
      overrides[id]={unitPrice:machine.unitPrice,machineHourPriceCoverageV1:canonicalManualMachineHourPriceCoverageV1({
        rowId:id,unitPrice:machine.unitPrice,currencyCode:'KGS'}),provenance:{kind:'manual',reason:'consumer_estimate_row_batch_edit'}};}
    return overrides;
  };
  const hired=await call('actual-core-05-hired-priced','100',{readback:testReadback('100'),rowOverrides:prices('hired')});whole(hired,0);
  const ownReadback={...testReadback('100'),machineFulfilment:Object.fromEntries(steel.rows.filter(r=>r.category==='equipment').map(r=>[r.key,'own' as const]))};
  const own=await call('actual-core-06-own-priced','100',{readback:ownReadback,rowOverrides:prices('own')});whole(own,0);
  for(const[result,mode]of[[hired,'hired'],[own,'own']] as const){
    assert.equal(cmp(result.totals.amount,independent.expectedPricedAmounts.total),0);
    assert.equal(result.rows.filter(r=>r.included_in_estimate).length,16);
    assert.equal(result.rows.filter(r=>r.included_in_procurement).length,mode==='hired'?15:11);
    for(const material of independent.materialOwners){
      const raw=row(result,material.consumed),paid=row(result,material.owner);
      assert.equal(raw.included_in_estimate,false);assert.equal(raw.included_in_procurement,false);
      assert(raw.unit_price!==null,'KNOWN_REFERENCE_PRICE_REQUIRED:'+material.key);assert(paid.amount!==null,'KNOWN_PAID_MATERIAL_AMOUNT_REQUIRED:'+material.key);
      assert.equal(cmp(raw.unit_price,material.unitPrice),0);assert.equal(paid.included_in_estimate,true);assert.equal(paid.included_in_procurement,true);
      assert.equal(cmp(paid.amount,material.amount),0);assert.equal(result.rows.filter(r=>r.row_id===paid.row_id).length,1);
    }
    for(const machine of independent.machineOwners){
      const raw=row(result,machine.consumed),paid=row(result,machine[mode]);
      assert.equal(raw.included_in_estimate,false);assert.equal(raw.included_in_procurement,false);
      assert(paid.amount!==null,'KNOWN_PAID_MACHINE_AMOUNT_REQUIRED:'+machine.key);
      assert.equal(cmp(raw.quantity,paid.quantity),0);assert.equal(cmp(paid.amount,machine.amount),0);
      assert.equal(canonicalMachineHourRowPriceDecisionV1(paid,catalogId)?.status,'CONFIRMED_MANUAL');
      assert.equal(result.rows.filter(r=>[rid(machine.own),rid(machine.hired)].includes(r.row_id)).length,1);
    }
    const rawBefore=JSON.stringify(result),revision={id:'TEST_ONLY_EXISTING_NVF_STEEL_'+mode,release_id:'TEST_ONLY_NOT_SAVED',
      catalog_id:catalogId,checksum_sha256:'0'.repeat(64),row_count:result.rows.length,currency_code:'KGS',input_parameters:result.parameters,
      amendment_contract:{parameterSources:{preliminaryNeeds:result.preliminaryNeeds}}};
    // Source-fragment reports exercise readability only, with real unchanged Core outputs.
    // No saved passport/source authority is fabricated; normal Config supplies STANDARD.
    const reportRevision=pdfIssuancePurpose==='PRELIMINARY_REVIEW'?{...revision,
      definition_version_id:'TEST_ONLY_UNPUBLISHED_STEEL_SOURCE_FRAGMENT',
      checksum_sha256:valueSha({contract:'TEST_ONLY_UNSAVED_SOURCE_FRAGMENT_SNAPSHOT/r1',
        parameters:result.parameters,rows:result.rows,preliminaryNeeds:result.preliminaryNeeds})}:revision;
    const reportNeeds=canonicalArtifactPreliminaryNeeds(reportRevision,{issuancePurpose:pdfIssuancePurpose});
    const reportResources=[...result.rows,...reportNeeds];
    const reportInput={revision:reportRevision,rows:result.rows,preliminaryNeeds:reportNeeds,
      workTitleRu:"Монтаж вентилируемого фасада",issuancePurpose:pdfIssuancePurpose};
    const reviewAck=pdfIssuancePurpose==='PRELIMINARY_REVIEW'?canonicalProfessionalPdfReviewAcknowledgmentV1({
      revision:reportRevision,resources:reportResources,
      request:{acknowledgedPreliminaryReview:true,revisionId:reportRevision.id,releaseId:reportRevision.release_id,
        definitionVersionId:'TEST_ONLY_UNPUBLISHED_STEEL_SOURCE_FRAGMENT',checksumSha256:reportRevision.checksum_sha256},
      actorUserId:'TEST_ONLY_SOURCE_FRAGMENT_UNIT_ACTOR',acknowledgedAt:'2026-10-30T00:00:00.000Z'}):undefined;
    if(pdfIssuancePurpose==='PRELIMINARY_REVIEW'){
      assert(reviewAck);
      const originalAudit=canonicalProfessionalPdfReportOriginalAuditV1({revision:reportRevision,resources:reportResources});
      assert.equal(originalAudit.pdfAllowed,false);assert.equal(originalAudit.definitionAdmissionAllowed,false);
      assert.equal(originalAudit.completeClaimAllowed,false);
      assert.equal(originalAudit.issues.filter(issue=>issue.code==='RESOURCE_UNIT_UNRESOLVED').length,7);
      assert(originalAudit.issues.some(issue=>issue.code==='INDEPENDENT_OPERATION_COMPOSITION_UNVERIFIED'));
      assert.throws(()=>buildCanonicalProfessionalPdfProjection(reportInput),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
      pdfReviewNegativeCases++;
      assert.throws(()=>buildCanonicalProfessionalPdfProjection({...reportInput,
        reviewAcknowledgmentV1:{...reviewAck,checksumSha256:'0'.repeat(64)}}),{code:'ARTIFACT_REVIEW_ACKNOWLEDGMENT_INVALID'});
      pdfReviewNegativeCases++;
    }
    const projection=buildCanonicalProfessionalPdfProjection({...reportInput,reviewAcknowledgmentV1:reviewAck});
    if(pdfIssuancePurpose==='PRELIMINARY_REVIEW'){
      assert(projection.html.includes('saved-report-warnings'));
      assert(projection.html.includes('composition-acceptance'));
    }
    assertCanonicalProfessionalPdfMoneyCells(projection.html);assert.equal(projection.pricedRowCount,16);assert.equal(projection.preliminaryNeedCount,21);
    for(const material of independent.materialOwners){
      const name=escapeCanonicalArtifactHtml((independent.publicResourceNames as Record<string,string>)[material.owner]!);
      const matching=[...projection.html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gu)].filter(match=>match[1]?.includes('<strong>'+name+'</strong>'));
      const cells=matching.map(match=>[...match[1]!.matchAll(/<td class="money">(.*?)<\/td>/gu)].map(cell=>cell[1]));
      const price=canonicalArtifactMoney(material.unitPrice,'KGS');
      assert.equal(cells.filter(c=>c[0]===price&&c[1]===canonicalArtifactMoney(material.amount,'KGS')).length,1,'ONE_PUBLIC_PAID_OWNER:'+material.key);
      assert(cells.some(c=>c[0]===price&&c[1]===''),'REFERENCE_PRICE_WITH_BLANK_AMOUNT:'+material.key);
      assert(cells.every(c=>c[0]===price),'SAME_REFERENCE_PRICE_AT_EVERY_OPERATION:'+material.key);
    }
    for(const[key,value]of[['work',independent.expectedPricedAmounts.labour],['equipment',independent.expectedPricedAmounts.equipment],['material',independent.expectedPricedAmounts.material]] as const)
      assert.equal(cmp(String(projection.categoryTotals[key]),value),0);
    assert.equal(JSON.stringify(result),rawBefore,'EXISTING_PUBLIC_PROJECTOR_DOES_NOT_MUTATE_RAW');
  }
  const partialBom={...independent.testOnlyProjectBOM} as Record<string,string>;delete partialBom.project_steel_siding;
  const partial=await call('actual-core-07-partial-actual-bom','100',{readback:{...testReadback('100'),projectBOM:partialBom}});protectedNeeds(partial,false);
  for(const key of['steel-siding','steel-siding-consumed']){
    assert(!partial.rows.some(item=>item.row_id===rid(key)),'NO_UNRESOLVED_BOM_IN_PAID_COMPILED_ROWS:'+key);
    const need=partial.preliminaryNeeds.find(item=>item.row_id===rid(key));assert(need,'VISIBLE_MISSING_ACTUAL_BOM:'+key);
    assert.equal(need.quantity,null);assert.equal(need.unit_price,null);}
  const zero=await call('actual-core-08-zero-scope','0');
  assert.equal(zero.rows.length,0);assert.equal(zero.preliminaryNeeds.length,0);assert.equal(cmp(zero.totals.amount,'0'),0);
  const preReject=(phase:string,fn:()=>unknown,code:string)=>{
    let observed:unknown;try{fn();}catch(error){observed=error;}
    assert(observed!==null&&typeof observed==='object'&&'code'in observed&&observed.code===code,phase);
    preCoreRejects++;callbacks.onCoreResult?.(phase,{expectedReject:true,beforeCore:true,code});
  };
  preReject('precore-reject-09-technical-questionnaire',()=>compile({[selector]:choice,[area]:'100',project_steel_siding:'460'}),'PARAMETER_VALIDATION_FAILED');
  preReject('precore-reject-10-old-primary',()=>compile({[selector]:choice,[area]:'100'},{parentPrimaryMeasure:{parameterId:'ventilated_hpl_net_area_m2',unitId:'m2'}}),'PRIMARY_MEASURE_NEW_ROOT_REQUIRED');
  preReject('precore-reject-11-wrong-source',()=>compile({[selector]:choice,[area]:'100'},{readback:{...testReadback('100'),sourceSha256:'0'.repeat(64)}}),'PARAMETER_VALIDATION_FAILED');
  preReject('precore-reject-12-cross-object-geometry',()=>compile({[selector]:choice,[area]:'100'},{readback:testReadback('200')}),'PARAMETER_VALIDATION_FAILED');
  await assert.rejects(()=>call('actual-core-09-reject-unresolved-quantity-edit','100',{readback:testReadback('100'),rowOverrides:{
    [independent.protectedNeeds[0]!.rowId]:{quantity:'0'}}}),{code:'ROW_AMENDMENT_INVALID'});
  assert.equal(coreCalls,9);assert.equal(savedResults,8);assert.equal(coreRejects,1);assert.equal(preCoreRejects,4);
  return{status:'FINITE_EXISTING_NVF_CURRENT_STEEL_COMPOSITION_NOT_PUBLICATION',logicalEntries:13,coreCalls,
    canonicalResults:savedResults,expectedRejects:5,preCoreRejects,coreRejects,oldAcceptedR57CallsReusedAsCurrent:0,
    oldRows:76,oldFormulas:76,oldBindings:4,newNativeRows:64,definitionParameters:model.parameters.length,childParameters:child.parameters.length,
    independentMapEntries:84,selectedSourceMapEntries:53,definitionWideNeeds:46,selectedPhysicalNeeds:21,
    actualNeedClosures:0,actualAuthenticatedProjectObjects:0,newCatalogIds:0,newSourceIds:0,newNorms:0,newAliases:0,
    paidOwners:16,hiredProcurementOwners:15,ownProcurementOwners:11,testOnlyTotal:'11473.12',
    newPublicGeometryQuestions:1,actualProjectBOMFields:9,sourceRows:16,sourceOperations:8,
    sharedPdfProjectionCases:2,materialReferencePriceChecks:22,publicInformationalAmountsBlank:true,
    pdfIssuancePurpose,pdfReviewNegativeCases,
    oldSourceTruthRetained:true,noAreaInferredStructuralCounts:true,noUnprintedOperatorHours:true,
    normalLockedPGPublisher:'UNRUN_ROOT_ONLY',API:'UNRUN',UI:'UNRUN',databaseWrites:0,fullTechnicalAcceptance:false,newFULL:0};
}
