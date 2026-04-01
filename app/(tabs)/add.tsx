import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";
import ProfileScreen from "../../src/screens/profile/ProfileScreen";

export default withScreenErrorBoundary(ProfileScreen, {
  screen: "profile",
  route: "/add",
});
