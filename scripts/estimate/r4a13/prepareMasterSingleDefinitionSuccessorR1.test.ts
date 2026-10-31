import { CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT } from "./catalogFirstEstimateMinimumInputAudit.shared";
import {
  canonicalPublisherEffectivePriceKey,
  canonicalPublisherPriceBindingIsCompatible,
  canonicalPublisherQuantityScopeIsConsistent,
} from "./canonicalDefinitionPublisherR1";
import {
  buildMasterParameterCalculationConsumers,
  buildMasterCapabilityMatrix,
  buildMasterScopeReadiness,
  resolveMasterSingleDefinitionNextCounts,
  validateIndependentCompletenessMapReferences,
  readMasterSuccessorTargetPreimageR1,
  assembleMasterSingleDefinitionManagedRegistryCandidateR1 as registryCandidate,
  resolveMasterSingleDefinitionLocatorExcerptSha256R1 as publisherExcerpt,
} from "./prepareMasterSingleDefinitionSuccessorR1";

describe('whole successor target preimage on the existing writer connection',()=>{
 const input={releaseId:'selected-release',catalogId:'selected-catalog',sourceId:'new-source'};
 function client(bindings=['{"id":"b1"}','{"id":"b2"}']){
  const calls:string[]=[];return{calls,query:jest.fn(async(sql:string)=>{calls.push(sql);
   if(sql.includes("current_setting('TimeZone')"))return{rows:[{zone:'UTC'}]};
   if(sql.includes('set_config')||sql.startsWith('lock table'))return{rows:[]};
   if(sql.includes('select m.definition_version_id'))return{rows:[{definition_version_id:'d',approved_template_baseline_id:'b',definition_version:3,definition_sha256:'known'}]};
   const table=/from public\.(\w+) t where/u.exec(sql)?.[1];
   const raw=table==='estimate_work_normative_binding'?bindings:table==='estimate_normative_source'&&sql.includes('t.source_key')?[]:['{"id":"known"}'];
   return{rows:raw.map(raw=>({raw}))};
  })};
 }
 it('covers all ten row sets, ignores row order, detects changed or additional bindings and uses no data writes',async()=>{
  const source=client(),before=await readMasterSuccessorTargetPreimageR1(source as never,input);
  expect(Object.keys(before.sets)).toEqual(['definition','baseline','parameters','formulas','resources','bindings','locators','sources','newSource','identity']);
  expect(before.sets.bindings.rowCount).toBe(2);
  expect(await readMasterSuccessorTargetPreimageR1(client(['{"id":"b2"}','{"id":"b1"}']) as never,input)).toEqual(before);
  for(const rows of [['{"id":"b1"}','{"id":"changed"}'],['{"id":"b1"}','{"id":"b2"}','{"id":"extra"}']])
   expect(await readMasterSuccessorTargetPreimageR1(client(rows) as never,input)).not.toEqual(before);
  expect(source.calls.some(sql=>/^(?:insert|update|delete|alter|commit|rollback)\b/iu.test(sql))).toBe(false);
 });
 it('takes the shared table locks before reading the selected target and restores the session timezone',async()=>{
  const source=client();await readMasterSuccessorTargetPreimageR1(source as never,{...input,lock:true});
  expect(source.calls[0]).toContain('lock table public.estimate_cumulative_manifest_entry');
  expect(source.calls.at(-1)).toBe("select set_config('TimeZone',$1,$2)");
 });
});

describe('preliminary publisher capability boundary', () => {
  it('persists named unresolved resources without declaring the applicable scope complete', () => {
    const matrix = buildMasterCapabilityMatrix(['installation'], [{ row_id: 'base' }, { row_id: 'installation' }]);
    expect(matrix.find(entry => entry.capability === 'FULL_APPLICABLE_SCOPE')).toEqual({
      capability: 'FULL_APPLICABLE_SCOPE', status: 'NEEDS_SOURCE', unresolvedResourceRowIds: ['installation'], preliminaryCompositionOnly: true,
    });
    expect(matrix.find(entry => entry.capability === 'PRICE')?.status).toBe('GREEN_UNKNOWN_IS_NULL');
    expect(buildMasterCapabilityMatrix(undefined, [])[2]).toEqual({ capability: 'FULL_APPLICABLE_SCOPE', status: 'GREEN' });
    expect(buildMasterScopeReadiness(['installation'], [{ row_id: 'installation' }])).toEqual({
      quantityScope: 'PARTIAL', technicalScopeStatus: 'NEEDS_SOURCE', preliminaryCompositionOnly: true, unresolvedResourceRowIds: ['installation'],
    });
    expect(buildMasterScopeReadiness(undefined, [])).toEqual({ quantityScope: 'FULL' });
  });
  it('rejects an empty, missing or duplicate unresolved row claim', () => {
    for (const rows of [[], ['absent'], ['installation', 'installation']]) {
      expect(() => buildMasterCapabilityMatrix(rows, [{ row_id: 'installation' }])).toThrow('MASTER_LIMITED_SCOPE');
    }
  });
});

