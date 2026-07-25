import { useEffect, useMemo, useState } from "react";

import {
  buildAppAccessModel,
  type AppAccessSourceSnapshot,
  type AppContext,
} from "../../../lib/appAccessModel";
import { loadStoredActiveContext } from "../../../lib/appAccessContextStorage";
import { loadAddListingOwnerData } from "../profile.services";
import type { Company, UserProfile } from "../profile.types";

export function useAddListingOwnerContext(params: {
  prepareListingForm: (input: {
    profile: UserProfile;
    company: Company | null;
    activeContext: AppContext;
  }) => void;
  onLoadError: (error: unknown) => void;
}) {
  const { onLoadError, prepareListingForm } = params;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [accessSourceSnapshot, setAccessSourceSnapshot] =
    useState<AppAccessSourceSnapshot | null>(null);
  const [storedActiveContext, setStoredActiveContext] =
    useState<AppContext | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        setLoading(true);
        const result = await loadAddListingOwnerData();
        const nextStoredActiveContext = await loadStoredActiveContext(
          result.profile.user_id,
        );
        if (!active) return;
        const accessModel = buildAppAccessModel({
          ...result.accessSourceSnapshot,
          requestedActiveContext: nextStoredActiveContext,
        });
        setProfile(result.profile);
        setCompany(result.company);
        setAccessSourceSnapshot(result.accessSourceSnapshot);
        setStoredActiveContext(nextStoredActiveContext);
        prepareListingForm({
          profile: result.profile,
          company: result.company,
          activeContext: accessModel.activeContext,
        });
      } catch (error: unknown) {
        if (active) onLoadError(error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [onLoadError, prepareListingForm]);

  const accessModel = useMemo(
    () =>
      buildAppAccessModel({
        userId: profile?.user_id ?? null,
        authRole: accessSourceSnapshot?.authRole ?? null,
        resolvedRole: accessSourceSnapshot?.resolvedRole ?? null,
        usageMarket:
          accessSourceSnapshot?.usageMarket ?? Boolean(profile?.usage_market),
        usageBuild:
          accessSourceSnapshot?.usageBuild ?? Boolean(profile?.usage_build),
        ownedCompanyId:
          accessSourceSnapshot?.ownedCompanyId ?? company?.id ?? null,
        companyMemberships: accessSourceSnapshot?.companyMemberships ?? [],
        listingsCount: accessSourceSnapshot?.listingsCount ?? 0,
        requestedActiveContext: storedActiveContext,
      }),
    [
      accessSourceSnapshot,
      company?.id,
      profile?.usage_build,
      profile?.usage_market,
      profile?.user_id,
      storedActiveContext,
    ],
  );

  return {
    accessModel,
    accessSourceSnapshot,
    company,
    loading,
    profile,
  };
}
