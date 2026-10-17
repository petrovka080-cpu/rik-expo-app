import fs from 'node:fs';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';

import { assembleCuringCombined48ForwardR1 as assemble } from './curingCombined48ForwardAssemblerR1';
import { assembleCuringMaterials36ForwardR1 as materialAssembler } from './curingMaterials36ForwardAssemblerR1';
import { assembleCuringControlTitles12ForwardR1 as controlAssembler } from './curingControlTitles12ForwardAssemblerR1';
import { canonicalDefinitionPublicationStableValueR1 as stable } from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';

type Json = Record<string, any>;
const read = (path: string) => JSON.parse(fs.readFileSync(path, 'utf8').replace(/^\uFEFF/u, ''));
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const input = {
  materialContext: read(process.argv[2]), controlContext: read(process.argv[3]),
  releaseId: '11111111-1111-5111-8111-111111111111', sourceHead: 'TEST_ONLY', sourceTree: 'TEST_ONLY',
  sourceFingerprint: 'TEST_ONLY_COMBINED48', sourceFreezeSha256: 'TEST_ONLY', masterSha256: 'TEST_ONLY', acceptanceEvidenceSha256: 'TEST_ONLY',
};
const before = hash(input);
const result = assemble(input);
assert.equal(result.models.length, 48);
assert.equal(result.preservedCatalogIds.length, 6);
assert(result.preservedCatalogIds.every(id => id.includes('_slab_foundation_cure_')));
assert.equal(result.models.filter(m => m.plan.definition.definition_version === 10).length, 36);
assert.equal(result.models.filter(m => m.plan.definition.definition_version === 9).length, 12);

// The package must reuse the already checked model and title implementations.
const shared = { ...input, sources: result.sources, locators: result.locators };
const separate = [
  ...materialAssembler({ ...shared, parents: input.materialContext.parents }).models,
  ...controlAssembler({ ...shared, parents: input.controlContext.parents }).models,
];
for (const model of result.models) {
  assert.equal(model.plan.passport.decision.waveContract, model.plan.contract, 'PUBLISHER_DECISION_CONTRACT_MISMATCH');
  assert(model.plan.parameters.every((p: Json) => p.truth_metadata.contract === model.plan.contract), 'PUBLISHER_PARAMETER_CONTRACT_MISMATCH');
  const old = separate.find(m => m.plan.definition.catalog_id === model.plan.definition.catalog_id);
  assert(old);
  assert.equal(hash(model), hash(old), 'COMBINED_PACKAGE_CHANGED_INDIVIDUAL_PLAN');
}
for (const entry of result.preservedEntries) {
  const parent = input.controlContext.parents.find((p: Json) => p.definition.catalog_id === entry.catalog_id);
  assert(parent);
  assert.equal(hash(entry), hash(parent.entry), 'PRESERVED_SLAB_ENTRY_CHANGED');
}
const parents = [...input.materialContext.parents, ...input.controlContext.parents];
const changedParents = parents.filter(p => !result.preservedCatalogIds.includes(p.definition.catalog_id));
for (const [key, expected] of [['parameters', 2268], ['formulas', 828], ['resources', 828]] as const) {
  assert.equal(result.models.reduce((sum, m) => sum + m.plan[key].length, 0) - changedParents.reduce((sum, p) => sum + p[key].length, 0), expected);
}
const oldIds = new Set(parents.flatMap(p => [p.definition.id, p.baseline.id, ...p.resources.map((r: Json) => r.id)]));
for (const { plan } of result.models) for (const id of [plan.definition.id, plan.baseline.id, ...plan.resources.map((r: Json) => r.id)]) {
  assert(!oldIds.has(id), 'FORWARD_PACKAGE_REUSED_HISTORICAL_ID');
}

const reordered = structuredClone(input);
for (const context of [reordered.materialContext, reordered.controlContext]) {
  for (const key of ['parents', 'sources', 'locators', 'searchDocuments']) context[key].reverse();
}
assert.equal(hash(assemble(reordered)), hash(result), 'CONTEXT_ORDER_CHANGED_FORWARD_PACKAGE');

