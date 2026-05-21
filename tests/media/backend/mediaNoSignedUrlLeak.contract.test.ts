import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("media signed URL leak guard", () => {
  it("does not pass signed URLs between visible route components", () => {
    const foremanScreen = read("src/screens/foreman/ForemanScreen.tsx");
    const listingModal = read("src/screens/profile/components/ListingModal.tsx");
    const contractorScreen = read("src/screens/contractor/ContractorScreenView.tsx");

    const visibleRouteCode = [foremanScreen, listingModal, contractorScreen].join("\n");

    expect(visibleRouteCode).not.toMatch(/signedUrl|signed_url|storageKey|storage_key/);
  });
});
