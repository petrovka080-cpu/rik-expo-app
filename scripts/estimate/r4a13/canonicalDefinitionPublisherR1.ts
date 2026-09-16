import { createHash } from "node:crypto";

import type { Client } from "pg";

export type CanonicalPublisherJson = Record<string, any>;

const CONTENT_PASSPORT_CONTRACT = "real-professional-estimates-r3.content-passport.v1";
const ALLOWED_RESOURCE_ROW_TYPES = new Set([
  "material",
  "labor",
  "equipment",
  "service",
  "waste",
  "other",
]);
const ALLOWED_PARAMETER_VALUE_TYPES = new Set([
  "decimal",
  "integer",
  "boolean",
  "enum",
  "text",
  "array_object",
]);

type CanonicalDefinitionClonePlanInput = {
  contract: string;
  definition: {
    id: string;
    releaseId: string;
    catalogId: string;
    definitionVersion: number;
    passport: CanonicalPublisherJson;
    applicability: CanonicalPublisherJson;
    definitionSha256: string;
    sourceMetadata: CanonicalPublisherJson;
  };
  representative: {
    parameters: CanonicalPublisherJson[];
    formulas: CanonicalPublisherJson[];
    resources: CanonicalPublisherJson[];
    bindings: CanonicalPublisherJson[];
    baseline: CanonicalPublisherJson;
    passport: CanonicalPublisherJson;
  };
  parameterTruthMetadata: (parameter: CanonicalPublisherJson) => CanonicalPublisherJson;
  resourceId: (resource: CanonicalPublisherJson) => string;
  resourceSemanticOwner: (resource: CanonicalPublisherJson) => string;
  resourceSha256: (resource: CanonicalPublisherJson) => string;
  baseline: {
    id: string;
    key: string;
    sourceDefinitionVersionId: string;
    validationScenarioRefs: unknown;
    acceptanceEvidenceSha256: string;
    acceptedReleaseId: string;
    supersedesBaselineId: string | null;
  };
  passport: {
    physicalResultRu: string;
    excludedScopeRu: unknown;
    decision: CanonicalPublisherJson;
    payloadSha256: string;
    sourceHead: string;
    sourceTree: string;
  };
  bindingApplicability: (binding: CanonicalPublisherJson) => CanonicalPublisherJson;
  expectedNormativeBindingCount: number;
};

export type CanonicalDefinitionPublishPlan = ReturnType<typeof createCanonicalDefinitionClonePlan>;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function isObject(value: unknown): value is CanonicalPublisherJson {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(stable(value)))
    .digest("hex");
}

function jsonb(value: unknown, code: string, shape: "object" | "array" | "any" = "any"): string {
  invariant(value !== undefined, `${code}:UNDEFINED`);
  if (shape === "object") invariant(isObject(value), `${code}:NOT_OBJECT`);
  if (shape === "array") invariant(Array.isArray(value), `${code}:NOT_ARRAY`);
  const serialized = JSON.stringify(value);
  invariant(serialized !== undefined, `${code}:NOT_JSON_SERIALIZABLE`);
  return serialized;
}

function assertSha256(value: unknown, code: string): asserts value is string {
  invariant(typeof value === "string" && /^[0-9a-f]{64}$/u.test(value), code);
}

