import { buildAllScreensEnterpriseRuntimeReport } from "../../scripts/e2e/allScreensEnterpriseRuntimeAcceptance.shared";

let cached: ReturnType<typeof buildAllScreensEnterpriseRuntimeReport> | null = null;

export function getAllScreensReport() {
  cached ??= buildAllScreensEnterpriseRuntimeReport();
  return cached;
}
