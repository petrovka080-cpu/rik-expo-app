import React from "react";

import { ProtectedIdentityBoundary } from "../../components/auth/ProtectedIdentityBoundary";
import { ProfileContent } from "./ProfileContent";

export function ProfileScreen() {
  return (
    <ProtectedIdentityBoundary returnTo="/profile" surface="profile">
      {(identity) => <ProfileContent verifiedIdentity={identity} />}
    </ProtectedIdentityBoundary>
  );
}

export default ProfileScreen;
