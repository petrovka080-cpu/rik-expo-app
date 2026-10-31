import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import source from '../../../data/estimate-benchmarks/source-packs/facade-ventilated-hpl-existing-owner-r5.json';
import panelSource from '../../../data/estimate-benchmarks/source-packs/facade-panel-face-fixing-r3.json';
import {facadeVentilatedThermowoodMasterConfigR5} from './prepareFacadeVentilatedThermowoodR5';
import {facadeVentilatedOriginalDefinitionR5,facadeVentilatedThermowoodDefinitionR5,facadeVentilatedThermowoodSelectorR5 as selector,
  facadeVentilatedThermowoodLegacyR5 as legacy} from '../../../src/lib/estimate/v4/masterFacadeVentilatedThermowoodR5';
import {facadeVentilatedHplDefinitionR5 as build,facadeVentilatedHplCompletenessR5 as completeness,
  facadeVentilatedHplPrimarySelectionR5 as selection,facadeVentilatedHplAreaR5 as area,facadeVentilatedHplChoiceR5 as choice,
  compileFacadeVentilatedHplR5 as compile,type FacadeVentilatedHplReadbackR5} from '../../../src/lib/estimate/v4/facadeVentilatedHplExistingOwnerR5';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreResult} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {compareFormulaGraphDecimals as cmp} from '../../../src/lib/estimate/backendPlatform/formulaGraph';
import {facadePanelFaceFixingDefinitionR3} from '../../../src/lib/estimate/v4/facadePanelFaceFixingR3';
import {estimateDeterministicHash as hash} from '../../../src/lib/estimate/estimateDeterministicHash';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
import {prepareMasterRetainedBindingRepresentativeR1,type MasterRetainedBindingGuardInputR1,type MasterRetainParentBindingsR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateIndependentCompletenessMapReferences,buildMasterPublicationResourceRowsR1,
  resolveMasterSingleDefinitionBindingRowIds,resolveMasterSingleDefinitionBindingApplicabilityByRowId,
  resolveMasterSingleDefinitionLocatorExcerptSha256R1,hashMasterSingleDefinitionSuccessorReceiptR1,
  type MasterSingleDefinitionSuccessorConfig as Config} from './prepareMasterSingleDefinitionSuccessorR1';

// WIP ordinary Config, not an applied definition. This is an extension BEFORE
// the first facade publication against the exact retained v5 capture. The
// existing normal/locked/PG preflight must reject any later actual parent; a
// later successor requires its own fresh capture and normal append contract.
const sourceId='gox_facade_ventilated_hpl_existing_owner_r5';
const packPath='data/estimate-benchmarks/source-packs/facade-ventilated-hpl-existing-owner-r5.json';
const ownModule='src/lib/estimate/v4/facadeVentilatedHplExistingOwnerR5.ts';
const ownConfig='scripts/estimate/r4a13/prepareFacadeVentilatedHplExistingOwnerR5.ts';
const ownTest='src/lib/estimate/v4/facadeVentilatedHplExistingOwnerR5.test.ts';
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const hpl=(()=>{const p=panelSource.profiles.find(p=>p.key==='hpl-rivet8-aluminium');assert(p);return p;})();
const hplScope='facade:ventilated-hpl:existing-owner:r5';

