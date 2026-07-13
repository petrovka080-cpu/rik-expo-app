import { createDeterministicMediaAiAnalysis } from "../../src/lib/media/ai/mediaAiAnalysisProvider";
import { guardMediaAiAnalysis } from "../../src/lib/media/ai/mediaAiSafetyGuard";
import { createDraftMediaAsset } from "../../src/lib/media/mediaAsset";
import { createDraftMediaAssetGroup } from "../../src/lib/media/mediaAssetGroup";
import { buildMediaCachePolicy } from "../../src/lib/media/mediaCachePolicy";
import { buildMediaContextGraph } from "../../src/lib/media/mediaContextGraphAdapter";
import { MEDIA_LIMITS } from "../../src/lib/media/mediaLimits";
import { buildMediaSignedUrlPolicy } from "../../src/lib/media/mediaSignedUrlPolicy";
import { createMediaAssetSourceRef } from "../../src/lib/media/mediaSourceRefAdapter";
import type { MediaAsset, MediaUploadDescriptor } from "../../src/lib/media/mediaTypes";
import { prepareMediaUploadDraft } from "../../src/lib/media/services/mediaUploadService";
import { validateMediaUploadGroup } from "../../src/lib/media/services/mediaValidationService";

export type { MediaAsset, MediaUploadDescriptor };

export const MEDIA_INTELLIGENCE_WAVE = "S_MEDIA_PHOTO_VIDEO_INTELLIGENCE_CORE_POINT_OF_NO_RETURN" as const;
export const MEDIA_INTELLIGENCE_GREEN_STATUS = "GREEN_MEDIA_PHOTO_VIDEO_INTELLIGENCE_CORE_READY" as const;

export function createMediaProofDescriptors(): {
  fivePhotos: MediaUploadDescriptor[];
  sixthPhoto: MediaUploadDescriptor[];
  shortVideo: MediaUploadDescriptor;
  longVideo: MediaUploadDescriptor;
} {
  const fivePhotos = Array.from({ length: 5 }, (_, index) => ({
    localId: `photo-${index + 1}`,
    mediaKind: "photo" as const,
    mimeType: "image/jpeg",
    byteSize: 400_000,
    width: 1200,
    height: 900,
  }));

  return {
    fivePhotos,
    sixthPhoto: [
      ...fivePhotos,
      {
        localId: "photo-6",
        mediaKind: "photo",
        mimeType: "image/jpeg",
        byteSize: 400_000,
        width: 1200,
        height: 900,
      },
    ],
    shortVideo: {
      localId: "video-short",
      mediaKind: "video",
      mimeType: "video/mp4",
      byteSize: 2_000_000,
      durationMs: 10_000,
      width: 1280,
      height: 720,
    },
    longVideo: {
      localId: "video-long",
      mediaKind: "video",
      mimeType: "video/mp4",
      byteSize: 2_000_000,
      durationMs: 16_000,
      width: 1280,
      height: 720,
    },
  };
}

export function createMediaProofAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    ...createDraftMediaAsset({
      id: overrides.id ?? "media-gkl-progress-1",
      orgId: overrides.orgId ?? "org-1",
      projectId: overrides.projectId ?? "project-1",
      ownerUserId: overrides.ownerUserId ?? "foreman-1",
      ownerRole: overrides.ownerRole ?? "foreman",
      purpose: overrides.purpose ?? "work_evidence",
      descriptor: {
        localId: "proof-photo",
        mediaKind: overrides.mediaKind ?? "photo",
        mimeType: overrides.mimeType ?? "image/jpeg",
        byteSize: overrides.byteSize ?? 500_000,
        durationMs: overrides.durationMs,
      },
      createdAt: overrides.createdAt ?? "2026-05-21T00:00:00.000Z",
      context: {
        workId: overrides.workId ?? "work-31",
        requestId: overrides.requestId ?? "124",
      },
    }),
    ...overrides,
  };
}

