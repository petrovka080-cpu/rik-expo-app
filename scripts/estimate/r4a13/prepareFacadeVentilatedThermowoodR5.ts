import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import source from '../../../data/estimate-benchmarks/source-packs/facade-ventilated-thermowood-existing-owner-r5.json';
import approved from '../../../data/estimate-benchmarks/fixtures/facade-ventilated-approved-template-source-r5.json';
import boardSource from '../../../data/estimate-benchmarks/source-packs/facade-board-source-fixing-r3.json';
import endSource from '../../../data/estimate-benchmarks/source-packs/facade-timber-end-protection-r5.json';
import {
  facadeVentilatedThermowoodCapturedParentR5 as captured,facadeVentilatedOriginalDefinitionR5 as original,
  facadeVentilatedThermowoodDefinitionR5 as definition,facadeVentilatedThermowoodCompletenessR5 as completeness,
  compileFacadeVentilatedThermowoodR5 as compile,facadeVentilatedThermowoodPrimarySelectionR5 as primary,
  facadeVentilatedThermowoodSourceIdR5 as sourceId,facadeVentilatedThermowoodSelectorR5 as selector,
  facadeVentilatedThermowoodAreaR5 as area,facadeVentilatedThermowoodLegacyR5 as legacy,
  facadeVentilatedThermowoodChoiceR5 as choice,type FacadeVentilatedThermowoodReadbackR5,
} from '../../../src/lib/estimate/v4/masterFacadeVentilatedThermowoodR5';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {compareFormulaGraphDecimals as cmp} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {
  masterRetainedParentCaptureSha256R1,prepareMasterRetainedBindingRepresentativeR1,
  type MasterRetainParentBindingsR1,type MasterRetainedParentCaptureR1,type MasterRetainedBindingGuardInputR1,
} from './masterSingleDefinitionRetainParentBindingsR1';
import {
  validateIndependentCompletenessMapReferences,buildMasterPublicationResourceRowsR1,
  resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId,
  resolveMasterSingleDefinitionLocatorExcerptSha256R1,hashMasterSingleDefinitionSuccessorReceiptR1,
  type MasterSingleDefinitionSuccessorConfig as Config,
} from './prepareMasterSingleDefinitionSuccessorR1';

const ownPaths={pack:'data/estimate-benchmarks/source-packs/facade-ventilated-thermowood-existing-owner-r5.json',
  capture:'data/estimate-benchmarks/fixtures/facade-ventilated-current-parent-source-r5.json',
  approved:'data/estimate-benchmarks/fixtures/facade-ventilated-approved-template-source-r5.json',
  module:'src/lib/estimate/v4/masterFacadeVentilatedThermowoodR5.ts',
  config:'scripts/estimate/r4a13/prepareFacadeVentilatedThermowoodR5.ts',
  test:'scripts/estimate/r4a13/facadeVentilatedThermowoodCurrentConsumerR5.test.ts',
  captureBridgeTest:'scripts/estimate/r4a13/facadeVentilatedRetainedCaptureBridgeR5.test.ts'};
const capturedSourceFileSha256='cb1f977624b248f370f8e89266b6a8cc6b01ace44421e56839933a4bdc3b5eb3';
type FacadeVentilatedSourcePacketR5=Readonly<{
  readOnly:true;databaseWrites:0;sameRawFullRowsReadTwice:true;
  currentParents:readonly Readonly<{catalogId:string;capture:MasterRetainedParentCaptureR1;contentPassport:Record<string,unknown>}>[];
}>;
const sha=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const same=(a:unknown,b:unknown)=>assert.deepEqual(stable(a),stable(b));
const boardPrefix='facade:board-fixing:r3:thermowood-horizontal-tg';
const endPrefix='facade:timber-end-protection:r5',scopePrefix='facade:ventilated-thermowood:existing-owner:r5';
const baselineInput=():Record<string,unknown>=>structuredClone(captured().capture.baseline as {input_values:Record<string,unknown>}).input_values;

