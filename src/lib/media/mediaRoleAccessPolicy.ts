import type { MediaAsset, MediaOwnerRole } from "./mediaTypes";

export type MediaRoleAccessDecision = {
  canOpen: boolean;
  reasonRu?: string;
};

export function resolveMediaRoleAccess(
  asset: Pick<MediaAsset, "ownerUserId" | "visibility" | "orgId">,
  requester: {
    userId: string;
    role: MediaOwnerRole;
    orgId: string;
  },
): MediaRoleAccessDecision {
  if (asset.orgId !== requester.orgId) {
    return { canOpen: false, reasonRu: "Медиа относится к другой организации." };
  }

  if (asset.visibility.rolesAllowed.includes(requester.role)) {
    return { canOpen: true };
  }

  if (requester.role === "client" && asset.visibility.clientVisible) {
    return { canOpen: true };
  }

  if (asset.ownerUserId === requester.userId) {
    return { canOpen: true };
  }

  return { canOpen: false, reasonRu: "Медиа скрыто по правам роли." };
}
