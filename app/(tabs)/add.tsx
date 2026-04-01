import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";
import AddListingScreen from "../../src/screens/profile/AddListingScreen";

export default withScreenErrorBoundary(AddListingScreen, {
  screen: "profile",
  route: "/add",
});
