import { readFileSync } from "fs";
import { join } from "path";

jest.mock("../../src/lib/observability/catchDiscipline", () => ({
  recordCatchDiscipline: jest.fn(),
}));

jest.mock("../../src/screens/foreman/foreman.durableDraft.store", () => ({
  getForemanDurableDraftState: jest.fn(),
  pushForemanDurableDraftTelemetry: jest.fn(async () => undefined),
}));

import { recordCatchDiscipline } from "../../src/lib/observability/catchDiscipline";
import {
  getForemanDurableDraftState,
  pushForemanDurableDraftTelemetry,
} from "../../src/screens/foreman/foreman.durableDraft.store";
import {
  pushForemanDraftBoundaryRecoveryTelemetry,
  reportForemanDraftBoundaryFailure,
} from "../../src/screens/foreman/foreman.draftBoundary.telemetry";
import type { ForemanLocalDraftSnapshot } from "../../src/screens/foreman/foreman.localDraft";

const mockRecordCatchDiscipline = recordCatchDiscipline as unknown as jest.Mock;
const mockGetForemanDurableDraftState = getForemanDurableDraftState as unknown as jest.Mock;
const mockPushForemanDurableDraftTelemetry = pushForemanDurableDraftTelemetry as unknown as jest.Mock;

const makeSnapshot = (
  patch: Partial<ForemanLocalDraftSnapshot> = {},
): ForemanLocalDraftSnapshot => ({
  version: 1,
  ownerId: "owner-1",
  requestId: "req-1",
  displayNo: null,
  status: "draft",
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
  updatedAt: "2026-04-22T00:00:00.000Z",
  ...patch,
});

describe("foreman draft boundary telemetry owner", () => {
  beforeEach(() => {
    mockRecordCatchDiscipline.mockReset();
    mockGetForemanDurableDraftState.mockReset();
    mockPushForemanDurableDraftTelemetry.mockReset();
  });

  it("stays free of React hook ownership and only executes delegated telemetry side effects", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "screens", "foreman", "foreman.draftBoundary.telemetry.ts"),
      "utf8",
    );

    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("useCallback");
    expect(source).not.toContain("useState");
    expect(source).toContain("recordCatchDiscipline");
    expect(source).toContain("pushForemanDurableDraftTelemetry");
  });

  it("pushes recovery telemetry from the resolved draft boundary snapshot and durable state", async () => {
    mockGetForemanDurableDraftState.mockReturnValue({
      snapshot: null,
      retryCount: 1,
      pendingOperationsCount: 2,
      conflictType: "retryable_sync_failure",
    });

    await pushForemanDraftBoundaryRecoveryTelemetry(
      {
        localDraftSnapshotRef: {
          current: makeSnapshot({ requestId: "req-telemetry" }),
        },
        requestId: "req-route",
        localOnlyRequestId: "__foreman_local_draft__",
        networkOnlineRef: { current: false },
      },
      {
        recoveryAction: "retry_now",
        result: "progress",
      },
    );

    expect(mockPushForemanDurableDraftTelemetry).toHaveBeenCalledTimes(1);
    expect(mockPushForemanDurableDraftTelemetry.mock.calls[0]?.[0]).toMatchObject({
      stage: "recovery",
      draftKey: "req-telemetry",
      requestId: "req-telemetry",
      offlineState: "offline",
      attemptNumber: 2,
      queueSizeBefore: 2,
      queueSizeAfter: 2,
      recoveryAction: "retry_now",
      result: "progress",
    });
  });

  it("records classified boundary failures without rebuilding logic in the hook", () => {
    mockGetForemanDurableDraftState.mockReturnValue({
      snapshot: null,
    });

    const classified = reportForemanDraftBoundaryFailure(
      {
        localDraftSnapshotRef: { current: makeSnapshot({ requestId: "req-failure" }) },
        requestId: "req-route",
        localOnlyRequestId: "__foreman_local_draft__",
      },
      {
        event: "restore_draft_on_focus_failed",
        error: new Error("network timeout"),
        context: "focus",
        stage: "recovery",
      },
    );

    expect(classified).toMatchObject({
      retryable: true,
      conflictType: "retryable_sync_failure",
      errorClass: "network",
    });
    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "restore_draft_on_focus_failed",
        trigger: "focus",
      }),
    );
  });
});
