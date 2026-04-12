import { BuyerScreen } from "../../src/screens/buyer/BuyerScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

export { BuyerScreen };

export default withScreenErrorBoundary(BuyerScreen, {
  screen: "buyer",
  route: "/buyer",
});
