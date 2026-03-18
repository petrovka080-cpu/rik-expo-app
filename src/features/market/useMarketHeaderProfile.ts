import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { supabase } from "../../lib/supabaseClient";

type MarketHeaderProfile = {
  fullName: string | null;
  avatarText: string;
};

const DEFAULT_PROFILE: MarketHeaderProfile = {
  fullName: null,
  avatarText: "G",
};

function toAvatarText(name: string | null | undefined, fallbackId: string | null | undefined): string {
  const trimmedName = String(name ?? "").trim();
  if (trimmedName) return trimmedName[0]!.toUpperCase();
  const trimmedId = String(fallbackId ?? "").trim();
  if (trimmedId) return trimmedId[0]!.toUpperCase();
  return "G";
}

export function useMarketHeaderProfile() {
  const [profile, setProfile] = useState<MarketHeaderProfile>(DEFAULT_PROFILE);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const sessionResult = await supabase.auth.getSession();
          const user = sessionResult.data.session?.user;
          if (!user) {
            if (active) setProfile(DEFAULT_PROFILE);
            return;
          }

          const profileResult = await supabase
            .from("user_profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!active) return;

          const fullName = profileResult.data?.full_name ?? null;
          setProfile({
            fullName,
            avatarText: toAvatarText(fullName, user.id),
          });
        } catch {
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
