import {
  resolveMasterExistingNormativeRegistryReuseR1 as resolveReuse,
  assertMasterExistingNormativeRegistrySnapshotR1 as assertSnapshot,
  resolveMasterSingleDefinitionLocatorExcerptSha256R1 as excerptHash,
} from "./prepareMasterSingleDefinitionSuccessorR1";

import { createHash } from "node:crypto";
import {readFileSync} from 'node:fs';
import {masterRetainedParentCaptureSha256R1,masterRetainedLineageValueSha256V1 as retainedHash} from './masterSingleDefinitionRetainParentBindingsR1';
import sikaPack from "../../../data/estimate-benchmarks/source-packs/sika-antisol250w-us-curing-series-s27-63.json";

type Row = Record<string, any>;
const sourceId = "15ddf10c-ebe4-51d3-84c3-29ced3d9b3c8";
const locatorId = "669859cb-0a68-58e3-8563-46d46eda8b66";
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
function input(): Row {
  const metadata = {contract: "original-registry-owner/v1", sourceKind: "APPROXIMATE_MANUFACTURER_NOMINAL",
    useRestriction: "Only the selected product and measured compatible surface",
    universalProductivityClaimed: false, universalConsumptionClaimed: false, activationAllowed: false};
  const managed = {id: sourceId, source_key: "manufacturer_sika_antisol250w_us_202006_v0103",
    title_ru: "Sika Antisol-250 W", authority: "Sika United States",
    official_url: "https://usa.sika.com/dam/dms/us01/3/sika_antisol_-250w.pdf",
    artifact_sha256: "b2f03cae00c6edf37228a1836104b5beba33a56dbb19b559caa8cc435a8b14b3",
    effective_from: null, effective_to: null, metadata};
  const locator = {id: locatorId, source_id: sourceId, locator_key: "nominal-broom-coverage-package",
    locator: {sourcePages: [1, 2, 3], approximate: true, facts: {coverageM2PerL: 4.9, packageL: 19}},
    excerpt_sha256: "41479c65d08ca7ea6864a38f04839bc2cc17dc70c0d79b71181b588cd49779a2"};
  return {config: {stopCode: "TEST", binding: {retainParentBindings: {capturedParent: "validated by existing guard"},
    reuseExistingNormativeRegistry: {contract: "master-existing-normative-registry-reuse/r1",
      locatorExcerptHashKind: "SOURCE_LOCATOR_TEXT_SHA256",
      source: {...managed, created_at: "2026-10-11T16:33:01.026081+05:00"}, locators: [locator]}}},
    newSource: {...managed, id: "11111111-1111-1111-1111-111111111111",
      metadata: {...metadata, contract: "new-consumer-contract/v1"}},
    newLocators: [{...clone(locator), id: "22222222-2222-2222-2222-222222222222",
      source_id: "11111111-1111-1111-1111-111111111111"}]};
}
const declaration = (x: Row) => x.config.binding.reuseExistingNormativeRegistry;
const run = (x: Row) => resolveReuse(x as Parameters<typeof resolveReuse>[0]);