describe('persisted preliminary scope cannot masquerade as complete', () => {
  const payload = () => ({
    passport: {
      decision: { quantityScope: 'PARTIAL', technicalScopeStatus: 'NEEDS_SOURCE', preliminaryCompositionOnly: true, unresolvedResourceRowIds: ['installation'] },
      capability_matrix: buildMasterCapabilityMatrix(['installation'], [{ row_id: 'installation' }]),
    },
    parameters: [{ parameter_id: 'hours', default_value: null, truth_metadata: { value_source_role: 'UNRESOLVED_APPLICATION_NORM',
      visibility_role: 'INTERNAL_ONLY', provenance: { consumer_input_role_v1: 'APPLICATION_TECHNICAL' } } }],
    formulas: [{ formula_id: 'labour', input_parameter_ids: ['hours'] }],
    resources: [{ row_id: 'installation', formula_id: 'labour' }], baseline: { input_values: {} },
  });
  it('admits a consistent explicit unknown norm and preserves the separate full-scope contract', () => {
    expect(canonicalPublisherQuantityScopeIsConsistent(payload())).toBe(true);
    const full = payload(); full.passport.decision = { quantityScope: 'FULL' } as never;
    full.passport.capability_matrix = buildMasterCapabilityMatrix(undefined, []);
    expect(canonicalPublisherQuantityScopeIsConsistent(full)).toBe(false);
    full.parameters[0]!.truth_metadata.value_source_role = 'BACKEND_DERIVED';
    expect(canonicalPublisherQuantityScopeIsConsistent(full)).toBe(true);
  });
  it('admits an unresolved source gate without changing the existing arithmetic formula', () => {
    const input = {...payload(), parameters:payload().parameters.map(p=>({...p,required:true})), formulas:[{formula_id:'balance',input_parameter_ids:['area','stock']}],
      resources:[{row_id:'installation',formula_id:'balance',resource_graph:{inputParameterIds:['hours']}}]};
    expect(canonicalPublisherQuantityScopeIsConsistent(input)).toBe(true);
    input.baseline.input_values={hours:'customer approval'};
    expect(canonicalPublisherQuantityScopeIsConsistent(input)).toBe(false);
  });
  it('requires the exact union of arithmetic and declared resource norm consumers', () => {
    const input={...payload(),parameters:payload().parameters.map(p=>({...p,required:true})),formulas:[...payload().formulas,{formula_id:'balance',input_parameter_ids:['area']}],
      resources:[...payload().resources,{row_id:'order',formula_id:'balance',resource_graph:{inputParameterIds:['hours']}}]};
    expect(canonicalPublisherQuantityScopeIsConsistent(input)).toBe(false);
    input.passport.decision.unresolvedResourceRowIds=['installation','order'];
    input.passport.capability_matrix=buildMasterCapabilityMatrix(['installation','order'],input.resources);
    expect(canonicalPublisherQuantityScopeIsConsistent(input)).toBe(true);
    input.passport.decision.unresolvedResourceRowIds.push('unrelated');
    input.passport.capability_matrix=buildMasterCapabilityMatrix(['installation','order','unrelated'],[...input.resources,{row_id:'unrelated'}]);
    expect(canonicalPublisherQuantityScopeIsConsistent(input)).toBe(false);
  });
  it('does not treat descriptive or malformed resource metadata as a source gate', () => {
    for(const graph of [{details:{inputParameterIds:['hours']}},{inputParameterIds:'hours'},{inputParameterIds:['unknown']}]){
      expect(canonicalPublisherQuantityScopeIsConsistent({...payload(),parameters:payload().parameters.map(p=>({...p,required:true})),formulas:[{formula_id:'area',input_parameter_ids:['area']}],
        resources:[{row_id:'installation',formula_id:'area',resource_graph:graph}]})).toBe(false);
    }
  });
  it('does not claim an optional resource-only mention as an unresolved quantity gate', () => {
    const input={...payload(),parameters:payload().parameters.map(p=>({...p,required:false})),
      formulas:[{formula_id:'area',input_parameter_ids:['area']}],resources:[{row_id:'installation',formula_id:'area',resource_graph:{inputParameterIds:['hours']}}]};
    expect(canonicalPublisherQuantityScopeIsConsistent(input)).toBe(false);
    expect(canonicalPublisherQuantityScopeIsConsistent({...input,parameters:input.parameters.map(p=>({...p,required:true}))})).toBe(true);
  });
  it.each(['false-full', 'no-blockers', 'unknown-row', 'capability-mismatch', 'default', 'fixture', 'customer-norm', 'hidden-extra-row'])('rejects %s claims', mutation => {
    const input = payload();
    if (mutation === 'false-full') input.passport.decision.quantityScope = 'FULL';
    if (mutation === 'no-blockers') input.passport.decision.unresolvedResourceRowIds = [];
    if (mutation === 'unknown-row') input.passport.decision.unresolvedResourceRowIds = ['absent'];
    if (mutation === 'capability-mismatch') input.passport.capability_matrix[2]!.status = 'GREEN';
    if (mutation === 'default') input.parameters[0]!.default_value = 2 as never;
    if (mutation === 'fixture') input.baseline.input_values = { hours: 2 };
    if (mutation === 'customer-norm') input.parameters[0]!.truth_metadata.visibility_role = 'USER_INPUT';
    if (mutation === 'hidden-extra-row') input.resources.push({ row_id: 'another-installation', formula_id: 'labour' });
    expect(canonicalPublisherQuantityScopeIsConsistent(input)).toBe(false);
  });
});

