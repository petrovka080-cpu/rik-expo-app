import { canonicalDefinitionPublicationStableValueR1 } from './canonicalDefinitionPublicationStableValueR1';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { buildMasterParameterCalculationConsumers } from './canonicalDefinitionParameterConsumersR1';
import { canonicalFusionResourceSourceBodyS2758, FUSION_SOURCE_CATALOG_S2758 } from './canonicalFusionResourceSourceIntegrityS2758';
import { buildCanonicalDerivedQuantitySourceBindingV1, type CanonicalDerivedQuantitySourceBindingV1 } from './canonicalDerivedQuantityClearEvidenceV1';

type Row = Record<string, any>;
const CONTRACT = 'rik-expo-app.s27-58.fusion-bench-prepared-concrete.v1';
const PREFIX = 'fusion-bench-prepared-concrete';
const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = (value: unknown) => canonicalEstimateSha256HexText(JSON.stringify(canonicalDefinitionPublicationStableValueR1(value)));
const same = (a: unknown, b: unknown) => hash(a) === hash(b);
const omit = (row: Row, keys: readonly string[]) => Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
function check(condition: unknown): asserts condition { if (!condition) throw Error('Unverified Fusion source packet'); }
function columns(row: Row, keys: string) { const expected = keys.split(' '); check(isRow(row)
  && Object.keys(row).length === expected.length && expected.every(key => Object.hasOwn(row, key))); }
