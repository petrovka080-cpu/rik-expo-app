import { canonicalEstimateStableJson } from './canonicalEstimateDeterminism';
import { canonicalEstimateSha256HexText } from './canonicalEstimateSha256';
import { validateCanonicalDerivedQuantityEditPolicyV1 } from './canonicalDerivedQuantityEditPolicyV1';
import { compileFormulaGraph, formulaAstInputParameterIds, type FormulaAst } from './formulaGraph';
import { canonicalDefinitionPublicationStableValueR1 } from './canonicalDefinitionPublicationStableValueR1';
import { canonicalFusionResourceSourceBodyS2758, type CanonicalFusionPublishedSourceOriginS2758 } from './canonicalFusionResourceSourceIntegrityS2758';

type Row = Readonly<Record<string, unknown>>;
const CATALOG = 'canonical-work:master:glasdon_fusion_bench_prepared_concrete_standard';
const PHYSICAL_IDS = ['bench-consumed', 'fixing-included', 'fixing-consumed-separate'].map(key => 'fusion-bench-prepared-concrete:' + key);
const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const sha = (value: unknown) => canonicalEstimateSha256HexText(canonicalEstimateStableJson(value));
const omit = (row: Row, keys: readonly string[]) => Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));

export type CanonicalDerivedQuantitySourceBindingV1 = Readonly<{
  contractVersion: 'canonical-derived-quantity-source-binding/v1';
  catalogId: string;
  sourceSemanticSha256: string;
  mode: 'LEGACY' | 'PARAMETERS_ONLY';
  physicalRowIds: readonly string[];
}>;

/** Necessary source evidence for this first policy-only adoption. Server callers
 * must build both sides from symmetric, independently admitted DB definitions.
 * Price-route/selection evidence, parent identity, consent and user snapshots
 * are additional gates; this descriptor alone never authorizes migration. */
export function buildCanonicalDerivedQuantitySourceBindingV1(input: {
  catalogId: string;
  definitionMeaning: Row;
  parameters: readonly Row[];
  formulas: readonly Row[];
  resources: readonly Row[];
  representation: 'FACTORY_ARTIFACT' | 'PUBLISHED_MASTER_SQL';
  publishedOrigin?: CanonicalFusionPublishedSourceOriginS2758;
}): CanonicalDerivedQuantitySourceBindingV1 | null {
  if (input.catalogId !== CATALOG || !isRow(input.definitionMeaning)
    || input.parameters.length !== 25 || input.formulas.length !== 13 || input.resources.length !== 13) return null;
  try {
    const indexes = (rows: readonly Row[], key: string) => {
      if (rows.some(row => !isRow(row) || typeof row[key] !== 'string' || !row[key])) throw Error('Invalid source row');
      const map = new Map(rows.map(row => [String(row[key]), row]));
      if (map.size !== rows.length) throw Error('Duplicate source identity');
      return map;
    };
    const parameters = indexes(input.parameters, 'parameter_id'), formulas = indexes(input.formulas, 'formula_id');
    const resources = indexes(input.resources, 'row_id');
    for (const formula of formulas.values()) {
      const compiled = compileFormulaGraph(String(formula.expression_source));
      // Automatic Fusion factories carry the exact publisher placeholder;
      // SHA256 is only attached during publication. AST/expression consistency
      // is checked independently for both representations.
      const astHash = input.representation === 'FACTORY_ARTIFACT' ? 'runtime-publisher-replaces-with-deterministic-sha256'
        : canonicalEstimateSha256HexText(JSON.stringify(canonicalDefinitionPublicationStableValueR1(formula.ast)));
      if (formula.ast_sha256 !== astHash || canonicalEstimateStableJson(formula.ast) !== canonicalEstimateStableJson(compiled.ast)
        || canonicalEstimateStableJson(formula.input_parameter_ids) !== canonicalEstimateStableJson(compiled.inputParameterIds)) throw Error('Invalid source formula');
    }
    const modes = PHYSICAL_IDS.map(id => {
      const row = resources.get(id), graph = row?.resource_graph;
      if (!row || row.unit_id !== 'pcs' || !isRow(graph)) throw Error('Invalid physical source row');
      const formula = formulas.get(String(row.formula_id));
      if (!formula || !Array.isArray(formula.input_parameter_ids)) throw Error('Missing physical formula');
      const astInputs = formulaAstInputParameterIds(formula.ast as FormulaAst);
      const expected = compileFormulaGraph(id === PHYSICAL_IDS[0] ? 'bench_count' : '4*bench_count');
      if (formula.input_parameter_ids.length !== 1 || formula.input_parameter_ids[0] !== 'bench_count'
        || astInputs.length !== 1 || astInputs[0] !== 'bench_count' || formula.output_unit_id !== 'pcs'
        || canonicalEstimateStableJson(formula.ast) !== canonicalEstimateStableJson(expected.ast)) throw Error('Unexpected physical inputs');
      const policy = validateCanonicalDerivedQuantityEditPolicyV1(graph.derivedQuantityEditPolicyV1,
        id, String(row.unit_id), String(formula.output_unit_id), formula.input_parameter_ids as string[],
        new Set(parameters.keys()), astInputs);
      if (Object.hasOwn(graph, 'derivedQuantityEditPolicyV1') && !policy) throw Error('Malformed physical policy');
      return policy ? 'PARAMETERS_ONLY' : 'LEGACY';
    });
    if (!modes.every(mode => mode === modes[0])) return null;
    const normalizedResources = [...resources.values()].map(row => {
      const body = canonicalFusionResourceSourceBodyS2758({ resource: row,
        representation: input.representation, publishedOrigin: input.publishedOrigin });
      if (!body) throw Error('Invalid source resource hash or publisher origin');
      if (PHYSICAL_IDS.includes(String(row.row_id))) body.resource_graph = omit(row.resource_graph as Row, ['derivedQuantityEditPolicyV1']);
      else if (isRow(row.resource_graph) && Object.hasOwn(row.resource_graph, 'derivedQuantityEditPolicyV1')) throw Error('Unexpected policy owner');
      return body;
    }).sort((a, b) => String(a.row_id).localeCompare(String(b.row_id), 'en'));
    const sorted = (rows: readonly Row[], key: string) => rows.map(row => omit(row, ['definition_version_id']))
      .sort((a, b) => String(a[key]).localeCompare(String(b[key]), 'en'));
    return { contractVersion: 'canonical-derived-quantity-source-binding/v1', catalogId: input.catalogId,
      sourceSemanticSha256: sha({ definitionMeaning: input.definitionMeaning,
        parameters: sorted(input.parameters, 'parameter_id'), formulas: sorted(input.formulas, 'formula_id'), resources: normalizedResources }),
      mode: modes[0] as 'LEGACY' | 'PARAMETERS_ONLY', physicalRowIds: [...PHYSICAL_IDS] };
  } catch { return null; }
}

