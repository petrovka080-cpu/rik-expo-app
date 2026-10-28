import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from '../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore';
import {estimateDeterministicHash} from '../../src/lib/estimate/estimateDeterministicHash';
import {canonicalEstimateStableJson} from '../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalEstimateSha256HexText} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSha256';
import {canonicalOperationCompositionEvidenceFromPassportV1,canonicalEstimateSavedOperationAcceptanceV1,assertCanonicalEstimateSavedArtifactStructureV1} from '../../src/lib/estimate/backendPlatform/canonicalEstimateSavedOperationAcceptanceV1';
import {buildCanonicalRevisionCommitPayload} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter';
import {canonicalArtifactPreliminaryNeeds} from '../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract';
import {auditCanonicalPublisherSuccessorOperationResourcesR1 as auditPublisher} from '../../scripts/estimate/r4a13/canonicalDefinitionPublisherR1';
import {validateIndependentCompletenessMapReferences} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {ledSurfaceInstallationConfigR1} from '../../scripts/estimate/r4a13/prepareMasterLedLuminaireInstallationSuccessor';
import {
  LED_SURFACE_WHOLE_SOURCE_R1, LED_SURFACE_FACTORY_DEMO_R1,
  ledSurfaceWholeDefinitionR1, ledSurfaceWholeCompletenessR1, ledSurfaceFactoryComponentRowIdsR1,
  assertLedSurfaceWholeFactoryDefinitionR1,
  LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
  LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
  LED_LUMINAIRE_INSTALLATION_FORMULAS,
  LED_LUMINAIRE_INSTALLATION_PARAMETERS,
  LED_LUMINAIRE_INSTALLATION_RESOURCES,
  LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT,
  LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
  compileLedLuminaireInstallationR1,
} from "../../src/lib/estimate/v4/ledLuminaireInstallationR1";

const REQUIRED = [
  "rc09:led_luminaire_install", "rc09:led_luminaire_36w_ip40",
  "rc09:luminaire_mounting_anchor_set", "rc09:luminaire_terminal_connector",
  "rc09:luminaire_connection_wire_3x1_5", "rc09:luminaire_pe_lug",
  "rc09:luminaire_work_platform", "rc09:luminaire_pe_continuity_test",
] as const;
const CONDITIONAL = [
  "rc09:separate_led_driver", "rc09:suspended_ceiling_reinforcement_adapter",
] as const;
const DIRECT_RESOURCE_NEEDS = [
  "led:labor:installation", "led:labor:testing",
  "led:equipment:drilling-tool", "led:equipment:installation-tool",
  "led:equipment:tester", "led:logistics:delivery", "led:logistics:waste-removal",
] as const;

