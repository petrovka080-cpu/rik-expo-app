import { AccountantScreen } from "../../src/screens/accountant/AccountantScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

export { AccountantScreen };

export default withScreenErrorBoundary(AccountantScreen, {
  screen: "accountant",
  route: "/accountant",
});
