import { Alert } from "react-native";
import { useCallback } from "react";
import type React from "react";

import {
  listCanonicalProposalAttachments,
  toProposalAttachmentLegacyRow,
} from "../../lib/api/proposalAttachments.service";
import { recordCatchDiscipline } from "../../lib/observability/catchDiscipline";
import type { ProposalAttachmentRow, ProposalItem } from "./director.types";
import {
  callDirectorDecideProposalItemsRpc,
  type DirectorProposalItemDecision,
} from "./director.proposalDecision.transport";
import { MAX_LIST_LIMIT } from "../../lib/api/queryLimits";

type Deps = {
  supabase: any;
  propAttBusyByProp: Record<string, boolean>;
  setPropAttBusyByProp: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPropAttByProp: React.Dispatch<React.SetStateAction<Record<string, ProposalAttachmentRow[]>>>;
  setPropAttErrByProp: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setPropReturnId: React.Dispatch<React.SetStateAction<string | null>>;
  setItemsByProp: React.Dispatch<React.SetStateAction<Record<string, ProposalItem[]>>>;
  setLoadedByProp: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPdfHtmlByProp: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  fetchProps: (force?: boolean) => Promise<void>;
  closeSheet: () => void;
};

const errText = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }
  if (typeof error === "string") {
    const message = error.trim();
    if (message) return message;
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"] as const) {
      const value = String(record[key] ?? "").trim();
      if (value) return value;
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") return json;
    } catch (jsonError) {
      recordCatchDiscipline({
        screen: "director",
        surface: "proposal_detail",
        event: "proposal_detail_error_stringify_failed",
        kind: "soft_failure",
        error: jsonError,
        category: "ui",
        sourceKind: "proposal:director_detail",
        errorStage: "stringify_error",
      });
    }
  }
  return "";
};

export function useDirectorProposalDetail({
  supabase,
  propAttBusyByProp,
  setPropAttBusyByProp,
  setPropAttByProp,
  setPropAttErrByProp,
  setPropReturnId,
  setItemsByProp,
  setLoadedByProp,
  setPdfHtmlByProp,
  fetchProps,
  closeSheet,
}: Deps) {
  const recordDirectorProposalDetailCatch = (
    kind: "critical_fail" | "soft_failure" | "cleanup_only" | "degraded_fallback",
    event: string,
    error: unknown,
    extra?: Record<string, unknown>,
  ) => {
    recordCatchDiscipline({
      screen: "director",
      surface: "proposal_detail",
      event,
      kind,
      error,
      category: "ui",
      sourceKind: "proposal:director_detail",
      errorStage: event,
      extra,
    });
  };

  const loadProposalAttachments = useCallback(async (pidStr: string) => {
    const pid = String(pidStr || "").trim();
    if (!pid) return;

    if (propAttBusyByProp[pid]) return;
    setPropAttBusyByProp((prev) => ({ ...prev, [pid]: true }));
    setPropAttErrByProp((prev) => ({ ...prev, [pid]: "" }));

    try {
      const result = await listCanonicalProposalAttachments(supabase, pid, { screen: "director" });
      const rows: ProposalAttachmentRow[] = result.rows.map((row) => toProposalAttachmentLegacyRow(row));

      setPropAttByProp((prev) => ({ ...prev, [pid]: rows }));
      setPropAttErrByProp((prev) => ({
        ...prev,
        [pid]:
          result.state === "degraded" && rows.length > 0
            ? result.errorMessage || "Вложения загружены через compatibility path."
            : result.state === "error"
              ? result.errorMessage || "Не удалось загрузить вложения предложения"
              : "",
      }));
    } catch (e: unknown) {
      const message = errText(e) || "Не удалось загрузить вложения предложения";
      recordDirectorProposalDetailCatch("critical_fail", "proposal_attachments_load_failed", e, {
        proposalId: pid,
        publishState: "error",
      });
      if (__DEV__) console.warn("[director] loadProposalAttachments:", message);
      setPropAttErrByProp((prev) => ({ ...prev, [pid]: message }));
      setPropAttByProp((prev) => ({ ...prev, [pid]: [] }));
    } finally {
      setPropAttBusyByProp((prev) => ({ ...prev, [pid]: false }));
    }
  }, [supabase, propAttBusyByProp, setPropAttBusyByProp, setPropAttByProp, setPropAttErrByProp]);

  const onDirectorReturn = useCallback(async (proposalId: string | number, note?: string) => {
    const pidStr = String(proposalId);

    try {
      const chk = await supabase
        .from("proposals")
        .select("sent_to_accountant_at")
        .eq("id", pidStr)
        .maybeSingle();

      if (!chk.error && chk.data?.sent_to_accountant_at) {
        Alert.alert("Нельзя вернуть", "Документ уже у бухгалтерии. Вернуть может только бухгалтер.");
        return;
      }

      setPropReturnId(pidStr);

      const q = await supabase
        .from("proposal_items")
        .select("request_item_id")
        .eq("proposal_id", pidStr)
        .limit(MAX_LIST_LIMIT);

      if (q.error) throw q.error;

      const ids = Array.from(
        new Set(
          ((q.data || []) as { request_item_id?: string | null }[])
            .map((row) => String(row.request_item_id || "").trim())
            .filter(Boolean),
        ),
      );

      if (!ids.length) {
        Alert.alert("Пусто", "В предложении нет строк для возврата.");
        return;
      }

      const comment = (note || "").trim() || "Отклонено директором";
      const payload: DirectorProposalItemDecision[] = ids.map((requestItemId) => ({
        request_item_id: requestItemId,
        decision: "rejected",
        comment,
      }));

      const res = await callDirectorDecideProposalItemsRpc(supabase, {
        p_proposal_id: pidStr,
        p_decisions: payload,
        p_finalize: true,
      });
      if (res.error) throw res.error;

      setItemsByProp((map) => {
        const clone = { ...map };
        delete clone[pidStr];
        return clone;
      });
      setLoadedByProp((map) => {
        const clone = { ...map };
        delete clone[pidStr];
        return clone;
      });
      setPdfHtmlByProp((map) => {
        const clone = { ...map };
        delete clone[pidStr];
        return clone;
      });

      await fetchProps(true);
      closeSheet();
    } catch (e: unknown) {
      recordDirectorProposalDetailCatch("critical_fail", "proposal_return_failed", e, {
        proposalId: pidStr,
      });
      Alert.alert("Не удалось вернуть предложение", errText(e) || "Попробуйте ещё раз.");
    } finally {
      setPropReturnId(null);
    }
  }, [
    supabase,
    setPropReturnId,
    setItemsByProp,
    setLoadedByProp,
    setPdfHtmlByProp,
    fetchProps,
    closeSheet,
  ]);

  return {
    loadProposalAttachments,
    onDirectorReturn,
  };
}
