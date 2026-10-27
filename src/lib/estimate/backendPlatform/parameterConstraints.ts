import { evaluateInclusionGraph, inclusionGraphEvidenceParameterIds } from "./inclusionGraph";
import { NUMERIC_PARAMETER_RELATIONS } from "./numericParameterRelations";
import { compareFormulaGraphDecimals, isFormulaGraphExactDecimal, isFormulaGraphDecimalMultiple } from './formulaGraph';
import { canonicalScopeRequirementDecisionV1, type CanonicalFactorySupplyObligationV1 } from './canonicalScopeRequirementV1';

export type CanonicalParameterDefinitionRecord = {
  parameter_id?: unknown;
  unit_id?: unknown;
  value_type?: unknown;
  required?: unknown;
  default_value?: unknown;
  constraints_json?: unknown;
  truth_metadata?: unknown;
  approved_template_baseline_id?: unknown;
};

type JsonRecord = Record<string, unknown>;

export type CanonicalParameterResolutionOptions = {
  confirmedParameters?: JsonRecord;
  /** Compiler-owned IDs from the verified effective-quantity plan, never request metadata. */
  deferredEffectiveQuantityParameterIds?: ReadonlySet<string>;
  baselineContext?: {
    catalogId: string;
  };
};

export class CanonicalParameterValidationError extends Error {
  readonly code = "PARAMETER_VALIDATION_FAILED" as const;

  constructor(message: string) {
    super(message);
    this.name = "CanonicalParameterValidationError";
  }
}

function fail(message: string): never {
  throw new CanonicalParameterValidationError(message);
}

function conditionMatches(raw: unknown, values: JsonRecord): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const condition = raw as JsonRecord;
  if (typeof condition.kind === "string" && condition.kind.trim()) {
    try {
      return evaluateInclusionGraph(condition, values);
    } catch {
      return fail("invalid conditional parameter constraint");
    }
  }
  const parameterId = String(condition.parameterId ?? "");
  if (!parameterId || !Object.prototype.hasOwnProperty.call(condition, "equals")) return false;
  return values[parameterId] === condition.equals;
}

function finiteNumber(value: unknown, field: string): number {
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(String(value)) || !Number.isFinite(Number(value))) {
    return fail(`invalid number ${field}`);
  }
  return Number(value);
}

function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

const INTERNAL_SOURCE_PARAMETER_ROLES = new Set([
  'PROJECT_DOCUMENTATION', 'ENGINEERING_DESIGN', 'SITE_SURVEY',
  'MANDATORY_NORM_VALUE', 'MANUFACTURER_CONFIRMED', 'SELECTED_EQUIPMENT_PASSPORT',
  'SOURCE_BACKED_PRELIMINARY_PROFILE', 'NORM_REQUIRED_BUT_PROJECT_SELECTED', 'BACKEND_DERIVED',
]);

/** A classification label alone is not a formula producer. Keep this narrow
 * wire predicate tied to the existing preliminary source contract; the normal
 * formula resolver still validates expressions, dependencies and branches. */
function hasCanonicalPreliminarySourceFormulaProducerV1(
  definition: CanonicalParameterDefinitionRecord, truth: JsonRecord,
): boolean {
  const producer = truth.preliminary_value_formula_v1;
  const guide = truth.guide;
  if (truth.value_source_role !== 'VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE'
    || truth.runtime_profile_classification !== 'PRELIMINARY_SOURCE_FORMULA'
    || !['decimal', 'integer'].includes(String(definition.value_type))
    || definition.default_value != null || !isRecord(producer) || !isRecord(guide)
    || producer.version !== 'canonical-preliminary-parameter-formula:v1'
    || typeof guide.source_document !== 'string' || !guide.source_document.trim()
    || typeof guide.source_locator !== 'string' || !guide.source_locator.trim()
    || !/^[a-f0-9]{64}$/iu.test(String(guide.source_snapshot_hash ?? ''))) return false;
  const branched = Object.hasOwn(producer, 'branches');
  if (Object.keys(producer).some(key => !(branched ? ['version', 'branches']
    : ['version', 'expression', 'when', 'explicitValuePolicy']).includes(key))) return false;
  const branches = branched ? producer.branches : [producer];
  return Array.isArray(branches) && branches.length > 0 && branches.every(branch => isRecord(branch)
    && (!branched || Object.keys(branch).every(key => ['expression', 'when', 'explicitValuePolicy'].includes(key)))
    && typeof branch.expression === 'string' && !!branch.expression.trim() && isRecord(branch.when)
    && (branch.explicitValuePolicy == null || branch.explicitValuePolicy === 'REQUIRE_MATCH'));
}

