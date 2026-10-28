import wholeR919 from '../../data/estimate-benchmarks/source-packs/vvgng-ls-power-cable-whole-current-r919-r1.json';
import {vvgngLsPowerCableWholeCurrentForwardR919 as wholeForward,vvgngLsPowerCableWholeOrdinaryMaterializerInputR919 as wholeInput,vvgngLsPowerCableWholeIndependentCompositionR919 as wholeMap,compileVvgngLsPowerCableWholeCurrentR919 as wholeCompile} from '../../src/lib/estimate/v4/vvgngLsPowerCableR1';
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateSha256HexText} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalRevisionCommitPayload} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {
  VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT, VVGNG_LS_POWER_CABLE_CATALOG_ID,
  VVGNG_LS_POWER_CABLE_FORMULAS, VVGNG_LS_POWER_CABLE_PARAMETERS,
  VVGNG_LS_POWER_CABLE_RESOURCES, VVGNG_LS_POWER_CABLE_RUNTIME_INPUT,
  VVGNG_LS_POWER_CABLE_SHORT_INPUT,
  compileVvgngLsPowerCableR1,
  VVGNG_LS_POWER_CABLE_OPERATION_SOURCE as source,
  vvgngLsPowerCableIndependentCompositionR1 as independent,
} from "../../src/lib/estimate/v4/vvgngLsPowerCableR1";
import {canonicalEstimateOperationReferences as refs,canonicalEstimateResourceOperationSections as sections} from '../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {validateIndependentCompletenessMapReferences as validate} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {auditCanonicalPublisherSuccessorOperationResourcesR1 as auditPublisher} from '../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';

const REQUIRED = [
  "rc09:vvgng_ls_cable_lay", "rc09:vvgng_a_ls_5x6_cable",
  "rc09:fire_resistant_cable_marker", "rc09:halogen_free_cable_clamp",
  "rc09:cable_gland_for_5x6", "rc09:copper_lug_6mm2",
  "rc09:firestop_cable_penetration_compound", "rc09:power_cable_insulation_continuity_test",
] as const;
const CONDITIONAL = ["rc09:cable_tray", "rc09:cable_protective_pipe",
  "rc09:cable_pulling_lubricant"] as const;
const DIRECT_RESOURCE_NEEDS = [
  "vvgng:labor:installation", "vvgng:labor:testing",
  "vvgng:equipment:reel-stand", "vvgng:equipment:pulling-device",
  "vvgng:equipment:crimp-tool", "vvgng:equipment:installation-tester",
  "vvgng:logistics:delivery", "vvgng:logistics:waste-removal",
] as const;
const MINIMUM_REAL_QUANTITY_NEEDS = Object.freeze({
  "rc09:fire_resistant_cable_marker": ["marker_quantity_piece"],
  "rc09:halogen_free_cable_clamp": ["clamp_quantity_piece","cable_fixing_mode","cable_fixing_layout_reference"],
  "rc09:cable_gland_for_5x6": ["gland_quantity_piece"],
  "rc09:copper_lug_6mm2": ["lug_quantity_piece"],
  "rc09:firestop_cable_penetration_compound": ["firestop_quantity_kg"],
  "rc09:power_cable_insulation_continuity_test": ["test_count"],
});
const OPTIONAL_PRODUCT_DESIGNATIONS = [
  "marker_designation", "clamp_designation", "gland_designation",
  "lug_designation", "firestop_designation", "test_designation",
] as const;