describe("master publisher calculation consumers without DB publication", () => {
  it("uses formula, resource fact/title gates and inclusion controls, not invented consumers", () => {
    expect(buildMasterParameterCalculationConsumers({
      parameters: ["quantity", "product", "method", "unused"].map(parameter_id => ({ parameter_id })),
      formulas: [{ formula_id: "volume", input_parameter_ids: ["quantity"] }],
      resources: [{ row_id: "order", formula_id: "volume", resource_graph: { titleSpecificationParameterIds: ["product"], inputParameterIds: ["method"] },
        inclusion_ast: { kind: "equals", parameterId: "method", value: "selected" } }],
    })).toEqual({
      formulaConsumers: { quantity: ["volume"], product: [], method: [], unused: [] },
      resourceConsumers: { quantity: ["order"], product: ["order"], method: ["order"], unused: [] },
    });
  });
  it("retains declared fallback only for existing rows and preserves inferred-consumer precedence", () => {
    expect(buildMasterParameterCalculationConsumers({
      parameters: [{ parameter_id: "fallback", truth_metadata: { resource_branch_consumers: ["existing", "absent"] } },
        { parameter_id: "inferred", truth_metadata: { resource_branch_consumers: ["existing"] } }],
      formulas: [{ formula_id: "volume", input_parameter_ids: ["inferred"] }],
      resources: [{ row_id: "existing", formula_id: "other", resource_graph: {}, inclusion_ast: {} },
        { row_id: "calculated", formula_id: "volume", resource_graph: {}, inclusion_ast: {} }],
    }).resourceConsumers).toEqual({ fallback: ["existing"], inferred: ["calculated"] });
  });
  it("serializes each needed resource graph once across many fields, without losing nested source/branch consumers", () => {
    const graphReads: number[] = [], inclusionReads: number[] = [];
    const parameters = Array.from({ length: 30 }, (_, index) => ({ parameter_id: `actual_${index}` }));
    const resources = Array.from({ length: 12 }, (_, index) => ({ row_id: `actual-row-${index}`, formula_id: "not-consumed-formula",
      resource_graph: { toJSON: () => { graphReads.push(index); return { deeply: { nested: { inputParameterIds: [`actual_${index}`] } } }; } },
      inclusion_ast: { toJSON: () => { inclusionReads.push(index); return { kind: "equals", parameterId: `actual_${index + 12}`, value: "chosen" }; } },
    }));
    const result = buildMasterParameterCalculationConsumers({ parameters, formulas: [], resources });
    expect(graphReads).toHaveLength(resources.length); expect(inclusionReads).toHaveLength(resources.length);
    for (let index = 0; index < 12; index += 1) {
      expect(result.resourceConsumers[`actual_${index}`]).toEqual([`actual-row-${index}`]);
      expect(result.resourceConsumers[`actual_${index + 12}`]).toEqual([`actual-row-${index}`]);
    }
    expect(result.resourceConsumers.actual_29).toEqual([]);
  });
  it("preserves formula short-circuiting and rereads changed definitions without a retained global serialization cache", () => {
    const forbidden = { toJSON: () => { throw new Error("Formula ownership must not serialize an unused branch"); } };
    expect(buildMasterParameterCalculationConsumers({ parameters: [{ parameter_id: "quantity" }],
      formulas: [{ formula_id: "f", input_parameter_ids: ["quantity"] }],
      resources: [{ row_id: "r", formula_id: "f", resource_graph: forbidden, inclusion_ast: forbidden }],
    }).resourceConsumers).toEqual({ quantity: ["r"] });
    const resource = { row_id: "r", formula_id: "none", resource_graph: { inputParameterIds: ["first"] }, inclusion_ast: {} };
    const input = { parameters: ["first", "next"].map(parameter_id => ({ parameter_id })), formulas: [], resources: [resource] };
    expect(buildMasterParameterCalculationConsumers(input).resourceConsumers).toEqual({ first: ["r"], next: [] });
    resource.resource_graph.inputParameterIds = ["next"];
    expect(buildMasterParameterCalculationConsumers(input).resourceConsumers).toEqual({ first: [], next: ["r"] });
  });
});

