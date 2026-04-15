import fs from "fs";
import path from "path";

import {
  beginAccountantPaymentFormLoad,
  recordAccountantPaymentFormCatch,
  recordAccountantPaymentFormClosed,
  recordAccountantPaymentFormOpened,
  recordAccountantPaymentFormReady,
  recordAccountantPaymentFormRequestCanceled,
  recordAccountantPaymentFormRequestStarted,
  recordAccountantPaymentFormStaleResponseIgnored,
} from "./accountant.paymentForm.observability";

const mockRecordCatchDiscipline = jest.fn((params: unknown) => params);
const mockRecordPlatformObservability = jest.fn((params: unknown) => params);
const mockObservation = {
  success: jest.fn(),
  error: jest.fn(),
};
const mockBeginPlatformObservability = jest.fn((params: unknown) => {
  void params;
  return mockObservation;
});

jest.mock("../../lib/observability/catchDiscipline", () => ({
  recordCatchDiscipline: (params: unknown) => mockRecordCatchDiscipline(params),
}));

jest.mock("../../lib/observability/platformObservability", () => ({
  beginPlatformObservability: (params: unknown) => mockBeginPlatformObservability(params),
  recordPlatformObservability: (params: unknown) => mockRecordPlatformObservability(params),
}));

const context = {
  proposalId: "proposal-1",
  sourceKind: "proposal:payment_allocation_form",
};

const requestContext = {
  ...context,
  requestId: 7,
};

describe("accountant payment form observability boundary", () => {
  beforeEach(() => {
    mockRecordCatchDiscipline.mockClear();
    mockRecordPlatformObservability.mockClear();
    mockBeginPlatformObservability.mockClear();
    mockObservation.success.mockClear();
    mockObservation.error.mockClear();
  });

  it("preserves payment form lifecycle and fetch marker payloads", () => {
    recordAccountantPaymentFormOpened(context);
    recordAccountantPaymentFormClosed(context);
    recordAccountantPaymentFormRequestStarted(requestContext);
    const observation = beginAccountantPaymentFormLoad(requestContext);
    recordAccountantPaymentFormStaleResponseIgnored(requestContext);
    recordAccountantPaymentFormReady(requestContext, {
      rowCount: 2,
      paidAllocationCount: 1,
      paymentEligible: true,
      failureCode: null,
    });
    recordAccountantPaymentFormRequestCanceled(requestContext);

    expect(observation).toBe(mockObservation);
    expect(mockBeginPlatformObservability).toHaveBeenCalledWith({
      screen: "accountant",
      surface: "payment_form",
      category: "fetch",
      event: "payment_form_load",
      sourceKind: "proposal:payment_allocation_form",
      trigger: "open",
      extra: {
        proposalId: "proposal-1",
        requestId: 7,
      },
    });
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "accountant",
        surface: "payment_form",
        category: "ui",
        event: "payment_form_opened",
        result: "success",
        sourceKind: "proposal:payment_allocation_form",
        extra: { proposalId: "proposal-1" },
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "payment_form_stale_response_ignored",
        result: "skipped",
        extra: {
          proposalId: "proposal-1",
          requestId: 7,
          guardReason: "stale_response_ignored",
        },
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "payment_form_ready",
        result: "success",
        extra: {
          proposalId: "proposal-1",
          requestId: 7,
          rowCount: 2,
          paidAllocationCount: 1,
          paymentEligible: true,
          failureCode: null,
        },
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "payment_form_request_canceled",
        result: "skipped",
        extra: {
          proposalId: "proposal-1",
          requestId: 7,
          guardReason: "lifecycle_cleanup",
        },
      }),
    );
  });

  it("preserves catch marker category and proposal context", () => {
    const error = new Error("callback failed");

    recordAccountantPaymentFormCatch(
      context,
      "soft_failure",
      "alloc_status_callback_failed",
      error,
      {
        allocOk: false,
        allocSum: 10,
      },
    );

    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith({
      screen: "accountant",
      surface: "active_payment_form",
      event: "alloc_status_callback_failed",
      kind: "soft_failure",
      error,
      category: "ui",
      sourceKind: "proposal:payment_allocation_form",
      errorStage: "alloc_status_callback_failed",
      extra: {
        proposalId: "proposal-1",
        allocOk: false,
        allocSum: 10,
      },
    });
  });

  it("keeps the payment form hook behind the payment form observability boundary", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/screens/accountant/useAccountantPaymentForm.ts"),
      "utf8",
    );

    expect(source).toContain("./accountant.paymentForm.observability");
    expect(source).not.toContain("../../lib/observability/platformObservability");
    expect(source).not.toContain("../../lib/observability/catchDiscipline");
  });
});
