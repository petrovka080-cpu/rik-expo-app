import { readFileSync } from "node:fs";
import path from "node:path";

export const LAYER_ORDER = [
  "L0_RUNTIME_BASELINE",
  "L1_REQUEST_PRODUCT_FLOW",
  "L2_CORE_RENOVATION_CALCULATORS",
  "L3_LEGACY_10000_CATALOG",
  "L4_EXPANDED_COMPLEX_WORKS",
  "L5_NPLUS_UNIFIED_CATALOG",
  "L6_TRUST_PRICEBOOK_GOVERNANCE",
  "L7_PDF_BUYER_HANDOFF",
  "L8_GOLDEN_BENCHMARK",
  "L9_WEB_ANDROID_CONTROLLED_PILOT",
  "L10_OBSERVABILITY_REGRESSION",
] as const;

export type EstimateLayerId = typeof LAYER_ORDER[number];

export type LayerRegistryEntry = {
  layer_id: EstimateLayerId;
  layer_name: string;
  description: string;
  depends_on: EstimateLayerId[];
  required_status: "GREEN";
  required_artifacts: string[];
  required_tests: string[];
  required_web_smokes: string[];
  required_android_smokes: string[];
  required_source_gates: string[];
  blocking_conditions: string[];
  owner_visible_status: string;
  can_claim_green_if_dependencies_fail: false;
};

export type RawLayerEvaluation = {
  layer_id: EstimateLayerId;
  passed: boolean;
  blockers: string[];
  evidence?: Record<string, unknown>;
};

export type FinalLayerStatus = {
  layer_id: EstimateLayerId;
  status: "GREEN" | "STOP" | "BLOCKED";
  passed: boolean;
  depends_on: EstimateLayerId[];
  blockers: string[];
  raw_passed: boolean;
  evidence?: Record<string, unknown>;
};

type LayerRegistryFile = {
  schema: "ai-estimate-layer-registry-v1";
  layers: LayerRegistryEntry[];
  acceptance: Record<string, unknown>;
};

type LayerDependenciesFile = {
  schema: "ai-estimate-layer-dependencies-v1";
  dependency_order: EstimateLayerId[];
  dependencies: Array<{ layer_id: EstimateLayerId; depends_on: EstimateLayerId[] }>;
  rules: Record<string, unknown>;
};

type LayerAcceptanceMatrixFile = {
  schema: "ai-estimate-layer-acceptance-matrix-v1";
  matrix: Array<{
    layer_id: EstimateLayerId;
    green_status: string;
    stop_status: string;
    required_gates: string[];
    blocking_conditions: string[];
  }>;
  global_rules: Record<string, unknown>;
  acceptance: Record<string, unknown>;
};

const REGISTRY_PATH = path.join("data", "estimate-governance", "estimate-layer-registry.json");
const DEPENDENCIES_PATH = path.join("data", "estimate-governance", "estimate-layer-dependencies.json");
const MATRIX_PATH = path.join("data", "estimate-governance", "estimate-layer-acceptance-matrix.json");

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function loadEstimateLayerRegistry(): LayerRegistryFile {
  return readJson<LayerRegistryFile>(REGISTRY_PATH);
}

export function loadEstimateLayerDependencies(): LayerDependenciesFile {
  return readJson<LayerDependenciesFile>(DEPENDENCIES_PATH);
}

export function loadEstimateLayerAcceptanceMatrix(): LayerAcceptanceMatrixFile {
  return readJson<LayerAcceptanceMatrixFile>(MATRIX_PATH);
}

export function dependencyMapFromFile(
  dependencies = loadEstimateLayerDependencies(),
): Record<EstimateLayerId, EstimateLayerId[]> {
  const map = LAYER_ORDER.reduce((acc, layerId) => {
    acc[layerId] = [];
    return acc;
  }, {} as Record<EstimateLayerId, EstimateLayerId[]>);
  for (const item of dependencies.dependencies) {
    map[item.layer_id] = item.depends_on;
  }
  return map;
}

function assertSameOrder(actual: readonly string[], expected: readonly string[], label: string): string[] {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index])
    ? []
    : [`${label}_order_mismatch`];
}

