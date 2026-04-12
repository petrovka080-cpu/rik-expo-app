import { DirectorScreen } from "../../src/screens/director/DirectorScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

export { DirectorScreen };

export default withScreenErrorBoundary(DirectorScreen, {
  screen: "director",
  route: "/director",
});
