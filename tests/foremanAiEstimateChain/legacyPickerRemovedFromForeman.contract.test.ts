import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildForemanAiEstimateLegacyCleanupAudit } from "../../src/lib/foremanAiEstimate/foremanAiEstimateLegacyCleanupAudit";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("foreman AI estimate legacy cleanup acceptance", () => {
  it("removes the old work-type picker path from foreman materials", () => {
    const audit = buildForemanAiEstimateLegacyCleanupAudit();

    expect(audit.old_picker_openable_from_foreman).toBe(false);
    expect(audit.old_picker_imported_by_foreman).toBe(false);
    expect(audit.old_picker_can_create_draft).toBe(false);
    expect(audit.parallel_draft_path_found).toBe(false);
    expect(audit.safe_legacy_cleanup_complete).toBe(true);
    expect(audit.foreman_route_detached).toBe(true);
    expect(audit.material_legacy_matches).toEqual([]);
  });

  it("documents the old picker as fully removed from foreman surfaces", () => {
    const audit = buildForemanAiEstimateLegacyCleanupAudit();
    const subcontractSource = read("src/screens/foreman/ForemanSubcontractTab.sections.tsx");

    expect(audit.old_picker_used_outside_foreman).toBe(false);
    expect(audit.usage_justification_written).toBe(false);
    expect(subcontractSource).not.toContain("WorkTypePicker");
    expect(read("src/screens/foreman/ForemanMaterialsContent.sections.tsx")).not.toContain("WorkTypePicker");
    expect(read("src/screens/foreman/hooks/useForemanActions.ts")).not.toContain("handleCalcAddToRequest");
  });
});
