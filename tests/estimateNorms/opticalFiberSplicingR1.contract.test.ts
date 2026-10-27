import {
  OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
  OPTICAL_FIBER_SPLICING_CATALOG_ID,
  OPTICAL_FIBER_SPLICING_FORMULAS,
  OPTICAL_FIBER_SPLICING_PARAMETERS,
  OPTICAL_FIBER_SPLICING_RESOURCES,
  OPTICAL_FIBER_SPLICING_RUNTIME_INPUT,
  OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  compileOpticalFiberSplicingR1,
} from "../../src/lib/estimate/v4/opticalFiberSplicingR1";

const REQUIRED = [
  "rc09:optical_fiber_fusion_splice",
  "rc09:fiber_splice_heat_shrink_sleeve",
  "rc09:fiber_lint_free_wipe",
  "rc09:fiber_isopropyl_cleaner",
  "rc09:fiber_splice_identification_marker",
  "rc09:fiber_fusion_splicer",
  "rc09:optical_time_domain_reflectometer",
  "rc09:fiber_otdr_measurement_protocol",
] as const;
const CONDITIONAL = ["rc09:fiber_pigtail", "rc09:fiber_splice_tray"] as const;
const DIRECT_RESOURCE_NEEDS = [
  "fiber:labor:splicing", "fiber:labor:testing",
  "fiber:logistics:delivery", "fiber:logistics:waste-removal",
] as const;
const MINIMUM_REAL_QUANTITY_NEEDS = Object.freeze({
  "rc09:fiber_lint_free_wipe": ["wipe_quantity_piece"],
  "rc09:fiber_isopropyl_cleaner": ["cleaner_volume_l"],
  "rc09:fiber_splice_identification_marker": ["marker_quantity_piece"],
  "rc09:fiber_fusion_splicer": ["fusion_splicer_shift"],
  "rc09:optical_time_domain_reflectometer": ["otdr_shift"],
});

