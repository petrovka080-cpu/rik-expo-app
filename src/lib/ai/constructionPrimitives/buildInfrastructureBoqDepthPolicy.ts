import type { DynamicProfessionalBoqRow, EstimatorReasoningPlan } from "../estimatorKernel/estimatorKernelTypes";

export const INFRASTRUCTURE_BOQ_MINIMUM_ROWS = 45;

export type InfrastructureBoqDepthWorkKind =
  | "paving_stone"
  | "drainage_channel";

export type InfrastructureBoqDepthPolicy = {
  workKind: InfrastructureBoqDepthWorkKind;
  minimumRows: number;
  requiredSections: readonly DynamicProfessionalBoqRow["sectionType"][];
  requiredCodeTokens: readonly string[];
};

const POLICIES: Record<InfrastructureBoqDepthWorkKind, InfrastructureBoqDepthPolicy> = {
  paving_stone: {
    workKind: "paving_stone",
    minimumRows: INFRASTRUCTURE_BOQ_MINIMUM_ROWS,
    requiredSections: ["labor", "materials", "equipment", "delivery"],
    requiredCodeTokens: [
      "marking",
      "excavation",
      "geotextile",
      "sand",
      "crushed_stone",
      "curb",
      "paving_stone",
      "compaction",
      "slope",
      "quality",
    ],
  },
  drainage_channel: {
    workKind: "drainage_channel",
    minimumRows: INFRASTRUCTURE_BOQ_MINIMUM_ROWS,
    requiredSections: ["labor", "materials", "equipment", "delivery"],
    requiredCodeTokens: [
      "route",
      "slope",
      "excavation",
      "geotextile",
      "sand",
      "crushed_stone",
      "concrete",
      "channel",
      "grate",
      "outlet",
      "water_test",
    ],
  },
};

export function resolveInfrastructureBoqDepthPolicy(
  plan: EstimatorReasoningPlan,
): InfrastructureBoqDepthPolicy | null {
  const object = plan.semanticFrame.object;
  if (object === "paving_stone") return POLICIES.paving_stone;
  if (object === "drainage_channel") return POLICIES.drainage_channel;
  return null;
}
