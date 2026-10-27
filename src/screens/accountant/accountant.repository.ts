export {
  loadAccountantHistoryWindowData as loadAccountantHistoryPage,
  type AccountantHistoryWindowLoadResult,
} from "./accountant.history.service";
export {
  loadAccountantInboxWindowData as loadAccountantInboxPage,
  type AccountantInboxWindowLoadResult,
} from "./accountant.inbox.service";

export type AccountantLoadTrigger = "focus" | "manual" | "realtime";

export const ACCOUNTANT_FOCUS_REFRESH_MIN_INTERVAL_MS = 1200;
export const ACCOUNTANT_INBOX_PAGE_SIZE = 40;
export const ACCOUNTANT_HISTORY_PAGE_SIZE = 50;
