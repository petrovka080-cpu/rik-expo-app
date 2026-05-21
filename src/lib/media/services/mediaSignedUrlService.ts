import type { MediaSignedUrlPolicy } from "../mediaTypes";

export type MediaSignedUrlIssueDecision = {
  issued: boolean;
  assetId: string;
  variant: string;
  expiresInSeconds: number;
  logSafe: MediaSignedUrlPolicy["logSafe"];
  userMessageRu: string;
};

export function issueMediaAccessToken(policy: MediaSignedUrlPolicy): MediaSignedUrlIssueDecision {
  return {
    issued: policy.canIssue,
    assetId: policy.assetId,
    variant: policy.variant,
    expiresInSeconds: policy.ttlSeconds,
    logSafe: policy.logSafe,
    userMessageRu: policy.canIssue ? "Доступ к медиа разрешён." : policy.reasonRu ?? "Доступ к медиа ограничен.",
  };
}