export function createCanonicalDefinitionClonePlan(input: CanonicalDefinitionClonePlanInput) {
  const resourceIds = new Map<string, string>();
  const resources = input.representative.resources.map((resource) => {
    const id = input.resourceId(resource);
    resourceIds.set(String(resource.row_id), id);
    return {
      id,
      definition_version_id: input.definition.id,
      row_id: resource.row_id,
      ordinal: resource.ordinal,
      section: resource.section,
      category: resource.category,
      title_ru: resource.title_ru,
      row_type: resource.row_type,
      unit_id: resource.unit_id,
      formula_id: resource.formula_id,
      inclusion_ast: resource.inclusion_ast,
      resource_graph: resource.resource_graph,
      semantic_owner: input.resourceSemanticOwner(resource),
      cost_owner_id: resource.cost_owner_id,
      procurement_eligible: resource.procurement_eligible,
      source_metadata: resource.source_metadata,
      row_sha256: input.resourceSha256(resource),
    };
  });

  return {
    contract: input.contract,
    expected_normative_binding_count: input.expectedNormativeBindingCount,
    definition: {
      id: input.definition.id,
      release_id: input.definition.releaseId,
      catalog_id: input.definition.catalogId,
      definition_version: input.definition.definitionVersion,
      passport: input.definition.passport,
      applicability: input.definition.applicability,
      definition_sha256: input.definition.definitionSha256,
      source_metadata: input.definition.sourceMetadata,
      content_status: "QUARANTINED",
      content_gate_status: "RED",
    },
    parameters: input.representative.parameters.map((parameter) => ({
      definition_version_id: input.definition.id,
      parameter_id: parameter.parameter_id,
      ordinal: parameter.ordinal,
      value_type: parameter.value_type,
      unit_id: parameter.unit_id,
      title_ru: parameter.title_ru,
      required: parameter.required,
      default_value: null,
      constraints_json: parameter.constraints_json,
      truth_metadata: input.parameterTruthMetadata(parameter),
      approved_template_baseline_id: input.baseline.id,
    })),
    formulas: input.representative.formulas.map((formula) => ({
      definition_version_id: input.definition.id,
      formula_id: formula.formula_id,
      output_unit_id: formula.output_unit_id,
      expression_source: formula.expression_source,
      ast: formula.ast,
      input_parameter_ids: formula.input_parameter_ids,
      ast_sha256: formula.ast_sha256,
    })),
    resources,
    baseline: {
      id: input.baseline.id,
      baseline_key: input.baseline.key,
      catalog_id: input.definition.catalogId,
      definition_version_id: input.definition.id,
      source_definition_version_id: input.baseline.sourceDefinitionVersionId,
      parameter_schema_sha256: input.representative.baseline.parameter_schema_sha256,
      input_values: input.representative.baseline.input_values,
      input_classification: input.representative.baseline.input_classification,
      uom_by_parameter: input.representative.baseline.uom_by_parameter,
      formula_consumer_ids: input.representative.baseline.formula_consumer_ids,
      resource_consumer_row_ids: input.representative.baseline.resource_consumer_row_ids,
      normative_source_ids: input.representative.baseline.normative_source_ids,
      guide_provenance_ru: input.representative.baseline.guide_provenance_ru,
      proposal_source_refs: input.representative.baseline.proposal_source_refs,
      validation_scenario_refs: input.baseline.validationScenarioRefs,
      acceptance_evidence_sha256: input.baseline.acceptanceEvidenceSha256,
      accepted_release_id: input.baseline.acceptedReleaseId,
      supersedes_baseline_id: input.baseline.supersedesBaselineId,
      contract_version: input.representative.baseline.contract_version,
    },
    passport: {
      definition_version_id: input.definition.id,
      release_id: input.definition.releaseId,
      catalog_id: input.definition.catalogId,
      contract_version: input.representative.passport.contract_version,
      identity_mode: "WORK",
      redirect_catalog_id: null,
      physical_result_ru: input.passport.physicalResultRu,
      included_scope_ru: input.representative.passport.included_scope_ru,
      excluded_scope_ru: input.passport.excludedScopeRu,
      capability_matrix: input.representative.passport.capability_matrix,
      parameter_count: input.representative.parameters.length,
      formula_count: input.representative.formulas.length,
      resource_count: input.representative.resources.length,
      decision: input.passport.decision,
      payload_sha256: input.passport.payloadSha256,
      source_head: input.passport.sourceHead,
      source_tree: input.passport.sourceTree,
    },
    bindings: input.representative.bindings.map((binding) => ({
      definition_version_id: input.definition.id,
      resource_spec_id: resourceIds.get(String(binding.row_id)),
      locator_id: binding.locator_id,
      applicability: input.bindingApplicability(binding),
    })),
  };
}

const REQUIRED_COLUMNS: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  estimate_parameter_definition: Object.freeze({
    default_value: "jsonb",
    constraints_json: "jsonb",
    truth_metadata: "jsonb",
  }),
  estimate_resource_spec: Object.freeze({
    row_type: "text",
    inclusion_ast: "jsonb",
    resource_graph: "jsonb",
    source_metadata: "jsonb",
  }),
  estimate_approved_template_baseline: Object.freeze({
    normative_source_ids: "jsonb",
    guide_provenance_ru: "jsonb",
    validation_scenario_refs: "jsonb",
  }),
  estimate_content_passport_r3: Object.freeze({
    included_scope_ru: "jsonb",
    excluded_scope_ru: "jsonb",
    capability_matrix: "jsonb",
    decision: "jsonb",
  }),
});

