import type { Client } from 'pg';
import {
  canonicalPublisherPriceBindingIsCompatible,
  createCanonicalDefinitionClonePlan,
  preflightCanonicalDefinitionPublishPlans,
  publishCanonicalDefinitionDraft,
  type CanonicalDefinitionPublishPlan,
  type CanonicalPublisherJson,
} from './canonicalDefinitionPublisherR1';

// Every identity and payload below is synthetic. This is a query-boundary unit
// test of the real publisher, not a PostgreSQL, SKU/price or history acceptance.
const TARGET_IDS = [
  'aaaaaaaa-1111-4111-8111-000000000001',
  'bbbbbbbb-1111-4111-8111-000000000002',
  'cccccccc-1111-4111-8111-000000000003',
] as const;
const DEFINITION_ID = 'dddddddd-1111-4111-8111-000000000001';
const SOURCE_DEFINITION_ID = 'eeeeeeee-1111-4111-8111-000000000001';
const RELEASE_ID = 'ffffffff-1111-4111-8111-000000000001';
const BASELINE_ID = '11111111-1111-4111-8111-000000000001';
const CONTRACT = 'test:canonical-price-inheritance-target-policy:v1';
const CONTENT_CONTRACT = 'real-professional-estimates-r3.content-passport.v1';
const FLAG = 'automaticGenericPriceInheritanceAllowed';
const FILTER = '\n      and target.id <> all($3::uuid[])';
// Frozen from the actual bbc3ddd publisher before this opt-in change. Keeping
// the complete statement checks active-route, owner/unit, conflict and ordering
// semantics, not only the presence of the new predicate.
const LEGACY_ROUTE_SQL = `insert into public.estimate_resource_price_route_binding(
      resource_spec_id,route_id,price_key,priority)
    select distinct on (target.id,source_binding.route_id)
      target.id,source_binding.route_id,source_binding.price_key,source_binding.priority
    from public.estimate_resource_spec target
    join public.estimate_resource_spec source
      on source.definition_version_id=$1
      and source.unit_id=target.unit_id
    join public.estimate_resource_price_route_binding source_binding
      on source_binding.resource_spec_id=source.id
    join public.estimate_price_route route
      on route.id=source_binding.route_id and route.active
    where target.definition_version_id=$2
      and coalesce(nullif(trim(source.cost_owner_id),''),source_binding.price_key)
        =coalesce(nullif(trim(target.cost_owner_id),''),target.row_id)
    order by target.id,source_binding.route_id,source_binding.priority,source.id
    on conflict(resource_spec_id,route_id) do nothing
    returning resource_spec_id`;

