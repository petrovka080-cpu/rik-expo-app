import { useEffect, type MutableRefObject } from "react";

import {
  setOfficePostReturnProbe,
  type OfficePostReturnProbe,
} from "../../lib/navigation/officeReentryBreadcrumbs";
import type { OfficeAccessScreenData } from "./officeAccess.types";
import type { LoadScreenMode } from "./officeHub.constants";

type OfficeHubLoadScreen = (options?: {
  mode?: LoadScreenMode;
  reason?: string;
}) => Promise<OfficeAccessScreenData | null>;

type OfficeHubBootstrapEffectsParams = {
  initialBootstrapInFlightRef: MutableRefObject<Promise<OfficeAccessScreenData | null> | null>;
  loadScreen: OfficeHubLoadScreen;
  ownerBootstrapCompletedRef: MutableRefObject<boolean>;
  postReturnProbeLabel: string;
  requestedPostReturnProbe: OfficePostReturnProbe[] | null;
  routeScopeActive: boolean;
};

export function useOfficeHubBootstrapEffects({
  initialBootstrapInFlightRef,
  loadScreen,
  ownerBootstrapCompletedRef,
  postReturnProbeLabel,
  requestedPostReturnProbe,
  routeScopeActive,
}: OfficeHubBootstrapEffectsParams) {
  useEffect(() => {
    if (requestedPostReturnProbe) {
      setOfficePostReturnProbe(requestedPostReturnProbe);
      return;
    }
    if (postReturnProbeLabel !== "all") {
      setOfficePostReturnProbe("all");
    }
  }, [postReturnProbeLabel, requestedPostReturnProbe]);

  useEffect(() => {
    if (!routeScopeActive) {
      return;
    }

    if (
      ownerBootstrapCompletedRef.current ||
      initialBootstrapInFlightRef.current
    ) {
      return;
    }

    const task = loadScreen({
      mode: "initial",
      reason: "mount_bootstrap",
    }).finally(() => {
      if (initialBootstrapInFlightRef.current === task) {
        initialBootstrapInFlightRef.current = null;
      }
    });

    initialBootstrapInFlightRef.current = task;
  }, [initialBootstrapInFlightRef, loadScreen, ownerBootstrapCompletedRef, routeScopeActive]);
}