export async function preflightCanonicalDefinitionPublisherSchema(client: Client) {
  const tables = Object.keys(REQUIRED_COLUMNS);
  const columns = (await client.query(`select table_name,column_name,udt_name
    from information_schema.columns
    where table_schema='public' and table_name=any($1::text[])
    order by table_name,column_name`, [tables])).rows as CanonicalPublisherJson[];
  const actualColumns = new Map(columns.map((row) => [
    `${row.table_name}.${row.column_name}`,
    String(row.udt_name),
  ]));
  for (const [table, expectedColumns] of Object.entries(REQUIRED_COLUMNS)) {
    for (const [column, type] of Object.entries(expectedColumns)) {
      invariant(actualColumns.get(`${table}.${column}`) === type,
        `STOP_CANONICAL_PUBLISHER_SCHEMA_COLUMN:${table}.${column}:${actualColumns.get(`${table}.${column}`) ?? "missing"}`);
    }
  }

  const constraints = (await client.query(`select conrelid::regclass::text table_name,conname,
      pg_get_constraintdef(oid,true) definition
    from pg_constraint
    where conrelid=any($1::regclass[])
    order by table_name,conname`, [[
    "public.estimate_parameter_definition",
    "public.estimate_resource_spec",
    "public.estimate_content_passport_r3",
    "public.estimate_definition_version",
  ]])).rows as CanonicalPublisherJson[];
  const constraintText = constraints.map((row) => `${row.table_name}:${row.conname}:${row.definition}`).join("\n");
  for (const token of [
    "estimate_resource_spec_row_type_check",
    "'material'::text",
    "'labor'::text",
    "'service'::text",
    "jsonb_array_length(capability_matrix) = 4",
    "decision ->> 'contract'",
    "'CANDIDATE_READY'::text",
    "'QUARANTINED'::text",
  ]) {
    invariant(constraintText.includes(token), `STOP_CANONICAL_PUBLISHER_SCHEMA_CONSTRAINT:${token}`);
  }
  const validator = (await client.query(`select pg_get_functiondef(
      'public.estimate_parameter_truth_metadata_valid_r3(text,jsonb)'::regprocedure) definition`))
    .rows[0]?.definition as string | undefined;
  invariant(validator?.includes("guide_kind") && validator.includes("semantic_parameter_key"),
    "STOP_CANONICAL_PUBLISHER_PARAMETER_VALIDATOR_DRIFT");

  return {
    status: "GREEN_CANONICAL_PUBLISHER_SCHEMA_PREFLIGHT",
    columnCount: columns.length,
    constraintCount: constraints.length,
    schemaSha256: sha256({ columns, constraints, validator }),
    normativeSourceIdsStorage: "jsonb_parameter_source_map",
    resourceRowTypes: [...ALLOWED_RESOURCE_ROW_TYPES].sort(),
    passportCapabilityCount: 4,
  };
}

function flattenNormativeSourceMap(value: unknown, code: string): string[] {
  invariant(isObject(value), `${code}:NOT_OBJECT`);
  const sources: string[] = [];
  for (const [parameterId, parameterSources] of Object.entries(value)) {
    invariant(Array.isArray(parameterSources), `${code}:NOT_ARRAY:${parameterId}`);
    for (const source of parameterSources) {
      invariant(typeof source === "string" && source.trim().length > 0,
        `${code}:INVALID_SOURCE:${parameterId}`);
      sources.push(source);
    }
  }
  return [...new Set(sources)].sort();
}

