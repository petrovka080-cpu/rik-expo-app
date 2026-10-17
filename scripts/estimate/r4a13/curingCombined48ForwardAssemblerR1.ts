import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';

import type { CanonicalPublisherJson as Json } from './canonicalDefinitionPublisherR1';
import { assembleCuringMaterials36ForwardR1 } from './curingMaterials36ForwardAssemblerR1';
import { assembleCuringControlTitles12ForwardR1 } from './curingControlTitles12ForwardAssemblerR1';
import { canonicalDefinitionPublicationStableValueR1 as stable } from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';

export const curingCombined48ContractR1 = 'rik-expo-app.curing-materials36-control-titles12.r1';

type Context = Readonly<{
  pointer: Json;
  pointerSha256: string;
  parents: readonly Json[];
  sources: readonly Json[];
  locators: readonly Json[];
  searchDocuments: readonly Json[];
}>;

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

function uniqueById(rows: readonly Json[], field: string, label: string): Map<string, Json> {
  const result = new Map<string, Json>();
  for (const row of rows) {
    const id = row[field];
    assert(typeof id === 'string' && id.length > 0, 'CURING48_MISSING_ID:' + label);
    assert(!result.has(id), 'CURING48_DUPLICATE_ID:' + label + ':' + id);
    result.set(id, row);
  }
  return result;
}

function mergeReferences(left: readonly Json[], right: readonly Json[], label: string): Json[] {
  const result = uniqueById(left, 'id', label);
  uniqueById(right, 'id', label);
  for (const row of right) {
    const old = result.get(row.id);
    if (old) assert.equal(hash(old), hash(row), 'CURING48_REFERENCE_PAYLOAD_CONFLICT:' + label);
    else result.set(row.id, row);
  }
  return [...result.values()].sort((a, b) => compare(a.id, b.id));
}

/** One local forward package. Publication, historical migration and activation
 * remain the responsibility of the existing governed publisher. */
