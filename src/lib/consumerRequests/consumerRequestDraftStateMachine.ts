import type { ConsumerRepairStatus } from "./consumerRequestTypes";

export type ConsumerRepairDraftAction =
  | "create_draft"
  | "update_draft_fields"
  | "add_item"
  | "remove_item"
  | "update_item_quantity"
  | "select_catalog_item"
  | "attach_media"
  | "save_project_execution"
  | "generate_pdf"
  | "approve"
  | "send_to_marketplace"
  | "idempotent_marketplace_replay"
  | "open_pdf"
  | "archive"
  | "cancel";

export type ConsumerRepairDraftTransition = {
  from: ConsumerRepairStatus | "none";
  action: ConsumerRepairDraftAction;
  to: ConsumerRepairStatus;
};

const EDITABLE_STATUSES = new Set<ConsumerRepairStatus>(["draft", "consumer_approved"]);
const PDF_STATUSES = new Set<ConsumerRepairStatus>(["draft", "consumer_approved", "sent_to_marketplace"]);

export function resolveConsumerRepairDraftTransition(input: {
  currentStatus: ConsumerRepairStatus | "none";
  action: ConsumerRepairDraftAction;
}): ConsumerRepairDraftTransition {
  const { currentStatus, action } = input;

  if (currentStatus === "none") {
    if (action !== "create_draft") {
      throw new Error(`CONSUMER_REPAIR_DRAFT_TRANSITION_REQUIRES_EXISTING_DRAFT:${action}`);
    }
    return { from: "none", action, to: "draft" };
  }

  if (currentStatus === "cancelled" || currentStatus === "archived") {
    if (action === "open_pdf") return { from: currentStatus, action, to: currentStatus };
    throw new Error(`CONSUMER_REPAIR_DRAFT_TRANSITION_CLOSED:${currentStatus}:${action}`);
  }

  if (action === "create_draft") {
    throw new Error(`CONSUMER_REPAIR_DRAFT_TRANSITION_ALREADY_EXISTS:${currentStatus}`);
  }

  if (
    action === "update_draft_fields" ||
    action === "add_item" ||
    action === "remove_item" ||
    action === "update_item_quantity" ||
    action === "select_catalog_item" ||
    action === "attach_media" ||
    action === "save_project_execution"
  ) {
    if (!EDITABLE_STATUSES.has(currentStatus)) {
      throw new Error(`CONSUMER_REPAIR_DRAFT_TRANSITION_NOT_EDITABLE:${currentStatus}:${action}`);
    }
    return { from: currentStatus, action, to: currentStatus };
  }

  if (action === "generate_pdf" || action === "open_pdf") {
    if (!PDF_STATUSES.has(currentStatus)) {
      throw new Error(`CONSUMER_REPAIR_DRAFT_TRANSITION_PDF_NOT_ALLOWED:${currentStatus}`);
    }
    return { from: currentStatus, action, to: currentStatus };
  }

  if (action === "approve") {
    if (currentStatus !== "draft" && currentStatus !== "consumer_approved") {
      throw new Error(`CONSUMER_REPAIR_DRAFT_TRANSITION_APPROVE_NOT_ALLOWED:${currentStatus}`);
    }
    return { from: currentStatus, action, to: "consumer_approved" };
  }

  if (action === "send_to_marketplace") {
    if (currentStatus !== "consumer_approved") {
      throw new Error(`CONSUMER_REPAIR_DRAFT_TRANSITION_SEND_NOT_ALLOWED:${currentStatus}`);
    }
    return { from: currentStatus, action, to: "sent_to_marketplace" };
  }

  if (action === "idempotent_marketplace_replay") {
    if (currentStatus !== "sent_to_marketplace") {
      throw new Error(`CONSUMER_REPAIR_DRAFT_TRANSITION_REPLAY_NOT_ALLOWED:${currentStatus}`);
    }
    return { from: currentStatus, action, to: currentStatus };
  }

  if (action === "archive") return { from: currentStatus, action, to: "archived" };
  if (action === "cancel") return { from: currentStatus, action, to: "cancelled" };

  throw new Error(`CONSUMER_REPAIR_DRAFT_TRANSITION_UNKNOWN:${action satisfies never}`);
}

export function assertConsumerRepairDraftActionAllowed(input: {
  currentStatus: ConsumerRepairStatus | "none";
  action: ConsumerRepairDraftAction;
}): void {
  resolveConsumerRepairDraftTransition(input);
}