export function facadeVentilatedHplMasterConfigR5(context:{releaseId:string;searchReleaseId:string;sourceRoot?:string;outputRoot?:string}):Config {
  const own=(path:string)=>resolve(context.sourceRoot??'.',path),base=facadeVentilatedThermowoodMasterConfigR5(context),next=build(),map=completeness();
  const old=base.binding.retainParentBindings;assert(old);assert.equal(old.capturedParent.definition.id,source.currentCapturedDefinitionId);
  assert.equal(old.capturedParent.definition.definition_sha256,source.currentCapturedDefinitionSha256);assert.equal(old.capturedParent.baseline.id,source.currentCapturedBaselineId);
  assert.equal(sha(own(source.sourcePack.path)),source.sourcePack.sha256);assert.equal(sha(own(hpl.source.path)),hpl.source.sha256);
  const oldIds=new Set(old.capturedParent.parameters.map(p=>p.parameter_id));
  const retained:MasterRetainParentBindingsR1={...old,capturedSourcePreimage:{sourceKey:sourceId,expected:null},
    newParameterSources:Object.fromEntries(next.parameters.filter(p=>!oldIds.has(p.parameter_id)).map(p=>[p.parameter_id,
      p.truth_metadata.value_source_role==='UNRESOLVED_APPLICATION_NORM'?{kind:'UNRESOLVED',sourceIds:[]}:
        p.truth_metadata.value_source_role==='COMPILER_DERIVED_RESOURCE_QUANTITY'?{kind:'DERIVED',sourceIds:[]}:{kind:'KNOWN',sourceIds:[sourceId]}]))};
  const rows=[base.binding.rowId,...(base.binding.additionalRowIds??[]),hpl.prefix+':fixed',hpl.prefix+':sliding'];
  const ownNeeds=[hplScope+':need:panel-supply',...panelSource.protectedNeeds.map(n=>hpl.prefix+':need:'+n.key)];
  const config:Config={...base,contract:source.contract,applicationName:'facade-ventilated-hpl-existing-owner-r5',
    stopCode:'FACADE_VENTILATED_HPL_R5',sourceId,normId:'EXISTING_NATIVE_THERMOWOOD_AND_HPL_PROFILES_WITH_RETAINED_LEGACY_OWNER',
    outputRoot:context.outputRoot??'.release-runtime/r568/facade-ventilated-hpl-r5',
    sourcePaths:[...new Set([...base.sourcePaths,packPath,source.sourcePack.path,hpl.source.path,ownModule,ownConfig,ownTest,
      'src/lib/estimate/v4/facadePanelFaceFixingR3.ts'])],
    sourceMetadata:{...base.sourceMetadata,source_title:'Вентилируемый фасад: исходные термодревесная и компактная плитная облицовки',
      artifact_sha256:sha(own(packPath)),exact_locator:base.sourceMetadata.exact_locator+';HPL NorthAmericaJuly2026 PDF35–37;one fixed point per actual panel',
      use_restriction:'Только точные исходные методы, материалы/подсистема и принятые отдельные ведомости. Ни площадь, ни соседний профиль не определяют крепёжную сетку, полный раскрой, труд или поставку. FULL0.'},
    parameterDefinitions:next.parameters,formulaDefinitions:next.formulas,resourceDefinitions:next.resources,
    validationScenario:'ONE_INDEPENDENT_LEGACY_REPLAY_AND_THREE_FRESH_HPL_SCENARIOS',
    passport:{...base.passport,physicalResultRu:'Вентилируемый фасад по явно выбранному исходному профилю; фактическое полное обеспечение отдельно не принято.',
      includedScopeRu:[...base.passport.includedScopeRu,'Лицевое крепление исходной компактной плиты по её принятой схеме фиксированных и подвижных точек.'],
      independentCompletenessMap:map,unresolvedApplicableResourceRowIds:[...(base.passport.unresolvedApplicableResourceRowIds??[]),...ownNeeds]},
    applicability:{...base.applicability,primaryMeasureSelectionV1:selection(),
      sourceProfilesByExplicitChoice:{...base.applicability.sourceProfilesByExplicitChoice,[choice]:{
        exactSourceProfile:'hpl-rivet8-aluminium',sourceCountryAndEdition:hpl.source.territory,sameAcceptedGeometryAndPointLayoutRequired:true,
        noLegacyQuantityOrPriceTransfer:true,normalLockedActualParentCheckRequired:true,fullTechnicalAcceptance:false}}},
    binding:{...base.binding,rowId:rows[0]!,additionalRowIds:rows.slice(1),retainParentBindings:retained,
      applicabilityByRowId:{...base.binding.applicabilityByRowId,...Object.fromEntries(rows.slice(-2).map(row=>[row,{
        contract:source.contract,source_artifact_sha256:hpl.source.sha256,exactSourceProfile:'hpl-rivet8-aluminium',automaticLegacyQuantityOrPriceTransferAllowed:false}]))}},
    locator:{key:'facade-ventilated-hpl-existing-owner-r5',payload:{...base.locator.payload,sourcePack:source,
      additionalOriginalPanelPack:panelSource,independentCompletenessMap:map,registeredCompositeSourceKey:sourceId,
      logicalSourceMemberIdentities:['gox_facade_board_source_fixing_r3_thermowood-horizontal-tg','gox_facade_timber_end_protection_r5',
        'gox_facade_panel_face_fixing_r3_hpl-rivet8-aluminium'],logicalMembersRegisteredByThisFactory:false,fullTechnicalAcceptance:false}},
    search:{...base.search,aliases:[...base.search.aliases,'Облицовка фасада компактными плитами'],
      shortScopeRu:'Сохранённый расчёт либо точный исходный термодревесный или компактный плитный профиль с отдельной принятой ведомостью и видимым неполным обеспечением.',
      extraSearchTermsRu:base.search.extraSearchTermsRu+' компактная фасадная плита лицевая заклёпка фиксированная подвижная точка',
      includedBoundaries:[...base.search.includedBoundaries,choice],sourceProvenance:{...base.search.sourceProvenance,
        hplExactSourceProfile:hpl.key,newCatalogIds:0,newFullTechnologies:0}},
    receiptFileStem:'facade_ventilated_hpl_existing_owner_r5',verifyCore:async()=>{
      const actual=await verifyFacadeVentilatedHplConsumersR5(config);verifyRetained(config,own);
      return {...actual,normalRetainedRepresentative:'ACTUAL_STANDARD_GUARD_NOT_PUBLISHER_OR_DB_ACCEPTANCE'};}};
  return config;
}