export type CanonicalDerivedQuantityClearEvidenceV1 = Readonly<{
  contractVersion: 'canonical-derived-quantity-clear-source-amendment-evidence/v1';
  sourceSemanticSha256: string;
  clearedRowIds: readonly string[];
  mergedOverrides: Record<string, unknown>;
}>;

/** Only explicit null clears of existing pins. The caller retains separate
 * identity/lineage, parameter, currency and source-price gates before a write. */
export function canonicalDerivedQuantityClearEvidenceV1(input: {
  from: CanonicalDerivedQuantitySourceBindingV1 | null;
  to: CanonicalDerivedQuantitySourceBindingV1 | null;
  parentOverrides: unknown;
  stagedOverrides: unknown;
  parentCustomRows: unknown;
}): CanonicalDerivedQuantityClearEvidenceV1 | null {
  const { from, to } = input;
  if (!from || !to || from.contractVersion !== 'canonical-derived-quantity-source-binding/v1'
    || to.contractVersion !== from.contractVersion || from.catalogId !== CATALOG || to.catalogId !== CATALOG
    || from.mode !== 'LEGACY' || to.mode !== 'PARAMETERS_ONLY'
    || !/^[a-f0-9]{64}$/u.test(from.sourceSemanticSha256) || from.sourceSemanticSha256 !== to.sourceSemanticSha256
    || canonicalEstimateStableJson(from.physicalRowIds) !== canonicalEstimateStableJson(PHYSICAL_IDS)
    || canonicalEstimateStableJson(to.physicalRowIds) !== canonicalEstimateStableJson(PHYSICAL_IDS)
    || !isRow(input.parentOverrides) || !isRow(input.stagedOverrides)
    || !Array.isArray(input.parentCustomRows) || input.parentCustomRows.length) return null;
  const parent = input.parentOverrides, staged = Object.entries(input.stagedOverrides), selected = staged.map(([id]) => id);
  if (!staged.length || staged.some(([id, value]) => {
    const original = parent[id];
    return !PHYSICAL_IDS.includes(id) || !isRow(value) || !Object.hasOwn(value, 'quantity') || value.quantity !== null
      || Object.keys(value).some(key => !['quantity', 'provenance'].includes(key))
      || !isRow(original) || !Object.hasOwn(original, 'quantity') || original.quantity == null
      || !isRow(original.provenance) || original.provenance.kind !== 'manual';
  })) return null;
  // Inclusion is deliberately irrelevant: the core validates pins before gates.
  if (PHYSICAL_IDS.some(id => isRow(parent[id]) && Object.hasOwn(parent[id], 'quantity')
    && parent[id].quantity != null && !selected.includes(id))) return null;
  try {
    const merged: Record<string, unknown> = JSON.parse(canonicalEstimateStableJson(parent));
    for (const id of selected) merged[id] = { ...(merged[id] as Record<string, unknown>), quantity: null };
    return { contractVersion: 'canonical-derived-quantity-clear-source-amendment-evidence/v1',
      sourceSemanticSha256: from.sourceSemanticSha256, clearedRowIds: selected.sort(), mergedOverrides: merged };
  } catch { return null; }
}
