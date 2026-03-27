import { useCallback, useMemo } from "react";
import { Alert } from "react-native";

import type { RequestDetails } from "../../../lib/catalog_api";
import { ridStr, toErrorText } from "../foreman.helpers";
import type { ForemanHeaderRequirementResult } from "../foreman.headerRequirements";
import type { ForemanDraftAppendInput, ForemanLocalDraftSnapshot } from "../foreman.localDraft";
import { resolveForemanQuickLocalAssist, resolveForemanQuickRequest } from "../foreman.ai";
import { useForemanUiStore } from "../foremanUi.store";
import { FOREMAN_TEXT } from "../foreman.ui";

type SyncLocalDraftResult = {
  requestId?: string | null;
  submitted?: unknown | null;
} | undefined;

type Props = {
  headerRequirements: ForemanHeaderRequirementResult;
  activateHeaderAttention: (messageOverride?: string) => boolean;
  clearHeaderAttention: () => void;
  showHint: (title: string, message: string) => void;
  requestDetails: RequestDetails | null;
  isDraftActive: boolean;
  scopeNote: string;
  itemsCount: number;
  appendLocalDraftRows: (rows: ForemanDraftAppendInput[]) => ForemanLocalDraftSnapshot | null;
  syncLocalDraftNow: (options?: {
    submit?: boolean;
    context?: string;
    overrideSnapshot?: ForemanLocalDraftSnapshot | null;
    mutationKind?:
      | "catalog_add"
      | "calc_add"
      | "ai_local_add"
      | "qty_update"
      | "row_remove"
      | "whole_cancel"
      | "submit"
      | "background_sync";
    localBeforeCount?: number | null;
    localAfterCount?: number | null;
  }) => Promise<SyncLocalDraftResult>;
  requestId: string;
  labelForRequest: (rid?: string | number | null) => string;
  currentDisplayLabel: string;
  openDraft: () => void;
  networkOnline: boolean | null;
};

const buildAiQuickSessionHint = (
  sessionHistory: { prompt: string; items: { name: string; qty: number; unit: string }[] }[],
): string => {
  const latestTurn = sessionHistory[sessionHistory.length - 1] ?? null;
  if (!latestTurn || !Array.isArray(latestTurn.items) || latestTurn.items.length === 0) return "";
  if (latestTurn.items.length === 1) {
    const latestItem = latestTurn.items[0];
    return `\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u044f\u044f \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u0430\u044f \u043f\u043e\u0437\u0438\u0446\u0438\u044f: ${latestItem.name}, ${latestItem.qty} ${latestItem.unit}. \u041c\u043e\u0436\u043d\u043e \u0441\u043a\u0430\u0437\u0430\u0442\u044c "\u0435\u0449\u0451 \u0441\u0442\u043e\u043b\u044c\u043a\u043e \u0436\u0435".`;
  }
  return `\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u044b\u0439 \u043d\u0430\u0431\u043e\u0440: ${latestTurn.items.length} \u043f\u043e\u0437\u0438\u0446\u0438\u0439. \u0414\u043b\u044f \u043f\u043e\u0432\u0442\u043e\u0440\u0430 \u043b\u0443\u0447\u0448\u0435 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c, \u043a\u0430\u043a\u0443\u044e \u0438\u043c\u0435\u043d\u043d\u043e \u043f\u043e\u0437\u0438\u0446\u0438\u044e \u043d\u0443\u0436\u043d\u043e \u0434\u043e\u0431\u0430\u0432\u0438\u0442\u044c.`;
};