export async function preflightCanonicalDefinitionPublishPlans(
  client: Client,
  plans: readonly CanonicalDefinitionPublishPlan[],
) {
  invariant(plans.length > 0, "STOP_CANONICAL_PUBLISHER_EMPTY_PLAN");
  const schema = await preflightCanonicalDefinitionPublisherSchema(client);
  const auditedPlans: CanonicalPublisherJson[] = [];
  for (const plan of plans) {
    const prefix = `STOP_CANONICAL_PUBLISHER_PAYLOAD:${plan.definition.catalog_id}`;
    invariant(plan.contract.trim().length > 0, `${prefix}:CONTRACT`);
    invariant(plan.definition.definition_version > 0, `${prefix}:DEFINITION_VERSION`);
    assertSha256(plan.definition.definition_sha256, `${prefix}:DEFINITION_SHA256`);
    invariant(isObject(plan.definition.passport), `${prefix}:PASSPORT_NOT_OBJECT`);
    invariant(isObject(plan.definition.applicability), `${prefix}:APPLICABILITY_NOT_OBJECT`);
    invariant(isObject(plan.definition.source_metadata), `${prefix}:SOURCE_METADATA_NOT_OBJECT`);
    invariant(plan.definition.content_status === "QUARANTINED"
      && plan.definition.content_gate_status === "RED", `${prefix}:INITIAL_LIFECYCLE`);

    invariant(plan.parameters.length === plan.passport.parameter_count, `${prefix}:PARAMETER_COUNT`);
    invariant(plan.formulas.length === plan.passport.formula_count, `${prefix}:FORMULA_COUNT`);
    invariant(plan.resources.length === plan.passport.resource_count, `${prefix}:RESOURCE_COUNT`);
    invariant(new Set(plan.parameters.map((row) => row.parameter_id)).size === plan.parameters.length,
      `${prefix}:PARAMETER_DUPLICATE`);
    invariant(new Set(plan.formulas.map((row) => row.formula_id)).size === plan.formulas.length,
      `${prefix}:FORMULA_DUPLICATE`);
    invariant(new Set(plan.resources.map((row) => row.row_id)).size === plan.resources.length,
      `${prefix}:RESOURCE_DUPLICATE`);

    for (const parameter of plan.parameters) {
      invariant(ALLOWED_PARAMETER_VALUE_TYPES.has(String(parameter.value_type)),
        `${prefix}:PARAMETER_VALUE_TYPE:${parameter.parameter_id}:${parameter.value_type}`);
      invariant(isObject(parameter.constraints_json), `${prefix}:PARAMETER_CONSTRAINTS:${parameter.parameter_id}`);
      invariant(isObject(parameter.truth_metadata), `${prefix}:PARAMETER_TRUTH:${parameter.parameter_id}`);
      invariant(parameter.truth_metadata.contract === plan.contract,
        `${prefix}:PARAMETER_CONTRACT:${parameter.parameter_id}`);
      invariant(parameter.truth_metadata.semantic_parameter_key === `${plan.definition.catalog_id}:${parameter.parameter_id}`,
        `${prefix}:PARAMETER_SEMANTIC_KEY:${parameter.parameter_id}`);
    }
    const parameterValidation = (await client.query(`select parameter_id,
        public.estimate_parameter_truth_metadata_valid_r3(value_type,truth_metadata) valid
      from jsonb_to_recordset($1::jsonb)
        as row(parameter_id text,value_type text,truth_metadata jsonb)
      order by parameter_id`, [jsonb(plan.parameters.map((parameter) => ({
        parameter_id: parameter.parameter_id,
        value_type: parameter.value_type,
        truth_metadata: parameter.truth_metadata,
      })), `${prefix}:PARAMETER_VALIDATION`, "array")])).rows as CanonicalPublisherJson[];
    const invalidParameters = parameterValidation.filter((row) => row.valid !== true)
      .map((row) => String(row.parameter_id));
    invariant(invalidParameters.length === 0,
      `${prefix}:PARAMETER_TRUTH_METADATA_INVALID:${invalidParameters.join(",")}`);

    const formulaIds = new Set(plan.formulas.map((row) => String(row.formula_id)));
    const resourceIds = new Set<string>();
    for (const resource of plan.resources) {
      invariant(ALLOWED_RESOURCE_ROW_TYPES.has(String(resource.row_type)),
        `${prefix}:RESOURCE_ROW_TYPE:${resource.row_id}:${resource.row_type}`);
      invariant(typeof resource.title_ru === "string" && resource.title_ru.trim().length > 0,
        `${prefix}:RESOURCE_TITLE:${resource.row_id}`);
      invariant(formulaIds.has(String(resource.formula_id)), `${prefix}:RESOURCE_FORMULA:${resource.row_id}`);
      invariant(isObject(resource.inclusion_ast), `${prefix}:RESOURCE_INCLUSION:${resource.row_id}`);
      invariant(isObject(resource.resource_graph), `${prefix}:RESOURCE_GRAPH:${resource.row_id}`);
      invariant(isObject(resource.source_metadata), `${prefix}:RESOURCE_SOURCE_METADATA:${resource.row_id}`);
      assertSha256(resource.row_sha256, `${prefix}:RESOURCE_SHA256:${resource.row_id}`);
      resourceIds.add(String(resource.id));
    }

    invariant(plan.bindings.length === plan.expected_normative_binding_count,
      `${prefix}:NORMATIVE_BINDING_COUNT:${plan.bindings.length}`);
    invariant(new Set(plan.bindings.map((binding) => binding.resource_spec_id)).size === plan.bindings.length,
      `${prefix}:NORMATIVE_BINDING_RESOURCE_DUPLICATE`);
    invariant(plan.bindings.every((binding) => resourceIds.has(String(binding.resource_spec_id))),
      `${prefix}:NORMATIVE_BINDING_RESOURCE_MISSING`);
    invariant(plan.bindings.every((binding) => isObject(binding.applicability)),
      `${prefix}:NORMATIVE_BINDING_APPLICABILITY`);

    const expectedSourceKeys = flattenNormativeSourceMap(
      plan.baseline.normative_source_ids,
      `${prefix}:NORMATIVE_SOURCE_IDS`,
    );
    invariant(expectedSourceKeys.length > 0, `${prefix}:NORMATIVE_SOURCE_IDS_EMPTY`);
    const locatorIds = plan.bindings.map((binding) => String(binding.locator_id));
    const locators = (await client.query(`select locator.id::text locator_id,source.source_key
      from public.estimate_normative_locator locator
      join public.estimate_normative_source source on source.id=locator.source_id
      where locator.id=any($1::uuid[])
      order by locator.id`, [locatorIds])).rows as CanonicalPublisherJson[];
    invariant(locators.length === new Set(locatorIds).size,
      `${prefix}:NORMATIVE_LOCATOR_MISSING:${locators.length}:${new Set(locatorIds).size}`);
    const actualSourceKeys = [...new Set(locators.map((row) => String(row.source_key)))].sort();
    invariant(JSON.stringify(actualSourceKeys) === JSON.stringify(expectedSourceKeys),
      `${prefix}:NORMATIVE_SOURCE_CLOSURE:${actualSourceKeys.join(",")}:${expectedSourceKeys.join(",")}`);

    const baselinePayloadValid = (await client.query(`select
        public.estimate_approved_template_baseline_valid_r54(
          $1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb) valid`, [
      jsonb(plan.baseline.input_values, `${prefix}:BASELINE_INPUT_VALUES`, "object"),
      jsonb(plan.baseline.input_classification, `${prefix}:BASELINE_CLASSIFICATION`, "object"),
      jsonb(plan.baseline.uom_by_parameter, `${prefix}:BASELINE_UOM`, "object"),
      jsonb(plan.baseline.formula_consumer_ids, `${prefix}:BASELINE_FORMULA_CONSUMERS`, "object"),
      jsonb(plan.baseline.resource_consumer_row_ids, `${prefix}:BASELINE_RESOURCE_CONSUMERS`, "object"),
      jsonb(plan.baseline.normative_source_ids, `${prefix}:BASELINE_NORMATIVE_SOURCES`, "object"),
      jsonb(plan.baseline.guide_provenance_ru, `${prefix}:BASELINE_GUIDES`, "object"),
    ])).rows[0]?.valid;
    invariant(baselinePayloadValid === true, `${prefix}:BASELINE_PAYLOAD_R54`);

    invariant(plan.passport.contract_version === CONTENT_PASSPORT_CONTRACT,
      `${prefix}:PASSPORT_CONTRACT_VERSION`);
    invariant(plan.passport.identity_mode === "WORK" && plan.passport.redirect_catalog_id == null,
      `${prefix}:PASSPORT_IDENTITY`);
    invariant(Array.isArray(plan.passport.included_scope_ru), `${prefix}:PASSPORT_INCLUDED_SCOPE`);
    invariant(Array.isArray(plan.passport.excluded_scope_ru), `${prefix}:PASSPORT_EXCLUDED_SCOPE`);
    invariant(Array.isArray(plan.passport.capability_matrix)
      && plan.passport.capability_matrix.length === 4, `${prefix}:PASSPORT_CAPABILITY_MATRIX`);
    invariant(isObject(plan.passport.decision), `${prefix}:PASSPORT_DECISION`);
    invariant(plan.passport.decision.contract === CONTENT_PASSPORT_CONTRACT,
      `${prefix}:PASSPORT_DECISION_CONTRACT`);
    invariant(plan.passport.decision.allowed === true && plan.passport.decision.status === "GREEN",
      `${prefix}:PASSPORT_DECISION_STATE`);
    invariant(plan.passport.decision.activationAllowed === false
      && plan.passport.decision.productionEligible === false,
    `${prefix}:PASSPORT_DECISION_RELEASE_SAFETY`);
    assertSha256(plan.passport.payload_sha256, `${prefix}:PASSPORT_PAYLOAD_SHA256`);
    assertSha256(plan.baseline.acceptance_evidence_sha256, `${prefix}:BASELINE_EVIDENCE_SHA256`);

    auditedPlans.push({
      catalogId: plan.definition.catalog_id,
      parameters: plan.parameters.length,
      formulas: plan.formulas.length,
      resources: plan.resources.length,
      normativeBindings: plan.bindings.length,
      normativeSourceKeys: actualSourceKeys,
      payloadSha256: canonicalPlanPayloadSha256(plan),
    });
  }
  return {
    status: "GREEN_CANONICAL_PUBLISHER_PAYLOAD_PREFLIGHT",
    mutationPerformed: false,
    schema,
    plans: auditedPlans,
    plansSha256: sha256(auditedPlans),
  };
}