describe("explicit immutable existing normative registry reuse", () => {
  it("retains the original registry identities, owner contract and timestamp without mutating inputs", () => {
    const value = input(), before = clone(value), reused = run(value)!;
    expect(reused.managedSource.id).toBe(sourceId);
    expect(reused.managedSource.metadata.contract).toBe("original-registry-owner/v1");
    expect(reused.managedSource).not.toHaveProperty("created_at");
    expect(reused.declaration.source.created_at).toBe("2026-10-11T16:33:01.026081+05:00");
    expect(reused.locators.map(x => x.id)).toEqual([locatorId]);
    expect(value).toEqual(before);
    expect(() => assertSnapshot(reused, {newSources: [declaration(value).source],
      newLocators: declaration(value).locators})).not.toThrow();
  });
  it("leaves historical identity assembly untouched when the opt-in property is omitted", () => {
    const value = input();delete value.config.binding.reuseExistingNormativeRegistry;
    delete value.config.binding.retainParentBindings;
    expect(run(value)).toBeNull();
    expect(() => assertSnapshot(null, null)).not.toThrow();
  });
  it.each([undefined, null, {}, {contract: "wrong"}])("refuses a present malformed declaration: %j", malformed => {
    const value = input();value.config.binding.reuseExistingNormativeRegistry = malformed;
    expect(() => run(value)).toThrow("EXACT_DECLARATION_REQUIRED");
  });
  it.each(["missing-retention", "null-retention", "append", "project-package"])(
    "requires retained replacement through the existing guard: %s", mode => {
      const value = input();
      if (mode === "missing-retention") delete value.config.binding.retainParentBindings;
      if (mode === "null-retention") value.config.binding.retainParentBindings = null;
      if (mode === "append") value.config.catalogAppend = {};
      if (mode === "project-package") value.config.projectSourcePackagePath = "project.json";
      expect(() => run(value)).toThrow("RETAINED_REPLACEMENT_ONLY");
    });
  it.each(["extra-declaration-field", "extra-source-field", "missing-created-at", "date-object", "bad-id"])(
    "requires complete declared rows without timestamp normalization: %s", mode => {
      const value = input(), d = declaration(value);
      if (mode === "extra-declaration-field") d.expectedAbsent = false;
      if (mode === "extra-source-field") d.source.alias = "copy";
      if (mode === "missing-created-at") delete d.source.created_at;
      if (mode === "date-object") d.source.created_at = new Date("2026-10-11T11:33:01.026Z");
      if (mode === "bad-id") d.source.id = "not-a-uuid";
      expect(() => run(value)).toThrow("EXISTING_REGISTRY_");
    });
  it.each([
    {source_key: "second-source-key"}, {title_ru: "Changed title"}, {authority: "Other authority"},
    {official_url: null}, {artifact_sha256: "a".repeat(64)}, {effective_from: "2026-01-01"},
    {effective_to: "2027-01-01"},
  ])("rejects source facts that differ from this consumer's exact declaration: %j", patch => {
    const value = input();Object.assign(declaration(value).source, patch);
    expect(() => run(value)).toThrow("SOURCE_FACTS_OR_METADATA_DRIFT");
  });
  it.each(["useRestriction", "sourceKind", "activationAllowed", "universalConsumptionClaimed"])(
    "cannot change original source metadata through reuse: %s", key => {
      const value = input();declaration(value).source.metadata[key] = "changed";
      expect(() => run(value)).toThrow("SOURCE_FACTS_OR_METADATA_DRIFT");
    });
  it.each(["absent", "duplicate", "wrong-source", "extra-column", "payload", "excerpt", "key"])(
    "rejects incomplete, duplicate or incompatible locator declarations: %s", mode => {
      const value = input(), d = declaration(value), l = d.locators[0];
      if (mode === "absent") d.locators = [];
      if (mode === "duplicate") {d.locators.push(clone(l));value.newLocators.push(clone(value.newLocators[0]));}
      if (mode === "wrong-source") l.source_id = value.newSource.id;
      if (mode === "extra-column") l.metadata = {};
      if (mode === "payload") l.locator.facts.coverageM2PerL = 8;
      if (mode === "excerpt") l.excerpt_sha256 = "b".repeat(64);
      if (mode === "key") l.locator_key = "other-locator";
      expect(() => run(value)).toThrow("EXISTING_REGISTRY_");
    });
  it("maps existing locator IDs by the resolved locator key rather than declaration order", () => {
    const value = input(), d = declaration(value), second = clone(d.locators[0]);
    second.id = "33333333-3333-3333-3333-333333333333";second.locator_key = "second";
    d.locators.unshift(second);value.newLocators.push({...second, id: "44444444-4444-4444-4444-444444444444"});
    expect(run(value)!.locators.map(x => x.id)).toEqual([locatorId, second.id]);
  });
  it.each(["absent", "id-collision", "microseconds", "source-extra-column", "missing-locator", "extra-locator", "locator-drift"])(
    "refuses normal, locked or registered snapshots with registry drift: %s", mode => {
      const value = input(), reused = run(value)!, d = declaration(value);
      const actual = {newSources: [clone(d.source)], newLocators: clone(d.locators)};
      if (mode === "absent") actual.newSources = [];
      if (mode === "id-collision") actual.newSources[0].id = value.newSource.id;
      if (mode === "microseconds") actual.newSources[0].created_at = "2026-10-11T16:33:01.026+05:00";
      if (mode === "source-extra-column") actual.newSources[0].copied_from = sourceId;
      if (mode === "missing-locator") actual.newLocators = [];
      if (mode === "extra-locator") actual.newLocators.push({...clone(d.locators[0]), id: value.newLocators[0].id});
      if (mode === "locator-drift") actual.newLocators[0].locator.facts.packageL = 20;
      expect(() => assertSnapshot(reused, actual)).toThrow("FULL_EXISTING_");
    });
});


