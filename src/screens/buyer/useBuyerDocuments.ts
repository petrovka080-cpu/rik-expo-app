import { useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusyLike } from "../../lib/pdfRunner";

import { buildPdfFileName } from "../../lib/documents/pdfDocument";
import {
  getPdfFlowErrorMessage,
  prepareAndPreviewPdfDocument,
} from "../../lib/documents/pdfDocumentActions";
import type { ProposalHeadLite, ProposalViewLine } from "./buyer.types";
import { generateBuyerProposalPdfDocument } from "./buyerProposalPdf.service";

type BuyerPdfBusyMember = "run" | "isBusy" | "show" | "hide";
type BuyerPdfBusyRecord = Partial<Record<BuyerPdfBusyMember, unknown>>;

export type BuyerPdfBusyInvalidReason =
  | "missing_flow_key"
  | "invalid_value"
  | "empty_payload"
  | "invalid_run"
  | "invalid_is_busy"
  | "invalid_show"
  | "invalid_hide"
  | "incomplete_manual_contract"
  | "missing_execution_contract";

export type BuyerPdfBusyBoundaryState =
  | {
      kind: "missing";
      flowKey: string;
    }
  | {
      kind: "invalid";
      flowKey: string;
      reason: BuyerPdfBusyInvalidReason;
      errorMessage: string;
    }
  | {
      kind: "loading";
      flowKey: string;
      busy: BusyLike;
    }
  | {
      kind: "ready";
      flowKey: string;
      busy: BusyLike;
    }
  | {
      kind: "terminal";
      flowKey: string;
      errorMessage: string;
    };

const BUYER_PDF_BUSY_MEMBERS: readonly BuyerPdfBusyMember[] = [
  "run",
  "isBusy",
  "show",
  "hide",
];

const isBuyerPdfBusyFunction = (
  value: unknown,
): value is (...args: unknown[]) => unknown => typeof value === "function";

const readBuyerPdfBusyText = (value: unknown) => String(value ?? "").trim();

const hasBuyerPdfBusyMember = (
  record: BuyerPdfBusyRecord,
  key: BuyerPdfBusyMember,
) => Object.prototype.hasOwnProperty.call(record, key);

const toInvalidBuyerPdfBusyState = (
  flowKey: string,
  reason: BuyerPdfBusyInvalidReason,
  errorMessage: string,
): BuyerPdfBusyBoundaryState => ({
  kind: "invalid",
  flowKey,
  reason,
  errorMessage,
});

const getBuyerPdfBusyTerminalErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }

  if (typeof error === "string") {
    const message = error.trim();
    if (message) return message;
  }

  return fallback;
};

export type OpenBuyerProposalPdfSnapshot = {
  head?: ProposalHeadLite | null;
  lines?: ProposalViewLine[] | null;
};

