export type LocalTaxPolicyStatus =
  | "TAX_INCLUDED_WITH_SOURCE"
  | "TAX_EXCLUDED_WITH_WARNING"
  | "TAX_UNKNOWN_REGION_REQUIRED"
  | "TAX_NOT_APPLICABLE_WITH_REASON";

export type LocalTaxPolicy = {
  status: LocalTaxPolicyStatus;
  label: string;
  sourceId?: string;
  sourceLabel?: string;
  sourceDate?: string;
  warning?: string;
};
