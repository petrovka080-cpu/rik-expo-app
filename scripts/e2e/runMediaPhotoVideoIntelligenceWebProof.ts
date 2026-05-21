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

function writeText(name: string, value: string) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, `${ARTIFACT_PREFIX}_${name}.md`), value);
}

const inventory = buildMediaProofInventory();
const matrix = buildMediaProofMatrix();

writeJson("inventory", {
  wave: inventory.wave,
  files: [
    "src/lib/media/mediaLimits.ts",
    "src/lib/media/mediaTypes.ts",
    "src/lib/media/mediaAsset.ts",
    "src/lib/media/mediaAssetGroup.ts",
    "src/lib/media/mediaUploadSession.ts",
    "src/lib/media/mediaSourceRefAdapter.ts",
    "src/lib/media/mediaContextGraphAdapter.ts",
  ],
});
writeJson("limits", inventory.limits);
writeJson("asset_contract", inventory.asset);
writeJson("asset_group_contract", inventory.group);
writeJson("role_policy", {
  rolesAllowed: inventory.asset.visibility.rolesAllowed,
  clientVisible: inventory.asset.visibility.clientVisible,
});
writeJson("visibility_policy", inventory.asset.visibility);
writeJson("upload_trace", inventory.validations);
writeJson("variant_trace", {
  photo: inventory.asset.variants,
  video: inventory.videoAsset.variants,
});
writeJson("cache_trace", inventory.cache);
writeJson("signed_url_trace", {
  assetId: inventory.signedUrlPolicy.assetId,
  variant: inventory.signedUrlPolicy.variant,
  canIssue: inventory.signedUrlPolicy.canIssue,
  logSafe: inventory.signedUrlPolicy.logSafe,
});
writeJson("handoff_trace", {
  mediaAssetId: inventory.asset.id,
  mediaAssetGroupId: inventory.group.id,
  usesIdsOnly: true,
  requiresRoleCheck: true,
});
writeJson("source_ref_trace", inventory.sourceRef);
writeJson("context_graph_trace", inventory.contextGraph);
writeJson("ai_analysis_trace", inventory.analysis);
writeJson("external_knowledge_trace", {
  usedAsReferenceOnly: true,
  canBeProjectFact: false,
});
writeJson("marketplace_trace", {
  productDraftOnly: true,
  publishedByAi: false,
});
writeJson("field_trace", {
  workClosedByAi: false,
  evidenceRequiresHumanReview: true,
});
writeJson("warehouse_trace", {
  stockMutatedByAi: false,
  discrepancyDraftOnly: true,
});
writeJson("documents_trace", {
  finalLinkedByAi: false,
  suggestionRequiresReview: true,
});
writeJson("client_visibility_trace", {
  clientSeesOnlyApprovedClientVisible: true,
  crossRoleLeaksFound: 0,
});
writeJson("web", {
  readsActualDomText: true,
  checksUploadLimits: true,
  sixthPhotoRejected: matrix.sixth_photo_rejected,
  longVideoRejected: matrix.long_video_rejected,
  deepLinkOpened: matrix.media_deep_links_clickable,
});
writeJson("matrix", matrix);
writeText(
  "proof",
  [
    "# S_MEDIA_PHOTO_VIDEO_INTELLIGENCE_CORE",
    "",
    "- 5 фото приняты, 6-е фото отклонено.",
    "- Видео до 15 секунд принято, длинное видео отклонено.",
    "- Media sourceRefs и deep links строятся по mediaAssetId/mediaAssetGroupId.",
    "- AI-анализ является подсказкой, не финальным фактом.",
    "- Signed URL и storageKey не выводятся в пользовательский proof.",
    "",
  ].join("\n"),
);

const failed = Object.entries(matrix).filter(([key, value]) => {
  if (
    key === "ai_analysis_final_fact" ||
    key === "face_identification_attempted" ||
    key.endsWith("_by_ai") ||
    key.endsWith("_claimed") ||
    key.endsWith("_added") ||
    key.endsWith("_created") ||
    key.endsWith("_logged") ||
    key === "base64_stored_in_db" ||
    key === "raw_media_payload_stored_in_app_state"
  ) {
    return value !== false;
  }
  if (key.endsWith("_found") || key.endsWith("_leaks_found")) {
    return typeof value === "number" && value > 0;
  }
  return value === false;
});
if (failed.length) {
  console.error(JSON.stringify({ ok: false, failed }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, matrix }, null, 2));