/** Apply only to the untrusted submitted channel, before merging server facts.
 * Visibility alone does not change a legacy project's input authority. The
 * immutable passport must also assign the fact to the application and source.
 * Unresolved norms and compiler-derived values retain their own stricter rules.
 */
export function assertCanonicalSubmittedSourceParameterAuthorityV1(
  definitions: readonly CanonicalParameterDefinitionRecord[], input: JsonRecord,
): void {
  if (!isRecord(input)) return fail('parameters must be an object');
  for (const definition of definitions) {
    const truth = isRecord(definition.truth_metadata) ? definition.truth_metadata : {};
    const provenance = isRecord(truth.provenance) ? truth.provenance : {};
    if (truth.visibility_role !== 'INTERNAL_ONLY'
      || provenance.consumer_input_role_v1 !== 'APPLICATION_TECHNICAL'
      || (!INTERNAL_SOURCE_PARAMETER_ROLES.has(String(truth.value_source_role))
        && !hasCanonicalPreliminarySourceFormulaProducerV1(definition, truth))) continue;
    const id = String(definition.parameter_id);
    if (Object.hasOwn(input, id)) return fail(`source-managed parameter cannot be submitted ${id}`);
  }
}

function definitionAllowsPreliminaryCompilation(
  _definition: CanonicalParameterDefinitionRecord,
): boolean {
  // Missing values are an explicit preliminary state for every catalogue
  // definition. The compiler converts affected rows to preliminary needs;
  // provided-but-invalid values and contradictory conditions are still errors.
  // A legacy `preliminary_compilation_allowed: false` remains provenance for
  // exact acceptance and must not block creation of the first estimate.
  return true;
}

/** Numeric compatibility remains a row dependency even when quantity is manual. */
export function canonicalNumericRelationDependencies(
  definitions: readonly CanonicalParameterDefinitionRecord[],
): ReadonlyMap<string, readonly string[]> {
  const byId = new Map(definitions.map(definition => [String(definition.parameter_id ?? ""), definition]));
  const dependencies = new Map<string, string[]>();
  for (const definition of definitions) {
    if (definition.value_type !== "decimal" && definition.value_type !== "integer") continue;
    const id = String(definition.parameter_id);
    const constraints = isRecord(definition.constraints_json) ? definition.constraints_json : {};
    for (const [rule] of NUMERIC_PARAMETER_RELATIONS) {
      const peerId = constraints[rule];
      if (peerId == null) continue;
      const peer = typeof peerId === "string" ? byId.get(peerId) : undefined;
      if (!peer || (peer.value_type !== "decimal" && peer.value_type !== "integer")) {
        return fail(`invalid numeric peer ${id}.${rule}=${String(peerId)}`);
      }
      const peers = dependencies.get(id) ?? [];
      peers.push(String(peerId));
      dependencies.set(id, peers);
    }
  }
  return dependencies;
}

export function missingCanonicalNumericRelationParameterIds(
  dependencies: ReadonlyMap<string, readonly string[]>,
  consumedParameterIds: readonly string[],
  parameters: JsonRecord,
): string[] {
  const pending = consumedParameterIds.filter(id => dependencies.has(id));
  const visited = new Set<string>();
  const missing: string[] = [];
  while (pending.length) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    if (parameters[id] == null || parameters[id] === "") missing.push(id);
    pending.push(...dependencies.get(id) ?? []);
  }
  return missing.sort();
}

