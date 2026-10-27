import fs from "node:fs";
import path from "node:path";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("add listing hook owners", () => {
  it("keeps form state and owner-context loading outside the screen component", () => {
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const formOwner = read(
      "src/screens/profile/hooks/useListingForm.ts",
    );
    const contextOwner = read(
      "src/screens/profile/hooks/useAddListingOwnerContext.ts",
    );

    expect(screen).toContain("useListingForm()");
    expect(screen).toContain("useAddListingOwnerContext({");
    expect(formOwner).toContain("prepareListingForm");
    expect(formOwner).toContain("listingCartItems");
    expect(contextOwner).toContain("loadAddListingOwnerData");
    expect(contextOwner).toContain("loadStoredActiveContext");
    expect(contextOwner).toContain("buildAppAccessModel");
    expect(screen).not.toContain("loadAddListingOwnerData");
    expect(screen).not.toContain("loadStoredActiveContext");
  });
});
