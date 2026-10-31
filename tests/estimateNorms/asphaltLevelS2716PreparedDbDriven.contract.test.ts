import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {Client} from "pg";
import {asphaltLevelExistingStandardR566 as profile} from "../../src/lib/estimate/v4/asphaltLevelExistingStandardR566";
import {canonicalApprovedBaselineRuntimeParameters} from "../../src/lib/estimate/backendPlatform/canonicalEstimateApprovedBaseline";
import {compileCanonicalEstimateCore,type CanonicalEstimateCompileCoreInput} from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {estimateDeterministicHash} from "../../src/lib/estimate/estimateDeterministicHash";
import {validateIndependentCompletenessMapReferences} from "../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1";

type Json=Record<string,any>;
const DATABASE_URL=process.env.R4A13_DATABASE_URL??"postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const CURRENT_RELEASE_PATH=resolve(process.env.R4A13_CURRENT_RELEASE_PATH??"data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const id=(value:string)=>profile.namespace+value;

describe("current existing asphalt-level standard with source-owned 27-06-019-02 thickness increments",()=>{
 test("compiles the persisted transferred graph with measured geometry, immutable norms and no retired public work",async()=>{
  const current=JSON.parse(readFileSync(CURRENT_RELEASE_PATH,"utf8")) as Json;
  const client=new Client({connectionString:DATABASE_URL});await client.connect();
  try{
   await client.query("begin isolation level repeatable read read only");
   const definition=(await client.query(`select manifest.definition_version_id::text id,version.definition_version,
    version.source_metadata,version.applicability,baseline.input_values,baseline.input_classification,baseline.normative_source_ids,
    passport.decision from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version version on version.id=manifest.definition_version_id
    join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
    join public.estimate_content_passport_r3 passport on passport.definition_version_id=version.id
    where manifest.release_id=$1 and manifest.catalog_id=$2`,[current.definitionReleaseId,profile.catalogId])).rows[0] as Json;
   expect(definition.source_metadata.contract).toBe("gox-build.asphalt-level-existing-standard/r566");
   expect(definition.source_metadata.retainedParentBindingSuccessorV1).toMatchObject({
    contract:"gox-build.asphalt-level-existing-standard/r566",sourceId:profile.sourceId,normId:profile.normId,
    parentDefinitionId:profile.parents.standard.definitionId,capturedParentSha256:profile.parents.standard.capturedParentSha256});
   expect(Number(definition.definition_version)).toBeGreaterThanOrEqual(10);
   expect(definition.applicability.primaryMeasureParameterId).toBe(id("area_m2"));
   const parameters=(await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",[definition.id])).rows;
   const formulas=(await client.query("select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",[definition.id])).rows;
   const resources=(await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",[definition.id])).rows;
   expect([parameters.length,formulas.length,resources.length]).toEqual([51,48,81]);
   expect(validateIndependentCompletenessMapReferences({completenessMap:definition.decision.independentCompletenessMap,formulaDefinitions:formulas,resourceDefinitions:resources})).toEqual([]);
   const sourceRows=(await client.query(`select source.source_key,source.artifact_sha256,locator.id::text locator_id,binding.resource_spec_id::text row_id
    from public.estimate_work_normative_binding binding join public.estimate_normative_locator locator on locator.id=binding.locator_id
    join public.estimate_normative_source source on source.id=locator.source_id where binding.definition_version_id=$1`,[definition.id])).rows;
   expect(sourceRows).toHaveLength(1);expect(sourceRows[0]).toMatchObject({source_key:"kg_krer_27_06_019_02_2015",
    artifact_sha256:"cd3d6735d1bbdda5957945b7682f032785c76624b54a435edfe5d2ef5e107161",locator_id:profile.locatorRegistry.id});
   const runtime=canonicalApprovedBaselineRuntimeParameters({input_values:definition.input_values,input_classification:definition.input_classification});
   expect(runtime[profile.methodParameterId]).toBe(profile.methodRu);
   for(const key of ["area_m2",id("area_m2"),id("layer_thickness_mm"),id("haul_distance_km"),profile.siteParameterId])expect(runtime).not.toHaveProperty(key);
   for(const parameter of parameters.filter(p=>p.parameter_id.startsWith(profile.namespace)&&Object.hasOwn(profile.normativeConstants,p.parameter_id.slice(profile.namespace.length))))
    expect(parameter.truth_metadata).toMatchObject({visibility_role:"USER_DERIVED_READONLY",runtime_profile_classification:"NORMATIVE"});
   const compile=(area:number,thickness:number)=>compileCanonicalEstimateCore({operation:"compile",catalogId:profile.catalogId,
    compilerVersion:"TEST_PERSISTED_STANDARD_SOURCE_PHYSICS_R566",primaryMeasureParameterId:id("area_m2"),
    parameterDefinitions:parameters as CanonicalEstimateCompileCoreInput["parameterDefinitions"],formulaDefinitions:formulas as CanonicalEstimateCompileCoreInput["formulaDefinitions"],
    resourceDefinitions:resources as CanonicalEstimateCompileCoreInput["resourceDefinitions"],submittedParameters:{[id("area_m2")]:area,[id("layer_thickness_mm")]:thickness,
     [id("haul_distance_km")]:20,[profile.siteParameterId]:profile.siteRu},confirmedParameters:runtime,currencyCode:"KGS",priceItems:[],maximumResourceRows:128,hashJson:estimateDeterministicHash});
   const result=await compile(100,100);
   expect(result.rows.every(row=>row.row_id.startsWith(profile.namespace))).toBe(true);
   const quantity=(value:string)=>result.rows.find(row=>row.row_id===id(value))?.quantity;
   expect(quantity("asphalt:material:hot-dense-fine-mix")).toBe("23.58");
   expect(quantity("asphalt:control:geometric-compacted-volume")).toBe("10");
   expect(quantity("asphalt:material:road-bitumen")).toBe("0.02");expect(quantity("asphalt:labor:road-workers")).toBe("7");
   for(const [key,value] of Object.entries({krer_base_thickness_mm:30,asphalt_mix_base_t_per_1000m2:70.6,asphalt_mix_increment_t_per_1000m2:11.8,
    towing_wire_t_per_1000m2:0.00613,tractor_brush_machine_h_per_1000m2:0.75,surface_grinder_increment_machine_h_per_1000m2:0.04}))expect(result.parameters[id(key)]).toBe(value);
   expect(result.parameters).not.toHaveProperty(id("roller_13t_machine_h_per_1000m2"));expect(result.parameters).not.toHaveProperty(id("watering_machine_h_per_1000m2"));
   const missing=new Set(result.preliminaryNeeds.flatMap(need=>need.missing_parameter_ids));
   for(const key of profile.projectFactParameterIds.filter(parameter=>parameter!=="haul_distance_km"))
    expect(missing.has(id(key))).toBe(true);
   for(const key of Object.keys(profile.normativeConstants))expect(missing.has(id(key))).toBe(false);
   const base=await compile(100,30);expect(base.rows.find(row=>row.row_id===id("asphalt:material:hot-dense-fine-mix"))?.quantity).toBe("7.06");
   const doubled=await compile(200,100);expect(doubled.rows.find(row=>row.row_id===id("asphalt:material:hot-dense-fine-mix"))?.quantity).toBe("47.16");
   await expect(compile(100,32)).rejects.toMatchObject({code:"PARAMETER_VALIDATION_FAILED"});
   const retired=(await client.query("select count(*)::int n from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id~'_(small|medium|large)_area$'",[current.definitionReleaseId])).rows[0];expect(retired.n).toBe(0);
  }finally{await client.query("rollback");await client.end();}
 },60000);
});
