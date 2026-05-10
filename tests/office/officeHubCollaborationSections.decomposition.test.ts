import { readFileSync } from "fs";
import { join } from "path";

describe("office hub collaboration sections decomposition", () => {
  const sectionsSource = readFileSync(
    join(process.cwd(), "src", "screens", "office", "officeHub.sections.tsx"),
    "utf8",
  );
  const collaborationSource = readFileSync(
    join(process.cwd(), "src", "screens", "office", "officeHub.collaborationSections.tsx"),
    "utf8",
  );

  const countLines = (source: string) => source.replace(/\r?\n$/, "").split(/\r?\n/).length;

  it("keeps the legacy officeHub.sections facade for collaboration section imports", () => {
    expect(sectionsSource).toContain('from "./officeHub.collaborationSections"');
    expect(sectionsSource).toContain("OfficeInviteModalSection");
    expect(sectionsSource).toContain("OfficeInvitesSection");
    expect(sectionsSource).toContain("OfficeMembersSection");
    expect(sectionsSource).not.toContain("export function OfficeInvitesSection(");
    expect(sectionsSource).not.toContain("export function OfficeMembersSection(");
    expect(sectionsSource).not.toContain("export function OfficeInviteModalSection(");
  });

  it("moves collaboration section bodies into the dedicated source module", () => {
    expect(collaborationSource).toContain("export function OfficeInvitesSection(");
    expect(collaborationSource).toContain("export function OfficeMembersSection(");
    expect(collaborationSource).toContain("export function OfficeInviteModalSection(");
  });

  it("keeps the office sections facade below the reduced line budget", () => {
    expect(countLines(sectionsSource)).toBeLessThanOrEqual(440);
  });

  it("keeps extracted collaboration sections transport free", () => {
    expect(collaborationSource).not.toMatch(/supabase|fetch\s*\(|rateLimit|cache/i);
  });
});
