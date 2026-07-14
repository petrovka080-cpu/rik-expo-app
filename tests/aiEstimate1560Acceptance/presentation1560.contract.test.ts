import { presentation1560 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance presentation audit", () => {
  it("exposes professional Russian presentation labels without internal keys", () => {
    const audit = presentation1560();
    expect(audit.presentation_cases_total).toBe(1560);
    expect(audit.visible_ru_labels_passed).toBe(1560);
    expect(audit.visible_materials_section_passed).toBe(1560);
    expect(audit.visible_labor_section_passed).toBe(1560);
    expect(audit.mojibake_found).toBe(0);
    expect(audit.english_debug_labels_visible).toBe(0);
    expect(audit.internal_keys_visible).toBe(0);
    expect(audit.failures).toEqual([]);
  });
});
