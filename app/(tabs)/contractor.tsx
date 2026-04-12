import { ContractorScreen } from "../../src/screens/contractor/ContractorScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

export { ContractorScreen };

export default withScreenErrorBoundary(ContractorScreen, {
  screen: "contractor",
  route: "/contractor",
});
