import { ForemanScreen } from "../../src/screens/foreman/ForemanScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

export { ForemanScreen };

export default withScreenErrorBoundary(ForemanScreen, {
  screen: "foreman",
  route: "/foreman",
});