function makePlan(metadata: readonly CanonicalPublisherJson[] = [{}, {}, {}],
  parameterDefinitions?: CanonicalPublisherJson[]) {
  const resources = metadata.map((source_metadata, ordinal) => ({
    row_id: `test:row:${ordinal}`, ordinal, section: 'test', category: 'material',
    title_ru: 'Одинаковое синтетическое название', row_type: 'material', unit_id: 'm',
    formula_id: 'test:quantity', inclusion_ast: { kind: 'literal', value: true },
    resource_graph: { costTreatment: 'OWN_COST' }, cost_owner_id: `test:owner:${ordinal}`,
    procurement_eligible: true, source_metadata,
  }));
  const parameters = parameterDefinitions ?? [{ parameter_id: 'quantity', ordinal: 0, value_type: 'decimal',
    unit_id: 'm', title_ru: 'Синтетическое количество', required: true,
    constraints_json: {}, truth_metadata: { contract: CONTRACT } }];
  const formulas = [{ formula_id: 'test:quantity', output_unit_id: 'm',
    expression_source: 'quantity', ast: { kind: 'parameter', parameterId: 'quantity' },
    input_parameter_ids: ['quantity'], ast_sha256: '1'.repeat(64) }];
  return createCanonicalDefinitionClonePlan({
    contract: CONTRACT,
    definition: { id: DEFINITION_ID, releaseId: RELEASE_ID, catalogId: 'test:catalog',
      definitionVersion: 2, passport: {}, applicability: {}, definitionSha256: '2'.repeat(64),
      sourceMetadata: { synthetic: true } },
    representative: { parameters, formulas, resources, bindings: [],
      baseline: { parameter_schema_sha256: '3'.repeat(64), input_values: {}, input_classification: {},
        uom_by_parameter: {}, formula_consumer_ids: {}, resource_consumer_row_ids: {},
        normative_source_ids: {}, guide_provenance_ru: {}, proposal_source_refs: [],
        contract_version: 'test:baseline' },
      passport: { contract_version: CONTENT_CONTRACT, included_scope_ru: [],
        capability_matrix: [{ capability: 'PARAMETERS', status: 'GREEN' },
          { capability: 'FORMULAS', status: 'GREEN' },
          { capability: 'FULL_APPLICABLE_SCOPE', status: 'GREEN' },
          { capability: 'PRICE', status: 'GREEN_UNKNOWN_IS_NULL' }] } },
    parameterTruthMetadata: parameter => parameter.truth_metadata,
    resourceId: resource => TARGET_IDS[Number(resource.ordinal)]!,
    resourceSemanticOwner: resource => String(resource.cost_owner_id),
    resourceSha256: () => '4'.repeat(64),
    baseline: { id: BASELINE_ID, key: 'test:baseline', sourceDefinitionVersionId: SOURCE_DEFINITION_ID,
      validationScenarioRefs: [], acceptanceEvidenceSha256: '5'.repeat(64), acceptedReleaseId: RELEASE_ID,
      supersedesBaselineId: null },
    passport: { physicalResultRu: 'Синтетическая проверка издателя', excludedScopeRu: [],
      decision: { contract: CONTENT_CONTRACT, status: 'GREEN', allowed: true, quantityScope: 'FULL',
        priceState: 'PARTIAL_NEEDS_PRICE', activationAllowed: false, productionEligible: false,
        waveContract: CONTRACT }, payloadSha256: '6'.repeat(64), sourceHead: '7'.repeat(40), sourceTree: '8'.repeat(40) },
    bindingApplicability: binding => binding.applicability,
    expectedNormativeBindingCount: 0,
  });
}

type Call = { sql: string; values: unknown[] };
const isRouteInsert = (sql: string) => sql.startsWith('insert into public.estimate_resource_price_route_binding(');

/** Transport stub only: it records real publisher statements and supplies the
 * declared synthetic payload to the existing self-audit. It does not implement
 * SQL selection, copy any price, or claim schema/preflight/transaction proof. */
function recordingClient(plan: CanonicalDefinitionPublishPlan, routeFailure?: Error,
  parameterReadback?: (rows: CanonicalPublisherJson[]) => CanonicalPublisherJson[]) {
  const calls: Call[] = [];
  const query = jest.fn(async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values: structuredClone(values) });
    const rowsResult = (rows: CanonicalPublisherJson[]) => ({ rows: structuredClone(rows), rowCount: rows.length });
    if (isRouteInsert(sql)) {
      if (routeFailure) throw routeFailure;
      return rowsResult([]);
    }
    if (sql.startsWith('insert into public.estimate_')) return rowsResult([]);
    if (sql.startsWith('update public.estimate_parameter_definition p')) return rowsResult([]);
    if (sql.startsWith('update public.estimate_definition_version definition')) return rowsResult([{ id: plan.definition.id }]);
    if (sql.startsWith('select id,release_id,catalog_id,definition_version,passport,')) {
      return rowsResult([{ ...plan.definition, content_status: 'CANDIDATE_READY', content_gate_status: 'GREEN' }]);
    }
    if (sql.startsWith('select definition_version_id,parameter_id,')) {
      const rows = structuredClone(plan.parameters).sort((left, right) => left.ordinal - right.ordinal);
      return rowsResult(parameterReadback ? parameterReadback(rows) : rows);
    }
    if (sql.startsWith('select definition_version_id,formula_id,')) return rowsResult(plan.formulas);
    if (sql.startsWith('select id,definition_version_id,row_id,')) return rowsResult(plan.resources);
    if (sql.startsWith('select id,baseline_key,catalog_id,')) return rowsResult([plan.baseline]);
    if (sql.startsWith('select definition_version_id,release_id,catalog_id,contract_version,')) return rowsResult([plan.passport]);
    if (sql.startsWith('select binding.definition_version_id,')) return rowsResult(plan.bindings);
    if (sql.startsWith('select price_binding.resource_spec_id,')) return rowsResult([]);
    throw new Error(`UNEXPECTED_PUBLISHER_QUERY:${sql}`);
  });
  // pg.Client has connection methods intentionally absent from this transport
  // stub; neither the test nor the publisher opens a connection here.
  return { client: { query } as unknown as Client, calls, query };
}

