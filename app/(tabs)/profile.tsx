import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";
import ProfileScreenComponent from "../../src/screens/profile/ProfileScreen";

export default withScreenErrorBoundary(ProfileScreenComponent, {
  screen: "profile",
  route: "/profile",
});
