import {
  recordCatchDiscipline,
  type CatchDisciplineKind,
} from "../../lib/observability/catchDiscipline";
import {
  beginPlatformObservability,
  recordPlatformObservability,
} from "../../lib/observability/platformObservability";

export type AccountantPaymentFormObservabilityContext = {
  proposalId: string;
  sourceKind: string;
};

type AccountantPaymentFormRequestContext = AccountantPaymentFormObservabilityContext & {
  requestId: number;
};

const proposalExtra = (context: AccountantPaymentFormObservabilityContext) => ({
  proposalId: context.proposalId || null,
});

const requestExtra = (context: AccountantPaymentFormRequestContext) => ({
  proposalId: context.proposalId,
  requestId: context.requestId,
});

export function recordAccountantPaymentFormCatch(
  context: AccountantPaymentFormObservabilityContext,
  kind: CatchDisciplineKind,
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  return recordCatchDiscipline({
    screen: "accountant",
    surface: "active_payment_form",
    event,
    kind,
    error,
    category: event.includes("callback") ? "ui" : "fetch",
    sourceKind: context.sourceKind,
    errorStage: event,
    extra: {
      ...proposalExtra(context),
      ...extra,
    },
  });
}

export function recordAccountantPaymentFormOpened(
  context: AccountantPaymentFormObservabilityContext,
) {
  return recordPlatformObservability({
    screen: "accountant",
    surface: "payment_form",
    category: "ui",
    event: "payment_form_opened",
    result: "success",
    sourceKind: context.sourceKind,
    extra: proposalExtra(context),
  });
}

export function recordAccountantPaymentFormClosed(
  context: AccountantPaymentFormObservabilityContext,
) {
  return recordPlatformObservability({
    screen: "accountant",
    surface: "payment_form",
    category: "ui",
    event: "payment_form_closed",
    result: "success",
    sourceKind: context.sourceKind,
    extra: proposalExtra(context),
  });
}

export function recordAccountantPaymentFormRequestStarted(
  context: AccountantPaymentFormRequestContext,
) {
  return recordPlatformObservability({
    screen: "accountant",
    surface: "payment_form",
    category: "fetch",
    event: "payment_form_request_started",
    result: "success",
    sourceKind: context.sourceKind,
    extra: requestExtra(context),
  });
}

export function beginAccountantPaymentFormLoad(
  context: AccountantPaymentFormRequestContext,
) {
  return beginPlatformObservability({
    screen: "accountant",
    surface: "payment_form",
    category: "fetch",
    event: "payment_form_load",
    sourceKind: context.sourceKind,
    trigger: "open",
    extra: requestExtra(context),
  });
}

export function recordAccountantPaymentFormStaleResponseIgnored(
  context: AccountantPaymentFormRequestContext,
) {
  return recordPlatformObservability({
    screen: "accountant",
    surface: "payment_form",
    category: "fetch",
    event: "payment_form_stale_response_ignored",
    result: "skipped",
    sourceKind: context.sourceKind,
    extra: {
      ...requestExtra(context),
      guardReason: "stale_response_ignored",
    },
  });
}

export function recordAccountantPaymentFormReady(
  context: AccountantPaymentFormRequestContext,
  details: {
    rowCount: number;
    paidAllocationCount: number;
    paymentEligible: boolean;
    failureCode: string | null;
  },
) {
  return recordPlatformObservability({
    screen: "accountant",
    surface: "payment_form",
    category: "ui",
    event: "payment_form_ready",
    result: "success",
    sourceKind: context.sourceKind,
    extra: {
      ...requestExtra(context),
      rowCount: details.rowCount,
      paidAllocationCount: details.paidAllocationCount,
      paymentEligible: details.paymentEligible,
      failureCode: details.failureCode,
    },
  });
}

export function recordAccountantPaymentFormRequestCanceled(
  context: AccountantPaymentFormRequestContext,
) {
  return recordPlatformObservability({
    screen: "accountant",
    surface: "payment_form",
    category: "fetch",
    event: "payment_form_request_canceled",
    result: "skipped",
    sourceKind: context.sourceKind,
    extra: {
      ...requestExtra(context),
      guardReason: "lifecycle_cleanup",
    },
  });
}
