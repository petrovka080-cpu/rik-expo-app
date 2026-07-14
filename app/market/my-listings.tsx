import MarketMyListingsScreen from "../../src/features/market/MarketMyListingsScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

export default withScreenErrorBoundary(MarketMyListingsScreen, {
  screen: "market",
  route: "/market/my-listings",
  title: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u043c\u043e\u0438 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f",
});