export function useForemanAiQuickFlow({
  headerRequirements,
  activateHeaderAttention,
  clearHeaderAttention,
  showHint,
  requestDetails,
  isDraftActive,
  scopeNote,
  itemsCount,
  appendLocalDraftRows,
  syncLocalDraftNow,
  requestId,
  labelForRequest,
  currentDisplayLabel,
  openDraft,
  networkOnline,
}: Props) {
  const aiQuickVisible = useForemanUiStore((state) => state.aiQuickVisible);
  const setAiQuickVisible = useForemanUiStore((state) => state.setAiQuickVisible);
  const aiQuickText = useForemanUiStore((state) => state.aiQuickText);
  const setAiQuickText = useForemanUiStore((state) => state.setAiQuickText);
  const aiQuickLoading = useForemanUiStore((state) => state.aiQuickLoading);
  const setAiQuickLoading = useForemanUiStore((state) => state.setAiQuickLoading);
  const aiQuickError = useForemanUiStore((state) => state.aiQuickError);
  const setAiQuickError = useForemanUiStore((state) => state.setAiQuickError);
  const aiQuickNotice = useForemanUiStore((state) => state.aiQuickNotice);
  const setAiQuickNotice = useForemanUiStore((state) => state.setAiQuickNotice);
  const aiQuickPreview = useForemanUiStore((state) => state.aiQuickPreview);
  const setAiQuickPreview = useForemanUiStore((state) => state.setAiQuickPreview);
  const aiQuickOutcomeType = useForemanUiStore((state) => state.aiQuickOutcomeType);
  const setAiQuickOutcomeType = useForemanUiStore((state) => state.setAiQuickOutcomeType);
  const aiQuickCandidateGroups = useForemanUiStore((state) => state.aiQuickCandidateGroups);
  const setAiQuickCandidateGroups = useForemanUiStore((state) => state.setAiQuickCandidateGroups);
  const aiQuickQuestions = useForemanUiStore((state) => state.aiQuickQuestions);
  const setAiQuickQuestions = useForemanUiStore((state) => state.setAiQuickQuestions);
  const aiUnavailableReason = useForemanUiStore((state) => state.aiUnavailableReason);
  const setAiUnavailableReason = useForemanUiStore((state) => state.setAiUnavailableReason);
  const aiQuickSessionHistory = useForemanUiStore((state) => state.aiQuickSessionHistory);
  const pushAiQuickSessionTurn = useForemanUiStore((state) => state.pushAiQuickSessionTurn);
  const resetAiQuickUi = useForemanUiStore((state) => state.resetAiQuickUi);
  const aiQuickSessionHint = useMemo(
    () => buildAiQuickSessionHint(aiQuickSessionHistory),
    [aiQuickSessionHistory],
  );

  const openAiQuick = useCallback(() => {
    resetAiQuickUi();
    setAiQuickVisible(true);
  }, [resetAiQuickUi, setAiQuickVisible]);

  const closeAiQuick = useCallback(() => {
    if (aiQuickLoading) return;
    resetAiQuickUi();
  }, [aiQuickLoading, resetAiQuickUi]);

  const handleAiQuickTextChange = useCallback((value: string) => {
    setAiQuickText(value);
    setAiQuickError("");
    setAiQuickNotice("");
    setAiQuickPreview([]);
    setAiQuickOutcomeType("idle");
    setAiQuickCandidateGroups([]);
    setAiQuickQuestions([]);
    setAiUnavailableReason("");
  }, [
    setAiQuickCandidateGroups,
    setAiQuickError,
    setAiQuickNotice,
    setAiQuickOutcomeType,
    setAiQuickPreview,
    setAiQuickQuestions,
    setAiQuickText,
    setAiUnavailableReason,
  ]);

  const handleAiQuickSubmit = useCallback(async () => {
    const promptText = aiQuickText.trim();
    if (!promptText || aiQuickLoading) return;

    if (headerRequirements.missing.length) {
      activateHeaderAttention(`${headerRequirements.message} Я перевёл вас к этим полям.`);
      resetAiQuickUi();
      showHint(
        FOREMAN_TEXT.fillHeaderTitle,
        `${headerRequirements.message} Я перевёл вас к этим полям сверху.`,
      );
      return;
    }
    if (requestDetails && !isDraftActive) {
      Alert.alert(FOREMAN_TEXT.readonlyTitle, FOREMAN_TEXT.readonlyHint);
      return;
    }

    setAiQuickLoading(true);
    setAiQuickError("");
    setAiQuickNotice("");
    setAiQuickOutcomeType("idle");
    setAiQuickCandidateGroups([]);
    setAiQuickQuestions([]);
    setAiUnavailableReason("");

    try {
      const localAssistOutcome = resolveForemanQuickLocalAssist({
        prompt: promptText,
        lastResolvedItems: aiQuickSessionHistory[aiQuickSessionHistory.length - 1]?.items ?? [],
        networkOnline,
      });
      const outcome = localAssistOutcome ?? await resolveForemanQuickRequest(promptText);
      if (outcome.type === "candidate_options") {
        setAiQuickOutcomeType("candidate_options");
        setAiQuickCandidateGroups(outcome.options);
        setAiQuickQuestions(outcome.questions ?? []);
        setAiUnavailableReason("");
        setAiQuickPreview(outcome.resolvedItems ?? []);
        setAiQuickError("");
        setAiQuickNotice(outcome.message || "");
        return;
      }

      if (outcome.type === "clarify_required") {
        setAiQuickOutcomeType("clarify_required");
        setAiQuickQuestions(outcome.questions);
        setAiQuickCandidateGroups(outcome.options ?? []);
        setAiUnavailableReason("");
        setAiQuickPreview(outcome.resolvedItems ?? []);
        setAiQuickError(outcome.message || "Нужно уточнить позиции или количество.");
        return;
      }

      if (outcome.type === "hard_fail_safe") {
        setAiQuickOutcomeType("hard_fail_safe");
        setAiQuickQuestions(outcome.questions ?? []);
        setAiQuickCandidateGroups(outcome.options ?? []);
        setAiUnavailableReason("");
        setAiQuickPreview(outcome.resolvedItems ?? []);
        setAiQuickError(outcome.message || "Нужно уточнить позиции или добавить их вручную.");
        return;
      }

      if (outcome.type === "ai_unavailable") {
        setAiQuickOutcomeType("ai_unavailable");
        setAiUnavailableReason(outcome.reason);
        setAiQuickCandidateGroups([]);
        setAiQuickQuestions([]);
        setAiQuickPreview([]);
        setAiQuickError(outcome.message || "AI временно недоступен.");
        return;
      }

      setAiQuickOutcomeType("resolved_items");
      setAiQuickPreview(outcome.items);
      setAiQuickCandidateGroups([]);
      setAiQuickQuestions([]);
      setAiUnavailableReason("");
      setAiQuickNotice(outcome.message || "");

      if (outcome.items.length === 0) {
        setAiQuickError(outcome.message || "Нужно уточнить позиции или количество.");
        return;
      }

      const prepared: ForemanDraftAppendInput[] = outcome.items.map((item) => ({
        rik_code: item.rik_code,
        qty: item.qty,
        meta: {
          note: [scopeNote, item.specs].filter(Boolean).join(" | ") || scopeNote || item.specs || null,
          app_code: null,
          kind: item.kind,
          name_human: item.name,
          uom: item.unit,
        },
      }));

      const beforeLineCount = itemsCount;
      const nextSnapshot = appendLocalDraftRows(prepared);
      pushAiQuickSessionTurn({
        prompt: promptText,
        items: outcome.items,
        createdAt: new Date().toISOString(),
      });

      let syncedRequestId = ridStr(requestId);
      try {
        const syncResult = await syncLocalDraftNow({
          context: "foremanAiQuickRequest",
          overrideSnapshot: nextSnapshot,
          mutationKind: "ai_local_add",
          localBeforeCount: beforeLineCount,
          localAfterCount: nextSnapshot?.items.length ?? 0,
        });
        syncedRequestId = ridStr(syncResult?.requestId) || syncedRequestId;
      } catch {
        setAiQuickNotice("Позиции сохранены локально. Когда сеть восстановится, черновик синхронизируется автоматически.");
      }

      const draftLabel = String(
        (syncedRequestId && labelForRequest(syncedRequestId)) || currentDisplayLabel || syncedRequestId || "черновик",
      ).trim() || "черновик";
      setAiQuickNotice((prev) => prev || `Черновик ${draftLabel} сформирован. Проверьте позиции и отправьте его отдельно.`);
      clearHeaderAttention();

      resetAiQuickUi();
      openDraft();
      showHint(
        "Черновик сформирован",
        `Черновик ${draftLabel} создан. Проверьте позиции и отправьте его отдельно из карточки черновика.`,
      );
    } catch (error) {
      setAiQuickError(toErrorText(error, "Не удалось сформировать AI-заявку."));
    } finally {
      setAiQuickLoading(false);
    }
  }, [
    activateHeaderAttention,
    aiQuickLoading,
    aiQuickSessionHistory,
    aiQuickText,
    appendLocalDraftRows,
    clearHeaderAttention,
    currentDisplayLabel,
    headerRequirements,
    isDraftActive,
    itemsCount,
    labelForRequest,
    openDraft,
    networkOnline,
    requestDetails,
    requestId,
    resetAiQuickUi,
    scopeNote,
    setAiQuickCandidateGroups,
    setAiQuickError,
    setAiQuickLoading,
    setAiQuickNotice,
    setAiQuickOutcomeType,
    setAiQuickPreview,
    setAiQuickQuestions,
    setAiUnavailableReason,
    pushAiQuickSessionTurn,
    showHint,
    syncLocalDraftNow,
  ]);

  return {
    aiQuickVisible,
    aiQuickText,
    aiQuickLoading,
    aiQuickError,
    aiQuickNotice,
    aiQuickPreview,
    aiQuickOutcomeType,
    aiQuickCandidateGroups,
    aiQuickQuestions,
    aiQuickSessionHint,
    aiUnavailableReason,
    aiQuickDegradedMode: networkOnline === false,
    openAiQuick,
    closeAiQuick,
    handleAiQuickTextChange,
    handleAiQuickSubmit,
  };
}
