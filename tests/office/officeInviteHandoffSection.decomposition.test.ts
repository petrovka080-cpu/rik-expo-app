import * as fs from "fs";
import * as path from "path";

import { OfficeInviteHandoffSection } from "../../src/screens/office/officeHub.inviteHandoffSection";

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, "../..", relativePath), "utf8");
}

describe("Office invite handoff decomposition", () => {
  it("keeps the handoff render boundary exported as a component", () => {
    expect(typeof OfficeInviteHandoffSection).toBe("function");
  });

  it("keeps OfficeInvitesSection as the section shell for handoff rendering", () => {
    const sectionsSource = readRepoFile(
      "src/screens/office/officeHub.collaborationSections.tsx",
    );

    expect(sectionsSource).toContain("OfficeInviteHandoffSection");
    expect(sectionsSource).toContain('"invites_handoff"');
    expect(sectionsSource).not.toContain('testID="office-invite-open-whatsapp"');
    expect(sectionsSource).not.toContain('testID="office-invite-copy-message"');
  });

  it("keeps the handoff test-id and action contract in the boundary", () => {
    const handoffSource = readRepoFile(
      "src/screens/office/officeHub.inviteHandoffSection.tsx",
    );

    expect(handoffSource).toContain('testID="office-invite-handoff"');
    expect(handoffSource).toContain('testID="office-invite-copy-code"');
    expect(handoffSource).toContain('testID="office-invite-copy-message"');
    expect(handoffSource).toContain('testID="office-invite-open-whatsapp"');
    expect(handoffSource).toContain('testID="office-invite-open-telegram"');
    expect(handoffSource).toContain('testID="office-invite-open-email"');
  });
});