export function resolveBuyerPdfBusyBoundary(params: {
  busy: unknown;
  flowKey: unknown;
}): BuyerPdfBusyBoundaryState {
  const flowKey = readBuyerPdfBusyText(params.flowKey);
  if (!flowKey) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "missing_flow_key",
      "Buyer PDF busy flow key is missing",
    );
  }

  if (params.busy == null) {
    return {
      kind: "missing",
      flowKey,
    };
  }

  if (typeof params.busy !== "object") {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_value",
      "Buyer PDF busy contract is invalid",
    );
  }

  const candidate = params.busy as BuyerPdfBusyRecord;
  const hasBusyMember = BUYER_PDF_BUSY_MEMBERS.some((member) =>
    hasBuyerPdfBusyMember(candidate, member),
  );
  if (!hasBusyMember) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "empty_payload",
      "Buyer PDF busy contract is empty",
    );
  }

  if (hasBuyerPdfBusyMember(candidate, "run") && !isBuyerPdfBusyFunction(candidate.run)) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_run",
      "Buyer PDF busy run handler is invalid",
    );
  }
  if (
    hasBuyerPdfBusyMember(candidate, "isBusy") &&
    !isBuyerPdfBusyFunction(candidate.isBusy)
  ) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_is_busy",
      "Buyer PDF busy state reader is invalid",
    );
  }
  if (hasBuyerPdfBusyMember(candidate, "show") && !isBuyerPdfBusyFunction(candidate.show)) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_show",
      "Buyer PDF busy show handler is invalid",
    );
  }
  if (hasBuyerPdfBusyMember(candidate, "hide") && !isBuyerPdfBusyFunction(candidate.hide)) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "invalid_hide",
      "Buyer PDF busy hide handler is invalid",
    );
  }

  const hasRun = isBuyerPdfBusyFunction(candidate.run);
  const hasIsBusy = isBuyerPdfBusyFunction(candidate.isBusy);
  const hasShow = isBuyerPdfBusyFunction(candidate.show);
  const hasHide = isBuyerPdfBusyFunction(candidate.hide);

  if (hasShow !== hasHide) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "incomplete_manual_contract",
      "Buyer PDF busy manual contract requires both show and hide handlers",
    );
  }

  if (!hasRun && !(hasShow && hasHide)) {
    return toInvalidBuyerPdfBusyState(
      flowKey,
      "missing_execution_contract",
      "Buyer PDF busy contract is missing execution controls",
    );
  }

  const normalizedBusy: BusyLike = {};
  if (hasRun) normalizedBusy.run = candidate.run as BusyLike["run"];
  if (hasIsBusy) normalizedBusy.isBusy = candidate.isBusy as BusyLike["isBusy"];
  if (hasShow) normalizedBusy.show = candidate.show as BusyLike["show"];
  if (hasHide) normalizedBusy.hide = candidate.hide as BusyLike["hide"];

  if (hasIsBusy) {
    try {
      if (normalizedBusy.isBusy?.(flowKey)) {
        return {
          kind: "loading",
          flowKey,
          busy: normalizedBusy,
        };
      }
    } catch (error) {
      return {
        kind: "terminal",
        flowKey,
        errorMessage: getBuyerPdfBusyTerminalErrorMessage(
          error,
          "Buyer PDF busy state inspection failed",
        ),
      };
    }
  }

  return {
    kind: "ready",
    flowKey,
    busy: normalizedBusy,
  };
}

export function normalizeBuyerPdfBusy(params: {
  busy: unknown;
  flowKey: unknown;
}): BusyLike | undefined {
  const state = resolveBuyerPdfBusyBoundary(params);
  if (state.kind === "ready" || state.kind === "loading") {
    return state.busy;
  }
  return undefined;
}

export function useBuyerDocuments(params: {
  busy: unknown;
  supabase: SupabaseClient;
  /** XR-PDF: dismiss callback for the parent modal (if any). */
  onBeforeNavigate?: (() => void | Promise<void>) | null;
}) {
  const { busy, supabase, onBeforeNavigate } = params;
  const router = useRouter();

  const openProposalPdf = useCallback(
    async (pid: string | number, snapshot?: OpenBuyerProposalPdfSnapshot | null) => {
      const id = String(pid || "").trim();
      if (!id) return;

      try {
        const title = `Предложение ${id.slice(0, 8)}`;
        const flowKey = `pdf:proposal:${id}`;
        const safeBusy = normalizeBuyerPdfBusy({
          busy,
          flowKey,
        });
        const fileName = buildPdfFileName({
          documentType: "proposal",
          title: "predlozhenie",
          entityId: id,
        });
        const template = await generateBuyerProposalPdfDocument({
          proposalId: id,
          title,
          fileName,
          head: snapshot?.head ?? null,
          lines: snapshot?.lines ?? null,
        });
        await prepareAndPreviewPdfDocument({
          busy: safeBusy,
          supabase,
          key: flowKey,
          label: "Открываю PDF…",
          descriptor: {
            ...template,
            title,
            fileName,
          },
          router,
          // XR-PDF: dismiss parent modal before pushing PDF viewer route
          onBeforeNavigate,
        });
      } catch (error) {
        Alert.alert("PDF", getPdfFlowErrorMessage(error, "Не удалось открыть PDF"));
      }
    },
    [busy, onBeforeNavigate, supabase, router],
  );

  return { openProposalPdf };
}
