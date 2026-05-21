import type { MediaPurpose } from "./mediaTypes";

export type MediaPurposePolicy = {
  purpose: MediaPurpose;
  requiresHumanReview: boolean;
  finalLinkAllowedByAi: false;
  finalMutationAllowedByAi: false;
  defaultStatusRu: string;
};

export function getMediaPurposePolicy(purpose: MediaPurpose): MediaPurposePolicy {
  return {
    purpose,
    requiresHumanReview: true,
    finalLinkAllowedByAi: false,
    finalMutationAllowedByAi: false,
    defaultStatusRu: "Требуется проверка человека. Данные не изменены.",
  };
}