export function facadeVentilatedThermowoodRetainedOptionsR5(sourceRoot?:string):MasterRetainParentBindingsR1 {
  // Exact immutable source packet, like the existing beam Config. Hash the same
  // bytes that are parsed; the ordinary retained guard remains the authority.
  const bytes=readFileSync(resolve(sourceRoot??'.',ownPaths.capture));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),capturedSourceFileSha256,'VENTILATED_R5_CAPTURE_SOURCE_SHA256');
  const packet:FacadeVentilatedSourcePacketR5=JSON.parse(bytes.toString('utf8'));
  assert.equal(packet.readOnly,true);assert.equal(packet.databaseWrites,0);assert.equal(packet.sameRawFullRowsReadTwice,true);
  assert.equal(packet.currentParents.length,1);
  const parent=packet.currentParents[0];assert(parent);assert.equal(parent.catalogId,source.catalogId);
  const validated=captured();
  assert.deepEqual(parent.capture,validated.capture);assert.deepEqual(parent.contentPassport,validated.contentPassport);
  const c=parent.capture,next=definition();
  assert.equal(approved.contract,'master-retained-approved-template-source-evidence/v1');
  assert.equal(digest(approved.capturedSourceDefinition),approved.capturedSourceDefinitionSha256);
  const oldIds=new Set(c.parameters.map(p=>p.parameter_id));
  return {capturedParent:c,capturedParentSha256:masterRetainedParentCaptureSha256R1(c),
    capturedSourcePreimage:{sourceKey:sourceId,expected:null},
    legacyTemplateAssumptionSources:{contract:'master-retained-legacy-template-assumptions/r1',
      templateId:String(c.definition.source_metadata.templateId),parameterSources:structuredClone(c.baseline.normative_source_ids),
      approvedSourceEvidence:{contract:'master-retained-approved-template-source-evidence/v1',
        capturedSourceDefinition:structuredClone(approved.capturedSourceDefinition),
        capturedSourceDefinitionSha256:approved.capturedSourceDefinitionSha256}},
    newParameterSources:Object.fromEntries(next.parameters.filter(p=>!oldIds.has(p.parameter_id)).map(p=>[p.parameter_id,
      p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:
        p.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?{kind:'DERIVED',sourceIds:[]}:
          {kind:'KNOWN',sourceIds:[sourceId]}]))};
}