async function insertRows(
  client: Client,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `STOP_CANONICAL_PUBLISHER_INSERT_SHAPE:${table}`);
      return `(${row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      }).join(",")})`;
    });
    if (tuples.length > 0) {
      await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
    }
  }
}

function canonicalPlanPayload(plan: CanonicalDefinitionPublishPlan) {
  return {
    definition: {
      ...plan.definition,
      content_status: "CANDIDATE_READY",
      content_gate_status: "GREEN",
    },
    parameters: plan.parameters,
    formulas: plan.formulas,
    resources: plan.resources,
    baseline: plan.baseline,
    passport: plan.passport,
    bindings: plan.bindings,
  };
}

function canonicalPlanPayloadSha256(plan: CanonicalDefinitionPublishPlan): string {
  return sha256(canonicalPlanPayload(plan));
}

export async function publishCanonicalDefinitionDraft(
  client: Client,
  plan: CanonicalDefinitionPublishPlan,
) {
  await client.query(`insert into public.estimate_definition_version(
      id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
      source_metadata,content_status,content_gate_status)
    values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
    plan.definition.id,
    plan.definition.release_id,
    plan.definition.catalog_id,
    plan.definition.definition_version,
    jsonb(plan.definition.passport, "STOP_CANONICAL_PUBLISHER_WRITE_DEFINITION_PASSPORT", "object"),
    jsonb(plan.definition.applicability, "STOP_CANONICAL_PUBLISHER_WRITE_DEFINITION_APPLICABILITY", "object"),
    plan.definition.definition_sha256,
    jsonb(plan.definition.source_metadata, "STOP_CANONICAL_PUBLISHER_WRITE_DEFINITION_SOURCE", "object"),
  ]);
  await insertRows(client, "estimate_parameter_definition", [
    "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
    "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
  ], plan.parameters.map((parameter) => [
    parameter.definition_version_id, parameter.parameter_id, parameter.ordinal, parameter.value_type,
    parameter.unit_id, parameter.title_ru, parameter.required, parameter.default_value,
    jsonb(parameter.constraints_json, "STOP_CANONICAL_PUBLISHER_WRITE_PARAMETER_CONSTRAINTS", "object"),
    jsonb(parameter.truth_metadata, "STOP_CANONICAL_PUBLISHER_WRITE_PARAMETER_TRUTH", "object"),
    null,
  ]));
  await insertRows(client, "estimate_formula_graph", [
    "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast",
    "input_parameter_ids", "ast_sha256",
  ], plan.formulas.map((formula) => [
    formula.definition_version_id, formula.formula_id, formula.output_unit_id,
    formula.expression_source, jsonb(formula.ast, "STOP_CANONICAL_PUBLISHER_WRITE_FORMULA_AST", "object"),
    formula.input_parameter_ids, formula.ast_sha256,
  ]));
  await insertRows(client, "estimate_resource_spec", [
    "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
    "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
    "procurement_eligible", "source_metadata", "row_sha256",
  ], plan.resources.map((resource) => [
    resource.id, resource.definition_version_id, resource.row_id, resource.ordinal, resource.section,
    resource.category, resource.title_ru, resource.row_type, resource.unit_id, resource.formula_id,
    jsonb(resource.inclusion_ast, "STOP_CANONICAL_PUBLISHER_WRITE_RESOURCE_INCLUSION", "object"),
    jsonb(resource.resource_graph, "STOP_CANONICAL_PUBLISHER_WRITE_RESOURCE_GRAPH", "object"),
    resource.semantic_owner, resource.cost_owner_id, resource.procurement_eligible,
    jsonb(resource.source_metadata, "STOP_CANONICAL_PUBLISHER_WRITE_RESOURCE_SOURCE", "object"),
    resource.row_sha256,
  ]));
  await client.query(`insert into public.estimate_approved_template_baseline(
      id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
      input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
      normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
      acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
    values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,
      $12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,clock_timestamp(),$18,$19)`, [
    plan.baseline.id, plan.baseline.baseline_key, plan.baseline.catalog_id,
    plan.baseline.definition_version_id, plan.baseline.source_definition_version_id,
    plan.baseline.parameter_schema_sha256,
    jsonb(plan.baseline.input_values, "STOP_CANONICAL_PUBLISHER_WRITE_BASELINE_INPUTS"),
    jsonb(plan.baseline.input_classification, "STOP_CANONICAL_PUBLISHER_WRITE_BASELINE_CLASSIFICATION"),
    jsonb(plan.baseline.uom_by_parameter, "STOP_CANONICAL_PUBLISHER_WRITE_BASELINE_UOM"),
    jsonb(plan.baseline.formula_consumer_ids, "STOP_CANONICAL_PUBLISHER_WRITE_BASELINE_FORMULAS"),
    jsonb(plan.baseline.resource_consumer_row_ids, "STOP_CANONICAL_PUBLISHER_WRITE_BASELINE_RESOURCES"),
    jsonb(plan.baseline.normative_source_ids, "STOP_CANONICAL_PUBLISHER_WRITE_BASELINE_SOURCES", "object"),
    jsonb(plan.baseline.guide_provenance_ru, "STOP_CANONICAL_PUBLISHER_WRITE_BASELINE_GUIDES"),
    jsonb(plan.baseline.proposal_source_refs, "STOP_CANONICAL_PUBLISHER_WRITE_BASELINE_PROPOSALS"),
    jsonb(plan.baseline.validation_scenario_refs, "STOP_CANONICAL_PUBLISHER_WRITE_BASELINE_SCENARIOS"),
    plan.baseline.acceptance_evidence_sha256, plan.baseline.accepted_release_id,
    plan.baseline.supersedes_baseline_id, plan.baseline.contract_version,
  ]);
  await client.query(`update public.estimate_parameter_definition
    set approved_template_baseline_id=$2 where definition_version_id=$1`, [
    plan.definition.id,
    plan.baseline.id,
  ]);
  await client.query(`insert into public.estimate_content_passport_r3(
      definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
      physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
      formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
    values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14::jsonb,$15,$16,$17)`, [
    plan.passport.definition_version_id, plan.passport.release_id, plan.passport.catalog_id,
    plan.passport.contract_version, plan.passport.identity_mode, plan.passport.redirect_catalog_id,
    plan.passport.physical_result_ru,
    jsonb(plan.passport.included_scope_ru, "STOP_CANONICAL_PUBLISHER_WRITE_PASSPORT_INCLUDED", "array"),
    jsonb(plan.passport.excluded_scope_ru, "STOP_CANONICAL_PUBLISHER_WRITE_PASSPORT_EXCLUDED", "array"),
    jsonb(plan.passport.capability_matrix, "STOP_CANONICAL_PUBLISHER_WRITE_PASSPORT_CAPABILITIES", "array"),
    plan.passport.parameter_count, plan.passport.formula_count, plan.passport.resource_count,
    jsonb(plan.passport.decision, "STOP_CANONICAL_PUBLISHER_WRITE_PASSPORT_DECISION", "object"),
    plan.passport.payload_sha256, plan.passport.source_head, plan.passport.source_tree,
  ]);
  const promoted = await client.query(`update public.estimate_definition_version definition
      set content_status='CANDIDATE_READY',content_gate_status='GREEN'
    where definition.id=$1 and definition.release_id=$2 and definition.catalog_id=$3
      and definition.content_status='QUARANTINED' and definition.content_gate_status='RED'
      and exists(select 1 from public.estimate_content_passport_r3 passport
        where passport.definition_version_id=definition.id
          and passport.release_id=definition.release_id and passport.catalog_id=definition.catalog_id)
    returning definition.id`, [
    plan.definition.id,
    plan.definition.release_id,
    plan.definition.catalog_id,
  ]);
  invariant(promoted.rowCount === 1, `STOP_CANONICAL_PUBLISHER_PROMOTION:${plan.definition.catalog_id}`);
  await insertRows(client, "estimate_work_normative_binding", [
    "definition_version_id", "resource_spec_id", "locator_id", "applicability",
  ], plan.bindings.map((binding) => [
    binding.definition_version_id, binding.resource_spec_id, binding.locator_id,
    jsonb(binding.applicability, "STOP_CANONICAL_PUBLISHER_WRITE_BINDING_APPLICABILITY", "object"),
  ]));
  return auditPersistedCanonicalDefinition(client, plan);
}

function selected(row: CanonicalPublisherJson, columns: readonly string[]): CanonicalPublisherJson {
  return Object.fromEntries(columns.map((column) => [column, row[column]]));
}

export async function auditPersistedCanonicalDefinition(
  client: Client,
  plan: CanonicalDefinitionPublishPlan,
) {
  const definition = (await client.query(`select id,release_id,catalog_id,definition_version,passport,
      applicability,definition_sha256,source_metadata,content_status,content_gate_status
    from public.estimate_definition_version where id=$1`, [plan.definition.id])).rows[0] as CanonicalPublisherJson;
  const parameters = (await client.query(`select definition_version_id,parameter_id,ordinal,value_type,unit_id,
      title_ru,required,default_value,constraints_json,truth_metadata,approved_template_baseline_id
    from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal`, [plan.definition.id]))
    .rows as CanonicalPublisherJson[];
  const formulas = (await client.query(`select definition_version_id,formula_id,output_unit_id,expression_source,
      ast,input_parameter_ids,ast_sha256 from public.estimate_formula_graph
    where definition_version_id=$1 order by formula_id`, [plan.definition.id])).rows as CanonicalPublisherJson[];
  const resources = (await client.query(`select id,definition_version_id,row_id,ordinal,section,category,title_ru,
      row_type,unit_id,formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,
      procurement_eligible,source_metadata,row_sha256 from public.estimate_resource_spec
    where definition_version_id=$1 order by ordinal`, [plan.definition.id])).rows as CanonicalPublisherJson[];
  const baseline = (await client.query(`select id,baseline_key,catalog_id,definition_version_id,
      source_definition_version_id,parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
      formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
      proposal_source_refs,validation_scenario_refs,acceptance_evidence_sha256,accepted_release_id,
      supersedes_baseline_id,contract_version from public.estimate_approved_template_baseline where id=$1`, [
    plan.baseline.id,
  ])).rows[0] as CanonicalPublisherJson;
  const passport = (await client.query(`select definition_version_id,release_id,catalog_id,contract_version,
      identity_mode,redirect_catalog_id,physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,
      parameter_count,formula_count,resource_count,decision,payload_sha256,source_head,source_tree
    from public.estimate_content_passport_r3 where definition_version_id=$1`, [plan.definition.id]))
    .rows[0] as CanonicalPublisherJson;
  const bindings = (await client.query(`select binding.definition_version_id,binding.resource_spec_id,
      binding.locator_id,binding.applicability
    from public.estimate_work_normative_binding binding
    join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
    where binding.definition_version_id=$1 order by resource.ordinal`, [
    plan.definition.id,
  ])).rows as CanonicalPublisherJson[];

  invariant(definition && baseline && passport,
    `STOP_CANONICAL_PUBLISHER_SELF_AUDIT_MISSING:${plan.definition.catalog_id}`);
  const persistedPayload = {
    definition,
    parameters,
    formulas,
    resources,
    baseline,
    passport,
    bindings,
  };
  const expectedPayload = canonicalPlanPayload(plan);
  const expectedSha256 = sha256(expectedPayload);
  const persistedSha256 = sha256(persistedPayload);
  invariant(persistedSha256 === expectedSha256,
    `STOP_CANONICAL_PUBLISHER_SELF_AUDIT_PAYLOAD:${plan.definition.catalog_id}:${persistedSha256}:${expectedSha256}`);

  const decision = selected(passport.decision, [
    "contract", "status", "allowed", "quantityScope", "priceState",
    "activationAllowed", "productionEligible", "waveContract",
  ]);
  invariant(decision.contract === CONTENT_PASSPORT_CONTRACT
    && decision.status === "GREEN"
    && decision.allowed === true
    && decision.quantityScope === "FULL"
    && decision.priceState === "PARTIAL_NEEDS_PRICE"
    && decision.activationAllowed === false
    && decision.productionEligible === false
    && decision.waveContract === plan.contract,
  `STOP_CANONICAL_PUBLISHER_SELF_AUDIT_DECISION:${plan.definition.catalog_id}`);

  return {
    status: "GREEN_CANONICAL_PUBLISHER_PERSISTED_SELF_AUDIT",
    definitionId: plan.definition.id,
    catalogId: plan.definition.catalog_id,
    parameterCount: parameters.length,
    formulaCount: formulas.length,
    resourceCount: resources.length,
    normativeBindingCount: bindings.length,
    payloadSha256: persistedSha256,
    decision,
  };
}
