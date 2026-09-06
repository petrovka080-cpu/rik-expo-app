import React, { useEffect, useMemo } from "react";

import { serializeBuildIdentity } from "../lib/release/buildIdentity";
import { logger } from "../lib/logger";

type BuildIdentityEvidenceGlobal = typeof globalThis & {
  __RIK_BUILD_IDENTITY_EVIDENCE__?: string;
};

/**
 * Test/evidence-only identity channel. It deliberately renders no customer UI
 * and exposes no accessibility or test node.
 */
export function BuildIdentityDiagnostic() {
  const identity = useMemo(() => serializeBuildIdentity(), []);

  useEffect(() => {
    const root = globalThis as BuildIdentityEvidenceGlobal;
    root.__RIK_BUILD_IDENTITY_EVIDENCE__ = identity;
    logger.releaseEvidence("BuildIdentityEvidence", "identity", { identity });
  }, [identity]);

  return null;
}