function acceptedBaselineDefault(
  definition: CanonicalParameterDefinitionRecord,
  parameterId: string,
  context: CanonicalParameterResolutionOptions["baselineContext"],
): unknown {
  const value = definition.default_value;
  if (value == null) return value;
  if (!isRecord(definition.truth_metadata) || Object.keys(definition.truth_metadata).length === 0) {
    // Historical releases predate the truth contract. They remain readable,
    // but this branch never labels them as an R5.3 accepted baseline.
    return value;
  }
  const truth = definition.truth_metadata;
  const provenance = truth.provenance;
  const formulaConsumers = truth.formula_consumers;
  const resourceConsumers = truth.resource_branch_consumers;
  if (!context?.catalogId
    || truth.value_source_role !== "VISIBLE_BASELINE_ASSUMPTION"
    || typeof truth.baseline_assumption_id !== "string"
    || !truth.baseline_assumption_id
    || !isRecord(provenance)
    || provenance.sourceCatalogId !== context.catalogId
    || !Array.isArray(formulaConsumers)
    || !Array.isArray(resourceConsumers)
    || resourceConsumers.length === 0) {
    return fail(`invalid accepted baseline provenance ${parameterId}`);
  }
  const valueFingerprint = JSON.stringify(value);
  if (provenance.baselineOwner === "approved-template-baseline:r54") {
    const baselineId = definition.approved_template_baseline_id;
    const binding = provenance.approvedTemplateBinding;
    const classification = isRecord(binding) ? binding.inputClassification : null;
    const bindingFormulaConsumers = isRecord(binding) ? binding.formulaConsumerIds : null;
    const bindingResourceConsumers = isRecord(binding) ? binding.resourceConsumerRowIds : null;
    const normativeSourceIds = isRecord(binding) ? binding.normativeSourceIds : null;
    if (typeof baselineId !== "string"
      || !baselineId
      || provenance.approvedTemplateBaselineId !== baselineId
      || typeof provenance.acceptanceEvidenceSha256 !== "string"
      || !/^[0-9a-f]{64}$/.test(provenance.acceptanceEvidenceSha256)
      || !isRecord(binding)
      || binding.baselineId !== baselineId
      || binding.catalogId !== context.catalogId
      || binding.parameterId !== parameterId
      || binding.definitionVersionId !== provenance.sourceDefinitionVersionId
      || binding.parameterSchemaSha256 !== provenance.sourceParameterSchemaId
      || binding.acceptanceEvidenceSha256 !== provenance.acceptanceEvidenceSha256
      || !["ASSUMPTION", "NORMATIVE", "DERIVED"].includes(String(classification))
      || !Array.isArray(bindingFormulaConsumers)
      || !bindingFormulaConsumers.every((formulaId) => formulaConsumers.includes(formulaId))
      || !formulaConsumers.every((formulaId) => bindingFormulaConsumers.includes(formulaId))
      || !Array.isArray(bindingResourceConsumers)
      || bindingResourceConsumers.length === 0
      || !bindingResourceConsumers.every((rowId) => resourceConsumers.includes(rowId))
      || !resourceConsumers.every((rowId) => bindingResourceConsumers.includes(rowId))
      || !Array.isArray(normativeSourceIds)
      || (classification === "NORMATIVE" && normativeSourceIds.length === 0)
      || JSON.stringify(binding.value) !== valueFingerprint) {
      return fail(`invalid approved template baseline binding ${parameterId}`);
    }
    return value;
  }
  if (provenance.baselineOwner !== "accepted-batch-formula-graph-v3-baseline:r53"
    || !Array.isArray(provenance.acceptedTraceBindings)
    || provenance.acceptedTraceBindings.length === 0) {
    return fail(`invalid accepted baseline provenance ${parameterId}`);
  }
  for (const rawBinding of provenance.acceptedTraceBindings) {
    if (!isRecord(rawBinding)
      || rawBinding.catalogId !== context.catalogId
      || rawBinding.parameterId !== parameterId
      || rawBinding.releaseId !== provenance.sourceReleaseId
      || rawBinding.definitionVersionId !== provenance.sourceDefinitionVersionId
      || rawBinding.definitionVersion !== provenance.sourceDefinitionVersion
      || rawBinding.parameterSchemaId !== provenance.sourceParameterSchemaId
      || rawBinding.parameterSchemaVersion !== provenance.sourceParameterSchemaVersion
      || typeof rawBinding.traceId !== "string"
      || !rawBinding.traceId
      || typeof rawBinding.formulaId !== "string"
      || !formulaConsumers.includes(rawBinding.formulaId)
      || typeof rawBinding.resourceRowId !== "string"
      || !resourceConsumers.includes(rawBinding.resourceRowId)
      || !Array.isArray(rawBinding.normativeSourceIds)
      || rawBinding.normativeSourceIds.length === 0
      || typeof rawBinding.acceptedBatch !== "string"
      || !/^BATCH00[1-8]$/u.test(rawBinding.acceptedBatch)
      || JSON.stringify(rawBinding.value) !== valueFingerprint) {
      return fail(`invalid accepted baseline binding ${parameterId}`);
    }
  }
  return value;
}