const failureCases: readonly [string, (value: typeof input) => void, string][] = [
  ['pointer-bytes', v => { v.controlContext.pointerSha256 = 'different'; }, 'CURING48_PARENT_POINTER_MISMATCH'],
  ['release-pair', v => { v.controlContext.pointer.searchReleaseId = v.releaseId; }, 'CURING48_PARENT_RELEASE_MISMATCH'],
  ['same-release', v => { v.releaseId = v.materialContext.pointer.definitionReleaseId; }, 'CURING48_FORWARD_RELEASE_REQUIRED'],
  ['duplicate-material', v => { v.materialContext.parents[1] = structuredClone(v.materialContext.parents[0]); }, 'CURING48_DUPLICATE_ID:parent'],
  ['overlapping-scopes', v => { v.controlContext.parents[0] = structuredClone(v.materialContext.parents[0]); }, 'CURING48_DUPLICATE_ID:parent'],
  ['missing-search', v => { v.materialContext.searchDocuments.pop(); }, 'CURING48_EXACT_SEARCH_SCOPE_REQUIRED'],
  ['duplicate-search', v => { v.materialContext.searchDocuments[1] = structuredClone(v.materialContext.searchDocuments[0]); }, 'CURING48_DUPLICATE_ID:search'],
  ['search-version', v => { v.materialContext.searchDocuments[0].definition_version_id = v.releaseId; }, 'CURING48_SEARCH_DEFINITION'],
  ['search-release', v => { v.controlContext.searchDocuments[0].search_release_id = v.releaseId; }, 'CURING48_SEARCH_RELEASE'],
  ['parent-baseline', v => { v.materialContext.parents[0].entry.approved_template_baseline_id = v.releaseId; }, 'CURING48_PARENT_ENTRY_BASELINE'],
  ['parent-definition', v => { v.controlContext.parents[0].entry.definition_version_id = v.releaseId; }, 'CURING48_PARENT_ENTRY_DEFINITION'],
  ['parent-release', v => { v.materialContext.parents[0].entry.release_id = v.releaseId; }, 'CURING48_PARENT_ENTRY_RELEASE'],
  ['missing-locator', v => { v.materialContext.parents[0].bindings[0].locator_id = v.releaseId; }, 'CURING48_BOUND_LOCATOR_REQUIRED'],
  ['locator-source', v => { for (const c of [v.materialContext, v.controlContext]) c.locators[0].source_id = v.releaseId; }, 'CURING48_LOCATOR_SOURCE_REQUIRED'],
  ['source-conflict', v => { v.controlContext.sources[0].title_ru += ' changed'; }, 'CURING48_REFERENCE_PAYLOAD_CONFLICT:source'],
  ['locator-conflict', v => { v.controlContext.locators[0].excerpt_sha256 = 'changed'; }, 'CURING48_REFERENCE_PAYLOAD_CONFLICT:locator'],
  ['duplicate-source', v => { v.materialContext.sources.push(structuredClone(v.materialContext.sources[0])); }, 'CURING48_DUPLICATE_ID:source'],
  ['duplicate-locator', v => { v.controlContext.locators.push(structuredClone(v.controlContext.locators[0])); }, 'CURING48_DUPLICATE_ID:locator'],
];
const rejections: Json[] = [];
for (const [scenario, mutate, message] of failureCases) {
  const changed = structuredClone(input);
  mutate(changed);
  const failedBefore = hash(changed);
  assert.throws(() => assemble(changed), error => error instanceof Error && error.message.includes(message), scenario);
  assert.equal(hash(changed), failedBefore, 'REJECTED_INPUT_WAS_MUTATED:' + scenario);
  rejections.push({ scenario, expectedMessage: message, rejectedBeforePublication: true });
}
assert.equal(hash(input), before, 'SOURCE_CONTEXT_WAS_MUTATED');
const report = {
  status: 'PASS_COMBINED_CURING48_FORWARD_PACKAGE_WITH_SIX_PRESERVED_SLABS',
  materialModels: 36, titleOnlyModels: 12, totalForwardPlans: 48, preservedSlabDefinitions: 6,
  parameters: 5184, formulas: 2208, resources: 2208, normativeBindings: 768,
  newParameters: 2268, newFormulas: 828, newResources: 828,
  planHashes: result.models.map(m => ({ catalogId: m.plan.definition.catalog_id, sha256: hash(m.plan) })),
  preservedEntries: result.preservedEntries, rejectionScenarios: rejections.length, rejections,
  individualPlanParity: true, reorderedContextParity: true, sourceContextsUnchanged: true,
  databaseConnectionAttempted: false, publicationPerformed: false, nativeAccepted: false,
  completeProjectEstimatesAccepted: 0, confirmedSupplierOrders: 0,
};
fs.writeFileSync(process.argv[4], JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, totalForwardPlans: 48, preservedSlabDefinitions: 6, rejectionScenarios: rejections.length }));
