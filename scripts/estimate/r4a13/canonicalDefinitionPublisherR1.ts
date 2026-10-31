import {canonicalDefinitionCompositionScopeV1} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateDefinitionCompositionScopeV1';
import {resolveMasterScopedNormativeRegistryOptInR1,readMasterScopedNormativeRegistryPreconditionsR1,type MasterResolvedScopedNormativeRegistryR1} from './masterScopedNormativeRegistryPreimageR1';
import {auditCanonicalEstimateOperationResourcesV1} from '../../../src/lib/estimate/backendPlatform/canonicalEstimateOperationComposition';
import {canonicalScopeRequirementDecisionV1} from '../../../src/lib/estimate/backendPlatform/canonicalScopeRequirementV1';
import {canonicalPublicResourceDisplayPresentationV1,canonicalPublicSavedResourceRowKindV1} from '../../../src/lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import { createHash } from "node:crypto";
import {hasMasterTypedPartialQuantityBasisR1,validateMasterTypedPartialQuantityBasisR1,
 canonicalPublisherTypedPartialQuantityScopeIsConsistentR1,assertMasterTypedPartialQuantityRegistryR1} from './masterTypedPartialQuantityBasisR1';

import type { Client } from "pg";
import {assertCanonicalNewWorkCatalogIdV1} from "../../../src/lib/estimate/backendPlatform/canonicalPublicCatalogVisibilityV1";
import { canonicalDefinitionPublicationStableValueR1 as stable } from
  "../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1";
import {assertMasterRetainedParentComputationR1,masterRetainParentBindingsOptInR1,
  readMasterRetainedBindingPreconditionsR1,type MasterRetainedBindingGuardInputR1} from
  "./masterSingleDefinitionRetainParentBindingsR1";

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

/** Required only at new definition admission. Historical readers and clone
 * construction remain readable without manufacturing new source evidence.
 * Template rows have no object quantity: do not set quantityKnown from absence. */
export function auditCanonicalPublisherSuccessorOperationResourcesR1(input:Readonly<{
 resourceDefinitions:readonly CanonicalPublisherJson[];parameterDefinitions?:readonly CanonicalPublisherJson[];independentComposition?:unknown;
}>){
 let projection:ReturnType<typeof canonicalDefinitionCompositionScopeV1>;
 try{projection=canonicalDefinitionCompositionScopeV1({...input,independentComposition:input.independentComposition});}
 catch{return {contractVersion:'canonical-operation-resource-acceptance/v1' as const,status:'STRUCTURE_INVALID' as const,
  issues:[{code:'DEFINITION_COMPOSITION_SCOPE_INVALID'}],pdfAllowed:false,definitionAdmissionAllowed:false,completeClaimAllowed:false};}
 return auditCanonicalEstimateOperationResourcesV1({requireIndependentComposition:true,
  independentComposition:projection.independentComposition,
  resources:input.resourceDefinitions.flatMap(row=>{
   if(projection.inactiveRowIds.has(String(row.row_id)))return [];
   const graph=isObject(row.resource_graph)?row.resource_graph:{};
   // Project source metadata only; no object quantities or financial defaults.
   // Keep the full raw plan for existing source/norm/payment guards, and never
   // derive independent expected entries from this classified output.
   const scope=canonicalScopeRequirementDecisionV1(graph.scopeRequirementDecisionV1);
   const savedShape={...row,calculation_trace:{resourceGraph:graph,needState:row.need_state}};
   if(scope?.rowId===row.row_id||canonicalPublicSavedResourceRowKindV1(savedShape)!=='RESOURCE')return [];
   const titleRu=String(row.title_ru??'');
   const presentation=canonicalPublicResourceDisplayPresentationV1({rowId:String(row.row_id??''),titleRu,graph,
    descriptor:graph.publicResourcePresentationV1});
   return[{rowId:String(row.row_id??''),unitId:typeof row.unit_id==='string'?row.unit_id:null,nameRu:presentation?.nameRu??titleRu,sourceNameRu:titleRu,
    resourceKind:presentation?.resourceKind??null,operation:graph.operationCompositionV1,
    publicNameVerified:presentation!=null}];
  })});
}
export function assertCanonicalPublisherSuccessorOperationResourcesR1(input:Parameters<typeof auditCanonicalPublisherSuccessorOperationResourcesR1>[0]&{catalogId?:string;definitionPassport?:unknown}){
 const result=auditCanonicalPublisherSuccessorOperationResourcesR1(input);
 invariant(result.definitionAdmissionAllowed,
  'STOP_CANONICAL_PUBLISHER_NEW_SUCCESSOR_OPERATION_RESOURCES:'+String(input.catalogId??'')+':'+result.status+':'+result.issues.map(issue=>[issue.code,issue.rowId,issue.operationId].filter(Boolean).join(':')).join(','));
 // The content passport is the validated/persisted admission authority. A raw
 // definition may omit the map; explicit competing declarations must agree.
 const raw=isObject(input.definitionPassport)?input.definitionPassport:null;
 const nested=raw&&isObject(raw.decision)?raw.decision:null;
 for(const [scope,container]of [['passport',raw],['passport.decision',nested]] as const){
  if(container&&Object.hasOwn(container,'independentCompletenessMap'))
   invariant(JSON.stringify(stable(container.independentCompletenessMap))===JSON.stringify(stable(input.independentComposition)),
    'STOP_CANONICAL_PUBLISHER_RAW_DEFINITION_COMPOSITION_MISMATCH:'+scope);
 }
 return result;
}

/**
 * Price routes may be carried to a successor only when the stable cost owner
 * and the unit are unchanged. A similar title, ordinal or category is not a
 * price identity and must never be used to copy a numeric price silently.
 */
