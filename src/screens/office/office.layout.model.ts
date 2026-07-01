import type { OfficeAccessScreenData } from "./officeAccess.types";
import type { OfficeHubRoleAccessState } from "./useOfficeHubRoleAccess";

export type OfficeShellContentModel =
  {
    kind: "content";
    title: string;
    subtitle?: string;
    hasCompany: boolean;
    isInitialLoading: boolean;
    showOfficeDirections: boolean;
    showCompanyFeedback: boolean;
    showDeveloperOverride: boolean;
  };

export function buildOfficeShellContentModel(params: {
  loading: boolean;
  data: OfficeAccessScreenData;
  access: Pick<OfficeHubRoleAccessState, "entryCopy" | "officeCards">;
  companyFeedback: string | null;
}): OfficeShellContentModel {
  return {
    kind: "content",
    title: params.access.entryCopy.title,
    subtitle: params.data.company ? undefined : params.access.entryCopy.subtitle,
    hasCompany: Boolean(params.data.company),
    isInitialLoading: params.loading,
    showOfficeDirections:
      params.loading ||
      Boolean(params.data.company) ||
      Boolean(
        params.data.developerOverride?.isEnabled &&
          params.data.developerOverride.canAccessAllOfficeRoutes &&
          params.access.officeCards.length > 0,
      ),
    showCompanyFeedback: Boolean(params.companyFeedback),
    showDeveloperOverride: false,
  };
}
