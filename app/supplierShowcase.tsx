import SupplierShowcaseScreen from "../src/features/supplierShowcase/SupplierShowcaseScreen";
import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

function SupplierShowcaseRoute() {
  return <SupplierShowcaseScreen />;
}

export default withScreenErrorBoundary(SupplierShowcaseRoute, {
  screen: "supplier_showcase",
  route: "/supplierShowcase",
});
