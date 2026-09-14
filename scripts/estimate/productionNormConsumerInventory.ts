import {
  buildEstimateNormItemForTemplateRow,
  getProductionExpandedTemplate10000,
  PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";
import {
  OWNED_DOMAIN_PHYSICAL_NORM_CONSUMER_ROUTES_V1,
} from "../../src/lib/estimate/ownedDomain/applyOwnedDomainPhysicalNormConsumersV1";

export type ProductionNormConsumerInventoryEntry = {
  work_group: string;
  templates_count: number;
  rows_count: number;
  work_basis_units: Record<string, number>;
  resource_output_units: Record<string, number>;
  registered_norm_binding_rows_count: number;
  registered_norm_ids: string[];
  invalid_registered_norm_bindings: string[];
  reachable_physical_norm_bindings_count: number;
  reachable_physical_norm_ids: string[];
  reachable_physical_norm_routes: string[];
  invalid_reachable_physical_norm_consumers: string[];
};

function increment(distribution: Record<string, number>, key: string): void {
  distribution[key] = (distribution[key] ?? 0) + 1;
}

function emptyEntry(workGroup: string): ProductionNormConsumerInventoryEntry {
  return {
    work_group: workGroup,
    templates_count: 0,
    rows_count: 0,
    work_basis_units: {},
    resource_output_units: {},
    registered_norm_binding_rows_count: 0,
    registered_norm_ids: [],
    invalid_registered_norm_bindings: [],
    reachable_physical_norm_bindings_count: 0,
    reachable_physical_norm_ids: [],
    reachable_physical_norm_routes: [],
    invalid_reachable_physical_norm_consumers: [],
  };
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
      const entry = inventory.get(norm.work_group) ?? emptyEntry(norm.work_group);
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

  const physicalConsumerRouteByNormId = new Map<string, string>();
  for (const route of OWNED_DOMAIN_PHYSICAL_NORM_CONSUMER_ROUTES_V1) {
    for (const binding of route.runtime_bindings) {
      const entry = inventory.get(binding.work_group) ?? emptyEntry(binding.work_group);
      const previousRoute = physicalConsumerRouteByNormId.get(binding.norm_id);
      if (previousRoute && previousRoute !== route.route_id) {
        entry.invalid_reachable_physical_norm_consumers.push(
          `physical_norm_consumer_route_duplicated:${binding.norm_id}:${previousRoute}:${route.route_id}`,
        );
      } else if (!previousRoute) {
        physicalConsumerRouteByNormId.set(binding.norm_id, route.route_id);
        entry.reachable_physical_norm_bindings_count += 1;
        entry.reachable_physical_norm_ids.push(binding.norm_id);
      }
      if (!entry.reachable_physical_norm_routes.includes(route.route_id)) {
        entry.reachable_physical_norm_routes.push(route.route_id);
      }
      inventory.set(binding.work_group, entry);
    }
  }

  return [...inventory.values()]
    .map((entry) => ({
      ...entry,
      registered_norm_ids: entry.registered_norm_ids.sort(),
      invalid_registered_norm_bindings: entry.invalid_registered_norm_bindings.sort(),
      reachable_physical_norm_ids: entry.reachable_physical_norm_ids.sort(),
      reachable_physical_norm_routes: entry.reachable_physical_norm_routes.sort(),
      invalid_reachable_physical_norm_consumers:
        entry.invalid_reachable_physical_norm_consumers.sort(),
    }))
    .sort((left, right) => left.work_group.localeCompare(right.work_group));
}
