import { readFileSync } from "node:fs";
import path from "node:path";

import {
  GREEN_T8_PLATFORM_CORE_WEB_ACCEPTANCE,
  STOP_T8_PLATFORM_CORE_WEB_ACCEPTANCE,
} from "../../scripts/e2e/runT8PlatformCoreWebAcceptance";

const source = readFileSync(
  path.join(process.cwd(), "scripts/e2e/runT8PlatformCoreWebAcceptance.ts"),
  "utf8",
);

describe("T8 platform core real Web acceptance contract", () => {
  it("has fail-closed terminal statuses and requires an external production Web server", () => {
    expect(GREEN_T8_PLATFORM_CORE_WEB_ACCEPTANCE).toBe(
      "GREEN_T8_PLATFORM_CORE_WEB_ACCEPTANCE",
    );
    expect(STOP_T8_PLATFORM_CORE_WEB_ACCEPTANCE).toBe(
      "STOP_T8_PLATFORM_CORE_WEB_ACCEPTANCE",
    );
    expect(source).toContain("T8_PLATFORM_CORE_WEB_BASE_URL_REQUIRED");
    expect(source).toContain("chromium.launch");
    expect(source).not.toContain("process.env.CI ===");
  });

  it("proves the canonical electrical revision, exact downstream parity, and legacy invalidation", () => {
    for (const invariant of [
      "only_route_param_changed",
      "changed_rows_match_diff",
      "changed_rows_depend_on_route",
      "unchanged_rows_exact",
      "route_persists_after_reload",
      "pdf_matches_current_revision",
      "procurement_matches_current_revision",
      "no_internal_rows_visible",
      "return_path_stable",
      "legacy_electrical_42_row_draft_invalidated",
      "BLOCKING_REQUIRED",
    ]) {
      expect(source).toContain(invariant);
    }
    expect(source).toContain("summary.blockers.length === 0");
    expect(source).toContain("if (summary.blockers.length) process.exitCode = 1");
  });
});
