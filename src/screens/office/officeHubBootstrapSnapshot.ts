import type { OfficeAccessScreenData } from "./officeAccess.types";

export const OFFICE_FOCUS_REFRESH_TTL_MS = 60_000;

export type OfficeHubBootstrapSnapshot = {
  data: OfficeAccessScreenData;
  loadedAt: number;
};

let officeHubBootstrapSnapshot: OfficeHubBootstrapSnapshot | null = null;

export function getFreshOfficeHubBootstrapSnapshot(now = Date.now()) {
  if (!officeHubBootstrapSnapshot) return null;
  if (now - officeHubBootstrapSnapshot.loadedAt >= OFFICE_FOCUS_REFRESH_TTL_MS) {
    officeHubBootstrapSnapshot = null;
    return null;
  }
  return officeHubBootstrapSnapshot;
}

export function primeOfficeHubBootstrapSnapshot(
  data: OfficeAccessScreenData,
  loadedAt = Date.now(),
) {
  officeHubBootstrapSnapshot = {
    data,
    loadedAt,
  };
  return officeHubBootstrapSnapshot;
}

export function clearOfficeHubBootstrapSnapshot() {
  officeHubBootstrapSnapshot = null;
}

export function __resetOfficeHubBootstrapSnapshotForTests() {
  clearOfficeHubBootstrapSnapshot();
}
