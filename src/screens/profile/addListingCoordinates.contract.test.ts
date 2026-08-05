import { requestListingCoordinates } from "./addListingCoordinates";
import { UI_COPY } from "./profile.types";

describe("add listing coordinates owner", () => {
  it("fails closed when permission is denied", async () => {
    await expect(
      requestListingCoordinates({
        requestPermission: async () => ({ status: "denied" }),
        getCurrentCoordinates: async () => ({ latitude: 1, longitude: 2 }),
      }),
    ).resolves.toEqual({
      ok: false,
      message: UI_COPY.locationPermissionMessage,
    });
  });

  it("returns only finite coordinates", async () => {
    await expect(
      requestListingCoordinates({
        requestPermission: async () => ({ status: "granted" }),
        getCurrentCoordinates: async () => ({
          latitude: 42.8746,
          longitude: 74.5698,
        }),
      }),
    ).resolves.toEqual({
      ok: true,
      lat: 42.8746,
      lng: 74.5698,
    });

    await expect(
      requestListingCoordinates({
        requestPermission: async () => ({ status: "granted" }),
        getCurrentCoordinates: async () => ({
          latitude: Number.NaN,
          longitude: 74.5698,
        }),
      }),
    ).resolves.toEqual({
      ok: false,
      message: UI_COPY.locationMissingCoordsMessage,
    });
  });
});
