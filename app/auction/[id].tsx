import AuctionDetailScreen from "../../src/features/auctions/AuctionDetailScreen";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function AuctionDetailRoute() {
  return <AuctionDetailScreen />;
}

export default withScreenErrorBoundary(AuctionDetailRoute, {
  screen: "auction_detail",
  route: "/auction/[id]",
  title: "Не удалось открыть торг",
});
