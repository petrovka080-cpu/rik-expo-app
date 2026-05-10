import { readFileSync } from "fs";
import { join } from "path";

describe("foreman subcontract draft sections decomposition", () => {
  const sectionsPath = join(process.cwd(), "src", "screens", "foreman", "ForemanSubcontractTab.sections.tsx");
  const draftSectionsPath = join(
    process.cwd(),
    "src",
    "screens",
    "foreman",
    "ForemanSubcontractDraftSections.tsx",
  );
  const sectionsSource = readFileSync(sectionsPath, "utf8");
  const draftSectionsSource = readFileSync(draftSectionsPath, "utf8");

  const countLines = (source: string) => source.replace(/\r?\n$/, "").split(/\r?\n/).length;

  it("keeps the legacy sections facade while moving draft/detail bodies to a dedicated file", () => {
    expect(sectionsSource).toContain('from "./ForemanSubcontractDraftSections"');
    expect(sectionsSource).toContain("export { DraftSheetBody, SubcontractDetailsModalBody }");
    expect(sectionsSource).not.toContain("export function DraftSheetBody(props");
    expect(sectionsSource).not.toContain("export function SubcontractDetailsModalBody(props");
    expect(draftSectionsSource).toContain("export function DraftSheetBody(props");
    expect(draftSectionsSource).toContain("export function SubcontractDetailsModalBody(props");
  });

  it("keeps the remaining sections file below the render-section line budget", () => {
    expect(countLines(sectionsSource)).toBeLessThanOrEqual(460);
  });

  it("keeps extracted presentational bodies transport free", () => {
    expect(draftSectionsSource).not.toMatch(/supabase|fetch\s*\(|rateLimit|cache/i);
  });
});
