import React from "react";

import OfficeShellContent from "./OfficeShellContent";
import type { OfficeHubScreenProps } from "./officeHub.helpers";
import { useOfficeHubScreenController } from "./useOfficeHubScreenController";

export { __resetOfficeHubBootstrapSnapshotForTests } from "./officeHubBootstrapSnapshot";

export default function OfficeHubScreen(props: OfficeHubScreenProps) {
  const controller = useOfficeHubScreenController(props);
  return <OfficeShellContent {...controller} />;
}
