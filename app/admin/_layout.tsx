import { Slot } from "expo-router";

import { PlatformDeveloperRouteGate } from "../../src/lib/platformDeveloper/PlatformDeveloperRouteGate";

export default function AdminLayout() {
  return (
    <PlatformDeveloperRouteGate>
      <Slot />
    </PlatformDeveloperRouteGate>
  );
}
