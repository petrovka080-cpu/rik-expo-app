import { FOREMAN_DROPDOWN_FIELD_KEYS } from "./foreman.dropdown.constants";
import type { FormContextUiModel } from "./foreman.locator.adapter";

export type ForemanHeaderRequirementKey = "foreman" | "object" | "locator";
export type ForemanHeaderFocusKey =
  | "foreman"
  | (typeof FOREMAN_DROPDOWN_FIELD_KEYS)[keyof typeof FOREMAN_DROPDOWN_FIELD_KEYS];

export type ForemanMissingHeaderField = {
  key: ForemanHeaderRequirementKey;
  label: string;
  focusKey: ForemanHeaderFocusKey;
};

export type ForemanHeaderRequirementResult = {
  missing: ForemanMissingHeaderField[];
  focusKey: ForemanHeaderFocusKey | null;
  message: string;
};

export type ForemanHeaderAttentionState = {
  version: number;
  missingKeys: ForemanHeaderRequirementKey[];
  focusKey: ForemanHeaderFocusKey | null;
  message: string;
};

export function resolveForemanHeaderRequirements(params: {
  foreman: string;
  objectType: string;
  level: string;
  formUi: FormContextUiModel;
}): ForemanHeaderRequirementResult {
  const missing: ForemanMissingHeaderField[] = [];

  if (!String(params.foreman || "").trim()) {
    missing.push({
      key: "foreman",
      label: "ФИО прораба",
      focusKey: "foreman",
    });
  }

  if (!String(params.objectType || "").trim()) {
    missing.push({
      key: "object",
      label: "Объект / Блок",
      focusKey: FOREMAN_DROPDOWN_FIELD_KEYS.object,
    });
  }

  if (!params.formUi.locator.isHidden && !String(params.level || "").trim()) {
    missing.push({
      key: "locator",
      label: params.formUi.locator.label,
      focusKey: FOREMAN_DROPDOWN_FIELD_KEYS.locator,
    });
  }

  const labels = missing.map((item) => item.label);

  return {
    missing,
    focusKey: missing[0]?.focusKey ?? null,
    message: labels.length ? `Сначала заполните обязательные поля: ${labels.join(", ")}.` : "",
  };
}
