import {canonicalEstimateStableJson}from'../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText}from'../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {
  CCTV_SYSTEM_ACCEPTANCE_INPUT,
  CCTV_SYSTEM_CATALOG_ID,
  CCTV_SYSTEM_FORMULAS,
  CCTV_SYSTEM_PARAMETERS,
  CCTV_SYSTEM_RESOURCES,
  CCTV_SYSTEM_RUNTIME_INPUT,
  CCTV_SYSTEM_SHORT_INPUT,
  compileCctvSystemR1,
} from "../../src/lib/estimate/v4/cctvSystemR1";

const CONDITIONAL = [
  "rc09:cctv_video_analytics_license",
  "rc09:cctv_external_integration_gateway",
] as const;

describe("S27.24 CCTV-system owner", () => {
  test("replaces area-derived generic rows with an exact CCTV owner", () => {
    expect(CCTV_SYSTEM_CATALOG_ID).toBe("canonical-work:expanded:CCTV_system");
    expect(CCTV_SYSTEM_PARAMETERS).toHaveLength(48);
    expect(CCTV_SYSTEM_FORMULAS).toHaveLength(33);
    expect(CCTV_SYSTEM_RESOURCES).toHaveLength(33);
    expect(CCTV_SYSTEM_RUNTIME_INPUT).toEqual({
      cctv_camera_retained_spare_piece: 0,
      cctv_camera_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(CCTV_SYSTEM_FORMULAS))
      .not.toMatch(/area_m2|\b432\b|electricalNetworkCalculator|golden_rate|normFactor/iu);
    expect(CCTV_SYSTEM_RESOURCES.map((row) => row.row_id))
      .toEqual(expect.not.arrayContaining([
        "rc09:access_control_system",
        "rc09:fire_alarm_system",
        "rc09:general_lan",
        "rc09:general_ups",
      ]));
  });

  test("known CCTV identity gives useful rows and local project needs", async () => {
    const compiled = await compileCctvSystemR1({ ...CCTV_SYSTEM_SHORT_INPUT });
    expect(compiled.rows).toHaveLength(11);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:cctv_system_install_commission", quantity: "1", unit_id: "system" }),
      expect.objectContaining({ row_id: "rc09:cctv_ip_camera", quantity: "16", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:cctv_nvr", quantity: "1", unit_id: "pcs" }),
      expect.objectContaining({ row_id: "rc09:cctv_camera_test", quantity: "16", unit_id: "test" }),
      expect.objectContaining({ row_id: "rc09:cctv_camera_register", quantity: "16", unit_id: "camera" }),
      expect.objectContaining({ row_id: "rc09:cctv-camera-balance:package-count", quantity: "16", unit_id: "package" }),
    ]));
    expect(compiled.preliminaryNeeds).toHaveLength(22);
  });

  test("compiles the thirty-one-row project fixture", async () => {
    const compiled = await compileCctvSystemR1({ ...CCTV_SYSTEM_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(31);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "rc09:cctv_camera_mounting_bracket", quantity: "16" }),
      expect.objectContaining({ row_id: "rc09:cctv_camera_junction_box", quantity: "16" }),
      expect.objectContaining({ row_id: "rc09:cctv_network_cable", quantity: "720" }),
      expect.objectContaining({ row_id: "rc09:cctv_patch_panel", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:cctv_poe_switch", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:cctv_storage_drive", quantity: "4" }),
      expect.objectContaining({ row_id: "rc09:cctv_monitor", quantity: "1" }),
      expect.objectContaining({ row_id: "rc09:cctv_termination", quantity: "32" }),
      expect.objectContaining({ row_id: "rc09:cctv_label", quantity: "32" }),
      expect.objectContaining({ row_id: "rc09:cctv_fastening", quantity: "120" }),
      expect.objectContaining({ row_id: "rc09:cctv_consumable", quantity: "6" }),
      expect.objectContaining({ row_id: "rc09:cctv_grounding_conductor", quantity: "18" }),
      expect.objectContaining({ row_id: "rc09:labor:cctv-camera-equipment-install", quantity: "64" }),
      expect.objectContaining({ row_id: "rc09:labor:cctv-cabling-termination", quantity: "96" }),
      expect.objectContaining({ row_id: "rc09:labor:cctv-configuration-commissioning", quantity: "48" }),
      expect.objectContaining({ row_id: "rc09:equipment:cctv-lifting", quantity: "24" }),
      expect.objectContaining({ row_id: "rc09:equipment:cctv-network-tester", quantity: "20" }),
      expect.objectContaining({ row_id: "rc09:logistics:cctv-delivery", quantity: "2" }),
      expect.objectContaining({ row_id: "rc09:logistics:cctv-packaging-removal", quantity: "1" }),
    ]));
  });

  test("separates installed cameras from rounded supplier procurement", async () => {
    const compiled = await compileCctvSystemR1({
      ...CCTV_SYSTEM_ACCEPTANCE_INPUT,
      cctv_camera_retained_spare_piece: 2,
      cctv_camera_supplier_pack_size_piece: 10,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("rc09:cctv-camera-balance:installed-net")?.quantity).toBe("16");
    expect(rows.get("rc09:cctv-camera-balance:retained-spare")?.quantity).toBe("2");
    expect(rows.get("rc09:cctv-camera-balance:total-need")?.quantity).toBe("18");
    expect(rows.get("rc09:cctv-camera-balance:package-count")?.quantity).toBe("2");
    expect(rows.get("rc09:cctv_ip_camera")?.quantity).toBe("20");
    expect(rows.get("rc09:cctv-camera-balance:remainder")?.quantity).toBe("4");
    expect(rows.get("rc09:cctv-camera-balance:surplus-beyond-spare")?.quantity).toBe("2");
  });

  test("keeps system, camera checks and records informational beside explicit labor", () => {
    for (const rowId of [
      "rc09:cctv_system_install_commission",
      "rc09:cctv_camera_test",
      "rc09:cctv_camera_register",
      "rc09:cctv_test_report",
    ]) {
      const row = CCTV_SYSTEM_RESOURCES.find((item) => item.row_id === rowId);
      expect(row?.resource_graph).toEqual(expect.objectContaining({
        costTreatment: "INFORMATIONAL_SCOPE",
      }));
    }
  });

  test("keeps analytics and external integration conditional", async () => {
    const compiled = await compileCctvSystemR1({
      ...CCTV_SYSTEM_ACCEPTANCE_INPUT,
      video_analytics_mode: "REQUIRED",
      video_analytics_license_designation: "Лицензия аналитики по проекту",
      video_analytics_license_quantity_piece: 16,
      external_integration_mode: "REQUIRED",
      external_integration_gateway_designation: "Шлюз интеграции по архитектуре",
      external_integration_gateway_quantity_piece: 1,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(33);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid quantities and unrelated identities", async () => {
    await expect(compileCctvSystemR1({
      ...CCTV_SYSTEM_SHORT_INPUT,
      cctv_camera_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileCctvSystemR1(
      { ...CCTV_SYSTEM_ACCEPTANCE_INPUT },
      { catalogId: `${CCTV_SYSTEM_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("CCTV_SYSTEM_CATALOG_UNSUPPORTED");
  });
});

import {CCTV_G5_PROTECT_WHOLE_SOURCE_R1,CCTV_WHOLE_CHANNEL_SOURCE_R2,cctvG5ProtectWholeMethodModelR1,assessCctvWholeChannelInputsR2}from'../../src/lib/estimate/v4/cctvSystemR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput}from'../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash}from'../../src/lib/estimate/estimateDeterministicHash';

function cctvSourceCompatibilityFixture(){
 return {bindingChannel:'SERVER_REVIEWED_PROJECT_RECORDS',methodId:CCTV_G5_PROTECT_WHOLE_SOURCE_R1.candidateMethodId,
  records:Object.fromEntries(CCTV_G5_PROTECT_WHOLE_SOURCE_R1.requiredActualRecords.map(f=>[f.id,'VALIDATION_FIXTURE:'+f.id])),
  sourceBindings:Object.fromEntries(CCTV_G5_PROTECT_WHOLE_SOURCE_R1.primarySources.filter(p=>p.sha256).map(p=>[p.path.replace('primary-sources/',''),p.sha256])),
  cameraModel:'UVC-G5-Turret-Ultra',recorderModel:'UNVR',switchModel:'USW-Lite-8-PoE',mountVariant:'C_SURFACE_ENTRY',
  baseFixingApproved:true,connectorGeometryApproved:true,cableModel:'UACC-Cable-Patch-Outdoor',factoryTerminated:true,grommet:'h',
  actualRouteEnvironmentApproved:true,nonCondensing:true,actualSupplyAndFailurePlanApproved:true,actualPoeLinkBudgetApproved:true,
  protectPlanApproved:true,networkPlanApproved:true,storagePlanApproved:true,actualTestProgramApproved:true,
  portAllocations:[{port:1,negotiatedStandardPoE:true,worstCasePseDemandW:4.5,reservedPseW:5}],
  measurements:{cameraCount:1,actualFreePoePorts:1,otherPseLoadW:0,assignedCameraPseLoadW:5,voltageAtCameraMinV:48,voltageAtCameraMaxV:54,
   routeRequiredLengthM:4.8,factoryPatchLengthM:5,cableDiameterMm:6.3,minimumInstalledBendMm:50.4,adjacentWallClearanceCm:60,
   cameraAmbientMinC:-30,cameraAmbientMaxC:50,switchAmbientMinC:-15,switchAmbientMaxC:40,recorderAmbientMinC:-5,recorderAmbientMaxC:40,driveCount:1}};
}
function cctvWholeDocumentFixtureR2(){const s=CCTV_WHOLE_CHANNEL_SOURCE_R2,b=cctvSourceCompatibilityFixture();
 return{...b,measurements:{...b.measurements,driveOperatingMinC:5,driveOperatingMaxC:50},profileId:s.profileId,allCameraFactoryPartsFromSelectedNewOrder:true,records:Object.fromEntries(s.actualRecords.map(x=>[x.id,'VALIDATION_FIXTURE:'+x.id])),sourceBindings:{...b.sourceBindings,...Object.fromEntries(s.primarySources.map(x=>[x.path.replace(/\\/g,'/').split('/').pop(),x.sha256]))},scope:'WHOLE_CAMERA_POE_NETWORK_RECORD_PLAYBACK_EXPORT',switchMount:'TABLE_A',driveModel:'UACC_HDD_E_8TB_35_SATA',driveFormFactor:'3_5',storageMode:'SINGLE_DRIVE_NO_REDUNDANCY_APPROVED',actualMountPosts:1,actualServicePosts:1,actualTestPosts:1,
 actualFactoryPieceAndLegacyMetreOwnerReviewed:true,actualNativeBracketBoxPanelEndsOverlapReviewed:true,actualSingleOwnerNoLanUpsRackDuplicateReviewed:true,actualLinkIqKitAndApplicationReviewed:true,actualSeparateCameraTerminalVoltageMethodReviewed:true,actualRecorderDiskRevisionAndHealthReviewed:true,actualUsableCapacityModeAndRetentionBoundaryReviewed:true,actualSceneDayNightPrivacyAudioAndClockReviewed:true,actualPlaybackSeekExportAndRecipientOpenReviewed:true,actualPowerFailureRecoveryAndGapProgrammeReviewed:true,actualBackupHandoverCleanupReviewed:true};
}
function cctvWholeTrustedFixtureR2(){const s=CCTV_WHOLE_CHANNEL_SOURCE_R2;
 return{...CCTV_SYSTEM_ACCEPTANCE_INPUT,cctv_system_count:1,cctv_camera_count:1,cctv_camera_type:'IP_POE_4MP_IR',cctv_nvr_count:1,cctv_poe_switch_quantity_piece:1,cctv_storage_drive_quantity_piece:1,cctv_camera_retained_spare_piece:0,cctv_camera_supplier_pack_size_piece:1,cctv_network_cable_length_m:5,cctv_archive_retention_days:7,
 ...Object.fromEntries(s.actualRecords.map(x=>[x.id,'VALIDATION_FIXTURE:'+x.id])),...Object.fromEntries(s.organisationalInputs.map(x=>[x.id,x.id==='cctv_whole_actual_factory_cord_length_m_r2'?5:x.min])),[s.decisionId]:'DOCUMENTED_COMPATIBLE',[s.markingId]:'HANDWRITTEN',[s.storageId]:'SINGLE_DRIVE_NO_REDUNDANCY_APPROVED'}as Record<string,unknown>;
}
function cctvWholeCompileR2(facts:Record<string,unknown>=cctvWholeTrustedFixtureR2(),rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={}){
 const d=cctvG5ProtectWholeMethodModelR1(CCTV_WHOLE_CHANNEL_SOURCE_R2.profileId);return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:'whole-cctv-r2.UNRUN_VALIDATION_FIXTURE',catalogId:CCTV_SYSTEM_CATALOG_ID,primaryMeasureParameterId:'cctv_system_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:{cctv_system_count:facts.cctv_system_count,cctv_camera_count:facts.cctv_camera_count,cctv_camera_type:facts.cctv_camera_type,cctv_nvr_count:facts.cctv_nvr_count,cctv_archive_retention_days:facts.cctv_archive_retention_days},confirmedParameters:facts,rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
}
describe('Whole CCTV R2 exact actualparent and sameexisting owner UNRUN',()=>{
 test('actual48/33 savedparent, nativeunits/owners/prices, explicit7constraints/3balanceAST,75source rows20ops',()=>{
  const s=CCTV_WHOLE_CHANNEL_SOURCE_R2,d=cctvG5ProtectWholeMethodModelR1(s.profileId);expect(d.resources).toHaveLength(109);expect(s.resources).toHaveLength(75);expect(s.operationRoster).toHaveLength(20);expect(s.parentProof.resultIndex).toBe(1);expect(s.parentProof.header).toMatchObject({definition_version:4,definition_sha256:'636e46fe6868f46c681c388a76935a56fc2aabede102347de178b70562bfe4f4'});
  for(const p of s.currentParentModel.parameters)expect(d.parameters.find(x=>x.parameter_id===p.parameter_id)).toEqual(s.nativeParameterForwards.find(x=>x.parameterId===p.parameter_id)?.after??p);
  for(const r of s.currentParentModel.resources){const x=d.resources.find(x=>x.row_id===r.row_id)!;expect([x.unit_id,x.formula_id,x.cost_owner_id,x.procurement_eligible]).toEqual([r.unit_id,r.formula_id,r.cost_owner_id,r.procurement_eligible]);expect(x.source_metadata).toMatchObject(r.source_metadata);}
  for(const f of s.currentParentModel.formulas){const x=d.formulas.find(x=>x.formula_id===f.formula_id)!,z=s.nativeFormulaForwards.find(x=>x.formulaId===f.formula_id);if(z){expect(x.expression_source).toBe(z.afterExpression);expect(x.ast_sha256).toBe(estimateDeterministicHash(x.ast));}else expect(x).toEqual(f);}
  expect(d.runtimeInput).toEqual({});expect(()=>cctvG5ProtectWholeMethodModelR1('BROAD_CCTV_DEFAULT')).toThrow('CCTV_EXPLICIT_INTERNAL_WHOLE_PROFILE_REQUIRED');
 });
 test('onefull source fixture still does not approveactualproject/recording/retention/price/unitmigration',()=>{
  expect(assessCctvWholeChannelInputsR2(cctvWholeDocumentFixtureR2())).toMatchObject({status:'DOCUMENT_INPUTS_PRESENT',sourceAdmission:false,projectApproval:false,documentAuthenticityAttested:false,estimateCompilationAllowed:false,physicalCompositionAccepted:false,executedVideoRecordingPass:false,executedRetentionProof:false,connectorTestIsWholeCctvPass:false,linkIqPassIsInstalledCableCertification:false,legacyCableUnitMigrationAdmitted:false,factorySupplyGuardPassed:false,fullBroadCctvAccepted:false,FULL:false});
 });
 test('normal1andboundary4camera actualport allocations fit oneLite8; fifthorotherload rejects',()=>{
  const f=cctvWholeDocumentFixtureR2();const four={...f,portAllocations:[1,2,3,4].map(port=>({port,negotiatedStandardPoE:true,worstCasePseDemandW:4.5,reservedPseW:13})),measurements:{...f.measurements,cameraCount:4,actualFreePoePorts:4,assignedCameraPseLoadW:52,otherPseLoadW:0}};
  expect(assessCctvWholeChannelInputsR2(four).status).toBe('DOCUMENT_INPUTS_PRESENT');expect(assessCctvWholeChannelInputsR2({...four,measurements:{...four.measurements,otherPseLoadW:0.01}}).status).toBe('BLOCKED');expect(assessCctvWholeChannelInputsR2({...four,measurements:{...four.measurements,cameraCount:5}}).status).toBe('BLOCKED');
 });
 test('actualroute/diameter/seal/bend/environment constraints are not waived by componentIPorcategory',()=>{
  const f=cctvWholeDocumentFixtureR2();for(const patch of [{grommet:'g'},{cameraModel:'GENERIC_IP66'},{connectorGeometryApproved:false},{actualRouteEnvironmentApproved:false}])expect(assessCctvWholeChannelInputsR2({...f,...patch}).status).toBe('BLOCKED');
  for(const measurements of [{...f.measurements,routeRequiredLengthM:5.001},{...f.measurements,cableDiameterMm:7.4},{...f.measurements,minimumInstalledBendMm:50.39},{...f.measurements,recorderAmbientMaxC:40.1},{...f.measurements,driveOperatingMinC:4.99}])expect(assessCctvWholeChannelInputsR2({...f,measurements}).status).toBe('BLOCKED');
 });
 test('selected3.5storage/actualdiskcount/protectionmode, rawcapacity isnot retention',()=>{
  const f=cctvWholeDocumentFixtureR2();expect(assessCctvWholeChannelInputsR2({...f,storageMode:'BASIC_PROTECTION_APPROVED'}).status).toBe('BLOCKED');expect(assessCctvWholeChannelInputsR2({...f,storageMode:'BASIC_PROTECTION_APPROVED',measurements:{...f.measurements,driveCount:2}}).status).toBe('DOCUMENT_INPUTS_PRESENT');expect(assessCctvWholeChannelInputsR2({...f,storageMode:'RAID10_APPROVED',measurements:{...f.measurements,driveCount:4}}).status).toBe('DOCUMENT_INPUTS_PRESENT');
  for(const p of [{driveFormFactor:'2_5'},{driveModel:'GENERIC12TB'},{storageMode:'UNKNOWN'}])expect(assessCctvWholeChannelInputsR2({...f,...p}).status).toBe('BLOCKED');
 });
 test('greenconnector/qualification/PoE/liveview/shortclip/plannedcount neverbecomesfullvideoarchiveproof',()=>{
  const f=cctvWholeDocumentFixtureR2();for(const k of ['connectorPassUsedAsVideoArchivePass','linkIqPassUsedAsCertification','liveViewUsedAsRecordingPass','shortClipUsedAsRetentionDays','rawTbOrRaidPercentUsedAsRetention','plannedCameraCountUsedAsExecutedPass'])expect(assessCctvWholeChannelInputsR2({...f,[k]:true}).issues).toContain('FALSE_VIDEO_ARCHIVE_RETENTION_PASS_FORBIDDEN');
 });
 test('all17 records survive malformed/stale/missingconditions despite manualqtyandprice',()=>{
  for(const value of [null,[],true,{},CCTV_SYSTEM_ACCEPTANCE_INPUT])expect(assessCctvWholeChannelInputsR2(value).status).toBe('BLOCKED');const f=cctvWholeDocumentFixtureR2();for(const r of CCTV_WHOLE_CHANNEL_SOURCE_R2.actualRecords){const records={...f.records};delete records[r.id];expect(assessCctvWholeChannelInputsR2({...f,records,manualQuantity:99,unitPrice:10}).missingActualRecordIds).toContain(r.id);}
  expect(assessCctvWholeChannelInputsR2({...f,sourceBindings:{...f.sourceBindings,'fluke-linkiq-r2-user-manual.pdf':'0'.repeat(64)}}).status).toBe('BLOCKED');
 });
 test('small1camera sourcefactory stock/cord/wholekit quantities andnativecablemetres remain distinct',async()=>{
  const r=await cctvWholeCompileR2(),a=[...r.rows,...r.preliminaryNeeds];for(const[id,q]of [['reference:cctv:factory:g5-i','4'],['reference:cctv:factory:g5-c','1'],['reference:cctv:factory:unvr-c','8'],['reference:cctv:whole:r2:factory-patch','1'],['reference:cctv:whole:r2:factory-cable-installed-m','5'],['reference:cctv:whole:r2:liq-remote','1']]as const)expect(a.find(x=>x.row_id===id)?.quantity).toBe(q);
  expect(a.find(x=>x.row_id==='rc09:cctv_network_cable')?.unit_id).toBe('m');expect(a.find(x=>x.row_id==='reference:cctv:whole:r2:factory-patch')).toMatchObject({unit_id:'pcs',included_in_procurement:false,procurement_eligible:false});expect(a.find(x=>x.row_id==='rc09:cctv_camera_test')?.quantity).toBe('1');
 });
 test('camera4doesnotcreatefourtoolkits; actualpost2setsactualsharedtoolsindependently',async()=>{
  const f=cctvWholeTrustedFixtureR2();f.cctv_camera_count=4;f.cctv_network_cable_length_m=20;f.cctv_whole_actual_mount_posts_r2=2;f.cctv_network_tester_machine_h=99;const r=await cctvWholeCompileR2(f),a=[...r.rows,...r.preliminaryNeeds];for(const k of ['pencil','drill','drill6','screwdriver','hammer'])expect(a.find(x=>x.row_id==='reference:cctv:method:'+k)?.quantity).toBe('2');expect(a.find(x=>x.row_id==='reference:cctv:method:network_measurement')?.quantity).toBe('1');expect(a.filter(x=>x.row_id==='reference:cctv:method:network_measurement')).toHaveLength(1);
 });
 test('sparepackmanualcameraorder drives stock andsamebalancehelpers butinstalledC remainsN',async()=>{
  const s=CCTV_WHOLE_CHANNEL_SOURCE_R2,f=cctvWholeTrustedFixtureR2();f.cctv_camera_count=3;f.cctv_camera_retained_spare_piece=1;f.cctv_camera_supplier_pack_size_piece=2;const r=await cctvWholeCompileR2(f,{'rc09:cctv_ip_camera':{quantity:'6',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE actualorder'}}}),a=[...r.rows,...r.preliminaryNeeds];expect(a.find(x=>x.row_id==='reference:cctv:factory:g5-i')?.quantity).toBe('24');expect(a.find(x=>x.row_id==='reference:cctv:whole:r2:factory-patch')?.quantity).toBe('3');expect(a.find(x=>x.row_id==='rc09:cctv-camera-balance:package-count')?.quantity).toBe('3');expect(a.find(x=>x.row_id==='rc09:cctv-camera-balance:remainder')?.quantity).toBe('3');expect(a.find(x=>x.row_id==='rc09:cctv-camera-balance:surplus-beyond-spare')?.quantity).toBe('2');expect(s.resources.find(x=>x.key==='g5-i')).toMatchObject({installedConsumptionExpression:'4*cctv_camera_count',samePhysicalIdNotNewOrder:true});
 });
 test('invalidpackmanual5 retainedraw butno false effectivefactory20screws',async()=>{
  const f=cctvWholeTrustedFixtureR2();f.cctv_camera_supplier_pack_size_piece=2;const r=await cctvWholeCompileR2(f,{'rc09:cctv_ip_camera':{quantity:'5',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE invalidquantum'}}}),a=[...r.rows,...r.preliminaryNeeds];expect(a.find(x=>x.row_id==='rc09:cctv_ip_camera')).toMatchObject({quantity:'5',calculation_trace:{manualPurchaseSupplyAssessmentV1:{blocked:true}}});expect(a.find(x=>x.row_id==='reference:cctv:factory:g5-i')?.quantity).not.toBe('20');
  await expect(cctvWholeCompileR2({...cctvWholeTrustedFixtureR2(),cctv_storage_drive_quantity_piece:1.5})).rejects.toThrow();
 });
 test('sourcealternatives suppliedstock notsimultaneouslyinstalled, 3.5one6-32peractualdrive notfour',()=>{
  const s=CCTV_WHOLE_CHANNEL_SOURCE_R2;for(const k of ['g5-d','g5-g','g5-k','g5-l','unvr-g','lite8-e','lite8-f','lite8-g'])expect(s.resources.find(x=>x.key===k)).toMatchObject({installedInSelectedC35TableA:false,stockStillDelivered:true});expect(s.resources.find(x=>x.key==='unvr-f')).toMatchObject({installedConsumptionExpression:'cctv_storage_drive_quantity_piece'});expect(s.resources.find(x=>x.key==='g5-h')).toMatchObject({installedConsumptionExpression:'cctv_camera_count'});
 });
 test('numericunknown livePDvoltagemeter remainsneedwithmanualqty, confirmednorminjectionrejects',async()=>{
  const id='reference:cctv:method:voltage_tester',r=await cctvWholeCompileR2(cctvWholeTrustedFixtureR2(),{[id]:{quantity:'1',unitPrice:'10',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE quantitynotmethodnorm'}}});expect(r.preliminaryNeeds.find(x=>x.row_id===id)).toMatchObject({need_state:'QUANTITY_REQUIRED',quantity:'1'});await expect(cctvWholeCompileR2({...cctvWholeTrustedFixtureR2(),cctv_method_qty_voltage_tester_r1:1})).rejects.toThrow();
 });
 test('missingretention/objectfact cannotbecleared by manualknownqtyorpriceddrive',async()=>{
  const s=CCTV_WHOLE_CHANNEL_SOURCE_R2,f=cctvWholeTrustedFixtureR2();delete f.cctv_whole_actual_retention_proof_r2;const r=await cctvWholeCompileR2(f,{'rc09:cctv_storage_drive':{quantity:'1',unitPrice:'100',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE qtynotretentionproof'}}});expect(cctvCheckedTraceR5(r.preliminaryNeeds.find(x=>x.row_id===s.scopeRowId)).scopeRequirementDecisionV1).toMatchObject({state:'OBJECT_FACT_REQUIRED'});
 });
 test('manualincludedfactorypart amendment no extraestimate/procurementowner',async()=>{
  const id='reference:cctv:factory:g5-i',r=await cctvWholeCompileR2(cctvWholeTrustedFixtureR2(),{[id]:{quantity:'7',unitPrice:'10',includedInProcurement:true,provenance:{kind:'manual',reason:'VALIDATION_FIXTURE incominginventoryamendment'}}});expect(r.rows.find(x=>x.row_id===id)).toMatchObject({quantity:'7',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'4'}});
 });
 test('handwrittenmarking doesnotrequireunusedprinterpost; selectedprinting requiresactualpositivepost',async()=>{
  const f=cctvWholeTrustedFixtureR2(),s=CCTV_WHOLE_CHANNEL_SOURCE_R2;delete f.cctv_whole_actual_print_posts_r2;const h=await cctvWholeCompileR2(f);expect([...h.rows,...h.preliminaryNeeds].some(x=>x.row_id==='reference:cctv:method:label_printer')).toBe(false);
  const p=await cctvWholeCompileR2({...f,[s.markingId]:'PRINTED'});expect(cctvCheckedTraceR5(p.preliminaryNeeds.find(x=>x.row_id===s.scopeRowId)).scopeRequirementDecisionV1).toMatchObject({state:'OBJECT_FACT_REQUIRED'});
  await expect(cctvWholeCompileR2({...f,[s.markingId]:'PRINTED',cctv_whole_actual_print_posts_r2:0})).rejects.toThrow();
 });
 test('knownlongerdays doesnotinventmoreHDDor archiveproof; sourcecommonfactoryguard remainsnotpassed',async()=>{
  const f=cctvWholeTrustedFixtureR2();f.cctv_archive_retention_days=90;const r=await cctvWholeCompileR2(f),a=[...r.rows,...r.preliminaryNeeds];expect(a.find(x=>x.row_id==='rc09:cctv_storage_drive')?.quantity).toBe('1');expect(CCTV_WHOLE_CHANNEL_SOURCE_R2.factorySupplyGuardPassed).toBe(false);expect(assessCctvWholeChannelInputsR2({...cctvWholeDocumentFixtureR2(),shortClipUsedAsRetentionDays:true}).executedRetentionProof).toBe(false);
 });
});

import {CCTV_WHOLE_QUANTITY_SOURCE_R3,cctvWholeOrdinaryQuantityModelR3,assessCctvWholeInlineInputsR3}from'../../src/lib/estimate/v4/cctvSystemR1';
import {cctvWholeQuantityValidationFixtureR3,compileCctvWholeQuantityValidationR3,prepareCctvWholeQuantityConfigR3}from'../../scripts/estimate/r4a13/prepareS2724CctvSystemBalancedSuccessor';
import {auditCanonicalPublisherSuccessorOperationResourcesR1}from'../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences}from'../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1}from'../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalRevisionCommitPayload}from'../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds}from'../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {projectCanonicalEstimateParameterSessionSnapshot,assertCanonicalEstimateParameterSessionSnapshotIdentity}from'../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';

describe('Existing whole CCTV quantities R3 source-only authored UNRUN',()=>{
 const s=CCTV_WHOLE_CHANNEL_SOURCE_R2,q=CCTV_WHOLE_QUANTITY_SOURCE_R3;
 function inlineDocs(){return{...cctvWholeDocumentFixtureR2(),inlineMethod:q.methodValue,inlineMode:'I',inlineTopology:'EXISTING_CAMERA_FIELD_CORD_TO_PSE_PORT_ONE_EXTRA_FACTORY_LEAD_TO_ACTUAL_CAMERA',actualInlinePosts:1,actualPseFirstCheckReviewed:true,actualExtraLeadAndMeasurementPlaneReviewed:true,actualUncertaintyAndCameraTerminalEnvelopeReviewed:true,actualShieldAndEarthPathReviewed:true,actualDryIsolationAndSupportedMeterReviewed:true,actualSealRestorationAndFinalLinkRetestReviewed:true,actualMeterRevisionSerialConditionReviewed:true,inlineNonCondensing:true,inlineLeadModel:'UACC_CABLE_PATCH_OUTDOOR_1M_FACTORY',inlineLeadCategoryAtLeast5:true,actualCameraConnected:true,records:{...cctvWholeDocumentFixtureR2().records,[q.recordId]:'TEST_ONLY reviewed measurementplane/uncertainty/ground/seal'},sourceBindings:{...cctvWholeDocumentFixtureR2().sourceBindings,...Object.fromEntries(q.primaryPins.map(p=>[p.path.replace(/\\/g,'/').split('/').pop(),p.sha256]))},inlineMeasurements:{meterTemperatureMinC:0,meterTemperatureMaxC:50,meterHumidityMaxPercent:95,standardPoEMinV:48,standardPoEMaxV:54,modeCurrentMaxMa:150,modePowerMaxW:5,temporaryChannelLengthM:6}};}
 async function persist(input:Record<string,unknown>,manual=false){
  const compiled=await compileCctvWholeQuantityValidationR3(input,manual?{[q.meterRowId]:{quantity:'7',unitPrice:'9',includedInProcurement:true,provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY counted equipment cannot approve measurement method'}}}:{});
  const releaseId='CCTV_SOURCE_TEST_ONLY_RELEASE',definitionVersionId='CCTV_SOURCE_TEST_ONLY_DEFINITION',evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport:{definition_version_id:definitionVersionId,payload_sha256:'c'.repeat(64),decision:{independentCompletenessMap:q.independentComposition}}})!;
  const checksum=estimateDeterministicHash({...compiled.revisionProjection,operationCompositionEvidenceV1:evidence}),commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:q.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const saved={id:'CCTV_SOURCE_TEST_ONLY_REVISION',row_count:compiled.rows.length,release_id:releaseId,definition_version_id:definitionVersionId,catalog_id:s.catalogId,checksum_sha256:checksum,input_parameters:compiled.parameters,amendment_contract:{parameterSources:commit.parameterSources}},resources=JSON.parse(JSON.stringify([...compiled.rows,...canonicalArtifactPreliminaryNeeds(saved)]));return{compiled,saved,resources,gate:canonicalEstimateSavedOperationAcceptanceV1({revision:saved,resources})};
 }
 test('same actual R80948/33/33 parent retains20operations, native units/prices/owners and original32needIDs',()=>{
  const base=cctvG5ProtectWholeMethodModelR1(s.profileId),m=cctvWholeOrdinaryQuantityModelR3(s.profileId);expect(m.resources).toHaveLength(110);expect(s.operationRoster).toHaveLength(20);expect(s.resources.filter(x=>x.quantityUnknown)).toHaveLength(32);
  for(const r of base.resources){const a=m.resources.find(x=>x.row_id===r.row_id)!;expect([a.row_id,a.unit_id,a.formula_id,a.cost_owner_id,a.procurement_eligible]).toEqual([r.row_id,r.unit_id,r.formula_id,r.cost_owner_id,r.procurement_eligible]);}
  for(const f of base.formulas)if(f.formula_id!==q.meterFormulaId)expect(m.formulas.find(x=>x.formula_id===f.formula_id)).toEqual(f);
  expect(m.parameters.find(p=>p.parameter_id===q.originalNeedId)).toBeDefined();expect(m.runtimeInput).toEqual({});expect(validateIndependentCompletenessMapReferences({completenessMap:q.independentComposition,formulaDefinitions:m.formulas,resourceDefinitions:m.resources,requireOperationBindings:true})).toEqual([]);
 });
 test('one and two actually equipped inline posts supply one meter and added lead each, independent of cameras and paid hours',async()=>{
  for(const n of [1,2]){const f=cctvWholeQuantityValidationFixtureR3();f[q.postId]=n;f.cctv_camera_count=4;f.cctv_network_tester_machine_h=99;const r=await compileCctvWholeQuantityValidationR3(f),all=[...r.rows,...r.preliminaryNeeds];for(const id of [q.meterRowId,q.leadRowId])expect(all.find(x=>x.row_id===id)?.quantity).toBe(String(n));expect(all.filter(x=>x.row_id===q.meterRowId)).toHaveLength(1);}
 });
 test('missing equipped post remains numeric UNKNOWN and mandatory object fact; never default one per camera',async()=>{
  const f=cctvWholeQuantityValidationFixtureR3();delete f[q.postId];const r=await compileCctvWholeQuantityValidationR3(f);for(const id of [q.meterRowId,q.leadRowId])expect(r.preliminaryNeeds.find(x=>x.row_id===id)?.quantity).toBeNull();
  expect(cctvCheckedGraphR5(r.preliminaryNeeds.find(x=>x.row_id===s.scopeRowId)).scopeRequirementDecisionV1).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([q.postId])});
 });
 test('zero, fractional equipped posts and unsupported inline method are rejected rather than rounded or treated as selected',async()=>{
  for(const n of [0,1.5,-1])await expect(compileCctvWholeQuantityValidationR3({...cctvWholeQuantityValidationFixtureR3(),[q.postId]:n})).rejects.toThrow();
  for(const method of ['UNKNOWN','LINKIQ_AS_ACTUAL_CAMERA_INLINE','PASSIVE_N_MODE'])await expect(compileCctvWholeQuantityValidationR3({...cctvWholeQuantityValidationFixtureR3(),[q.methodId]:method})).rejects.toThrow();
 });
 test('manual counted meter retains raw amendment and one owner with no second billing or procurement',async()=>{
  const r=await persist(cctvWholeQuantityValidationFixtureR3(),true),meter=r.resources.find((x:{row_id:string})=>x.row_id===q.meterRowId)!;
  expect(meter).toMatchObject({quantity:'7',unit_price:'9',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'1',resourceGraph:{purchaseBalanceOwnerRowId:q.ownerRowId}}});expect(r.resources.filter((x:{row_id:string})=>x.row_id===q.leadRowId)).toHaveLength(1);
 });
 test('old unknown quantity input is not a confirmed norm and cannot select an inline method',async()=>{
  await expect(compileCctvWholeQuantityValidationR3({...cctvWholeQuantityValidationFixtureR3(),[q.originalNeedId]:1})).rejects.toThrow();
  const f=cctvWholeQuantityValidationFixtureR3();delete f[q.methodId];const r=await persist(f,true);expect(cctvCheckedRecordR5(cctvCheckedGraphR5(r.resources.find((x:{row_id:string})=>x.row_id===s.scopeRowId)).scopeRequirementDecisionV1).missingObjectFactParameterIds).toContain(q.methodId);
 });
 test('reviewed source fixture has no executed power/video/archive or technical acceptance',()=>{
  expect(assessCctvWholeInlineInputsR3(inlineDocs())).toMatchObject({status:'DOCUMENT_INPUTS_PRESENT',sourceAdmission:false,estimateCompilationAllowed:false,executedInlinePowerPass:false,executedVideoRecordingPass:false,executedRetentionProof:false,FULL:false});
 });
 test('outdoor wet, unknown shield or uncertainty, unconnected camera and stale primary bytes cannot become a complete inline method',()=>{
  const f=inlineDocs();for(const patch of [{inlineNonCondensing:false},{actualShieldAndEarthPathReviewed:false},{actualUncertaintyAndCameraTerminalEnvelopeReviewed:false},{actualCameraConnected:false},{inlineMode:'T'},{inlineLeadModel:'GENERIC_CAT5'}])expect(assessCctvWholeInlineInputsR3({...f,...patch}).status).toBe('BLOCKED');
  for(const inlineMeasurements of [{...f.inlineMeasurements,meterTemperatureMinC:-0.01},{...f.inlineMeasurements,meterTemperatureMaxC:50.01},{...f.inlineMeasurements,modeCurrentMaxMa:990.01},{...f.inlineMeasurements,temporaryChannelLengthM:100}])expect(assessCctvWholeInlineInputsR3({...f,inlineMeasurements}).status).toBe('BLOCKED');
  expect(assessCctvWholeInlineInputsR3({...f,sourceBindings:{...f.sourceBindings,[q.primaryPins[0]!.path.replace(/\\/g,'/').split('/').pop()!]:'0'.repeat(64)}}).status).toBe('BLOCKED');
 });
 test('meter display, inline power, live view and short clip are not terminal voltage, certification or full recording retention',()=>{
  for(const key of ['meterDisplayUsedAsExactTerminalVoltage','inlinePassUsedAsRecordingRetentionPass','inlineMeterUsedAsCableCertification'])expect(assessCctvWholeInlineInputsR3({...inlineDocs(),[key]:true}).issues).toContain('INLINE_DISPLAY_OR_POWER_PASS_PROMOTION_FORBIDDEN');
  expect(assessCctvWholeInlineInputsR3({...inlineDocs(),shortClipUsedAsRetentionDays:true}).status).toBe('BLOCKED');
 });
 test('omitted inline measurement-plane record survives Core commit saved despite manually known meter quantity and blocks PDF',async()=>{
  const f=cctvWholeQuantityValidationFixtureR3();delete f[q.recordId];const r=await persist(f,true),scope=r.resources.find((x:{row_id:string})=>x.row_id===s.scopeRowId)!;
  expect(scope).toMatchObject({need_state:'CONDITION_REQUIRED',calculation_trace:{resourceGraph:{scopeRequirementDecisionV1:{status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([q.recordId])}}}});expect(r.gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:s.scopeRowId});expect(r.gate.pdfAllowed).toBe(false);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(r.gate)).toThrow();
 });
 test('cold parameter-session keeps same revision/catalog/schema and source condition without a second calculator',async()=>{
  const f=cctvWholeQuantityValidationFixtureR3();delete f[q.recordId];const r=await persist(f),m=cctvWholeOrdinaryQuantityModelR3(s.profileId),args={requestedRevisionId:r.saved.id,definitionVersionId:r.saved.definition_version_id,parent:null,
   revision:{revisionId:r.saved.id,parentRevisionId:null,releaseId:r.saved.release_id,catalogId:s.catalogId,definitionVersionId:r.saved.definition_version_id,definitionVersion:5,status:'PRELIMINARY',parameters:r.compiled.parameters,userInputSnapshot:f,acceptedBaselineSnapshot:{},assumptionSnapshot:{},parameterSchemaHash:estimateDeterministicHash(m.parameters),compilerVersion:q.contract,checksumSha256:r.saved.checksum_sha256,createdAt:'TEST_ONLY',preliminaryNeeds:r.compiled.preliminaryNeeds.map(n=>({rowId:n.row_id,selected:false,missingParameterIds:n.missing_parameter_ids,quantity:n.quantity,needState:n.need_state,scopeRequirementDecision:cctvCheckedGraphR5(n).scopeRequirementDecisionV1}))},
   catalog:{catalogId:s.catalogId,releaseId:r.saved.release_id,definitionVersion:5,professionalMetadata:{},orderedSpecificationBindings:[]}}as unknown as Parameters<typeof projectCanonicalEstimateParameterSessionSnapshot>[0];
  const cold=projectCanonicalEstimateParameterSessionSnapshot(JSON.parse(JSON.stringify(args)));expect(cold.revision.preliminaryNeeds?.find(x=>x.rowId===s.scopeRowId)?.missingParameterIds).toContain(q.recordId);expect(cold.revision.parameters[q.postId]).toBe(1);
  expect(()=>assertCanonicalEstimateParameterSessionSnapshotIdentity({...cold,definitionVersionId:'STALE_SOURCE_TEST_ONLY'},r.saved.id)).toThrow();
 });
 test('source-owned ordinary intake retains visible composition/factory/cable-owner holds and rejects selected-pointer alias',()=>{
  const m=cctvWholeOrdinaryQuantityModelR3(s.profileId),gate=auditCanonicalPublisherSuccessorOperationResourcesR1({resourceDefinitions:m.resources,independentComposition:q.independentComposition});expect(gate.definitionAdmissionAllowed).toBe(false);expect(gate.pdfAllowed).toBe(false);expect(gate.issues.some(x=>x.code==='REQUIRED_RESOURCE_CLASS_WITHOUT_VISIBLE_ROWS')).toBe(true);expect(s.factorySupplyGuardPassed).toBe(false);expect(s.legacyCableUnitMigrationAdmitted).toBe(false);
  const ctx={referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',currentReleasePath:'TEST_ONLY_SAME',selectedCurrentReleasePath:'TEST_ONLY_SAME'}as Parameters<typeof prepareCctvWholeQuantityConfigR3>[0];expect(()=>prepareCctvWholeQuantityConfigR3(ctx)).toThrow('PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 });
});

const cctvCheckedRecordR5=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('CCTV_R5_PRIOR_TEST_RECORD_REQUIRED');return value as Record<string,unknown>;};
const cctvCheckedTraceR5=(row:unknown)=>cctvCheckedRecordR5(cctvCheckedRecordR5(row).calculation_trace);
const cctvCheckedGraphR5=(row:unknown)=>cctvCheckedRecordR5(cctvCheckedTraceR5(row).resourceGraph);
import {CCTV_WHOLE_MEASURED_SOURCE_R5,cctvWholeMeasuredModelR5,assessCctvWholeMeasuredInputsR5}from'../../src/lib/estimate/v4/cctvSystemR1';
import {cctvWholeMeasuredValidationFixtureR5,compileCctvWholeMeasuredValidationR5,prepareCctvWholeMeasuredConfigR5}from'../../scripts/estimate/r4a13/prepareS2724CctvSystemBalancedSuccessor';
import {canonicalScopeRequirementDecisionV1}from'../../src/lib/estimate/backendPlatform/canonicalScopeRequirementV1';
import {ESTIMATE_PLATFORM_API_VERSION,type CanonicalEstimateRevisionView,type CanonicalEstimateCatalogItem}from'../../src/lib/estimate/backendPlatform/contracts';

describe('Existing whole CCTV measured R5 mutable source UNRUN',()=>{
 const s=CCTV_WHOLE_CHANNEL_SOURCE_R2,q=CCTV_WHOLE_MEASURED_SOURCE_R5;
 const record=(x:unknown):Record<string,unknown>=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('CCTV_R5_EXPECTED_RECORD');return x as Record<string,unknown>;};
 const scopeDecision=(row:unknown)=>canonicalScopeRequirementDecisionV1(record(record(record(row).calculation_trace).resourceGraph).scopeRequirementDecisionV1);
 const schemaType=(v:string):CanonicalEstimateCatalogItem['parameterSchema'][number]['valueType']=>{if(v==='decimal'||v==='integer'||v==='boolean'||v==='enum'||v==='text'||v==='array_object')return v;throw Error('CCTV_R5_EXISTING_SCHEMA_TYPE_REQUIRED:'+v);};
 const parameter=(part:string)=>{const m=q.measurements.find(x=>x.id.includes(part));if(!m)throw Error('CCTV_R5_EXACT_MEASUREMENT_REQUIRED:'+part);return m.id;};
 const find=(rows:readonly Record<string,unknown>[],id:string)=>{const r=rows.find(x=>x.row_id===id);if(!r)throw Error('CCTV_R5_ROW_REQUIRED:'+id);return r;};
 async function persist(input:Record<string,unknown>,rowOverrides:Parameters<typeof compileCctvWholeMeasuredValidationR5>[1]={}){
  const compiled=await compileCctvWholeMeasuredValidationR5(input,rowOverrides),releaseId='CCTV_R5_SOURCE_TEST_ONLY_RELEASE',definitionVersionId='CCTV_R5_SOURCE_TEST_ONLY_DEFINITION';
  // Exact SOURCE_TEST_ONLY passport payload of this same model definition; no DB passport/admission is claimed.
  const model=cctvWholeMeasuredModelR5(s.profileId),passportPayload={fixtureAuthority:'SOURCE_TEST_ONLY_SAME_MODEL_NOT_DB_PASSPORT',releaseId,definitionVersionId,catalogId:s.catalogId,parameterDefinitions:model.parameters,formulaDefinitions:model.formulas,resourceDefinitions:model.resources,independentCompletenessMap:q.independentComposition},passport={definition_version_id:definitionVersionId,payload_sha256:canonicalEstimateSha256HexText(canonicalEstimateStableJson(passportPayload)),decision:passportPayload};
  const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport});if(!evidence)throw Error('CCTV_R5_REAL_SOURCE_MAP_EVIDENCE_REQUIRED');
  expect(evidence.definitionVersionId).toBe(definitionVersionId);expect(evidence.sourcePassportPayloadSha256).toBe(canonicalEstimateSha256HexText(canonicalEstimateStableJson(passport.decision)));expect(evidence.independentComposition).toEqual(q.independentComposition);
  const checksum=estimateDeterministicHash({...compiled.revisionProjection,operationCompositionEvidenceV1:evidence}),commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:q.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const saved={id:'CCTV_R5_SOURCE_TEST_ONLY_REVISION',row_count:compiled.rows.length,release_id:releaseId,definition_version_id:definitionVersionId,catalog_id:s.catalogId,checksum_sha256:checksum,input_parameters:compiled.parameters,amendment_contract:{parameterSources:commit.parameterSources}},resources:Record<string,unknown>[]=[...compiled.rows,...canonicalArtifactPreliminaryNeeds(saved)];
  return{compiled,saved,resources,gate:canonicalEstimateSavedOperationAcceptanceV1({revision:saved,resources})};
 }
 test('fresh whole parent and all110 identities preserve native lineage unit price owner20operations and all old32needs',()=>{
  const base=cctvWholeOrdinaryQuantityModelR3(s.profileId),m=cctvWholeMeasuredModelR5(s.profileId);expect(m.resources).toHaveLength(110);expect(q.operationProgramme).toHaveLength(20);expect(q.old32NeedIds).toHaveLength(32);expect(q.old31HeldNeedIds).toHaveLength(31);expect(q.remainingHeldNeedIds).toHaveLength(26);
  expect(q.freshParent?.nativeParentModel).toEqual(s.currentParentModel);for(const row of base.resources){const next=m.resources.find(x=>x.row_id===row.row_id)!;expect([next.row_id,next.unit_id,next.formula_id,next.cost_owner_id,next.procurement_eligible]).toEqual([row.row_id,row.unit_id,row.formula_id,row.cost_owner_id,row.procurement_eligible]);expect(next.source_metadata).toEqual(row.source_metadata);}
  for(const id of q.old32NeedIds)expect(m.parameters.some(p=>p.parameter_id===id)).toBe(true);expect(validateIndependentCompletenessMapReferences({completenessMap:q.independentComposition,formulaDefinitions:m.formulas,resourceDefinitions:m.resources,requireOperationBindings:true})).toEqual([]);
 });
 test('actual disjoint route loops entries and issue return net waste determine six consumers independent of cameras and paid hours',async()=>{
  const f=cctvWholeMeasuredValidationFixtureR5(),r=await compileCctvWholeMeasuredValidationR5(f),all=[...r.rows,...r.preliminaryNeeds];expect(find(all,'reference:cctv:whole:r2:factory-cable-installed-m').quantity).toBe('5');expect(find(all,'reference:cctv:method:waste_mass').quantity).toBe('2');for(const rule of q.quantityRules.filter(x=>x.unitId==='pcs'))expect(find(all,rule.rowId).quantity).toBe('4');
  const changed=await compileCctvWholeMeasuredValidationR5({...f,cctv_camera_count:4,cctv_network_tester_machine_h:99,[q.quantityRecordId]:'SOURCE_TEST_ONLY four intact cords1+1+1+2m; no actual object'}),other=[...changed.rows,...changed.preliminaryNeeds];for(const rule of q.quantityRules)expect(find(other,rule.rowId).quantity).toBe(find(all,rule.rowId).quantity);expect(find(other,'reference:cctv:whole:r2:factory-patch').quantity).toBe('4');
 });
 test('small and zero consumed boundaries retain physical rows without rounding hiding or fabricated kits',async()=>{
  const f=cctvWholeMeasuredValidationFixtureR5();for(const x of q.measurements)f[x.id]=0;f[parameter('route_measured')]=0.1;f[parameter('installed_loops')]=0.8;f[parameter('installed_entries')]=0.1;f[q.quantityRecordId]='SOURCE_TEST_ONLY disjoint one intact1m cord and zero job consumables, not actual';const c=await compileCctvWholeMeasuredValidationR5(f),all=[...c.rows,...c.preliminaryNeeds];expect(find(all,'reference:cctv:whole:r2:factory-cable-installed-m').quantity).toBe('1');for(const rule of q.quantityRules.filter(x=>x.unitId!=='m'))expect(find(all,rule.rowId).quantity).toBe('0');expect(q.operationProgramme.every(o=>o.executionPass===false)).toBe(true);
 });
 test('missing numeric measurements remain QUANTITY_REQUIRED with known condition and separate unknown price not a new applicability refusal',async()=>{
  const f=cctvWholeMeasuredValidationFixtureR5();for(const m of q.measurements)delete f[m.id];const r=await persist(f);for(const rule of q.quantityRules)expect(r.compiled.preliminaryNeeds.find(x=>x.row_id===rule.rowId)).toMatchObject({need_state:'QUANTITY_REQUIRED',quantity:null,unit_price:null});
  const scope=find(r.resources,s.scopeRowId),decision=scopeDecision(scope);expect(decision).toMatchObject({status:'COMPLETED',missingObjectFactParameterIds:[]});expect(r.gate.issues).not.toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:s.scopeRowId});for(const p of cctvWholeMeasuredModelR5(s.profileId).parameters.filter(p=>q.measurements.some(m=>m.id===p.parameter_id)))expect(p.default_value).toBeNull();
 });
 test('return greater than issue tare greater than gross and negative or fractional counts reject before manual quantity can hide the contradiction',async()=>{
  for(const [issue,ret]of[['clean_cloth_issued','clean_cloth_unused_return'],['waste_bag_issued','waste_bag_unused_return'],['cable_label_issued','cable_label_unused_return'],['camera_label_issued','camera_label_unused_return'],['waste_gross','waste_tare']]as const){const f=cctvWholeMeasuredValidationFixtureR5();f[parameter(issue)]=1;f[parameter(ret)]=2;await expect(compileCctvWholeMeasuredValidationR5(f,{'reference:cctv:method:waste_mass':{quantity:'7',unitPrice:'9',provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY cannot hide negative balance'}}})).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});}
  for(const n of[-1,1.5])await expect(compileCctvWholeMeasuredValidationR5({...cctvWholeMeasuredValidationFixtureR5(),[parameter('waste_bag_issued')]:n})).rejects.toThrow();
 });
 test('missing measured ledger or shield interface survives Core commit saved with known manual amount and refuses PDF for the exact mandatory reason',async()=>{
  for(const id of[q.quantityRecordId,q.shieldRecordId,q.shieldMethodId]){const f=cctvWholeMeasuredValidationFixtureR5();delete f[id];const r=await persist(f,{'reference:cctv:method:waste_bag':{quantity:'7',unitPrice:'9',provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY not a real reviewed condition'}}}),scope=find(r.resources,s.scopeRowId);expect(scope).toMatchObject({need_state:'CONDITION_REQUIRED'});expect(scopeDecision(scope)).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([id])});expect(r.gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:s.scopeRowId});expect(r.gate.pdfAllowed).toBe(false);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(r.gate)).toThrow();}
 });
 test('explicit TEST_ONLY reviewed records clear only their condition while whole factory class source cost and actual programme holds stay open',async()=>{
  const r=await persist(cctvWholeMeasuredValidationFixtureR5());expect(scopeDecision(find(r.resources,s.scopeRowId))).toMatchObject({status:'COMPLETED',missingObjectFactParameterIds:[]});expect(r.gate.issues).not.toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:s.scopeRowId});expect(r.gate.pdfAllowed).toBe(false);const m=cctvWholeMeasuredModelR5(s.profileId),gate=auditCanonicalPublisherSuccessorOperationResourcesR1({resourceDefinitions:m.resources,independentComposition:q.independentComposition});expect(gate.definitionAdmissionAllowed).toBe(false);expect(s.factorySupplyGuardPassed).toBe(false);expect(s.legacyCableUnitMigrationAdmitted).toBe(false);for(const o of q.operationProgramme)expect(o).toMatchObject({actualResult:null,executionPass:false,sourceAndObjectApproval:false});
 });
 test('UNKNOWN applicability remains mandatory despite known quantities and an unsupported exact method never silently becomes the selected CCTV scheme',async()=>{
  // The existing whole-integer owner rejects unknown mandatory technology before commit/save.
  // Known manual quantity/price cannot supply that technology. Numeric-only UNKNOWN is the paired case above.
  for(const state of['UNKNOWN',undefined]){const f=cctvWholeMeasuredValidationFixtureR5();if(state===undefined)delete f[s.decisionId];else f[s.decisionId]=state;await expect(compileCctvWholeMeasuredValidationR5(f,{[s.scopeRowId]:{quantity:'7',unitPrice:'9',provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY known quantity and price do not resolve mandatory technology'}}})).rejects.toMatchObject({name:'CanonicalParameterValidationError',code:'PARAMETER_VALIDATION_FAILED',message:'conditional whole-integer condition unresolved cctv_method_effective_camera_stock_pcs'});}await expect(compileCctvWholeMeasuredValidationR5({...cctvWholeMeasuredValidationFixtureR5(),[CCTV_WHOLE_QUANTITY_SOURCE_R3.methodId]:'GENERIC_PASSIVE_POE'})).rejects.toThrow();await expect(compileCctvWholeMeasuredValidationR5({...cctvWholeMeasuredValidationFixtureR5(),cctv_camera_count:5})).rejects.toThrow();const off=await persist({...cctvWholeMeasuredValidationFixtureR5(),[q.shieldMethodId]:'LINKIQ_SHIELD_OFF_NOT_VERIFIED'},{[s.scopeRowId]:{quantity:'7',unitPrice:'9',provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY known qty does not turn Shield Test on'}}});expect(scopeDecision(find(off.resources,s.scopeRowId))).toMatchObject({status:'SCOPE_UNVERIFIED',missingObjectFactParameterIds:[]});expect(off.gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:s.scopeRowId});expect(off.gate.pdfAllowed).toBe(false);
 });
 test('manual measured material keeps raw saved quantity price before override and exactly one original billing procurement owner',async()=>{
  const id='reference:cctv:whole:r2:cable-label',r=await persist(cctvWholeMeasuredValidationFixtureR5(),{[id]:{quantity:'7',unitPrice:'9',includedInProcurement:true,provenance:{kind:'manual',reason:'SOURCE_TEST_ONLY retained measured-material amendment'}}});expect(find(r.resources,id)).toMatchObject({quantity:'7',unit_price:'9',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'4',resourceGraph:{purchaseBalanceOwnerRowId:'rc09:cctv_label'}}});expect(r.resources.filter(x=>x.row_id===id)).toHaveLength(1);for(const rule of q.quantityRules)expect(find(r.resources,rule.rowId).included_in_procurement).not.toBe(true);
 });
 test('cold same revision checksum and typed parameter session preserve missing condition and measured inputs without recompilation',async()=>{
  const f=cctvWholeMeasuredValidationFixtureR5();delete f[q.shieldRecordId];const r=await persist(f),m=cctvWholeMeasuredModelR5(s.profileId),coldSaved=record(JSON.parse(JSON.stringify(r.saved))),coldResources:Record<string,unknown>[]=JSON.parse(JSON.stringify(r.resources));expect(coldSaved.checksum_sha256).toBe(r.saved.checksum_sha256);expect(canonicalEstimateSavedOperationAcceptanceV1({revision:coldSaved,resources:coldResources}).issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:s.scopeRowId});
  const revision:CanonicalEstimateRevisionView={apiVersion:ESTIMATE_PLATFORM_API_VERSION,revisionId:r.saved.id,parentRevisionId:null,releaseId:r.saved.release_id,catalogId:s.catalogId,definitionVersionId:r.saved.definition_version_id,definitionVersion:5,revisionNumber:1,status:'ready',currencyCode:'KGS',parameters:r.compiled.parameters,userInputSnapshot:f,acceptedBaselineSnapshot:{},assumptionSnapshot:{},parameterSchemaHash:estimateDeterministicHash(m.parameters),amendmentContract:{rowOverrides:{},customRows:[],releaseMigration:null},totals:r.compiled.totals,rowCount:r.compiled.rows.length,checksumSha256:r.saved.checksum_sha256,compilerVersion:q.contract,createdAt:'SOURCE_TEST_ONLY',preliminaryNeeds:r.compiled.preliminaryNeeds.map(n=>{const decision=scopeDecision(n),modelRow=m.resources.find(x=>x.row_id===n.row_id);if(!modelRow)throw Error('CCTV_R5_COLD_ROW_SOURCE_REQUIRED');return{rowId:n.row_id,ordinal:n.ordinal,section:n.section,category:n.category,titleRu:n.title_ru,unitId:n.unit_id,quantity:n.quantity,unitPrice:n.unit_price,needState:n.need_state,missingParameterIds:n.missing_parameter_ids,selected:n.selected,procurementEligible:n.procurement_eligible,formulaId:modelRow.formula_id,needSha256:n.need_sha256,...(decision?{scopeRequirementDecision:decision}:{})};})};
  const catalog:CanonicalEstimateCatalogItem={catalogId:s.catalogId,releaseId:r.saved.release_id,namespace:'global',domain:'SOURCE_TEST_ONLY',workKey:'CCTV_system',titleRu:'Монтаж и наладка системы видеонаблюдения',definitionVersion:5,applicability:{},professionalMetadata:{},parameterSchema:m.parameters.map(p=>({parameterId:p.parameter_id,ordinal:p.ordinal,valueType:schemaType(p.value_type),unitId:p.unit_id,titleRu:p.title_ru,required:p.required,defaultValue:p.default_value,constraints:p.constraints_json??{}}))};
  const snapshot=projectCanonicalEstimateParameterSessionSnapshot({requestedRevisionId:r.saved.id,definitionVersionId:r.saved.definition_version_id,revision,parent:null,catalog});expect(snapshot.revision.parameters[parameter('route_measured')]).toBe(4);expect(snapshot.revision.preliminaryNeeds?.find(n=>n.rowId===s.scopeRowId)?.scopeRequirementDecision?.missingObjectFactParameterIds).toContain(q.shieldRecordId);expect(()=>assertCanonicalEstimateParameterSessionSnapshotIdentity({...snapshot,definitionVersionId:'STALE_SOURCE_TEST_ONLY'},r.saved.id)).toThrow();
 });
 test('same ordinary producer rejects pointer alias and retains formal registry capture source and all actual external owner holds',()=>{
  const context:Parameters<typeof prepareCctvWholeMeasuredConfigR5>[0]={parentReleaseId:'SOURCE_TEST_ONLY',parentSearchReleaseId:'SOURCE_TEST_ONLY',currentReleasePath:'SOURCE_TEST_ONLY_SAME',selectedCurrentReleasePath:'SOURCE_TEST_ONLY_SAME',referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',outputRoot:'SOURCE_TEST_ONLY',expectedBranch:'SOURCE_TEST_ONLY',masterPath:'SOURCE_TEST_ONLY',masterSha256:'SOURCE_TEST_ONLY',sourceRoot:'SOURCE_TEST_ONLY',capturedParentPath:'SOURCE_TEST_ONLY',capturedParentByteSha256:'SOURCE_TEST_ONLY',verifyTargetPrecondition:async()=>{throw Error('SOURCE_TEST_ONLY must not reach DB');}};expect(()=>prepareCctvWholeMeasuredConfigR5(context)).toThrow('PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');expect(q.sourceAdmission).toBe(false);expect(q.physicalClosures).toBe(0);expect(q.primaryPins.length).toBeGreaterThan(10);expect(q.remainingHeldNeedIds).toHaveLength(26);expect(q.quantityRules.every(rule=>rule.expression.indexOf('cctv_camera_count')<0)).toBe(true);
 });
 test('every whole operation keeps distinct result resources and no component PoE live view short clip or arithmetic balance is promoted to whole recording retention or certification',()=>{
  const ids=new Set(q.operationProgramme.map(o=>o.operationId));for(const id of['cctv:seal-connect','cctv:poe-network','cctv:test-instrument','cctv:record-playback','cctv:storage-health','cctv:night-scene','cctv:retention','cctv:power-fault','cctv:export','cctv:clean'])expect(ids.has(id)).toBe(true);for(const o of q.operationProgramme)expect(o.resourceRowIds.length).toBeGreaterThan(0);
  for(const key of['factoryCordCutToRoute','nativeMetresPromotedToSecondFactoryPieceOrder','cleaningClothUsedAsOpticApproval','defaultSurgeProtectorCountFromCameraCount'])expect(assessCctvWholeMeasuredInputsR5({[key]:true}).issues).toContain('CCTV_R5_PHYSICAL_SCOPE_OR_OWNER_PROMOTION_FORBIDDEN');for(const key of['issueLedgerUsedAsInstalledLabelMap','issuedBagCapacityUsedAsWasteMass','numericMeasurementsUsedAsProjectApproval'])expect(assessCctvWholeMeasuredInputsR5({[key]:true}).issues).toContain('CCTV_R5_BALANCE_IS_NOT_APPLICABILITY_OR_QA_PROOF');expect(assessCctvWholeMeasuredInputsR5({shieldTestMethod:'LINKIQ_SHIELD_OFF_NOT_VERIFIED',linkIqTestWhileCharging:true}).issues).toContain('CCTV_R5_EXPLICIT_SHIELD_TEST_AND_SEPARATE_PE_REVIEW_REQUIRED');expect(assessCctvWholeMeasuredInputsR5({meterDisplayUsedAsExactTerminalVoltage:true})).toMatchObject({executedVideoRecordingPass:false,executedRetentionProof:false,sourceAdmission:false,FULL:false});
 });
});
