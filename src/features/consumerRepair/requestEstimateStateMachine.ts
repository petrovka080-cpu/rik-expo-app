import type { RequestEstimateDraftEventType, RequestEstimateDraftStatus } from "./requestEstimateDraftTypes";

export type RequestEstimateStateTransition = {
  from: RequestEstimateDraftStatus;
  event: RequestEstimateDraftEventType;
  to: RequestEstimateDraftStatus;
  allowed: boolean;
  reason?: string;
};

const READY_STATES = new Set<RequestEstimateDraftStatus>(["draft_ready", "editing"]);
const MUTABLE_STATES = new Set<RequestEstimateDraftStatus>(["draft_ready", "editing", "catalog_selecting"]);

function transitionTo(
  from: RequestEstimateDraftStatus,
  event: RequestEstimateDraftEventType,
  to: RequestEstimateDraftStatus,
): RequestEstimateStateTransition {
  return { from, event, to, allowed: true };
}

function blocked(
  from: RequestEstimateDraftStatus,
  event: RequestEstimateDraftEventType,
  reason: string,
): RequestEstimateStateTransition {
  return { from, event, to: from, allowed: false, reason };
}

export function resolveRequestEstimateStateTransition(input: {
  currentStatus: RequestEstimateDraftStatus;
  event: RequestEstimateDraftEventType;
}): RequestEstimateStateTransition {
  const { currentStatus, event } = input;

  if (event === "RESET") return transitionTo(currentStatus, event, "idle");
  if (event === "VALIDATION_FAILED") return transitionTo(currentStatus, event, "blocked_validation");

  if (currentStatus === "sent") {
    return blocked(currentStatus, event, "sent request is immutable except RESET");
  }

  if (currentStatus === "idle") {
    if (event === "GENERATE_ESTIMATE") return transitionTo(currentStatus, event, "generating_estimate");
    return blocked(currentStatus, event, "draft is not generated yet");
  }

  if (currentStatus === "generating_estimate") {
    if (event === "ESTIMATE_READY") return transitionTo(currentStatus, event, "draft_ready");
    return blocked(currentStatus, event, "estimate generation is in progress");
  }

  if (MUTABLE_STATES.has(currentStatus)) {
    if (event === "EDIT_QUANTITY") return transitionTo(currentStatus, event, "editing");
    if (event === "SELECT_CATALOG_ITEM") return transitionTo(currentStatus, event, "catalog_selecting");
    if (event === "ADD_MANUAL_CATALOG_ITEM") return transitionTo(currentStatus, event, "editing");
    if (event === "ADD_CUSTOM_ITEM") return transitionTo(currentStatus, event, "editing");
    if (event === "REMOVE_ITEM") return transitionTo(currentStatus, event, "editing");
    if (event === "RESTORE_ITEM") return transitionTo(currentStatus, event, "editing");
  }

  if (READY_STATES.has(currentStatus) || currentStatus === "catalog_selecting") {
    if (event === "MAKE_PDF") return transitionTo(currentStatus, event, "pdf_generating");
    if (event === "SAVE_DRAFT") return transitionTo(currentStatus, event, "saving");
    if (event === "SEND_REQUEST") return transitionTo(currentStatus, event, "sending");
  }

  if (currentStatus === "pdf_generating" && event === "SAVE_DRAFT") {
    return transitionTo(currentStatus, event, "saving");
  }

  if (currentStatus === "saving") {
    if (event === "SEND_REQUEST") return transitionTo(currentStatus, event, "sending");
    if (event === "MAKE_PDF") return transitionTo(currentStatus, event, "pdf_generating");
  }

  if (currentStatus === "sending" && event === "SEND_REQUEST") {
    return transitionTo(currentStatus, event, "sent");
  }

  if (currentStatus === "blocked_validation" && event === "EDIT_QUANTITY") {
    return transitionTo(currentStatus, event, "editing");
  }

  return blocked(currentStatus, event, `event ${event} is not valid from ${currentStatus}`);
}

export function assertRequestEstimateStateTransitionAllowed(input: {
  currentStatus: RequestEstimateDraftStatus;
  event: RequestEstimateDraftEventType;
}): RequestEstimateStateTransition {
  const transition = resolveRequestEstimateStateTransition(input);
  if (!transition.allowed) {
    throw new Error(`Request estimate transition blocked: ${transition.reason}`);
  }
  return transition;
}