export function assembleCuringCombined48ForwardR1(input: Readonly<{
  materialContext: Context;
  controlContext: Context;
  releaseId: string;
  sourceHead: string;
  sourceTree: string;
  sourceFingerprint: string;
  sourceFreezeSha256: string;
  masterSha256: string;
  acceptanceEvidenceSha256: string;
}>) {
  const { materialContext, controlContext } = input;
  assert.equal(materialContext.parents.length, 36, 'CURING48_MATERIAL_PARENT_COUNT');
  assert.equal(controlContext.parents.length, 18, 'CURING48_CONTROL_PARENT_COUNT');
  assert.equal(materialContext.pointerSha256, controlContext.pointerSha256, 'CURING48_PARENT_POINTER_MISMATCH');
  assert.equal(hash(materialContext.pointer), hash(controlContext.pointer), 'CURING48_PARENT_RELEASE_MISMATCH');
  assert.notEqual(input.releaseId, materialContext.pointer.definitionReleaseId, 'CURING48_FORWARD_RELEASE_REQUIRED');

  const parents = [...materialContext.parents, ...controlContext.parents];
  const parentByCatalog = uniqueById(parents.map(p => ({ ...p, catalogId: p.definition.catalog_id })), 'catalogId', 'parent');
  const searchDocuments = [...materialContext.searchDocuments, ...controlContext.searchDocuments];
  const searchByCatalog = uniqueById(searchDocuments, 'catalog_id', 'search');
  assert.equal(parentByCatalog.size, 54, 'CURING48_EXACT_PARENT_SCOPE_REQUIRED');
  assert.equal(searchByCatalog.size, 54, 'CURING48_EXACT_SEARCH_SCOPE_REQUIRED');
  for (const parent of parents) {
    const catalogId = parent.definition.catalog_id;
    const document = searchByCatalog.get(catalogId);
    assert(document, 'CURING48_SEARCH_DOCUMENT_REQUIRED:' + catalogId);
    assert.equal(parent.entry.release_id, materialContext.pointer.definitionReleaseId, 'CURING48_PARENT_ENTRY_RELEASE');
    assert.equal(parent.entry.catalog_id, catalogId, 'CURING48_PARENT_ENTRY_CATALOG');
    assert.equal(parent.entry.definition_version_id, parent.definition.id, 'CURING48_PARENT_ENTRY_DEFINITION');
    assert.equal(parent.entry.approved_template_baseline_id, parent.baseline.id, 'CURING48_PARENT_ENTRY_BASELINE');
    assert.equal(document.search_release_id, materialContext.pointer.searchReleaseId, 'CURING48_SEARCH_RELEASE');
    assert.equal(document.definition_release_id, materialContext.pointer.definitionReleaseId, 'CURING48_SEARCH_DEFINITION_RELEASE');
    assert.equal(document.definition_version_id, parent.definition.id, 'CURING48_SEARCH_DEFINITION');
  }

  const sources = mergeReferences(materialContext.sources, controlContext.sources, 'source');
  const locators = mergeReferences(materialContext.locators, controlContext.locators, 'locator');
  const sourceById = new Map(sources.map(source => [source.id, source]));
  const locatorById = new Map(locators.map(locator => [locator.id, locator]));
  for (const locator of locators) assert(sourceById.has(locator.source_id), 'CURING48_LOCATOR_SOURCE_REQUIRED');
  for (const parent of parents) for (const binding of parent.bindings) {
    assert(locatorById.has(binding.locator_id), 'CURING48_BOUND_LOCATOR_REQUIRED');
  }

  const shared = {
    releaseId: input.releaseId, sourceHead: input.sourceHead, sourceTree: input.sourceTree,
    sourceFingerprint: input.sourceFingerprint, sourceFreezeSha256: input.sourceFreezeSha256,
    masterSha256: input.masterSha256, acceptanceEvidenceSha256: input.acceptanceEvidenceSha256,
  };
  const material = assembleCuringMaterials36ForwardR1({ ...shared, parents: materialContext.parents, sources, locators });
  const control = assembleCuringControlTitles12ForwardR1({ ...shared, parents: controlContext.parents });
  const models = [...material.models, ...control.models].sort((a, b) => compare(a.plan.definition.catalog_id, b.plan.definition.catalog_id));
  const targetByCatalog = uniqueById(models.map(model => ({ ...model, catalogId: model.plan.definition.catalog_id })), 'catalogId', 'successor');
  const preservedCatalogIds = [...control.preservedCatalogIds].sort(compare);
  assert.equal(targetByCatalog.size, 48, 'CURING48_EXACT_SUCCESSOR_SCOPE_REQUIRED');
  assert.equal(preservedCatalogIds.length, 6, 'CURING48_SIX_SLABS_MUST_BE_PRESERVED');
  for (const id of preservedCatalogIds) assert(parentByCatalog.has(id) && !targetByCatalog.has(id), 'CURING48_PRESERVED_TARGET_OVERLAP');
  assert.equal(new Set([...targetByCatalog.keys(), ...preservedCatalogIds]).size, parentByCatalog.size, 'CURING48_SCOPE_PARTITION');

  const identities = [input.releaseId];
  for (const { plan } of models) {
    const parent = parentByCatalog.get(plan.definition.catalog_id)!;
    assert.equal(plan.definition.release_id, input.releaseId, 'CURING48_SUCCESSOR_RELEASE');
    assert.equal(plan.definition.definition_version, parent.definition.definition_version + 1, 'CURING48_FORWARD_VERSION');
    assert.equal(plan.baseline.source_definition_version_id, parent.definition.id, 'CURING48_PREDECESSOR_DEFINITION');
    assert.equal(plan.baseline.supersedes_baseline_id, parent.baseline.id, 'CURING48_PREDECESSOR_BASELINE');
    assert.equal(plan.parameters.length, 108);
    assert.equal(plan.formulas.length, 46);
    assert.equal(plan.resources.length, 46);
    assert.equal(plan.bindings.length, 16);
    identities.push(plan.definition.id, plan.baseline.id, ...plan.resources.map((r: Json) => r.id));
  }
  assert.equal(new Set(identities).size, identities.length, 'CURING48_CROSS_MODEL_ID_COLLISION');

  return {
    contract: curingCombined48ContractR1,
    predecessor: structuredClone(materialContext.pointer),
    models,
    preservedCatalogIds,
    preservedEntries: preservedCatalogIds.map(id => structuredClone(parentByCatalog.get(id)!.entry)),
    searchDocuments: [...searchDocuments].sort((a, b) => compare(a.catalog_id, b.catalog_id)),
    sources, locators,
    materialModelCount: 36,
    titleOnlyModelCount: 12,
    newParameters: 2268,
    newFormulas: 828,
    newResources: 828,
    automaticHistoricalRowMigrationPerformed: false,
    engineeringAccepted: false,
    completeProjectEstimateAccepted: false,
    supplierOrderConfirmed: false,
    activationAllowed: false,
    productionEligible: false,
  };
}
