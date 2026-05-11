import fs from "fs";
import path from "path";

const prefix = "S_RELEASE_CORE_01_ANDROID_EMULATOR_IOS_SUBMIT";
const artifactDir = path.join(process.cwd(), "artifacts");

describe("combined release artifacts", () => {
  it("encode Android, iOS, OTA, AI role, and secret safety status", () => {
    const matrixPath = path.join(artifactDir, `${prefix}_matrix.json`);
    const androidPath = path.join(artifactDir, `${prefix}_android.json`);
    const iosPath = path.join(artifactDir, `${prefix}_ios.json`);
    const inventoryPath = path.join(artifactDir, `${prefix}_inventory.json`);

    for (const filePath of [matrixPath, androidPath, iosPath, inventoryPath]) {
      expect(fs.existsSync(filePath)).toBe(true);
    }

    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    expect(matrix.ota.used).toBe(false);
    expect(matrix.ota.production_ota_used).toBe(false);
    expect(matrix.secrets.credentials_in_cli_args).toBe(false);
    expect(matrix.secrets.credentials_printed).toBe(false);
    expect(matrix.ai_role_screen_e2e.auth_admin_used).toBe(false);
    expect(matrix.ai_role_screen_e2e.service_role_used).toBe(false);
    expect(matrix.ai_role_screen_e2e.list_users_used).toBe(false);

    const android = JSON.parse(fs.readFileSync(androidPath, "utf8"));
    expect(android.physical_device_required).toBe(false);
    expect(android.emulator_only).toBe(true);
    expect(android.aab_used_for_direct_install).toBe(false);
    expect(android.google_play_submit).toBe(false);

    const ios = JSON.parse(fs.readFileSync(iosPath, "utf8"));
    expect(ios.simulator_build_used_for_submit).toBe(false);
  });
});
