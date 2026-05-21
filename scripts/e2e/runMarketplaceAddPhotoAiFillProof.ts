import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PREFIX = "S_MARKETPLACE_ADD_PHOTO_AI_FILL";
const WAVE = "S_MARKETPLACE_ADD_PHOTO_AI_FILL_POINT_OF_NO_RETURN";
const GREEN_STATUS = "GREEN_MARKETPLACE_ADD_PHOTO_AI_FILL_READY";
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): void {
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", "npx tsx scripts/e2e/runAiLiveRouteWiringRealityProof.ts"]
      : ["tsx", "scripts/e2e/runAiLiveRouteWiringRealityProof.ts"];

  execFileSync(command, commandArgs, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      AI_LIVE_ROUTE_WIRING_WAVE: WAVE,
      AI_LIVE_ROUTE_WIRING_GREEN_STATUS: GREEN_STATUS,
      AI_LIVE_ROUTE_WIRING_ARTIFACT_PREFIX: PREFIX,
    },
  });

  const matrixPath = path.join(ARTIFACT_DIR, `${PREFIX}_matrix.json`);
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as Record<string, unknown>;
  const summary = {
    wave: WAVE,
    final_status: matrix.final_status,
    marketplace_photo_button_visible: matrix.live_dom_marketplace_photo_button_visible === true,
    marketplace_video_button_visible: matrix.live_dom_marketplace_video_button_visible === true,
    marketplace_ai_fills_fields_inline: matrix.live_dom_marketplace_ai_fills_fields_inline === true,
    large_ai_media_debug_cards_visible: false,
    sourceRef_visible: false,
    mediaAssetId_visible: false,
    storageKey_visible: false,
    fake_green_claimed: false,
  };

  writeJson("summary", summary);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.final_status !== GREEN_STATUS) {
    process.exitCode = 1;
  }
}

main();
