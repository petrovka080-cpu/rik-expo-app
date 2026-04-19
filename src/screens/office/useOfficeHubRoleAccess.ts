import { useCallback, useMemo } from "react";

import { buildAppAccessModel } from "../../lib/appAccessModel";
import type { OfficePostReturnProbe } from "../../lib/navigation/officeReentryBreadcrumbs";
import { getProfileRoleLabel } from "../profile/profile.helpers";
import {
  buildOfficeAccessEntryCopy,
  canManageOfficeCompanyAccess,
  filterOfficeWorkspaceCards,
} from "./officeAccess.model";
import type { OfficeAccessScreenData } from "./officeAccess.types";
import {
  COPY,
  getVisibleCompanyDetails,
  getVisiblePostReturnSections,
  type CompanyPostReturnSectionKey,
} from "./officeHub.constants";

type OfficeHubAccessStatusTone = "neutral" | "success" | "warning";

export type OfficeHubRoleAccessState = {
  accessStatus: {
    label: string;
    tone: OfficeHubAccessStatusTone;
  };
  canManageCompany: boolean;
  entryCopy: ReturnType<typeof buildOfficeAccessEntryCopy>;
  officeCards: ReturnType<typeof filterOfficeWorkspaceCards>;
  officeRoles: string[];
  roleLabel: string;
  shouldRenderCompanyPostReturnSection: (
    section: CompanyPostReturnSectionKey,
  ) => boolean;
  summaryMeta: string;
  visibleCompanyDetails: ReturnType<typeof getVisibleCompanyDetails>;
  visibleRoleLabel: string | null;
};

export function useOfficeHubRoleAccess(
  data: OfficeAccessScreenData,
  activePostReturnProbe: readonly OfficePostReturnProbe[],
): OfficeHubRoleAccessState {
  const accessModel = useMemo(
    () => buildAppAccessModel(data.accessSourceSnapshot),
    [data.accessSourceSnapshot],
  );

  const entryCopy = useMemo(
    () =>
      buildOfficeAccessEntryCopy({
        hasOfficeAccess: accessModel.hasOfficeAccess,
        hasCompanyContext: accessModel.hasCompanyContext,
      }),
    [accessModel.hasCompanyContext, accessModel.hasOfficeAccess],
  );

  const officeRoles = useMemo(
    () =>
      Array.from(
        new Set(
          [...accessModel.availableOfficeRoles, data.companyAccessRole]
            .filter((role): role is string => Boolean(role))
            .map((role) => String(role).trim().toLowerCase()),
        ),
      ),
    [accessModel.availableOfficeRoles, data.companyAccessRole],
  );

  const canManageCompany = useMemo(
    () =>
      canManageOfficeCompanyAccess({
        currentUserId: data.currentUserId,
        companyOwnerUserId: data.company?.owner_user_id,
        companyAccessRole: data.companyAccessRole,
        availableOfficeRoles: officeRoles,
      }),
    [
      data.currentUserId,
      data.company?.owner_user_id,
      data.companyAccessRole,
      officeRoles,
    ],
  );

  const officeCards = useMemo(
    () =>
      filterOfficeWorkspaceCards({
        availableOfficeRoles: officeRoles,
        includeDirectorOwnedDirections: canManageCompany,
      }),
    [canManageCompany, officeRoles],
  );

  const roleLabel = useMemo(
    () =>
      getProfileRoleLabel(
        data.companyAccessRole ||
          accessModel.activeOfficeRole ||
          data.profileRole,
      ),
    [accessModel.activeOfficeRole, data.companyAccessRole, data.profileRole],
  );

  const accessStatus = accessModel.hasOfficeAccess
    ? { label: COPY.accessReady, tone: "success" as const }
    : data.company
      ? { label: COPY.accessPending, tone: "warning" as const }
      : { label: COPY.accessClosed, tone: "neutral" as const };

  const summaryMeta = useMemo(() => {
    if (!data.company) return "";
    return [data.company.industry, data.company.phone_main, data.company.email]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" • ");
  }, [data.company]);

  const visibleCompanyDetails = useMemo(
    () => getVisibleCompanyDetails(data.company),
    [data.company],
  );

  const visiblePostReturnSections = useMemo(
    () => new Set(getVisiblePostReturnSections(data, activePostReturnProbe)),
    [activePostReturnProbe, data],
  );

  const visibleRoleLabel =
    roleLabel && roleLabel !== COPY.noRole ? roleLabel : null;

  const shouldRenderCompanyPostReturnSection = useCallback(
    (section: CompanyPostReturnSectionKey) =>
      visiblePostReturnSections.has(section),
    [visiblePostReturnSections],
  );

  return {
    accessStatus,
    canManageCompany,
    entryCopy,
    officeCards,
    officeRoles,
    roleLabel,
    shouldRenderCompanyPostReturnSection,
    summaryMeta,
    visibleCompanyDetails,
    visibleRoleLabel,
  };
}
