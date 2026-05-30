import type { DynamicProfessionalBoq, DynamicProfessionalBoqRow } from "../estimatorKernel/estimatorKernelTypes";
import { resolveInfrastructureBoqDepthPolicy } from "./buildInfrastructureBoqDepthPolicy";

export type InfrastructureBoqDepthValidation = {
  passed: boolean;
  minimumRows: number;
  rowCount: number;
  blockers: string[];
};

function hasSection(rows: readonly DynamicProfessionalBoqRow[], sectionType: DynamicProfessionalBoqRow["sectionType"]): boolean {
  return rows.some((row) => row.sectionType === sectionType);
}

export function validateInfrastructureBoqDepth(boq: DynamicProfessionalBoq): InfrastructureBoqDepthValidation {
  const policy = resolveInfrastructureBoqDepthPolicy(boq.plan);
  if (!policy) {
    return { passed: true, minimumRows: 0, rowCount: boq.rows.length, blockers: [] };
  }

  const rowCodes = boq.rows.map((row) => row.code).join("\n");
  const genericPaddingRows = boq.rows
    .filter((row) => row.code.startsWith("assurance_"))
    .map((row) => row.code);
  const blockers = [
    ...(boq.rows.length < policy.minimumRows ? [`INFRASTRUCTURE_BOQ_DEPTH_TOO_SHORT:${boq.rows.length}<${policy.minimumRows}`] : []),
    ...(genericPaddingRows.length > 0 ? [`INFRASTRUCTURE_GENERIC_PADDING_FOUND:${genericPaddingRows.join("|")}`] : []),
    ...policy.requiredSections
      .filter((sectionType) => !hasSection(boq.rows, sectionType))
      .map((sectionType) => `INFRASTRUCTURE_SECTION_MISSING:${sectionType}`),
    ...policy.requiredCodeTokens
      .filter((token) => !rowCodes.includes(token))
      .map((token) => `INFRASTRUCTURE_REQUIRED_ROW_TOKEN_MISSING:${token}`),
  ];

  return {
    passed: blockers.length === 0,
    minimumRows: policy.minimumRows,
    rowCount: boq.rows.length,
    blockers,
  };
}
