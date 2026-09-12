import {
  buildEstimateNormItemForTemplateRow,
  getProductionExpandedTemplate10000,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";

export type ProductionNormConsumerInventoryEntry = {
  work_group: string;
  templates_count: number;
  rows_count: number;
  work_basis_units: Record<string, number>;
  resource_output_units: Record<string, number>;
  registered_norm_binding_rows_count: number;
  registered_norm_ids: string[];
  invalid_registered_norm_bindings: string[];
};

function increment(distribution: Record<string, number>, key: string): void {
  distribution[key] = (distribution[key] ?? 0) + 1;
}

export function inspectProductionNormConsumerInventory(): ProductionNormConsumerInventoryEntry[] {
  const inventory = new Map<string, ProductionNormConsumerInventoryEntry>();
  const registeredBySourceId = new Map(
    PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.map((item) => [item.sourceId, item]),
  );
  const usedRegisteredSourceIds = new Set<string>();

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const groupsInTemplate = new Set<string>();
    const template = getProductionExpandedTemplate10000(definition.workKey);

    for (const row of template.rows) {
      const norm = buildEstimateNormItemForTemplateRow(definition, row);
      const entry = inventory.get(norm.work_group) ?? {
        work_group: norm.work_group,
        templates_count: 0,
        rows_count: 0,
        work_basis_units: {},
        resource_output_units: {},
        registered_norm_binding_rows_count: 0,
        registered_norm_ids: [],
        invalid_registered_norm_bindings: [],
      };
      entry.rows_count += 1;
      increment(entry.work_basis_units, norm.base_unit);
      increment(entry.resource_output_units, norm.unit);
      const registered = registeredBySourceId.get(norm.source_id);
      if (registered) {
        entry.registered_norm_binding_rows_count += 1;
        usedRegisteredSourceIds.add(registered.sourceId);
        if (!entry.registered_norm_ids.includes(registered.normId)) {
          entry.registered_norm_ids.push(registered.normId);
        }
        if (norm.base_unit !== registered.workBasisUnit) {
          const failure = `work_basis_unit_mismatch:${registered.normId}:${norm.base_unit}->${registered.workBasisUnit}`;
          if (!entry.invalid_registered_norm_bindings.includes(failure)) {
            entry.invalid_registered_norm_bindings.push(failure);
          }
        }
      }
      inventory.set(norm.work_group, entry);
      groupsInTemplate.add(norm.work_group);
    }

    for (const group of groupsInTemplate) {
      const entry = inventory.get(group);
      if (!entry) throw new Error(`PRODUCTION_NORM_CONSUMER_INVENTORY_GROUP_MISSING:${group}`);
      entry.templates_count += 1;
    }
  }

  for (const registered of PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS) {
    if (usedRegisteredSourceIds.has(registered.sourceId)) continue;
    const entry = inventory.get(registered.workGroup);
    if (!entry) throw new Error(`PRODUCTION_NORM_CONSUMER_INVENTORY_GROUP_MISSING:${registered.workGroup}`);
    entry.invalid_registered_norm_bindings.push(`registered_norm_binding_unused:${registered.normId}`);
  }

  return [...inventory.values()]
    .map((entry) => ({
      ...entry,
      registered_norm_ids: entry.registered_norm_ids.sort(),
      invalid_registered_norm_bindings: entry.invalid_registered_norm_bindings.sort(),
    }))
    .sort((left, right) => left.work_group.localeCompare(right.work_group));
}