describe("MASTER LED luminaire installation owner", () => {
  test("uses known count and identity without importing historical rates", () => {
    expect(LED_LUMINAIRE_INSTALLATION_CATALOG_ID)
      .toBe("canonical-work:base:electrical_interior_lighting_install_standard");
    expect(LED_LUMINAIRE_INSTALLATION_PARAMETERS).toHaveLength(31);
    expect(LED_LUMINAIRE_INSTALLATION_FORMULAS).toHaveLength(23);
    expect(LED_LUMINAIRE_INSTALLATION_RESOURCES).toHaveLength(23);
    expect(LED_LUMINAIRE_INSTALLATION_RUNTIME_INPUT).toEqual({
      luminaire_retained_spare_piece: 0,
      luminaire_supplier_pack_size_piece: 1,
    });
    expect(JSON.stringify(LED_LUMINAIRE_INSTALLATION_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|luminaire_count\s*\*\s*(?:0\.6|0\.02)/iu);
    expect(LED_LUMINAIRE_INSTALLATION_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:lighting_cable_line", "rc09:light_switch", "rc09:distribution_board",
      ]));
  });

  test("known thirty luminaires give a useful visible balance plus local needs", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "30", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "30", unit_id: "pcs" }),
    ]));
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "led:balance:installed-net", quantity: "30" }),
      expect.objectContaining({ row_id: "led:balance:retained-spare", quantity: "0" }),
      expect.objectContaining({ row_id: "led:balance:total-need", quantity: "30" }),
      expect.objectContaining({ row_id: "led:balance:package-count", quantity: "30" }),
      expect.objectContaining({ row_id: "led:balance:remainder", quantity: "0" }),
      expect.objectContaining({ row_id: "led:balance:surplus-beyond-reserve", quantity: "0" }),
    ]));
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        ...REQUIRED.slice(2), ...CONDITIONAL, ...DIRECT_RESOURCE_NEEDS,
      ]));
    expect(compiled.preliminaryNeeds).toHaveLength(21);
    expect(compiled.preliminaryNeeds.map(n=>n.row_id)).toEqual(expect.arrayContaining(ledSurfaceFactoryComponentRowIdsR1));
  });

  test("compiles the evidence-bound fixture with labor, equipment and logistics", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual([...ledSurfaceFactoryComponentRowIdsR1,REQUIRED[2]].sort());
    expect(compiled.rows).toHaveLength(20);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[4], quantity: "18", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "0.6", unit_id: "shift" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "30", unit_id: "test" }),
      expect.objectContaining({ row_id: "led:labor:installation", quantity: "18",
        unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "led:labor:testing", quantity: "3",
        unit_id: "man_hour" }),
      expect.objectContaining({ row_id: "led:equipment:drilling-tool", quantity: "6",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "led:equipment:installation-tool", quantity: "10",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "led:equipment:tester", quantity: "3",
        unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: "led:logistics:delivery", quantity: "1",
        unit_id: "trip" }),
      expect.objectContaining({ row_id: "led:logistics:waste-removal", quantity: "1",
        unit_id: "trip" }),
    ]));
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[0])?.included_in_estimate)
      .toBe(false);
    expect(compiled.rows.find((row) => row.row_id === REQUIRED[7])?.included_in_estimate)
      .toBe(false);
  });

  test("separates installed quantity, retained spare, packages, order and remainder", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
      luminaire_retained_spare_piece: 3,
      luminaire_supplier_pack_size_piece: 8,
    });
    const rows = new Map(compiled.rows.map((row) => [row.row_id, row]));
    expect(rows.get("led:balance:installed-net")?.quantity).toBe("30");
    expect(rows.get("led:balance:retained-spare")?.quantity).toBe("3");
    expect(rows.get("led:balance:total-need")?.quantity).toBe("33");
    expect(rows.get("led:balance:package-count")?.quantity).toBe("5");
    expect(rows.get(REQUIRED[1])?.quantity).toBe("40");
    expect(rows.get("led:balance:remainder")?.quantity).toBe("10");
    expect(rows.get("led:balance:surplus-beyond-reserve")?.quantity).toBe("7");
    expect(compiled.rows.filter((row) => row.row_id.startsWith("led:balance:")
      && row.included_in_procurement)).toEqual([]);
  });

  test("keeps separate drivers and ceiling adapters conditional", async () => {
    const compiled = await compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,
      separate_driver_mode: "REQUIRED",
      separate_driver_designation: "Драйвер по ведомости светильников",
      separate_driver_quantity_piece: 30,
      ceiling_adapter_mode: "REQUIRED",
      ceiling_adapter_designation: "Адаптер усиления по узлу потолка",
      ceiling_adapter_quantity_set: 30,
    });
    expect(compiled.preliminaryNeeds.map(n=>n.row_id).sort()).toEqual([...ledSurfaceFactoryComponentRowIdsR1,REQUIRED[2]].sort());
    expect(compiled.rows).toHaveLength(22);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL[0], quantity: "30", unit_id: "pcs" }),
      expect.objectContaining({ row_id: CONDITIONAL[1], quantity: "30", unit_id: "set" }),
    ]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileLedLuminaireInstallationR1({
      ...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT, luminaire_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileLedLuminaireInstallationR1(
      { ...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT },
      { catalogId: `${LED_LUMINAIRE_INSTALLATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("LED_LUMINAIRE_INSTALLATION_CATALOG_UNSUPPORTED");
  });
});


describe('surface36 whole ordinary source cycle',()=>{
 const source=LED_SURFACE_WHOLE_SOURCE_R1;
 const demo=(n=3)=>({...LED_LUMINAIRE_INSTALLATION_SHORT_INPUT,...LED_SURFACE_FACTORY_DEMO_R1,luminaire_count:n});
 const run=(parameters:Record<string,unknown>,rowOverrides:CanonicalEstimateCompileCoreInput['rowOverrides']={})=>{
  const d=ledSurfaceWholeDefinitionR1();
  return compileCanonicalEstimateCore({operation:Object.keys(rowOverrides??{}).length?'recalculate':'compile',catalogId:LED_LUMINAIRE_INSTALLATION_CATALOG_ID,
   compilerVersion:source.contract,primaryMeasureParameterId:'luminaire_count',parameterDefinitions:[...d.parameters],formulaDefinitions:[...d.formulas],resourceDefinitions:[...d.resources],
   submittedParameters:parameters,confirmedParameters:{...d.runtimeInput},rowOverrides,priceItems:[],currencyCode:'KGS',maximumResourceRows:d.resources.length,hashJson:estimateDeterministicHash});
 };
 const savedProjection=(result:Awaited<ReturnType<typeof run>>,parameters:Record<string,unknown>,parentRevisionId:string|null=null)=>{
  const releaseId='CONTROL_UNSAVED_LED_RELEASE',definitionVersionId='CONTROL_UNSAVED_LED_DEFINITION',map=ledSurfaceWholeCompletenessR1();
  const evidence=canonicalOperationCompositionEvidenceFromPassportV1({releaseId,definitionVersionId,
   passport:{definition_version_id:definitionVersionId,payload_sha256:'d'.repeat(64),decision:{independentCompletenessMap:map}}})!;
  const checksum=canonicalEstimateSha256HexText(canonicalEstimateStableJson({...result.revisionProjection,operationCompositionEvidenceV1:evidence}));
  const commit=buildCanonicalRevisionCommitPayload({rowCount:result.rows.length,currencyCode:'KGS',totals:result.totals,checksumSha256:checksum,
   compilerVersion:source.contract,parameters:result.parameters,approvedTemplateBaselineId:null,baselineAssumptions:{},effectiveUserParameters:parameters,
   parentRevisionId,identityContract:{},preliminaryNeeds:result.preliminaryNeeds,operationCompositionEvidenceV1:evidence});
  const saved={id:parentRevisionId?'CONTROL_UNSAVED_LED_AMENDED':'CONTROL_UNSAVED_LED_INITIAL',release_id:releaseId,definition_version_id:definitionVersionId,
   catalog_id:LED_LUMINAIRE_INSTALLATION_CATALOG_ID,checksum_sha256:checksum,row_count:result.rows.length,input_parameters:result.parameters,
   amendment_contract:{parameterSources:commit.parameterSources}};
  return JSON.parse(JSON.stringify({saved,resources:[...result.rows,...canonicalArtifactPreliminaryNeeds(saved)]})) as {saved:typeof saved;resources:Record<string,unknown>[]};
 };
 test('preserves the existing parent logical identities and physical ids while declaring fourteen real consumers',()=>{
  const parent={parameters:LED_LUMINAIRE_INSTALLATION_PARAMETERS,formulas:LED_LUMINAIRE_INSTALLATION_FORMULAS,
   resources:LED_LUMINAIRE_INSTALLATION_RESOURCES.map((r,i)=>({...r,id:'CONTROL_PARENT_RESOURCE_UUID_'+i}))};
  const d=ledSurfaceWholeDefinitionR1(parent),map=ledSurfaceWholeCompletenessR1();
  expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([35,29,29]);
  for(const r of parent.resources)expect(d.resources.find(x=>x.row_id===r.row_id)).toMatchObject({id:r.id,ordinal:r.ordinal,unit_id:r.unit_id,formula_id:r.formula_id,cost_owner_id:r.cost_owner_id});
  expect(d.formulas.slice(0,23)).toEqual(parent.formulas);
  expect(map.operationRoster).toHaveLength(14);
  expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources,requireOperationBindings:true})).toEqual([]);
  expect(map.operationRequirements.flatMap(o=>Object.values(o.requirements))).toHaveLength(140);
  expect(map.operationRequirements.every(o=>Object.values(o.requirements).every(r=>r.status==='UNRESOLVED'&&r.rowIds.length===0))).toBe(true);
  expect(()=>assertLedSurfaceWholeFactoryDefinitionR1(d)).not.toThrow();
 });
 test.each([1,3])('uses exact complete factory BOM at installed N=%i with one paid owner and all consumers',async n=>{
  const d=ledSurfaceWholeDefinitionR1(),r=await run(demo(n));
  for(const c of source.factoryComponents){const id=source.prefix+':'+c.key,row=r.rows.find(x=>x.row_id===id)!,definition=d.resources.find(x=>x.row_id===id)!;
   expect(row).toMatchObject({quantity:String(n*c.countPerLuminaire),unit_id:'pcs',included_in_estimate:false,included_in_procurement:false});
   expect(definition).toMatchObject({cost_owner_id:source.paidFactoryOwnerRowId,procurement_eligible:false,source_metadata:{normativeTrace:[],independentPurchaseAllowed:false}});
   const op=definition.resource_graph.operationCompositionV1 as Record<string,any>;
   expect([op,...op.additionalOperations].map(o=>o.operationId)).toEqual(c.uses.map(k=>source.prefix+':'+k));
  }
  expect(r.rows.some(x=>x.row_id===REQUIRED[2])).toBe(false);
  expect(r.preliminaryNeeds.some(x=>x.row_id===REQUIRED[2])).toBe(false);
  expect(r.preliminaryNeeds.length).toBeGreaterThan(0);
 });
 test('separates the factory consumption from retained spare, package order and additional project fixing',async()=>{
  const r=await run({...demo(3),luminaire_retained_spare_piece:2,luminaire_supplier_pack_size_piece:4});
  expect(r.rows.find(x=>x.row_id===source.paidFactoryOwnerRowId)?.quantity).toBe('8');
  expect(r.rows.find(x=>x.row_id===source.prefix+':factory-mounting-clip')?.quantity).toBe('6');
  const parameters={...demo(3),[source.additionalMountingId]:source.additionalMountingValue,
   anchor_set_designation:'CONTROL_DISTINCT_EXTRA_BASE_KIT_NOT_FACTORY_SCREWS',anchor_set_quantity_set:2};
  const extra=await run(parameters);
  expect(extra.rows.find(x=>x.row_id===REQUIRED[2])?.quantity).toBe('2');
  expect(extra.rows.find(x=>x.row_id===source.prefix+':factory-mounting-plug')?.quantity).toBe('6');
  expect(ledSurfaceWholeDefinitionR1().resources.find(x=>x.row_id===REQUIRED[2])?.cost_owner_id).toBe(REQUIRED[2]);
 });
 test('rejects fractional and negative installed counts instead of rounding a factory kit',async()=>{
  for(const luminaire_count of [1.5,-1])await expect(run({...demo(1),luminaire_count})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('holds unknown factory applicability and document independently of a known count or manual amount',async()=>{
  const unknown={...demo(1)} as Record<string,unknown>;delete unknown[source.factoryFitId];delete unknown[source.factoryDocumentId];
  const id=source.prefix+':factory-mounting-clip',r=await run(unknown,{[id]:{quantity:'2',provenance:{kind:'manual',reason:'CONTROL_KNOWN_COUNT_NOT_METHOD_OR_SOURCE_ADMISSION'}}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)).toMatchObject({quantity:'2',need_state:'CONDITION_REQUIRED',calculation_trace:{manualQuantityOverride:true}});
  expect(r.preliminaryNeeds.find(n=>n.row_id===id)?.missing_parameter_ids).toEqual(expect.arrayContaining([source.factoryFitId,source.factoryDocumentId]));
  for(const invalid of ['', ' '])await expect(run({...demo(1),[source.factoryDocumentId]:invalid})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
 });
 test('rejects a different factory profile and an incompatible second external driver without changing generic legacy branches',async()=>{
  for(const value of ['18W_IP40_CLASS_II','36W_1190x60x22','NEW_EAN_WITHOUT_REVISION_PROOF'])await expect(run({...demo(1),[source.factoryProfileId]:value})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  await expect(run({...demo(1),separate_driver_mode:'REQUIRED',separate_driver_designation:'CONTROL_SECOND_DRIVER',separate_driver_quantity_piece:1})).rejects.toMatchObject({code:'PARAMETER_VALIDATION_FAILED'});
  const legacy=await run({...LED_LUMINAIRE_INSTALLATION_ACCEPTANCE_INPUT,separate_driver_mode:'REQUIRED',separate_driver_designation:'CONTROL_OTHER_EXPLICIT_PROJECT_VARIANT',separate_driver_quantity_piece:2});
  expect(legacy.rows.find(x=>x.row_id===CONDITIONAL[0])?.quantity).toBe('2');
 });
 test('rejects missing factory parts, a foreign owner, a changed count basis and lost shared operation consumers',()=>{
  const d=ledSurfaceWholeDefinitionR1(),id=source.prefix+':factory-mounting-clip';
  for(const change of [
   {resources:d.resources.filter(r=>r.row_id!==id)},
   {resources:d.resources.map(r=>r.row_id===id?{...r,cost_owner_id:REQUIRED[2]}:r)},
   {formulas:d.formulas.map(f=>f.formula_id===source.prefix+':formula:factory-mounting-clip'?{...f,expression_source:'luminaire_count*1'}:f)},
   {resources:d.resources.map(r=>r.row_id===id?{...r,resource_graph:{...r.resource_graph,operationCompositionV1:{operationId:source.prefix+':receive',additionalOperations:[]}}}:r)},
  ])expect(()=>assertLedSurfaceWholeFactoryDefinitionR1({...d,...change})).toThrow(/LED_SURFACE_FACTORY_COMPONENT_/);
 });
 test('keeps Core to synthetic saved projection held for the complete source composition and manual exclusions',async()=>{
  const parameters=demo(1),first=await run(parameters),saved=savedProjection(first,parameters),before=JSON.stringify(saved);
  const gate=canonicalEstimateSavedOperationAcceptanceV1({revision:saved.saved,resources:saved.resources});
  expect(gate.pdfAllowed).toBe(false);expect(gate.completeClaimAllowed).toBe(false);
  expect(()=>assertCanonicalEstimateSavedArtifactStructureV1(gate)).toThrow(expect.objectContaining({httpStatus:409}));
  expect(JSON.stringify(saved)).toBe(before);
  const id=source.prefix+':factory-mounting-clip',manual=await run(parameters,{[id]:{includedInEstimate:false,includedInProcurement:false,provenance:{kind:'manual',reason:'CONTROL_EXCLUSION_DOES_NOT_AUTHENTICATE_FULL_SCOPE'}}});
  const amended=savedProjection(manual,parameters,saved.saved.id);
  expect(amended.saved.amendment_contract.parameterSources).toMatchObject({parentRevisionId:saved.saved.id});
  expect(canonicalEstimateSavedOperationAcceptanceV1({revision:amended.saved,resources:amended.resources}).pdfAllowed).toBe(false);
  expect(auditPublisher({resourceDefinitions:ledSurfaceWholeDefinitionR1().resources,independentComposition:ledSurfaceWholeCompletenessR1()}).definitionAdmissionAllowed).toBe(false);
 });
 test('uses the existing ordinary writer with exact parent preconditions and does not turn source arrays into a current receipt',()=>{
  const d={parameters:LED_LUMINAIRE_INSTALLATION_PARAMETERS,formulas:LED_LUMINAIRE_INSTALLATION_FORMULAS,resources:LED_LUMINAIRE_INSTALLATION_RESOURCES};
  expect(()=>ledSurfaceInstallationConfigR1({releaseId:'CONTROL',searchReleaseId:'CONTROL',currentBody:d,expectedPreimage:{header:{},sets:{}}})).toThrow('LED_SURFACE_ACTUAL_R830_PREIMAGE_REQUIRED');
  expect(source.currentParent.shape).toEqual([31,23,23]);expect(source.physicalNeedsClosed).toBe(0);expect(source.publicationAllowed).toBe(false);
  expect(source.privateProductEvidence.eanRevisionEquivalenceProved).toBe(false);
  expect(source.returnWhen.map(n=>n.id)).toEqual(expect.arrayContaining(['LED36-EXACT-PACKAGE-REVISION','LED36-CONTACT-CABLE','LED36-QA-HANDOVER','LED36-LOGISTICS-CLEANUP']));
 });
});
