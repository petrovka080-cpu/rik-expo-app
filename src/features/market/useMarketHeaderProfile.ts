import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  EMPTY_CURRENT_PROFILE_IDENTITY,
  loadCurrentProfileIdentity,
  toProfileAvatarText,
} from "../profile/currentProfileIdentity";

type MarketHeaderProfile = {
  fullName: string | null;
  avatarText: string;
  avatarUrl: string | null;
};

const DEFAULT_PROFILE: MarketHeaderProfile = {
  fullName: EMPTY_CURRENT_PROFILE_IDENTITY.fullName,
  avatarText: "G",
  avatarUrl: EMPTY_CURRENT_PROFILE_IDENTITY.avatarUrl,
};

export function useMarketHeaderProfile() {
  const [profile, setProfile] = useState<MarketHeaderProfile>(DEFAULT_PROFILE);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const identity = await loadCurrentProfileIdentity();
          if (!identity.userId) {
            if (active) setProfile(DEFAULT_PROFILE);
            return;
          }

          if (!active) return;

          setProfile({
            fullName: identity.fullName,
            avatarText: toProfileAvatarText(identity.fullName, identity.userId),
            avatarUrl: identity.avatarUrl,
          });
        } catch (error) {
          recordPlatformObservability({
            screen: "market",
            surface: "header_profile",
            category: "ui",
            event: "load_profile_failed",
            result: "error",
            fallbackUsed: true,
            errorClass: error instanceof Error ? error.name : undefined,
            errorMessage: error instanceof Error ? error.message : String(error ?? "load_profile_failed"),
            extra: {
              module: "market.useMarketHeaderProfile",
              route: "/market",
              role: "market",
              owner: "header_profile",
              action: "loadCurrentProfileIdentity",
              severity: "error",
            },
          });
          if (active) setProfile(DEFAULT_PROFILE);
        }
      };

      void load();

      return () => {
        active = false;
      };
    }, []),
  );

  return profile;
}
