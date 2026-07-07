import type { EstimateDraftRevision } from "./estimateDraftRevisionContract";

export type UserParamPatchOperation =
  | "update_param"
  | "add_param"
  | "remove_param"
  | "replace_assumption";

export type UserParamPatch = {
  revisionId: string;
  selectedTemplateId: string;
  operation: UserParamPatchOperation;
  paramKey: string;
  rawValue: string;
  parsedValue: number | string | boolean;
  inputUnit?: string;
  canonicalUnit?: string;
};

export type UserParamPatchValidation = {
  valid: boolean;
  failures: string[];
};

export function validateUserParamPatch(
  revision: EstimateDraftRevision,
  patch: UserParamPatch,
): UserParamPatchValidation {
  const failures = [
    patch.revisionId === revision.revisionId ? "" : "revision_id_mismatch",
    patch.selectedTemplateId === revision.selectedTemplateId ? "" : "selected_template_id_mismatch",
    patch.paramKey.trim() ? "" : "param_key_missing",
    patch.operation === "remove_param" || patch.rawValue.trim() ? "" : "raw_value_missing",
    patch.operation === "remove_param" || patch.parsedValue !== "" ? "" : "parsed_value_missing",
    patch.operation !== "update_param" || revision.params[patch.paramKey] ? "" : "cannot_update_missing_param",
    patch.operation !== "replace_assumption" || revision.assumptions.some((assumption) => assumption.key === patch.paramKey)
      ? ""
      : "cannot_replace_missing_assumption",
  ].filter(Boolean);

  return {
    valid: failures.length === 0,
    failures,
  };
}

export function assertValidUserParamPatch(
  revision: EstimateDraftRevision,
  patch: UserParamPatch,
): void {
  const validation = validateUserParamPatch(revision, patch);
  if (!validation.valid) {
    throw new Error(`USER_PARAM_PATCH_INVALID:${validation.failures.join(",")}`);
  }
}
