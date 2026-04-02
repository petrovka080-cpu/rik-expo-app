import fs from "fs";
import path from "path";

describe("ListingModal source contract", () => {
  it("uses add-listing owner test ids and no longer contains profile-linked listing ids", () => {
    const filePath = path.join(
      process.cwd(),
      "src/screens/profile/components/ListingModal.tsx",
    );
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain('testID="add-listing-owner-shell"');
    expect(source).toContain('testID="add-listing-header-back"');
    expect(source).toContain('testID="add-listing-flow-close"');
    expect(source).toContain('testID="add-listing-flow-publish"');
    expect(source).toContain('testID="add-listing-item-confirm"');
    expect(source).toContain("React19SafeModal");
    expect(source).toContain("KeyboardAvoidingView");
    expect(source).toContain("SafeAreaView");
    expect(source).toContain("listingFullscreenHost");
    expect(source).not.toContain("  Modal,");

    expect(source).not.toContain("profile-listing-modal");
    expect(source).not.toContain("profile-catalog-modal");
    expect(source).not.toContain("profile-item-modal");
    expect(source).not.toContain("catalogModalOpen");
    expect(source).not.toContain("onCatalogModalClose");
    expect(source).not.toContain("onCatalogModalPick");
    expect(source).not.toContain("modalSub:");
    expect(source).not.toContain("contactsLabel");
    expect(source).not.toContain("whatsappLabel");
    expect(source).not.toContain("emailLabel");
  });
});