function vvgContractIsRecordR993(value:unknown):value is Record<string,unknown>{
 return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
function vvgContractRecordR989(value:unknown,label:string):Record<string,unknown>{
 if(!vvgContractIsRecordR993(value))throw Error('VVG_CONTRACT_RECORD_REQUIRED:'+label);
 return value;
}
function vvgContractTextR989(value:unknown,label:string):string{
 if(typeof value!=='string'||!value.trim())throw Error('VVG_CONTRACT_TEXT_REQUIRED:'+label);
 return value;
}
function vvgCanonicalSectionInputR989(row:{row_id:string;title_ru?:unknown;calculation_trace?:unknown}):{rowId:string;titleRu:string;operation:unknown}{
 const trace=vvgContractRecordR989(row.calculation_trace,row.row_id+':calculation_trace');
 const graph=vvgContractRecordR989(trace.resourceGraph,row.row_id+':resourceGraph');
 return{rowId:row.row_id,titleRu:vvgContractTextR989(row.title_ru,row.row_id+':title_ru'),operation:graph.operationCompositionV1};
}

describe("MASTER VVGng-LS power-cable owner", () => {
  test("uses net route geometry without importing historical rates", () => {
    expect(VVGNG_LS_POWER_CABLE_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_vvg_cable_lay_standard");
    expect(VVGNG_LS_POWER_CABLE_PARAMETERS).toHaveLength(45);
    expect(VVGNG_LS_POWER_CABLE_FORMULAS).toHaveLength(32);
    expect(VVGNG_LS_POWER_CABLE_RESOURCES).toHaveLength(32);
    expect(VVGNG_LS_POWER_CABLE_RUNTIME_INPUT).toEqual({
      cable_expected_loss_ratio: 0,
      cable_retained_reserve_m: 0,
      cable_supplier_cut_increment_m: 1,
    });
    expect(JSON.stringify(VVGNG_LS_POWER_CABLE_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|length_m\s*\*\s*(?:1\.04|0\.08|2|0\.014|0\.07|0\.025)/iu);
    expect(VVGNG_LS_POWER_CABLE_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining(["rc09:switchboard", "rc09:building_full_power_system"]));
  });

  test("known 150 m route gives a useful visible balance and local resource needs", async () => {
    const compiled = await compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_SHORT_INPUT });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "150", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "150", unit_id: "m" }),
    ]));
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "vvgng:balance:installed-net-length", quantity: "150" }),
      expect.objectContaining({ row_id: "vvgng:balance:expected-loss", quantity: "0" }),
      expect.objectContaining({ row_id: "vvgng:balance:retained-reserve", quantity: "0" }),
      expect.objectContaining({ row_id: "vvgng:balance:total-need", quantity: "150" }),
      expect.objectContaining({ row_id: "vvgng:balance:remainder-after-installation-loss",
        quantity: "0" }),
      expect.objectContaining({ row_id: "vvgng:balance:surplus-beyond-reserve", quantity: "0" }),
    ]));
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        ...REQUIRED.slice(2), ...CONDITIONAL, ...DIRECT_RESOURCE_NEEDS,
      ]));
    expect(compiled.preliminaryNeeds).toHaveLength(24);
    for (const [rowId, missingParameterIds] of Object.entries(MINIMUM_REAL_QUANTITY_NEEDS)) {
      expect(compiled.preliminaryNeeds.find((need) => need.row_id === rowId)
        ?.missing_parameter_ids.slice().sort()).toEqual([...missingParameterIds].sort());
    }
    for (const parameterId of OPTIONAL_PRODUCT_DESIGNATIONS) {
      expect(VVGNG_LS_POWER_CABLE_PARAMETERS.find((parameter) =>
        parameter.parameter_id === parameterId)?.required).toBe(false);
    }
  });

  test("compiles the evidence-bound fixture with explicit labor, mechanisms and logistics", async () => {
    const compiled = await compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT });
    expect(compiled.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(source.needs.map(n=>n.rowId).sort());
    expect(compiled.rows).toHaveLength(22);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "12", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "300", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "3.75", unit_id: "kg" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "3", unit_id: "test" }),
      expect.objectContaining({ row_id: "vvgng:labor:installation", quantity: "24",
        unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "vvgng:labor:testing", quantity: "3",
        unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "vvgng:equipment:reel-stand", quantity: "4",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "vvgng:equipment:pulling-device", quantity: "5",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "vvgng:equipment:crimp-tool", quantity: "2",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "vvgng:equipment:installation-tester", quantity: "3",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "vvgng:logistics:delivery", quantity: "1",
        unit_id: "trip" }),
      expect.objectContaining({ row_id: "vvgng:logistics:waste-removal", quantity: "1",
        unit_id: "trip" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[0])?.included_in_estimate)
      .toBe(false);
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[7])?.included_in_estimate)
      .toBe(false);
  });

  test("separates installed length, loss, retained reserve, order and remainder", async () => {
    const compiled = await compileVvgngLsPowerCableR1({
      ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
      cable_expected_loss_ratio: 0.05,
      cable_retained_reserve_m: 5,
      cable_supplier_cut_increment_m: 100,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("vvgng:balance:installed-net-length")?.quantity).toBe("150");
    expect(rows.get("vvgng:balance:expected-loss")?.quantity).toBe("7.5");
    expect(rows.get("vvgng:balance:retained-reserve")?.quantity).toBe("5");
    expect(rows.get("vvgng:balance:total-need")?.quantity).toBe("162.5");
    expect(rows.get("rc09:vvgng_a_ls_5x6_cable")?.quantity).toBe("200");
    expect(rows.get("vvgng:balance:remainder-after-installation-loss")?.quantity).toBe("42.5");
    expect(rows.get("vvgng:balance:surplus-beyond-reserve")?.quantity).toBe("37.5");
    expect(compiled.rows.filter((row) => row.row_id.startsWith("vvgng:balance:")
      && row.included_in_procurement)).toEqual([]);
  });

  test("keeps tray, protective pipe and pulling lubricant conditional", async () => {
    const compiled = await compileVvgngLsPowerCableR1({
      ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
      cable_tray_mode: "REQUIRED", cable_tray_designation: "Лоток по проекту",
      cable_tray_length_m: 90, protective_pipe_mode: "REQUIRED",
      protective_pipe_designation: "Труба по узлу", protective_pipe_length_m: 12,
      pulling_lubricant_mode: "REQUIRED", pulling_lubricant_designation: "Смазка по ППР",
      pulling_lubricant_quantity_kg: 2.5,
    });
    expect(compiled.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual(source.needs.map(n=>n.rowId).sort());
    expect(compiled.rows).toHaveLength(25);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "90", unit_id: "m" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "12", unit_id: "m" }),
      expect.objectContaining({ row_id: CONDITIONAL[2], quantity: "2.5", unit_id: "kg" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_SHORT_INPUT,
      length_m: 0 })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileVvgngLsPowerCableR1({ ...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT },
      { catalogId: `${VVGNG_LS_POWER_CABLE_CATALOG_ID}:unsupported` }))
      .rejects.toThrow("VVGNG_LS_POWER_CABLE_CATALOG_UNSUPPORTED");
  });

  test('binds the original paid cable and labour directly to real consuming operations without another cable order',async()=>{
    const out=await compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT});
    for(const r of out.rows){
      const {row_sha256:actualRowHash,...rowBody}=r;
      expect(actualRowHash).toBe(estimateDeterministicHash(rowBody));
      const trace=vvgContractRecordR989(r.calculation_trace,r.row_id+':calculation_trace');
      const actualFormulaId=vvgContractTextR989(trace.formulaId,r.row_id+':formulaId');
      const actualDefinition=VVGNG_LS_POWER_CABLE_FORMULAS.find(f=>f.formula_id===actualFormulaId);
      expect(actualDefinition).toBeDefined();if(!actualDefinition)throw Error('VVG_ACTUAL_FORMULA_DEFINITION_REQUIRED:'+actualFormulaId);
      const actualResource=VVGNG_LS_POWER_CABLE_RESOURCES.find(resource=>resource.row_id===r.row_id);
      expect(actualResource).toBeDefined();if(!actualResource)throw Error('VVG_ACTUAL_RESOURCE_DEFINITION_REQUIRED:'+r.row_id);
      expect(actualFormulaId).toBe(actualResource.formula_id);
      expect(vvgContractTextR989(trace.formulaAstSha256,r.row_id+':formulaAstSha256')).toBe(actualDefinition.ast_sha256);
    }
    for(const r of out.preliminaryNeeds){
      const {need_sha256:actualNeedHash,...needBody}=r;
      expect(actualNeedHash).toBe(estimateDeterministicHash(needBody));
    }
    const definition=VVGNG_LS_POWER_CABLE_RESOURCES.find(r=>r.row_id===source.existingCableOrderOwnerRowId)!;
    expect(definition.ordinal).toBe(1);expect(definition.cost_owner_id).toBe(definition.row_id);expect(definition.procurement_eligible).toBe(true);
    const uses=refs(definition.resource_graph.operationCompositionV1);
    expect(uses).toHaveLength(10);expect(new Set(uses.map(o=>o.groupId))).toEqual(new Set([source.groupId]));
    const shown=sections([...out.rows,...out.preliminaryNeeds].map(vvgCanonicalSectionInputR989));
    expect(shown.flatMap(s=>s.resourceIds).filter(id=>id===definition.row_id)).toHaveLength(1);
    for(const role of ['readback','unwind','lay','fix','mark','terminate','firestop','qa','delivery']){
      const stage=shown.find(s=>s.operation?.operationId===source.groupId+':'+role)!;expect(stage).toBeDefined();
      expect([...stage.resourceIds,...stage.sharedResources.map(r=>r.rowId)]).toContain(definition.row_id);
    }
    expect(out.rows.filter(r=>r.row_id===source.existingCableOrderOwnerRowId&&r.included_in_procurement)).toHaveLength(1);
    expect(out.rows.filter(r=>r.row_id.startsWith('vvgng:balance:')&&r.included_in_procurement)).toEqual([]);
    expect(VVGNG_LS_POWER_CABLE_RESOURCES.find(r=>r.row_id==='vvgng:labor:installation')?.cost_owner_id).toBe('vvgng:labor:installation');
    expect(refs(VVGNG_LS_POWER_CABLE_RESOURCES.find(r=>r.row_id==='vvgng:labor:installation')!.resource_graph.operationCompositionV1)
      .map(o=>o.operationId)).not.toContain(source.groupId+':qa');
  });

  test('excludes a new fastening operation only for the explicit accepted existing-system branch, not from route length',async()=>{
    const input:Record<string,unknown>={...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,cable_fixing_mode:source.fixingApplicability.existingSystemValue};
    delete input.clamp_designation;delete input.clamp_quantity_piece;
    const out=await compileVvgngLsPowerCableR1(input);
    expect([...out.rows,...out.preliminaryNeeds].some(r=>r.row_id==='rc09:halogen_free_cable_clamp')).toBe(false);
    const shown=sections([...out.rows,...out.preliminaryNeeds].map(vvgCanonicalSectionInputR989));
    expect(shown.some(s=>s.operation?.operationId===source.groupId+':fix')).toBe(false);
    expect(out.rows.find(r=>r.row_id===source.existingCableOrderOwnerRowId)?.quantity).toBe('150');
    await expect(compileVvgngLsPowerCableR1({...input,clamp_quantity_piece:300})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
    await expect(compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,clamp_quantity_piece:0.5})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
    const unknown=await compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_SHORT_INPUT,length_m:99});
    expect(unknown.preliminaryNeeds.find(r=>r.row_id==='rc09:halogen_free_cable_clamp')?.quantity).toBeNull();
  });

  test.each([{core_count:3},{conductor_area_mm2:2.5},{cable_mark:'CAT6A'},{cable_mark:'NYM'}])('rejects incompatible source profile without relabelling it as5x6: %j',async wrong=>{
    await expect(compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_SHORT_INPUT,...wrong})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  });

  test('retains unknown method/unit/quantity needs instead of inventing an access station, tool count or QA adapter',async()=>{
    const out=await compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT});
    for(const need of source.needs){
      const p=VVGNG_LS_POWER_CABLE_PARAMETERS.find(p=>p.parameter_id===need.parameterId)!,r=VVGNG_LS_POWER_CABLE_RESOURCES.find(r=>r.row_id===need.rowId)!;
      expect(p.default_value).toBeNull();expect(p.unit_id).toBeNull();expect(p.truth_metadata.value_source_role).toBe('UNRESOLVED_APPLICATION_NORM');
      expect(r.unit_id).toBe('');expect(r.cost_owner_id).toBeNull();expect(r.procurement_eligible).toBe(false);
      expect(r.resource_graph.costTreatment).toBe('INFORMATIONAL_SCOPE');
      expect(out.preliminaryNeeds.find(n=>n.row_id===r.row_id)?.quantity).toBeNull();
      await expect(compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,[need.parameterId]:1})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
    }
    const guide=VVGNG_LS_POWER_CABLE_PARAMETERS.find(p=>p.parameter_id==='cable_installation_labor_h')!.truth_metadata.guide as Record<string,unknown>;
    expect(guide.verified_at).toBeUndefined();expect(guide.source_snapshot_hash).toBeUndefined();
    expect(guide.source_role).toBe('ACTUAL_PROJECT_DOCUMENT_REQUIRES_SERVER_BINDING');
  });

  test('uses the ordinary independent binding validator and fails lost consumption links while retaining composition gaps',()=>{
    const map=independent();
    expect(validate({completenessMap:map,formulaDefinitions:VVGNG_LS_POWER_CABLE_FORMULAS,resourceDefinitions:VVGNG_LS_POWER_CABLE_RESOURCES,requireOperationBindings:true})).toEqual([]);
    const lost=VVGNG_LS_POWER_CABLE_RESOURCES.map(r=>r.row_id!==source.existingCableOrderOwnerRowId?r:{...r,resource_graph:{...r.resource_graph,
      operationCompositionV1:{...refs(r.resource_graph.operationCompositionV1)[0],additionalOperations:[]}}});
    expect(validate({completenessMap:map,formulaDefinitions:VVGNG_LS_POWER_CABLE_FORMULAS,resourceDefinitions:lost,requireOperationBindings:true}).some(code=>code.endsWith('_OPERATION_BINDING'))).toBe(true);
    const result=auditPublisher({resourceDefinitions:VVGNG_LS_POWER_CABLE_RESOURCES,independentComposition:map});
    expect(result.pdfAllowed).toBe(false);expect(result.completeClaimAllowed).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([expect.objectContaining({code:'RESOURCE_UNIT_UNRESOLVED'})]));
    expect(result.issues.some(i=>['OPERATION_METADATA_CONFLICT','INDEPENDENT_RESOURCE_PRESENTATION_UNVERIFIED','RESOURCE_PRESENTATION_SOURCE_MISMATCH','RESOURCE_NOT_IN_INDEPENDENT_COMPOSITION','OPERATION_RESOURCE_REQUIREMENTS_INVALID'].includes(i.code))).toBe(false);
  });

  test('preserves an explicit zero external service without requiring payment or deriving trips from the cable length',async()=>{
    const out=await compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,cable_delivery_trip_count:0,cable_waste_removal_trip_count:0});
    for(const id of ['vvgng:logistics:delivery','vvgng:logistics:waste-removal']){
      const r=out.rows.find(r=>r.row_id===id)!;expect(r.quantity).toBe('0');expect(r.included_in_estimate).toBe(false);expect(r.included_in_procurement).toBe(false);
    }
  });

  test('uses actual project contact, entry and test counts independently while retaining the original electrical owners',async()=>{
    const out=await compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
      length_m:217,lug_quantity_piece:7,gland_quantity_piece:2,test_count:4,
      cable_delivery_trip_count:2,cable_waste_removal_trip_count:0});
    for(const [id,quantity,unit] of [
      ['rc09:copper_lug_6mm2','7','pcs'],['rc09:cable_gland_for_5x6','2','pcs'],
      ['rc09:power_cable_insulation_continuity_test','4','test'],
      ['vvgng:logistics:delivery','2','trip'],['vvgng:logistics:waste-removal','0','trip'],
    ])expect(out.rows.find(r=>r.row_id===id)).toMatchObject({quantity,unit_id:unit});
    for(const id of ['rc09:copper_lug_6mm2','rc09:cable_gland_for_5x6','vvgng:equipment:crimp-tool',
      'vvgng:equipment:installation-tester','vvgng:labor:installation','vvgng:labor:testing',
      'vvgng:logistics:delivery','vvgng:logistics:waste-removal']){
      const definition=VVGNG_LS_POWER_CABLE_RESOURCES.find(r=>r.row_id===id)!;
      expect(definition.cost_owner_id).toBe(id);
      expect(out.rows.filter(r=>r.row_id===id)).toHaveLength(1);
    }
    const qaRows=VVGNG_LS_POWER_CABLE_RESOURCES.filter(r=>refs(r.resource_graph.operationCompositionV1)
      .some(op=>op.operationId===source.groupId+':qa'));
    expect(qaRows.map(r=>r.row_id)).toEqual(expect.arrayContaining([
      'vvgng:labor:testing','vvgng:equipment:installation-tester','vvgng:need:test-accessories',
    ]));
    expect(qaRows.some(r=>r.row_id==='vvgng:labor:installation')).toBe(false);
    expect(out.preliminaryNeeds.find(r=>r.row_id==='vvgng:need:termination-interface')?.quantity).toBeNull();
  });

  test('does not promote optional screw-terminal text or a capability candidate into an accepted crimped ending',async()=>{
    const out=await compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
      lug_designation:'UT6 screw terminal with a direct conductor connection, not a crimped ring lug'});
    // The designation is optional object text, not an authenticated contact-method selector.
    // It must leave the physical compatibility need open, rather than fabricate a fit.
    expect(source.heldTechnicalEvidence.selectedActualContactMethod).toBeNull();
    expect(source.heldTechnicalEvidence.crimpedLugCandidate.contactTorqueNm).toBeNull();
    expect(out.preliminaryNeeds.find(r=>r.row_id==='vvgng:need:termination-interface'))
      .toMatchObject({quantity:null,unit_id:''});
    const check=auditPublisher({resourceDefinitions:VVGNG_LS_POWER_CABLE_RESOURCES,independentComposition:independent()});
    expect(check.completeClaimAllowed).toBe(false);expect(check.pdfAllowed).toBe(false);
    expect(check.issues).toContainEqual(expect.objectContaining({code:'RESOURCE_UNIT_UNRESOLVED',rowId:'vvgng:need:termination-interface'}));
  });

  test.each(['rc09:copper_lug_6mm2','rc09:cable_gland_for_5x6','vvgng:equipment:crimp-tool',
    'vvgng:need:conductor-stripping','vvgng:need:termination-interface',
    'vvgng:equipment:installation-tester','vvgng:need:test-accessories'])
  ('the ordinary publisher rejects omission of a declared mandatory termination or QA resource: %s',id=>{
    const check=auditPublisher({resourceDefinitions:VVGNG_LS_POWER_CABLE_RESOURCES.filter(r=>r.row_id!==id),
      independentComposition:independent()});
    expect(check.status).toBe('STRUCTURE_INVALID');expect(check.pdfAllowed).toBe(false);expect(check.completeClaimAllowed).toBe(false);
    expect(check.issues).toContainEqual(expect.objectContaining({code:'REQUIRED_RESOURCE_MISSING',rowId:id}));
  });

  test('rejects a foreign ending identity and a QA tool rebound to the socket operation instead of this cable operation',()=>{
    const wrongEnding=VVGNG_LS_POWER_CABLE_RESOURCES.map(r=>r.row_id!=='rc09:copper_lug_6mm2'?r:
      {...r,row_id:'foreign:wire-end-ferrule:6mm2',cost_owner_id:'foreign:socket-owner'});
    const endingCheck=auditPublisher({resourceDefinitions:wrongEnding,independentComposition:independent()});
    expect(endingCheck.issues).toContainEqual(expect.objectContaining({code:'REQUIRED_RESOURCE_MISSING',rowId:'rc09:copper_lug_6mm2'}));
    expect(endingCheck.issues).toContainEqual(expect.objectContaining({code:'RESOURCE_NOT_IN_INDEPENDENT_COMPOSITION',rowId:'foreign:wire-end-ferrule:6mm2'}));
    const wrongQa=VVGNG_LS_POWER_CABLE_RESOURCES.map(r=>r.row_id!=='vvgng:equipment:installation-tester'?r:
      {...r,resource_graph:{...r.resource_graph,operationCompositionV1:{...refs(r.resource_graph.operationCompositionV1)[0],
        groupId:'electrical:socket-composable-two-gang-r1',operationId:'electrical:socket-composable-two-gang-r1:qa-close'}}});
    expect(validate({completenessMap:independent(),formulaDefinitions:VVGNG_LS_POWER_CABLE_FORMULAS,
      resourceDefinitions:wrongQa,requireOperationBindings:true}).some(code=>code.endsWith('_OPERATION_BINDING'))).toBe(true);
    const qaCheck=auditPublisher({resourceDefinitions:wrongQa,independentComposition:independent()});
    expect(qaCheck.pdfAllowed).toBe(false);
    expect(qaCheck.issues).toContainEqual(expect.objectContaining({code:'REQUIRED_RESOURCE_OPERATION_MISSING',
      rowId:'vvgng:equipment:installation-tester',operationId:source.groupId+':qa'}));
  });

  test('zero transport leaves cleanup labour, tools and the QA result/export scope unresolved',async()=>{
    const out=await compileVvgngLsPowerCableR1({...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,
      cable_delivery_trip_count:0,cable_waste_removal_trip_count:0});
    expect(out.preliminaryNeeds.find(r=>r.row_id==='vvgng:need:test-accessories')?.quantity).toBeNull();
    const cleanup=source.operationRequirements.find(r=>r.operationId===source.groupId+':cleanup')!;
    expect(cleanup.requirements.LABOR.status).toBe('UNRESOLVED');
    expect(cleanup.requirements.TOOL.status).toBe('UNRESOLVED');
    expect(cleanup.requirements.CONSUMABLE.status).toBe('UNRESOLVED');
    const install=VVGNG_LS_POWER_CABLE_RESOURCES.find(r=>r.row_id==='vvgng:labor:installation')!;
    expect(refs(install.resource_graph.operationCompositionV1).some(o=>o.operationId===source.groupId+':cleanup')).toBe(false);
    expect(source.heldTechnicalEvidence.qaCandidate.selectedActualRisoVoltageV).toBeNull();
    expect(source.heldTechnicalEvidence.qaCandidate.exportIsIncludedInRloKit).toBe(false);
    expect(source.heldTechnicalEvidence.logisticsAndCleaning.handlingAndCleaningLabourCovered).toBe(false);
  });
});