export function canonicalPublisherEffectivePriceKey(
  resource: CanonicalPublisherJson,
  bindingPriceKey?: unknown,
): string {
  return String(resource.cost_owner_id ?? "").trim()
    || String(bindingPriceKey ?? "").trim()
    || String(resource.row_id ?? "").trim();
}

/** A declared target policy is typed; absence alone keeps the legacy default. */
function automaticGenericPriceInheritanceAllowed(resource: CanonicalPublisherJson): boolean {
  const metadata = resource.source_metadata;
  if (!isObject(metadata) || !Object.hasOwn(metadata, "automaticGenericPriceInheritanceAllowed")) return true;
  invariant(typeof metadata.automaticGenericPriceInheritanceAllowed === "boolean",
    "STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_POLICY_TYPE");
  return metadata.automaticGenericPriceInheritanceAllowed;
}

export function canonicalPublisherPriceBindingIsCompatible(input: Readonly<{
  sourceResource: CanonicalPublisherJson;
  targetResource: CanonicalPublisherJson;
  sourceBindingPriceKey: unknown;
}>): boolean {
  return automaticGenericPriceInheritanceAllowed(input.targetResource)
    && String(input.sourceResource.unit_id ?? "").trim() !== ""
    && String(input.sourceResource.unit_id ?? "").trim()
      === String(input.targetResource.unit_id ?? "").trim()
    && canonicalPublisherEffectivePriceKey(
      input.sourceResource,
      input.sourceBindingPriceKey,
    ) === canonicalPublisherEffectivePriceKey(input.targetResource);
}

/** A limited composition is a distinct, explicitly incomplete local contract.
 * Both passport declarations must name exactly the resources whose formula
 * or declared resource gate depends on an unset application-owned norm. A changed label alone
 * must not admit a fabricated complete baseline. */
export function canonicalPublisherQuantityScopeIsConsistent(input: Readonly<{
  passport: CanonicalPublisherJson;
  parameters: readonly CanonicalPublisherJson[];
  formulas: readonly CanonicalPublisherJson[];
  resources: readonly CanonicalPublisherJson[];
  baseline: CanonicalPublisherJson;
}>): boolean {
  if (hasMasterTypedPartialQuantityBasisR1(input.passport)) return canonicalPublisherTypedPartialQuantityScopeIsConsistentR1(input);
  const decision = input.passport.decision;
  const capability = input.passport.capability_matrix?.find((entry: CanonicalPublisherJson) => entry.capability === 'FULL_APPLICABLE_SCOPE');
  const pending = input.parameters.filter(parameter => parameter.truth_metadata?.value_source_role === 'UNRESOLVED_APPLICATION_NORM');
  if (!decision || !capability) return false;
  if (decision.quantityScope === 'FULL') return pending.length === 0 && capability.status === 'GREEN'
    && decision.preliminaryCompositionOnly !== true && decision.technicalScopeStatus !== 'NEEDS_SOURCE';
  if (decision.quantityScope !== 'PARTIAL' || decision.preliminaryCompositionOnly !== true
    || decision.technicalScopeStatus !== 'NEEDS_SOURCE' || capability.status !== 'NEEDS_SOURCE'
    || capability.preliminaryCompositionOnly !== true) return false;
  const ids = decision.unresolvedResourceRowIds;
  if (!Array.isArray(ids) || ids.length === 0 || new Set(ids).size !== ids.length
    || !Array.isArray(capability.unresolvedResourceRowIds)
    || JSON.stringify([...ids].sort()) !== JSON.stringify([...capability.unresolvedResourceRowIds].sort())) return false;
  if (pending.length === 0 || pending.some(parameter => parameter.default_value != null
    || parameter.truth_metadata.visibility_role !== 'INTERNAL_ONLY'
    || parameter.truth_metadata.provenance?.consumer_input_role_v1 !== 'APPLICATION_TECHNICAL'
    || Object.hasOwn(input.baseline.input_values ?? {}, parameter.parameter_id))) return false;
  const pendingIds = new Set(pending.map(parameter => parameter.parameter_id));
  const requiredResourceGateIds = new Set(pending.filter(parameter => parameter.required === true
    || canonicalPublisherExplicitConditionalNormGateV1(parameter,input.parameters))
    .map(parameter => parameter.parameter_id));
  const expected = input.resources.filter(resource => input.formulas.some(formula => formula.formula_id === resource.formula_id
    && formula.input_parameter_ids?.some((id: string) => pendingIds.has(id)))
    || (Array.isArray(resource.resource_graph?.inputParameterIds)
      && resource.resource_graph.inputParameterIds.some((id: string) => requiredResourceGateIds.has(id)))).map(resource => resource.row_id);
  return JSON.stringify([...ids].sort()) === JSON.stringify(expected.sort());
}

/** A source gap may belong only to an explicitly selected method. Its static
 * passport includes that potential obligation; the compiler applies the same
 * existing `selected` condition to the active method at calculation time. */
