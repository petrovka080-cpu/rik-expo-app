import React, { useCallback } from "react";

import type { OfficePostReturnSubtree } from "../../lib/navigation/officeReentryBreadcrumbs";
import { OfficePostReturnSubtreeBoundary } from "./officeHub.helpers";

type OfficePostReturnSubtreeRendererParams = {
  handleSubtreeFailure: (
    subtree: OfficePostReturnSubtree,
    error: Error,
    info: React.ErrorInfo,
  ) => void;
  recordPostReturnSubtreeStart: (subtree: OfficePostReturnSubtree) => void;
};

export function useOfficePostReturnSubtreeRenderer({
  handleSubtreeFailure,
  recordPostReturnSubtreeStart,
}: OfficePostReturnSubtreeRendererParams) {
  return useCallback(
    (subtree: OfficePostReturnSubtree, children: React.ReactNode) => (
      <OfficePostReturnSubtreeBoundary
        key={subtree}
        onMount={() => recordPostReturnSubtreeStart(subtree)}
        onError={(error, info) => handleSubtreeFailure(subtree, error, info)}
      >
        {children}
      </OfficePostReturnSubtreeBoundary>
    ),
    [handleSubtreeFailure, recordPostReturnSubtreeStart],
  );
}
