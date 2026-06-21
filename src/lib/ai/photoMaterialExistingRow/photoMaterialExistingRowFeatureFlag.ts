import { PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG } from "./photoMaterialExistingRowTypes";

export type PhotoMaterialRolloutStage =
  | "OFF"
  | "INTERNAL"
  | "TENANT_ALLOWLIST"
  | "PERCENT_10"
  | "PERCENT_50"
  | "PERCENT_100";

export type PhotoMaterialExistingRowFeaturePolicy = {
  flagName: typeof PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG;
  rolloutStage: PhotoMaterialRolloutStage;
  serverSideDisabled: boolean;
  internalUserIds: string[];
  tenantAllowlist: string[];
  percentBucket?: number;
};

export const PHOTO_MATERIAL_EXISTING_ROW_DEFAULT_POLICY: PhotoMaterialExistingRowFeaturePolicy = Object.freeze({
  flagName: PHOTO_MATERIAL_EXISTING_ROW_FEATURE_FLAG,
  rolloutStage: "OFF",
  serverSideDisabled: true,
  internalUserIds: [],
  tenantAllowlist: [],
  percentBucket: 0,
});

export function resolvePhotoMaterialExistingRowFeature(input: {
  policy?: PhotoMaterialExistingRowFeaturePolicy;
  userId: string;
  tenantId?: string | null;
  percentBucket?: number;
}) {
  const policy = input.policy ?? PHOTO_MATERIAL_EXISTING_ROW_DEFAULT_POLICY;
  const bucket = input.percentBucket ?? policy.percentBucket ?? 0;
  const serverDisabled = policy.serverSideDisabled || policy.rolloutStage === "OFF";
  const enabled = !serverDisabled && (
    policy.rolloutStage === "PERCENT_100" ||
    (policy.rolloutStage === "PERCENT_50" && bucket < 50) ||
    (policy.rolloutStage === "PERCENT_10" && bucket < 10) ||
    (policy.rolloutStage === "TENANT_ALLOWLIST" && Boolean(input.tenantId && policy.tenantAllowlist.includes(input.tenantId))) ||
    (policy.rolloutStage === "INTERNAL" && policy.internalUserIds.includes(input.userId))
  );
  return {
    flagName: policy.flagName,
    enabled,
    serverSideDisabled: serverDisabled,
    rolloutStage: policy.rolloutStage,
    killSwitchExists: true,
    clientFlagIsSecurityBoundary: false,
  };
}

export function assertPhotoMaterialExistingRowFeatureEnabled(input: {
  policy?: PhotoMaterialExistingRowFeaturePolicy;
  userId: string;
  tenantId?: string | null;
  percentBucket?: number;
}): void {
  const result = resolvePhotoMaterialExistingRowFeature(input);
  if (!result.enabled) throw new Error("PHOTO_MATERIAL_EXISTING_ROW_FEATURE_DISABLED");
}
