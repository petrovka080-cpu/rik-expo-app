import ReportsDashboardScreen from "../../src/features/reports/ReportsDashboardScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function ReportsDashboardRoute() {
  return <ReportsDashboardScreen />;
}

export default withScreenErrorBoundary(ReportsDashboardRoute, {
  screen: "reports_dashboard",
  route: "/reports/dashboard",
});
