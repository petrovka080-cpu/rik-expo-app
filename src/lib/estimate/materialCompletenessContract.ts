import { estimateDeterministicHash } from "./estimateDeterministicHash";

export type MaterialRoleStatus =
  | "REQUIRED"
  | "CONDITIONAL_PRESENT"
  | "CONDITIONAL_NOT_APPLICABLE"
  | "PROHIBITED"
  | "MISSING_BLOCKER";

export type MaterialCompletenessRoleEvidence = {
  roleId: string;
  status: MaterialRoleStatus;
  rowIds: readonly string[];
  semanticOwnerIds: readonly string[];
  reason: string;
};

export type MaterialCompletenessContract = {
  contractId: string;
  contractVersion: "material-completeness-contract:v1";
  ownerWorkKey: string;
  scopeId: string;
  requiredMaterialRoles: readonly string[];
  conditionalMaterialRoles: readonly string[];
  forbiddenMaterialRoles: readonly string[];
  materialRoleConditions: Readonly<Record<string, string>>;
  materialRoleExclusionReasons: Readonly<Record<string, string>>;
};

export type MaterialCompletenessRow = {
  rowId: string;
  materialRoleId: string;
  semanticOwnerId: string;
  formulaId: string | null;
  sourceIds: readonly string[];
};

export type MaterialCompletenessEvaluation = {
  contractId: string;
  ownerWorkKey: string;
  scopeId: string;
  roleEvidence: readonly MaterialCompletenessRoleEvidence[];
  presentMaterialRoles: readonly string[];
  missingMaterialRoles: readonly string[];
  unexpectedMaterialRoles: readonly string[];
  duplicateMaterialOwners: readonly string[];
  formulaTraceMissingRowIds: readonly string[];
  sourceTraceMissingRowIds: readonly string[];
  status: "COMPLETE" | "BLOCKED";
  materialFingerprint: string;
};

export type CompleteEstimateCategory =
  | "materials"
  | "works"
  | "labor"
  | "equipment"
  | "services"
  | "logistics"
  | "laboratory"
  | "documentation";

export type CompleteEstimateCategoryEvidence = {
  ownerWorkKey: string;
  scopeId: string;
  category: CompleteEstimateCategory;
  status: "COMPLETE" | "NOT_APPLICABLE_WITH_REASON" | "BLOCKED";
  rowIds: readonly string[];
  exclusionReasonCode: string | null;
  reason: string;
  sourceContractOwner: string;
  evidenceFingerprint: string;
};

export type CompleteEstimateContract = {
  contractId: string;
  contractVersion: "complete-professional-estimate-contract:v1";
  ownerWorkKey: string;
  scopeId: string;
  requiredCategories: readonly CompleteEstimateCategory[];
  notApplicableReasons: Readonly<Partial<Record<CompleteEstimateCategory, string>>>;
};

