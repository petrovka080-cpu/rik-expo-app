import fs from "node:fs";
import path from "node:path";

describe("previous BOQ exact materials closeout prerequisite", () => {
  it("requires previous BOQ exact materials green and visible label proof artifact", () => {
    const artifactDir = path.resolve(process.cwd(), "artifacts", "S_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS");
    const matrix = JSON.parse(fs.readFileSync(path.join(artifactDir, "matrix.json"), "utf8")) as { final_status?: string };
    const proofPath = path.join(artifactDir, "live_ui_visible_label_proof.json");
    expect(matrix.final_status).toBe("GREEN_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS_READY");
    expect(fs.existsSync(proofPath)).toBe(true);
    const proof = JSON.parse(fs.readFileSync(proofPath, "utf8")) as Record<string, unknown>;
    expect(proof).toMatchObject({
      live_request_ui_checked: true,
      catalog_modal_checked: true,
      foundation_system_visible: false,
      foundation_system_assurance_visible: false,
      foundation_concrete_visible: false,
      warning_visible_as_label: false,
      snake_case_visible: false,
      control_volume_rows_as_paid_items: 0,
      catalog_modal_internal_keys_visible: 0,
      screenshots_saved: true,
      fake_green_claimed: false,
    });
  });
});