export function validateEstimateLayerConfig(): {
  layer_registry_created: true;
  layer_dependencies_created: true;
  layer_acceptance_matrix_created: true;
  every_layer_has_required_status: boolean;
  every_layer_has_blocking_conditions: boolean;
  upper_layer_cannot_green_if_lower_layer_failed: boolean;
  blockers: string[];
} {
  const registry = loadEstimateLayerRegistry();
  const dependencies = loadEstimateLayerDependencies();
  const matrix = loadEstimateLayerAcceptanceMatrix();
  const registryIds = registry.layers.map((layer) => layer.layer_id);
  const matrixIds = matrix.matrix.map((layer) => layer.layer_id);
  const dependencyIds = dependencies.dependencies.map((layer) => layer.layer_id);
  const registryById = new Map(registry.layers.map((layer) => [layer.layer_id, layer]));
  const dependencyMap = dependencyMapFromFile(dependencies);

  const everyLayerHasRequiredStatus = registry.layers.every((layer) => layer.required_status === "GREEN");
  const everyLayerHasBlockingConditions = registry.layers.every((layer) => layer.blocking_conditions.length > 0);
  const everyLayerRejectsDependencyGreen = registry.layers.every(
    (layer) => layer.can_claim_green_if_dependencies_fail === false,
  );
  const dependenciesMatchRegistry = LAYER_ORDER.every((layerId) => {
    const registryDependsOn = registryById.get(layerId)?.depends_on ?? [];
    const fileDependsOn = dependencyMap[layerId] ?? [];
    return registryDependsOn.length === fileDependsOn.length &&
      registryDependsOn.every((dep, index) => dep === fileDependsOn[index]);
  });

  const blockers = [
    registry.schema === "ai-estimate-layer-registry-v1" ? "" : "registry_schema_mismatch",
    dependencies.schema === "ai-estimate-layer-dependencies-v1" ? "" : "dependencies_schema_mismatch",
    matrix.schema === "ai-estimate-layer-acceptance-matrix-v1" ? "" : "matrix_schema_mismatch",
    ...assertSameOrder(registryIds, LAYER_ORDER, "registry"),
    ...assertSameOrder(dependencyIds, LAYER_ORDER, "dependencies"),
    ...assertSameOrder(dependencies.dependency_order, LAYER_ORDER, "dependency_order"),
    ...assertSameOrder(matrixIds, LAYER_ORDER, "matrix"),
    everyLayerHasRequiredStatus ? "" : "layer_required_status_missing",
    everyLayerHasBlockingConditions ? "" : "layer_blocking_conditions_missing",
    everyLayerRejectsDependencyGreen ? "" : "layer_allows_green_with_failed_dependency",
    dependenciesMatchRegistry ? "" : "dependencies_do_not_match_registry",
    matrix.global_rules.no_upper_green_when_lower_required_layer_failed === true
      ? ""
      : "matrix_missing_no_upper_green_rule",
    dependencies.rules.upper_layers_blocked_if_dependency_failed === true
      ? ""
      : "dependencies_missing_upper_block_rule",
  ].filter(Boolean);

  return {
    layer_registry_created: true,
    layer_dependencies_created: true,
    layer_acceptance_matrix_created: true,
    every_layer_has_required_status: everyLayerHasRequiredStatus,
    every_layer_has_blocking_conditions: everyLayerHasBlockingConditions,
    upper_layer_cannot_green_if_lower_layer_failed: everyLayerRejectsDependencyGreen && dependenciesMatchRegistry,
    blockers,
  };
}