type CanonicalWholeIntegerFinalContextV1 = {
  effectiveOwners: ReadonlyMap<string,string>;
  resources: readonly {row_id:string;unit_id:string;formula_id:string;cost_owner_id:string|null;
    procurement_eligible:boolean;inclusion_ast:JsonRecord;resource_graph:JsonRecord;source_metadata:JsonRecord|null}[];
  formulaInputs: ReadonlyMap<string,readonly string[]>;
  acceptedRows: readonly JsonRecord[];
  /** Existing backend admission owner, bound to this compile's actual resolver output. Never request evidence. */
  sourceTraceAdmitted: (rowId:string,trace:Readonly<JsonRecord>)=>boolean;
};

/** ce148's single conditional-domain seam. Input validation defers only verified
 * internal outputs. Its one final call reads accepted rows after manual edits;
 * it neither rounds nor repairs raw quantities or historic approvals. */
export function validateCanonicalConditionalWholeIntegerV1(
  definitions: readonly CanonicalParameterDefinitionRecord[], values: Readonly<JsonRecord>,
  options: {deferredEffectiveQuantityParameterIds?:ReadonlySet<string>;finalContext?:CanonicalWholeIntegerFinalContextV1} = {},
): Map<string,CanonicalFactorySupplyObligationV1[]> {
  const declarations = definitions.filter(d=>isRecord(d.constraints_json) && Object.hasOwn(d.constraints_json,'conditionalWholeIntegerV1'));
  const obligations = new Map<string,CanonicalFactorySupplyObligationV1[]>();
  if (declarations.length===0) return obligations;
  const byId = new Map(definitions.map(d=>[String(d.parameter_id ?? ''),d]));
  const final = options.finalContext;
  const resources = new Map(final?.resources.map(r=>[r.row_id,r]));
  const accepted = new Map(final?.acceptedRows.map(r=>[String(r.row_id),r]));
  const claimedComponents = new Set<string>();
  const bindingFail = (id:string):never => {throw Object.assign(new Error(`conditional factory supply binding invalid ${id}`),
    {code:'DEFINITION_INTEGRITY_FAILED'});};
  const boundedId = (value:unknown):value is string => typeof value==='string' && value.trim().length>0 && value.length<=4000;
  for (const definition of declarations) {
    const constraints = isRecord(definition.constraints_json) ? definition.constraints_json : {};
    if (!Object.hasOwn(constraints,'conditionalWholeIntegerV1')) continue;
    const id = String(definition.parameter_id ?? ''), raw = constraints.conditionalWholeIntegerV1;
    if (!id || !['decimal','integer'].includes(String(definition.value_type)) || definition.default_value != null
      || !isRecord(raw) || Object.keys(raw).some(key=>!['contractVersion','when','factorySupplyV1'].includes(key))
      || raw.contractVersion!=='canonical-conditional-whole-integer/v1' || !isRecord(raw.when))
      return fail(`invalid conditional whole-integer declaration ${id}`);
    const when = raw.when;
    const targets = when.kind==='equals' ? [when.value] : when.values;
    if (!['equals','in'].includes(String(when.kind))
      || Object.keys(when).some(key=>!(when.kind==='equals'?['kind','parameterId','value']:['kind','parameterId','values']).includes(key))
      || !boundedId(when.parameterId) || when.parameterId===id || !Array.isArray(targets)
      || targets.length!==(when.kind==='equals'?1:2) || targets.some(value=>!boundedId(value))
      || new Set(targets).size!==targets.length) return fail(`invalid conditional whole-integer declaration ${id}`);
    const selector = byId.get(when.parameterId);
    const choices = isRecord(selector?.constraints_json) ? selector.constraints_json.values : undefined;
    if (!selector || selector.value_type!=='enum' || selector.default_value!=null || !Array.isArray(choices)
      || choices.length===0 || choices.some(value=>!boundedId(value)) || new Set(choices).size!==choices.length
      || targets.some(value=>!choices.includes(value))) return fail(`invalid conditional whole-integer selector definition ${id}`);
    const rawUnknown = isRecord(selector.truth_metadata) ? selector.truth_metadata.unknown_enum_values : undefined;
    const unknownChoices = Array.isArray(rawUnknown) ? rawUnknown : [];
    if (rawUnknown!=null && (!Array.isArray(rawUnknown) || unknownChoices.length>8
      || unknownChoices.some(value=>!boundedId(value)||!choices.includes(value)))
      || targets.some(value=>unknownChoices.includes(value))) return fail(`invalid conditional whole-integer selector definition ${id}`);
    const selected = values[when.parameterId];
    if (selected==null || selected==='' || unknownChoices.includes(selected))
      return fail(`conditional whole-integer condition unresolved ${id}`);
    if (!choices.includes(selected)) return fail(`conditional whole-integer selector invalid ${id}`);
    const active = targets.includes(selected);
    const deferred = options.deferredEffectiveQuantityParameterIds?.has(id)===true;
    const value = values[id];
    const effectiveOwner = final?.effectiveOwners.get(id);
    if (active && !deferred) {
      // An unresolved verified effective owner remains an honest need. Ordinary
      // submitted domain values still require a value as in the original ce148.
      if (value==null || value==='') {
        if (!final || !effectiveOwner) return fail(`conditional whole-integer value required ${id}`);
      } else if ((typeof value!=='string' && typeof value!=='number') || !isFormulaGraphExactDecimal(value)
        || !isFormulaGraphDecimalMultiple(value,'1')) return fail(`conditional whole-integer value invalid ${id}`);
    }
    if (!Object.hasOwn(raw,'factorySupplyV1')) continue;
    const descriptor = raw.factorySupplyV1;
    if (!isRecord(descriptor) || Object.keys(descriptor).some(key=>!['componentRowId','obligationOwnerRowId','sourceArtifactSha256','sourceCountPerFactoryUnit'].includes(key))
      || !boundedId(descriptor.componentRowId) || !boundedId(descriptor.obligationOwnerRowId)
      || descriptor.componentRowId===descriptor.obligationOwnerRowId
      || typeof descriptor.sourceArtifactSha256!=='string' || !/^[0-9a-f]{64}$/u.test(descriptor.sourceArtifactSha256)
      || descriptor.sourceCountPerFactoryUnit!==1) return bindingFail(id);
    if (!final) {
      if (!deferred) return bindingFail(id);
      continue;
    }
    const owner = effectiveOwner ? resources.get(effectiveOwner) : undefined;
    const component = resources.get(descriptor.componentRowId), carrier = resources.get(descriptor.obligationOwnerRowId);
    const output = owner?.resource_graph.effectiveQuantityOutputV1;
    const source = component?.source_metadata, delivery = component?.resource_graph.sourceFactoryDeliveryV1;
    if (!owner || !component || !carrier || owner===component || owner===carrier
      || owner.resource_graph.costTreatment!=='OWN_COST' || owner.cost_owner_id!==owner.row_id
      || owner.unit_id!=='pcs' || component.unit_id!==owner.unit_id || definition.unit_id!==owner.unit_id
      || definition.required===true || !isRecord(definition.truth_metadata) || definition.truth_metadata.visibility_role!=='INTERNAL_ONLY'
      || !isRecord(output) || output.parameterId!==id || output.unitId!==owner.unit_id
      || component.resource_graph.costTreatment!=='INCLUDED_IN_RESOURCE_ROWS' || component.cost_owner_id!==owner.row_id
      || component.procurement_eligible!==false || component.resource_graph.parentCostOwnerId!==owner.row_id
      || component.resource_graph.includedInResourceOwnerRowId!==owner.row_id || component.resource_graph.purchaseBalanceOwnerRowId!==owner.row_id
      || !final.formulaInputs.get(component.formula_id)?.includes(id)
      || !inclusionGraphEvidenceParameterIds(component.inclusion_ast,{}).includes(when.parameterId)
      || !isRecord(delivery) || delivery.sourceCountPerFactoryUnit!==1 || delivery.orderQuantityOwnerRowId!==owner.row_id
      || delivery.notAnAdditionalOrder!==true || !boundedId(delivery.installedQuantityOwnerRowId)
      || !resources.has(delivery.installedQuantityOwnerRowId)
      || !source || source.sourceRole!=='MANUFACTURER_INCLUDED_FACTORY_COMPONENT_NOT_INSTALLATION_RATE'
      || !boundedId(source.sourceKey) || !boundedId(source.factoryDeliveryRegistryNormId) || !boundedId(source.sourceLocator)
      || source.source_artifact_sha256!==descriptor.sourceArtifactSha256 || source.sourceCountPerFactoryUnit!==1
      || carrier.resource_graph.costTreatment!=='INFORMATIONAL_SCOPE'
      || !isRecord(carrier.resource_graph.scopeRequirementV1) || carrier.resource_graph.scopeRequirementV1.kind!=='OBJECT_SCOPE'
      || claimedComponents.has(component.row_id)) return bindingFail(id);
    claimedComponents.add(component.row_id);
    if (!active) continue;
    const savedCarrier = accepted.get(carrier.row_id);
    const graph = savedCarrier && isRecord(savedCarrier.calculation_trace) && isRecord(savedCarrier.calculation_trace.resourceGraph)
      ? savedCarrier.calculation_trace.resourceGraph : null;
    const primary = canonicalScopeRequirementDecisionV1(graph?.scopeRequirementDecisionV1);
    if (!primary || primary.rowId!==carrier.row_id || primary.kind!=='OBJECT_SCOPE') return bindingFail(id);
    const ownerRow = accepted.get(owner.row_id), componentRow = accepted.get(component.row_id);
    const ownerQuantity = ownerRow?.quantity, componentQuantity = componentRow?.quantity;
    const known = (v:unknown):v is string|number => (typeof v==='string'||typeof v==='number') && isFormulaGraphExactDecimal(v)
      && compareFormulaGraphDecimals(v,'0')>=0;
    const bothKnown = known(ownerQuantity) && known(componentQuantity);
    const parity = known(ownerQuantity) && known(componentQuantity) ? compareFormulaGraphDecimals(componentQuantity,ownerQuantity) : null;
    // The existing immutable component trace, not three arbitrary strings,
    // must identify the very same source/norm/locator/artifact and be admitted
    // by the existing backend owner. Empty/unmapped/source-only trace is open.
    const traces = source.normativeTrace;
    const matchingTraces = Array.isArray(traces) && traces.length<=32 ? traces.filter((t):t is JsonRecord=>isRecord(t)
      && String(t.source_id ?? t.sourceId ?? t.document_code ?? '').trim()===source.sourceKey
      && String(t.norm_id ?? t.normId ?? '').trim()===source.factoryDeliveryRegistryNormId
      && String(t.exact_locator ?? t.exactLocator ?? '').trim()===source.sourceLocator
      && t.source_artifact_sha256===descriptor.sourceArtifactSha256) : [];
    const sourceIdentityVerified = source.sourceAdmission!==false && matchingTraces.length===1
      && final.sourceTraceAdmitted(component.row_id,matchingTraces[0]!);
    const complete = parity===0 && sourceIdentityVerified;
    const quantityReasonRu = !bothKnown ? 'Для проверки заводского состава нужны сохранённые количества исходной поставки и комплектующего.'
      : parity===-1 ? 'Количество включённого заводского комплектующего меньше количества исходной поставки.'
      : parity===1 ? 'Количество включённого заводского комплектующего не совпадает с подтверждённым составом поставки.'
      : 'Количество включённого заводского комплектующего соответствует исходной поставке.';
    const reasonRu = (sourceIdentityVerified ? '' : 'Связь заводского состава с допущенным нормативным источником не подтверждена. ')+quantityReasonRu;
    const children = obligations.get(carrier.row_id) ?? [];
    if (children.length>=8) return bindingFail(id);
    children.push({contractVersion:'canonical-scope-requirement-decision/v1',obligationKey:component.row_id,
      rowId:primary.rowId,groupId:primary.groupId,groupTitleRu:primary.groupTitleRu,titleRu:'Полнота заводского состава поставки',reasonRu,
      kind:'FACTORY_SUPPLY',status:complete?'COMPLETED':'SCOPE_UNVERIFIED',coveringRowIds:[],
      originalRowIds:[owner.row_id,component.row_id],missingObjectFactParameterIds:[],numericNormAccepted:false,separatePaymentAccepted:false});
    obligations.set(carrier.row_id,children);
  }
  return obligations;
}