const formulas = [{ formula_id: "formula:roller-hours" }];
const resources = [{ row_id: "row:roller", formula_id: "formula:roller-hours" }];
const resourcesWithIncludedComponent = [
  ...resources,
  {
    row_id: "row:roller-water",
    formula_id: "formula:roller-hours",
    resource_graph: {
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
      parentCostOwnerId: "row:roller",
    },
  },
];

function completenessMap(resolution: Record<string, unknown> = {
  kind: "ROW",
  rowId: "row:roller",
}) {
  return {
    contract: CATALOG_INDEPENDENT_COMPLETENESS_MAP_CONTRACT,
    sourceKind: "TECHNOLOGY_MAP",
    generatedFromCurrentRows: false,
    evidenceSha256: "a".repeat(64),
    entries: [{
      operationId: "operation:breakdown-rolling",
      expectedResourceId: "resource:breakdown-roller",
      condition: "asphalt_compaction_selected",
      sourceId: "source:technology-map:v1",
      formulaId: "formula:roller-hours",
      resolution,
    }],
  };
}

describe("master successor independent completeness references", () => {
  test("accepts an independently authored entry that resolves to the published row and formula", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap(),
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
    })).toEqual([]);
  });

  test("accepts an operation explicitly included in an existing parent row", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap({
        kind: "INCLUDED_IN_PARENT",
        parentRowId: "row:roller",
      }),
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
    })).toEqual([]);
  });

  test("accepts an independently required visible component included in a parent price", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap({
        kind: "INCLUDED_COMPONENT_ROW",
        rowId: "row:roller-water",
        parentRowId: "row:roller",
      }),
      formulaDefinitions: formulas,
      resourceDefinitions: resourcesWithIncludedComponent,
    })).toEqual([]);
  });

  test("rejects removal of an independently required included component", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap({
        kind: "INCLUDED_COMPONENT_ROW",
        rowId: "row:roller-water",
        parentRowId: "row:roller",
      }),
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
    })).toContain("ENTRY_0_ROW_REFERENCE");
  });

  test("rejects removal or rewiring of the price-owning parent", () => {
    const map = completenessMap({
      kind: "INCLUDED_COMPONENT_ROW",
      rowId: "row:roller-water",
      parentRowId: "row:roller",
    });
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: map,
      formulaDefinitions: formulas,
      resourceDefinitions: resourcesWithIncludedComponent.slice(1),
    })).toContain("ENTRY_0_PARENT_ROW_REFERENCE");
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: map,
      formulaDefinitions: formulas,
      resourceDefinitions: [
        resources[0],
        {
          ...resourcesWithIncludedComponent[1],
          resource_graph: {
            costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
            parentCostOwnerId: "row:other",
          },
        },
      ],
    })).toContain("ENTRY_0_PARENT_ROW_MISMATCH");
  });

  test("rejects stale row and formula references", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap(),
      formulaDefinitions: [{ formula_id: "formula:other" }],
      resourceDefinitions: [{ row_id: "row:other", formula_id: "formula:other" }],
    })).toEqual(expect.arrayContaining([
      "ENTRY_0_ROW_REFERENCE",
      "ENTRY_0_FORMULA_REFERENCE",
    ]));
  });

  test("rejects a row whose formula differs from the independent map", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: completenessMap(),
      formulaDefinitions: formulas,
      resourceDefinitions: [{ row_id: "row:roller", formula_id: "formula:other" }],
    })).toContain("ENTRY_0_ROW_FORMULA_MISMATCH");
  });

  test("rejects a map generated from the current rows", () => {
    expect(validateIndependentCompletenessMapReferences({
      completenessMap: {
        ...completenessMap(),
        generatedFromCurrentRows: true,
      },
      formulaDefinitions: formulas,
      resourceDefinitions: resources,
    })).toContain("NOT_INDEPENDENT");
  });
});