describe("MASTER optical-fiber splicing owner", () => {
  test("uses the distinct fiber owner without importing historical scalar rates", () => {
    expect(OPTICAL_FIBER_SPLICING_CATALOG_ID)
      .toBe("canonical-work:expanded:fiber_optic_connection");
    expect(OPTICAL_FIBER_SPLICING_PARAMETERS).toHaveLength(26);
    expect(OPTICAL_FIBER_SPLICING_FORMULAS).toHaveLength(21);
    expect(OPTICAL_FIBER_SPLICING_RESOURCES).toHaveLength(21);
    expect(OPTICAL_FIBER_SPLICING_RUNTIME_INPUT).toEqual({
      sleeve_expected_waste_piece: 0,
      sleeve_retained_spare_piece: 0,
      sleeve_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(OPTICAL_FIBER_SPLICING_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|splice_count\s*\*\s*(?:2|0\.004|0\.12|0\.08|0\.05)/iu);
    expect(OPTICAL_FIBER_SPLICING_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:fiber_optic_cable_route",
        "rc09:optical_distribution_frame",
        "rc09:server_cabinet",
      ]));
  });

  test("known count gives splice work and one attenuation record per fiber plus local needs", async () => {
    const compiled = await compileOpticalFiberSplicingR1({
      ...OPTICAL_FIBER_SPLICING_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "48", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "48", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "48", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        ...REQUIRED.slice(2, 7), ...CONDITIONAL, ...DIRECT_RESOURCE_NEEDS,
      ]));
    expect(compiled.preliminaryNeeds).toHaveLength(11);
    for (const [rowId, missingParameterIds] of Object.entries(MINIMUM_REAL_QUANTITY_NEEDS)) {
      expect(compiled.preliminaryNeeds.find((need) => need.row_id === rowId)
        ?.missing_parameter_ids).toEqual(missingParameterIds);
    }
  });

  test("compiles the evidence-bound fixture with labor and logistics", async () => {
    const compiled = await compileOpticalFiberSplicingR1({
      ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(19);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "48", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "96", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "0.2", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "1.5", unit_id: "shift" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "1", unit_id: "shift" }),
      expect.objectContaining({ row_id: "fiber:labor:splicing", quantity: "18" }),
      expect.objectContaining({ row_id: "fiber:labor:testing", quantity: "8" }),
      expect.objectContaining({ row_id: "fiber:logistics:delivery", quantity: "1" }),
      expect.objectContaining({ row_id: "fiber:logistics:waste-removal", quantity: "1" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[0])?.included_in_estimate)
      .toBe(false);
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[7])?.included_in_estimate)
      .toBe(false);
  });

  test("separates installed sleeves, waste, reserve, packages, order and remainder", async () => {
    const compiled = await compileOpticalFiberSplicingR1({
      ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
      sleeve_expected_waste_piece: 1,
      sleeve_retained_spare_piece: 2,
      sleeve_supplier_pack_size_piece: 50,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("fiber:balance:installed-sleeves")?.quantity).toBe("48");
    expect(rows.get("fiber:balance:expected-waste")?.quantity).toBe("1");
    expect(rows.get("fiber:balance:retained-reserve")?.quantity).toBe("2");
    expect(rows.get("fiber:balance:total-need")?.quantity).toBe("51");
    expect(rows.get("fiber:balance:package-count")?.quantity).toBe("2");
    expect(rows.get(REQUIRED[1])?.quantity).toBe("100");
    expect(rows.get("fiber:balance:remainder-after-installation-waste")?.quantity).toBe("51");
    expect(rows.get("fiber:balance:surplus-beyond-reserve")?.quantity).toBe("49");
  });

  test("keeps pigtails and splice trays conditional", async () => {
    const compiled = await compileOpticalFiberSplicingR1({
      ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
      pigtail_mode: "REQUIRED",
      pigtail_designation: "Пигтейл OS2 LC/UPC по спецификации",
      pigtail_quantity_piece: 48,
      splice_tray_mode: "REQUIRED",
      splice_tray_designation: "Кассета на 24 сварки по спецификации",
      splice_tray_quantity_piece: 2,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(21);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileOpticalFiberSplicingR1({
      ...OPTICAL_FIBER_SPLICING_SHORT_INPUT,
      splice_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileOpticalFiberSplicingR1(
      { ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT },
      { catalogId: `${OPTICAL_FIBER_SPLICING_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("OPTICAL_FIBER_SPLICING_CATALOG_UNSUPPORTED");
  });
});

import {OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1,opticalFiberWholeSpliceMethodModelR1,assessOpticalFiberWholeSpliceMethodR1}
 from '../../src/lib/estimate/v4/opticalFiberSplicingR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';

/** Synthetic source-contract inputs, not an approved cable/object or field test. */
function opticalSourceFixture(){const s=OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1;
 return{bindingChannel:'SERVER_REVIEWED_PROJECT_RECORDS',methodId:s.candidateMethodId,records:Object.fromEntries(s.actualRecords.map(f=>[f.id,'VALIDATION_FIXTURE:'+f.id])),
  sourceBindings:Object.fromEntries(s.primarySources.filter(p=>p.sha256).map(p=>[p.path.replace('primary-sources/',''),p.sha256])),
  fiberStandard:'SM_G652D',splicerModel:'90S+',cleaverModel:'CT50',fiberGuide:'AD-10-M24',coatingStripper:'SS03',sleeveModel:'FP-03',
  actualCablePreparationApproved:true,actualWorkEnvironmentApproved:true,actualPowerPlanApproved:true,actualFullInstructionBound:true,actualCleaningMethodsApproved:true,
  actualSleeveTrayApproved:true,actualTestEquipmentApproved:true,actualQaProgramApproved:true,actualExternalConsumerScopeApproved:true,actualStockOwnershipApproved:true,
  measurements:{nominalCladdingUm:125,nominalCoatingUm:250,cleaveLengthMm:10,sleeveLengthMm:60,sleevePreShrinkDiameterMm:3,ambientMinC:-10,ambientMaxC:50,relativeHumidityMaxPct:95},
  actualHeaterProgrammeApproved:true,nonCondensing:true,otdrRequiredByProgramme:true,otdrModel:'OFP2-100-S',otdrPortPolish:'UPC',actualPortConnectorMatchApproved:true,
  launchTailSameFiberApproved:true,actualDeadZoneAndCompensationApproved:true,bidirectionalRequired:true,plannedDirections:['END1','END2'],insertionLossScope:'REQUIRED_SEPARATE_OWNER',
  externalInsertionLossOwnerId:'VALIDATION_FIXTURE separate existing line acceptance owner',actualOltsMethodApproved:true};
}
function opticalTrustedFixture(){const s=OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1;
 return{...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,...Object.fromEntries(s.actualRecords.map(f=>[f.id,'VALIDATION_FIXTURE:'+f.id])),[s.decisionId]:'DOCUMENTED_COMPATIBLE',
  [s.externalQaScopeParameterId]:'NOT_REQUIRED_BY_APPROVED_ATOMIC_PROGRAMME',[s.stock.quantityParameterId]:1} as Record<string,unknown>;
}
function opticalSourceCompile(confirmedParameters:Record<string,unknown>=opticalTrustedFixture(),rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={},count=48){
 const d=opticalFiberWholeSpliceMethodModelR1();
 return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',compilerVersion:'optical-whole-source-r1.UNRUN_VALIDATION_FIXTURE',
  catalogId:OPTICAL_FIBER_SPLICING_CATALOG_ID,primaryMeasureParameterId:'splice_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
  submittedParameters:{splice_count:count,fiber_standard:'SM_G652D'},confirmedParameters:{...confirmedParameters,splice_count:count},rowOverrides,currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
}

describe('Whole compatible atomic fiber splice source: current body and honest external QA',()=>{
 test('uses actual R688 current body21identities/AST/owners and declares74positions without a route/ODF/newclosure',()=>{
  const s=OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1,d=opticalFiberWholeSpliceMethodModelR1();expect(d.resources).toHaveLength(74);expect(new Set(d.resources.map(x=>x.row_id)).size).toBe(74);
  expect(s.parentProof.header).toMatchObject({definition_version_id:'8a87a295-34a2-5658-ae6c-1bcf09d69632',definition_version:5,definition_sha256:'743f7805ad1750ecbb2d452cf8d5e7a207bed7683f07bad727a6727cb5fcdf52'});
  for(const row of s.currentParentModel.resources){const n=d.resources.find(x=>x.row_id===row.row_id)!;expect([n.unit_id,n.formula_id,n.cost_owner_id,n.procurement_eligible]).toEqual([row.unit_id,row.formula_id,row.cost_owner_id,row.procurement_eligible]);}
  for(const f of s.currentParentModel.formulas)expect(d.formulas.find(x=>x.formula_id===f.formula_id)).toEqual(f);
  expect(d.runtimeInput).toEqual({});expect(s.lineRouteOdfCabinetAndNewClosureIncluded).toBe(false);expect(s.operationRoster).toHaveLength(14);
 });
 test('a compatible source fixture still grants no project/source/estimate/execution or full-line acceptance',()=>{
  expect(assessOpticalFiberWholeSpliceMethodR1(opticalSourceFixture())).toMatchObject({status:'COMPATIBILITY_INPUTS_PRESENT',sourceAdmission:false,estimateCompilationAllowed:false,
   documentAuthenticityAttested:false,projectApproval:false,executionPass:false,fullLinePass:false,lineRouteOrOdfScopeAccepted:false,FULL:false});
 });
 test('unknown technology, malformed facts and stale exact source bytes remain blocked',()=>{
  for(const x of [null,[],true,{records:[]},OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT])expect(assessOpticalFiberWholeSpliceMethodR1(x).status).toBe('BLOCKED');
  const f=opticalSourceFixture();expect(assessOpticalFiberWholeSpliceMethodR1({...f,sourceBindings:{...f.sourceBindings,'fujikura90splus-kit-fr-2403-0077-11.pdf':'0'.repeat(64)}}).issues)
   .toContain('EXACT_PRIMARY_BINDING_REQUIRED:fujikura90splus-kit-fr-2403-0077-11.pdf');
  const records={...f.records};delete records[OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1.actualRecords[1]!.id];
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,records,manualCount:48,manualPrice:100}).missingActualRecordIds).toHaveLength(1);
 });
 test('whole CT50method does not inherit every80–150um capability of its splicer',()=>{
  const f=opticalSourceFixture();expect(assessOpticalFiberWholeSpliceMethodR1({...f,measurements:{...f.measurements,nominalCladdingUm:80}}).issues).toContain('CT50_WHOLE_METHOD_REQUIRES_125UM_CLADDING');
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,splicerModel:'90R12'}).status).toBe('BLOCKED');
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,fiberStandard:'MM_G651'}).status).toBe('BLOCKED');
 });
 test('shared cleave interval is5–16mm for250um with short-length conditions and10–16mm for900um',()=>{
  const f=opticalSourceFixture();
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,measurements:{...f.measurements,cleaveLengthMm:5},cleaverShortLengthHeightAdjustmentApproved:true}).status).toBe('COMPATIBILITY_INPUTS_PRESENT');
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,measurements:{...f.measurements,cleaveLengthMm:5}}).issues).toContain('SHORT_CLEAVE_REQUIRES_APPLICABLE_COATING_AND_HEIGHT_ADJUSTMENT');
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,measurements:{...f.measurements,nominalCoatingUm:900,cleaveLengthMm:10}}).status).toBe('COMPATIBILITY_INPUTS_PRESENT');
  for(const [coat,length]of [[900,9.99],[250,16.01],[250,4.99]])expect(assessOpticalFiberWholeSpliceMethodR1({...f,cleaverShortLengthHeightAdjustmentApproved:true,measurements:{...f.measurements,nominalCoatingUm:coat,cleaveLengthMm:length}}).status).toBe('BLOCKED');
 });
 test('actual protection/heat programme matters and60mm is not a complete arbitrarytray proof',()=>{
  const f=opticalSourceFixture();expect(assessOpticalFiberWholeSpliceMethodR1({...f,sleeveModel:'FP-03(L=40)',measurements:{...f.measurements,sleeveLengthMm:40}}).status).toBe('COMPATIBILITY_INPUTS_PRESENT');
  for(const patch of [{sleeveModel:'any60mm'},{actualSleeveTrayApproved:false},{actualHeaterProgrammeApproved:false},{actualFullInstructionBound:false}])expect(assessOpticalFiberWholeSpliceMethodR1({...f,...patch}).status).toBe('BLOCKED');
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,measurements:{...f.measurements,sleevePreShrinkDiameterMm:6.01}}).status).toBe('BLOCKED');
 });
 test('environment/power/cleaning evidence cannot be replaced by nominal performance figures',()=>{
  const f=opticalSourceFixture();for(const patch of [{nonCondensing:false},{actualPowerPlanApproved:false},{actualCleaningMethodsApproved:false}])expect(assessOpticalFiberWholeSpliceMethodR1({...f,...patch}).status).toBe('BLOCKED');
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,measurements:{...f.measurements,ambientMaxC:50.01}}).status).toBe('BLOCKED');
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,cycleSeconds:7,bladeLife:60000,electrodeLife:5000,records:{}}).status).toBe('BLOCKED');
 });
 test('OTDR needs actual port/fiber/compensation and both planned directions when required',()=>{
  const f=opticalSourceFixture();for(const patch of [{otdrPortPolish:'APC'},{launchTailSameFiberApproved:false},{actualDeadZoneAndCompensationApproved:false},{plannedDirections:['END1']}])expect(assessOpticalFiberWholeSpliceMethodR1({...f,...patch}).status).toBe('BLOCKED');
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,splicerEstimatedLossDb:0.02,actualQaProgramApproved:false}).status).toBe('BLOCKED');
 });
 test('required insertion loss has an actual separate owner/method; OTDR estimate cannot replace it',()=>{
  const f=opticalSourceFixture();for(const patch of [{externalInsertionLossOwnerId:''},{externalInsertionLossOwnerId:OPTICAL_FIBER_SPLICING_CATALOG_ID},{actualOltsMethodApproved:false}])expect(assessOpticalFiberWholeSpliceMethodR1({...f,...patch}).issues).toContain('REQUIRED_INSERTION_LOSS_EXTERNAL_OWNER_AND_METHOD');
  expect(assessOpticalFiberWholeSpliceMethodR1({...f,insertionLossScope:'NOT_REQUIRED_BY_APPROVED_ATOMIC_PROGRAMME',actualOltsMethodApproved:false,externalInsertionLossOwnerId:''}).status).toBe('COMPATIBILITY_INPUTS_PRESENT');
 });
 test('one real toolkit over1.5paidshifts does not become48kits or1.5spareelectrode pairs',async()=>{
  const s=OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1,r=await opticalSourceCompile(),all=[...r.rows,...r.preliminaryNeeds];
  expect(all.find(x=>x.row_id==='rc09:fiber_fusion_splicer')?.quantity).toBe('1.5');
  expect(all.find(x=>x.row_id===s.stock.rowId)?.quantity).toBe('1');
  for(const id of ['reference:fiber:factory:spare-electrodes','reference:fiber:factory:coating-stripper','reference:fiber:factory:cleaver'])expect(all.find(x=>x.row_id===id)?.quantity).toBe('1');
  expect(all.find(x=>x.row_id==='reference:fiber:factory:tripod-screws')?.quantity).toBe('2');
  expect(r.preliminaryNeeds.find(x=>x.row_id==='reference:fiber:method:sharps-bin')?.quantity).toBeNull();
  expect(all.some(x=>x.row_id==='reference:fiber:factory:instruction-manual')).toBe(false);
 });
 test('small1splice still uses source-supported actualstock1, not a tool-per-splice norm',async()=>{
  const r=await opticalSourceCompile(opticalTrustedFixture(),{},1),all=[...r.rows,...r.preliminaryNeeds];
  expect(all.find(x=>x.row_id==='rc09:optical_fiber_fusion_splice')?.quantity).toBe('1');expect(all.find(x=>x.row_id==='reference:fiber:factory:cleaver')?.quantity).toBe('1');
  expect(all.find(x=>x.row_id==='rc09:fiber_otdr_measurement_protocol')?.quantity).toBe('1');
  expect(assessOpticalFiberWholeSpliceMethodR1({...opticalSourceFixture(),spliceCount:1}).fullLinePass).toBe(false);
 });
 test('manual actualstock2propagates includedparts but paidshift changes do not alter stock',async()=>{
  const s=OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1,provenance={kind:'manual',reason:'VALIDATION_FIXTURE actual deployed stock change'};
  const r=await opticalSourceCompile(opticalTrustedFixture(),{[s.stock.rowId]:{quantity:'2',provenance},'rc09:fiber_fusion_splicer':{quantity:'3.5',provenance}}),all=[...r.rows,...r.preliminaryNeeds];
  expect(all.find(x=>x.row_id==='reference:fiber:factory:cleaver')?.quantity).toBe('2');expect(all.find(x=>x.row_id==='reference:fiber:factory:tripod-screws')?.quantity).toBe('4');expect(all.find(x=>x.row_id==='rc09:fiber_fusion_splicer')?.quantity).toBe('3.5');
  await expect(opticalSourceCompile(opticalTrustedFixture(),{[s.stock.rowId]:{quantity:'1.5',provenance}})).rejects.toThrow();
 });
 test('unknown stock with a saved manual quantity remains unknownsource; covered child amendments stay reference-only',async()=>{
  const s=OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1,facts=opticalTrustedFixture();delete facts[s.stock.quantityParameterId];
  const provenance={kind:'manual',reason:'VALIDATION_FIXTURE retained manual order'},r=await opticalSourceCompile(facts,{[s.stock.rowId]:{quantity:'2',provenance}});
  expect(r.preliminaryNeeds.find(x=>x.row_id===s.stock.rowId)).toMatchObject({quantity:'2',need_state:'QUANTITY_REQUIRED'});expect(r.preliminaryNeeds.find(x=>x.row_id==='reference:fiber:factory:cleaver')?.quantity).toBeNull();
  const id='reference:fiber:factory:cleaver',manual=await opticalSourceCompile(opticalTrustedFixture(),{[id]:{quantity:'7',unitPrice:'10',includedInProcurement:true,provenance}});
  expect(manual.rows.find(x=>x.row_id===id)).toMatchObject({quantity:'7',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'1'}});
 });
 test('originalsleeve balance remains exact while assumptions are not preloaded and native needs remain honest',async()=>{
  const facts=opticalTrustedFixture();facts.sleeve_expected_waste_piece=1;facts.sleeve_retained_spare_piece=2;facts.sleeve_supplier_pack_size_piece=50;
  const r=await opticalSourceCompile(facts);expect(r.rows.find(x=>x.row_id==='rc09:fiber_splice_heat_shrink_sleeve')?.quantity).toBe('100');
  const unknown=opticalTrustedFixture();for(const k of ['wipe_quantity_piece','cleaner_volume_l','sleeve_supplier_pack_size_piece'])delete unknown[k];
  const needs=(await opticalSourceCompile(unknown)).preliminaryNeeds;
  for(const id of ['rc09:fiber_lint_free_wipe','rc09:fiber_isopropyl_cleaner','rc09:fiber_splice_heat_shrink_sleeve'])expect(needs.find(x=>x.row_id===id)?.need_state).toBe('QUANTITY_REQUIRED');
 });
 test('explicitly excluded material/externalQA branches differ from missing conditions and sharedtools stay oneowner',async()=>{
  const s=OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1,r=await opticalSourceCompile(),all=[...r.rows,...r.preliminaryNeeds];
  for(const id of ['rc09:fiber_pigtail','rc09:fiber_splice_tray','reference:fiber:method:olts','reference:fiber:method:reference-cords'])expect(all.some(x=>x.row_id===id)).toBe(false);
  const external=opticalTrustedFixture();external[s.externalQaScopeParameterId]='REQUIRED_SEPARATE_OWNER';
  expect((await opticalSourceCompile(external)).preliminaryNeeds.find(x=>x.row_id==='reference:fiber:method:olts')).toMatchObject({need_state:'QUANTITY_REQUIRED',procurement_eligible:false});
  const d=opticalFiberWholeSpliceMethodModelR1();expect(d.resources.filter(x=>x.row_id==='reference:fiber:method:pc')).toHaveLength(1);
  const facts=opticalTrustedFixture();delete facts.fiber_actual_cable_fiber_r1;
  const missing=await opticalSourceCompile(facts,{'rc09:fiber_fusion_splicer':{quantity:'1',unitPrice:'10',provenance:{kind:'manual',reason:'VALIDATION_FIXTURE manual quantities do not replace cable fact'}}});
  expect(missing.preliminaryNeeds.find(x=>x.row_id==='rc09:optical_fiber_fusion_splice')).toMatchObject({need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining(['fiber_actual_cable_fiber_r1'])});
 });
});

import {OPTICAL_WHOLE_QUANTITY_SOURCE_R2,opticalFiberWholeOrdinaryQuantityModelR2,assessOpticalWholeQuantityInputsR2}from'../../src/lib/estimate/v4/opticalFiberSplicingR1';
import {opticalWholeQuantityValidationFixtureR2,compileOpticalWholeQuantityValidationR2,prepareOpticalWholeQuantityConfigR2}from'../../scripts/estimate/r4a13/prepareMasterOpticalFiberSplicingSuccessor';
import {validateIndependentCompletenessMapReferences}from'../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {auditCanonicalPublisherSuccessorOperationResourcesR1}from'../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1}from'../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalRevisionCommitPayload}from'../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds}from'../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {projectCanonicalEstimateParameterSessionSnapshot,assertCanonicalEstimateParameterSessionSnapshotIdentity}from'../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSessionSnapshot';

function opticalContractRecord(value:unknown):Record<string,unknown>{if(value===null||typeof value!=='object'||Array.isArray(value))throw Error('OPTICAL_CONTRACT_RECORD_REQUIRED');return value as Record<string,unknown>;}
describe('Existing whole optical quantities R2 source-only authored UNRUN',()=>{
 const s=OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1,q=OPTICAL_WHOLE_QUANTITY_SOURCE_R2,scopeId='rc09:optical_fiber_fusion_splice';
 function documentFixture(){const f=opticalSourceFixture();return{...f,records:{...f.records,[q.recordId]:'TEST_ONLY reviewed exact powered fullkits/serials/allocation and independentOTDRprogramme'},[q.kitInput]:1,[q.otdrStock.quantityParameterId]:1,actualPoweredCt50PairingAndCellsReviewed:true,actualPlainOtdrKitAndSeparateInspectionAccessoriesReviewed:true,actualOtdrProgrammeDirectionsLimitsRawResultsReviewed:true,actualPhysicalOwnerCoverageAndAllocationReviewed:true,measurements:{...f.measurements,ambientMaxC:45,siteAltitudeM:100},otdrPowerMode:'BATTERY',otdrContinuousRealTimeTrace:false,actualOtdrPowerAndRealTimeDutyReviewed:true};}
 async function persist(input:Record<string,unknown>){
  const compiled=await compileOpticalWholeQuantityValidationR2(input,{[s.stock.rowId]:{quantity:'2',unitPrice:'9',includedInProcurement:true,provenance:{kind:'manual',reason:'TEST_ONLY manual stock quantity cannot approve full poweredmethod/QA programme'}}});
  const releaseId='OPTICAL_TEST_ONLY_RELEASE',definitionVersionId='OPTICAL_TEST_ONLY_DEFINITION',evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport:{definition_version_id:definitionVersionId,payload_sha256:'b'.repeat(64),decision:{independentCompletenessMap:q.independentComposition}}})!;
  const checksum=estimateDeterministicHash({...compiled.revisionProjection,operationCompositionEvidenceV1:evidence}),commit=buildCanonicalRevisionCommitPayload({rowCount:compiled.rows.length,currencyCode:'KGS',totals:compiled.totals,checksumSha256:checksum,compilerVersion:q.contract,parameters:compiled.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:input,parentRevisionId:null,identityContract:{},preliminaryNeeds:compiled.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const saved={id:'OPTICAL_TEST_ONLY_REVISION',row_count:compiled.rows.length,release_id:releaseId,definition_version_id:definitionVersionId,catalog_id:s.catalogId,checksum_sha256:checksum,input_parameters:compiled.parameters,amendment_contract:{parameterSources:commit.parameterSources}},resources=JSON.parse(JSON.stringify([...compiled.rows,...canonicalArtifactPreliminaryNeeds(saved)]));return{compiled,saved,resources,gate:canonicalEstimateSavedOperationAcceptanceV1({revision:saved,resources})};
 }
 test('fresh26/21/21 preserves native identity AST units source prices and owners through83rows14operations without cable route',()=>{
  const m=opticalFiberWholeOrdinaryQuantityModelR2();expect(m.resources).toHaveLength(83);expect(s.operationRoster).toHaveLength(14);for(const r of q.actualParentModel.resources){const n=m.resources.find(x=>x.row_id===r.row_id)!;expect([n.unit_id,n.formula_id,n.title_ru,n.cost_owner_id,n.procurement_eligible]).toEqual([r.unit_id,r.formula_id,r.title_ru,r.cost_owner_id,r.procurement_eligible]);expect(n.source_metadata).toMatchObject(r.source_metadata);expect(m.formulas.find(x=>x.formula_id===r.formula_id)).toEqual(q.actualParentModel.formulas.find(x=>x.formula_id===r.formula_id));}expect(m.runtimeInput).toEqual({});expect(validateIndependentCompletenessMapReferences({completenessMap:q.independentComposition,formulaDefinitions:m.formulas,resourceDefinitions:m.resources,requireOperationBindings:true})).toEqual([]);expect(m.resources.some(r=>/lvs_fiber|active_uplink|cable_route/.test(r.row_id))).toBe(false);
 });
 test('physical kit and29local former informational resources remain physical under single owner with coverage HOLD and external2 unresolved',()=>{
  const m=opticalFiberWholeOrdinaryQuantityModelR2();for(const p of q.physicalResourceOwners){const r=m.resources.find(x=>x.row_id===p.rowId)!;if(r.unit_id!=='document')expect(opticalContractRecord(r.resource_graph.publicResourcePresentationV1).rowKind).toBeUndefined();expect(opticalContractRecord(r.resource_graph.physicalResourceCoverageHoldR2).actualOwnerCoverageAccepted).toBe(false);if(p.ownerRowId){expect(r.cost_owner_id).toBe(p.ownerRowId);expect(r.resource_graph.costTreatment).toBe(p.costTreatment);}else{expect(opticalContractRecord(r.resource_graph.physicalResourceCoverageHoldR2).externalOwnerRequired).toBe(true);expect(r.procurement_eligible).toBe(false);}}expect(q.physicalResourceOwners.filter(p=>!p.ownerRowId)).toHaveLength(2);
 });
 test('actual complete stock controls oneCT50 twoAAA and six plainOTDR items independently of splices or paid shifts',async()=>{
  const f=opticalWholeQuantityValidationFixtureR2();f[q.kitInput]=3;f[q.otdrStock.quantityParameterId]=2;f.splice_count=400;const r=await compileOpticalWholeQuantityValidationR2(f,{'rc09:fiber_fusion_splicer':{quantity:'1.5',provenance:{kind:'manual',reason:'TEST_ONLY known paidshift distinct from inventory'}}}),all=[...r.rows,...r.preliminaryNeeds];expect(all.find(x=>x.row_id==='reference:fiber:factory:cleaver')?.quantity).toBe('3');expect(all.find(x=>x.row_id==='reference:fiber:factory:tripod-screws')?.quantity).toBe('6');expect(all.find(x=>x.row_id==='reference:fiber:method:cleaver-cells')?.quantity).toBe('6');for(const p of q.otdrFactory.filter(x=>x.unitId==='pcs'))expect(all.find(x=>x.row_id===p.rowId)?.quantity).toBe('2');expect(all.find(x=>x.row_id==='rc09:fiber_fusion_splicer')?.quantity).toBe('1.5');expect(r.preliminaryNeeds.find(x=>x.row_id==='rc09:optical_time_domain_reflectometer')?.quantity).toBeNull();
 });
 test('small1splice still uses reviewed inventory while missing stock is UNKNOWN and exact mandatory objectfact',async()=>{
  const f=opticalWholeQuantityValidationFixtureR2();f.splice_count=1;const r=await compileOpticalWholeQuantityValidationR2(f);expect(r.rows.find(x=>x.row_id==='reference:fiber:method:cleaver-cells')?.quantity).toBe('2');delete f[q.kitInput];const missing=await compileOpticalWholeQuantityValidationR2(f);expect(missing.preliminaryNeeds.find(x=>x.row_id===s.stock.rowId)?.quantity).toBeNull();expect(opticalContractRecord(opticalContractRecord(missing.preliminaryNeeds.find(x=>x.row_id===scopeId)?.calculation_trace).resourceGraph).scopeRequirementDecisionV1).toMatchObject({status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([q.kitInput])});
 });
 test('zero fractional negative inventory rejected and protected consumption quantity cannot be injected as confirmed norm',async()=>{
  for(const n of[0,-1,1.5])await expect(compileOpticalWholeQuantityValidationR2({...opticalWholeQuantityValidationFixtureR2(),[q.kitInput]:n})).rejects.toThrow();await expect(compileOpticalWholeQuantityValidationR2({...opticalWholeQuantityValidationFixtureR2(),fiber_method_cleaver_cells_qty_r1:2})).rejects.toThrow();await expect(compileOpticalWholeQuantityValidationR2({...opticalWholeQuantityValidationFixtureR2(),wipe_quantity_piece:2})).rejects.toThrow();
 });
 test('manual actual stock propagates4AAA and two cleavers once without second billing or procurement and rejects fractional stock',async()=>{
  const r=await persist(opticalWholeQuantityValidationFixtureR2()),row=r.resources.find((x:{row_id:string})=>x.row_id===s.stock.rowId)!;expect(row).toMatchObject({quantity:'2',unit_price:'9',included_in_estimate:false,included_in_procurement:false,procurement_eligible:false,calculation_trace:{manualQuantityOverride:true,calculatedQuantityBeforeOverride:'1',resourceGraph:{purchaseBalanceOwnerRowId:'rc09:fiber_fusion_splicer'}}});expect(r.resources.find((x:{row_id:string})=>x.row_id==='reference:fiber:method:cleaver-cells')?.quantity).toBe('4');await expect(compileOpticalWholeQuantityValidationR2(opticalWholeQuantityValidationFixtureR2(),{[s.stock.rowId]:{quantity:'1.5',provenance:{kind:'manual',reason:'TEST_ONLY invalid fractional inventory'}}})).rejects.toThrow();
 });
 test('plain OTDR kit excludes SI accessories and supplied document guides or lifetime do not become invented quantities',async()=>{
  const r=await compileOpticalWholeQuantityValidationR2(),all=[...r.rows,...r.preliminaryNeeds];for(const id of['reference:fiber:method:launch-fiber','reference:fiber:method:tail-fiber','reference:fiber:method:video-probe','reference:fiber:otdr-factory:getting-started-guides'])expect(all.find(x=>x.row_id===id)?.quantity).toBeNull();expect(assessOpticalWholeQuantityInputsR2({...documentFixture(),siInspectionKitImportedAsPlain:true}).issues).toContain('EXACT_POWERED_CT50_AND_PLAIN_OTDR_PROFILE_REQUIRED');expect(assessOpticalWholeQuantityInputsR2({...documentFixture(),supplierCalibrationStatementAsCurrentValidity:true}).issues).toContain('FALSE_QUANTITY_OR_FULL_LINE_PASS_FORBIDDEN');
 });
 test('wholeenvironment intersection uses actual OTDR power duty altitude and rejects100S CT60 or unpowered substitution',()=>{
  const f=documentFixture();expect(assessOpticalWholeQuantityInputsR2(f).status).toBe('COMPATIBILITY_INPUTS_PRESENT');for(const patch of[{manualUnpoweredCt50Substituted:true},{ct60Or100sSubstituted:true},{splicerLossOrOtdrAsRequiredOltsPass:true}])expect(assessOpticalWholeQuantityInputsR2({...f,...patch}).status).toBe('BLOCKED');expect(assessOpticalWholeQuantityInputsR2({...f,otdrPowerMode:'AC'}).issues).toContain('ACTUAL_WHOLE_OTDR_POWER_TEMPERATURE_ALTITUDE_DUTY_REQUIRED');expect(assessOpticalWholeQuantityInputsR2({...f,otdrPowerMode:'AC',measurements:{...f.measurements,ambientMinC:0,siteAltitudeM:3200}}).status).toBe('COMPATIBILITY_INPUTS_PRESENT');expect(assessOpticalWholeQuantityInputsR2({...f,otdrContinuousRealTimeTrace:true}).status).toBe('BLOCKED');expect(assessOpticalWholeQuantityInputsR2({...f,otdrContinuousRealTimeTrace:true,measurements:{...f.measurements,ambientMaxC:35}}).status).toBe('COMPATIBILITY_INPUTS_PRESENT');
 });
 test('omitted complete QA programme survives Core commit saved with known manual stock and refuses PDF',async()=>{
  const input=opticalWholeQuantityValidationFixtureR2(),fact='fiber_actual_qa_program_r1';delete input[fact];const r=await persist(input),scope=r.resources.find((x:{row_id:string})=>x.row_id===scopeId)!;expect(scope).toMatchObject({need_state:'CONDITION_REQUIRED',calculation_trace:{resourceGraph:{scopeRequirementDecisionV1:{status:'OBJECT_FACT_REQUIRED',missingObjectFactParameterIds:expect.arrayContaining([fact])}}}});expect(r.gate.issues).toContainEqual({code:'RESOURCE_CONDITION_UNRESOLVED',rowId:scopeId});expect(r.gate.pdfAllowed).toBe(false);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(r.gate)).toThrow();
 });
 test('TEST_ONLY complete records keep wholecarrier active and clear only facts while whole source factory quantities and external scope stay held',async()=>{
  const r=await persist(opticalWholeQuantityValidationFixtureR2()),scope=r.resources.find((x:{row_id:string})=>x.row_id===scopeId)!,decision=scope.calculation_trace.resourceGraph.scopeRequirementDecisionV1;expect(decision.status).not.toBe('NOT_APPLICABLE');expect(decision.missingObjectFactParameterIds).toEqual([]);expect(r.gate.pdfAllowed).toBe(false);expect(assessOpticalWholeQuantityInputsR2(documentFixture())).toMatchObject({status:'COMPATIBILITY_INPUTS_PRESENT',actualInventoryAccepted:false,actualOtdrOrOltsPass:false,estimateCompilationAllowed:false,FULL:false});const f=opticalWholeQuantityValidationFixtureR2();f[s.externalQaScopeParameterId]='REQUIRED_SEPARATE_OWNER';const ext=await compileOpticalWholeQuantityValidationR2(f);expect(ext.preliminaryNeeds.find(x=>x.row_id==='reference:fiber:method:olts')?.quantity).toBeNull();
 });
 test('cold commonparameter session preserves missing powered allocation record and rejects stale identity',async()=>{
  const input=opticalWholeQuantityValidationFixtureR2();delete input[q.recordId];const r=await persist(input),m=opticalFiberWholeOrdinaryQuantityModelR2(),args={requestedRevisionId:r.saved.id,definitionVersionId:r.saved.definition_version_id,parent:null,revision:{revisionId:r.saved.id,parentRevisionId:null,releaseId:r.saved.release_id,catalogId:s.catalogId,definitionVersionId:r.saved.definition_version_id,definitionVersion:6,status:'PRELIMINARY',parameters:r.compiled.parameters,userInputSnapshot:input,acceptedBaselineSnapshot:{},assumptionSnapshot:{},parameterSchemaHash:estimateDeterministicHash(m.parameters),compilerVersion:q.contract,checksumSha256:r.saved.checksum_sha256,createdAt:'TEST_ONLY',preliminaryNeeds:r.compiled.preliminaryNeeds.map(n=>({rowId:n.row_id,selected:false,missingParameterIds:n.missing_parameter_ids,quantity:n.quantity,needState:n.need_state,scopeRequirementDecision:opticalContractRecord(opticalContractRecord(n.calculation_trace).resourceGraph).scopeRequirementDecisionV1}))},catalog:{catalogId:s.catalogId,releaseId:r.saved.release_id,definitionVersion:6,professionalMetadata:{},orderedSpecificationBindings:[]}}as unknown as Parameters<typeof projectCanonicalEstimateParameterSessionSnapshot>[0];const cold=projectCanonicalEstimateParameterSessionSnapshot(JSON.parse(JSON.stringify(args)));expect(cold.revision.preliminaryNeeds?.find(x=>x.rowId===scopeId)?.missingParameterIds).toContain(q.recordId);expect(()=>assertCanonicalEstimateParameterSessionSnapshotIdentity({...cold,definitionVersionId:'STALE_TEST_ONLY'},r.saved.id)).toThrow();
 });
 test('common ordinary preflight remains blocked and pointeralias rejected before new registry scope or publication',()=>{
  const m=opticalFiberWholeOrdinaryQuantityModelR2(),gate=auditCanonicalPublisherSuccessorOperationResourcesR1({resourceDefinitions:m.resources,independentComposition:q.independentComposition});expect(gate.definitionAdmissionAllowed).toBe(false);expect(gate.pdfAllowed).toBe(false);expect(gate.issues.some(x=>x.code==='REQUIRED_RESOURCE_CLASS_WITHOUT_VISIBLE_ROWS')).toBe(true);const ctx={referencePointerMode:'PREPARED_NOT_ACTIVE_COPY',currentReleasePath:'SAME_TEST_ONLY',selectedCurrentReleasePath:'SAME_TEST_ONLY'}as Parameters<typeof prepareOpticalWholeQuantityConfigR2>[0];expect(()=>prepareOpticalWholeQuantityConfigR2(ctx)).toThrow('PREPARED_POINTER_MUST_DIFFER_FROM_SELECTED');
 });
});
