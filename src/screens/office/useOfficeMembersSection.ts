/**
 * useOfficeMembersSection - owner hook for the OfficeHub members section.
 *
 * Owns:
 *  - visible members list
 *  - members pagination contract
 *  - loading-more indicator
 *  - savingRole indicator
 *  - handleLoadMore handler
 *  - handleAssignRole handler
 */
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { mergeOfficeMembersPages } from "./officeAccess.types";
import type {
  OfficeAccessMember,
  OfficeAccessScreenData,
  OfficeMembersPagination,
} from "./officeAccess.types";
import {
  loadOfficeMembersPage,
  updateOfficeMemberRole,
} from "./officeAccess.services";
import { COPY, type LoadScreenMode } from "./officeHub.constants";

type UseOfficeMembersSectionArgs = {
  company: OfficeAccessScreenData["company"];
  initialMembers: OfficeAccessMember[];
  initialMembersPagination: OfficeMembersPagination;
  loadScreen: (opts?: { mode?: LoadScreenMode }) => Promise<unknown>;
};

export function useOfficeMembersSection({
  company,
  initialMembers,
  initialMembersPagination,
  loadScreen,
}: UseOfficeMembersSectionArgs) {
  const [items, setItems] = useState<OfficeAccessMember[]>(initialMembers);
  const [pagination, setPagination] = useState<OfficeMembersPagination>(
    initialMembersPagination,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialMembers);
    setPagination(initialMembersPagination);
    setLoadingMore(false);
  }, [initialMembers, initialMembersPagination]);

  const handleLoadMore = useCallback(async () => {
    if (!company || loadingMore || !pagination.hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = await loadOfficeMembersPage({
        company,
        limit: pagination.limit,
        offset: pagination.nextOffset,
      });
      setItems((current) => mergeOfficeMembersPages(current, nextPage.members));
      setPagination(nextPage.membersPagination);
    } catch (error: unknown) {
      Alert.alert(
        COPY.title,
        error instanceof Error && error.message.trim()
          ? error.message
          : COPY.membersLoadMoreError,
      );
    } finally {
      setLoadingMore(false);
    }
  }, [company, loadingMore, pagination]);

  const handleAssignRole = useCallback(
    async (memberUserId: string, nextRole: string) => {
      if (!company) return;
      try {
        setSavingRole(`${memberUserId}:${nextRole}`);
        await updateOfficeMemberRole({
          companyId: company.id,
          memberUserId,
          nextRole,
        });
        await loadScreen({
          mode: "refresh",
        });
      } catch (error: unknown) {
        Alert.alert(
          COPY.title,
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.roleAssignError,
        );
      } finally {
        setSavingRole(null);
      }
    },
    [company, loadScreen],
  );

  return {
    items,
    hasMore: pagination.hasMore,
    loadingMore,
    totalCount: pagination.total,
    savingRole,
    handleLoadMore,
    handleAssignRole,
  };
}