export type CompleteEstimateEvaluation = {
  contractId: string;
  ownerWorkKey: string;
  categories: readonly CompleteEstimateCategoryEvidence[];
  pricingStatus: "QUANTITY_COMPLETE" | "PRICE_PARTIAL" | "PRICE_COMPLETE";
  overallEstimateStatus: "COMPLETE" | "BLOCKED";
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

/**
 * Domain-neutral, fail-closed material completeness evaluation. The evaluator
 * verifies an already-selected scope; it never inserts a material or infers
 * applicability on behalf of the domain compiler.
 */
export function evaluateMaterialCompleteness(input: {
  contract: MaterialCompletenessContract;
  rows: readonly MaterialCompletenessRow[];
  applicableConditionalRoles?: readonly string[];
}): MaterialCompletenessEvaluation {
  const applicableConditionalRoles = new Set(input.applicableConditionalRoles ?? []);
  const rowsByRole = new Map<string, MaterialCompletenessRow[]>();
  for (const row of input.rows) {
    rowsByRole.set(row.materialRoleId, [...(rowsByRole.get(row.materialRoleId) ?? []), row]);
  }
  const required = new Set(input.contract.requiredMaterialRoles);
  for (const role of applicableConditionalRoles) required.add(role);
  const presentMaterialRoles = uniqueSorted([...rowsByRole.keys()]);
  const missingMaterialRoles = uniqueSorted([...required].filter((role) => !rowsByRole.has(role)));
  const unexpectedMaterialRoles = uniqueSorted(
    input.contract.forbiddenMaterialRoles.filter((role) => rowsByRole.has(role)),
  );
  const duplicateMaterialOwners = uniqueSorted(
    [...rowsByRole.entries()].flatMap(([role, rows]) => {
      const owners = uniqueSorted(rows.map((row) => row.semanticOwnerId));
      return owners.length > 1 ? [role] : [];
    }),
  );
  const formulaTraceMissingRowIds = uniqueSorted(
    input.rows.filter((row) => !row.formulaId).map((row) => row.rowId),
  );
  const sourceTraceMissingRowIds = uniqueSorted(
    input.rows.filter((row) => row.sourceIds.length === 0).map((row) => row.rowId),
  );
  const allRoles = uniqueSorted([
    ...input.contract.requiredMaterialRoles,
    ...input.contract.conditionalMaterialRoles,
    ...input.contract.forbiddenMaterialRoles,
    ...presentMaterialRoles,
  ]);
  const roleEvidence = allRoles.map((role): MaterialCompletenessRoleEvidence => {
    const rows = rowsByRole.get(role) ?? [];
    const rowIds = uniqueSorted(rows.map((row) => row.rowId));
    const semanticOwnerIds = uniqueSorted(rows.map((row) => row.semanticOwnerId));
    if (input.contract.forbiddenMaterialRoles.includes(role)) {
      return {
        roleId: role,
        status: rows.length > 0 ? "MISSING_BLOCKER" : "PROHIBITED",
        rowIds,
        semanticOwnerIds,
        reason: rows.length > 0
          ? `Forbidden material role ${role} is present in scope ${input.contract.scopeId}.`
          : input.contract.materialRoleExclusionReasons[role] ?? `Role ${role} is prohibited for this scope.`,
      };
    }
    if (required.has(role)) {
      return {
        roleId: role,
        status: rows.length > 0 ? "REQUIRED" : "MISSING_BLOCKER",
        rowIds,
        semanticOwnerIds,
        reason: rows.length > 0
          ? `Required role ${role} is owned by the compiled scope.`
          : `Required material role ${role} is missing.`,
      };
    }
    return {
      roleId: role,
      status: rows.length > 0 ? "CONDITIONAL_PRESENT" : "CONDITIONAL_NOT_APPLICABLE",
      rowIds,
      semanticOwnerIds,
      reason: rows.length > 0
        ? input.contract.materialRoleConditions[role] ?? `Conditional role ${role} is applicable.`
        : input.contract.materialRoleExclusionReasons[role] ?? `Conditional role ${role} is not applicable.`,
    };
  });
  const status = missingMaterialRoles.length === 0 &&
    unexpectedMaterialRoles.length === 0 &&
    duplicateMaterialOwners.length === 0 &&
    formulaTraceMissingRowIds.length === 0 &&
    sourceTraceMissingRowIds.length === 0
    ? "COMPLETE" as const
    : "BLOCKED" as const;
  return Object.freeze({
    contractId: input.contract.contractId,
    ownerWorkKey: input.contract.ownerWorkKey,
    scopeId: input.contract.scopeId,
    roleEvidence: Object.freeze(roleEvidence),
    presentMaterialRoles: Object.freeze(presentMaterialRoles),
    missingMaterialRoles: Object.freeze(missingMaterialRoles),
    unexpectedMaterialRoles: Object.freeze(unexpectedMaterialRoles),
    duplicateMaterialOwners: Object.freeze(duplicateMaterialOwners),
    formulaTraceMissingRowIds: Object.freeze(formulaTraceMissingRowIds),
    sourceTraceMissingRowIds: Object.freeze(sourceTraceMissingRowIds),
    status,
    materialFingerprint: estimateDeterministicHash({
      contract: input.contract,
      rows: input.rows.map((row) => ({
        roleId: row.materialRoleId,
        rowId: row.rowId,
        owner: row.semanticOwnerId,
        formulaId: row.formulaId,
        sourceIds: [...row.sourceIds].sort(),
      })),
      applicableConditionalRoles: uniqueSorted([...applicableConditionalRoles]),
    }),
  });
}

/** A complete estimate may explicitly mark a category N/A, but never silently. */
export function evaluateCompleteEstimate(input: {
  contract: CompleteEstimateContract;
  rowIdsByCategory: Readonly<Partial<Record<CompleteEstimateCategory, readonly string[]>>>;
  pricingStatus: CompleteEstimateEvaluation["pricingStatus"];
  materialEvaluation: MaterialCompletenessEvaluation;
}): CompleteEstimateEvaluation {
  const categories = input.contract.requiredCategories.map((category): CompleteEstimateCategoryEvidence => {
    const rowIds = uniqueSorted(input.rowIdsByCategory[category] ?? []);
    const evidence = (status: CompleteEstimateCategoryEvidence["status"], reason: string, exclusionReasonCode: string | null) => ({
      ownerWorkKey: input.contract.ownerWorkKey,
      scopeId: input.contract.scopeId,
      category,
      status,
      rowIds,
      exclusionReasonCode,
      reason,
      sourceContractOwner: input.contract.contractId,
      evidenceFingerprint: estimateDeterministicHash({
        ownerWorkKey: input.contract.ownerWorkKey,
        scopeId: input.contract.scopeId,
        category,
        status,
        rowIds,
        exclusionReasonCode,
        reason,
        sourceContractOwner: input.contract.contractId,
      }),
    });
    if (category === "materials" && input.materialEvaluation.status !== "COMPLETE") {
      return evidence("BLOCKED", "MaterialCompletenessContract is RED.", "MATERIAL_COMPLETENESS_RED");
    }
    if (rowIds.length > 0) {
      return evidence("COMPLETE", `Compiled rows cover ${category}.`, null);
    }
    const reason = input.contract.notApplicableReasons[category]?.trim() ?? "";
    return reason
      ? evidence("NOT_APPLICABLE_WITH_REASON", reason, "CATEGORY_NOT_APPLICABLE_BY_EXACT_SCOPE")
      : evidence("BLOCKED", `No rows or explicit N/A reason for ${category}.`, "CATEGORY_EVIDENCE_MISSING");
  });
  return Object.freeze({
    contractId: input.contract.contractId,
    ownerWorkKey: input.contract.ownerWorkKey,
    categories: Object.freeze(categories),
    pricingStatus: input.pricingStatus,
    overallEstimateStatus: categories.every((category) => category.status !== "BLOCKED") &&
      input.materialEvaluation.status === "COMPLETE"
      ? "COMPLETE"
      : "BLOCKED",
  });
}
