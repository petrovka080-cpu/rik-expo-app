import AuctionsScreen from "../../src/features/auctions/AuctionsScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function AuctionsRoute() {
  return <AuctionsScreen />;
}

export default withScreenErrorBoundary(AuctionsRoute, {
  screen: "auctions",
  route: "/auctions",
});