/** Existing source scheme only: no new publisher/client/registered catalog. */
export function facadeVentilatedThermowoodMasterConfigR5(context:{releaseId:string;searchReleaseId:string;sourceRoot?:string;outputRoot?:string}):Config {
  const own=(path:string)=>resolve(context.sourceRoot??'.',path),c=captured().capture,next=definition(),map=completeness();
  const retained=facadeVentilatedThermowoodRetainedOptionsR5(context.sourceRoot);
  const masterPath='C:/Users/User/Downloads/GOX_BUILD_MASTER_TZ_2_14_2026-10-23.txt';
  const masterSha256='e24f52197dab5a1bb4bbca8d139b5b6a5c722efce6c758b3efffd6266f1d78ed';
  assert.equal(sha(masterPath),masterSha256);
  for(const doc of [...source.captures,...source.reusedSourcePackPins,...source.retainedPrimarySourceMetadata])
    assert.equal(sha(own(doc.path)),doc.sha256,'VENTILATED_R5_EXACT_REUSED_SOURCE_BYTES');
  const sourcePaths=[...Object.values(ownPaths),...source.reusedSourcePackPins.map(d=>d.path),
    ...source.retainedPrimarySourceMetadata.map(d=>d.path),
    'src/lib/estimate/v4/facadeBoardSourceFixingR3.ts','src/lib/estimate/v4/facadeTimberEndProtectionWholeR5.ts',
    'src/lib/estimate/v4/automaticConstructionOwnerR1.ts','src/lib/estimate/v4/optionalAutomaticOwnerCompositionR1.ts',
    'src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts',
    'scripts/estimate/r4a13/masterSingleDefinitionRetainParentBindingsR1.ts',
    'scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1.ts'];
  for(const path of sourcePaths)sha(own(path));
  const bindingRows=[boardPrefix+':screws',endPrefix+':sealer-minimum'];
  const needs=[scopePrefix+':need:board-supply',...boardSource.profiles[0]!.needs.map(n=>boardPrefix+':need:'+n.key),
    ...endSource.needs.map(n=>endPrefix+':need:'+n.key)];
  const config:Config={contract:source.contract,stopCode:'FACADE_VENTILATED_THERMOWOOD_R5',applicationName:'facade-ventilated-thermowood-r5',
    expectedBranch:'codex/r4-a5-clean-08b18902',masterPath,masterSha256,parentReleaseId:context.releaseId,parentSearchReleaseId:context.searchReleaseId,
    currentReleasePath:'data/estimate-benchmarks/r568-local-developer-canonical-release.json',
    outputRoot:context.outputRoot??'.release-runtime/r568/facade-ventilated-thermowood-r5',sourcePaths:[...new Set(sourcePaths)],
    catalogId:source.catalogId,sourceId,normId:'EXACT_EXISTING_THERMOWOOD_FIXINGS_AND_SINGLE_COAT_NET_END_METHOD',
    sourceMetadata:{source_title:'Облицовка фасада термодревесной доской: крепление и защита торцов',
      source_authority:'Точные первичные документы исходных методов и сохранённый исторический владелец; проектные ведомости принимаются отдельно.',
      source_kind:'COMPOSITE_WHOLE_PRIMARY_METHODS_AND_EXACT_RETAINED_OWNER',
      official_url:endSource.sources[0]!.url,artifact_sha256:sha(own(ownPaths.pack)),
      exact_locator:'Original cladding2022 PDF36;endgrain TDS2022-10-11rev3 PDF2;SDS2025-11-21;exact approved source capture5/45/45',
      use_restriction:'Только исходная термодревесина, деревянная подсистема и принятое совместимое крепление/состав. Площадь не задаёт раскрой, труд и поставку. Международная исходная область сохраняется; FULL0.'},
    parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,
    shortInput:{...baselineInput(),[selector]:legacy},acceptanceInput:{...baselineInput(),[selector]:legacy},
    runtimeProfileInput:{},runtimeProfileClassification:{},runtimeProfileSourceIds:{},expectedParentShape:[5,45,45],benchmarkOrdinal:0,
    validationScenario:'TWO_INDEPENDENT_OLD45_REPLAYS_AND_THREE_ORDINARY_SOURCE_PROFILE_SCENARIOS',
    passport:{canonicalRuName:'Монтаж вентилируемого фасада',workKey:'ventilated_facade',
      physicalResultRu:'Сохранённый предварительный расчёт либо точная термодревесная облицовка с отдельным источниковым раскроем.',
      includedScopeRu:['Прежние45строк только в сохранённом профиле.','Крепление по принятой поэлементной схеме и исходный минимум защиты фактических торцов.'],
      excludedScopeRu:['Неизвестные поставка, труд, инструмент и полный цикл остаются потребностями; нормы из площади не выдумываются.'],
      independentCompletenessMap:map,unresolvedApplicableResourceRowIds:needs},
    applicability:{legacyApplicability:structuredClone((c.definition as Record<string,unknown>).applicability),
      primaryMeasureSelectionV1:primary(),sourceProfilesByExplicitChoice:{[legacy]:{originalDefinitionId:source.currentDefinitionId},
        [choice]:{exactSourceProfile:'thermowood-horizontal-tg',sameAcceptedGeometryAndPieceLayoutRequired:true,legacyQuantityOrPriceTransfer:false}},
      retainedParentCaptureSha256:retained.capturedParentSha256,normalLockedPreflightRequired:true,fullTechnicalAcceptance:false},
    binding:{rowId:bindingRows[0]!,additionalRowIds:bindingRows.slice(1),retainParentBindings:retained,
      applicability:{contract:source.contract,oneExistingCatalogOwner:true,originalParentDefinitionId:source.currentDefinitionId,fullTechnicalAcceptance:false},
      applicabilityByRowId:Object.fromEntries(bindingRows.map(id=>[id,{contract:source.contract,
        source_artifact_sha256:id===bindingRows[0]?boardSource.profiles[0]!.source.sha256:endSource.sources[0]!.sha256,
        exactSourceProfile:'thermowood-horizontal-tg',automaticLegacyQuantityOrPriceTransferAllowed:false}]))},
    locator:{key:'facade-ventilated-thermowood-existing-owner-r5',payload:{contract:source.contract,sourcePack:source,
      independentCompletenessMap:map,registeredCompositeSourceKey:sourceId,logicalSourceMemberIdentities:source.sourceIds,
      logicalMembersRegisteredByThisFactory:false,originalLegacyLogicalSourceNotPhysicalNorm:true,fullTechnicalAcceptance:false}},
    search:{primaryUom:'m2',canonicalNameRu:'Монтаж вентилируемого фасада',aliases:['Облицовка фасада термодревесной доской'],
      shortScopeRu:'Сохранённый расчёт либо исходный термодревесный профиль с отдельной принятой ведомостью и видимым неполным обеспечением.',
      keyDistinguishingParameters:[selector],clarificationFields:[selector],includedBoundaries:[choice],
      excludedBoundaries:['Проектная ведомость не получается из площади.','Старые справочные нормы не переходят в новый профиль.','Потребности полного фасада не объявлены закрытыми.'],
      extraSearchTermsRu:'вентилируемый фасад термодревесная доска крепление защита торцов',
      sourceProvenance:{contract:source.contract,originalParentDefinitionId:source.currentDefinitionId,newCatalogIds:0,newFullTechnologies:0}},
    forbiddenAdjacentMatchers:[],owner:'ROOT_SINGLE_INTEGRATOR_FACADE_NEXT_VERSION',receiptFileStem:'facade_ventilated_thermowood_r5',
    verifyCore:async()=>{const consumers=await verifyFacadeVentilatedThermowoodConsumersR5();verifyRetainedRepresentative(config,own);
      return {...consumers,standardRetainedRepresentative:'CHECKED_NOT_PUBLICATION_OR_DB_ACCEPTANCE'};}};
  return config;
}

