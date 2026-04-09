import React, { useLayoutEffect } from "react";

import OfficeHubScreen from "../../../src/screens/office/OfficeHubScreen";
import { recordOfficeReentryFailure, recordOfficeReentryStart } from "../../../src/lib/navigation/officeReentryBreadcrumbs";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

type OfficeReentryCrashBoundaryProps = {
  children: React.ReactNode;
};

type OfficeReentryCrashBoundaryState = {
  error: Error | null;
};

class OfficeReentryCrashBoundary extends React.Component<
  OfficeReentryCrashBoundaryProps,
  OfficeReentryCrashBoundaryState
> {
  state: OfficeReentryCrashBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): Partial<OfficeReentryCrashBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    recordOfficeReentryFailure({
      error,
      errorStage: "render_boundary",
      extra: {
        owner: "office_route_boundary",
        componentStack: String(info.componentStack || "").trim().slice(0, 2000),
      },
    });
  }

  render() {
    if (this.state.error) {
      throw this.state.error;
    }

    return this.props.children;
  }
}

function OfficeIndexRoute() {
  useLayoutEffect(() => {
    recordOfficeReentryStart({
      owner: "office_index_route",
    });
  }, []);

  return (
    <OfficeReentryCrashBoundary>
      <OfficeHubScreen />
    </OfficeReentryCrashBoundary>
  );
}

export default withScreenErrorBoundary(OfficeIndexRoute, {
  screen: "office",
  route: "/office",
});
