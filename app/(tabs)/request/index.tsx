import { ConsumerRepairRequestScreen } from "../../../src/features/consumerRepair";
import { withScreenErrorBoundary } from "../../../src/shared/ui/ScreenErrorBoundary";

export default withScreenErrorBoundary(ConsumerRepairRequestScreen, {
  route: "/request",
  screen: "request",
});
