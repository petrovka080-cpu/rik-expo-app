import { MEDIA_LIMITS } from "../mediaLimits";
import { createDraftMediaAsset } from "../mediaAsset";
import { createDraftMediaAssetGroup } from "../mediaAssetGroup";
import { buildMediaCachePolicy } from "../mediaCachePolicy";
import { buildMediaSignedUrlPolicy } from "../mediaSignedUrlPolicy";
import type { MediaAsset, MediaUploadDescriptor } from "../mediaTypes";
import { createDeterministicMediaAiAnalysis } from "../ai/mediaAiAnalysisProvider";
import { guardMediaAiAnalysis } from "../ai/mediaAiSafetyGuard";
import { buildMediaContextGraph } from "../mediaContextGraphAdapter";
import { createMediaAssetSourceRef } from "../mediaSourceRefAdapter";
import { prepareMediaUploadDraft } from "../services/mediaUploadService";
import { validateMediaUploadGroup } from "../services/mediaValidationService";

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
