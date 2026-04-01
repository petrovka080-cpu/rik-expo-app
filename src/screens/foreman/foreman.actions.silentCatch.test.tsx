import { readFileSync } from "fs";
import { join } from "path";
import React, { useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { ReqItemRow } from "../../types";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import { useForemanActions } from "./hooks/useForemanActions";

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: "ios",
  },
}));

jest.mock("./foreman.helpers", () => ({
  aggCalcRows: (rows: unknown[]) => rows,
  aggPickedRows: (rows: Array<{ rik_code: string; name: string; qty: string; uom?: string | null; app_code?: string | null; kind?: string | null }>) =>
    rows.map((row) => ({
      base: {
        rik_code: row.rik_code,
        name: row.name,
        uom: row.uom ?? null,
        app_code: row.app_code ?? null,
        kind: row.kind ?? null,
      },
      qty: Number(row.qty),
    })),
  formatQtyInput: (value: unknown) => String(value ?? ""),
  parseQtyValue: (value: string) => Number(value),
}));

jest.mock("./foreman.ui", () => ({
  FOREMAN_TEXT: {
    catalogAddError: "catalog add error",
    qtyTitle: "qty",
    qtyPositiveHint: "qty positive",
    qtyUpdateError: "qty update error",
    submitSentTitle: "submit sent",
    submitError: "submit error",
    deleteConfirmTitle: "delete confirm",
    deleteConfirmFallback: "delete fallback",
    deleteDone: "delete done",
    calcAddError: "calc add error",
  },
}));

jest.mock("../../lib/observability/catchDiscipline", () => {
  const { recordPlatformObservability } = jest.requireActual("../../lib/observability/platformObservability");
  return {
    reportAndSwallow: (params: {
      screen: "foreman";
      surface: string;
      event: string;
      error: unknown;
      kind?: "soft_failure" | "cleanup_only" | "degraded_fallback";
      category?: "fetch" | "ui" | "reload";
      sourceKind?: string;
      errorStage?: string;
      scope?: string;
      extra?: Record<string, unknown>;
    }) =>
      recordPlatformObservability({
        screen: params.screen,
        surface: params.surface,
        category: params.category ?? (params.kind === "cleanup_only" ? "reload" : "fetch"),
        event: params.event,
        result: "error",
        sourceKind: params.sourceKind,
        fallbackUsed: params.kind === "degraded_fallback",
        errorStage: params.errorStage,
        errorMessage:
          params.error instanceof Error
            ? params.error.message
            : String(
                params.error && typeof params.error === "object" && "message" in params.error
                  ? (params.error as { message?: unknown }).message ?? params.error
                  : params.error,
              ),
        extra: {
          catchKind: params.kind ?? "soft_failure",
          scope: params.scope ?? `${params.screen}.${params.surface}.${params.event}`,
          ...(params.extra ?? {}),
        },
      }),
  };
});

type HookApi = ReturnType<typeof useForemanActions>;

function Harness(props: {
  onReady: (value: HookApi) => void;
  syncLocalDraftNow: jest.Mock;
  showHint: jest.Mock;
  alertError: jest.Mock;
  setBusy: jest.Mock;
}) {
  const actions = useForemanActions({
    requestId: "req-wave16",
    scopeNote: "scope",
    isDraftActive: true,
    canEditRequestItem: () => true,
    setQtyDrafts: jest.fn(),
    setRowBusy: jest.fn(),
    items: [{ id: "row-1", request_id: "req-wave16", qty: 1, name_human: "Brick" } satisfies ReqItemRow],
    qtyDrafts: {},
    ensureEditableContext: () => true,
    ensureCanSubmitToDirector: () => true,
    finalizeAfterSubmit: async () => {},
    showHint: props.showHint,
    setBusy: props.setBusy,
    alertError: props.alertError,
    appendLocalDraftRows: () => ({
      version: 1,
      ownerId: "foreman-wave16",
      requestId: "req-wave16",
      displayNo: null,
      status: "draft",
      updatedAt: new Date(0).toISOString(),
      header: {
        foreman: "",
        comment: "",
        objectType: "",
        level: "",
        system: "",
        zone: "",
      },
      items: [],
      qtyDrafts: {},
      pendingDeletes: [],
      submitRequested: false,
      lastError: null,
    }),
    updateLocalDraftQty: () => null,
    removeLocalDraftRow: () => null,
    syncLocalDraftNow: props.syncLocalDraftNow,
    webUi: undefined,
  });

  useEffect(() => {
    props.onReady(actions);
  }, [actions, props]);

  return null;
}

describe("foreman action silent catch hardening", () => {
  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
  });

  it("keeps catalog add follow-up non-fatal when draft sync fails and records visibility", async () => {
    const syncLocalDraftNow = jest.fn().mockRejectedValue(new Error("sync down"));
    const showHint = jest.fn();
    const alertError = jest.fn();
    const setBusy = jest.fn();
    let hookApi: HookApi | null = null;
    let renderer!: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          showHint={showHint}
          alertError={alertError}
          setBusy={setBusy}
          syncLocalDraftNow={syncLocalDraftNow}
          onReady={(value) => {
            hookApi = value;
          }}
        />,
      );
    });

    expect(hookApi).not.toBeNull();

    await act(async () => {
      await hookApi!.commitCatalogToDraft([
        {
          rik_code: "RK-1",
          name: "Brick",
          qty: "2",
          note: "scope",
          uom: "pcs",
          app_code: null,
          kind: null,
        },
      ]);
    });

    expect(syncLocalDraftNow).toHaveBeenCalledTimes(1);
    expect(showHint).toHaveBeenCalledTimes(1);
    expect(alertError).not.toHaveBeenCalled();
    expect(setBusy).toHaveBeenNthCalledWith(1, true);
    expect(setBusy).toHaveBeenLastCalledWith(false);
    expect(getPlatformObservabilityEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          screen: "foreman",
          surface: "draft_actions",
          event: "catalog_add_sync_failed",
          result: "error",
          fallbackUsed: true,
        }),
      ]),
    );

    await act(async () => {
      renderer.unmount();
    });
  });

  it("removes anonymous foreman Tier-1 swallows from action and voice files", () => {
    const actionsSource = readFileSync(join(__dirname, "hooks", "useForemanActions.ts"), "utf8");
    const voiceSource = readFileSync(join(__dirname, "hooks", "useForemanVoiceInput.ts"), "utf8");

    expect(actionsSource).not.toContain("catch {}");
    expect(voiceSource).not.toContain("catch {}");

    expect(actionsSource).toContain("catalog_add_sync_failed");
    expect(actionsSource).toContain("calc_add_sync_failed");
    expect(voiceSource).toContain("native_module_require_failed");
    expect(voiceSource).toContain("web_microphone_track_stop_failed");
  });
});
