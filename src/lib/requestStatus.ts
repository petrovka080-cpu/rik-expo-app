import { normalizeRuText } from "./text/encoding";

export function normalizeStatusToken(raw: unknown): string {
  return String(normalizeRuText(String(raw ?? "")) ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function isRequestApprovedForProcurement(raw: unknown): boolean {
  const s = normalizeStatusToken(raw);
  if (!s) return false;

  // Never treat "на утверждении" as approved.
  if (s.includes("на утверждении") || s.includes("pending")) {
    return false;
  }

  // English approved.
  if (s === "approved") return true;

  // Russian explicit approved forms.
  if (
    s.includes("утверждено") ||
    s.includes("утверждена") ||
    s.includes("утверждёно") ||
    s.includes("утверждёна")
  ) {
    return true;
  }

  // Procurement statuses: "к закупке", "на закупке", etc.
  if (s.includes("закуп")) return true;

  return false;
}

export function isRequestDirectorApproved(raw: unknown): boolean {
  const s = normalizeStatusToken(raw);
  if (!s) return false;

  if (s === "approved") return true;

  if (
    s.includes("утверждено") ||
    s.includes("утверждена") ||
    s.includes("утверждён") ||
    s.includes("утвержден")
  ) {
    return true;
  }

  return false;
}

export function isRequestVisibleInWarehouseIssueQueue(raw: unknown): boolean {
  const s = normalizeStatusToken(raw);
  if (!s) return false;

  // Explicitly not allowed in warehouse issue queue.
  if (
    s.includes("на утверждении") ||
    s.includes("pending") ||
    s.includes("чернов") ||
    s.includes("draft") ||
    s.includes("отклон") ||
    s.includes("reject") ||
    s.includes("закрыт") ||
    s.includes("closed")
  ) {
    return false;
  }

  // Allowed once request passed director approval and can enter issue flow.
  if (
    isRequestApprovedForProcurement(s) ||
    s.includes("к выдач") ||
    s.includes("на выдач") ||
    s.includes("выдач") ||
    s.includes("issue")
  ) {
    return true;
  }

  // Safe default for unknown non-draft/non-pending/non-rejected statuses.
  return true;
}
