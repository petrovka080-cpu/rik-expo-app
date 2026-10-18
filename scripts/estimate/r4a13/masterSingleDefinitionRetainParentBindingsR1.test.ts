// WORK R2 prospective tests; frozen R1 unchanged. NOT_RUN by author; no DB connection.
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {createCanonicalDefinitionClonePlan} from "./canonicalDefinitionPublisherR1";
import {
  masterRetainParentBindingsOptInR1, masterRetainedParentCaptureSha256R1, assertMasterRetainedParentComputationR1,
  prepareMasterRetainedBindingRepresentativeR1, assertMasterRetainedBindingSnapshotR1,
  assertMasterRetainedBindingPreflightUnchangedR1, assertMasterRetainedBindingPlanR1,
  lockMasterRetainedBindingPreconditionsR1, readMasterRetainedBindingPreconditionsR1,
  type MasterRetainedBindingGuardInputR1, type MasterRetainedBindingSnapshotR1,
} from "./masterSingleDefinitionRetainParentBindingsR1";

type Json=Record<string,any>;
const fixtureRaw=readFileSync(resolve(process.cwd(),
  "data/estimate-benchmarks/fixtures/elecor-mechanical-fixings-current-parent-r2.json"));
const fixture=JSON.parse(fixtureRaw.toString("utf8"));
const copy=<T,>(v:T):T=>JSON.parse(JSON.stringify(v));
const sha=(v:Buffer)=>createHash("sha256").update(v).digest("hex");
const sourceKey="iek_elecor_ckk10_001_1_edition8_project_mechanical_fixings";
const prefix="electrical:elecor-60x40-single-route:";
const sourceId="10000000-0000-5000-8000-000000000001";
const locatorId="10000000-0000-5000-8000-000000000002";
function setup(){
 const parent=copy(fixture.parent);
 const capture={definition:parent.definition,baseline:parent.baseline,parameters:parent.parameters,formulas:parent.formulas,
  resources:parent.resources,bindings:parent.bindings,normativeSources:copy(fixture.normativeSources),
  normativeLocators:copy(fixture.normativeLocators)};
 const opt:any={capturedParent:capture,capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),
  newParameterSources:{
   test_fixing_count:{kind:"KNOWN",sourceIds:[sourceKey]},
   test_fixing_order_effective:{kind:"DERIVED",sourceIds:[sourceKey]},
   test_unresolved_labor:{kind:"UNRESOLVED",sourceIds:[]},
  }};
 const input:MasterRetainedBindingGuardInputR1={config:{stopCode:"ELECOR_RETAIN_TEST",
  catalogId:parent.definition.catalog_id,parentReleaseId:fixture.context.definitionReleaseId,
  binding:{retainParentBindings:opt as any}},newSource:{id:sourceId,source_key:sourceKey,
   title_ru:"IEK edition8 + fischer535463 + exact PPR; not a labour norm",authority:"IEK; fischer; accepted PPR",
   official_url:"https://www.fischer.de/",artifact_sha256:"4ff75bc9f8374afc6cd268fbf91574b556625a0cb324ee048faa00a4f7388928",
   effective_from:null,effective_to:null,metadata:{sourceKind:"MANUFACTURER_PROJECT_QUANTITY",labourNormAccepted:false}},
  newLocators:[{id:locatorId,source_id:sourceId,locator_key:"elecor-ed8-project-fixings-535463-r1",
   locator:{productArticle:"535463",pprQuantityRequired:true},excerpt_sha256:"a".repeat(64)}]};
 const fromRole=(role:string)=>parent.parameters.find((p:Json)=>p.truth_metadata.value_source_role===role)!;
 const addParam=(base:Json,id:string)=>({...copy(base),parameter_id:id,ordinal:100+id.length});
 const known=addParam(fromRole("PROJECT_SPECIFIC_INPUT"),"test_fixing_count");
 const derived=addParam(fromRole("COMPILER_DERIVED_RESOURCE_QUANTITY"),"test_fixing_order_effective");
 const pending=addParam(fromRole("UNRESOLVED_APPLICATION_NORM"),"test_unresolved_labor");
 const next={parameters:[...copy(parent.parameters),known,derived,pending],formulas:copy(parent.formulas),resources:[...copy(parent.resources),
  {...copy(parent.resources[0]),id:"test-new-consumed",row_id:prefix+"fixings-consumed",ordinal:100},
  {...copy(parent.resources[0]),id:"test-new-order",row_id:prefix+"fixings-535463-order",ordinal:101}],
  newBindings:[{row_id:prefix+"fixings-consumed",locator_id:locatorId,
   applicability:{productArticle:"535463",quantityParameterId:"test_fixing_count",manufacturerConsumptionNormClaimed:false}},
   {row_id:prefix+"fixings-535463-order",locator_id:locatorId,
    applicability:{productArticle:"535463",unitId:"pcs",onePcs:"ONE_COMPLETE_PAIR",factoryBoxCompletePairs:50}}],
  successorProvenance:{featureContract:"CONTROL_ONLY_RETAIN_TEST",parentDefinitionSha256:parent.definition.definition_sha256},
  lifecycleMetadata:{contract:"CONTROL_ONLY_SUCCESSOR",masterSha256:"b".repeat(64),sourceFingerprint:"c".repeat(64)}};
 const snapshot:MasterRetainedBindingSnapshotR1={membership:[{release_id:input.config.parentReleaseId,
  catalog_id:input.config.catalogId,definition_version_id:parent.definition.id,
  approved_template_baseline_id:parent.baseline.id,definition_hash:parent.definition.definition_sha256}],
  capture:copy(capture),newSources:[],newLocators:[]};
 return {input:input as any,opt,next:next as any,snapshot:snapshot as any};
}
function planFor(s:ReturnType<typeof setup>){
 const expected=prepareMasterRetainedBindingRepresentativeR1(s.input,s.next);
 const c=s.opt.capturedParent;
 const uuid=(x:string)=>{const h=createHash("sha256").update(x).digest("hex");return`${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;};
 const plan=createCanonicalDefinitionClonePlan({contract:"CONTROL_ONLY_RETAIN_TEST",definition:{
  id:uuid("definition"),releaseId:uuid("release"),catalogId:s.input.config.catalogId,definitionVersion:2,
  passport:copy(c.definition.passport),applicability:copy(c.definition.applicability),
  definitionSha256:"d".repeat(64),sourceMetadata:copy(expected.sourceMetadata)},
  representative:{parameters:copy(s.next.parameters),formulas:copy(s.next.formulas),
   resources:copy(s.next.resources),bindings:copy(expected.bindings) as Json[],
   baseline:{...copy(c.baseline),normative_source_ids:copy(expected.normativeSourceIds)},passport:copy(fixture.parent.passport)},
  parameterTruthMetadata:p=>copy(p.truth_metadata),resourceId:r=>uuid(r.row_id),
  resourceSemanticOwner:r=>String(r.semantic_owner),resourceSha256:()=>"e".repeat(64),
  baseline:{id:uuid("baseline"),key:"CONTROL_ONLY_RETAIN_TEST",sourceDefinitionVersionId:c.definition.id,
   validationScenarioRefs:copy(c.baseline.validation_scenario_refs),acceptanceEvidenceSha256:"f".repeat(64),
   acceptedReleaseId:uuid("release"),supersedesBaselineId:c.baseline.id},
  passport:{physicalResultRu:fixture.parent.passport.physical_result_ru,
   excludedScopeRu:copy(fixture.parent.passport.excluded_scope_ru),decision:copy(fixture.parent.passport.decision),
   payloadSha256:"a".repeat(64),sourceHead:fixture.context.sourceHead,sourceTree:"0".repeat(40)},
  bindingApplicability:b=>copy(b.applicability),expectedNormativeBindingCount:expected.expectedNormativeBindingCount});
 return {plan,expected};
}
function rehash(s:ReturnType<typeof setup>){s.opt.capturedParentSha256=masterRetainedParentCaptureSha256R1(s.opt.capturedParent);}

describe("actual ELECOR capture, explicit REPLACE opt-in",()=>{
 test("pinned accepted parent is used, not a synthetic18-row source",()=>{
  expect(sha(fixtureRaw)).toBe("3097e5f9497ccde7749f961f3b4a602cfb4d61c1e160c90439b30c3143e8b587");
  expect(fixture.parent.definition.definition_sha256).toBe("223f802527b5477eca9174ce0243df06f49f14ecd8ab695076e5ef68aeb3d96e");
  expect(fixture.parent.bindings).toHaveLength(18);expect(fixture.parent.parameters).toHaveLength(22);
 });
 test("omitted option preserves legacy caller path",()=>{const s=setup();delete s.input.config.binding.retainParentBindings;
  expect(masterRetainParentBindingsOptInR1(s.input)).toBeNull();});
 test.each([["null",null],["undefined",undefined],["array",[]],["false",false],["true",true]])("present invalid opt-in refuses %s",(_name,value)=>{
  const s=setup();s.input.config.binding.retainParentBindings=value;
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow("RETAIN_OPT_IN_OBJECT_REQUIRED");
 });
 test("APPEND cannot enable retention",()=>{const s=setup();s.input.config.catalogAppend={identity:{}};
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow("RETAIN_REPLACE_ONLY");});
 test("changed capture with stale hash fails",()=>{const s=setup();s.opt.capturedParent.bindings.pop();
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow("RETAIN_CAPTURE_SHA256");});
 test("full capture hash does not depend on row query order",()=>{const s=setup();s.opt.capturedParent.bindings.reverse();
  s.opt.capturedParent.resources.reverse();s.opt.capturedParent.parameters.reverse();
  expect(masterRetainParentBindingsOptInR1(s.input)).not.toBeNull();});
 test("duplicate old binding is not a set-normalization escape",()=>{const s=setup();
  s.opt.capturedParent.bindings.push(copy(s.opt.capturedParent.bindings[0]));rehash(s);
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow("RETAIN_CAPTURE_BINDING_DUPLICATES");});
 test("baseline from another definition refuses even if capture is self-hashed",()=>{const s=setup();
  s.opt.capturedParent.baseline.definition_version_id="foreign-definition";rehash(s);
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow("RETAIN_CAPTURE_ANCHOR");});
});

describe("full captured parent and registry preimage",()=>{
 test("normal absent-or-exact source preflight passes without mutation",()=>{const s=setup(),before=copy(s);
  assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot);expect(s).toEqual(before);});
 test("exact existing new source and exact locator pass; server timestamp is not invented",()=>{const s=setup();
  s.snapshot.newSources=[{...copy(s.input.newSource),created_at:"2026-10-18T18:00:00.123456+05:00"}];
  s.snapshot.newLocators=copy(s.input.newLocators);assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot);});
 const drift:Array<[string,(x:any)=>void]>=[
  ["definition SHA",x=>x.capture.definition.definition_sha256="0".repeat(64)],
  ["baseline ID",x=>x.capture.baseline.id="foreign-baseline"],
  ["baseline old parameter source array",x=>x.capture.baseline.normative_source_ids.elecor_route_m=[sourceKey]],
  ["historical unresolved source array normalization",x=>x.capture.baseline.normative_source_ids.elecor_open_qty_fixings=[]],
  ["full baseline validation payload",x=>x.capture.baseline.validation_scenario_refs[0].fixture.elecor_route_m=77],
  ["full source title",x=>x.capture.normativeSources[0].title_ru+=" changed"],
  ["full source authority",x=>x.capture.normativeSources[0].authority+=" changed"],
  ["full source official URL",x=>x.capture.normativeSources[0].official_url="https://invalid.example/"],
  ["full source artifact hash",x=>x.capture.normativeSources[0].artifact_sha256="0".repeat(64)],
  ["full source effective date",x=>x.capture.normativeSources[0].effective_to="2026-12-31"],
  ["full source metadata",x=>x.capture.normativeSources[0].metadata.useRestriction="changed"],
  ["timestamp microseconds",x=>x.capture.normativeSources[0].created_at="2026-10-18T15:27:12.289000+05:00"],
  ["full locator JSON",x=>x.capture.normativeLocators[0].locator.injected=true],
  ["full locator excerpt hash",x=>x.capture.normativeLocators[0].excerpt_sha256="0".repeat(64)],
  ["old binding applicability",x=>x.capture.bindings[0].applicability.fullTechnicalAcceptance=true],
  ["old binding locator",x=>x.capture.bindings[0].locator_id=locatorId],
  ["old resource owner mapping",x=>x.capture.resources[0].row_id+="-foreign"],
  ["old parameter truth",x=>x.capture.parameters[0].truth_metadata.source_confirmation_required=true],
  ["full formula arithmetic",x=>x.capture.formulas[0].expression_source="77"],
  ["missing18th binding",x=>x.capture.bindings.pop()],
  ["phantom19th binding",x=>x.capture.bindings.push({...copy(x.capture.bindings[0]),locator_id:locatorId})],
 ];
 test.each(drift)("refuses %s before DML",(_label,change)=>{const s=setup();change(s.snapshot);
  expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot)).toThrow("RETAIN_PARENT_FULL_CAPTURE_DRIFT");});
 test("current membership cannot redirect same catalog to another definition",()=>{const s=setup();
  s.snapshot.membership[0].definition_version_id="foreign";
  expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot)).toThrow("RETAIN_MANIFEST_ANCHOR_DRIFT");});
 test("matching artifact alone cannot admit altered new source metadata",()=>{const s=setup();
  s.snapshot.newSources=[{...copy(s.input.newSource),metadata:{sourceKind:"RELABELED"}}];
  expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot)).toThrow("RETAIN_NEW_SOURCE_NOT_EXACT");});
 test("source id/key collision cannot be hidden by a matching row",()=>{const s=setup();
  s.snapshot.newSources=[copy(s.input.newSource),{...copy(s.input.newSource),id:"other"}];
  expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot)).toThrow("RETAIN_NEW_SOURCE_ID_OR_KEY_COLLISION");});
 test("foreign locator cannot be merged into an otherwise exact source",()=>{const s=setup();
  s.snapshot.newSources=[copy(s.input.newSource)];s.snapshot.newLocators=[{...copy(s.input.newLocators[0]),id:"foreign"}];
  expect(()=>assertMasterRetainedBindingSnapshotR1(s.input,s.snapshot)).toThrow("RETAIN_NEW_LOCATOR_NOT_EXACT");});
 test("absent source becoming exact between preflight and locks still requires fresh attempt",()=>{const s=setup(),locked=copy(s.snapshot);
  locked.newSources=[copy(s.input.newSource)];
  expect(()=>assertMasterRetainedBindingPreflightUnchangedR1(s.input,s.snapshot,locked)).toThrow("RETAIN_PREFLIGHT_CHANGED_BEFORE_DML");});
 test("phantom19th binding after normal preflight fails the locked reread",()=>{const s=setup(),locked=copy(s.snapshot);
  locked.capture.bindings.push({...copy(locked.capture.bindings[0]),locator_id:locatorId});
  expect(()=>assertMasterRetainedBindingPreflightUnchangedR1(s.input,s.snapshot,locked)).toThrow("RETAIN_PARENT_FULL_CAPTURE_DRIFT");});
});

describe("actual18 +2 source-aware representative and baseline preservation",()=>{
 test("real clone publisher retains all18 semantics and emits only2 additional bindings",()=>{const s=setup(),{plan,expected}=planFor(s);
  expect(plan.bindings).toHaveLength(20);assertMasterRetainedBindingPlanR1(s.input,plan,expected);
  const idToRow=new Map(s.opt.capturedParent.resources.map((r:Json)=>[r.id,r.row_id]));
  expect(expected.bindings.slice(0,18)).toEqual(s.opt.capturedParent.bindings.map((b:Json)=>({row_id:idToRow.get(b.resource_spec_id),locator_id:b.locator_id,applicability:b.applicability})));
 });
 test("old22 arrays incl8historical unresolved are exact; only NEW unresolved is[]",()=>{const s=setup(),e=prepareMasterRetainedBindingRepresentativeR1(s.input,s.next);
  for(const p of s.opt.capturedParent.parameters)expect(e.normativeSourceIds[p.parameter_id]).toEqual(s.opt.capturedParent.baseline.normative_source_ids[p.parameter_id]);
  expect(e.normativeSourceIds.elecor_open_qty_fixings).toEqual([fixture.normativeSources[0].source_key]);
  expect(e.normativeSourceIds.test_unresolved_labor).toEqual([]);
  expect(e.normativeSourceClosure).toEqual([fixture.normativeSources[0].source_key,sourceKey].sort());
 });
 test("only contract/master/fingerprint lifecycle overwrite; sourceId/normId remain old",()=>{const s=setup(),e=prepareMasterRetainedBindingRepresentativeR1(s.input,s.next);
  expect(e.sourceMetadata.sourceId).toBe(fixture.parent.definition.source_metadata.sourceId);
  expect(e.sourceMetadata.normId).toBe(fixture.parent.definition.source_metadata.normId);
  expect(e.sourceMetadata.contract).toBe("CONTROL_ONLY_SUCCESSOR");
  expect(e.sourceMetadata.retainedParentBindingSuccessorV1).toEqual(s.next.successorProvenance);
 });
 const invalid:Array<[string,(s:ReturnType<typeof setup>)=>void,string]>=[
  ["new binding on old known row",s=>s.next.newBindings[0].row_id=s.next.resources[0].row_id,"NEW_BINDING_MUST_USE_NEW_ROW_AND_SOURCE"],
  ["new binding on old APPLICATION need",s=>s.next.newBindings[0].row_id=prefix+"open-fixings","NEW_BINDING_MUST_USE_NEW_ROW_AND_SOURCE"],
  ["new binding reuses old locator",s=>s.next.newBindings[0].locator_id=fixture.normativeLocators[0].id,"NEW_BINDING_MUST_USE_NEW_ROW_AND_SOURCE"],
  ["new binding unknown row",s=>s.next.newBindings[0].row_id="foreign","NEW_BINDING_MUST_USE_NEW_ROW_AND_SOURCE"],
  ["duplicate new binding",s=>s.next.newBindings.push(copy(s.next.newBindings[0])),"NEW_BINDING_DUPLICATE"],
  ["deleted old row",s=>s.next.resources.shift(),"OLD_ROW_REMOVED_OR_NEXT_DUPLICATE"],
  ["deleted old parameter",s=>s.next.parameters.shift(),"OLD_PARAMETER_REMOVED_OR_NEXT_DUPLICATE"],
  ["missing explicit new param",s=>delete s.opt.newParameterSources.test_fixing_count,"NEW_PARAMETER_SOURCE_EXACT_KEYS"],
  ["extra old param in map",s=>s.opt.newParameterSources.elecor_route_m={kind:"KNOWN",sourceIds:[sourceKey]},"NEW_PARAMETER_SOURCE_EXACT_KEYS"],
  ["unknown third source",s=>s.opt.newParameterSources.test_fixing_count.sourceIds=["foreign"],"NEW_PARAMETER_SOURCE_VALUE"],
  ["new unresolved attributed to new source",s=>s.opt.newParameterSources.test_unresolved_labor.sourceIds=[sourceKey],"NEW_UNRESOLVED_SOURCE_FORBIDDEN"],
  ["new unresolved relabeled known",s=>s.opt.newParameterSources.test_unresolved_labor.kind="KNOWN","NEW_UNRESOLVED_KIND_MISMATCH"],
  ["known parameter without source",s=>s.opt.newParameterSources.test_fixing_count.sourceIds=[],"NEW_KNOWN_SOURCE_REQUIRED"],
  ["derived parameter relabeled known",s=>s.opt.newParameterSources.test_fixing_order_effective.kind="KNOWN","NEW_DERIVED_KIND_MISMATCH"],
  ["top sourceId relabel",s=>s.next.lifecycleMetadata.sourceId=sourceKey,"LIFECYCLE_OVERWRITE_KEYS"],
  ["top normId relabel",s=>s.next.lifecycleMetadata.normId="newnorm","LIFECYCLE_OVERWRITE_KEYS"],
 ];
 test.each(invalid)("refuses %s",(_name,change,code)=>{const s=setup();change(s);
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_"+code);});
 test.each(["binding","baseline","metadata"])("final actual plan refuses %s drift",part=>{const s=setup(),{plan,expected}=planFor(s);
  if(part==="binding")plan.bindings[0].applicability={sourceKind:"NEW_SOURCE_OVERWRITE"};
  if(part==="baseline")plan.baseline.normative_source_ids.elecor_route_m=[sourceKey];
  if(part==="metadata")plan.definition.source_metadata.sourceId=sourceKey;
  expect(()=>assertMasterRetainedBindingPlanR1(s.input,plan,expected)).toThrow("RETAIN_PLAN_");});
});

describe("existing publisher normal/locked read and lock-only lifecycle",()=>{
 test("locks bind table itself in SHARE ROW EXCLUSIVE, not only existing rows",async()=>{
  const s=setup(),calls:Array<[string,unknown[]|undefined]>=[];
  const fake={query:async(sql:string,values?:unknown[])=>{calls.push([sql,values]);return{rows:sql==="show transaction_isolation"?[{transaction_isolation:"read committed"}]:[]};}};
  await lockMasterRetainedBindingPreconditionsR1(fake as any,s.input);
  const lock=calls.find(([sql])=>sql.startsWith("lock table"))![0];
  for(const name of["estimate_work_normative_binding","estimate_normative_source","estimate_normative_locator",
   "estimate_approved_template_baseline","estimate_formula_graph","estimate_resource_spec","estimate_parameter_definition","estimate_cumulative_manifest_entry"])
    expect(lock).toContain("public."+name);
  expect(lock).toContain("in share row exclusive mode");
  expect(calls.every(([sql])=>!/\b(insert|update|delete|upsert)\b/iu.test(sql))).toBe(true);
 });
 test("RR isolation cannot claim a fresh locked snapshot",async()=>{const s=setup();
  const fake={query:async()=>({rows:[{transaction_isolation:"repeatable read"}]})};
  await expect(lockMasterRetainedBindingPreconditionsR1(fake as any,s.input)).rejects.toThrow("RETAIN_LOCKED_REREAD_REQUIRES_READ_COMMITTED");
 });
 function readerFake(s:ReturnType<typeof setup>,phantom=false,phantomFormula=false){const seen:string[]=[];return{seen,client:{query:async(sql:string,values:any[])=>{
   seen.push(sql);let rows:Json[]=[];
   if(sql.includes("from public.estimate_cumulative_manifest_entry"))rows=s.snapshot.membership;
   else if(sql.includes("from public.estimate_definition_version"))rows=[s.snapshot.capture.definition];
   else if(sql.includes("from public.estimate_approved_template_baseline"))rows=[s.snapshot.capture.baseline];
   else if(sql.includes("from public.estimate_parameter_definition"))rows=s.snapshot.capture.parameters;
   else if(sql.includes("from public.estimate_formula_graph"))rows=phantomFormula?
    [...s.snapshot.capture.formulas,{...s.snapshot.capture.formulas[0],formula_id:"test-phantom27th"}]:s.snapshot.capture.formulas;
   else if(sql.includes("from public.estimate_resource_spec"))rows=s.snapshot.capture.resources;
   else if(sql.includes("from public.estimate_work_normative_binding")&&sql.includes("select * from public.estimate_work_normative_binding"))
    rows=phantom?[...s.snapshot.capture.bindings,{...s.snapshot.capture.bindings[0],locator_id:locatorId}]:s.snapshot.capture.bindings;
   else if(sql.includes("select * from public.estimate_normative_locator"))rows=Array.isArray(values[0])&&values[0][0]===locatorId?[]:s.snapshot.capture.normativeLocators;
   else if(sql.includes("select * from public.estimate_normative_source"))rows=typeof values[0]==="string"?[]:s.snapshot.capture.normativeSources;
   else throw new Error("UNEXPECTED_READ");
   return{rows:rows.map(row=>({raw:JSON.stringify(row)}))};}}};}
 test("reader uses full bounded raw text projections and preserves exact timestamp",async()=>{
  const s=setup(),f=readerFake(s),actual=await readMasterRetainedBindingPreconditionsR1(f.client as any,s.input);
  expect(actual.capture.normativeSources[0].created_at).toBe(fixture.normativeSources[0].created_at);
  expect(f.seen.every(sql=>sql.includes("row_to_json(t)::text")&&sql.includes("limit "))).toBe(true);
  expect(actual.capture.bindings).toHaveLength(18);expect(actual.capture.formulas).toHaveLength(26);
  expect(f.seen.some(sql=>sql.includes("select * from public.estimate_formula_graph"))).toBe(true);
 });
 test("reader26+1 formula cap refuses phantom instead of truncating to26",async()=>{const s=setup(),f=readerFake(s,false,true);
  await expect(readMasterRetainedBindingPreconditionsR1(f.client as any,s.input)).rejects.toThrow("RETAIN_READ_CAP");
 });
 test("reader18+1 cap refuses phantom instead of truncating to18",async()=>{const s=setup(),f=readerFake(s,true);
  await expect(readMasterRetainedBindingPreconditionsR1(f.client as any,s.input)).rejects.toThrow("RETAIN_READ_CAP");
 });
});


describe("R2 full formulas and retained physical/payment semantics",()=>{
 test("capture must include fullformula rows, never just same IDs",()=>{const s=setup();delete s.opt.capturedParent.formulas;
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow("RETAIN_CAPTURE_SHAPE");});
 test("capture rejects duplicateformula even with freshly computed consistency hash",()=>{const s=setup();
  s.opt.capturedParent.formulas.push(copy(s.opt.capturedParent.formulas[0]));rehash(s);
  expect(()=>masterRetainParentBindingsOptInR1(s.input)).toThrow("RETAIN_CAPTURE_FORMULA_IDS");});
 test("pure next.formulas is required",()=>{const s=setup();delete s.next.formulas;
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_NEXT_FORMULAS_REQUIRED");});
 test("oldformula arithmetic is kept even when physical row only expands gates",()=>{const s=setup();
  const bound=s.next.resources.find((r:Json)=>r.id===s.opt.capturedParent.bindings[0].resource_spec_id)!;
  bound.inclusion_ast={kind:"and",operands:[bound.inclusion_ast,{kind:"literal",value:true}]};
  bound.resource_graph.inputParameterIds=[...(bound.resource_graph.inputParameterIds??[]),"test_fixing_count"];
  prepareMasterRetainedBindingRepresentativeR1(s.input,s.next);
 });
 test("formula ordering is not arithmetic drift",()=>{const s=setup();s.next.formulas.reverse();
  prepareMasterRetainedBindingRepresentativeR1(s.input,s.next);});
 const formulaDrift:Array<[string,(f:Json)=>void]>=[
  ["expression_source",f=>f.expression_source="77"],
  ["output_unit_id",f=>f.output_unit_id="foreign-unit"],
  ["AST arithmetic",f=>f.ast={kind:"literal",value:"77"}],
  ["input_parameter_ids",f=>f.input_parameter_ids=["test_fixing_count"]],
  ["ast_sha256",f=>f.ast_sha256="0".repeat(64)],
  ["definition FK in REPRESENTATIVE",f=>f.definition_version_id="not-the-captured-definition"],
  ["created_at in REPRESENTATIVE",f=>f.created_at="CONTROL_ONLY_CHANGED_TIMESTAMP"],
 ];
 test.each(formulaDrift)("same formulaID cannot change %s",(_name,change)=>{const s=setup();change(s.next.formulas[0]);
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_OLD_FORMULA_SEMANTICS_DRIFT");});
 test("oldformula removal refuses",()=>{const s=setup();s.next.formulas.pop();
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_OLD_FORMULA_SEMANTICS_DRIFT");});
 test("formulaID duplication refuses",()=>{const s=setup();s.next.formulas.push(copy(s.next.formulas[0]));
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_NEXT_FORMULA_IDS");});
 test("PLAN clone FK/server timestamp may differ; arithmetic still exact",()=>{const s=setup(),{plan,expected}=planFor(s);
  expect(plan.formulas[0].definition_version_id).not.toBe(fixture.parent.definition.id);
  (plan.formulas[0] as Json).created_at="CONTROL_ONLY_SERVER_CREATED_TIMESTAMP";
  assertMasterRetainedBindingPlanR1(s.input,plan,expected);
 });
 test.each(["expression_source","output_unit_id","ast","input_parameter_ids","ast_sha256"])("PLAN refuses oldformula %s drift",field=>{
  const s=setup(),{plan,expected}=planFor(s),f=plan.formulas[0] as Json;
  f[field]=field==="ast"?{kind:"literal",value:"77"}:field==="input_parameter_ids"?["test_fixing_count"]:"FOREIGN";
  expect(()=>assertMasterRetainedBindingPlanR1(s.input,plan,expected)).toThrow("RETAIN_OLD_FORMULA_SEMANTICS_DRIFT");
 });
 const fields=["unit_id","formula_id","category","row_type","cost_owner_id","semantic_owner","procurement_eligible","source_metadata","resource_graph.costTreatment"];
 const changePayment=(s:ReturnType<typeof setup>,field:string)=>{
  const r=s.next.resources.find((x:Json)=>x.id===s.opt.capturedParent.bindings[0].resource_spec_id)!;
  if(field==="formula_id")r.formula_id=s.next.formulas.find((x:Json)=>x.formula_id!==r.formula_id)!.formula_id;
  else if(field==="procurement_eligible")r.procurement_eligible=!r.procurement_eligible;
  else if(field==="source_metadata")r.source_metadata={...r.source_metadata,retargeted:true};
  else if(field==="resource_graph.costTreatment")r.resource_graph.costTreatment=r.resource_graph.costTreatment==="OWN_COST"?"INFORMATIONAL_SCOPE":"OWN_COST";
  else r[field]="FOREIGN";
 };
 test.each(fields)("BOUND oldresource cannot retarget %s",field=>{const s=setup();changePayment(s,field);
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_OLD_BOUND_RESOURCE_PHYSICAL_PAYMENT_DRIFT");});
 test("old captured physical UUID must remain in REPRESENTATIVE",()=>{const s=setup();s.next.resources[0].id="different-physical-resource";
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_OLD_REPRESENTATIVE_RESOURCE_ID_DRIFT");});
 test("old UNBOUND logical row cannot disappear",()=>{const s=setup();s.next.resources=s.next.resources.filter((r:Json)=>r.row_id!==prefix+"open-fixings");
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_OLD_ROW_REMOVED_OR_NEXT_DUPLICATE");});
 test("PLAN cannot change old bound payment after representative validation",()=>{const s=setup(),{plan,expected}=planFor(s);
  const idToRow=new Map(s.opt.capturedParent.resources.map((r:Json)=>[r.id,r.row_id]));
  const rowId=idToRow.get(s.opt.capturedParent.bindings[0].resource_spec_id);
  plan.resources.find(r=>r.row_id===rowId)!.resource_graph.costTreatment="FOREIGN_PAYMENT";
  expect(()=>assertMasterRetainedBindingPlanR1(s.input,plan,expected)).toThrow("RETAIN_OLD_BOUND_RESOURCE_PHYSICAL_PAYMENT_DRIFT");});
 function completion(s:ReturnType<typeof setup>){
  const need=s.next.resources.find((r:Json)=>r.row_id===prefix+"open-fixings")!;
  const owner=s.next.resources.find((r:Json)=>r.row_id===prefix+"fixings-535463-order")!;
  owner.resource_graph.costTreatment="OWN_COST";
  need.source_metadata={...need.source_metadata,completionNeedTransitionV1:{featureContract:"CONTROL_ONLY_COMPLETION",
   selectedMethodParameterId:"test_fixing_count",resolvedOnlyForMethod:"CONTROL_ONLY_EXACT_METHOD",
   resolvedThroughPaidOwnerRowId:owner.row_id,automaticLegacyPriceOrQuantityTransferAllowed:false}};
  return need;
 }
 test("old unbound APPLICATION need gains explicit method evidence only",()=>{const s=setup(),need=completion(s);
  prepareMasterRetainedBindingRepresentativeR1(s.input,s.next);
  expect(need.source_metadata.sourceRole).toBe("UNRESOLVED_APPLICATION_NORM");
  expect(need.source_metadata.normativeTrace).toEqual([]);
 });
 test("unbound need source change without completion evidence refuses",()=>{const s=setup();
  s.next.resources.find((r:Json)=>r.row_id===prefix+"open-fixings")!.source_metadata.sourceRole="KNOWN_NORM";
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_OLD_UNBOUND_NEED_COMPLETION_EVIDENCE_REQUIRED");});
 const completionDrift:Array<[string,(need:Json,s:ReturnType<typeof setup>)=>void,string]>=[
  ["legacyprice transfer true",n=>n.source_metadata.completionNeedTransitionV1.automaticLegacyPriceOrQuantityTransferAllowed=true,"COMPLETION_EVIDENCE_REQUIRED"],
  ["missing feature evidence",n=>n.source_metadata.completionNeedTransitionV1.featureContract="","COMPLETION_EVIDENCE_REQUIRED"],
  ["unknown method parameter",n=>n.source_metadata.completionNeedTransitionV1.selectedMethodParameterId="foreign","COMPLETION_EVIDENCE_REQUIRED"],
  ["oldowner reuse",(n,s)=>n.source_metadata.completionNeedTransitionV1.resolvedThroughPaidOwnerRowId=s.next.resources[0].row_id,"COMPLETION_EVIDENCE_REQUIRED"],
  ["INFO newowner",(_n,s)=>s.next.resources.find((r:Json)=>r.row_id===prefix+"fixings-535463-order")!.resource_graph.costTreatment="INFORMATIONAL_SCOPE","COMPLETION_EVIDENCE_REQUIRED"],
  ["old sourceRole relabel",n=>n.source_metadata.sourceRole="NEW_NORM","PROVENANCE_DRIFT"],
  ["new locatortrace on oldneed",n=>n.source_metadata.normativeTrace=[{sourceId:sourceKey}],"PROVENANCE_DRIFT"],
 ];
 test.each(completionDrift)("completion cannot admit %s",(_name,change,suffix)=>{const s=setup(),need=completion(s);change(need,s);
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_OLD_UNBOUND_NEED_"+suffix);});
});

function withEmptyControl(){
 const s=setup(),p=s.next.parameters.find((x:Json)=>x.parameter_id==="test_fixing_order_effective")!;
 s.opt.newParameterSources.test_fixing_order_effective={kind:"DERIVED",sourceIds:[]};
 p.unit_id="pcs";p.required=false;p.default_value=null;p.value_type="decimal";
 p.truth_metadata={...p.truth_metadata,visibility_role:"INTERNAL_ONLY",value_source_role:"COMPILER_DERIVED_RESOURCE_QUANTITY",
  effective_resource_quantity_v1:{sourceRowId:prefix+"fixings-535463-order",unitId:"pcs"}};
 const owner=s.next.resources.find((r:Json)=>r.row_id===prefix+"fixings-535463-order")!;
 owner.unit_id="pcs";owner.formula_id=prefix+"formula:internal-joints";
 owner.resource_graph={...owner.resource_graph,effectiveQuantityOutputV1:{parameterId:p.parameter_id,unitId:"pcs"}};
 return {s,p,owner};
}
describe("R2 only exact NEW compiler effective output may keep DERIVED[]",()=>{
 test("empty source is admitted for reciprocal newrow control with exact unit",()=>{const {s}=withEmptyControl();
  const {plan,expected}=planFor(s);expect(expected.normativeSourceIds.test_fixing_order_effective).toEqual([]);
  assertMasterRetainedBindingPlanR1(s.input,plan,expected);
 });
 const controlDrift:Array<[string,(p:Json,owner:Json,s:ReturnType<typeof setup>)=>void]>=[
  ["generic DERIVED role",p=>p.truth_metadata.value_source_role="DERIVED"],
  ["USER_INPUT visibility",p=>p.truth_metadata.visibility_role="USER_INPUT"],
  ["missing effective metadata",p=>delete p.truth_metadata.effective_resource_quantity_v1],
  ["null effective metadata",p=>p.truth_metadata.effective_resource_quantity_v1=null],
  ["array effective metadata",p=>p.truth_metadata.effective_resource_quantity_v1=[]],
  ["metadata extra norm field",p=>p.truth_metadata.effective_resource_quantity_v1.normHours=77],
  ["old source row",p=>p.truth_metadata.effective_resource_quantity_v1.sourceRowId=prefix+"channel-order"],
  ["unknown source row",p=>p.truth_metadata.effective_resource_quantity_v1.sourceRowId="foreign"],
  ["metadata unit mismatch",p=>p.truth_metadata.effective_resource_quantity_v1.unitId="m"],
  ["parameter unit mismatch",p=>p.unit_id="m"],
  ["newrow unit mismatch",(_p,r)=>r.unit_id="m"],
  ["formula output unit mismatch",(_p,r)=>r.formula_id=prefix+"formula:route-net"],
  ["required control",p=>p.required=true],
  ["default scalar77",p=>p.default_value=77],
  ["enum control",p=>p.value_type="enum"],
  ["missing reciprocal output",(_p,r)=>delete r.resource_graph.effectiveQuantityOutputV1],
  ["wrong reciprocal parameter",(_p,r)=>r.resource_graph.effectiveQuantityOutputV1.parameterId="foreign"],
  ["wrong reciprocal unit",(_p,r)=>r.resource_graph.effectiveQuantityOutputV1.unitId="m"],
  ["extra reciprocal field",(_p,r)=>r.resource_graph.effectiveQuantityOutputV1.normHours=77],
  ["duplicate control owner",(p,_r,s)=>{const another=s.next.resources.find((x:Json)=>x.row_id===prefix+"fixings-consumed")!;
   another.unit_id="pcs";another.formula_id=prefix+"formula:internal-joints";
   another.resource_graph.effectiveQuantityOutputV1={parameterId:p.parameter_id,unitId:"pcs"};}],
 ];
 test.each(controlDrift)("empty DERIVED cannot bypass %s",(_name,change)=>{const {s,p,owner}=withEmptyControl();change(p,owner,s);
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_EMPTY_DERIVED_CONTROL_INVALID");});
 test("KNOWN[] remains forbidden even with exact effective metadata",()=>{const {s}=withEmptyControl();
  s.opt.newParameterSources.test_fixing_order_effective.kind="KNOWN";
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_NEW_DERIVED_KIND_MISMATCH");});
 test("ordinary DERIVED without effective metadata still requires explicit source",()=>{const s=setup();
  s.opt.newParameterSources.test_fixing_order_effective.sourceIds=[];
  s.next.parameters.find((p:Json)=>p.parameter_id==="test_fixing_order_effective")!.truth_metadata.value_source_role="DERIVED";
  expect(()=>prepareMasterRetainedBindingRepresentativeR1(s.input,s.next)).toThrow("RETAIN_EMPTY_DERIVED_CONTROL_INVALID");});
 test("PLAN newcontrol unit drift cannot use previously approved empty array",()=>{const {s}=withEmptyControl(),{plan,expected}=planFor(s);
  plan.parameters.find(p=>p.parameter_id==="test_fixing_order_effective")!.unit_id="m";
  expect(()=>assertMasterRetainedBindingPlanR1(s.input,plan,expected)).toThrow("RETAIN_EMPTY_DERIVED_CONTROL_INVALID");});
});
