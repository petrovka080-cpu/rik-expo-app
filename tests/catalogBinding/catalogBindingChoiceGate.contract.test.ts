import fs from "node:fs";
import path from "node:path";

describe("catalog binding choice gate", () => {
  it("uses exactly one allowed catalog integration option", () => {
    const choice = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../artifacts/S_CATALOG_ITEMS_GLOBAL_ESTIMATE_BINDING_choice.json"), "utf8"));
    expect([
      "OPTION_A_REUSE_EXISTING_CATALOG_ITEMS_SERVICE",
      "OPTION_B_EXTRACT_SHARED_CATALOG_ITEMS_SERVICE_FROM_FOREMAN_FLOW",
      "OPTION_C_BLOCKED_CATALOG_ITEMS_SCHEMA_INSUFFICIENT",
    ]).toContain(choice.selected_option);
    expect(choice.selected_option).toBe("OPTION_A_REUSE_EXISTING_CATALOG_ITEMS_SERVICE");
    expect(choice.choice_justified).toBe(true);
  });
});