function verifyRetained(config:Config,own:(path:string)=>string):void {
  const retained=config.binding.retainParentBindings;assert(retained);
  const uuid=(seed:string)=>{const b=Buffer.from(hashMasterSingleDefinitionSuccessorReceiptR1(seed).slice(0,32),'hex');b[6]=(b[6]!&15)|80;b[8]=(b[8]!&63)|128;
    const h=b.toString('hex');return`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
  const id=uuid(`${config.contract}:${sourceId}:source`),locator=uuid(`${config.contract}:${sourceId}:${config.locator.key}:locator`),m=config.sourceMetadata;
  const input:MasterRetainedBindingGuardInputR1={config,newSource:{id,source_key:sourceId,title_ru:m.source_title,authority:m.source_authority,
    official_url:m.official_url??null,artifact_sha256:m.artifact_sha256??null,effective_from:m.effective_from??null,effective_to:null,
    metadata:{contract:config.contract,sourceKind:m.source_kind,useRestriction:m.use_restriction,
      universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
    newLocators:[{id:locator,source_id:id,locator_key:config.locator.key,locator:config.locator.payload,excerpt_sha256:resolveMasterSingleDefinitionLocatorExcerptSha256R1(config)}]};
  const resources=buildMasterPublicationResourceRowsR1(config.resourceDefinitions),ids=new Set(retained.capturedParent.formulas.map(f=>f.formula_id));
  const formulas=config.formulaDefinitions.map(f=>({...f,ast_sha256:ids.has(f.formula_id)?f.ast_sha256:hashMasterSingleDefinitionSuccessorReceiptR1(f.ast)}));
  const applicable=resolveMasterSingleDefinitionBindingApplicabilityByRowId(config,resources,[locator]);
  const bindings=resolveMasterSingleDefinitionBindingRowIds(config,resources,[locator]).map(row_id=>({row_id,locator_id:locator,applicability:applicable[row_id]}));
  const fingerprint=hashMasterSingleDefinitionSuccessorReceiptR1({purpose:'PURE_HPL_CONFIG_STANDARD_RETAINED_REPRESENTATIVE_NOT_PUBLICATION',
    capturedParentSha256:retained.capturedParentSha256,sourceHashes:config.sourcePaths.map(path=>({path,sha256:sha(own(path))})),source:input.newSource,locators:input.newLocators});
  const result=prepareMasterRetainedBindingRepresentativeR1(input,{parameters:config.parameterDefinitions,formulas,resources,newBindings:bindings,
    successorProvenance:{contract:config.contract,sourceId,normId:config.normId,parentDefinitionId:source.currentCapturedDefinitionId,
      parentBaselineId:source.currentCapturedBaselineId,capturedParentSha256:retained.capturedParentSha256,sourceFingerprint:fingerprint},
    lifecycleMetadata:{contract:config.contract,masterSha256:config.masterSha256,sourceFingerprint:fingerprint}});
  for(const[id,sources]of Object.entries(retained.capturedParent.baseline.normative_source_ids))
    assert.deepEqual(stable(result.normativeSourceIds[id]),stable(sources));
}

/** Five new core calls: independent original/new legacy (2), then fresh HPL
 * missing readback and2new source schedules(3). Source fixtures are TEST_ONLY,
 * not document authentication, stock or a new numerical application norm. */
export async function verifyFacadeVentilatedHplConsumersR5(config:Config){
  const model=build(),old=facadeVentilatedOriginalDefinitionR5(),retained=config.binding.retainParentBindings;assert(retained);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:completeness(),formulaDefinitions:model.formulas,resourceDefinitions:model.resources}),[]);
  const predecessor=facadeVentilatedThermowoodDefinitionR5();
  for(const parameter of predecessor.parameters.filter(p=>p.parameter_id!==selector))
    assert.deepEqual(stable(model.parameters.find(p=>p.parameter_id===parameter.parameter_id)),stable(parameter));
  for(const formula of predecessor.formulas)
    assert.deepEqual(stable(model.formulas.find(f=>f.formula_id===formula.formula_id)),stable(formula));
  for(const resource of predecessor.resources)
    assert.deepEqual(stable(model.resources.find(r=>r.row_id===resource.row_id)),stable(resource));
  const oldRows=new Set(old.resources.map(r=>r.row_id)),native=facadePanelFaceFixingDefinitionR3('hpl-rivet8-aluminium');
  assert.equal(oldRows.size,45);assert.equal(model.resources.filter(r=>oldRows.has(r.row_id)).length,45);
  for(const row of native.resources){
    const copies=model.resources.filter(r=>r.row_id===row.row_id);assert.equal(copies.length,1);const actual=copies[0]!;
    assert.deepEqual([actual.id,actual.formula_id,actual.cost_owner_id,actual.procurement_eligible],
      [row.id,row.formula_id,row.cost_owner_id,row.procurement_eligible]);
    assert.deepEqual(stable(actual.source_metadata),stable(row.source_metadata));
    for(const key of ['semanticOwnerId','costOwner','costTreatment','derivedQuantityEditPolicyV1'])
      assert.deepEqual(stable(actual.resource_graph[key]),stable(row.resource_graph[key]));
    assert.deepEqual(stable(model.formulas.find(f=>f.formula_id===row.formula_id)),stable(native.formulas.find(f=>f.formula_id===row.formula_id)));
  }
  const view=(r:CanonicalEstimateCompileCoreResult)=>({rows:r.rows.map(r=>[r.row_id,r.quantity,r.unit_price,r.amount,r.included_in_estimate,r.included_in_procurement]),needs:r.preliminaryNeeds,totals:r.totals});
  const originalInput=structuredClone(retained.capturedParent.baseline.input_values),input={...originalInput,[selector]:legacy};
  const common={operation:'recalculate' as const,catalogId:config.catalogId,compilerVersion:config.contract,primaryMeasureParameterId:'facade_area_m2',
    confirmedParameters:{},rowOverrides:{},priceItems:[],currencyCode:'KGS',hashJson:hash};
  const before=await compileCanonicalEstimateCore({...common,parameterDefinitions:[...old.parameters],formulaDefinitions:[...old.formulas],resourceDefinitions:[...old.resources],
    submittedParameters:originalInput,maximumResourceRows:old.resources.length});
  const after=await compileCanonicalEstimateCore({...common,parameterDefinitions:[...model.parameters],formulaDefinitions:[...model.formulas],resourceDefinitions:[...model.resources],
    submittedParameters:input,maximumResourceRows:model.resources.length});
  assert.deepEqual(stable(view(after)),stable(view(before)));assert.equal(before.rows.length,16);
  const missing=await compile({[selector]:choice,[area]:'100'}),scope=missing.rows.find(r=>r.row_id===hplScope+':net-area-scope');assert(scope&&scope.quantity!==null);
  assert.equal(cmp(scope.quantity,'100'),0);assert.equal(scope.included_in_estimate,false);assert.equal(scope.included_in_procurement,false);assert(missing.preliminaryNeeds.length>0);
  const readback=(n:number,netArea:string):FacadeVentilatedHplReadbackR5=>({sourceProfile:'hpl-rivet8-aluminium',netFacadeAreaM2:netArea,
    geometryDocumentSha256:(n===7?'d':'f').repeat(64),schedule:{profile:'hpl-rivet8-aluminium',sourceSha256:hpl.source.sha256,panelThicknessMm:'8',
      exactMaterialFrameAndFastenerAccepted:true,approvedProjectReference:'TEST_ONLY_SYNTHETIC_NOT_AUTHENTICATED',approvedPointLayoutSha256:(n===7?'d':'f').repeat(64),
      panels:Array.from({length:n},(_,i)=>({panelId:'TEST_ONLY_panel_'+i,points:Array.from({length:8},(_,j)=>({pointId:'TEST_ONLY_point_'+j,
        kind:j===0?'fixed' as const:'sliding' as const}))}))}});
  for(const[n,netArea,fixed,sliding]of[[7,'10.08','7','49'],[14,'20.16','14','98']]as const){
    const r=await compile({[selector]:choice,[area]:netArea},{readback:readback(n,netArea)}),a=r.rows.find(r=>r.row_id===hpl.prefix+':fixed'),b=r.rows.find(r=>r.row_id===hpl.prefix+':sliding');
    assert(a&&a.quantity!==null&&b&&b.quantity!==null);assert.equal(cmp(a.quantity,fixed),0);assert.equal(cmp(b.quantity,sliding),0);assert.equal(r.preliminaryNeeds.length,8);
    assert(r.preliminaryNeeds.some(n=>n.row_id===hplScope+':need:panel-supply'));
    assert(r.rows.every(row=>row.row_id.startsWith(hpl.prefix+':')||row.row_id.startsWith(hplScope+':')));
  }
  const fresh={[selector]:choice,[area]:'10.08'},r=readback(7,'10.08');
  assert.throws(()=>compile(fresh,{readback:{...r,geometryDocumentSha256:'e'.repeat(64)}}),/EXACT_SAME_SOURCE_GEOMETRY/);
  assert.throws(()=>compile(fresh,{readback:{...r,netFacadeAreaM2:'100'}}),/EXACT_SAME_SOURCE_GEOMETRY/);
  assert.throws(()=>compile(fresh,{readback:{...r,schedule:{...r.schedule,sourceSha256:'a'.repeat(64)}}}),/EXACT_PANEL_FRAME_FASTENER_SOURCE_REQUIRED/);
  assert.throws(()=>compile({...fresh,panel_fixing_actual_total_points:'56'}),/TECHNICAL_FACTS_REQUIRE_TRUSTED_READBACK/);
  assert.throws(()=>compile(fresh,{parentPrimaryMeasure:{parameterId:'facade_area_m2',unitId:'m2'}}),{code:'PRIMARY_MEASURE_NEW_ROOT_REQUIRED'});
  return {status:'ACTUAL_NEW_HPL_CONSUMER_NOT_PUBLICATION_ACCEPTANCE',coreCalls:5,newPublicGeometryInputs:1,unknownNeeds:8,oldRowsPreserved:45,newFULL:0};
}
