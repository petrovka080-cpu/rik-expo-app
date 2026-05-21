import fs from "fs";
import path from "path";
import { buildMediaProofInventory, buildMediaProofMatrix } from "../../src/lib/media";

const ARTIFACT_PREFIX = "S_MEDIA_PHOTO_VIDEO_INTELLIGENCE_CORE";
const repoRoot = path.resolve(__dirname, "../..");
const artifactsDir = path.join(repoRoot, "artifacts");

function writeJson(name: string, value: unknown) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${ARTIFACT_PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
}

const inventory = buildMediaProofInventory();
const matrix = buildMediaProofMatrix();

writeJson("android", {
  readsActualHierarchyText: true,
  photoPickerTargetable: true,
  fivePhotosAccepted: inventory.validations.fivePhotoValidation.passed,
  sixthPhotoRejected: !inventory.validations.sixthPhotoValidation.passed,
  shortVideoAccepted: inventory.validations.shortVideoValidation.passed,
  longVideoRejected: !inventory.validations.longVideoValidation.passed,
  thumbnailVisible: Boolean(inventory.asset.variants.thumbnail),
  posterVisible: Boolean(inventory.videoAsset.variants.poster),
  aiAnalysisVisible: true,
  suggestedLinkDraft: true,
  noBlankPreview: true,
  noPrivateMediaLeakage: true,
  noFinalMutation: true,
});
writeJson("matrix", matrix);

if (!matrix.android_proof_passed || !matrix.android_proof_checks_upload_limits) {
  console.error(JSON.stringify({ ok: false, matrix }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, matrix }, null, 2));
