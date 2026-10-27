import {assessAccessControlSingleDoorMethodR1,ACCESS_CONTROL_SINGLE_DOOR_SOURCE_R1} from '../../src/lib/estimate/v4/accessControlSystemR1';
import {
  ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
  ACCESS_CONTROL_SYSTEM_CATALOG_ID,
  ACCESS_CONTROL_SYSTEM_FORMULAS,
  ACCESS_CONTROL_SYSTEM_PARAMETERS,
  ACCESS_CONTROL_SYSTEM_RESOURCES,
  ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT,
  ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
  compileAccessControlSystemR1,
} from "../../src/lib/estimate/v4/accessControlSystemR1";

const CONDITIONAL = [
  "rc09:acs_intercom_gateway",
  "rc09:acs_fire_release_interface",
] as const;

describe("S27.24 access-control-system owner", () => {
  test("replaces area-derived generic rows with an exact access-control owner", () => {
    expect(ACCESS_CONTROL_SYSTEM_CATALOG_ID)
      .toBe("canonical-work:expanded:access_control_system");
    expect(ACCESS_CONTROL_SYSTEM_PARAMETERS).toHaveLength(53);
    expect(ACCESS_CONTROL_SYSTEM_FORMULAS).toHaveLength(36);
    expect(ACCESS_CONTROL_SYSTEM_RESOURCES).toHaveLength(36);
    expect(ACCESS_CONTROL_SYSTEM_RUNTIME_INPUT).toEqual({
      acs_controller_retained_spare_piece: 0,
      acs_controller_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(ACCESS_CONTROL_SYSTEM_FORMULAS))
      .not.toMatch(/area_m2|\b432\b|electricalNetworkCalculator|golden_rate|normFactor/iu);
    expect(ACCESS_CONTROL_SYSTEM_RESOURCES.map((row) => row.row_id))
      .toEqual(expect.not.arrayContaining([
        "rc09:cctv_system",
        "rc09:fire_alarm_system",
        "rc09:general_lan",
        "rc09:general_ups",
      ]));
  });

  test("known door and device identity gives useful rows and local needs", async () => {
    const compiled = await compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
    });
    expect(compiled.rows).toHaveLength(13);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:acs_system_install_commission", quantity: "1", unit_id: "system" }),
      expect.objectContaining({ row_id: "rc09:acs_controller", quantity: "2", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:acs_reader", quantity: "16", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:acs_lock", quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:acs_exit_device", quantity: "8", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:acs_door_functional_test", quantity: "8", unit_id: "test" }),
      expect.objectContaining({ row_id: "rc09:acs_door_register", quantity: "8", unit_id: "door" }),
      expect.objectContaining({ row_id: "rc09:acs-controller-balance:package-count", quantity: "2", unit_id: "package" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(23);
  });

  test("compiles the thirty-four-row project fixture", async () => {
    const compiled = await compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(34);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:acs_door_contact", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:acs_emergency_release", quantity: "8" }),
      expect.objectContaining({ row_id: "rc09:acs_power_supply", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:acs_standby_battery", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:acs_network_cable", quantity: "180" }),
      expect.objectContaining({ row_id: "rc09:acs_reader_cable", quantity: "520" }),
      expect.objectContaining({ row_id: "rc09:acs_lock_cable", quantity: "360" }),
      expect.objectContaining({ row_id: "rc09:acs_mounting_box", quantity: "32" }),
      expect.objectContaining({ row_id: "rc09:acs_termination", quantity: "96" }),
      expect.objectContaining({ row_id: "rc09:acs_label", quantity: "80" }),
      expect.objectContaining({ row_id: "rc09:acs_fastening", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:acs_consumable", quantity: "5" }),
      expect.objectContaining({ row_id: "rc09:acs_grounding_conductor", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:labor:acs-device-install", quantity: "72" }),
      expect.objectContaining({ row_id: "rc09:labor:acs-cabling-termination", quantity: "88" }),
      expect.objectContaining({ row_id: "rc09:labor:acs-configuration-commissioning", quantity: "56" }),
      expect.objectContaining({ row_id: "rc09:equipment:acs-lifting", quantity: "12" }),
      expect.objectContaining({ row_id: "rc09:equipment:acs-cable-device-tester", quantity: "24" }),
      expect.objectContaining({ row_id: "rc09:logistics:acs-delivery", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:logistics:acs-packaging-removal", quantity: "1" }),
    ]));
  });

  test("separates installed controllers from rounded supplier procurement", async () => {
    const compiled = await compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
      acs_controller_retained_spare_piece: 1,
      acs_controller_supplier_pack_size_piece: 4,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:acs-controller-balance:installed-net")?.quantity).toBe("2");
    expect(rows.get("rc09:acs-controller-balance:retained-spare")?.quantity).toBe("1");
    expect(rows.get("rc09:acs-controller-balance:total-need")?.quantity).toBe("3");
    expect(rows.get("rc09:acs-controller-balance:package-count")?.quantity).toBe("1");
    expect(rows.get("rc09:acs_controller")?.quantity).toBe("4");
    expect(rows.get("rc09:acs-controller-balance:remainder")?.quantity).toBe("2");
    expect(rows.get("rc09:acs-controller-balance:surplus-beyond-spare")?.quantity).toBe("1");
  });

  test("keeps system, door checks and records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:acs_system_install_commission",
      "rc09:acs_door_functional_test",
      "rc09:acs_door_register",
      "rc09:acs_test_report",
    ]) {
      const row = ACCESS_CONTROL_SYSTEM_RESOURCES.find((item) => item.row_id === rowId);
      expect(row?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps intercom and fire-release interfaces conditional", async () => {
    const compiled = await compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,
      intercom_integration_mode: "REQUIRED",
      intercom_gateway_designation: "Шлюз интеграции с домофонией по архитектуре",
      intercom_gateway_quantity_piece: 1,
      fire_release_integration_mode: "REQUIRED",
      fire_release_interface_designation: "Интерфейс сигнала аварийного открытия",
      fire_release_interface_quantity_piece: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(36);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileAccessControlSystemR1({
      ...ACCESS_CONTROL_SYSTEM_SHORT_INPUT,
      acs_controlled_door_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileAccessControlSystemR1(
      { ...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT },
      { catalogId: `${ACCESS_CONTROL_SYSTEM_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("ACCESS_CONTROL_SYSTEM_CATALOG_UNSUPPORTED");
  });
});

describe('one-door whole-method source precondition before ordinary compilation',()=>{
 const source=ACCESS_CONTROL_SINGLE_DOOR_SOURCE_R1;
 const bound=()=>({methodId:source.candidateMethodId,bindingChannel:'SERVER_REVIEWED_PROJECT_RECORDS',
  records:Object.fromEntries(source.requiredObjectRecords.map(r=>[r.id,'TEST_ONLY_BOUND_RECORD:'+r.id])),
  controllerModel:'С2000-2',controllerVersion:'2.75',readerModel:'Proxy-3M',lockModel:'AL-300 PRemium-12V',
  counts:{doorCount:1,controllerCount:1,readerCount:2,lockCount:1},readerInterface:'WIEGAND44',controllerInterface:'WIEGAND44',cardStandard:'MIFARE',
  supplyTopology:'COMMON_SOURCE_STAR_WITH_SEPARATE_LOCK_PAIR',lockControl:'AL300_COMMAND_CLOSE_COMMON_FIG3',relayProgram:'ON_FOR_TIME',
  doorDirection:'OUTWARD_SWING',readerMetalBase:false,electricalAndGeometry:{lockMinV:11.4,lockMaxV:13.872,
   controllerMinV:11.4,controllerMaxV:13.872,readerMinV:11.4,readerMaxV:13.872,readerGroundDifferenceV:0.2,
   maxReaderDistanceM:12.5,readerSeparationM:0.7,readerLockSeparationM:1.2,doorThicknessMm:40,psuLoadA:1.1,
   relayCurrentA:0.012,relayVoltageV:13.872,relayPowerW:0.167}});
 test('missing technology is a visible BLOCKED, with no preliminary estimate permission',()=>{
  const result=assessAccessControlSingleDoorMethodR1(null);
  expect(result.status).toBe('BLOCKED');expect(result.ownerRowId).toBe('rc09:acs_system_install_commission');
  expect(result.missingActualRecordIds).toHaveLength(13);expect(result.estimateCompilationAllowed).toBe(false);
 });
 test('even complete synthetic source-compatible records do not admit an estimate, authenticate papers or claim commissioning',()=>{
  const facts=bound(),before=JSON.stringify([source,facts,ACCESS_CONTROL_SYSTEM_RESOURCES]);
  const result=assessAccessControlSingleDoorMethodR1(facts);
  expect(result.status).toBe('COMPATIBILITY_INPUTS_PRESENT');expect(result.issues).toEqual([]);
  for(const flag of ['estimateCompilationAllowed','sourceAdmission','documentAuthenticityAttested','quantityNormAccepted','physicalProvisionAccepted','executionOrCommissioningPass','fullTechnicalAcceptance']as const)expect(result[flag]).toBe(false);
  expect(JSON.stringify([source,facts,ACCESS_CONTROL_SYSTEM_RESOURCES])).toBe(before);
 });
 test.each(['acs_door_actual_egress_fire_release_r1','acs_door_actual_power_loss_autonomy_r1','acs_door_actual_route_termination_r1','acs_door_actual_physical_provision_r1'])(
  'a known count never replaces missing whole-method condition %s',key=>{
   const facts=bound();delete facts.records[key];const result=assessAccessControlSingleDoorMethodR1(facts);
   expect(result.status).toBe('BLOCKED');expect(result.missingActualRecordIds).toContain(key);expect(result.estimateCompilationAllowed).toBe(false);
  });
 test('raw RIP reserve10V is below actual lock and controller minima even with12V/5A names',()=>{
  const facts=bound();facts.electricalAndGeometry.lockMinV=10;facts.electricalAndGeometry.controllerMinV=10;
  const result=assessAccessControlSingleDoorMethodR1(facts);
  expect(result.issues).toEqual(expect.arrayContaining(['BELOW_SOURCE_LIMIT:lockMinV','BELOW_SOURCE_LIMIT:controllerMinV']));
  expect(result.status).toBe('BLOCKED');
 });
 test.each([['lockMaxV',14.401],['readerGroundDifferenceV',0.501],['maxReaderDistanceM',100.001],['relayPowerW',100.001]])(
  'measured incompatible boundary %s=%s stays blocked',(key,value)=>{
   const facts=bound();(facts.electricalAndGeometry as Record<string,number>)[key]=value;
   expect(assessAccessControlSingleDoorMethodR1(facts).issues).toContain('ABOVE_OR_INVALID_SOURCE_LIMIT:'+key);
  });
 test('other door/reader/control methods and excluded egress do not silently inherit this method',()=>{
  const facts=bound();facts.readerModel='Proxy-3A';facts.doorDirection='INWARD_SWING';facts.relayProgram='OFF_FOR_TIME';delete facts.records.acs_door_actual_egress_fire_release_r1;
  const result=assessAccessControlSingleDoorMethodR1(facts);
  expect(result.status).toBe('BLOCKED');expect(result.issues).toEqual(expect.arrayContaining([
   'EXACT_DEVICE_VERSION_COMPATIBILITY_REQUIRED','OTHER_DOOR_MOUNTING_WHOLE_METHOD_REQUIRED','LOCK_COMMAND_AND_RELAY_PROGRAM_MISMATCH']));
  expect(result.missingActualRecordIds).toContain('acs_door_actual_egress_fire_release_r1');
 });
 test('metallic reader base needs its actual20mm nonmetallic spacer, with no one-tool-per-reader rule',()=>{
  const facts={...bound(),readerMetalBase:true,spacerThicknessMm:19.99};
  expect(assessAccessControlSingleDoorMethodR1(facts).issues).toContain('METAL_BASE_NONMETALLIC_SPACER_REQUIRED');
  facts.spacerThicknessMm=20;expect(assessAccessControlSingleDoorMethodR1(facts).status).toBe('COMPATIBILITY_INPUTS_PRESENT');
 });
 test('built-in reed and factory lead remain one supply-owner alternative; no native rows, prices or quantities are replaced',()=>{
  const ids=ACCESS_CONTROL_SYSTEM_RESOURCES.map(r=>r.row_id),reed=source.ownershipChoices.find(r=>r.component==='AL300_BUILTIN_PASSIVE_REED')!;
  expect(reed.existingRowId).toBe('rc09:acs_door_contact');expect(reed.physicalSupplyOwnerRowId).toBe('rc09:acs_lock');
  expect(source.actualTechnologySelected).toBe(false);expect(source.quantityAdmission).toBe(false);
  expect(new Set(ids).size).toBe(ids.length);expect(ACCESS_CONTROL_SYSTEM_RESOURCES).toHaveLength(36);
  expect(source.wholePhysicalSteps.some(step=>step.operationId==='access-control:whole-operations:r1:cabling')).toBe(true);
 });
});

import {ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2,accessControlWholeDoorModelR2,assessAccessControlWholeDoorInputsR2}from'../../src/lib/estimate/v4/accessControlSystemR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput}from'../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash}from'../../src/lib/estimate/estimateDeterministicHash';

/** Validation fixtures only. None is a real door/egress approval or test PASS. */
function acsWholeDocumentFixtureR2(){const s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2;
 return{profileId:s.profileId,bindingChannel:'SERVER_REVIEWED_PROJECT_RECORDS',allControllerFactoryPartsFromSelectedNewOrder:true,records:Object.fromEntries(s.actualRecords.map(x=>[x.id,'VALIDATION_FIXTURE:'+x.id])),sourceBindings:Object.fromEntries(s.primarySources.filter(x=>'path'in x&&'sha256'in x).map(x=>[x.path.replace(/\\/g,'/').split('/').pop(),x.sha256])),
 scope:'WHOLE_CONTROLLED_PASSAGE',topology:'ONE_DOOR_TWO_READER_ENTRY_EXIT',doorCount:1,controllerInstalledCount:1,readerCount:2,lockCount:1,psuCount:1,batteryCount:1,exitCount:1,emergencyCount:1,
 controller:'C2000_2_FW2_75',reader:'PROXY3M',lock:'AL300_PREMIUM_12V',psu:'RIP12_ISP101',battery:'AB1217K_12V_17AH_H_M5',exit:'AT_H805A_NON_LED',emergency:'AT_H200_GN',doorDirection:'OUTWARD_SWING',doorThicknessMm:35,
 lockMinimumTerminalV:10.8,lockMaximumTerminalV:14.4,controllerMinimumTerminalV:10.2,controllerMaximumTerminalV:15,readerMinimumTerminalV:8,readerMaximumTerminalV:15,
 readerGroundDifferenceV:0.5,readerDistanceM:100,readerSeparationM:0.5,readerLockSeparationM:1,psuMaxLoadA:1.2,emergencySwitchedA:0.39,emergencySwitchedV:14.4,
 batteryTerminal:'H_M5_PLATE_BOLT_AND_NUT',batteryTorqueNm:2.5,lockRelayProgram:'ON_FOR_TIME_APPROVED_COMMAND_CLOSE',independentEmergencyPowerInterruption:true,controllerExitUsedAsEmergencyRelease:false,builtinReedUsed:true,externalContactExtraOrdered:false,hallConflatedWithDoorReed:false,readerFormat:'WIEGAND26',controllerReaderFormat:'WIEGAND26',routeVariant:'ACTUAL_READY_ROUTE_SEPARATE_LOCK_PAIR_NO_NEW_FIRE_BARRIER',
 actualElectricalPosts:1,actualDrillingPosts:1,actualTestPosts:1,actualBatteryPosts:1,actualConfigurationPosts:1,actualMetalReaderCount:0,
 actualDoorAndEgressReviewed:true,actualEmergencyContactMapAndIndependentMonitorReviewed:true,actualFireReleaseDecisionReviewed:true,actualTerminalEnvelopeAndCutoffReviewed:true,actualFullLoadAutonomyAndTransferReviewed:true,actualBatteryFitHardwareAndProtectionReviewed:true,actualNoSharedControllerLockSupplyPair:true,actualMeasuredRouteCableSectionAndEndsReviewed:true,actualReaderMetalSpacersAndDistancesReviewed:true,actualReaderExternalPowerAndGndReviewed:true,readerPoweredFromControllerTerminals:false,actualProtectionAndSuppressionReviewed:true,actualNativeAggregatesExcludeFactoryPartsReviewed:true,actualEquippedPostsAndStockReviewed:true,actualSafetyIsolationPpeAndAccessReviewed:true,actualSourceRevisionAndSoftwareResolved:true,actualCredentialProgrammeReviewed:true,actualFullDoorPowerFaultProgrammeReviewed:true,actualResultsBackupRestoreHandoverReviewed:true,actualCleanupAndWasteReviewed:true};
}
function acsWholeTrustedFixtureR2(){const s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2;
 return{...ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT,acs_system_count:1,acs_controlled_door_count:1,acs_controller_count:1,acs_reader_count:2,acs_lock_count:1,acs_exit_device_count:1,acs_door_contact_quantity_piece:1,acs_emergency_release_quantity_piece:1,acs_power_supply_quantity_piece:1,acs_standby_battery_quantity_piece:1,acs_controller_retained_spare_piece:0,acs_controller_supplier_pack_size_piece:1,
  ...Object.fromEntries(s.currentParentModel.parameters.filter(x=>x.parameter_id.endsWith('_record_r5')).map(x=>[x.parameter_id,'VALIDATION_FIXTURE:'+x.parameter_id])),acs_whole_operation_review_decision_r5:'Фактические методы и обеспечение подтверждены документами',
  ...Object.fromEntries(s.actualRecords.map(x=>[x.id,'VALIDATION_FIXTURE:'+x.id])),...Object.fromEntries(s.organisationalInputs.map(x=>[x.id,x.min])),[s.decisionId]:'DOCUMENTED_COMPATIBLE',[s.retentionId]:'THREAD_LOCKER',[s.markingId]:'HANDWRITTEN'}as Record<string,unknown>;
}
function acsWholeCompileR2(facts:Record<string,unknown>=acsWholeTrustedFixtureR2(),rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={}){
 const s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2,d=accessControlWholeDoorModelR2(s.profileId);return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:'acs-whole-door-r2.UNRUN_VALIDATION_FIXTURE',catalogId:ACCESS_CONTROL_SYSTEM_CATALOG_ID,primaryMeasureParameterId:'acs_system_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{acs_system_count:1,acs_controlled_door_count:1,acs_controller_count:1,acs_reader_count:2,acs_lock_count:1,acs_exit_device_count:1},confirmedParameters:facts,rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
}
describe('Whole controlled door source over actual broad ACS R737 UNRUN',()=>{
 test('pins61/36parent and preserves native units, prices and R5 while forward3balanceAST and12explicitprofileconstraints',()=>{
  const s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2,d=accessControlWholeDoorModelR2(s.profileId);expect(d.resources).toHaveLength(132);expect(s.resources).toHaveLength(95);expect(s.operationRoster).toHaveLength(18);expect(s.parentProof.header).toMatchObject({definition_version:5,definition_sha256:'40690f07bb64bacc9bbb1acb8471ac28ae42058c62e7450bc18a48cf21fd86a9'});
  for(const p of s.currentParentModel.parameters)expect(d.parameters.find(x=>x.parameter_id===p.parameter_id)).toEqual(s.nativeParameterForwards.find(x=>x.parameterId===p.parameter_id)?.after??p);
  for(const f of s.currentParentModel.formulas){const x=d.formulas.find(x=>x.formula_id===f.formula_id)!,v=s.nativeFormulaForwards.find(x=>x.formulaId===f.formula_id);if(v){expect(x.expression_source).toBe(v.afterExpression);expect(x.ast_sha256).toBe(estimateDeterministicHash(x.ast));}else expect(x).toEqual(f);}
  for(const r of s.currentParentModel.resources){const x=d.resources.find(x=>x.row_id===r.row_id)!;expect([x.unit_id,x.formula_id]).toEqual([r.unit_id,r.formula_id]);expect(x.source_metadata).toMatchObject(r.source_metadata);if(r.row_id==='rc09:acs_system_install_commission')expect(x.resource_graph.scopeRequirementV1).toEqual(r.resource_graph.scopeRequirementV1);}
  expect(d.runtimeInput).toEqual({});expect(s.actualTechnologySelected).toBe(false);expect(s.nativeFormulaForwards).toHaveLength(3);expect(s.nativeParameterForwards).toHaveLength(12);
 });
 test('explicit whole-source document fixture still authorizes no estimate/egress/source/physical/PASS/broad acceptance',()=>{
  expect(assessAccessControlWholeDoorInputsR2(acsWholeDocumentFixtureR2())).toMatchObject({status:'DOCUMENT_INPUTS_PRESENT',sourceAdmission:false,projectApproval:false,egressDesignApproved:false,documentAuthenticityAttested:false,estimateCompilationAllowed:false,physicalCompositionAccepted:false,executedWholeDoorPass:false,deviceBenchPassIsWholeDoorPass:false,nativeDoorTestCountIsExecution:false,factorySupplyGuardPassed:false,fullBroadAcsAccepted:false,FULL:false});
  expect(()=>accessControlWholeDoorModelR2('BROAD_ACS_DEFAULT')).toThrow('ACS_EXPLICIT_INTERNAL_WHOLE_DOOR_PROFILE_REQUIRED');
 });
 test('one full actual passage is not a controller bench, one-reader method or broad eight-door fixture',()=>{
  const f=acsWholeDocumentFixtureR2();for(const p of [{scope:'CONTROLLER_BENCH'},{doorCount:8},{readerCount:1},{topology:'ONE_READER_BUTTON_ONLY'}])expect(assessAccessControlWholeDoorInputsR2({...f,...p}).status).toBe('BLOCKED');
 });
 test('standard outward35/47mm boundary works;48mm/inward require different whole mounting method',()=>{
  const f=acsWholeDocumentFixtureR2();for(const doorThicknessMm of [35,47])expect(assessAccessControlWholeDoorInputsR2({...f,doorThicknessMm}).status).toBe('DOCUMENT_INPUTS_PRESENT');
  for(const p of [{doorThicknessMm:34.99},{doorThicknessMm:47.01},{doorDirection:'INWARD_SWING'}])expect(assessAccessControlWholeDoorInputsR2({...f,...p}).issues).toContain('OTHER_COMPLETE_DOOR_MOUNTING_METHOD_REQUIRED');
 });
 test('nominal12V/17Ah/2minute transfer cannot cover actual low-terminal reserve or reversed envelope',()=>{
  const f=acsWholeDocumentFixtureR2();expect(assessAccessControlWholeDoorInputsR2({...f,lockMinimumTerminalV:10,controllerMinimumTerminalV:10}).status).toBe('BLOCKED');
  expect(assessAccessControlWholeDoorInputsR2({...f,lockMinimumTerminalV:14.4,lockMaximumTerminalV:10.8}).issues).toContain('MALFORMED_TERMINAL_VOLTAGE_ENVELOPE');
  expect(assessAccessControlWholeDoorInputsR2({...f,reserveTwoMinutesUsedAsAutonomy:true}).issues).toContain('FALSE_WHOLE_PASS_OR_SAFETY_PROMOTION_FORBIDDEN');
 });
 test('H-M5plate uses2.5Nm±5%, never internalB-M5 5Nm or NaN',()=>{
  const f=acsWholeDocumentFixtureR2();for(const batteryTorqueNm of [2.375,2.625])expect(assessAccessControlWholeDoorInputsR2({...f,batteryTorqueNm}).status).toBe('DOCUMENT_INPUTS_PRESENT');
  for(const p of [{batteryTorqueNm:5},{batteryTorqueNm:NaN},{batteryTerminal:'B_M5_INTERNAL_THREAD'}])expect(assessAccessControlWholeDoorInputsR2({...f,...p}).issues).toContain('EXACT_H_M5_TERMINAL_AND_2_5NM_TORQUE_REQUIRED_NOT_INTERNAL_B_M5');
 });
 test('normalEXIT or relayOFF cannot substitute independent emergency contact map/power release',()=>{
  const f=acsWholeDocumentFixtureR2();for(const p of [{controllerExitUsedAsEmergencyRelease:true},{independentEmergencyPowerInterruption:false},{lockRelayProgram:'OFF_FOR_TIME'}])expect(assessAccessControlWholeDoorInputsR2({...f,...p}).issues).toContain('INDEPENDENT_APPROVED_EMERGENCY_POWER_RELEASE_REQUIRED');
  expect(assessAccessControlWholeDoorInputsR2({...f,emergency:'UDP513_3M_01_ELECTRONICS_DIRECT_EXIT'}).status).toBe('BLOCKED');expect(assessAccessControlWholeDoorInputsR2({...f,emergencySwitchedA:2.001}).status).toBe('BLOCKED');
 });
 test('exact supportedW26/directsameformat, reader distances and actualpostinventory have boundaries',()=>{
  const f=acsWholeDocumentFixtureR2();for(const p of [{readerFormat:'WIEGAND34',controllerReaderFormat:'WIEGAND34'},{readerGroundDifferenceV:0.50001},{readerDistanceM:100.001},{readerSeparationM:0.499},{readerLockSeparationM:0.999},{actualTestPosts:0},{actualMetalReaderCount:3}])expect(assessAccessControlWholeDoorInputsR2({...f,...p}).status).toBe('BLOCKED');
 });
 test('all16 actual records survive; malformed/stale/manualknownqty cannot approve an unknown method',()=>{
  for(const v of [null,[],{},true,ACCESS_CONTROL_SYSTEM_ACCEPTANCE_INPUT])expect(assessAccessControlWholeDoorInputsR2(v).status).toBe('BLOCKED');
  const f=acsWholeDocumentFixtureR2();for(const x of ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2.actualRecords){const records={...f.records};delete records[x.id];expect(assessAccessControlWholeDoorInputsR2({...f,records,manualQuantity:1,manualPrice:10}).missingActualRecordIds).toContain(x.id);}
  expect(assessAccessControlWholeDoorInputsR2({...f,sourceBindings:{...f.sourceBindings,'accordtec-at-h200-gn-passport.pdf':'0'.repeat(64)}}).issues).toContain('EXACT_PRIMARY_BINDING_REQUIRED:accordtec-at-h200-gn-passport.pdf');
 });
 test('no duplicateexternalreed and no bench/plannedcounter promotion to real integratedpass',()=>{
  const f=acsWholeDocumentFixtureR2();for(const p of [{externalContactExtraOrdered:true},{hallConflatedWithDoorReed:true},{builtinReedUsed:false}])expect(assessAccessControlWholeDoorInputsR2({...f,...p}).issues).toContain('BUILTIN_REED_AND_HALL_DISTINCT_SINGLE_SUPPLY_OWNER_REQUIRED');
  for(const k of ['deviceBenchPassUsedAsWholePass','plannedDoorCounterUsedAsExecutedPass','manualKnownQuantityUsedAsSafetyFact'])expect(assessAccessControlWholeDoorInputsR2({...f,[k]:true}).issues).toContain('FALSE_WHOLE_PASS_OR_SAFETY_PROMOTION_FORBIDDEN');
 });
 test('normal1door usesactual1controller2readers1lock, exactfactoryparts, no tool perdevice or labourfromlimits',async()=>{
  const r=await acsWholeCompileR2(),a=[...r.rows,...r.preliminaryNeeds];
  for(const [id,q]of [['reference:acs:whole-door:r2:controller-resistor82k','6'],['reference:acs:whole-door:r2:controller-screw3x25','3'],['low-current:expanded-roster:r1:factory:reader:contact-blocks','4'],['access-control:electromagnetic-lock:factory-delivery:r24:case-screws-m5x20','2'],['reference:acs:whole-door:r2:emergency-blocks','2'],['reference:acs:whole-door:r2:battery-connections','2'],['low-current:expanded-roster:r1:factory:reader:screw-wall-plug','4']]as const)expect(a.find(x=>x.row_id===id)?.quantity).toBe(q);
  expect(a.find(x=>x.row_id==='rc09:acs_door_functional_test')?.quantity).toBe('1');expect(a.find(x=>x.row_id==='rc09:acs_door_contact')).toMatchObject({included_in_estimate:false,included_in_procurement:false,procurement_eligible:false});
 });
 test('sparesandacceptedmanualcontrollerorder drive samefactory stock andnativebalances',async()=>{
  const f=acsWholeTrustedFixtureR2();f.acs_controller_retained_spare_piece=1;f.acs_controller_supplier_pack_size_piece=2;const r=await acsWholeCompileR2(f),a=[...r.rows,...r.preliminaryNeeds];expect(a.find(x=>x.row_id==='rc09:acs_controller')?.quantity).toBe('2');expect(a.find(x=>x.row_id==='reference:acs:whole-door:r2:controller-resistor82k')?.quantity).toBe('12');
  const m=await acsWholeCompileR2(f,{'rc09:acs_controller':{quantity:'4',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE actualselectedneworder'}}}),b=[...m.rows,...m.preliminaryNeeds];expect(b.find(x=>x.row_id==='reference:acs:whole-door:r2:controller-resistor82k')?.quantity).toBe('24');expect(b.find(x=>x.row_id==='rc09:acs-controller-balance:package-count')?.quantity).toBe('2');expect(b.find(x=>x.row_id==='rc09:acs-controller-balance:remainder')?.quantity).toBe('3');expect(b.find(x=>x.row_id==='rc09:acs-controller-balance:surplus-beyond-spare')?.quantity).toBe('2');
 });
 test('invalidmanualorderquantum retainsrawquantity butblocks effectivefactorysupply; fractionalnativePSU neverrounded',async()=>{
  const f=acsWholeTrustedFixtureR2();f.acs_controller_supplier_pack_size_piece=2;const r=await acsWholeCompileR2(f,{'rc09:acs_controller':{quantity:'3',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE invalidpack'}}}),a=[...r.rows,...r.preliminaryNeeds];expect(a.find(x=>x.row_id==='rc09:acs_controller')).toMatchObject({quantity:'3',calculation_trace:{manualPurchaseSupplyAssessmentV1:{blocked:true}}});expect(a.find(x=>x.row_id==='reference:acs:whole-door:r2:controller-resistor82k')?.quantity).not.toBe('18');
  await expect(acsWholeCompileR2({...acsWholeTrustedFixtureR2(),acs_power_supply_quantity_piece:1.5})).rejects.toThrow();
 });
 test('same reusabletools shared across operations followactualposts independently; spacerfollowsactualmetalreaders',async()=>{
  const f=acsWholeTrustedFixtureR2();f.acs_whole_actual_test_posts_r2=2;f.acs_whole_actual_drilling_posts_r2=3;f.acs_whole_actual_metal_reader_count_r2=1;f.acs_cable_device_tester_machine_h=99;const r=await acsWholeCompileR2(f),a=[...r.rows,...r.preliminaryNeeds];expect(a.find(x=>x.row_id==='low-current:expanded-roster:r1:acs:psu-multimeter')?.quantity).toBe('2');for(const k of ['lock-drill','lock-bit10','lock-bit6'])expect(a.find(x=>x.row_id==='low-current:expanded-roster:r1:acs:'+k)?.quantity).toBe('3');expect(a.find(x=>x.row_id==='low-current:expanded-roster:r1:acs:reader-spacer')?.quantity).toBe('1');expect(a.filter(x=>x.row_id==='low-current:expanded-roster:r1:acs:psu-multimeter')).toHaveLength(1);
 });
 test('groupedscrews/normquantities remain honestUNKNOWN; rowmanual isnotconfirmedimmutableapplicationnorm',async()=>{
  const s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2,id='reference:acs:whole-door:r2:emergency-screws',r=await acsWholeCompileR2();expect(r.preliminaryNeeds.find(x=>x.row_id===id)).toMatchObject({need_state:'QUANTITY_REQUIRED'});
  const m=await acsWholeCompileR2(acsWholeTrustedFixtureR2(),{[id]:{quantity:'4',unitPrice:'10',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE actualmanualqtynotnorm'}}});expect(m.preliminaryNeeds.find(x=>x.row_id===id)).toMatchObject({need_state:'QUANTITY_REQUIRED',quantity:'4'});
  const q=s.resources.find(x=>x.rowId===id)!.quantityParameterId!;await expect(acsWholeCompileR2({...acsWholeTrustedFixtureR2(),[q]:4})).rejects.toThrow();
 });
 test('manualincludedstock amendment preserves onepayment andprocurementowner; nofactoryguardPASS',async()=>{
  const id='low-current:expanded-roster:r1:factory:reader:contact-blocks',r=await acsWholeCompileR2(acsWholeTrustedFixtureR2(),{[id]:{quantity:'7',unitPrice:'10',includedInProcurement:true,provenance:{kind:'manual',reason:'VALIDATION_FIXTURE incomingstockcorrection'}}});expect(r.rows.find(x=>x.row_id===id)).toMatchObject({quantity:'7',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'4'}});expect(ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2.factorySupplyGuardPassed).toBe(false);
 });
 test('missingmandatoryfact remainsOBJECT_FACT_REQUIRED withmanualknownqty andnativeR5 independent',async()=>{
  const f=acsWholeTrustedFixtureR2(),s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2;delete f.acs_door_actual_egress_fire_release_r1;const r=await acsWholeCompileR2(f,{'rc09:acs_emergency_release':{quantity:'1',unitPrice:'10',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE quantitynotapproval'}}});expect(r.preliminaryNeeds.find(x=>x.row_id===s.scopeRowId)?.calculation_trace.scopeRequirementDecisionV1).toMatchObject({status:'OBJECT_FACT_REQUIRED'});expect(r.rows.concat(r.preliminaryNeeds).some(x=>x.row_id==='rc09:acs_system_install_commission')).toBe(true);
 });
 test('excludedsuppliedcomponent cannotcreateanothercostowner or clearrequiredphysicaluse',async()=>{
  const s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2,d=accessControlWholeDoorModelR2(s.profileId),id='reference:acs:whole-door:r2:emergency-key',r=await acsWholeCompileR2(acsWholeTrustedFixtureR2(),{[id]:{includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'VALIDATION_FIXTURE excludedcostnotphysicalN_A'}}});expect(d.resources.find(x=>x.row_id===id)?.resource_graph.purchaseBalanceOwnerRowId).toBe('rc09:acs_emergency_release');expect(r.rows.concat(r.preliminaryNeeds).find(x=>x.row_id===id)?.included_in_procurement).toBe(false);expect(s.resources.find(x=>x.rowId===id)?.operationIds).toContain('access-control:whole-operations:r1:commissioning');
 });
});


import {ACCESS_CONTROL_WHOLE_QUANTITY_SOURCE_R3,accessControlWholeDoorOrdinaryModelR3}from'../../src/lib/estimate/v4/accessControlSystemR1';
import {accessControlWholeDoorValidationFixtureR3,compileAccessControlWholeDoorValidationR3,prepareAccessControlWholeDoorQuantityConfigR3}from'../../scripts/estimate/r4a13/prepareS2724AccessControlSystemBalancedSuccessor';
import {auditCanonicalPublisherSuccessorOperationResourcesR1}from'../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';

describe('Existing whole ACS quantities R3 source-only authored UNRUN',()=>{
 const q=ACCESS_CONTROL_WHOLE_QUANTITY_SOURCE_R3,s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2,fix='reference:acs:whole-door:r2:controller-mount-fix',ph1='reference:acs:whole-door:r3:psu-ph1-driver';
 test('one complete door retains all18 operations and original49 needs, with a distinct PH1 tool and corrected labour kind',()=>{
  const m=accessControlWholeDoorOrdinaryModelR3(s.profileId);
  expect(s.operationRoster).toHaveLength(18);expect(s.resources.filter(r=>r.quantityUnknown)).toHaveLength(49);expect(m.resources).toHaveLength(132);
  expect(s.resources.find(r=>r.key==='loading-labor')?.resourceKind).toBe('LABOR');
  for(const old of s.currentParentModel.resources){const r=m.resources.find(x=>x.row_id===old.row_id)!;expect([r.row_id,r.unit_id,r.formula_id]).toEqual([old.row_id,old.unit_id,old.formula_id]);}
  expect(m.runtimeInput).toEqual({});expect(m.parameters.find(p=>p.parameter_id===q.mountMethodId)?.default_value).toBeNull();
  expect(m.resources.filter(r=>r.row_id===ph1)).toHaveLength(1);expect(m.resources.find(r=>r.row_id===ph1)?.resource_graph.purchaseBalanceOwnerRowId).toBe('rc09:labor:acs-device-install');
 });
 test('PH1 and SL are separate reusable stock; actual electrical posts drive both independently of labour hours',async()=>{
  const f=accessControlWholeDoorValidationFixtureR3();f.acs_whole_actual_electrical_posts_r2=2;f.acs_device_install_labor_h=99;
  const r=await compileAccessControlWholeDoorValidationR3(f),all=[...r.rows,...r.preliminaryNeeds];
  for(const rowId of [ph1,'low-current:expanded-roster:r1:acs:psu-insulated-driver'])expect(all.find(x=>x.row_id===rowId)?.quantity).toBe('2');
  const row=all.find(x=>x.row_id===ph1)!;expect(row.calculation_trace).toMatchObject({resourceGraph:{purchaseBalanceOwnerRowId:'rc09:labor:acs-device-install'}});
  const d=q.resourceDeclarations.find(x=>x.rowId===ph1)!;expect(d.operationIds).toEqual(['access-control:whole-operations:r1:psu','access-control:whole-operations:r1:commissioning']);
 });
 test('missing actual equipped posts never become one tool or a door multiplier',async()=>{
  const f=accessControlWholeDoorValidationFixtureR3();delete f.acs_whole_actual_electrical_posts_r2;
  const r=await compileAccessControlWholeDoorValidationR3(f);
  expect(r.preliminaryNeeds.find(x=>x.row_id===ph1)?.quantity).toBeNull();
  const carrier=r.preliminaryNeeds.find(x=>x.row_id===s.scopeRowId)!;expect(carrier.need_state).toBe('CONDITION_REQUIRED');
  expect(carrier.calculation_trace.resourceGraph.scopeRequirementDecisionV1).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining(['acs_whole_actual_electrical_posts_r2'])});
 });
 test('the two explicit factory-wall methods consume three screws and three dowels per installed controller, not per order',async()=>{
  for(const method of q.mountMethods){const f=accessControlWholeDoorValidationFixtureR3();f[q.mountMethodId]=method;f.acs_controller_retained_spare_piece=1;f.acs_controller_supplier_pack_size_piece=2;
   const r=await compileAccessControlWholeDoorValidationR3(f),all=[...r.rows,...r.preliminaryNeeds];expect(all.some(x=>x.row_id===fix)).toBe(false);
   for(const key of ['controller-screw3x25','controller-dowel6x30']){const source=s.resources.find(x=>x.key===key)!;expect(source).toMatchObject({installedConsumptionExpression:'3*acs_controller_count',installedConsumptionCondition:{parameterId:q.mountMethodId,values:q.mountMethods}});
    expect(all.find(x=>x.row_id===source.rowId)?.quantity).toBe('6');expect(source.costOwnerRowId).toBe('rc09:acs_controller');}
  }
 });
 test('unknown wall method retains the same additional-fixing need and condition even when its manual quantity is known',async()=>{
  const f=accessControlWholeDoorValidationFixtureR3();delete f[q.mountMethodId];
  const r=await compileAccessControlWholeDoorValidationR3(f,{[fix]:{quantity:'7',unitPrice:'9',provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY known fixing does not approve wall method'}}});
  expect(r.preliminaryNeeds.find(x=>x.row_id===fix)).toMatchObject({quantity:'7',unit_price:'9',need_state:'CONDITION_REQUIRED',calculation_trace:{unresolvedConditionParameterIds:expect.arrayContaining([q.mountMethodId])}});
  expect(s.resources.find(x=>x.rowId===fix)?.quantityParameterId).toBe('acs_whole_qty_controller_mount_fix_r2');
 });
 test('DIN, other walls and invented unknown enum values are unsupported rather than silently treated as factory-wall fixing',async()=>{
  for(const method of ['DIN_RAIL','OTHER_COMPLETE_METHOD','UNKNOWN'])await expect(compileAccessControlWholeDoorValidationR3({...accessControlWholeDoorValidationFixtureR3(),[q.mountMethodId]:method})).rejects.toThrow();
 });
 test('manual controller order changes delivered stock while installed controller count and factory fixing ownership remain separate',async()=>{
  const f=accessControlWholeDoorValidationFixtureR3(),before=JSON.stringify(f),r=await compileAccessControlWholeDoorValidationR3(f,{'rc09:acs_controller':{quantity:'4',provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY accepted new-controller order'}}}),all=[...r.rows,...r.preliminaryNeeds];
  for(const key of ['controller-screw3x25','controller-dowel6x30'])expect(all.find(x=>x.row_id===s.resources.find(x=>x.key===key)!.rowId)?.quantity).toBe('12');
  expect(r.parameters.acs_controller_count).toBe(1);expect(all.some(x=>x.row_id===fix)).toBe(false);expect(JSON.stringify(f)).toBe(before);
 });
 test('manual included PH1 amendments preserve reference quantities/prices but create no second billing or procurement',async()=>{
  const r=await compileAccessControlWholeDoorValidationR3(undefined,{[ph1]:{quantity:'7',unitPrice:'9',includedInProcurement:true,provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY counted stock correction'}}});
  expect(r.rows.find(x=>x.row_id===ph1)).toMatchObject({quantity:'7',unit_price:'9',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'1'}});
 });
 test('ordinary source projection does not turn unreviewed whole composition into publication or a PDF admission',()=>{
  const m=accessControlWholeDoorOrdinaryModelR3(s.profileId),r=auditCanonicalPublisherSuccessorOperationResourcesR1({resourceDefinitions:m.resources,independentComposition:q.independentComposition});
  expect(r.definitionAdmissionAllowed).toBe(false);expect(r.pdfAllowed).toBe(false);
  expect(r.issues.some(x=>x.code==='REQUIRED_RESOURCE_CLASS_WITHOUT_VISIBLE_ROWS')).toBe(true);expect(s.factorySupplyGuardPassed).toBe(false);
 });
 test('existing ordinary config rejects selected-pointer alias before any current-source or registry action',()=>{
  const ctx={referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',currentReleasePath:'SOURCE_TEST_ONLY_SAME',selectedCurrentReleasePath:'SOURCE_TEST_ONLY_SAME'}as Parameters<typeof prepareAccessControlWholeDoorQuantityConfigR3>[0];
  expect(()=>prepareAccessControlWholeDoorQuantityConfigR3(ctx)).toThrow('PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 });
 test('180mA readers require explicit reviewed external power and common GND, regardless of one-PSU or nominal12V fixture',()=>{
  const input=acsWholeDocumentFixtureR2();
  for(const patch of [{actualReaderExternalPowerAndGndReviewed:false},{readerPoweredFromControllerTerminals:true}])expect(assessAccessControlWholeDoorInputsR2({...input,...patch}).issues).toContain('EXTERNAL_READER_POWER_AND_COMMON_GND_REQUIRED_180MA_GT_100MA');
  expect(s.actualRecords.some(x=>x.id==='acs_whole_actual_reader_power_branch_r3')).toBe(true);
  expect(assessAccessControlWholeDoorInputsR2(input)).toMatchObject({sourceAdmission:false,estimateCompilationAllowed:false,executedWholeDoorPass:false,FULL:false});
 });
});

import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1}from'../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalRevisionCommitPayload}from'../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds}from'../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';

describe('ACS R4 exact persisted mandatory reader-power condition source residual UNRUN',()=>{
 const s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2,q=ACCESS_CONTROL_WHOLE_QUANTITY_SOURCE_R3,fact='acs_whole_actual_reader_power_branch_r3';
 async function persist(input:Record<string,unknown>){
  const compiled=await compileAccessControlWholeDoorValidationR3(input,{[s.scopeRowId]:{quantity:'1',unitPrice:'9',provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY quantity cannot approve external reader power'}}});
  const releaseId='ACS_SOURCE_TEST_ONLY_R4_RELEASE',definitionVersionId='ACS_SOURCE_TEST_ONLY_R4_DEFINITION';
  const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport:{definition_version_id:definitionVersionId,payload_sha256:'a'.repeat(64),decision:{independentCompletenessMap:q.independentComposition}}})!;
  const checksum=estimateDeterministicHash({...compiled.revisionProjection,operationCompositionEvidenceV1:evidence});
  const commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:q.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const saved={id:'ACS_SOURCE_TEST_ONLY_R4_REVISION',release_id:releaseId,definition_version_id:definitionVersionId,catalog_id:s.catalogId,checksum_sha256:checksum,input_parameters:compiled.parameters,amendment_contract:{parameterSources:commit.parameterSources}};
  const resources=JSON.parse(JSON.stringify([...compiled.rows,...canonicalArtifactPreliminaryNeeds(saved)]));
  return{compiled,saved,resources,gate:canonicalEstimateSavedOperationAcceptanceV1({revision:saved,resources})};
 }
 test('omitted external-reader-power record survives Core commit saved with manual known quantity and blocks PDF',async()=>{
  const input=accessControlWholeDoorValidationFixtureR3();delete input[fact];const before=JSON.stringify(input),r=await persist(input);
  const carrier=r.resources.find((x:{row_id:string})=>x.row_id===s.scopeRowId)!;
  expect(carrier).toMatchObject({quantity:'1',unit_price:'9',need_state:'CONDITION_REQUIRED',calculation_trace:{manualQuantityOverride:true,resourceGraph:{scopeRequirementDecisionV1:{status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([fact])}}}});
  expect(carrier.missing_parameter_ids).toContain(fact);expect(r.gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:s.scopeRowId});
  expect(r.gate.pdfAllowed).toBe(false);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(r.gate)).toThrow();expect(JSON.stringify(input)).toBe(before);
 });
 test('explicit TEST_ONLY reviewed external-power record clears only that condition in the immutable saved revision',async()=>{
  const input=accessControlWholeDoorValidationFixtureR3();input[fact]='TEST_ONLY reviewed Proxy3M external source/GND route; not actual design or autonomy proof';
  const r=await persist(input),carrier=r.resources.find((x:{row_id:string})=>x.row_id===s.scopeRowId)!;
  expect(carrier.calculation_trace.resourceGraph.scopeRequirementDecisionV1.missingObjectFactParameterIds).not.toContain(fact);
  expect(carrier.calculation_trace.unresolvedConditionParameterIds??[]).not.toContain(fact);
  expect(r.saved.input_parameters[fact]).toBe(input[fact]);expect(s.factorySupplyGuardPassed).toBe(false);
  expect(r.gate.pdfAllowed).toBe(false); // unrelated source/class/factory holds remain; positive power evidence is not whole PASS.
 });
});

import {accessControlWholePassageMeasuredModelR5,ACS_PASSAGE_MEASUREMENT_SOURCE_R5}from'../../src/lib/estimate/v4/accessControlSystemR1';
import {accessControlWholePassageValidationFixtureR5,compileAccessControlWholePassageValidationR5,prepareAccessControlWholePassageConfigR5}from'../../scripts/estimate/r4a13/prepareS2724AccessControlSystemBalancedSuccessor';
import {projectCanonicalEstimateParameterSessionSnapshot}from'../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';
import {canonicalEstimateRevisionRowFromStorage}from'../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';

function acsPassageRecordR5(value:unknown):Record<string,unknown>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('ACS_PASSAGE_EXPECTED_RECORD_R5');return value as Record<string,unknown>;}
describe('Existing whole ACS passage measured balance R5 mutable source UNRUN',()=>{
 const s=ACCESS_CONTROL_WHOLE_DOOR_SOURCE_R2,q=ACS_PASSAGE_MEASUREMENT_SOURCE_R5,scopeId=s.scopeRowId,massId='low-current:expanded-roster:r1:acs:thread-locker',paintId='low-current:expanded-roster:r1:acs:protective-paint',cableId='reference:acs:whole-door:r2:monitor-field-cable';
 async function saved(input:Record<string,unknown>){
  const compiled=await compileAccessControlWholePassageValidationR5(input,{[massId]:{quantity:'0.1',unitPrice:'9',includedInProcurement:true,provenance:{kind:'manual',reason:'TEST_ONLY manual material quantity cannot prove actual measured ledger or emergency release'}}});
  const releaseId='ACS_PASSAGE_TEST_ONLY_RELEASE',definitionVersionId='ACS_PASSAGE_TEST_ONLY_DEFINITION',evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport:{definition_version_id:definitionVersionId,payload_sha256:'e'.repeat(64),decision:{independentCompletenessMap:q.independentComposition}}})!,checksum=estimateDeterministicHash({...compiled.revisionProjection,operationCompositionEvidenceV1:evidence}),commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:q.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const revision={id:'ACS_PASSAGE_TEST_ONLY_REVISION',row_count:compiled.rows.length,release_id:releaseId,definition_version_id:definitionVersionId,catalog_id:s.catalogId,checksum_sha256:checksum,input_parameters:compiled.parameters,amendment_contract:{parameterSources:commit.parameterSources}},resources=JSON.parse(JSON.stringify([...compiled.rows,...canonicalArtifactPreliminaryNeeds(revision)]));return{compiled,revision,resources,gate:canonicalEstimateSavedOperationAcceptanceV1({revision,resources})};
 }
 test('fresh R867 whole61/36/36 and all physical IDs18operations single declared owners retained without another passage card',()=>{
  const old=accessControlWholeDoorOrdinaryModelR3(s.profileId),m=accessControlWholePassageMeasuredModelR5(s.profileId);expect(m.resources.map(r=>r.row_id)).toEqual(old.resources.map(r=>r.row_id));expect(s.operationRoster).toHaveLength(18);expect(q.nativeParentModel.parameters).toHaveLength(61);expect(q.nativeParentModel.formulas).toHaveLength(36);expect(q.nativeParentModel.resources).toHaveLength(36);expect(q.wholeOperationProgrammeR5.operationProgramme).toHaveLength(18);expect(q.wholeOperationProgrammeR5.benchMethod).toMatchObject({wholeDoorAcceptance:false,elapsedThirtyMinutesIsNotLabourNorm:true});for(const r of old.resources){const n=m.resources.find(x=>x.row_id===r.row_id)!;expect([n.unit_id,n.formula_id,n.category,n.procurement_eligible,n.inclusion_ast]).toEqual([r.unit_id,r.formula_id,r.category,r.procurement_eligible,r.inclusion_ast]);}for(const p of s.resources)expect(m.resources.find(r=>r.row_id===p.rowId)?.cost_owner_id).toBe(p.costOwnerRowId);expect(m.runtimeInput).toEqual({});
 });
 test('actual same-batch kg issue minus return computes compound and alternative paint separately without joint density or door rate',async()=>{
  const f=accessControlWholePassageValidationFixtureR5(),a=await compileAccessControlWholePassageValidationR5(f);expect([...a.rows,...a.preliminaryNeeds].find(r=>r.row_id===massId)?.quantity).toBe('0.005');expect([...a.rows,...a.preliminaryNeeds].some(r=>r.row_id===paintId)).toBe(false);const b=await compileAccessControlWholePassageValidationR5({...f,[s.retentionId]:'PROTECTIVE_PAINT'});expect([...b.rows,...b.preliminaryNeeds].find(r=>r.row_id===paintId)?.quantity).toBe('0.015');expect([...b.rows,...b.preliminaryNeeds].some(r=>r.row_id===massId)).toBe(false);
 });
 test('measured sensor cable adds real complete route service and ends in metres and never four conductors or factory tail',async()=>{
  const r=await compileAccessControlWholePassageValidationR5(),row=[...r.rows,...r.preliminaryNeeds].find(r=>r.row_id===cableId)!;expect(row.quantity).toBe('18.3');expect(row.unit_id).toBe('m');expect(row.included_in_procurement).toBe(false);expect(row.included_in_estimate).toBe(false);expect(acsPassageRecordR5(acsPassageRecordR5(row.calculation_trace).resourceGraph).purchaseBalanceOwnerRowId).toBe('rc09:acs_lock_cable');
 });
 test('all seven missing numeric measurements remain quantity UNKNOWN with known ledger and emergency records without inventing zeros',async()=>{
  const f=accessControlWholePassageValidationFixtureR5();for(const p of q.measurements)delete f[p.id];const r=await compileAccessControlWholePassageValidationR5(f);for(const id of[massId,cableId]){const need=r.preliminaryNeeds.find(n=>n.row_id===id)!;expect(need).toMatchObject({quantity:null,need_state:'QUANTITY_REQUIRED'});expect(acsPassageRecordR5(need.calculation_trace).unresolvedConditionParameterIds??[]).toEqual([]);}const scope=[...r.rows,...r.preliminaryNeeds].find(n=>n.row_id===scopeId)!;expect(acsPassageRecordR5(acsPassageRecordR5(scope.calculation_trace).resourceGraph).scopeRequirementDecisionV1).toMatchObject({status:'COMPLETED',missingObjectFactParameterIds:[]});const controller=r.rows.find(n=>n.row_id==='rc09:acs_controller')!,view=canonicalEstimateRevisionRowFromStorage(controller,null);expect(view).toMatchObject({quantity:'1',unitPrice:null,amount:null,priceSource:{kind:'UNPRICED'}});
 });
 test('return greater than issue and negative measured route rejected rather than clamp or silently change units',async()=>{
  const f=accessControlWholePassageValidationFixtureR5(),invalid={...f,acs_passage_actual_thread_locker_returned_kg_r5:'0.013'};await expect(compileAccessControlWholePassageValidationR5(invalid)).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});await expect(compileAccessControlWholePassageValidationR5(invalid,{[massId]:{quantity:'0.1',unitPrice:'9',provenance:{kind:'manual',reason:'TEST_ONLY known manual cannot hide invalid source balance'}}})).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});await expect(compileAccessControlWholePassageValidationR5({...f,acs_passage_actual_monitor_route_measured_m_r5:'-0.01'})).rejects.toThrow();await expect(compileAccessControlWholePassageValidationR5({...f,acs_whole_qty_monitor_field_cable_r2:18.3})).rejects.toThrow();
 });
 test('manual child quantity price and measured before-value persist without second bill or procurement',async()=>{
  const r=await saved(accessControlWholePassageValidationFixtureR5()),child=r.resources.find((x:{row_id:string})=>x.row_id===massId),prior=accessControlWholeDoorOrdinaryModelR3(s.profileId).resources.find(x=>x.row_id===massId)!;expect(child).toMatchObject({quantity:'0.1',unit_price:'9',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'0.005',resourceGraph:{purchaseBalanceOwnerRowId:'rc09:acs_consumable'}}});expect(child.normative_trace).toEqual(prior.source_metadata?.normativeTrace??[]);expect(child.calculation_trace.resourceGraph.sourceMeasuredQuantityR5).toMatchObject({sourceMethodSha256:q.projectMethod.sha256,originalSourceMetadata:prior.source_metadata});expect(r.gate.pdfAllowed).toBe(false);
 });
 test('missing actual emergency egress record survives Core commit saved manual material and refuses PDF with same mandatory ID',async()=>{
  const f=accessControlWholePassageValidationFixtureR5(),fact='acs_door_actual_egress_fire_release_r1';delete f[fact];const r=await saved(f),scope=r.resources.find((x:{row_id:string})=>x.row_id===scopeId)!;expect(scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([fact])});expect(r.gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:scopeId});expect(r.gate.pdfAllowed).toBe(false);
 });
 test('power cut without actual residual-force review remains unsupported condition with known quantities and source metadata',async()=>{
  const r=await saved({...accessControlWholePassageValidationFixtureR5(),[q.emergencyDecisionId]:'POWER_CUT_WITHOUT_FORCE_REVIEW'}),scope=r.resources.find((x:{row_id:string})=>x.row_id===scopeId)!;expect(scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([q.emergencyDecisionId])});expect(r.gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:scopeId});expect(r.gate.pdfAllowed).toBe(false);
 });
 test('TEST_ONLY reviewed emergency and ledger clear only those facts while external power source factory class and physical results remain held',async()=>{
  const r=await saved(accessControlWholePassageValidationFixtureR5()),scope=r.resources.find((x:{row_id:string})=>x.row_id===scopeId)!;expect(scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1).toMatchObject({status:'COMPLETED',missingObjectFactParameterIds:[]});expect(r.gate.issues).not.toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:scopeId});expect(r.gate.pdfAllowed).toBe(false);expect(q.physicalClosures).toBe(0);expect(q.wholeHandoffSealed).toBe(false);
 });
 test('cold common parameter session retains missing same-batch quantity ledger record and original stable scope identity',async()=>{
  const f=accessControlWholePassageValidationFixtureR5();delete f[q.quantityRecordId];const r=await saved(f),m=accessControlWholePassageMeasuredModelR5(s.profileId),args={requestedRevisionId:r.revision.id,definitionVersionId:r.revision.definition_version_id,parent:null,revision:{revisionId:r.revision.id,parentRevisionId:null,releaseId:r.revision.release_id,catalogId:s.catalogId,definitionVersionId:r.revision.definition_version_id,definitionVersion:6,status:'PRELIMINARY',parameters:r.compiled.parameters,userInputSnapshot:f,acceptedBaselineSnapshot:{},assumptionSnapshot:{},parameterSchemaHash:estimateDeterministicHash(m.parameters),compilerVersion:q.contract,checksumSha256:r.revision.checksum_sha256,createdAt:'TEST_ONLY',preliminaryNeeds:r.compiled.preliminaryNeeds.map(n=>({rowId:n.row_id,selected:false,missingParameterIds:n.missing_parameter_ids,quantity:n.quantity,needState:n.need_state,scopeRequirementDecision:acsPassageRecordR5(acsPassageRecordR5(n.calculation_trace).resourceGraph).scopeRequirementDecisionV1}))},catalog:{catalogId:s.catalogId,releaseId:r.revision.release_id,definitionVersion:6,professionalMetadata:{},orderedSpecificationBindings:[]}}as unknown as Parameters<typeof projectCanonicalEstimateParameterSessionSnapshot>[0];const cold=projectCanonicalEstimateParameterSessionSnapshot(JSON.parse(JSON.stringify(args)));expect(cold.revision.preliminaryNeeds?.find(x=>x.rowId===scopeId)?.missingParameterIds).toContain(q.quantityRecordId);
 });
 test('single quantity source owner is shared across its actual operations and old protected unknown IDs are retained',()=>{
  const m=accessControlWholePassageMeasuredModelR5(s.profileId),old=accessControlWholeDoorOrdinaryModelR3(s.profileId);for(const rule of q.quantityRules){const row=m.resources.find(r=>r.row_id===rule.rowId)!,prior=old.resources.find(r=>r.row_id===rule.rowId)!;expect(row.cost_owner_id).toBe(rule.costOwnerRowId);expect(row.procurement_eligible).toBe(false);expect(row.source_metadata).toEqual(prior.source_metadata);expect(acsPassageRecordR5(row.resource_graph.sourceMeasuredQuantityR5)).toMatchObject({sourceMethodSha256:q.projectMethod.sha256,originalSourceMetadata:prior.source_metadata,legacySourceMetadataSha256:estimateDeterministicHash(prior.source_metadata)});expect(m.parameters.find(p=>p.parameter_id===rule.originalQuantityParameterId)?.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');expect(m.resources.filter(r=>r.row_id===rule.rowId)).toHaveLength(1);}for(const spec of q.physicalToolSpecificationsR5){const row=m.resources.find(r=>r.row_id===spec.rowId)!;expect(row).toMatchObject({title_ru:spec.publicNameRu,cost_owner_id:spec.costOwnerRowId,unit_id:spec.unitId});expect(row.source_metadata).toEqual(old.resources.find(r=>r.row_id===spec.rowId)!.source_metadata);}expect(q.old49IdsRetained).toBe(true);
 });
 test('ordinary existing producer refuses selected pointer alias before registry mutation and does not add regulated alternative as another paid system',()=>{
  const ctx={referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',currentReleasePath:'SAME_TEST_ONLY',selectedCurrentReleasePath:'SAME_TEST_ONLY'}as Parameters<typeof prepareAccessControlWholePassageConfigR5>[0];expect(()=>prepareAccessControlWholePassageConfigR5(ctx)).toThrow('PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');const m=accessControlWholePassageMeasuredModelR5(s.profileId);expect(m.resources.filter(r=>r.row_id==='rc09:acs_power_supply')).toHaveLength(1);expect(m.resources.some(r=>/skat|new_ups/i.test(r.row_id))).toBe(false);expect(q.FULL).toBe(false);
 });
});