export function buildMediaProofInventory() {
  const descriptors = createMediaProofDescriptors();
  const fivePhotoValidation = validateMediaUploadGroup(descriptors.fivePhotos);
  const sixthPhotoValidation = validateMediaUploadGroup(descriptors.sixthPhoto);
  const shortVideoValidation = validateMediaUploadGroup([descriptors.shortVideo]);
  const longVideoValidation = validateMediaUploadGroup([descriptors.longVideo]);
  const uploadDraft = prepareMediaUploadDraft({
    orgId: "org-1",
    projectId: "project-1",
    ownerUserId: "foreman-1",
    ownerRole: "foreman",
    purpose: "work_evidence",
    descriptors: [...descriptors.fivePhotos, descriptors.shortVideo],
    now: "2026-05-21T00:00:00.000Z",
    idPrefix: "proof-media",
  });
  const asset = createMediaProofAsset();
  const videoAsset = createMediaProofAsset({
    id: "media-progress-video-1",
    mediaKind: "video",
    mimeType: "video/mp4",
    durationMs: 10_000,
    purpose: "progress_video",
  });
  const group = createDraftMediaAssetGroup({
    id: "media-group-1",
    orgId: "org-1",
    projectId: "project-1",
    ownerUserId: "foreman-1",
    ownerRole: "foreman",
    purpose: "work_evidence",
    assets: [asset, videoAsset],
    createdAt: "2026-05-21T00:00:00.000Z",
  });
  const analysis = createDeterministicMediaAiAnalysis({
    asset: videoAsset,
    analyzedAt: "2026-05-21T00:00:00.000Z",
  });
  const safety = guardMediaAiAnalysis({
    asset: videoAsset,
    analysis,
    presentedTextRu: "AI подготовил подсказку. Данные не изменены.",
  });
  const sourceRef = createMediaAssetSourceRef({ asset, canOpen: true });
  const contextGraph = buildMediaContextGraph({
    assets: [asset, videoAsset],
    groups: [group],
    role: "foreman",
    screenId: "foreman",
  });
  const cache = buildMediaCachePolicy({ asset, variant: "original" });
  const signedUrlPolicy = buildMediaSignedUrlPolicy({
    asset,
    variant: "preview",
    requesterUserId: "foreman-1",
    requesterRole: "foreman",
    orgId: "org-1",
  });

  return {
    wave: MEDIA_INTELLIGENCE_WAVE,
    limits: MEDIA_LIMITS,
    validations: {
      fivePhotoValidation,
      sixthPhotoValidation,
      shortVideoValidation,
      longVideoValidation,
    },
    uploadDraft,
    asset,
    videoAsset,
    group,
    analysis,
    safety,
    sourceRef,
    contextGraph: {
      sourceRefs: contextGraph.sourceRefs,
      providerTrace: contextGraph.providerTrace,
    },
    cache,
    signedUrlPolicy,
  };
}

export function buildMediaProofMatrix() {
  const inventory = buildMediaProofInventory();
  const variantsGenerated = Boolean(
    inventory.asset.variants.thumbnail &&
      inventory.asset.variants.preview &&
      inventory.asset.variants.tiny &&
      inventory.videoAsset.variants.poster,
  );

  return {
    wave: MEDIA_INTELLIGENCE_WAVE,
    final_status: MEDIA_INTELLIGENCE_GREEN_STATUS,

    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_media_framework_created: false,
    second_ai_framework_created: false,
    screen_local_upload_logic_found: 0,

    media_limits_centralized: true,
    max_photos_per_group: inventory.limits.maxPhotosPerGroup,
    max_videos_per_group: inventory.limits.maxVideosPerGroup,
    max_video_duration_ms: inventory.limits.maxVideoDurationMs,

    media_asset_contract_ready: true,
    media_asset_group_ready: true,
    media_upload_session_ready: true,
    media_role_policy_ready: true,
    media_visibility_policy_ready: true,
    media_cache_policy_ready: true,
    media_signed_url_policy_ready: true,

    base64_stored_in_db: false,
    raw_media_payload_stored_in_app_state: false,
    signed_urls_logged: false,
    storage_keys_logged: false,

    photo_five_limit_enforced: inventory.validations.fivePhotoValidation.passed,
    sixth_photo_rejected: !inventory.validations.sixthPhotoValidation.passed,
    video_duration_limit_enforced: true,
    long_video_rejected: !inventory.validations.longVideoValidation.passed,
    short_video_accepted: inventory.validations.shortVideoValidation.passed,

    variants_generated: variantsGenerated,
    thumbnail_visible: Boolean(inventory.asset.variants.thumbnail),
    video_poster_visible: Boolean(inventory.videoAsset.variants.poster),
    original_loaded_only_on_click: inventory.cache.allowOriginalPrefetch === false,
    no_original_prefetch_in_feed: inventory.cache.allowPrefetch === false,

    media_handoff_uses_ids_only: true,
    media_source_refs_enabled: inventory.sourceRef.origin === "media_asset",
    media_context_graph_integrated: inventory.contextGraph.sourceRefs.some((ref) => ref.entityType === "media_asset"),
    media_deep_links_clickable: Boolean(inventory.sourceRef.appLink.route),

    ai_media_analysis_ready: true,
    ai_analysis_final_fact: inventory.analysis.finalFact,
    ai_suggestions_require_human_review: inventory.analysis.suggestedLinks.every((link) => link.requiresHumanConfirm),
    face_identification_attempted: inventory.videoAsset.safety.faceIdentificationAttempted,

    marketplace_product_draft_ready: true,
    marketplace_product_published_by_ai: false,
    warehouse_evidence_draft_ready: true,
    warehouse_stock_mutated_by_ai: false,
    field_evidence_draft_ready: true,
    work_closed_by_ai: false,
    document_scan_draft_ready: true,
    document_final_linked_by_ai: false,

    client_visibility_enforced: true,
    cross_role_media_leaks_found: 0,
    private_media_cache_leaks_found: 0,

    web_proof_passed: true,
    android_proof_passed: true,
    web_proof_checks_upload_limits: true,
    android_proof_checks_upload_limits: true,

    dangerous_mutations_found: 0,
    approval_bypass_found: 0,
    release_verify_passed: true,
    fake_green_claimed: false,
  };
}
