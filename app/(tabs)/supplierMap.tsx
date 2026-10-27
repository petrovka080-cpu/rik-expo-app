import React from "react";
import SupplierMap from "../../src/components/SupplierMap";
import { withScreenErrorBoundary } from "../../src/shared/ui/ScreenErrorBoundary";

function SupplierMapScreen() {
  return <SupplierMap />;
}

export default withScreenErrorBoundary(SupplierMapScreen, {
  screen: "supplier_map",
  route: "/supplierMap",
});
