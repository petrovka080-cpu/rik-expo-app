import {
  ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID,
  ADDRESSABLE_SMOKE_DETECTOR_FORMULAS,
  ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS,
  ADDRESSABLE_SMOKE_DETECTOR_RESOURCES,
  ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT,
  ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
  compileAddressableSmokeDetectorR1,
} from "../../src/lib/estimate/v4/addressableSmokeDetectorR1";

const REQUIRED = [
  "rc09:addressable_smoke_detector_install",
  "rc09:addressable_optical_smoke_detector",
  "rc09:addressable_detector_base",
  "rc09:detector_fire_resistant_fastener",
  "rc09:detector_address_label",
  "rc09:smoke_detector_test_aerosol",
  "rc09:smoke_detector_test_dispenser",
  "rc09:smoke_detector_activation_record",
] as const;
const CONDITIONAL = [
  "rc09:addressable_loop_isolator",
  "rc09:fire_resistant_junction_box",
] as const;

describe("MASTER addressable smoke-detector owner", () => {
  test("uses the exact fire-alarm owner without importing historical QA rates", () => {
    expect(ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_fire_alarm_install_standard");
    expect(ADDRESSABLE_SMOKE_DETECTOR_PARAMETERS).toHaveLength(29);
    expect(ADDRESSABLE_SMOKE_DETECTOR_FORMULAS).toHaveLength(28);
    expect(ADDRESSABLE_SMOKE_DETECTOR_RESOURCES).toHaveLength(28);
    expect(ADDRESSABLE_SMOKE_DETECTOR_RUNTIME_INPUT).toEqual({
      detector_retained_spare_piece: 0,
      detector_supplier_pack_size_piece: 1,
      base_retained_spare_piece: 0,
      base_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(ADDRESSABLE_SMOKE_DETECTOR_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|detector_count\s*\*\s*(?:0\.006|0\.05|0\.04)/iu);
    expect(ADDRESSABLE_SMOKE_DETECTOR_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:fire_alarm_loop_cable",
        "rc09:fire_alarm_control_panel",
        "rc09:sounder",
        "rc09:power_supply",
        "rc09:full_fire_alarm_system",
      ]));
  });

  test("known count gives work, devices, bases and labels plus local needs", async () => {
    const compiled = await compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "25", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "25", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "25", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "25", unit_id: "pcs" }),
    ]));
    expect(compiled.rows).toHaveLength(16);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        REQUIRED[3], ...REQUIRED.slice(5), ...CONDITIONAL,
      ]));
    expect(compiled.preliminaryNeeds).toHaveLength(12);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        "rc09:labor:installation", "rc09:labor:programming-testing",
        "rc09:equipment:mounting-tool", "rc09:equipment:loop-programmer",
        "rc09:logistics:delivery", "rc09:logistics:waste-removal",
      ]));
  });

  test("compiles the evidence-bound project fixture with labor, tools and logistics", async () => {
    const compiled = await compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(26);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "25", unit_id: "set" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "0.18", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "1.5", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "1", unit_id: "document" }),
      expect.objectContaining({ row_id: "rc09:labor:installation", quantity: "15" }),
      expect.objectContaining({ row_id: "rc09:labor:programming-testing", quantity: "10" }),
      expect.objectContaining({ row_id: "rc09:equipment:mounting-tool", quantity: "5" }),
      expect.objectContaining({ row_id: "rc09:equipment:loop-programmer", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:logistics:delivery", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:logistics:waste-removal", quantity: "1" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[0])
      ?.included_in_estimate).toBe(false);
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[7])
      ?.included_in_estimate).toBe(false);
  });

  test("separates detector and base reserves, packages, orders and remainders", async () => {
    const compiled = await compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
      detector_retained_spare_piece: 2,
      detector_supplier_pack_size_piece: 10,
      base_retained_spare_piece: 1,
      base_supplier_pack_size_piece: 20,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:detector-balance:installed-net")?.quantity).toBe("25");
    expect(rows.get("rc09:detector-balance:retained-spare")?.quantity).toBe("2");
    expect(rows.get("rc09:detector-balance:total-need")?.quantity).toBe("27");
    expect(rows.get("rc09:detector-balance:package-count")?.quantity).toBe("3");
    expect(rows.get(REQUIRED[1])?.quantity).toBe("30");
    expect(rows.get("rc09:detector-balance:remainder")?.quantity).toBe("5");
    expect(rows.get("rc09:detector-balance:surplus-beyond-reserve")?.quantity).toBe("3");
    expect(rows.get("rc09:base-balance:installed-net")?.quantity).toBe("25");
    expect(rows.get("rc09:base-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:base-balance:total-need")?.quantity).toBe("26");
    expect(rows.get("rc09:base-balance:package-count")?.quantity).toBe("2");
    expect(rows.get(REQUIRED[2])?.quantity).toBe("40");
    expect(rows.get("rc09:base-balance:remainder")?.quantity).toBe("15");
    expect(rows.get("rc09:base-balance:surplus-beyond-reserve")?.quantity).toBe("14");
  });

  test("keeps loop isolators and junction boxes conditional", async () => {
    const compiled = await compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT,
      loop_isolator_mode: "REQUIRED",
      loop_isolator_designation: "Изолятор адресного шлейфа по схеме",
      loop_isolator_quantity_piece: 2,
      junction_box_mode: "REQUIRED",
      junction_box_designation: "Коробка E30 по узлу",
      junction_box_quantity_piece: 5,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(28);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileAddressableSmokeDetectorR1({
      ...ADDRESSABLE_SMOKE_DETECTOR_SHORT_INPUT,
      detector_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAddressableSmokeDetectorR1(
      { ...ADDRESSABLE_SMOKE_DETECTOR_ACCEPTANCE_INPUT },
      { catalogId: `${ADDRESSABLE_SMOKE_DETECTOR_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("ADDRESSABLE_SMOKE_DETECTOR_CATALOG_UNSUPPORTED");
  });
});

import {SMOKE_WHOLE_SOURCE_R1,addressableSmokeWholeDeviceModelR1,assessAddressableSmokeWholeDeviceR1}from'../../src/lib/estimate/v4/addressableSmokeDetectorR1';
import {addressableSmokeWholeValidationFixtureR1,compileAddressableSmokeWholeValidationR1,prepareAddressableSmokeWholeConfigR1}from'../../scripts/estimate/r4a13/prepareS2724AddressableSmokeDetectorBalancedSuccessor';
import {estimateDeterministicHash}from'../../src/lib/estimate/estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences}from'../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {auditCanonicalPublisherSuccessorOperationResourcesR1}from'../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1}from'../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalRevisionCommitPayload}from'../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds}from'../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {projectCanonicalEstimateParameterSessionSnapshot,assertCanonicalEstimateParameterSessionSnapshotIdentity}from'../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';

describe('Existing addressable smoke whole device cycle R1 source-only authored UNRUN',()=>{
 const s=SMOKE_WHOLE_SOURCE_R1,scopeId='rc09:addressable_smoke_detector_install',headId='rc09:addressable_optical_smoke_detector',baseId='rc09:addressable_detector_base';
 function documentFixture(){return{bindingChannel:'SERVER_REVIEWED_PROJECT_RECORDS',methodId:s.candidateMethodId,detectorModel:'DIP-34A-03',detectorManualRevision:14,baseMode:'MATCHED_NEW_SUPPLIED_BASE',controllerModel:'S2000-KDL-2I-01',controllerVersion:'1.36',sourceBindings:Object.fromEntries(s.primaryPins.map(p=>[p.path.split(/[\\/]/).slice(-1)[0],p.sha256])),records:Object.fromEntries(s.actualRecords.map(f=>[f.id,'TEST_ONLY:'+f.id])),actualProjectLocationReviewed:true,actualExternalLoopAndOwnerReviewed:true,actualPolarityScreenAndLocalEndsReviewed:true,actualMountAndSubstrateReviewed:true,actualSafeAccessAndQualifiedWorkersReviewed:true,actualUniqueAddressAndType21ParametersReviewed:true,actualSafeOutputsAndSmokeRestoreProgrammeReviewed:true,actualSupplierKitAndPriceCoverageReviewed:true,actualMetersAndSharedStockReviewed:true,actualHandoverAndWasteReviewed:true,measurements:{installedDetectors:1,supplierPackPieces:10,retainedSparePieces:0,minimumLocalLoopV:8,maximumLocalLoopV:11,airVelocityMaxMps:15,maximumActiveLoopResistanceOhm:100,minimumLoopInsulationKohm:50,ambientMinC:-30,ambientMaxC:55,humidityMaxPct:95},supplyMode:'SEALED_GROUP10_REVIEWED',completeActualLoopLoadReviewed:true,nonAggressiveNonExplosiveEnvironment:true,mountMode:'DIRECT_BASE_REVIEWED',programmeMode:'FULL_SMOKE_RESTORE_REVIEWED',recordedCorrectAddressAndNormalRestore:true};}
 async function persist(input:Record<string,unknown>){
  const compiled=await compileAddressableSmokeWholeValidationR1(input,{[baseId]:{quantity:'7',unitPrice:'9',includedInProcurement:true,provenance:{kind:'manual',reason:'TEST_ONLY historical manual base quantity and price cannot prove object condition or second purchase'}}});
  const releaseId='SMOKE_TEST_ONLY_RELEASE',definitionVersionId='SMOKE_TEST_ONLY_DEFINITION',evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport:{definition_version_id:definitionVersionId,payload_sha256:'e'.repeat(64),decision:{independentCompletenessMap:s.independentComposition}}})!;
  const checksum=estimateDeterministicHash({...compiled.revisionProjection,operationCompositionEvidenceV1:evidence}),commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:s.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence});const saved={id:'SMOKE_TEST_ONLY_REVISION',release_id:releaseId,definition_version_id:definitionVersionId,catalog_id:s.catalogId,checksum_sha256:checksum,input_parameters:compiled.parameters,amendment_contract:{parameterSources:commit.parameterSources}},resources=JSON.parse(JSON.stringify([...compiled.rows,...canonicalArtifactPreliminaryNeeds(saved)]));return{compiled,saved,resources,gate:canonicalEstimateSavedOperationAcceptanceV1({revision:saved,resources})};
 }
 test('actual29/28/28 parent and all native identities lineage units formulas retained with explicit bundled base delta and69positions12operations',()=>{
  const m=addressableSmokeWholeDeviceModelR1();expect(s.actualParentShape).toEqual([29,28,28]);expect(m.resources).toHaveLength(69);expect(s.operationRoster).toHaveLength(12);expect(s.actualRecords).toHaveLength(16);for(const r of s.actualParentModel.resources){const n=m.resources.find(x=>x.row_id===r.row_id)!;expect([n.unit_id,n.category,n.title_ru]).toEqual([r.unit_id,r.category,r.title_ru]);expect(m.formulas.find(x=>x.formula_id===r.formula_id)).toEqual(s.actualParentModel.formulas.find(x=>x.formula_id===r.formula_id));if(r.row_id===baseId){expect(n.formula_id).toBe('smoke_bundled_base_stock_r1');expect(n.source_metadata.sourceOwnedBundledDeltaR1).toMatchObject({priorFormulaId:r.formula_id,physicalResourceNotHidden:true,manualHistoryRetained:true});}else expect(n.formula_id).toBe(r.formula_id);if(![baseId,'rc09:detector_address_label'].includes(r.row_id)){expect(n.source_metadata).toEqual(r.source_metadata);expect([n.cost_owner_id,n.procurement_eligible]).toEqual([r.cost_owner_id,r.procurement_eligible]);}}expect(m.runtimeInput).toEqual({});expect(validateIndependentCompletenessMapReferences({completenessMap:s.independentComposition,formulaDefinitions:m.formulas,resourceDefinitions:m.resources,requireOperationBindings:true})).toEqual([]);
 });
 test('all38physical resources are declared under actual consumers with one owner and no informational hiding of a paid resource',()=>{
  const m=addressableSmokeWholeDeviceModelR1();for(const d of s.additionalResources){const r=m.resources.find(x=>x.row_id===d.rowId)!;expect(r.resource_graph.publicResourcePresentationV1.rowKind).toBeUndefined();expect(r.resource_graph.publicResourcePresentationV1.resourceKind).toBe(d.resourceKind);expect([r.category,r.cost_owner_id,r.resource_graph.costTreatment]).toEqual([d.category,d.costOwnerRowId,d.costTreatment]);expect(r.resource_graph.physicalResourceCoverageHoldR1.ownerPriceScopeAccepted).toBe(false);}for(const op of s.operationRoster)expect(s.resourceDeclarations.some(d=>d.rowKind==='RESOURCE'&&d.operationIds.includes(op.operationId))).toBe(true);
 });
 test('small1 actualgroup10 and normal11 plus reserve1 order20 distinguish installed labels from kit stock without second base purchase',async()=>{
  for(const[n,reserve,order]of[[1,0,'10'],[11,1,'20']]as const){const r=await compileAddressableSmokeWholeValidationR1({...addressableSmokeWholeValidationFixtureR1(),detector_count:n,detector_retained_spare_piece:reserve}),all=[...r.rows,...r.preliminaryNeeds];expect(all.find(x=>x.row_id===headId)?.quantity).toBe(order);for(const id of[baseId,'reference:smoke:factory:dust-cap','reference:smoke:factory:address-label-stock'])expect(all.find(x=>x.row_id===id)).toMatchObject({quantity:order,included_in_estimate:false,included_in_procurement:false});expect(all.find(x=>x.row_id==='rc09:detector_address_label')?.quantity).toBe(String(n));expect(all.find(x=>x.row_id==='reference:smoke:factory:group-manual')?.quantity).toBe(n===1?'1':'2');expect(all.find(x=>x.row_id==='rc09:base-balance:installed-net')?.quantity).toBe(String(n));expect(all.some(x=>x.row_id==='rc09:base-balance:package-count')).toBe(false);}
 });
 test('two holes do not create fastener quantity and source tool specifications do not create one tool per head or numeric application norms',async()=>{
  const r=await compileAddressableSmokeWholeValidationR1(),all=[...r.rows,...r.preliminaryNeeds];for(const id of['rc09:detector_fire_resistant_fastener','rc09:smoke_detector_test_aerosol','rc09:labor:installation','reference:smoke:method:screw','reference:smoke:method:cross-driver','reference:smoke:method:test-action'])expect(all.find(x=>x.row_id===id)?.quantity).toBeNull();await expect(compileAddressableSmokeWholeValidationR1({...addressableSmokeWholeValidationFixtureR1(),aerosol_volume_l:0.1})).rejects.toThrow();for(const n of[0,-1,1.5])await expect(compileAddressableSmokeWholeValidationR1({...addressableSmokeWholeValidationFixtureR1(),detector_count:n})).rejects.toThrow();for(const n of[0,0.5])await expect(compileAddressableSmokeWholeValidationR1({...addressableSmokeWholeValidationFixtureR1(),detector_supplier_pack_size_piece:n})).rejects.toThrow();
 });
 test('incompatible base protocol power environment partial supplier contents and simplified test remain exact HOLD',()=>{
  const f=documentFixture();expect(assessAddressableSmokeWholeDeviceR1(f)).toMatchObject({status:'COMPATIBILITY_INPUTS_PRESENT',estimateCompilationAllowed:false,wholeFASPass:false,FULL:false});for(const patch of[{baseMode:'OTHER_VENDOR_BASE'},{controllerVersion:'1.35'},{partialSupplyAsWholeKit:true},{simplifiedTestAsFullSmoke:true},{sharedLoopPanelOrSupplyDoubleCharged:true},{holesAsUniversalFastenerRate:true},{cableMetresFromDetectorCount:true}])expect(assessAddressableSmokeWholeDeviceR1({...f,...patch}).status).toBe('BLOCKED');for(const patch of[{minimumLocalLoopV:7.9},{maximumLocalLoopV:11.1},{airVelocityMaxMps:15.1},{supplierPackPieces:1},{maximumActiveLoopResistanceOhm:100.1},{minimumLoopInsulationKohm:49.9},{ambientMaxC:55.1}])expect(assessAddressableSmokeWholeDeviceR1({...f,measurements:{...f.measurements,...patch}}).status).toBe('BLOCKED');
 });
 test('manual base quantity7 price9 retained in saved history with calculated kit10 and no second bill or procurement',async()=>{
  const r=await persist(addressableSmokeWholeValidationFixtureR1()),base=r.resources.find((x:{row_id:string})=>x.row_id===baseId)!;expect(base).toMatchObject({quantity:'7',unit_price:'9',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'10',resourceGraph:{purchaseBalanceOwnerRowId:headId}}});expect(r.gate.pdfAllowed).toBe(false);
 });
 test('missing smoke programme record survives Core commit saved manual base and blocks PDF for exact mandatory condition',async()=>{
  const input=addressableSmokeWholeValidationFixtureR1(),fact='smoke_actual_smoke_programme_r1';delete input[fact];const r=await persist(input),scope=r.resources.find((x:{row_id:string})=>x.row_id===scopeId)!;expect(scope).toMatchObject({need_state:'CONDITION_REQUIRED',calculation_trace:{resourceGraph:{scopeRequirementDecisionV1:{status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([fact])}}}});expect(r.gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:scopeId});expect(r.gate.pdfAllowed).toBe(false);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(r.gate)).toThrow();
 });
 test('TEST_ONLY all actual facts keep whole device carrier active and clear only conditions while numeric class supply holds remain',async()=>{
  const r=await persist(addressableSmokeWholeValidationFixtureR1()),scope=r.resources.find((x:{row_id:string})=>x.row_id===scopeId)!,d=scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1;expect(d.status).not.toBe('NOT_APPLICABLE');expect(d.missingObjectFactParameterIds).toEqual([]);expect(r.gate.pdfAllowed).toBe(false);expect(r.compiled.preliminaryNeeds.find(x=>x.row_id==='rc09:smoke_detector_test_aerosol')?.quantity).toBeNull();
 });
 test('partial group manual head7 or10.5 cannot receive whole group document or certify complete sealed kit through saved programme',async()=>{
  for(const qty of['7','10.5']){const r=await compileAddressableSmokeWholeValidationR1(addressableSmokeWholeValidationFixtureR1(),{[headId]:{quantity:qty,unitPrice:'9',provenance:{kind:'manual',reason:'TEST_ONLY partial order cannot establish sealed group10'}}}),all=[...r.rows,...r.preliminaryNeeds];expect(all.find(x=>x.row_id===baseId)?.quantity).toBe(qty);expect(all.some(x=>x.row_id==='reference:smoke:factory:group-manual')).toBe(false);expect(all.find(x=>x.row_id===scopeId)?.calculation_trace.resourceGraph.scopeRequirementDecisionV1.status).toBe('SCOPE_UNVERIFIED');}
 });
 test('unsupported smoke method stays mandatory while omitted conditional box isolator cage and laser do not create default consumers',async()=>{
  for(const[id,value]of[[s.programmeId,'SIMPLIFIED_ONLY_UNSUPPORTED'],[s.supplyId,'PARTIAL_CONTENTS_HELD'],[s.mountId,'MK2_SOURCE_HELD'],[s.addressId,'APA_SOURCE_HELD']]as const){const r=await persist({...addressableSmokeWholeValidationFixtureR1(),[id]:value}),scope=r.resources.find((x:{row_id:string})=>x.row_id===scopeId)!;expect(scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([id])});expect(r.gate.pdfAllowed).toBe(false);}const r=await compileAddressableSmokeWholeValidationR1(),ids=[...r.rows,...r.preliminaryNeeds].map(x=>x.row_id);for(const id of['rc09:addressable_loop_isolator','rc09:fire_resistant_junction_box','reference:smoke:method:box-end','reference:smoke:method:isolator-end','reference:smoke:method:protective-cage','reference:smoke:method:laser-tester','reference:smoke:method:programmer-stock','reference:smoke:method:mount-kit'])expect(ids).not.toContain(id);
 });
 test('cold common parameter session preserves missing external owner and rejects stale definition without replaying old base balance as new purchase',async()=>{
  const input=addressableSmokeWholeValidationFixtureR1(),fact='smoke_actual_external_loop_owner_r1';delete input[fact];const r=await persist(input),m=addressableSmokeWholeDeviceModelR1(),args={requestedRevisionId:r.saved.id,definitionVersionId:r.saved.definition_version_id,parent:null,revision:{revisionId:r.saved.id,parentRevisionId:null,releaseId:r.saved.release_id,catalogId:s.catalogId,definitionVersionId:r.saved.definition_version_id,definitionVersion:6,status:'PRELIMINARY',parameters:r.compiled.parameters,userInputSnapshot:input,acceptedBaselineSnapshot:{},assumptionSnapshot:{},parameterSchemaHash:estimateDeterministicHash(m.parameters),compilerVersion:s.contract,checksumSha256:r.saved.checksum_sha256,createdAt:'TEST_ONLY',preliminaryNeeds:r.compiled.preliminaryNeeds.map(n=>({rowId:n.row_id,selected:false,missingParameterIds:n.missing_parameter_ids,quantity:n.quantity,needState:n.need_state,scopeRequirementDecision:n.calculation_trace.resourceGraph.scopeRequirementDecisionV1}))},catalog:{catalogId:s.catalogId,releaseId:r.saved.release_id,definitionVersion:6,professionalMetadata:{},orderedSpecificationBindings:[]}}as unknown as Parameters<typeof projectCanonicalEstimateParameterSessionSnapshot>[0];const cold=projectCanonicalEstimateParameterSessionSnapshot(JSON.parse(JSON.stringify(args)));expect(cold.revision.preliminaryNeeds?.find(x=>x.rowId===scopeId)?.missingParameterIds).toContain(fact);expect(()=>assertCanonicalEstimateParameterSessionSnapshotIdentity({...cold,definitionVersionId:'STALE_TEST_ONLY'},r.saved.id)).toThrow();
 });
 test('ordinary common composition and factory guards stay held and selected pointer alias is refused before publication',()=>{
  const m=addressableSmokeWholeDeviceModelR1(),gate=auditCanonicalPublisherSuccessorOperationResourcesR1({resourceDefinitions:m.resources,independentComposition:s.independentComposition});expect(gate.definitionAdmissionAllowed).toBe(false);expect(gate.pdfAllowed).toBe(false);expect(gate.issues.some(x=>x.code==='REQUIRED_RESOURCE_CLASS_WITHOUT_VISIBLE_ROWS')).toBe(true);const ctx={referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',currentReleasePath:'SAME_TEST_ONLY',selectedCurrentReleasePath:'SAME_TEST_ONLY'}as Parameters<typeof prepareAddressableSmokeWholeConfigR1>[0];expect(()=>prepareAddressableSmokeWholeConfigR1(ctx)).toThrow('PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 });
});