describe("master successor compatible price inheritance", () => {
  const sourceResource = {
    row_id: "source:roller",
    cost_owner_id: "stable:roller-rental",
    unit_id: "machine_hour",
  };

  test("uses the stable cost owner before a route-local price key", () => {
    expect(canonicalPublisherEffectivePriceKey(sourceResource, "route:legacy-key"))
      .toBe("stable:roller-rental");
  });

  test("keeps a price route only for the same cost owner and unit", () => {
    expect(canonicalPublisherPriceBindingIsCompatible({
      sourceResource,
      targetResource: {
        row_id: "renamed:roller",
        cost_owner_id: "stable:roller-rental",
        unit_id: "machine_hour",
      },
      sourceBindingPriceKey: "route:legacy-key",
    })).toBe(true);
    expect(canonicalPublisherPriceBindingIsCompatible({
      sourceResource,
      targetResource: {
        row_id: "renamed:roller",
        cost_owner_id: "stable:roller-rental",
        unit_id: "shift",
      },
      sourceBindingPriceKey: "route:legacy-key",
    })).toBe(false);
    expect(canonicalPublisherPriceBindingIsCompatible({
      sourceResource,
      targetResource: {
        row_id: "renamed:roller",
        cost_owner_id: "stable:other-rental",
        unit_id: "machine_hour",
      },
      sourceBindingPriceKey: "route:legacy-key",
    })).toBe(false);
  });

  test("falls back to binding and row identities when cost owners are absent", () => {
    expect(canonicalPublisherPriceBindingIsCompatible({
      sourceResource: { row_id: "legacy-row", unit_id: "kg" },
      targetResource: { row_id: "stable-price-key", unit_id: "kg" },
      sourceBindingPriceKey: "stable-price-key",
    })).toBe(true);
  });
});

describe("master successor definition count modes", () => {
  const parent = { definitions: 10_331, parameters: 32_450, formulas: 586_735, resources: 586_965 };
  const nextTarget = { parameters: 3, formulas: 4, resources: 4 };

  test("append adds one identity and the full new definition shape", () => {
    expect(resolveMasterSingleDefinitionNextCounts({
      parent,
      previousTarget: null,
      nextTarget,
    })).toEqual({
      definitions: 10_332,
      parameters: 32_453,
      formulas: 586_739,
      resources: 586_969,
    });
  });

  test("replacement preserves the identity denominator and swaps only the target shape", () => {
    expect(resolveMasterSingleDefinitionNextCounts({
      parent,
      previousTarget: { parameters: 2, formulas: 2, resources: 3 },
      nextTarget,
    })).toEqual({
      definitions: 10_331,
      parameters: 32_451,
      formulas: 586_737,
      resources: 586_966,
    });
  });
});

