import * as Location from "expo-location";

import { UI_COPY } from "./profile.types";

export type AddListingLocationGateway = {
  requestPermission: () => Promise<{ status: string }>;
  getCurrentCoordinates: () => Promise<{ latitude: number; longitude: number }>;
};

const expoLocationGateway: AddListingLocationGateway = {
  requestPermission: () => Location.requestForegroundPermissionsAsync(),
  getCurrentCoordinates: async () => {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  },
};

export async function requestListingCoordinates(
  gateway: AddListingLocationGateway = expoLocationGateway,
): Promise<
  | { ok: true; lat: number; lng: number }
  | { ok: false; message: string }
> {
  const { status } = await gateway.requestPermission();
  if (status !== "granted") {
    return { ok: false, message: UI_COPY.locationPermissionMessage };
  }

  try {
    const coordinates = await gateway.getCurrentCoordinates();
    if (
      !Number.isFinite(coordinates.latitude) ||
      !Number.isFinite(coordinates.longitude)
    ) {
      return { ok: false, message: UI_COPY.locationMissingCoordsMessage };
    }
    return {
      ok: true,
      lat: coordinates.latitude,
      lng: coordinates.longitude,
    };
  } catch {
    return { ok: false, message: UI_COPY.locationFailedMessage };
  }
}
