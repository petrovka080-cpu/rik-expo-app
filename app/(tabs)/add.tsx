import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";
import AddListingScreen from "../../src/screens/profile/AddListingScreen";

export default withScreenErrorBoundary(AddListingScreen, {
  screen: "add_listing",
  route: "/add",
  title: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u0435 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
});