function routeCall(calls: readonly Call[]): Call {
  const matches = calls.filter(call => isRouteInsert(call.sql));
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

function priceCompatible(target: CanonicalPublisherJson, sourceMetadata: CanonicalPublisherJson = {}) {
  return canonicalPublisherPriceBindingIsCompatible({
    sourceResource: { row_id: 'test:source', unit_id: target.unit_id,
      cost_owner_id: target.cost_owner_id, source_metadata: sourceMetadata },
    targetResource: target, sourceBindingPriceKey: target.cost_owner_id,
  });
}

describe('real canonical publisher target-only automatic price inheritance opt-out', () => {
  test('absent flag preserves the complete historical SQL, two parameters and plan bytes', async () => {
    const plan = makePlan();
    const original = structuredClone(plan);
    const recorder = recordingClient(plan);
    const result = await publishCanonicalDefinitionDraft(recorder.client, plan);
    expect(routeCall(recorder.calls)).toEqual({ sql: LEGACY_ROUTE_SQL, values: [SOURCE_DEFINITION_ID, DEFINITION_ID] });
    expect(result.inheritedCompatiblePriceBindingCount).toBe(0);
    expect(priceCompatible(plan.resources[0]!)).toBe(true);
    expect(plan).toStrictEqual(original);
    expect(recorder.calls.some(call => /^\s*(?:delete|begin|commit|rollback)\b/iu.test(call.sql))).toBe(false);
  });

  const nonOptIns: Array<[string, CanonicalPublisherJson]> = [
    ['true', { [FLAG]: true }],
    ['nested false', { provenance: { [FLAG]: false } }],
  ];
  test.each(nonOptIns)('%s does not opt a target out of the legacy route query', async (_label, metadata) => {
    const plan = makePlan([metadata, {}, {}]);
    const recorder = recordingClient(plan);
    await publishCanonicalDefinitionDraft(recorder.client, plan);
    expect(routeCall(recorder.calls)).toEqual({ sql: LEGACY_ROUTE_SQL, values: [SOURCE_DEFINITION_ID, DEFINITION_ID] });
    expect(priceCompatible(plan.resources[0]!)).toBe(true);
  });

  const malformedPolicies: Array<[string, unknown]> = [
    ['string false', 'false'], ['zero', 0], ['null', null], ['undefined', undefined],
    ['object', {}], ['array', []],
  ];
  test.each(malformedPolicies)('rejects present non-boolean %s consistently before preflight or publication queries', async (_label, value) => {
    const plan = makePlan([{ [FLAG]: value }, {}, {}]);
    const recorder = recordingClient(plan);
    const exact = /^STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_POLICY_TYPE$/u;
    await expect(preflightCanonicalDefinitionPublishPlans(recorder.client, [plan])).rejects.toThrow(exact);
    await expect(publishCanonicalDefinitionDraft(recorder.client, plan)).rejects.toThrow(exact);
    expect(() => priceCompatible(plan.resources[0]!)).toThrow(exact);
    expect(recorder.query).not.toHaveBeenCalled();
  });

  test('literal false excludes only that new target UUID while preserving every legacy predicate', async () => {
    const plan = makePlan([{}, { [FLAG]: false }, {}]);
    const original = structuredClone(plan);
    const recorder = recordingClient(plan);
    await publishCanonicalDefinitionDraft(recorder.client, plan);
    const call = routeCall(recorder.calls);
    expect(call.values).toEqual([SOURCE_DEFINITION_ID, DEFINITION_ID, [TARGET_IDS[1]]]);
    expect(priceCompatible(plan.resources[1]!)).toBe(false);
    expect(priceCompatible(plan.resources[0]!)).toBe(true);
    expect(call.sql.split(FILTER)).toHaveLength(2);
    expect(call.sql.replace(FILTER, '')).toBe(LEGACY_ROUTE_SQL);
    expect(call.sql).not.toContain(TARGET_IDS[1]);
    const insert = recorder.calls.find(item => item.sql.startsWith('insert into public.estimate_resource_spec('))!;
    expect(insert).toBeDefined();
    expect(JSON.parse(String(insert.values[17 + 15]))).toEqual({ [FLAG]: false });
    expect(recorder.calls.indexOf(insert)).toBeLessThan(recorder.calls.indexOf(call));
    expect(plan).toStrictEqual(original);
    expect(recorder.calls.filter(item => /(?:insert into|update|delete from) public\.estimate_resource_price_route_binding\b/u.test(item.sql)))
      .toEqual([call]);
  });

  test('canonical exclusion UUIDs are sorted independently of physical row order', async () => {
    const plan = makePlan([{ [FLAG]: false }, {}, { [FLAG]: false }]);
    plan.resources.reverse();
    plan.resources.forEach((resource, ordinal) => { resource.ordinal = ordinal; });
    const original = structuredClone(plan);
    const recorder = recordingClient(plan);
    await publishCanonicalDefinitionDraft(recorder.client, plan);
    expect(routeCall(recorder.calls).values).toEqual([SOURCE_DEFINITION_ID, DEFINITION_ID, [TARGET_IDS[0], TARGET_IDS[2]]]);
    expect(plan).toStrictEqual(original);
  });

  const invalidIds: Array<[string, unknown]> = [
    ['empty', ''], ['null', null], ['number', 123], ['padded UUID', ` ${TARGET_IDS[0]}`],
    ['uppercase noncanonical UUID', TARGET_IDS[0].toUpperCase()],
    ['malformed UUID', TARGET_IDS[0].slice(1)], ['SQL text', "x') OR TRUE --"],
  ];
  test.each(invalidIds)('rejects an excluded %s before the first publisher query', async (_label, value) => {
    const plan = makePlan([{ [FLAG]: false }, {}, {}]);
    plan.resources[0]!.id = value as string;
    const recorder = recordingClient(plan);
    await expect(preflightCanonicalDefinitionPublishPlans(recorder.client, [plan]))
      .rejects.toThrow(/^STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_EXCLUDED_RESOURCE_ID$/u);
    await expect(publishCanonicalDefinitionDraft(recorder.client, plan))
      .rejects.toThrow(/^STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_EXCLUDED_RESOURCE_ID$/u);
    expect(recorder.query).not.toHaveBeenCalled();
  });

  test('rejects an excluded resource bound to the source definition before any DML', async () => {
    const plan = makePlan([{ [FLAG]: false }, {}, {}]);
    plan.resources[0]!.definition_version_id = SOURCE_DEFINITION_ID;
    const recorder = recordingClient(plan);
    await expect(preflightCanonicalDefinitionPublishPlans(recorder.client, [plan]))
      .rejects.toThrow(/^STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_TARGET_DEFINITION$/u);
    await expect(publishCanonicalDefinitionDraft(recorder.client, plan))
      .rejects.toThrow(/^STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_TARGET_DEFINITION$/u);
    expect(recorder.query).not.toHaveBeenCalled();
  });

  test.each([false, true])('rejects an excluded UUID shared with another row (other excluded: %s)', async otherExcluded => {
    const plan = makePlan([{ [FLAG]: false }, otherExcluded ? { [FLAG]: false } : {}, {}]);
    plan.resources[1]!.id = TARGET_IDS[0].toUpperCase();
    const recorder = recordingClient(plan);
    await expect(preflightCanonicalDefinitionPublishPlans(recorder.client, [plan]))
      .rejects.toThrow(/^STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_DUPLICATE_RESOURCE_ID$/u);
    await expect(publishCanonicalDefinitionDraft(recorder.client, plan))
      .rejects.toThrow(/^STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_DUPLICATE_RESOURCE_ID$/u);
    expect(recorder.query).not.toHaveBeenCalled();
  });

  test('a later legacy publication does not retain an earlier target exclusion', async () => {
    const first = makePlan([{ [FLAG]: false }, {}, {}]);
    const firstRecorder = recordingClient(first);
    await publishCanonicalDefinitionDraft(firstRecorder.client, first);
    expect(routeCall(firstRecorder.calls).values).toHaveLength(3);
    const later = makePlan();
    const laterRecorder = recordingClient(later);
    await publishCanonicalDefinitionDraft(laterRecorder.client, later);
    expect(routeCall(laterRecorder.calls)).toEqual({ sql: LEGACY_ROUTE_SQL, values: [SOURCE_DEFINITION_ID, DEFINITION_ID] });
  });

  test('source-side policy cannot opt a legacy target out or validate its product price', () => {
    const target = makePlan().resources[0]!;
    expect(priceCompatible(target, { [FLAG]: false })).toBe(true);
    expect(priceCompatible(target, { [FLAG]: 'false' })).toBe(true);
    expect(priceCompatible({ ...target, source_metadata: { [FLAG]: false } }, {})).toBe(false);
  });

  test('a route write failure propagates without baseline/promotion writes or a fallback route query', async () => {
    const plan = makePlan([{ [FLAG]: false }, {}, {}]);
    const failure = new Error('SYNTHETIC_ROUTE_WRITE_FAILURE');
    const recorder = recordingClient(plan, failure);
    await expect(publishCanonicalDefinitionDraft(recorder.client, plan)).rejects.toBe(failure);
    expect(routeCall(recorder.calls).values).toEqual([SOURCE_DEFINITION_ID, DEFINITION_ID, [TARGET_IDS[0]]]);
    expect(recorder.calls.at(-1)).toBe(routeCall(recorder.calls));
    expect(recorder.calls.some(call => call.sql.startsWith('insert into public.estimate_approved_template_baseline(')
      || call.sql.startsWith('update public.estimate_definition_version definition')
      || /^\s*(?:begin|commit|rollback)\b/iu.test(call.sql))).toBe(false);
  });
});

describe('canonical publisher parameter readback order', () => {
  function unorderedParameters() {
    const base = makePlan().parameters[0]!;
    return [
      { ...structuredClone(base), parameter_id: 'later', ordinal: 95, title_ru: 'Поздний параметр',
        constraints_json: { min: 2 }, truth_metadata: { provenance: 'later-source' } },
      { ...structuredClone(base), parameter_id: 'earlier', ordinal: 12, title_ru: 'Ранний параметр',
        constraints_json: { min: 1 }, truth_metadata: { provenance: 'earlier-source' } },
    ];
  }

  test('publishes unordered sparse parent parameters in persisted order without changing their values or the parent', async () => {
    const parameters = unorderedParameters(), before = structuredClone(parameters);
    const plan = makePlan(undefined, parameters);
    expect(plan.parameters).toEqual([before[1], before[0]]);
    expect(parameters).toEqual(before);
    const recorder = recordingClient(plan);
    await expect(publishCanonicalDefinitionDraft(recorder.client, plan)).resolves.toMatchObject({
      status: 'GREEN_CANONICAL_PUBLISHER_PERSISTED_SELF_AUDIT', parameterCount: 2,
    });
    expect(parameters).toEqual(before);
  });

  test.each(['default_value', 'truth_metadata', 'ordinal'])(
    'retains strict self-audit rejection when persisted %s differs', async field => {
      const plan = makePlan(undefined, unorderedParameters());
      const recorder = recordingClient(plan, undefined, rows => {
        rows[0]![field] = field === 'default_value' ? '99'
          : field === 'ordinal' ? 13 : { provenance: 'wrong-source' };
        return rows;
      });
      await expect(publishCanonicalDefinitionDraft(recorder.client, plan))
        .rejects.toThrow('STOP_CANONICAL_PUBLISHER_SELF_AUDIT_PAYLOAD:test:catalog:parameters:');
    });
});
