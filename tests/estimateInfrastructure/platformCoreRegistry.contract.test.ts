import { AI_ESTIMATE_PLATFORM_ENTRY_IDS } from "../../src/lib/estimate/platformCoreContracts";
import { AI_ESTIMATE_PLATFORM_CORE_REGISTRY } from "../../src/lib/estimate/platformCoreRegistry";
import { validatePlatformCoreRegistry } from "../../src/lib/estimate/validatePlatformCoreRegistry";

describe("AI estimate platform core registry", () => {
  it("registers every estimate entry on the shared platform core", () => {
    const validation = validatePlatformCoreRegistry();

    expect(validation.platform_core_registry_created).toBe(true);
    expect(validation.all_estimate_entries_registered).toBe(true);
    expect(validation.all_entries_use_shared_engine).toBe(true);
    expect(validation.all_entries_use_shared_snapshot_model).toBe(true);
    expect(validation.all_entries_use_shared_revision_model).toBe(true);
    expect(validation.all_entries_use_shared_pdf_renderer).toBe(true);
    expect(validation.all_entries_use_shared_buyer_handoff).toBe(true);
    expect(validation.no_unregistered_estimate_entry_points).toBe(true);
    expect(validation.passed).toBe(true);
    expect(AI_ESTIMATE_PLATFORM_CORE_REGISTRY).toHaveLength(AI_ESTIMATE_PLATFORM_ENTRY_IDS.length);
  });
});
