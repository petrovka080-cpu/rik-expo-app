import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";
import SellerAreaScreen from "../src/features/seller/SellerAreaScreen";

export default withScreenErrorBoundary(SellerAreaScreen, {
  screen: "seller",
  route: "/seller",
  title: "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043a\u0440\u044b\u0442\u044c Seller Area",
});