describe("original publisher excerpt algorithm", () => {
  const historicalPayload = {primaryArtifactSha256: sikaPack.source.sha256, sourcePages: [1, 2, 3],
    facts: sikaPack.source, applicationScopeRu: sikaPack.scopeRu, exclusionsRu: sikaPack.exclusionsRu,
    approximate: true, completeEstimateAccepted: false};
  const config = (value: Row) => ({...value.config, locator: {key: "nominal-broom-coverage-package", payload: historicalPayload},
    sourceMetadata: {exact_locator: sikaPack.source.locatorRu}} as Parameters<typeof excerptHash>[0]);
  it("reproduces the accepted S2763 canonical-JSON hash while retaining honest locator text", () => {
    const value = input();declaration(value).locatorExcerptHashKind = "CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1";
    expect(excerptHash(config(value))).toBe("41479c65d08ca7ea6864a38f04839bc2cc17dc70c0d79b71181b588cd49779a2");
    expect(config(value).sourceMetadata.exact_locator).toBe(sikaPack.source.locatorRu);
    for (const row of [value.newLocators[0], declaration(value).locators[0]]) {
      row.locator = clone(historicalPayload);row.excerpt_sha256 = excerptHash(config(value));
    }
    expect(run(value)!.locators[0].excerpt_sha256).toBe("41479c65d08ca7ea6864a38f04839bc2cc17dc70c0d79b71181b588cd49779a2");
    value.newLocators[0].locator.facts.coverageM2PerL = 5;
    expect(() => run(value)).toThrow("LOCATOR_EXCERPT_POLICY_DRIFT");
  });
  it("preserves the omitted and explicit source-text algorithms", () => {
    const value = input(), expected = createHash("sha256").update(sikaPack.source.locatorRu).digest("hex");
    expect(excerptHash(config(value))).toBe(expected);
    delete value.config.binding.reuseExistingNormativeRegistry;
    expect(excerptHash(config(value))).toBe(expected);
    expect(expected).not.toBe("41479c65d08ca7ea6864a38f04839bc2cc17dc70c0d79b71181b588cd49779a2");
  });
  it.each([undefined, null, "UNKNOWN", "PUBLICATION_LOCALE_COMPARE_JSON"])(
    "refuses an undeclared or incompatible historical hash rule: %j", kind => {
      const value = input();declaration(value).locatorExcerptHashKind = kind;
      expect(() => excerptHash(config(value))).toThrow("EXCERPT_HASH_KIND_REQUIRED");
      expect(() => run(value)).toThrow("EXACT_DECLARATION_REQUIRED");
    });
});

