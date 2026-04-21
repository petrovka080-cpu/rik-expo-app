import { COPY } from "./officeHub.constants";
import type { OfficeAccessScreenData } from "./officeAccess.types";
import type { OfficeHubRoleAccessState } from "./useOfficeHubRoleAccess";

export type OfficeShellContentModel =
  | {
      kind: "loading";
      title: string;
      subtitle: string;
      helper: string;
    }
  | {
      kind: "content";
      title: string;
      subtitle?: string;
      hasCompany: boolean;
      showCompanyFeedback: boolean;
      showDeveloperOverride: boolean;
    };

export function buildOfficeShellContentModel(params: {
  loading: boolean;
  data: OfficeAccessScreenData;
  access: Pick<OfficeHubRoleAccessState, "entryCopy">;
  companyFeedback: string | null;
}): OfficeShellContentModel {
  if (params.loading) {
    return {
      kind: "loading",
      title: COPY.title,
      subtitle: COPY.loadingSubtitle,
      helper: COPY.loading,
    };
  }

  return {
    kind: "content",
    title: params.access.entryCopy.title,
    subtitle: params.data.company ? undefined : params.access.entryCopy.subtitle,
    hasCompany: Boolean(params.data.company),
    showCompanyFeedback: Boolean(params.companyFeedback),
    showDeveloperOverride: Boolean(params.data.developerOverride?.isEnabled),
  };
}
