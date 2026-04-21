let pendingOfficeRouteReturnReceipt: Record<string, unknown> | null = null;
let recentOfficeRouteReturnReceipt: Record<string, unknown> | null = null;

function isSameOfficeRouteReturnReceipt(
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
) {
  if (!left || !right) return false;
  return (
    left === right ||
    (left.sourceRoute === right.sourceRoute &&
      left.target === right.target &&
      left.method === right.method)
  );
}

export function markPendingOfficeRouteReturnReceipt(
  extra?: Record<string, unknown>,
) {
  const receipt = { ...(extra ?? {}) };
  pendingOfficeRouteReturnReceipt = receipt;
  recentOfficeRouteReturnReceipt = receipt;
}

export function consumePendingOfficeRouteReturnReceipt() {
  const next = pendingOfficeRouteReturnReceipt;
  pendingOfficeRouteReturnReceipt = null;
  if (next) {
    recentOfficeRouteReturnReceipt = next;
  }
  return next;
}

export function peekPendingOfficeRouteReturnReceipt() {
  return pendingOfficeRouteReturnReceipt ?? recentOfficeRouteReturnReceipt;
}

export function clearPendingOfficeRouteReturnReceipt(
  receipt?: Record<string, unknown> | null,
) {
  const target = receipt ?? recentOfficeRouteReturnReceipt;
  if (!target) {
    pendingOfficeRouteReturnReceipt = null;
    recentOfficeRouteReturnReceipt = null;
    return;
  }

  if (isSameOfficeRouteReturnReceipt(pendingOfficeRouteReturnReceipt, target)) {
    pendingOfficeRouteReturnReceipt = null;
  }
  if (isSameOfficeRouteReturnReceipt(recentOfficeRouteReturnReceipt, target)) {
    recentOfficeRouteReturnReceipt = null;
  }
}