function canonicalPublisherExplicitConditionalNormGateV1(parameter:CanonicalPublisherJson,
  parameters:readonly CanonicalPublisherJson[]):boolean{
  const condition=parameter.constraints_json?.requiredWhen;
  if(!isObject(condition)||Object.keys(condition).sort().join('|')!=='kind|parameterId|value'
    ||condition.kind!=='selected'||typeof condition.parameterId!=='string'||typeof condition.value!=='string')return false;
  const selector=parameters.find(p=>p.parameter_id===condition.parameterId);
  return selector?.value_type==='enum'&&selector.default_value===null
    &&selector.truth_metadata?.value_source_role==='PROJECT_SPECIFIC_INPUT'
    &&selector.truth_metadata?.visibility_role==='USER_INPUT'
    &&Array.isArray(selector.constraints_json?.values)&&selector.constraints_json.values.includes(condition.value);
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function isObject(value: unknown): value is CanonicalPublisherJson {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compareUtf8C(left: unknown, right: unknown): number {
  return Buffer.compare(Buffer.from(String(left), "utf8"), Buffer.from(String(right), "utf8"));
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

/** Match the persisted per-definition ordinal key before any parameter insert. */
export function assertCanonicalPublisherParameterOrdinalsUniqueR1(
  parameters: readonly CanonicalPublisherJson[],
): void {
  const ordinals = new Set<number>();
  for (const parameter of parameters) {
    invariant(typeof parameter.ordinal === "number" && Number.isSafeInteger(parameter.ordinal),
      `STOP_CANONICAL_PUBLISHER_PARAMETER_ORDINAL_INVALID:${String(parameter.parameter_id)}`);
    invariant(!ordinals.has(parameter.ordinal),
      `STOP_CANONICAL_PUBLISHER_DUPLICATE_PARAMETER_ORDINAL:${parameter.ordinal}`);
    ordinals.add(parameter.ordinal);
  }
}

export function assertCanonicalPublisherResourceOrdinalsUniqueR1(resources:readonly CanonicalPublisherJson[]):void {
 const ordinals=new Set<number>();
 for(const resource of resources){
  invariant(typeof resource.ordinal==='number'&&Number.isSafeInteger(resource.ordinal),
   `STOP_CANONICAL_PUBLISHER_RESOURCE_ORDINAL_INVALID:${String(resource.row_id)}`);
  invariant(!ordinals.has(resource.ordinal),`STOP_CANONICAL_PUBLISHER_DUPLICATE_RESOURCE_ORDINAL:${resource.ordinal}`);
  ordinals.add(resource.ordinal);
 }
}

export function createCanonicalDefinitionClonePlan(input: CanonicalDefinitionClonePlanInput) {
  assertCanonicalPublisherParameterOrdinalsUniqueR1(input.representative.parameters);
  assertCanonicalPublisherResourceOrdinalsUniqueR1(input.representative.resources);
  const resourceIds = new Map<string, string>();
  const resourceOrdinals = new Map(input.representative.resources.map(resource => [String(resource.row_id), Number(resource.ordinal)]));
  // A captured SELECT may return any row order. Match the persisted audit's
  // ORDER BY ordinal without changing a source row or its historical number.
  const resources = [...input.representative.resources]
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((resource) => {
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
    // Snapshot reads need not follow ordinal order. Match the persisted
    // self-audit without renumbering parameters or mutating the source copy.
    parameters: [...input.representative.parameters]
      .sort((left, right) => left.ordinal - right.ordinal)
      .map((parameter) => ({
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
    formulas: [...input.representative.formulas]
      .sort((left, right) => compareUtf8C(left.formula_id, right.formula_id))
      .map((formula) => ({
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
    // The persisted self-audit reads bindings in physical resource order.
    // A parent's readback may instead use row identity order; normalize the
    // cloned copy without changing the normative binding or its applicability.
    bindings: [...input.representative.bindings].sort((left, right) =>
      (resourceOrdinals.get(String(left.row_id)) ?? Infinity) - (resourceOrdinals.get(String(right.row_id)) ?? Infinity))
      .map((binding) => ({
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

export async function resolveCanonicalApprovedBaselineLeaf(
  client: Pick<Client, "query">,
  rootBaselineId: string,
  expectedCatalogId: string,
) {
  const rows = (await client.query(`with recursive lineage as (
      select baseline.id,baseline.catalog_id,baseline.definition_version_id,
        baseline.accepted_release_id,0::int depth,array[baseline.id]::uuid[] path
      from public.estimate_approved_template_baseline baseline where baseline.id=$1
      union all
      select child.id,child.catalog_id,child.definition_version_id,
        child.accepted_release_id,lineage.depth+1,lineage.path||child.id
      from lineage
      join public.estimate_approved_template_baseline child on child.supersedes_baseline_id=lineage.id
      where lineage.depth<100 and not child.id=any(lineage.path)
    )
    select lineage.*,
      (select count(*)::int from public.estimate_approved_template_baseline child
        where child.supersedes_baseline_id=lineage.id) direct_successor_count
    from lineage order by lineage.depth`, [rootBaselineId])).rows as CanonicalPublisherJson[];
  invariant(rows.length > 0, `STOP_CANONICAL_PUBLISHER_BASELINE_ROOT_MISSING:${rootBaselineId}`);
  invariant(rows.every((row) => row.catalog_id === expectedCatalogId),
    `STOP_CANONICAL_PUBLISHER_BASELINE_CATALOG_DRIFT:${expectedCatalogId}`);
  invariant(rows.length <= 100, `STOP_CANONICAL_PUBLISHER_BASELINE_LINEAGE_TOO_DEEP:${expectedCatalogId}`);
  const leaf = rows.at(-1)!;
  invariant(Number(leaf.direct_successor_count) === 0,
    `STOP_CANONICAL_PUBLISHER_BASELINE_LINEAGE_CYCLE:${expectedCatalogId}:${leaf.id}`);
  return {
    rootBaselineId,
    baselineId: String(leaf.id),
    definitionVersionId: String(leaf.definition_version_id),
    acceptedReleaseId: String(leaf.accepted_release_id),
    depth: Number(leaf.depth),
    path: rows.map((row) => String(row.id)),
  };
}

export async function preflightCanonicalParameterTruthMetadata(
  client: Client,
  parameters: readonly CanonicalPublisherJson[],
  prefix: string,
) {
  const parameterValidation = (await client.query(`select parameter_id,
      public.estimate_parameter_truth_metadata_valid_r3(value_type,truth_metadata) valid
    from jsonb_to_recordset($1::jsonb)
      as row(parameter_id text,value_type text,truth_metadata jsonb)
    order by parameter_id`, [jsonb(parameters.map((parameter) => ({
    parameter_id: parameter.parameter_id,
    value_type: parameter.value_type,
    truth_metadata: parameter.truth_metadata,
  })), `${prefix}:PARAMETER_VALIDATION`, "array")])).rows as CanonicalPublisherJson[];
  const invalidParameters = parameterValidation.filter((row) => row.valid !== true)
    .map((row) => String(row.parameter_id));
  invariant(invalidParameters.length === 0,
    `${prefix}:PARAMETER_TRUTH_METADATA_INVALID:${invalidParameters.join(",")}`);
  return {
    status: "GREEN_CANONICAL_PARAMETER_TRUTH_METADATA_PREFLIGHT",
    parameterCount: parameters.length,
  };
}

/** Historical template assumptions remain in the baseline provenance. They are
 * never physical norms and may be separated only through the exact retained
 * parent contract, re-read from the database after source registration. */
export async function canonicalPublisherRegisteredSourceKeysR1(
  client: Pick<Client,"query">,
  plan: CanonicalDefinitionPublishPlan,
  retainedInput?: MasterRetainedBindingGuardInputR1,
): Promise<string[]> {
  const prefix=`STOP_CANONICAL_PUBLISHER_PAYLOAD:${plan.definition.catalog_id}`;
  const sources=flattenNormativeSourceMap(plan.baseline.normative_source_ids,`${prefix}:NORMATIVE_SOURCE_IDS`);
  if(retainedInput===undefined)return sources;
  const opt=masterRetainParentBindingsOptInR1(retainedInput),legacy=opt?.legacyTemplateAssumptionSources,
    fixture=opt?.legacyCapturedFixtureSources,provenance=legacy??fixture;
  invariant(opt&&provenance,`${prefix}:LEGACY_ASSUMPTION_EXPLICIT_RETAINED_CONTRACT`);
  const old=opt.capturedParent;
  invariant(retainedInput.config.catalogId===plan.definition.catalog_id
    &&plan.baseline.source_definition_version_id===old.definition.id
    &&plan.baseline.supersedes_baseline_id===old.baseline.id,`${prefix}:LEGACY_ASSUMPTION_PARENT`);
  assertMasterRetainedParentComputationR1(retainedInput,plan,"PLAN");
  const equals=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
  const legacyKeys=new Set(Object.values(provenance.parameterSources).flat());
  for(const parameter of old.parameters){
    const id=parameter.parameter_id;
    invariant(equals(plan.baseline.normative_source_ids[id],old.baseline.normative_source_ids[id]),
      `${prefix}:LEGACY_ASSUMPTION_OLD_SOURCE_ARRAY:${id}`);
  }
  for(const id of Object.keys(provenance.parameterSources)){
    invariant(equals(plan.baseline.input_values[id],old.baseline.input_values[id])
      &&plan.baseline.input_classification[id]===(legacy?'ASSUMPTION':old.baseline.input_classification[id])
      &&plan.baseline.uom_by_parameter[id]===old.baseline.uom_by_parameter[id],
      `${prefix}:LEGACY_ASSUMPTION_VALUE_OR_UNIT:${id}`);
  }
  const registeredMap=Object.fromEntries(Object.entries(plan.baseline.normative_source_ids).map(([id,keys])=>{
    invariant(Array.isArray(keys),`${prefix}:NORMATIVE_SOURCE_IDS:${id}`);
    if(Object.hasOwn(provenance.parameterSources,id))return[id,keys.filter(key=>!provenance.parameterSources[id]!.includes(key))];
    invariant(!keys.some(key=>legacyKeys.has(key)),`${prefix}:LEGACY_ASSUMPTION_NEW_SOURCE_USE:${id}`);
    return[id,keys];
  }));
  await readMasterRetainedBindingPreconditionsR1(client,retainedInput,"REGISTERED");
  return flattenNormativeSourceMap(registeredMap,`${prefix}:NORMATIVE_SOURCE_IDS`);
}

/** A registered source attached only to frozen historical fixtures remains in
 * the baseline and registry. It does not acquire a fabricated physical binding.
 * This applies only to the three SHA-pinned captured-fixture parents admitted
 * above; ordinary and template-assumption publication keeps its full closure. */
export async function canonicalPublisherRequiredBindingSourceKeysR1(
  client: Pick<Client,"query">,
  plan: CanonicalDefinitionPublishPlan,
  retainedInput?: MasterRetainedBindingGuardInputR1,
): Promise<string[]> {
  const sources=await canonicalPublisherRegisteredSourceKeysR1(client,plan,retainedInput);
  if(retainedInput===undefined)return sources;
  const opt=masterRetainParentBindingsOptInR1(retainedInput);
  if(opt?.legacyCapturedFixtureSources==null)return sources;
  const prefix=`STOP_CANONICAL_PUBLISHER_PAYLOAD:${plan.definition.catalog_id}:CAPTURED_REGISTERED_FIXTURE`;
  const old=opt.capturedParent,oldParameterIds=new Set(old.parameters.map(p=>p.parameter_id));
  const boundOldSources=new Set(old.normativeLocators.map(locator=>
    old.normativeSources.find(source=>source.id===locator.source_id)!.source_key));
  const historicalOnly=sources.filter(key=>old.normativeSources.some(source=>source.source_key===key)
    &&!boundOldSources.has(key));
  if(historicalOnly.length===0)return sources;
  const equals=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
  const fixtureParameters=new Set<string>();
  for(const key of historicalOnly){
    const uses=Object.entries(old.baseline.normative_source_ids).filter(([,keys])=>Array.isArray(keys)&&keys.includes(key));
    invariant(uses.length>0,`${prefix}:UNREFERENCED_SOURCE:${key}`);
    for(const [id]of uses){
      invariant(["VALIDATION_FIXTURE","DERIVED"].includes(old.baseline.input_classification[id])
        &&equals(plan.baseline.input_values[id],old.baseline.input_values[id])
        &&plan.baseline.input_classification[id]===old.baseline.input_classification[id]
        &&plan.baseline.uom_by_parameter[id]===old.baseline.uom_by_parameter[id],
      `${prefix}:EXACT_OLD_INPUT:${id}`);
      fixtureParameters.add(id);
    }
    invariant(Object.entries(plan.baseline.normative_source_ids).every(([id,keys])=>
      oldParameterIds.has(id)||!Array.isArray(keys)||!keys.includes(key)),`${prefix}:NEW_SOURCE_USE:${key}`);
  }
  const consumesFixture=(formula:CanonicalPublisherJson|undefined)=>Array.isArray(formula?.input_parameter_ids)
    &&formula!.input_parameter_ids.some((id:string)=>fixtureParameters.has(id));
  const oldFormulas=new Set(old.formulas.map(f=>f.formula_id)),oldRows=new Set(old.resources.map(r=>r.row_id));
  invariant(plan.formulas.filter(f=>!oldFormulas.has(f.formula_id)).every(f=>!consumesFixture(f))
    &&plan.resources.filter(r=>!oldRows.has(r.row_id)).every(r=>
      !consumesFixture(plan.formulas.find(f=>f.formula_id===r.formula_id))),`${prefix}:NOT_A_NEW_QUANTITY_NORM`);
  return sources.filter(key=>!historicalOnly.includes(key));
}

export type CanonicalOrdinaryCompositeTypedQuantityInputR1=Readonly<{
 kind:'ORDINARY_COMPOSITE_TYPED_QUANTITY';catalogId:string;bindingRowIds:readonly string[];
 scopedRegistry:MasterResolvedScopedNormativeRegistryR1;
}>;
export type CanonicalTypedQuantityInputR1=MasterRetainedBindingGuardInputR1|CanonicalOrdinaryCompositeTypedQuantityInputR1;
function ordinaryTypedQuantityInput(input:CanonicalTypedQuantityInputR1):input is CanonicalOrdinaryCompositeTypedQuantityInputR1{
 return 'kind' in input&&input.kind==='ORDINARY_COMPOSITE_TYPED_QUANTITY';
}
function typedQuantityCatalog(input:CanonicalTypedQuantityInputR1):string{
 return ordinaryTypedQuantityInput(input)?input.catalogId:input.config.catalogId;
}
function assertOrdinaryTypedQuantityPlan(input:CanonicalOrdinaryCompositeTypedQuantityInputR1,plan:CanonicalDefinitionPublishPlan):MasterResolvedScopedNormativeRegistryR1{
 const declared=input.scopedRegistry;
 const scope=resolveMasterScopedNormativeRegistryOptInR1(declared.input);
 invariant(scope!=null&&scope.expectedSourceJson===declared.expectedSourceJson&&scope.expectedLocatorsJson===declared.expectedLocatorsJson
  &&JSON.stringify(stable(scope.declaration))===JSON.stringify(stable(declared.declaration)),
  'TYPED_QUANTITY_ORDINARY_SCOPED_DECLARATION_DRIFT');
 const config=scope.input.config,binding=config.binding;
 invariant(config.catalogAppend==null&&binding?.retainParentBindings==null&&binding?.reuseExistingNormativeRegistry==null
  &&binding?.ordinaryCompositeSourceV1!=null&&scope.input.newSource.metadata?.sourceKind==='PROJECT_SYSTEM'
  &&scope.input.newLocators.length===1,'TYPED_QUANTITY_ORDINARY_COMPOSITE_SCOPE');
 const ids=input.bindingRowIds;
 invariant(Array.isArray(ids)&&ids.length===plan.resources.length&&new Set(ids).size===ids.length
  &&plan.resources.every(row=>ids.includes(row.row_id)),'TYPED_QUANTITY_ORDINARY_EXACT_RESOURCE_BINDINGS');
 const basis=plan.passport.decision.partialQuantityBasis;
 invariant(basis?.kind==='DEFERRED_PROJECT_QUANTITIES','TYPED_QUANTITY_ORDINARY_DEFERRED_ONLY');
 assertMasterTypedPartialQuantityRegistryR1(basis,{newSources:[scope.input.newSource],newLocators:scope.input.newLocators});
 return scope;
}

/** A retained successor may register its absent managed source in the current
 * transaction. Its capture, exact new-row coverage and REGISTERED raw reads
 * remain mandatory; it cannot impersonate registry reuse or rebind old rows. */
export function assertRetainedManagedTypedQuantityPlanR1(
  input:MasterRetainedBindingGuardInputR1,plan:CanonicalDefinitionPublishPlan,
):MasterResolvedScopedNormativeRegistryR1{
  const retained=masterRetainParentBindingsOptInR1(input);
  invariant(retained!=null&&input.config.catalogAppend==null&&input.config.projectSourcePackagePath==null
    &&input.config.binding.reuseExistingNormativeRegistry==null
    &&!Object.hasOwn(input.config.binding,'ordinaryCompositeSourceV1')
    &&retained.capturedSourcePreimage?.expected===null
    &&retained.capturedSourcePreimage.sourceKey===input.newSource.source_key
    &&input.newSource.metadata?.sourceKind==='PROJECT_SYSTEM',
    'TYPED_QUANTITY_RETAINED_MANAGED_SCOPE');
  const scope=resolveMasterScopedNormativeRegistryOptInR1({...input,
    config:{...input.config,normId:(input.config as CanonicalPublisherJson).normId}} as Parameters<typeof resolveMasterScopedNormativeRegistryOptInR1>[0]);
  invariant(scope!=null,'TYPED_QUANTITY_RETAINED_MANAGED_FRESH_SCOPED_PREIMAGE_REQUIRED');
  const oldRows=new Set(retained.capturedParent.resources.map(row=>row.row_id));
  const added=plan.resources.filter(row=>!oldRows.has(row.row_id));
  const locatorIds=new Set(input.newLocators.map(locator=>locator.id));
  const managed=plan.bindings.filter(binding=>locatorIds.has(binding.locator_id));
  invariant(added.length>0&&managed.length===added.length
    &&new Set(added.map(row=>row.id)).size===added.length
    &&new Set(managed.map(binding=>binding.resource_spec_id)).size===managed.length
    &&added.every(row=>managed.some(binding=>binding.resource_spec_id===row.id))
    &&managed.every(binding=>added.some(row=>row.id===binding.resource_spec_id)),
    'TYPED_QUANTITY_RETAINED_MANAGED_EXACT_NEW_RESOURCE_BINDINGS');
  const basis=plan.passport.decision.partialQuantityBasis;
  invariant(basis?.kind==='DEFERRED_PROJECT_QUANTITIES','TYPED_QUANTITY_RETAINED_MANAGED_DEFERRED_ONLY');
  assertMasterTypedPartialQuantityRegistryR1(basis,{newSources:[input.newSource],newLocators:input.newLocators});
  return scope;
}

/** Exact pure parameter payload boundary used by the publisher below.
 * Passing this check grants no operation/source/SQL admission. */
export function assertCanonicalPublisherParameterPayloadR1(plan: CanonicalDefinitionPublishPlan): void {
  const prefix = `STOP_CANONICAL_PUBLISHER_PAYLOAD:${plan.definition.catalog_id}`;
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
}

export async function preflightCanonicalDefinitionPublishPlans(
  client: Client,
  plans: readonly CanonicalDefinitionPublishPlan[],
  retainedLegacyInputs: readonly MasterRetainedBindingGuardInputR1[] = [],
  typedQuantityInputs: readonly CanonicalTypedQuantityInputR1[] = [],
) {
  invariant(plans.length > 0, "STOP_CANONICAL_PUBLISHER_EMPTY_PLAN");
  invariant(Array.isArray(retainedLegacyInputs)
    &&new Set(retainedLegacyInputs.map(input=>input.config.catalogId)).size===retainedLegacyInputs.length
    &&retainedLegacyInputs.every(input=>plans.some(plan=>plan.definition.catalog_id===input.config.catalogId)),
    "STOP_CANONICAL_PUBLISHER_LEGACY_ASSUMPTION_SCOPE");
  invariant(Array.isArray(typedQuantityInputs)
    &&new Set(typedQuantityInputs.map(typedQuantityCatalog)).size===typedQuantityInputs.length
    &&typedQuantityInputs.every(input=>plans.some(plan=>plan.definition.catalog_id===typedQuantityCatalog(input)
      &&hasMasterTypedPartialQuantityBasisR1(plan.passport))),"STOP_CANONICAL_PUBLISHER_TYPED_QUANTITY_SCOPE");
  // Collect all independent pure quantity errors before the first schema query.
  const quantityErrors=plans.flatMap(plan=>hasMasterTypedPartialQuantityBasisR1(plan.passport)
    ?validateMasterTypedPartialQuantityBasisR1(plan).map(error=>`${plan.definition.catalog_id}:${error}`):[]);
  // Pure quantity and source-scope errors keep their established priority.
  // They must be collected before any schema or registered-source read.
  const typedPlans=plans.filter(plan=>hasMasterTypedPartialQuantityBasisR1(plan.passport));
  for(const plan of typedPlans){
    const input=typedQuantityInputs.find(input=>typedQuantityCatalog(input)===plan.definition.catalog_id);
    if(input&&ordinaryTypedQuantityInput(input)){
      try{assertOrdinaryTypedQuantityPlan(input,plan);}catch(error){quantityErrors.push(`${plan.definition.catalog_id}:${String((error as Error).message)}`);}
    }else{
      const registered=input&&!ordinaryTypedQuantityInput(input)?input.config.binding.reuseExistingNormativeRegistry:undefined;
      if(!registered){
        if(input&&!ordinaryTypedQuantityInput(input)&&Object.hasOwn(input.config.binding,'retainParentBindings')){
          try{assertRetainedManagedTypedQuantityPlanR1(input,plan);}catch(error){quantityErrors.push(`${plan.definition.catalog_id}:${String((error as Error).message)}`);}
        }else quantityErrors.push(`${plan.definition.catalog_id}:TYPED_QUANTITY_REGISTERED_SOURCE_REQUIRED`);
      }
    }
  }
  invariant(quantityErrors.length===0,`STOP_CANONICAL_PUBLISHER_TYPED_QUANTITY:${quantityErrors.join(',')}`);
  for (const plan of plans) automaticPriceInheritanceExcludedResourceIds(plan);
  // Admission follows existing pure guards, and still precedes all DB reads.
  for(const plan of plans)assertCanonicalPublisherSuccessorOperationResourcesR1({catalogId:plan.definition.catalog_id,
    resourceDefinitions:plan.resources,parameterDefinitions:plan.parameters,independentComposition:plan.passport?.decision?.independentCompletenessMap,definitionPassport:plan.definition.passport});
  for(const plan of typedPlans){
    const input=typedQuantityInputs.find(input=>typedQuantityCatalog(input)===plan.definition.catalog_id)!;
    try{
      // Same complete registered source/locator preimage guard, without DML.
      if(ordinaryTypedQuantityInput(input)){
        // Authoritative raw PG managed-text comparison must succeed BEFORE a
        // planned object can witness the registered basis; hashes alone grant nothing.
        const scope=assertOrdinaryTypedQuantityPlan(input,plan);
        await readMasterScopedNormativeRegistryPreconditionsR1(client,scope,'REGISTERED');
      }else{
        if(input.config.binding.reuseExistingNormativeRegistry==null){
          const scope=assertRetainedManagedTypedQuantityPlanR1(input,plan);
          await readMasterScopedNormativeRegistryPreconditionsR1(client,scope,'REGISTERED');
        }
        const registered=await readMasterRetainedBindingPreconditionsR1(client,input,"REGISTERED");
        assertMasterTypedPartialQuantityRegistryR1(plan.passport.decision.partialQuantityBasis,registered);
      }
    }catch(error){quantityErrors.push(`${plan.definition.catalog_id}:${String((error as Error).message)}`);}
  }
  invariant(quantityErrors.length===0,`STOP_CANONICAL_PUBLISHER_TYPED_QUANTITY:${quantityErrors.join(',')}`);
  const schema = await preflightCanonicalDefinitionPublisherSchema(client);
  const auditedPlans: CanonicalPublisherJson[] = [];
  for (const plan of plans) {
    const prefix = `STOP_CANONICAL_PUBLISHER_PAYLOAD:${plan.definition.catalog_id}`;
    assertCanonicalPublisherResourceOrdinalsUniqueR1(plan.resources);
    invariant(plan.contract.trim().length > 0, `${prefix}:CONTRACT`);
    invariant(plan.definition.definition_version > 0, `${prefix}:DEFINITION_VERSION`);
    assertSha256(plan.definition.definition_sha256, `${prefix}:DEFINITION_SHA256`);
    invariant(isObject(plan.definition.passport), `${prefix}:PASSPORT_NOT_OBJECT`);
    invariant(isObject(plan.definition.applicability), `${prefix}:APPLICABILITY_NOT_OBJECT`);
    invariant(isObject(plan.definition.source_metadata), `${prefix}:SOURCE_METADATA_NOT_OBJECT`);
    invariant(plan.definition.content_status === "QUARANTINED"
      && plan.definition.content_gate_status === "RED", `${prefix}:INITIAL_LIFECYCLE`);

    if (plan.baseline.supersedes_baseline_id != null) {
      const parent = (await client.query(`select baseline.id,baseline.catalog_id,
          baseline.definition_version_id,
          (select count(*)::int from public.estimate_approved_template_baseline child
            where child.supersedes_baseline_id=baseline.id) direct_successor_count
        from public.estimate_approved_template_baseline baseline where baseline.id=$1`, [
        plan.baseline.supersedes_baseline_id,
      ])).rows[0] as CanonicalPublisherJson | undefined;
      invariant(parent, `${prefix}:BASELINE_PARENT_MISSING:${plan.baseline.supersedes_baseline_id}`);
      invariant(parent.catalog_id === plan.definition.catalog_id,
        `${prefix}:BASELINE_PARENT_CATALOG:${parent.catalog_id}`);
      invariant(parent.definition_version_id === plan.baseline.source_definition_version_id,
        `${prefix}:BASELINE_SOURCE_DEFINITION:${parent.definition_version_id}`);
      invariant(Number(parent.direct_successor_count) === 0,
        `${prefix}:BASELINE_PARENT_ALREADY_HAS_SUCCESSOR:${plan.baseline.supersedes_baseline_id}`);
    }

    invariant(plan.parameters.length === plan.passport.parameter_count, `${prefix}:PARAMETER_COUNT`);
    invariant(plan.formulas.length === plan.passport.formula_count, `${prefix}:FORMULA_COUNT`);
    invariant(plan.resources.length === plan.passport.resource_count, `${prefix}:RESOURCE_COUNT`);
    invariant(new Set(plan.parameters.map((row) => row.parameter_id)).size === plan.parameters.length,
      `${prefix}:PARAMETER_DUPLICATE`);
    invariant(new Set(plan.formulas.map((row) => row.formula_id)).size === plan.formulas.length,
      `${prefix}:FORMULA_DUPLICATE`);
    invariant(new Set(plan.resources.map((row) => row.row_id)).size === plan.resources.length,
      `${prefix}:RESOURCE_DUPLICATE`);

    assertCanonicalPublisherParameterPayloadR1(plan);
    await preflightCanonicalParameterTruthMetadata(client, plan.parameters, prefix);

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

    const expectedSourceKeys = await canonicalPublisherRequiredBindingSourceKeysR1(client,plan,
      retainedLegacyInputs.find(input=>input.config.catalogId===plan.definition.catalog_id));
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
    invariant(canonicalPublisherQuantityScopeIsConsistent(plan), `${prefix}:PASSPORT_QUANTITY_SCOPE`);
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

/** Explicit target policy only: neither a title nor a source-side flag opts out.
 * Validate before the first write, and never mutate an existing route or plan. */
function automaticPriceInheritanceExcludedResourceIds(
  plan: CanonicalDefinitionPublishPlan,
): string[] {
  const excluded = plan.resources.filter((resource) => !automaticGenericPriceInheritanceAllowed(resource));
  if (excluded.length === 0) return [];

  const idCounts = new Map<string, number>();
  for (const resource of plan.resources) {
    if (typeof resource.id === "string") {
      const id = resource.id.toLowerCase();
      idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    }
  }
  return excluded.map((resource) => {
    invariant(typeof resource.id === "string"
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(resource.id),
    "STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_EXCLUDED_RESOURCE_ID");
    invariant(resource.definition_version_id === plan.definition.id,
      "STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_TARGET_DEFINITION");
    const id = resource.id.toLowerCase();
    invariant(idCounts.get(id) === 1,
      "STOP_CANONICAL_PUBLISHER_PRICE_INHERITANCE_DUPLICATE_RESOURCE_ID");
    return id;
  }).sort(compareUtf8C);
}

async function inheritCompatiblePriceRouteBindings(
  client: Client,
  plan: CanonicalDefinitionPublishPlan,
  excludedResourceIds: readonly string[],
): Promise<number> {
  // The empty branch emits the historical SQL bytes and exactly two values.
  const targetResourceFilter = excludedResourceIds.length === 0 ? ""
    : "\n      and target.id <> all($3::uuid[])";
  const values: unknown[] = [plan.baseline.source_definition_version_id, plan.definition.id];
  if (excludedResourceIds.length > 0) values.push(excludedResourceIds);
  const inherited = await client.query(`insert into public.estimate_resource_price_route_binding(
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
    where target.definition_version_id=$2${targetResourceFilter}
      and coalesce(nullif(trim(source.cost_owner_id),''),source_binding.price_key)
        =coalesce(nullif(trim(target.cost_owner_id),''),target.row_id)
    order by target.id,source_binding.route_id,source_binding.priority,source.id
    on conflict(resource_spec_id,route_id) do nothing
    returning resource_spec_id`, values);
  return inherited.rowCount ?? 0;
}

export async function publishCanonicalDefinitionDraft(
  client: Client,
  plan: CanonicalDefinitionPublishPlan,
) {
  // Preserve retired-catalog and pure price-policy error priority for old callers.
  assertCanonicalNewWorkCatalogIdV1(plan.definition.catalog_id);
  const excludedPriceInheritanceResourceIds = automaticPriceInheritanceExcludedResourceIds(plan);
  // Every admissible write repeats composition admission before the first INSERT.
  assertCanonicalPublisherSuccessorOperationResourcesR1({catalogId:plan.definition.catalog_id,
    resourceDefinitions:plan.resources,parameterDefinitions:plan.parameters,independentComposition:plan.passport?.decision?.independentCompletenessMap,definitionPassport:plan.definition.passport});
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
    parameter.unit_id, parameter.title_ru, parameter.required, null,
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
  const inheritedCompatiblePriceBindingCount = await inheritCompatiblePriceRouteBindings(
    client,
    plan,
    excludedPriceInheritanceResourceIds,
  );
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
  // R54 validates defaults against the already persisted baseline. Keep this
  // forward draft in one transaction and bind values only after its insertion.
  await client.query(`update public.estimate_parameter_definition p
    set approved_template_baseline_id=$2,default_value=x.value
    from jsonb_to_recordset($3::jsonb) x(parameter_id text,value jsonb)
    where p.definition_version_id=$1 and p.parameter_id=x.parameter_id`, [
    plan.definition.id,
    plan.baseline.id,
    jsonb(plan.parameters.map(p=>({parameter_id:p.parameter_id,value:p.default_value})), "STOP_CANONICAL_PUBLISHER_WRITE_PARAMETER_DEFAULTS", "array"),
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
  return {
    ...await auditPersistedCanonicalDefinition(client, plan),
    inheritedCompatiblePriceBindingCount,
  };
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
    where definition_version_id=$1 order by formula_id collate "C"`, [plan.definition.id]))
    .rows as CanonicalPublisherJson[];
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
  const priceBindings = (await client.query(`select price_binding.resource_spec_id,
      price_binding.route_id,price_binding.price_key,price_binding.priority
    from public.estimate_resource_price_route_binding price_binding
    join public.estimate_resource_spec resource on resource.id=price_binding.resource_spec_id
    where resource.definition_version_id=$1
    order by resource.ordinal,price_binding.priority,price_binding.route_id`, [
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
  const mismatchedSections = Object.keys(expectedPayload).filter((section) =>
    sha256(persistedPayload[section as keyof typeof persistedPayload])
      !== sha256(expectedPayload[section as keyof typeof expectedPayload]));
  invariant(persistedSha256 === expectedSha256,
    `STOP_CANONICAL_PUBLISHER_SELF_AUDIT_PAYLOAD:${plan.definition.catalog_id}:${mismatchedSections.join(",")}:${persistedSha256}:${expectedSha256}`);

  const decision = selected(passport.decision, [
    "contract", "status", "allowed", "quantityScope", "priceState",
    "activationAllowed", "productionEligible", "waveContract",
    "technicalScopeStatus", "preliminaryCompositionOnly", "unresolvedResourceRowIds",
    "partialQuantityBasis", "engineeringAcceptance",
  ]);
  invariant(decision.contract === CONTENT_PASSPORT_CONTRACT
    && decision.status === "GREEN"
    && decision.allowed === true
    && canonicalPublisherQuantityScopeIsConsistent(persistedPayload)
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
    compatiblePriceBindingCount: priceBindings.length,
    payloadSha256: persistedSha256,
    decision,
  };
}