export function validateCanonicalEstimateParameters(
  definitions: readonly CanonicalParameterDefinitionRecord[],
  input: JsonRecord,
  options: CanonicalParameterResolutionOptions = {},
): JsonRecord {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("parameters must be an object");
  const byId = new Map(definitions.map((definition) => [String(definition.parameter_id ?? ""), definition]));
  canonicalNumericRelationDependencies(definitions);
  const accepted = new Set(byId.keys());
  const confirmed = options.confirmedParameters ?? {};
  if (!isRecord(confirmed)) return fail("confirmed parameters must be an object");
  const unknownConfirmed = Object.keys(confirmed).filter((key) => !accepted.has(key));
  if (unknownConfirmed.length) return fail(`unknown confirmed estimate parameters: ${unknownConfirmed.slice(0, 10).join(",")}`);
  const values = { ...confirmed, ...input };
  const unknown = Object.keys(input).filter((key) => !accepted.has(key));
  if (unknown.length) return fail(`unknown estimate parameters: ${unknown.slice(0, 10).join(",")}`);

  // A missing application norm is not an editable project fact. Neither a
  // submitted number, a carried confirmation nor a hidden default can turn it
  // into a sourced norm; confirmation requires an immutable definition successor.
  for (const definition of definitions) {
    const metadata = isRecord(definition.truth_metadata) ? definition.truth_metadata : {};
    if (metadata.value_source_role !== 'UNRESOLVED_APPLICATION_NORM') continue;
    const id = String(definition.parameter_id);
    if (definition.default_value != null) return fail(`unresolved application norm cannot have a default ${id}`);
    if (input[id] != null || confirmed[id] != null) return fail(`unresolved application norm cannot be supplied ${id}`);
  }

  validateCanonicalConditionalWholeIntegerV1(definitions,values,{
    deferredEffectiveQuantityParameterIds:options.deferredEffectiveQuantityParameterIds,
  });

  // Declared defaults are resolved before conditional rules. Numeric project
  // quantities in canonical content intentionally have no hidden defaults.
  for (const definition of definitions) {
    const id = String(definition.parameter_id ?? "");
    if (!id) return fail("parameter definition identity is empty");
    if (values[id] == null && definition.default_value != null) {
      values[id] = acceptedBaselineDefault(definition, id, options.baselineContext);
    }
  }

  for (const definition of definitions) {
    const id = String(definition.parameter_id);
    const constraints = definition.constraints_json && typeof definition.constraints_json === "object" && !Array.isArray(definition.constraints_json)
      ? definition.constraints_json as JsonRecord
      : {};
    const requiredByCondition = conditionMatches(constraints.requiredWhen, values);
    const forbiddenByCondition = conditionMatches(constraints.forbiddenWhen, values);
    const value = values[id];
    if (value == null) {
      const preliminaryCompilationAllowed = definitionAllowsPreliminaryCompilation(definition);
      if ((definition.required === true || requiredByCondition) && !preliminaryCompilationAllowed) {
        return fail(`missing parameter ${id}`);
      }
      continue;
    }
    if (forbiddenByCondition) return fail(`parameter ${id} is forbidden by cross-field rule`);

    const valueType = String(definition.value_type ?? "");
    if (valueType === "boolean" && typeof value !== "boolean") return fail(`invalid boolean ${id}`);
    if (valueType === "text") {
      if (typeof value !== "string" || !value.trim()) return fail(`invalid text ${id}`);
      if (constraints.maxLength != null && value.length > Number(constraints.maxLength)) return fail(`text too long ${id}`);
    }
    if (valueType === "enum") {
      if (!Array.isArray(constraints.values) || constraints.values.length < 1 || !constraints.values.includes(value)) {
        return fail(`invalid enum ${id}`);
      }
    }
    if (valueType === "decimal" || valueType === "integer") {
      const numeric = finiteNumber(value, id);
      // Inspect the supplied decimal text before floating-point conversion:
      // a non-zero fractional tail can otherwise disappear in Number(value).
      // This is the same whole-number syntax accepted by the shared client.
      if (valueType === "integer" && (!/^[+-]?\d+$/.test(String(value)) || !Number.isInteger(numeric))) {
        return fail(`invalid integer ${id}`);
      }
      if (constraints.min != null && numeric < Number(constraints.min)) return fail(`parameter below minimum ${id}`);
      if (constraints.exclusiveMin != null && numeric <= finiteNumber(constraints.exclusiveMin, `${id}.exclusiveMin`)) return fail(`parameter must exceed minimum ${id}`);
      if (constraints.max != null && numeric > Number(constraints.max)) return fail(`parameter above maximum ${id}`);
      if (constraints.multipleOf != null) {
        const multipleOf = finiteNumber(constraints.multipleOf, `${id}.multipleOf`);
        if (multipleOf <= 0) return fail(`invalid multiple ${id}`);
        const quotient = numeric / multipleOf;
        const tolerance = Math.max(1, Math.abs(quotient)) * Number.EPSILON * 16;
        if (Math.abs(quotient - Math.round(quotient)) > tolerance) {
          return fail(`parameter is not a multiple ${id}`);
        }
      }
      for (const [rule, compare] of NUMERIC_PARAMETER_RELATIONS) {
        const peerId = constraints[rule];
        if (peerId == null) continue;
        const peerValue = values[String(peerId)];
        if (peerValue == null) continue;
        if (!compare(numeric, finiteNumber(peerValue, String(peerId)))) {
          return fail(`cross-field rule ${id}.${rule}=${String(peerId)} failed`);
        }
      }
    }
  }

  const booleanGroups = new Map<string, string[]>();
  for (const definition of definitions) {
    const constraints = definition.constraints_json && typeof definition.constraints_json === "object" && !Array.isArray(definition.constraints_json)
      ? definition.constraints_json as JsonRecord
      : {};
    const group = constraints.mutuallyExclusiveBooleanGroup;
    if (group == null || values[String(definition.parameter_id)] !== true) continue;
    const members = booleanGroups.get(String(group)) ?? [];
    members.push(String(definition.parameter_id));
    booleanGroups.set(String(group), members);
  }
  for (const [group, members] of booleanGroups) {
    if (members.length > 1) return fail(`mutually exclusive boolean group ${group} enabled simultaneously: ${members.join(",")}`);
  }
  return values;
}
