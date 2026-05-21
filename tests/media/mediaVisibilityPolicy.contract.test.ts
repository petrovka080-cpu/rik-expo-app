import { isMediaVisibleToClient } from "../../src/lib/media";
import { mediaAsset } from "./mediaTestFixtures";

test("client visibility requires approved client-visible media", () => {
  expect(isMediaVisibleToClient(mediaAsset({ visibility: { rolesAllowed: ["client"], clientVisible: true, publicMarketplaceVisible: false, requiresSignedUrl: true } }))).toBe(false);
  expect(isMediaVisibleToClient(mediaAsset({ moderationStatus: "approved", visibility: { rolesAllowed: ["client"], clientVisible: true, publicMarketplaceVisible: false, requiresSignedUrl: true } }))).toBe(true);
});
