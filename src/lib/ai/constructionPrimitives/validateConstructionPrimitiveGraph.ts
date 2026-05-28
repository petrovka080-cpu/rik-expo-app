import type { ConstructionPrimitiveGraph, ConstructionPrimitiveGraphValidation } from "./constructionPrimitiveTypes";
import { CONSTRUCTION_PRIMITIVE_DOMAINS } from "./constructionDomainPrimitives";
import { CONSTRUCTION_MATERIAL_SYSTEM_PRIMITIVES } from "./constructionMaterialSystemPrimitives";
import { CONSTRUCTION_METHOD_PRIMITIVES } from "./constructionMethodPrimitives";
import { CONSTRUCTION_OBJECT_PRIMITIVES } from "./constructionObjectPrimitives";
import { CONSTRUCTION_OPERATION_PRIMITIVES } from "./constructionOperationPrimitives";

export function buildConstructionPrimitiveGraph(): ConstructionPrimitiveGraph {
  return {
    domains: [...CONSTRUCTION_PRIMITIVE_DOMAINS],
    objects: [...CONSTRUCTION_OBJECT_PRIMITIVES],
    operations: [...CONSTRUCTION_OPERATION_PRIMITIVES],
    methods: [...CONSTRUCTION_METHOD_PRIMITIVES],
    materialSystems: [...CONSTRUCTION_MATERIAL_SYSTEM_PRIMITIVES],
  };
}

export function validateConstructionPrimitiveGraph(
  graph: ConstructionPrimitiveGraph = buildConstructionPrimitiveGraph(),
): ConstructionPrimitiveGraphValidation {
  const failures: string[] = [];
  const materialPolicies = new Map(graph.materialSystems.map((item) => [item.key, item.catalogPolicy]));

  for (const domain of graph.domains) {
    if (domain.objects.length === 0) failures.push(`DOMAIN_WITHOUT_OBJECTS:${domain.domain}`);
    if (domain.operations.length === 0) failures.push(`DOMAIN_WITHOUT_OPERATIONS:${domain.domain}`);
    if (domain.methods.length === 0) failures.push(`DOMAIN_WITHOUT_METHODS:${domain.domain}`);
    if (domain.requiredBoqGroups.length === 0) failures.push(`DOMAIN_WITHOUT_BOQ_GROUPS:${domain.domain}`);
    if (domain.units.length === 0) failures.push(`DOMAIN_WITHOUT_UNITS:${domain.domain}`);
    if (domain.formulaCandidates.length === 0) failures.push(`DOMAIN_WITHOUT_FORMULA_CANDIDATES:${domain.domain}`);
    for (const materialSystem of domain.materialSystems) {
      if (!materialPolicies.get(materialSystem)) {
        failures.push(`DOMAIN_REFERENCES_MATERIAL_SYSTEM_WITHOUT_CATALOG_POLICY:${domain.domain}:${materialSystem}`);
      }
    }
  }

  for (const object of graph.objects) {
    if (object.operations.length === 0) failures.push(`OBJECT_WITHOUT_OPERATIONS:${object.object}`);
  }

  for (const operation of graph.operations) {
    if (operation.requiredBoqGroups.length === 0) failures.push(`OPERATION_WITHOUT_BOQ_GROUPS:${operation.operation}`);
  }

  for (const method of graph.methods) {
    if (method.unitPolicy.length === 0) failures.push(`METHOD_WITHOUT_UNIT_POLICY:${method.method}`);
    if (method.formulaPolicy.length === 0) failures.push(`METHOD_WITHOUT_FORMULA_POLICY:${method.method}`);
  }

  for (const system of graph.materialSystems) {
    if (system.materialKeys.length === 0) failures.push(`MATERIAL_SYSTEM_WITHOUT_MATERIAL_KEYS:${system.key}`);
    if (!system.catalogPolicy) failures.push(`MATERIAL_SYSTEM_WITHOUT_CATALOG_POLICY:${system.key}`);
  }

  const domainsWithObjectsOperationsMethods = graph.domains.filter(
    (domain) => domain.objects.length > 0 && domain.operations.length > 0 && domain.methods.length > 0,
  ).length;

  return {
    passed: failures.length === 0,
    failures,
    domainsTotal: graph.domains.length,
    domainsWithObjectsOperationsMethods,
  };
}
