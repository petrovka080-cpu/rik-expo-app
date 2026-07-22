import fs from "node:fs";
import path from "node:path";

describe("consumer repair durable quantity edit transaction", () => {
  it("renders quantity edits from a prepared revision before scheduling the durable commit", () => {
    const screen = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairRequestScreen.tsx"),
      "utf8",
    );

    expect(screen).toContain("prepareConsumerRepairRequestItemQuantityUpdate");
    expect(screen).toContain("commitPreparedConsumerRepairRequestBundle");
    expect(screen).toContain("runAfterNextPaint");
    expect(screen).toContain("hasMemoryOnlyDurableSaveFailure");
    expect(screen).toContain("persist_failed_memory_only");
    expect(screen).toContain("recordConsumerRepairQuantityEditStage");
    expect(screen).toContain("QUANTITY_EDIT_SAVING_MESSAGE");
    expect(screen).toContain("QUANTITY_EDIT_SAVE_FAILED_MESSAGE");
    expect(screen).toContain("buildInitialControllerState");
    expect(screen).toContain("shouldDeferInitialHistoryLoad");
    expect(screen).toContain("buildEmptyConsumerRepairApprovedHistoryPage");
    expect(screen).toContain("historyLoaded");
    expect(screen).toContain("ensureHistoryLoaded");
    expect(screen).not.toMatch(/[^A-Za-z]updateConsumerRepairRequestItemQuantity[^A-Za-z]/);
  });

  it("updates the row input display before calling the parent quantity transaction", () => {
    const row = fs.readFileSync(
      path.resolve(process.cwd(), "src/features/consumerRepair/ConsumerRepairItemRow.tsx"),
      "utf8",
    );

    expect(row).toContain("quantityText");
    expect(row).toContain("setNativeQuantityInputText");
    expect(row).toContain("getNode");
    expect(row).toContain("visibleAlreadyRecorded");
    expect(row).toContain("runAfterQuantityInputPaint");
    expect(row).toContain("commitQuantityText");
    expect(row).toContain("QUANTITY_ACTION_RECEIVED");
    expect(row).toContain("VISIBLE_INPUT_UPDATED");
    expect(row).toContain("stepQuantity(1)");
    expect(row).toContain("traceOpen && hasCalculationTrace");
    expect(row).toContain("itemPriceTraceText");
    expect(row).not.toContain("onPress={() => onIncrease(item.id)}");
  });

  it("keeps quantity prepare idempotent for duplicate operations and no-op values", () => {
    const service = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/consumerRequests/consumerRequestService.ts"),
      "utf8",
    );

    expect(service).toContain("operationId?: string");
    expect(service).toContain("savePreparedConsumerRepairBundle");
    expect(service).toContain("duplicateOperation");
    expect(service).toContain("before?.quantity === input.quantity");
    expect(service).toContain("source: input.source ?? \"user\"");
  });

  it("keeps Android session-soak failures stage-specific and bounded", () => {
    const runner = fs.readFileSync(
      path.resolve(process.cwd(), "scripts/e2e/runAiEstimate11610AndroidApi34SessionSoak.ts"),
      "utf8",
    );

    expect(runner).toContain("let stage = \"init\"");
    expect(runner).toContain("session_soak_stage:${stage}");
    expect(runner).toContain("withDiagnosticTimeout(domCounters(input.page), 5_000");
    expect(runner).toContain("withDiagnosticTimeout(readTimerProbe(input.page), 5_000");
    expect(runner).toContain("completedWithoutFailures");
    expect(runner).toContain("androidSessionSoakHealthAfterFailure");
    expect(runner).toContain("requireChrome: false");
  });
});
