import { readFileSync } from "fs";
import { join } from "path";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import {
  fetchRequestDetails,
  updateRequestMeta,
} from "../../lib/catalog_api";
import {
  loadForemanRequestDetails,
  syncForemanRequestHeaderMeta,
} from "./foreman.draftBoundary.helpers";

jest.mock("../../lib/catalog_api", () => ({
  clearCachedDraftRequestId: jest.fn(),
  clearLocalDraftId: jest.fn(),
  fetchRequestDetails: jest.fn(),
  getLocalDraftId: jest.fn(),
  updateRequestMeta: jest.fn(),
}));

const mockFetchRequestDetails = fetchRequestDetails as unknown as jest.Mock;
const mockUpdateRequestMeta = updateRequestMeta as unknown as jest.Mock;

describe("foreman draft boundary silent failure discipline", () => {
  beforeEach(() => {
    const runtime = globalThis as typeof globalThis & { __DEV__?: boolean };
    runtime.__DEV__ = false;
    resetPlatformObservabilityEvents();
    mockFetchRequestDetails.mockReset();
    mockUpdateRequestMeta.mockReset();
  });

  it("records degraded fallback and clears details when request detail load fails", async () => {
    mockFetchRequestDetails.mockRejectedValueOnce(new Error("details load failed"));

    const setRequestDetails = jest.fn();
    const setDisplayNoByReq = jest.fn();
    const syncHeaderFromDetails = jest.fn();

    const result = await loadForemanRequestDetails({
      requestId: "req-wave2-1",
      activeRequestId: "req-wave2-1",
      setRequestDetails,
      setDisplayNoByReq,
      syncHeaderFromDetails,
      shouldApply: () => true,
    });

    expect(result).toBeNull();
    expect(setRequestDetails).toHaveBeenCalledWith(null);
    expect(setDisplayNoByReq).not.toHaveBeenCalled();
    expect(syncHeaderFromDetails).not.toHaveBeenCalled();

    const event = getPlatformObservabilityEvents().find(
      (entry) => entry.event === "request_details_load_failed",
    );
    expect(event).toMatchObject({
      screen: "foreman",
      surface: "request_details",
      result: "error",
      fallbackUsed: true,
      sourceKind: "rpc:fetch_request_details",
      errorStage: "fetch_request_details",
    });
    expect(event?.extra).toMatchObject({
      requestId: "req-wave2-1",
      activeRequestId: "req-wave2-1",
      fallbackReason: "clear_request_details",
    });
  });

  it("records degraded fallback when request header meta sync fails", async () => {
    mockUpdateRequestMeta.mockRejectedValueOnce(new Error("meta sync denied"));

    await expect(
      syncForemanRequestHeaderMeta({
        requestId: "req-wave2-2",
        context: "pdf_preview",
        header: {
          foreman: "Wave 2 Foreman",
          comment: "comment",
          objectType: "OBJ",
          level: "L1",
          system: "SYS",
          zone: "Z1",
        },
      }),
    ).resolves.toBeUndefined();

    const event = getPlatformObservabilityEvents().find(
      (entry) => entry.event === "request_header_meta_sync_failed",
    );
    expect(event).toMatchObject({
      screen: "foreman",
      surface: "draft_boundary",
      result: "error",
      fallbackUsed: true,
      sourceKind: "rpc:update_request_meta",
      errorStage: "pdf_preview",
    });
    expect(event?.extra).toMatchObject({
      context: "pdf_preview",
      requestId: "req-wave2-2",
      fallbackReason: "keep_existing_request_header_meta",
    });
  });

  it("removes anonymous background boundary swallows from the critical foreman restore path", () => {
    const source = readFileSync(join(__dirname, "hooks", "useForemanDraftBoundary.ts"), "utf8");
    const bootstrapCoordinatorSource = readFileSync(
      join(__dirname, "hooks", "useForemanBootstrapCoordinator.ts"),
      "utf8",
    );
    const lifecycleModelSource = readFileSync(join(__dirname, "foreman.draftLifecycle.model.ts"), "utf8");
    const recoverySource = readFileSync(join(__dirname, "foreman.draftBoundary.recovery.ts"), "utf8");
    const telemetrySource = readFileSync(join(__dirname, "foreman.draftBoundary.telemetry.ts"), "utf8");
    const effectsSource = readFileSync(join(__dirname, "foreman.draftBoundary.effects.ts"), "utf8");

    expect(source).not.toContain(".catch(() => undefined)");
    expect(source).not.toContain("catch {");
    expect(bootstrapCoordinatorSource).not.toContain("catch {");
    expect(recoverySource).not.toContain("catch {");
    expect(telemetrySource).not.toContain("catch {");
    expect(effectsSource).not.toContain("catch {");
    expect(source).toContain("runRestoreTriggerPlan");
    expect(lifecycleModelSource).toContain("restore_draft_on_focus_failed");
    expect(lifecycleModelSource).toContain("restore_draft_on_app_active_failed");
    expect(source).toContain("network_service_bootstrap_failed");
    expect(lifecycleModelSource).toContain("restore_draft_on_network_back_failed");
    expect(effectsSource).toContain("terminal_local_cleanup_failed");
    expect(recoverySource).toContain("terminal_recovery_remote_check_failed");
    expect(recoverySource).toContain("restore_remote_terminal_check_failed");
    expect(bootstrapCoordinatorSource).toContain("bootstrap_reconciliation_remote_check_failed");
    expect(bootstrapCoordinatorSource).toContain("recordCatchDiscipline");
  });
});
