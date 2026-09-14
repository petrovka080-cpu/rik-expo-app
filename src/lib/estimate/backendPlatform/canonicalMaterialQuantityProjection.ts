import type { ProfessionalBoqRow } from "../estimateDraftRevisionContract";
import {
  PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1,
  type ProfessionalMaterialQuantityBasisV1,
  type ProfessionalMaterialType,
} from "../professionalMaterialQuantityContract";

export const CANONICAL_MATERIAL_QUANTITY_POLICY_VERSION_V1 =
  "canonical-material-quantity-policy:v1" as const;

type CanonicalMaterialQuantityPolicyV1 = {
  version: typeof CANONICAL_MATERIAL_QUANTITY_POLICY_VERSION_V1;
  basisVersion: typeof PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1;
  materialType: ProfessionalMaterialType;
  unit: string;
  wastePercent: number;
  lossPercent: number;
  procurementUnit: string;
  procurementPackageSize: number;
  formula: string;
  formulaInputs: Record<string, string | number | boolean | null>;
  sourceId: string;
  citationLabel: string;
  quantityDependsOnParams: string[];
};

function record(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

type CanonicalMaterialQuantityProjectionInput = Pick<
  ProfessionalBoqRow,
  "rowId" | "quantity" | "sourceParameters"
>;

function policyFromRow(row: CanonicalMaterialQuantityProjectionInput): CanonicalMaterialQuantityPolicyV1 | null {
  const source = record(row.sourceParameters);
  const smart = record(source?.smartEstimateProjectionV2);
  const formulaExplanation = record(smart?.formulaExplanation);
  const resourceGraph = record(
    formulaExplanation?.resourceGraph ?? source?.professionalResourceGraphV3 ?? source?.resourceGraph,
  );
  const candidate = record(resourceGraph?.professionalMaterialQuantityPolicyV1);
  if (!candidate) return null;
  const policy = candidate as Partial<CanonicalMaterialQuantityPolicyV1>;
  const formulaInputs = record(policy.formulaInputs);
  if (
    policy.version !== CANONICAL_MATERIAL_QUANTITY_POLICY_VERSION_V1 ||
    policy.basisVersion !== PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1 ||
    typeof policy.materialType !== "string" || !policy.materialType ||
    typeof policy.unit !== "string" || !policy.unit.trim() ||
    typeof policy.procurementUnit !== "string" || !policy.procurementUnit.trim() ||
    typeof policy.formula !== "string" || !policy.formula.trim() ||
    typeof policy.sourceId !== "string" || !policy.sourceId.trim() ||
    typeof policy.citationLabel !== "string" || !policy.citationLabel.trim() ||
    typeof policy.wastePercent !== "number" || !Number.isFinite(policy.wastePercent) || policy.wastePercent < 0 ||
    typeof policy.lossPercent !== "number" || !Number.isFinite(policy.lossPercent) || policy.lossPercent < 0 ||
    typeof policy.procurementPackageSize !== "number" ||
      !Number.isFinite(policy.procurementPackageSize) || policy.procurementPackageSize <= 0 ||
    !formulaInputs || Object.values(formulaInputs).some((value) =>
      value !== null && !["string", "number", "boolean"].includes(typeof value)) ||
    !Array.isArray(policy.quantityDependsOnParams) ||
      policy.quantityDependsOnParams.some((value) => typeof value !== "string" || !value.trim())
  ) {
    throw new Error(`CANONICAL_MATERIAL_QUANTITY_POLICY_INVALID:${row.rowId}`);
  }
  return policy as CanonicalMaterialQuantityPolicyV1;
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

export function canonicalMaterialQuantityBasisFromRow(
  row: CanonicalMaterialQuantityProjectionInput,
): ProfessionalMaterialQuantityBasisV1 | null {
  const policy = policyFromRow(row);
  if (!policy) return null;
  const netQuantity = round(row.quantity);
  if (!Number.isFinite(netQuantity) || netQuantity <= 0) {
    throw new Error(`CANONICAL_MATERIAL_QUANTITY_POLICY_INVALID:${row.rowId}:net_quantity`);
  }
  const grossQuantity = round(
    netQuantity * (1 + (policy.wastePercent + policy.lossPercent) / 100),
  );
  const procurementQuantity = round(
    Math.ceil((grossQuantity - 1e-9) / policy.procurementPackageSize) * policy.procurementPackageSize,
  );
  return {
    version: PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1,
    materialType: policy.materialType,
    unit: policy.unit,
    netQuantity,
    wastePercent: policy.wastePercent,
    lossPercent: policy.lossPercent,
    grossQuantity,
    procurementUnit: policy.procurementUnit,
    procurementPackageSize: policy.procurementPackageSize,
    procurementQuantity,
    formula: policy.formula,
    formulaInputs: { ...policy.formulaInputs },
    sourceId: policy.sourceId,
    citationLabel: policy.citationLabel,
    calculationTrace: [
      `net=${netQuantity} ${policy.unit}`,
      `waste=${policy.wastePercent}%`,
      `loss=${policy.lossPercent}%`,
      `gross=${grossQuantity} ${policy.unit}`,
      `package=${policy.procurementPackageSize} ${policy.procurementUnit}`,
      `procurement=${procurementQuantity} ${policy.procurementUnit}`,
      `source=${policy.sourceId}`,
    ].join("; "),
    quantityDependsOnParams: [...policy.quantityDependsOnParams],
  };
}