export function applyEstimateLayerDependencies(
  rawLayers: RawLayerEvaluation[],
  dependencyMap = dependencyMapFromFile(),
): FinalLayerStatus[] {
  const rawByLayer = new Map(rawLayers.map((layer) => [layer.layer_id, layer]));
  const finalByLayer = new Map<EstimateLayerId, FinalLayerStatus>();

  for (const layerId of LAYER_ORDER) {
    const raw = rawByLayer.get(layerId) ?? {
      layer_id: layerId,
      passed: false,
      blockers: ["raw_layer_evaluation_missing"],
    };
    const failedDependencies = (dependencyMap[layerId] ?? []).filter((dependencyId) => {
      const dependency = finalByLayer.get(dependencyId);
      return dependency?.status !== "GREEN";
    });
    const status: FinalLayerStatus["status"] = failedDependencies.length > 0
      ? "BLOCKED"
      : raw.passed
        ? "GREEN"
        : "STOP";
    finalByLayer.set(layerId, {
      layer_id: layerId,
      status,
      passed: status === "GREEN",
      depends_on: dependencyMap[layerId] ?? [],
      blockers: [
        ...failedDependencies.map((dependencyId) => `dependency_failed:${dependencyId}`),
        ...(failedDependencies.length > 0 ? [] : raw.blockers),
      ],
      raw_passed: raw.passed,
      evidence: raw.evidence,
    });
  }

  return LAYER_ORDER.map((layerId) => finalByLayer.get(layerId)!);
}

export function assertUpperLayersNotGreenWithoutDependencies(layers: FinalLayerStatus[]): boolean {
  const byId = new Map(layers.map((layer) => [layer.layer_id, layer]));
  return layers.every((layer) =>
    layer.depends_on.every((dependencyId) => byId.get(dependencyId)?.status === "GREEN" || layer.status !== "GREEN")
  );
}

export function summarizeLayerDependencyResult(layers: FinalLayerStatus[]) {
  const firstFailed = layers.find((layer) => layer.status !== "GREEN") ?? null;
  const firstFailedIndex = firstFailed ? layers.findIndex((layer) => layer.layer_id === firstFailed.layer_id) : -1;
  return {
    first_failed_layer: firstFailed?.layer_id ?? null,
    blocking_reasons: firstFailed?.blockers ?? [],
    layers_passed_before_failure: firstFailedIndex < 0
      ? layers.map((layer) => layer.layer_id)
      : layers.slice(0, firstFailedIndex).filter((layer) => layer.status === "GREEN").map((layer) => layer.layer_id),
    layers_blocked_after_failure: firstFailedIndex < 0
      ? []
      : layers.slice(firstFailedIndex + 1).filter((layer) => layer.status !== "GREEN").map((layer) => layer.layer_id),
    all_layers_passed: layers.every((layer) => layer.status === "GREEN"),
    upper_layers_not_green_without_dependencies: assertUpperLayersNotGreenWithoutDependencies(layers),
  };
}

export function buildLayerDependencyMutationCase(failedLayerId: EstimateLayerId = "L1_REQUEST_PRODUCT_FLOW") {
  const raw = LAYER_ORDER.map((layerId): RawLayerEvaluation => ({
    layer_id: layerId,
    passed: layerId !== failedLayerId,
    blockers: layerId === failedLayerId ? [`forced_failure:${layerId}`] : [],
  }));
  const layers = applyEstimateLayerDependencies(raw);
  return {
    layers,
    ...summarizeLayerDependencyResult(layers),
  };
}

export function assertEstimateLayerDependenciesCli() {
  const config = validateEstimateLayerConfig();
  const mutation = buildLayerDependencyMutationCase("L1_REQUEST_PRODUCT_FLOW");
  const blockers = [
    ...config.blockers,
    mutation.first_failed_layer === "L1_REQUEST_PRODUCT_FLOW" ? "" : "mutation_first_failed_layer_wrong",
    mutation.layers.find((layer) => layer.layer_id === "L2_CORE_RENOVATION_CALCULATORS")?.status === "BLOCKED"
      ? ""
      : "mutation_upper_layer_not_blocked",
    mutation.upper_layers_not_green_without_dependencies ? "" : "mutation_upper_green_without_dependency",
  ].filter(Boolean);
  return {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_LAYER_DEPENDENCIES"
      : "STOP_AI_ESTIMATE_LAYER_DEPENDENCIES_FAILED",
    ...config,
    mutation_first_failed_layer: mutation.first_failed_layer,
    mutation_upper_layers_blocked: mutation.layers
      .filter((layer) => layer.layer_id !== "L0_RUNTIME_BASELINE" && layer.layer_id !== "L1_REQUEST_PRODUCT_FLOW")
      .every((layer) => layer.status === "BLOCKED"),
    blockers,
  };
}

if (require.main === module) {
  const summary = assertEstimateLayerDependenciesCli();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.blockers.length > 0) process.exitCode = 1;
}