function time(value: unknown) { check((typeof value === 'string' || value instanceof Date) && Number.isFinite(new Date(value as string).getTime())); }
function uuid(seed: string) {
  const text = canonicalEstimateSha256HexText(seed).slice(0, 32).split('');
  text[12] = '5'; text[16] = ((parseInt(text[16], 16) & 3) | 8).toString(16);
  const hex = text.join(''); return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const sha = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

/** Complete SQL source records, loaded symmetrically from independently
 * admitted pinned releases. None of this packet is a new HTTP permission flag. */
export type CanonicalFusionPublishedSourcePacketS2758 = Readonly<{
  expectedReleaseId: string;
  definition: Row;
  manifest: Row;
  baseline: Row;
  passport: Row;
  parameters: readonly Row[];
  formulas: readonly Row[];
  resources: readonly Row[];
  bindings: readonly Row[];
  locators: readonly Row[];
  sources: readonly Row[];
  priceBindings: readonly Row[];
}>;

export type CanonicalFusionPublishedSourceProjectionS2758 = Readonly<{
  binding: CanonicalDerivedQuantitySourceBindingV1;
  parameterSchemaSha256: string;
  definitionSchemaSha256: string;
}>;

/** Server source-origin join only; this projection grants no command rights. */
export function canonicalFusionPublishedSourceProjectionS2758(packet: CanonicalFusionPublishedSourcePacketS2758,
  parent?: CanonicalFusionPublishedSourcePacketS2758): CanonicalFusionPublishedSourceProjectionS2758 | null {
  try {
    const { definition: d, manifest: m, baseline: b, passport: passport } = packet;
    columns(d, 'id release_id catalog_id definition_version passport applicability definition_sha256 source_metadata created_at content_status content_gate_status');
    columns(m, 'release_id catalog_id definition_version_id source_batch source_release_id domain_id publication_state approved_template_baseline_id baseline_ready scenario_ready definition_hash entry_sha256 created_at runtime_publication_state');
    columns(b, 'id baseline_key catalog_id definition_version_id source_definition_version_id parameter_schema_sha256 input_values input_classification uom_by_parameter formula_consumer_ids resource_consumer_row_ids normative_source_ids guide_provenance_ru proposal_source_refs validation_scenario_refs acceptance_evidence_sha256 accepted_release_id accepted_at supersedes_baseline_id contract_version');
    columns(passport, 'definition_version_id release_id catalog_id contract_version identity_mode redirect_catalog_id physical_result_ru included_scope_ru excluded_scope_ru capability_matrix parameter_count formula_count resource_count decision payload_sha256 source_head source_tree created_at');
    check(isRow(d.source_metadata) && d.source_metadata.contract === CONTRACT && sha(d.source_metadata.sourceFingerprint));
    const fingerprint = d.source_metadata.sourceFingerprint, catalog = FUSION_SOURCE_CATALOG_S2758;
    check(d.catalog_id === catalog && d.id === uuid(`${CONTRACT}:${fingerprint}:definition`)
      && d.release_id === uuid(`${CONTRACT}:${fingerprint}:definition-release`)
      && d.definition_version === (parent ? 2 : 1) && d.content_status === 'CANDIDATE_READY'
      && d.content_gate_status === 'GREEN');
    check(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(packet.expectedReleaseId));
    check(m.release_id === packet.expectedReleaseId && m.catalog_id === catalog && m.definition_version_id === d.id
      && m.source_release_id === d.release_id && m.source_batch === CONTRACT && m.definition_hash === d.definition_sha256
      && m.baseline_ready === true && m.scenario_ready === true && sha(m.entry_sha256));
    check(b.id === uuid(`${CONTRACT}:${fingerprint}:baseline`) && b.catalog_id === catalog && b.definition_version_id === d.id
      && b.accepted_release_id === d.release_id && m.approved_template_baseline_id === b.id
      && b.baseline_key === `${CONTRACT}:${fingerprint.slice(0, 16)}:${catalog}`
      && b.contract_version === 'APPROVED_TEMPLATE_BASELINE_R54_V1');
    check(b.supersedes_baseline_id === (parent ? parent.baseline.id : null)
      && b.source_definition_version_id === (parent ? parent.definition.id : d.id));
    check(passport.definition_version_id === d.id && passport.release_id === d.release_id && passport.catalog_id === catalog
      && passport.contract_version === 'real-professional-estimates-r3.content-passport.v1'
      && passport.identity_mode === 'WORK' && passport.redirect_catalog_id === null
      && passport.parameter_count === 25 && passport.formula_count === 13 && passport.resource_count === 13
      && /^[a-f0-9]{40}$/u.test(passport.source_head) && /^[a-f0-9]{40}$/u.test(passport.source_tree));
    for (const value of [d.created_at, m.created_at, b.accepted_at, passport.created_at]) time(value);
    check(Array.isArray(packet.parameters) && packet.parameters.length === 25
      && Array.isArray(packet.formulas) && packet.formulas.length === 13
      && Array.isArray(packet.resources) && packet.resources.length === 13
      && Array.isArray(packet.priceBindings) && packet.priceBindings.length === 0);
    const parameters = [...packet.parameters].sort((a, z) => a.ordinal - z.ordinal);
    const resources = [...packet.resources].sort((a, z) => a.ordinal - z.ordinal);
    const origin = { contract: CONTRACT, catalogId: catalog, definitionId: d.id, sourceFingerprint: fingerprint };
    const resourceRows = resources.map((resource, index) => {
      check(resource.ordinal === index); time(resource.created_at);
      const body = canonicalFusionResourceSourceBodyS2758({ resource, representation: 'PUBLISHED_MASTER_SQL', publishedOrigin: origin });
      check(body); return { ...body, row_sha256: estimateDeterministicHash(body), row_type: resource.row_type };
    });
    const parameterRows: Row[] = parameters.map((parameter, index) => {
      columns(parameter, 'definition_version_id parameter_id ordinal value_type unit_id title_ru required default_value constraints_json truth_metadata approved_template_baseline_id');
      check(parameter.definition_version_id === d.id && parameter.approved_template_baseline_id === b.id
        && parameter.ordinal === index && parameter.default_value === null && typeof parameter.required === 'boolean'
        && isRow(parameter.truth_metadata) && parameter.truth_metadata.contract === CONTRACT
        && parameter.truth_metadata.semantic_parameter_key === `${catalog}:${parameter.parameter_id}`);
      return { ...omit(parameter, ['definition_version_id', 'approved_template_baseline_id']),
        truth_metadata: { ...omit(parameter.truth_metadata, ['formula_consumers', 'resource_branch_consumers']),
          semantic_parameter_key: `${PREFIX}:${parameter.parameter_id}` } };
    });
    const formulaMap = new Map(packet.formulas.map(formula => [formula.formula_id, formula]));
    check(formulaMap.size === 13);
    const formulaRows = resources.map(resource => {
      const formula = formulaMap.get(resource.formula_id); check(formula);
      columns(formula, 'definition_version_id formula_id output_unit_id expression_source ast input_parameter_ids ast_sha256');
      check(formula.definition_version_id === d.id && formula.ast_sha256 === hash(formula.ast));
      return omit(formula, ['definition_version_id']);
    });
    const consumers = buildMasterParameterCalculationConsumers({ parameters: parameterRows, formulas: formulaRows, resources: resourceRows });
    for (const parameter of parameters) {
      check(same(parameter.truth_metadata.formula_consumers, consumers.formulaConsumers[parameter.parameter_id])
        && same(parameter.truth_metadata.resource_branch_consumers, consumers.resourceConsumers[parameter.parameter_id]));
    }
    const parameterSchemaSha256 = hash(parameterRows), definitionSchemaSha256 = hash({ formulaRows, resourceRows });
    check(b.parameter_schema_sha256 === parameterSchemaSha256 && d.definition_sha256 === hash({ contract: CONTRACT,
      catalogId: catalog, parameterSchemaSha256, definitionSchemaSha256 }));
    check(same(b.uom_by_parameter, Object.fromEntries(parameterRows.map(p => [p.parameter_id, p.unit_id])))
      && same(b.formula_consumer_ids, consumers.formulaConsumers) && same(b.resource_consumer_row_ids, consumers.resourceConsumers));
    check(Array.isArray(b.validation_scenario_refs) && b.validation_scenario_refs.length === 1);
    const scenario = b.validation_scenario_refs[0];
    columns(scenario, 'scenario shortInput fixture runtimeProfile runtimeProfileClassification runtimeProfileSourceIds acceptanceEvidenceSha256 coreAcceptance');
    check(isRow(scenario.runtimeProfile) && Object.keys(scenario.runtimeProfile).length === 0
      && isRow(scenario.runtimeProfileClassification) && Object.keys(scenario.runtimeProfileClassification).length === 0
      && isRow(scenario.runtimeProfileSourceIds) && Object.keys(scenario.runtimeProfileSourceIds).length === 0
      && same(b.input_values, scenario.fixture)
      && same(b.input_classification, Object.fromEntries(parameterRows.map(p => [p.parameter_id, 'VALIDATION_FIXTURE']))));
    const lineage = parent ? { rootBaselineId: parent.baseline.id, baselineId: parent.baseline.id,
      definitionVersionId: parent.definition.id, acceptedReleaseId: parent.definition.release_id,
      depth: 0, path: [parent.baseline.id] } : { rootBaselineId: null, baselineId: null, definitionVersionId: d.id,
      acceptedReleaseId: d.release_id, depth: 0, path: [], newIdentityRoot: true };
    const acceptanceEvidenceSha256 = hash({ contract: CONTRACT, shortInput: scenario.shortInput, acceptanceInput: scenario.fixture,
      runtimeProfileInput: scenario.runtimeProfile, runtimeProfileClassification: scenario.runtimeProfileClassification,
      runtimeProfileSourceIds: scenario.runtimeProfileSourceIds, independentCompletenessMap: passport.decision.independentCompletenessMap,
      coreAcceptance: scenario.coreAcceptance, parameterSchemaSha256, definitionSchemaSha256, lineage });
    check(b.acceptance_evidence_sha256 === acceptanceEvidenceSha256 && scenario.acceptanceEvidenceSha256 === acceptanceEvidenceSha256
      && passport.payload_sha256 === hash({ targetDefinitionSha256: d.definition_sha256, acceptanceEvidenceSha256,
        independentCompletenessMap: passport.decision.independentCompletenessMap }));
    check(Array.isArray(packet.bindings) && packet.bindings.length === 1 && Array.isArray(packet.locators)
      && packet.locators.length === 1 && Array.isArray(packet.sources) && packet.sources.length === 1);
    const binding = packet.bindings[0], locator = packet.locators[0], source = packet.sources[0];
    columns(binding, 'definition_version_id resource_spec_id locator_id applicability');
    columns(locator, 'id source_id locator_key locator excerpt_sha256');
    columns(source, 'id source_key title_ru authority official_url artifact_sha256 effective_from effective_to metadata created_at'); time(source.created_at);
    check(binding.definition_version_id === d.id && binding.resource_spec_id === resources[0].id && binding.locator_id === locator.id
      && locator.source_id === source.id && source.source_key === d.source_metadata.sourceId
      && source.id === uuid(`${CONTRACT}:${source.source_key}:source`) && sha(source.artifact_sha256) && sha(locator.excerpt_sha256)
      && locator.id === uuid(`${CONTRACT}:${source.source_key}:${locator.locator_key}:locator`)
      && same(b.normative_source_ids, Object.fromEntries(parameterRows.map(p => [p.parameter_id, [source.source_key]]))));
    const definitionMeaning = { definition: { ...omit(d, ['id', 'release_id', 'definition_version', 'definition_sha256', 'created_at']),
      source_metadata: omit(d.source_metadata, ['sourceFingerprint']) },
      manifest: omit(m, ['release_id', 'definition_version_id', 'source_release_id', 'approved_template_baseline_id', 'definition_hash', 'entry_sha256', 'created_at']),
      baseline: { ...omit(b, ['id', 'baseline_key', 'definition_version_id', 'source_definition_version_id', 'accepted_release_id',
        'accepted_at', 'supersedes_baseline_id', 'acceptance_evidence_sha256', 'validation_scenario_refs']),
        validation_scenario_refs: [omit(scenario, ['acceptanceEvidenceSha256'])] },
      passport: omit(passport, ['definition_version_id', 'release_id', 'payload_sha256', 'source_head', 'source_tree', 'created_at']),
      normative: { rowId: resources[0].row_id, applicability: binding.applicability,
        locator: omit(locator, ['id', 'source_id']), source: omit(source, ['id', 'created_at']) } };
    const sourceBinding = buildCanonicalDerivedQuantitySourceBindingV1({ catalogId: catalog, definitionMeaning,
      parameters: parameters.map(parameter => ({ ...parameter, approved_template_baseline_id: 'verified-this-baseline' })),
      formulas: packet.formulas, resources: packet.resources, representation: 'PUBLISHED_MASTER_SQL', publishedOrigin: origin });
    return sourceBinding ? { binding: sourceBinding, parameterSchemaSha256, definitionSchemaSha256 } : null;
  } catch { return null; }
}

/** Necessary complete source evidence only. Existing release/owner rights,
 * revision identity, explicit consent, unchanged user inputs, exact price
 * selection, amendments and worker reproof remain separate mandatory gates. */
export function canonicalFusionPublishedRootSourceBindingS2758(packet: CanonicalFusionPublishedSourcePacketS2758) {
  const binding = canonicalFusionPublishedSourceProjectionS2758(packet)?.binding; return binding?.mode === 'LEGACY' ? binding : null;
}
export function canonicalFusionPublishedPolicyAdoptionSourceBindingsS2758(input: {
  from: CanonicalFusionPublishedSourcePacketS2758;
  to: CanonicalFusionPublishedSourcePacketS2758;
}): Readonly<{ from: CanonicalDerivedQuantitySourceBindingV1; to: CanonicalDerivedQuantitySourceBindingV1 }> | null {
  const from = canonicalFusionPublishedRootSourceBindingS2758(input.from); if (!from) return null;
  const to = canonicalFusionPublishedSourceProjectionS2758(input.to, input.from)?.binding;
  return to?.mode === 'PARAMETERS_ONLY' && from.sourceSemanticSha256 === to.sourceSemanticSha256 ? { from, to } : null;
}