describe('captured authority successor keeps its historical registry metadata shape',()=>{
  function authorityInput():Row{
    const fixture=JSON.parse(readFileSync('data/estimate-benchmarks/fixtures/master-retained-first-authority-parent-r26.json','utf8'));
    const capture=fixture.capture;
    const source=capture.normativeSources.find((row:Row)=>row.source_key==='rik-expo-app.s27-63.bitumen-tile-soft-roof-six.v1:roof');
    const locators=capture.normativeLocators.filter((row:Row)=>row.source_id===source.id);
    const changes=Object.fromEntries(['bitumen_roof_system','bitumen_roof_conditions','bitumen_roof_area_scope'].map(id=>{
      const before=capture.parameters.find((row:Row)=>row.parameter_id===id).truth_metadata;
      const after={...clone(before),visibility_role:'INTERNAL_ONLY',value_source_role:'PROJECT_DOCUMENTATION',
        source_confirmation_required:true,provenance:{...before.provenance,consumer_input_role_v1:'APPLICATION_TECHNICAL'}};
      return[id,{capturedTruthMetadata:clone(before),capturedTruthMetadataSha256:retainedHash(before),afterTruthMetadataSha256:retainedHash(after)}];
    }));
    const {created_at:_createdAt,...managed}=source;
    return{config:{stopCode:'TEST_AUTHORITY_REGISTRY_R27',catalogId:capture.definition.catalog_id,parentReleaseId:fixture.definitionReleaseId,
      binding:{retainParentBindings:{capturedParent:capture,capturedParentSha256:masterRetainedParentCaptureSha256R1(capture),newParameterSources:{},
        truthAuthorityOnlyV1:{contract:'master-retained-truth-authority-only/v1',capturedContentPassport:capture.contentPassport,
          capturedContentPassportSha256:retainedHash(capture.contentPassport),changes,changesSha256:retainedHash(changes)}},
        reuseExistingNormativeRegistry:{contract:'master-existing-normative-registry-reuse/r1',source:clone(source),locators:clone(locators),
          locatorExcerptHashKind:'CANONICAL_ESTIMATE_LOCATOR_JSON_SHA256_R1'}}},
      newSource:{...managed,id:'11111111-1111-1111-1111-111111111111',metadata:{contract:'new-consumer/v1',sourceKind:'CONDITIONAL_SOURCE',
        useRestriction:'The same captured source only',universalProductivityClaimed:false,universalConsumptionClaimed:false,activationAllowed:false}},
      newLocators:locators.map((row:Row)=>({...clone(row),id:'22222222-2222-2222-2222-222222222222',source_id:'11111111-1111-1111-1111-111111111111'}))};
  }
  it('retains every captured source field and microsecond timestamp, without writing generated metadata',()=>{
    const value=authorityInput(),before=clone(value),reused=run(value)!;
    const {created_at:_createdAt,...managed}=declaration(value).source;
    expect(reused.managedSource).toEqual(managed);
    expect(reused.managedSource.metadata).not.toEqual(value.newSource.metadata);
    expect(reused.locators).toEqual(declaration(value).locators);
    expect(value).toEqual(before);
    expect(()=>assertSnapshot(reused,{newSources:[declaration(value).source],newLocators:declaration(value).locators})).not.toThrow();
  });
  it.each(['source_key','title_ru','authority','official_url','artifact_sha256','effective_from','effective_to'])(
    'still rejects a changed source fact: %s',field=>{
      const value=authorityInput();value.newSource[field]='changed';
      expect(()=>run(value)).toThrow('SOURCE_FACTS_OR_METADATA_DRIFT');
    });
  it.each(['source-metadata','source-id','locator-payload','locator-id'])(
    'rejects a declaration that is not its captured historical row: %s',field=>{
      const value=authorityInput(),d=declaration(value);
      if(field==='source-metadata')d.source.metadata={...d.source.metadata,activationAllowed:true};
      if(field==='source-id')d.source.id='33333333-3333-3333-3333-333333333333';
      if(field==='locator-payload')d.locators[0].locator.changed=true;
      if(field==='locator-id')d.locators[0].id='33333333-3333-3333-3333-333333333333';
      expect(()=>run(value)).toThrow('AUTHORITY_EXISTING_REGISTRY_CAPTURE');
    });
  it.each(['capture-sha','passport-sha','wrong-contract'])(
    'requires a valid existing authority declaration: %s',field=>{
      const value=authorityInput(),retained=value.config.binding.retainParentBindings;
      if(field==='capture-sha')retained.capturedParentSha256='0'.repeat(64);
      if(field==='passport-sha')retained.truthAuthorityOnlyV1.capturedContentPassportSha256='0'.repeat(64);
      if(field==='wrong-contract')retained.truthAuthorityOnlyV1.contract='wrong';
      expect(()=>run(value)).toThrow(/AUTHORITY_/u);
    });
  it('does not extend the ordinary non-authority reuse path',()=>{
    const value=authorityInput();delete value.config.binding.retainParentBindings.truthAuthorityOnlyV1;
    expect(()=>run(value)).toThrow('SOURCE_FACTS_OR_METADATA_DRIFT');
  });
});