describe('VVG whole existing R919 source cycle',()=>{
 const s=wholeR919;
 // Exact captured native parent is used as retention data. All submitted
 // geometry/inventory/records below are EXPLICIT DEMO, never object facts.
 const parent=()=>JSON.parse(JSON.stringify({header:s.currentParent,body:s.nativeSnapshot})) as Parameters<typeof wholeForward>[0];
 const demo=(length=150,k=1):Record<string,unknown>=>({...VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT,length_m:length,
  [s.profileId]:s.profiles[0]!.value,[s.receivedRecordId]:'EXPLICIT_DEMO_RECEIVED_SOLID_CU_5X6_066_PASSPORT_ROUTE_CUTLIST_SAFE_DEAD_METHOD_NOT_ACTUAL',
  [s.fitId]:s.fit,[s.prepCountId]:k,[s.prepInventoryId]:'EXPLICIT_DEMO_WHOLE_OWNED_PREPARATION_INVENTORY_AND_RECEIVED_TOOL_CHECKS_NOT_ACTUAL',
  [s.terminationMethodId]:s.terminationMethod,[s.terminationRecordId]:'EXPLICIT_DEMO_APPARATUS_M6_SR66_K94_STRIP_CRIMPS_HARDWARE_TORQUE_PROTECTION_NOT_ACTUAL',[s.stripLengthId]:8,
  [s.qaCountId]:k,[s.qaInventoryId]:'EXPLICIT_DEMO_COMPLETE1662EU_MATCHED_ABSENCE_KIT_INVENTORY_VERIFICATION_NOT_ACTUAL',
  [s.qaProgramId]:'EXPLICIT_DEMO_RLO_RISO_PROGRAMME_POINTS_VOLTAGES_CRITERIA_UNIT_SAFE_ISOLATION_NOT_ACTUAL',[s.qaMethodId]:s.qaMethod,[s.qaCordId]:'CEE7_7_4601081',
  [s.resultsId]:'EXPLICIT_DEMO_RESULTS_AND_HANDOVER_REQUIRED_NOT_ACTUAL',[s.diameterId]:16,[s.radiusId]:120,
  [s.balanceScopeId]:s.balanceMeasured,[s.balanceRecordId]:'EXPLICIT_DEMO_COMPARABLE_SAME_BATCH_METRE_ISSUE_RETURN_INSTALLED_RECORD_NOT_ACTUAL',
  [s.issuedId]:length+1,[s.returnedId]:0.5,[s.renewals[0]!.eventId]:0,[s.renewals[1]!.eventId]:0,[s.renewalRecordId]:'EXPLICIT_DEMO_OBSERVED_ZERO_FULL_NEW_ALKALINE_REPLACEMENTS_NOT_ACTUAL'});
 const run=(p:Record<string,unknown>,overrides?:CanonicalEstimateCompileCoreInput['rowOverrides'])=>wholeCompile(parent(),p,overrides);
 const find=(out:Awaited<ReturnType<typeof run>>,key:string)=>[...out.rows,...out.preliminaryNeeds].find(r=>r.row_id===s.prefix+':'+key);
 const cold=(out:Awaited<ReturnType<typeof run>>,p:Record<string,unknown>,parentRevisionId:string|null=null)=>{
  const releaseId='CONTROL_UNSAVED_R919_RELEASE',definitionVersionId='CONTROL_UNSAVED_R919_DEFINITION';
  const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,passport:{definition_version_id:definitionVersionId,payload_sha256:'a'.repeat(64),decision:{independentCompletenessMap:wholeMap()}}})!;
  const checksum=canonicalEstimateSha256HexText(canonicalEstimateStableJson({...out.revisionProjection,operationCompositionEvidenceV1:evidence}));
  const commit=buildCanonicalRevisionCommitPayload({rowCount:out.rows.length,currencyCode:'KGS',totals:out.totals,checksumSha256:checksum,compilerVersion:s.contract,parameters:out.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:p,parentRevisionId,identityContract:{},preliminaryNeeds:out.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const saved={id:parentRevisionId?'CONTROL_UNSAVED_R919_AMENDED':'CONTROL_UNSAVED_R919_INITIAL',release_id:releaseId,definition_version_id:definitionVersionId,catalog_id:s.catalogId,checksum_sha256:checksum,row_count:out.rows.length,input_parameters:out.parameters,amendment_contract:{parameterSources:commit.parameterSources}};
  return JSON.parse(JSON.stringify({saved,resources:[...out.rows,...canonicalArtifactPreliminaryNeeds(saved)]})) as {saved:typeof saved,resources:Record<string,unknown>[]};
 };
 test('retains actual36 native IDs all25 ASTs UUIDs owners and prior7unit needs in the established ordinary producer',()=>{
  const p=parent(),d=wholeForward(p),m=wholeMap(),request=wholeInput(p);
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([69,70,70]);
  for(const old of p.body.parameters)expect(d.parameters.find(v=>v.parameter_id===old.parameter_id)).toMatchObject({parameter_id:old.parameter_id,ordinal:old.ordinal,unit_id:old.unit_id,default_value:old.default_value});
  for(const f of p.body.formulas)expect(d.formulas.find(v=>v.formula_id===f.formula_id)).toEqual(f);
  for(const r of p.body.resources)expect(d.resources.find(v=>v.row_id===r.row_id)).toMatchObject({id:r.id,ordinal:r.ordinal,unit_id:r.unit_id,formula_id:r.formula_id,cost_owner_id:r.cost_owner_id,procurement_eligible:r.procurement_eligible});
  for(const id of s.oldNeedsIds)expect(d.parameters.find(p=>p.parameter_id===id)).toMatchObject({unit_id:null,default_value:null,truth_metadata:{value_source_role:'UNRESOLVED_APPLICATION_NORM'}});
  expect(s.nativeSchemaDeltaInheritedFromPreviousAuthoring.pieceAndTestDecimalToIntegerIds).toHaveLength(5);
  for(const id of s.nativeSchemaDeltaInheritedFromPreviousAuthoring.pieceAndTestDecimalToIntegerIds){expect(p.body.parameters.find(p=>p.parameter_id===id)?.value_type).toBe('decimal');expect(d.parameters.find(p=>p.parameter_id===id)?.value_type).toBe('integer');}
  expect(p.body.parameters.find(p=>p.parameter_id==='cable_mark')?.value_type).toBe('text');expect(d.parameters.find(p=>p.parameter_id==='cable_mark')).toMatchObject({value_type:'enum',constraints_json:{values:['ВВГнг(А)-LS']}});
  expect(d.parameters.find(p=>p.parameter_id==='core_count')?.constraints_json).toMatchObject({min:5,max:5});expect(d.parameters.find(p=>p.parameter_id==='conductor_area_mm2')?.constraints_json).toMatchObject({min:6,max:6});
  for(const id of s.nativeSchemaDeltaInheritedFromPreviousAuthoring.logisticsMinimumOneToZeroIds){expect(p.body.parameters.find(p=>p.parameter_id===id)?.constraints_json).toMatchObject({min:1});expect(d.parameters.find(p=>p.parameter_id===id)?.constraints_json).toMatchObject({min:0});}
  expect(m.operationRoster).toHaveLength(24);expect(validate({completenessMap:m,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);
  expect(request).toMatchObject({catalogId:s.catalogId,sourceKey:s.sourceId,expectedParentShape:[36,25,25],currentRegistryRows:{bindings:1,locators:1,sources:1,newSource:1},sourceRegistryAdmission:null,newReady:false});expect(s.returnWhen).toHaveLength(10);
 });
 test.each([{length:150,k:1},{length:3,k:2},{length:0.125,k:1}])('calculates whole preparation and complete QA at length$length with actual K$k separately from source and price HOLD',async({length,k})=>{
  const out=await run(demo(length,k));
  let total=0;for(const p of s.qaParts){expect(find(out,p.key)?.quantity).toBe(String(p.countPerWhole*k));total+=p.countPerWhole*k;}expect(total).toBe(34*k);
  for(const p of s.preparationParts)expect(find(out,p.key)?.quantity).toBe(String(p.countPerWhole*k));
  expect(out.preliminaryNeeds.find(n=>n.row_id===s.prefix+':solid-crimper')).toMatchObject({need_state:'CONDITION_REQUIRED',quantity:String(k),missing_parameter_ids:expect.arrayContaining([s.sourceGateId])});
  expect(out.preliminaryNeeds.find(n=>n.row_id==='rc09:vvgng_a_ls_5x6_cable')?.quantity).toBe(String(Math.ceil(length)));
  expect(out.rows.filter(r=>r.included_in_estimate||r.included_in_procurement)).toEqual([]);
 });
 test('uses7point5actualDiameter and exact received profile limits without accepting a too tight route or manual bypass',async()=>{
  const p=demo(),out=await run(p);expect(find(out,'minimum-bend-radius')?.quantity).toBe('120');expect(find(out,'bend-radius-margin')?.quantity).toBe('0');
  expect(find(out,'diameter-margin-0')?.quantity).toBe('0.5');
  await expect(run({...p,[s.radiusId]:119.999})).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
  await expect(run({...p,[s.diameterId]:16.6,[s.radiusId]:130})).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
  await expect(run({...p,[s.radiusId]:119},{[s.prefix+':bend-radius-margin']:{quantity:'1',provenance:{kind:'manual',reason:'EXPLICIT_DEMO_ATTEMPT_TO_BYPASS_PHYSICAL_LIMIT'}}})).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
  const one=await run({...p,[s.profileId]:s.profiles[1]!.value,[s.diameterId]:18.1,[s.radiusId]:135.75});expect(find(one,'bend-radius-margin')?.quantity).toBe('0');expect(find(one,'diameter-margin-1')?.quantity).toBe('0');
 });
 test('rejects wrong cable and solid termination choices without moving a cutter limit onto stripping or a nominal range onto K05D',async()=>{
  for(const wrong of [{[s.profileId]:'GENERIC_VVG_5X6_OR_CAT6A'},{[s.terminationMethodId]:'CLASS2_1R6_K05'},{[s.terminationMethodId]:'DIN101R6_K05D_CLASS1_6'},{[s.qaMethodId]:'1664_AUTOTEST_OR_EARTH'},{[s.stripLengthId]:5.9},{[s.stripLengthId]:18.1}])await expect(run({...demo(),...wrong})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  expect(s.webFacts.find(f=>f.id==='wrong-crimper')?.facts).toMatchObject({excluded:'CLASS1_CU_6_MM2'});
  expect(s.webFacts.find(f=>f.id==='solid-lug')?.facts).toMatchObject({conductorClass:1,areaMm2:6,stud:'M6'});
  expect(s.preparationParts.find(p=>p.key==='cable-shear')?.internalReference).toBe('KNIPEX9517500');
  expect(s.preparationParts.find(p=>p.key==='wire-stripper')?.boundary).toContain('solid6 cutter');
  expect((await run(demo())).preliminaryNeeds.find(n=>n.row_id==='rc09:copper_lug_6mm2')?.quantity).toBe('11');
 });
 test('separates initial twelveAA at K2 from two independent documented6times replacement events and from unknown hours',async()=>{
  const p={...demo(3,2),[s.renewals[0]!.eventId]:3,[s.renewals[1]!.eventId]:2},out=await run(p);
  expect(find(out,'qa-proving-batteries')?.quantity).toBe('12');expect(find(out,'qa-continuity-batteries')?.quantity).toBe('12');
  expect(find(out,s.renewals[0]!.key)?.quantity).toBe('18');expect(find(out,s.renewals[1]!.key)?.quantity).toBe('12');
  expect(out.preliminaryNeeds.find(n=>n.row_id==='vvgng:equipment:installation-tester')?.quantity).toBe('3');
  for(const value of [-1,0.5])await expect(run({...p,[s.renewals[0]!.eventId]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  const missing={...p};delete missing[s.renewalRecordId];expect((await run(missing)).preliminaryNeeds.find(n=>n.row_id===s.prefix+':'+s.renewals[0]!.key)?.missing_parameter_ids).toContain(s.renewalRecordId);
 });
 test('calculates only accepted samebatch issue minus reusable return and installed difference while MOQ500 and PU25 remain outside consumption',async()=>{
  const out=await run({...demo(3),[s.issuedId]:4.125,[s.returnedId]:0.625});expect(find(out,'measured-net-issued')?.quantity).toBe('3.5');expect(find(out,'measured-noninstalled-difference')?.quantity).toBe('0.5');
  for(const wrong of [{[s.returnedId]:5},{[s.issuedId]:2}])await expect(run({...demo(3),...wrong})).rejects.toMatchObject({code:'FORMULA_OUTPUT_BOUNDS_FAILED'});
  expect(s.factoryMinimumOrderMetres).toBe(500);expect(s.factoryMoqIsNotCutIncrement).toBe(true);expect(s.factoryPuLug25IsNotInstalledQuantity).toBe(true);
  expect(VVGNG_LS_POWER_CABLE_RUNTIME_INPUT.cable_supplier_cut_increment_m).toBe(1);
  expect(wholeForward(parent()).formulas.find(f=>f.formula_id==='vvgng_a_ls_5x6_cable_order_length_v2')).toEqual(parent().body.formulas.find(f=>f.formula_id==='vvgng_a_ls_5x6_cable_order_length_v2'));
 });
 test('distinguishes numeric UNKNOWN from missing mandatory samebatch record and invalid empty input without a numeric compatibility peer',async()=>{
  const p=demo();delete p[s.issuedId];delete p[s.returnedId];const out=await run(p);
  expect(out.preliminaryNeeds.find(n=>n.row_id===s.prefix+':measured-net-issued')).toMatchObject({need_state:'QUANTITY_REQUIRED',missing_parameter_ids:expect.arrayContaining([s.issuedId,s.returnedId])});
  const noRecord=demo();delete noRecord[s.balanceRecordId];expect((await run(noRecord)).preliminaryNeeds.find(n=>n.row_id===s.prefix+':measured-net-issued')).toMatchObject({need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([s.balanceRecordId])});
  await expect(run({...demo(),[s.balanceRecordId]:''})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  const d=wholeForward(parent());for(const id of [s.issuedId,s.returnedId])expect(d.parameters.find(p=>p.parameter_id===id)?.constraints_json).not.toHaveProperty('greaterThanOrEqualParameter');
 });
 test('rejects consumer and confirmed scalar source approval for whole admission and all7inherited unit needs with the real unresolved authority reason',async()=>{
  const d=wholeForward(parent());
  for(const id of [s.sourceGateId,...s.oldNeedsIds]){expect(d.parameters.find(p=>p.parameter_id===id)).toMatchObject({default_value:null,truth_metadata:{value_source_role:'UNRESOLVED_APPLICATION_NORM',visibility_role:'INTERNAL_ONLY',provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}});
   const value=id===s.sourceGateId?s.sourceGateValue:1;
   for(const confirmed of [false,true])await expect(compileCanonicalEstimateCore({operation:'compile',catalogId:s.catalogId,compilerVersion:s.contract,primaryMeasureParameterId:'length_m',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],submittedParameters:confirmed?demo():{...demo(),[id]:value},confirmedParameters:{...d.runtimeInput,...(confirmed?{[id]:value}:{})},currencyCode:'KGS',priceItems:[],maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED',message:'unresolved application norm cannot be supplied '+id});
  }
 });
 test('permits explicit preliminary manual amounts while source HOLD survives and refuses ineligible procurement without changing original owners',async()=>{
  const id=s.prefix+':solid-crimper',input=demo();
  // Definition-owned INFORMATIONAL_SCOPE normalizes a requested purchase to
  // false while retaining the request and the explicit preliminary edit.
  const requested=await run(input,{[id]:{quantity:'3',unitPrice:'77',includedInEstimate:false,includedInProcurement:true,provenance:{kind:'manual',reason:'EXPLICIT_DEMO_REQUEST_DOES_NOT_OVERRIDE_INFORMATIONAL_COST_TREATMENT'}}});
  const need=requested.preliminaryNeeds.find(n=>n.row_id===id)!;
  expect(need).toMatchObject({quantity:'3',unit_price:'77',selected:false,procurement_eligible:false,need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([s.sourceGateId]),
   calculation_trace:{inclusionDecision:{source:'definition_cost_treatment',costTreatment:'INFORMATIONAL_SCOPE',costTreatmentSource:'resource_graph',requestedIncludedInEstimate:false,requestedIncludedInProcurement:true,effectiveIncludedInEstimate:false,effectiveIncludedInProcurement:false}}});
  const initial=cold(await run(input),input),reopened=cold(requested,input,initial.saved.id),savedNeed=reopened.resources.find(r=>r.row_id===id)!;
  expect(savedNeed).toMatchObject({quantity:'3',unit_price:'77',included_in_estimate:false,included_in_procurement:false,need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([s.sourceGateId]),calculation_trace:{resourceGraph:{costTreatment:'INFORMATIONAL_SCOPE'},inclusionDecision:{requestedIncludedInProcurement:true,effectiveIncludedInEstimate:false,effectiveIncludedInProcurement:false}}});
  expect(reopened.saved.amendment_contract.parameterSources).toMatchObject({parentRevisionId:initial.saved.id});
  const coldGate=canonicalEstimateSavedOperationAcceptanceV1({revision:reopened.saved,resources:reopened.resources});expect(coldGate.pdfAllowed).toBe(false);expect(coldGate.completeClaimAllowed).toBe(false);
  const out=await run(demo(),{[id]:{quantity:'3',unitPrice:'77',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'EXPLICIT_DEMO_PRELIMINARY_AMOUNT_NOT_SOURCE_APPROVAL'}}});
  expect(out.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:'3',unit_price:'77',need_state:'CONDITION_REQUIRED',missing_parameter_ids:expect.arrayContaining([s.sourceGateId])});
  const d=wholeForward(parent());for(const part of [...s.preparationParts,...s.qaParts])expect(d.resources.find(r=>r.row_id===s.prefix+':'+part.key)).toMatchObject({cost_owner_id:null,procurement_eligible:false,resource_graph:{costTreatment:'INFORMATIONAL_SCOPE',physicalProvisionV1:{newPurchaseClaimed:false,rentalDurationClaimed:false,servicePriceCoverageAuthenticated:false}}});
  expect(d.resources.find(r=>r.row_id==='vvgng:equipment:crimp-tool')?.cost_owner_id).toBe('vvgng:equipment:crimp-tool');
 });
 test('rejects exact actual parent UUID owner ordinal metadata and changed capturedAST drift rather than a no-op literal mutation',()=>{
  const header=parent();header.header.definition_sha256='e'.repeat(64);expect(()=>wholeForward(header)).toThrow('VVGNG_EXACT_CURRENT_R919_REQUIRED');
  for(const field of ['id','cost_owner_id','ordinal'] as const){const p=parent(),r=p.body.resources[0] as unknown as Record<string,unknown>;r[field]=field==='ordinal'?999:'FOREIGN';expect(()=>wholeForward(p)).toThrow('VVGNG_WHOLE_NATIVE_RESOURCES_DRIFT:');}
  const metadata=parent();metadata.body.resources[0]!.source_metadata={foreign:'SOURCE_DRIFT'};expect(()=>wholeForward(metadata)).toThrow('VVGNG_WHOLE_NATIVE_RESOURCES_DRIFT:');
  const changed=parent(),f=changed.body.formulas[0]!,captured=JSON.parse(JSON.stringify(f.ast));f.ast={kind:'binary',operator:'+',left:captured,right:{kind:'literal',value:'1'}};expect(f.ast).not.toEqual(captured);expect(()=>wholeForward(changed)).toThrow('VVGNG_WHOLE_NATIVE_FORMULAS_DRIFT:'+f.formula_id);
 });
 test('retains mandatory consumers and catches excluded measurement accessory and a foreign CAT6A operation without claiming source-ready composition',()=>{
  const d=wholeForward(parent()),m=wholeMap(),id=s.prefix+':qa-continuity-zero-adapter';
  const check=(resources:typeof d.resources)=>validate({completenessMap:m,formulaDefinitions:d.formulas,resourceDefinitions:resources,requireOperationBindings:true});
  expect(check(d.resources.filter(r=>r.row_id!==id)).length).toBeGreaterThan(0);
  const foreign=d.resources.map(r=>r.row_id!==id?r:{...r,resource_graph:{...r.resource_graph,operationCompositionV1:{...refs(r.resource_graph.operationCompositionV1)[0],groupId:'CAT6A_FOREIGN',operationId:'CAT6A_FOREIGN:qa'}}});expect(check(foreign).length).toBeGreaterThan(0);
  const checkPublisher=auditPublisher({resourceDefinitions:d.resources,independentComposition:m});expect(checkPublisher.completeClaimAllowed).toBe(false);expect(checkPublisher.pdfAllowed).toBe(false);
  const cable=d.resources.find(r=>r.row_id==='rc09:vvgng_a_ls_5x6_cable')!;expect(refs(cable.resource_graph.operationCompositionV1).map(o=>o.operationId)).toEqual(expect.arrayContaining([source.groupId+':unwind',source.groupId+':lay',source.groupId+':cut']));
 });
 test('retains mandatory condition source unit and whole-scope HOLD through Core commit cold exclusion and common saved PDF controls',async()=>{
  const p=demo(),out=await run(p),saved=cold(out,p),bytes=JSON.stringify(saved),gate=canonicalEstimateSavedOperationAcceptanceV1({revision:saved.saved,resources:saved.resources});
  expect(gate.pdfAllowed).toBe(false);expect(gate.completeClaimAllowed).toBe(false);expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(gate)).toThrow(expect.objectContaining({httpStatus:409}));expect(JSON.stringify(saved)).toBe(bytes);
  expect(saved.resources.some(r=>r.row_id===s.prefix+':qa-continuity-zero-adapter')).toBe(true);
  const id=s.prefix+':qa-continuity-zero-adapter',amended=await run(p,{[id]:{quantity:'0',includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'EXPLICIT_DEMO_EXCLUSION_IS_NOT_ACCEPTED_NA_OR_SOURCE'}}}),reopened=cold(amended,p,saved.saved.id);
  expect(reopened.saved.amendment_contract.parameterSources).toMatchObject({parentRevisionId:saved.saved.id});expect(canonicalEstimateSavedOperationAcceptanceV1({revision:reopened.saved,resources:reopened.resources}).pdfAllowed).toBe(false);
  for(const need of source.needs)expect(amended.preliminaryNeeds.find(n=>n.row_id===need.rowId)?.quantity).toBeNull();
 });
});
