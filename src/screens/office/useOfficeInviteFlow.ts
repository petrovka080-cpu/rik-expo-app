/**
 * useOfficeInviteFlow — Owner hook for the OfficeHub invite lifecycle.
 *
 * Extracted from OfficeHubScreen.tsx (Wave K) to establish a single owner
 * boundary for invite-related state and side-effects.
 *
 * Owns:
 *  - invite draft form state
 *  - invite card (modal) visibility
 *  - invite handoff (share) state
 *  - invite feedback messages
 *  - saving indicator
 *  - all invite action handlers
 */
import { useCallback, useState } from "react";
import { Alert, Linking } from "react-native";

import type { OfficeWorkspaceCard } from "./officeAccess.model";
import { createOfficeInvite } from "./officeAccess.services";
import type { OfficeAccessScreenData } from "./officeAccess.types";
import {
  copyOfficeInviteText,
  shareOfficeInviteCode,
  type OfficeInviteHandoff,
} from "./officeInviteShare";
import {
  buildInviteDraft,
  COPY,
  type InviteFormDraft,
  type LoadScreenMode,
  type SectionKey,
} from "./officeHub.constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UseOfficeInviteFlowArgs = {
  /** Current company from the screen data — null when no company exists. */
  company: OfficeAccessScreenData["company"];
  /** Screen-level data loader — invoked after invite creation to refresh the list. */
  loadScreen: (opts?: { mode?: LoadScreenMode }) => Promise<unknown>;
  /** Scroll to a section — used to scroll to the invites section after creation. */
  scrollTo: (key: SectionKey) => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOfficeInviteFlow({
  company,
  loadScreen,
  scrollTo,
}: UseOfficeInviteFlowArgs) {
  // ── State ──────────────────────────────────────────────────────────────
  const [inviteDraft, setInviteDraft] =
    useState<InviteFormDraft>(buildInviteDraft());
  const [inviteCard, setInviteCard] = useState<OfficeWorkspaceCard | null>(
    null,
  );
  const [inviteHandoff, setInviteHandoff] =
    useState<OfficeInviteHandoff | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteHandoffFeedback, setInviteHandoffFeedback] = useState<
    string | null
  >(null);
  const [savingInvite, setSavingInvite] = useState(false);

  // ── Actions ────────────────────────────────────────────────────────────

  const openInviteModal = useCallback((card: OfficeWorkspaceCard) => {
    if (!card.inviteRole) return;
    setInviteFeedback(null);
    setInviteHandoffFeedback(null);
    setInviteDraft(buildInviteDraft());
    setInviteCard(card);
  }, []);

  const closeInviteModal = useCallback(() => {
    setInviteCard(null);
  }, []);

  const handleCopyInvite = useCallback(
    async (value: string, feedback: string) => {
      try {
        await copyOfficeInviteText(value);
        setInviteHandoffFeedback(feedback);
      } catch (error: unknown) {
        Alert.alert(
          COPY.title,
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.inviteCopyError,
        );
      }
    },
    [],
  );

  const handleOpenInviteChannel = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error: unknown) {
      Alert.alert(
        COPY.title,
        error instanceof Error && error.message.trim()
          ? error.message
          : COPY.inviteOpenError,
      );
    }
  }, []);

  const handleCreateInvite = useCallback(async () => {
    if (!company || !inviteCard?.inviteRole) return;
    try {
      setSavingInvite(true);
      const created = await createOfficeInvite({
        companyId: company.id,
        draft: { ...inviteDraft, role: inviteCard.inviteRole },
      });
      setInviteCard(null);
      setInviteDraft(buildInviteDraft());
      let shareError: string | null = null;
      try {
        const shareResult = await shareOfficeInviteCode({
          companyName: company.name,
          role: created.role,
          inviteCode: created.inviteCode,
        });
        if (shareResult.kind === "web-handoff") {
          setInviteHandoff(shareResult.handoff);
          setInviteHandoffFeedback(null);
          setInviteFeedback(null);
        } else {
          setInviteHandoff(null);
          setInviteHandoffFeedback(null);
          setInviteFeedback(COPY.inviteShared);
        }
      } catch (error: unknown) {
        shareError =
          error instanceof Error && error.message.trim()
            ? error.message
            : COPY.inviteShareError;
        setInviteHandoff(null);
        setInviteHandoffFeedback(null);
        setInviteFeedback(COPY.inviteManual);
      }
      await loadScreen({
        mode: "refresh",
      });
      scrollTo("invites");
      if (shareError) Alert.alert(COPY.title, shareError);
    } catch (error: unknown) {
      Alert.alert(
        COPY.title,
        error instanceof Error && error.message.trim()
          ? error.message
          : COPY.inviteError,
      );
    } finally {
      setSavingInvite(false);
    }
  }, [company, inviteCard, inviteDraft, loadScreen, scrollTo]);

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    // State (read-only for render)
    inviteCard,
    inviteHandoff,
    inviteFeedback,
    inviteHandoffFeedback,
    savingInvite,

    // Draft (exposed for TextInput bindings in the screen)
    inviteDraft,
    setInviteDraft,

    // Actions
    openInviteModal,
    closeInviteModal,
    handleCreateInvite,
    handleCopyInvite,
    handleOpenInviteChannel,
  };
}
