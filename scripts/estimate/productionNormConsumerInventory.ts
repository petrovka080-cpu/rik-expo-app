import {
  buildEstimateNormItemForTemplateRow,
  getProductionExpandedTemplate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";

export type ProductionNormConsumerInventoryEntry = {
  work_group: string;
  templates_count: number;
  rows_count: number;
  work_basis_units: Record<string, number>;
  resource_output_units: Record<string, number>;
};

function increment(distribution: Record<string, number>, key: string): void {
  distribution[key] = (distribution[key] ?? 0) + 1;
}

export function inspectProductionNormConsumerInventory(): ProductionNormConsumerInventoryEntry[] {
  const inventory = new Map<string, ProductionNormConsumerInventoryEntry>();

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
      };
      entry.rows_count += 1;
      increment(entry.work_basis_units, norm.base_unit);
      increment(entry.resource_output_units, norm.unit);
      inventory.set(norm.work_group, entry);
      groupsInTemplate.add(norm.work_group);
    }

    for (const group of groupsInTemplate) {
      const entry = inventory.get(group);
      if (!entry) throw new Error(`PRODUCTION_NORM_CONSUMER_INVENTORY_GROUP_MISSING:${group}`);
      entry.templates_count += 1;
    }
  }

  return [...inventory.values()].sort((left, right) => left.work_group.localeCompare(right.work_group));
}
