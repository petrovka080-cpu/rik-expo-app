export const PROFESSIONAL_WORK_READINESS_STATES = [
  "LEGACY_TECHNICAL_TEMPLATE", "INVENTORY_PLACEHOLDER", "SOURCE_IDENTIFIED",
  "PROFESSIONAL_WORK_DEFINED", "PARAMETER_CONTRACT_READY", "FORMULA_MODEL_READY",
  "INDEPENDENT_GOLDEN_READY", "DOMAIN_REVIEWED", "PRODUCT_PROVEN",
  "DEPRECATED_COMPATIBILITY_ONLY",
] as const;

export type EstimateSourceLicenseDecision = {
  licenseMode: string;
  storagePolicy: string;
  verificationStatus: string;
};

export function mayUseEstimateSourceInProduct(source: EstimateSourceLicenseDecision): boolean {
  return source.verificationStatus === "VERIFIED" &&
    !/PENDING|REQUIRED|UNKNOWN|REJECTED/i.test(source.licenseMode) &&
    !/FORBIDDEN|PRIVATE_DOCUMENT|RESTRICTED_COPY/i.test(source.storagePolicy);
}

export function deterministicNormalizedSourceHash(records: readonly unknown[]): string {
  const text = JSON.stringify(records);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