/** Same normal registry identities/representative assembly as the sole publisher. */
function verifyRetainedRepresentative(config:Config,own:(path:string)=>string):void {
  const retained=config.binding.retainParentBindings;
  assert(retained);
  const uuid=(seed:string)=>{const b=Buffer.from(hashMasterSingleDefinitionSuccessorReceiptR1(seed).slice(0,32),'hex');
    b[6]=(b[6]!&15)|80;b[8]=(b[8]!&63)|128;const h=b.toString('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
  const id=uuid(`${config.contract}:${config.sourceId}:source`),locatorId=uuid(`${config.contract}:${config.sourceId}:${config.locator.key}:locator`);
  const m=config.sourceMetadata;
  const input:MasterRetainedBindingGuardInputR1={config,newSource:{id,source_key:config.sourceId,title_ru:m.source_title,authority:m.source_authority,
    official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:m.effective_from??null,effective_to:null,
    metadata:{contract:config.contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,
      universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
    newLocators:[{id:locatorId,source_id:id,locator_key:config.locator.key,locator:config.locator.payload,
      excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
  const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),oldFormulas=new Set(retained.capturedParent.formulas.map(f=>f.formula_id));
  const formulas=config.formulaDefinitions.map(f=>({...f,ast_sha256:oldFormulas.has(f.formula_id)?f.ast_sha256:hashMasterSingleDefinitionSuccessorReceiptR1(f.ast)}));
  const applicable=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,[locatorId]);
  const bindings=resolveMasterSingleDefinitionBindingRowIds(config,resources,[locatorId]).map(row_id=>({row_id,locator_id:locatorId,applicability:applicable[row_id]}));
  const fingerprint=hashMasterSingleDefinitionSuccessorReceiptR1({purpose:'PURE_CURRENT_CONFIG_RETAINED_REPRESENTATIVE_NOT_PUBLICATION',
    capturedParentSha256:retained.capturedParentSha256,sourceHashes:config.sourcePaths.map(path=>({path,sha256:sha(own(path))})),source:input.newSource,locators:input.newLocators});
  const result=prepareMasterRetainedBindingRepresentativeR1(input,{parameters:config.parameterDefinitions,formulas,resources,newBindings:bindings,
    successorProvenance:{contract:config.contract,sourceId,normId:config.normId,parentDefinitionId:source.currentDefinitionId,
      parentBaselineId:source.currentBaselineId,capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:fingerprint},
    lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:fingerprint}});
  for(const [id,sources] of Object.entries(retained.capturedParent.baseline.normative_source_ids))same(result.normativeSourceIds[id],sources);
}

/** TEST_ONLY project examples; never runtime defaults, source norms or proof of
 * actual imported document approval. Exactly seven real core calls. */
export async function verifyFacadeVentilatedThermowoodConsumersR5() {
  const old=original(),next=definition(),oldRows=new Set(old.resources.map(r=>r.row_id)),map=completeness();
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:next.formulas,resourceDefinitions:next.resources}),[]);
  assert.equal(next.resources.filter(r=>oldRows.has(r.row_id)).length,45);
  const view=(result:CanonicalEstimateCompileCoreResult)=>({rows:result.rows.map(r=>[r.row_id,r.quantity,r.unit_price,r.amount,r.included_in_estimate,r.included_in_procurement]),
    needs:result.preliminaryNeeds,totals:result.totals});
  let coreCalls=0;
  for(const [surface,floors] of [['100',2],['250',5]] as const){
    const input={...baselineInput(),facade_area_m2:surface,floors};
    coreCalls++;const before=await compileCanonicalEstimateCore({operation:'recalculate',catalogId:source.catalogId,compilerVersion:source.contract,
      primaryMeasureParameterId:'facade_area_m2',parameterDefinitions:[...old.parameters],formulaDefinitions:[...old.formulas],resourceDefinitions:[...old.resources],
      submittedParameters:input,confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',maximumResourceRows:old.resources.length,hashJson:hash});
    coreCalls++;const after=await compile({...input,[selector]:legacy});same(view(after),view(before));
    assert.equal(before.rows.length,16);
  }
  const input={[selector]:choice,[area]:'100'};
  coreCalls++;const preliminary=await compile(input);
  const scope=preliminary.rows.find(r=>r.row_id===scopePrefix+':net-area-scope');assert(scope&&scope.quantity!==null);assert.equal(cmp(scope.quantity,'100'),0);
  assert(preliminary.rows.every(r=>!oldRows.has(r.row_id)));
  assert.equal(scope.included_in_estimate,false);assert.equal(scope.included_in_procurement,false);
  assert(preliminary.preliminaryNeeds.length>0);
  const fixture=(copies:number,netArea:string):FacadeVentilatedThermowoodReadbackR5=>{
    const layout=String(copies).repeat(64),boards=Array.from({length:copies*2},(_,i)=>({boardId:'TEST_ONLY_board_'+i,
      widthMm:i%2===0?'120':'160',supportIntersectionIds:['TEST_ONLY_support_1','TEST_ONLY_support_2','TEST_ONLY_support_3']}));
    return {sourceProfile:'thermowood-horizontal-tg',netFacadeAreaM2:netArea,geometryDocumentSha256:layout,
      schedule:{profile:'thermowood-horizontal-tg',sourceSha256:boardSource.profiles[0]!.source.sha256,
        approvedProjectReference:'TEST_ONLY_SYNTHETIC_PROJECT_NOT_AUTHENTICATED',approvedLayoutSha256:layout,exactMaterialSupportAndFastenerAccepted:true,boards},
      ends:{boardLayoutSha256:layout,approvedProjectReference:'TEST_ONLY_SYNTHETIC_PROJECT_NOT_AUTHENTICATED',approvedEndLayoutSha256:'e'.repeat(64),
        approvedSourceFitReference:'TEST_ONLY_SYNTHETIC_TDS_FIT_NOT_AUTHENTICATED',exactTdsSha256:endSource.sources[0]!.sha256,
        boards:boards.map(b=>({boardId:b.boardId,widthMm:b.widthMm,ends:[{end:'START',netAreaM2:'0.0016',actualProfileAndCutGeometrySha256:'a'.repeat(64)},
          {end:'FINISH',netAreaM2:'0.0016',actualProfileAndCutGeometrySha256:'b'.repeat(64)}]}))}};
  };
  for(const [copies,netArea,screws,mass] of [[1,'100','9','0.00384'],[2,'200','18','0.00768']] as const){
    coreCalls++;const result=await compile({[selector]:choice,[area]:netArea},{readback:fixture(copies,netArea)});
    const fixing=result.rows.find(r=>r.row_id===boardPrefix+':screws'),sealer=result.rows.find(r=>r.row_id===endPrefix+':sealer-minimum');
    assert(fixing&&fixing.quantity!==null&&sealer&&sealer.quantity!==null);
    assert.equal(cmp(fixing.quantity,screws),0);assert.equal(cmp(sealer.quantity,mass),0);
    assert.equal(sealer.included_in_estimate,false);assert.equal(sealer.included_in_procurement,false);
    assert.equal(result.rows.filter(r=>r.row_id===fixing.row_id).length,1);
    assert.equal(result.preliminaryNeeds.length,17);
    assert(result.preliminaryNeeds.some(n=>n.row_id===scopePrefix+':need:board-supply'));
    assert(result.preliminaryNeeds.some(n=>n.row_id===boardPrefix+':need:cut-end-protection'));
    assert(result.rows.every(r=>!oldRows.has(r.row_id)));
  }
  const readback=fixture(1,'100');
  assert.throws(()=>compile(input,{readback:{...readback,netFacadeAreaM2:'101'}}),/EXACT_SAME_SOURCE_GEOMETRY/);
  assert.throws(()=>compile(input,{readback:{...readback,geometryDocumentSha256:'f'.repeat(64)}}),/EXACT_SAME_SOURCE_GEOMETRY/);
  assert.throws(()=>compile({...input,board_fixing_actual_narrow_intersections:'3'}),/TECHNICAL_FACTS_REQUIRE_TRUSTED_READBACK/);
  assert.throws(()=>compile({[selector]:legacy,...baselineInput()},{readback}),/READBACK_WRONG_PROFILE/);
  assert.equal(coreCalls,7);
  return {status:'ACTUAL_ORDINARY_CONSUMERS_NOT_PUBLICATION_OR_DOCUMENT_AUTHENTICATION',coreCalls,originalRowsRetained:45,
    oldLegacyIncluded:16,oldLegacyExcluded:29,sourceMatchedExamples:2,newOrdinaryGeometryInputs:1,unresolvedNeedsWithReadback:17,newFULL:0};
}
