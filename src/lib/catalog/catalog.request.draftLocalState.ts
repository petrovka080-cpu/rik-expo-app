import { recordCatalogWarning } from "./catalog.observability";

const DRAFT_KEY = "foreman_draft_request_id";

let memDraftId: string | null = null;

export function getLocalDraftId(): string | null {
  try {
    if (typeof localStorage !== "undefined")
      return localStorage.getItem(DRAFT_KEY);
  } catch (error) {
    recordCatalogWarning({
      screen: "request",
      event: "draft_storage_get_failed",
      operation: "draftStorage.get",
      error,
      mode: "degraded",
      onceKey: "draft_storage_get_failed",
    });
  }
  return memDraftId;
}

export function setLocalDraftId(value: string) {
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(DRAFT_KEY, value);
  } catch (error) {
    recordCatalogWarning({
      screen: "request",
      event: "draft_storage_set_failed",
      operation: "draftStorage.set",
      error,
      mode: "degraded",
      onceKey: "draft_storage_set_failed",
    });
  }
  memDraftId = value;
}

export function clearLocalDraftId() {
  try {
    if (typeof localStorage !== "undefined")
      localStorage.removeItem(DRAFT_KEY);
  } catch (error) {
    recordCatalogWarning({
      screen: "request",
      event: "draft_storage_clear_failed",
      operation: "draftStorage.clear",
      error,
      mode: "degraded",
      onceKey: "draft_storage_clear_failed",
    });
  }
  memDraftId = null;
}
