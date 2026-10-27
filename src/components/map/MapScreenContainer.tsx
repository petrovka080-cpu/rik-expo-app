import React from "react";

import { useMapScreenController } from "./useMapScreenController";
import MapScreenView from "./MapScreenView";

export function MapScreenContainer() {
  const controller = useMapScreenController();
  return <MapScreenView {...controller} />;
}
