import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen validation hints contract", () => {
  it("keeps guided field hints, error summary and submit prevention visible", () => {
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const modal = read("src/screens/profile/components/ListingModal.tsx");
    const primitives = read("src/screens/profile/components/ProfilePrimitives.tsx");
    const styles = read("src/screens/profile/profile.styles.ts");

    expect(screen).toContain("buildAddListingValidationErrors");
    expect(screen).toContain("hasValidationErrors(nextValidationErrors)");
    expect(screen).toContain("firstValidationError(nextValidationErrors)");
    expect(screen).toContain("setValidationErrors(nextValidationErrors)");
    expect(modal).toContain("market-add-error-summary");
    expect(modal).toContain("market-add-media-error");
    expect(modal).toContain("validationErrors.listingTitle");
    expect(modal).toContain("validationErrors.listingDescription");
    expect(modal).toContain("validationErrors.listingCity");
    expect(modal).toContain("validationErrors.listingPrice");
    expect(modal).toContain("validationErrors.listingPhone");
    expect(primitives).toContain("hintText?: string");
    expect(primitives).toContain("errorText?: string | null");
    expect(primitives).toContain("required?: boolean");
    expect(styles).toContain("fieldHintText");
    expect(styles).toContain("fieldErrorText");
  });
});
