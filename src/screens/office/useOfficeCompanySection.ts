/**
 * useOfficeCompanySection — Owner hook for the OfficeHub company creation flow.
 *
 * Extracted from OfficeHubScreen.tsx (Wave L) to establish a single owner
 * boundary for company-creation-related state and side-effects.
 *
 * Owns:
 *  - company draft form state
 *  - company creation feedback message
 *  - saving indicator
 *  - create company handler
 *  - edit company navigation handler
 *  - draft sync after data reload
 */
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

import { createOfficeCompany } from "./officeAccess.services";
import type { OfficeAccessScreenData, CreateCompanyDraft } from "./officeAccess.types";
import { COPY, type LoadScreenMode } from "./officeHub.constants";
import { EMPTY_COMPANY_DRAFT , buildOfficeBootstrapCompanyDraft } from "./officeHub.helpers";
import type { OfficeHubBootstrapSnapshot } from "./officeHubBootstrapSnapshot";
import type { ScrollView } from "react-native";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UseOfficeCompanySectionArgs = {
  /** Current profile from the screen data — used for company creation payload. */
  profile: OfficeAccessScreenData["profile"];
  /** Current profile email — used for company creation payload. */
  profileEmail: OfficeAccessScreenData["profileEmail"];
  /** Screen-level data loader — invoked after company creation to refresh. */
  loadScreen: (opts?: { mode?: LoadScreenMode }) => Promise<unknown>;
  /** Scroll ref — used to scroll to top after creation. */
  scrollRef: React.RefObject<ScrollView | null>;
  /** Bootstrap snapshot — used to pre-fill draft on mount. */
  initialBootstrapSnapshot: OfficeHubBootstrapSnapshot | null;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOfficeCompanySection({
  profile,
  profileEmail,
  loadScreen,
  scrollRef,
  initialBootstrapSnapshot,
}: UseOfficeCompanySectionArgs) {
  // ── State ──────────────────────────────────────────────────────────────
  const router = useRouter();

  const [companyDraft, setCompanyDraft] = useState<CreateCompanyDraft>(
    () =>
      initialBootstrapSnapshot
        ? buildOfficeBootstrapCompanyDraft(initialBootstrapSnapshot.data)
        : EMPTY_COMPANY_DRAFT,
  );
  const [companyFeedback, setCompanyFeedback] = useState<string | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  // ── Draft sync (called by parent after loadScreen) ─────────────────────
  const syncDraftFromData = useCallback((next: OfficeAccessScreenData) => {
    setCompanyDraft((current) => ({
      ...current,
      phoneMain: current.phoneMain || next.profile.phone || "",
      email: current.email || next.profileEmail || "",
    }));
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────

  const handleEditCompany = useCallback(() => {
    router.push("/profile?section=company");
  }, [router]);

  const handleCreateCompany = useCallback(async () => {
    try {
      setSavingCompany(true);
      setCompanyFeedback(null);
      await createOfficeCompany({
        profile,
        profileEmail,
        draft: companyDraft,
      });
      setCompanyDraft(EMPTY_COMPANY_DRAFT);
      setCompanyFeedback(COPY.companyCreated);
      await loadScreen({
        mode: "refresh",
      });
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error: unknown) {
      Alert.alert(
        COPY.title,
        error instanceof Error && error.message.trim()
          ? error.message
          : COPY.companyError,
      );
    } finally {
      setSavingCompany(false);
    }
  }, [companyDraft, profile, profileEmail, loadScreen, scrollRef]);

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    // State (read-only for render)
    companyFeedback,
    savingCompany,

    // Draft (exposed for TextInput bindings in the screen)
    companyDraft,
    setCompanyDraft,

    // Actions
    handleEditCompany,
    handleCreateCompany,

    // Sync callback for parent's loadScreen
    syncDraftFromData,
  };
}