describe("pure managed registry candidate before publisher effects", () => {
  const verified = { projectSourcePackage: null, projectSourcePackageSet: null };
  const config = () => ({
    contract: "TEST_ONLY_PUBLISHER_CANDIDATE", stopCode: "TEST_CANDIDATE",
    catalogId: "TEST_ONLY_CATALOG", parentReleaseId: "TEST_ONLY_PARENT",
    sourceId: "TEST_ONLY_SOURCE", normId: "TEST_ONLY_NORM",
    sourceMetadata: { source_title: "TEST ONLY", source_authority: "TEST ONLY",
      exact_locator: "TEST ONLY exact locator", use_restriction: "TEST ONLY no admission",
      source_kind: "TEST_ONLY_SOURCE", official_url: null, artifact_sha256: "a".repeat(64) },
    locator: { key: "TEST_ONLY_LOCATOR", payload: { exactColumn: "TEST_ONLY_NORM", quantity: null } },
    binding: { rowId: "TEST_ONLY_ROW", applicability: { full: false } },
  });
  it("assembles the exact managed rows without reading writer controls or invoking callbacks", () => {
    const cfg = config(), before = JSON.stringify(cfg), forbidden = jest.fn(() => { throw Error("WRITER_EFFECT_FORBIDDEN"); });
    for (const key of ["verifyCore", "verifyTargetPrecondition", "sourcePaths", "currentReleasePath", "outputRoot", "expectedBranch"])
      Object.defineProperty(cfg, key, { get: forbidden });
    const result = registryCandidate(cfg, verified), candidate = result.retentionCandidate;
    expect(forbidden).not.toHaveBeenCalled();
    expect(JSON.stringify(cfg)).toBe(before);
    expect(candidate.config).toBe(cfg);
    expect(candidate.newSource).toMatchObject({ source_key: cfg.sourceId, artifact_sha256: "a".repeat(64),
      effective_from: null, effective_to: null, metadata: { contract: cfg.contract,
        universalProductivityClaimed: false, universalConsumptionClaimed: false, activationAllowed: false } });
    expect(candidate.newSource).not.toHaveProperty("created_at");
    expect(candidate.newLocators).toEqual([{ id: expect.stringMatching(/^[a-f0-9-]{36}$/u),
      source_id: candidate.newSource.id, locator_key: cfg.locator.key, locator: cfg.locator.payload,
      excerpt_sha256: publisherExcerpt(cfg) }]);
    expect(result.existingRegistryReuse).toBeNull();
    expect(registryCandidate(cfg, verified).retentionCandidate).toEqual(candidate);
  });
  it("keeps source ownership stable when only a locator changes and separates another source contract", () => {
    const cfg = config(), first = registryCandidate(cfg, verified).retentionCandidate;
    const changedLocator = registryCandidate({ ...cfg, locator: { ...cfg.locator, key: "TEST_OTHER_LOCATOR" } }, verified).retentionCandidate;
    expect(changedLocator.newSource).toEqual(first.newSource);
    expect(changedLocator.newLocators[0]!.id).not.toBe(first.newLocators[0]!.id);
    const other = registryCandidate({ ...cfg, contract: "TEST_OTHER_CONTRACT" }, verified).retentionCandidate;
    expect(other.newSource.id).not.toBe(first.newSource.id);
    expect(other.newLocators[0]!.id).not.toBe(first.newLocators[0]!.id);
  });
  it("refuses a package config without its already verified package instead of reading or falling back", () => {
    expect(() => registryCandidate({ ...config(), projectSourcePackagePath: "TEST_MUST_NOT_READ.json" }, verified))
      .toThrow("REGISTRY_CANDIDATE_VERIFIED_PACKAGE_REQUIRED");
  });
  it("retains the existing fail-closed behavior for a present malformed registry-reuse declaration", () => {
    const cfg = config();
    Object.defineProperty(cfg.binding, "reuseExistingNormativeRegistry", { value: null });
    expect(() => registryCandidate(cfg, verified)).toThrow("EXISTING_REGISTRY_");
  });
});
