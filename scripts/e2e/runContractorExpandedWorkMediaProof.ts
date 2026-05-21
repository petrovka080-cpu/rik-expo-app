import fs from "node:fs";
import path from "node:path";

const PREFIX = "S_CONTRACTOR_EXPANDED_WORK_MEDIA";
const WAVE = "S_CONTRACTOR_EXPANDED_WORK_MEDIA_POINT_OF_NO_RETURN";
const GREEN_STATUS = "GREEN_CONTRACTOR_EXPANDED_WORK_MEDIA_READY";
const BLOCKED_STATUS = "BLOCKED_CONTRACTOR_EXPANDED_WORK_MEDIA";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SOURCE_MATRIX = path.join(
  ARTIFACT_DIR,
  "S_UI_LIVE_LAYOUT_SHEETS_CHAT_CONTRACTOR_MEDIA_BLOCKER_FIX_matrix.json",
);

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): void {
  const source = JSON.parse(fs.readFileSync(SOURCE_MATRIX, "utf8")) as Record<string, unknown>;
  const matrix = {
    wave: WAVE,
    final_status:
      source.contractor_media_controls_inside_expanded_work === true &&
      source.contractor_media_controls_visible_in_collapsed_list === false &&
      source.contractor_floating_media_block_found === 0
        ? GREEN_STATUS
        : BLOCKED_STATUS,
    contractor_media_inside_expanded_work: source.contractor_media_controls_inside_expanded_work === true,
    contractor_media_visible_in_collapsed_list: source.contractor_media_controls_visible_in_collapsed_list === true,
    contractor_floating_media_block_found: source.contractor_floating_media_block_found,
    source_artifact: path.relative(process.cwd(), SOURCE_MATRIX).replace(/\\/g, "/"),
    fake_green_claimed: false,
  };

  writeJson("matrix", matrix);
  console.log(JSON.stringify(matrix, null, 2));

  if (matrix.final_status !== GREEN_STATUS) {
    process.exitCode = 1;
  }
}

main();
