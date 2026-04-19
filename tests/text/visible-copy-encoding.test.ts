import { readFileSync } from "fs";
import path from "path";

const repoRoot = path.join(__dirname, "..", "..");

const visibleCopyFiles = [
  "src/screens/office/officeHub.companyCreateSection.tsx",
  "src/screens/office/OfficeHubScreen.tsx",
  "src/screens/warehouse/warehouse.tab.empty.ts",
  "src/screens/contractor/contractor.visibilityRecovery.ts",
  "src/screens/subcontracts/subcontracts.shared.ts",
];

const mojibakeMarkers = [
  /Р[ ЃЂЊЋђѓќњџўЎЈ¤§©«¬®°±²³ґµ¶·ё№]/,
  /Р[ЏђЃЂЋЌЎџќљњћЎЈ¤Ґ¦§ЁЄЇА-Я]/,
  /С[Ѓ‡…‹ЊЌЋЏђѓ™њџ]/,
  /РІР‚/,
  /вЂ/,
  /В«|В»/,
  /пїЅ|�/,
];

describe("visible client copy encoding guard", () => {
  it.each(visibleCopyFiles)("%s keeps selected user-facing copy readable", (relativePath) => {
    const source = readFileSync(path.join(repoRoot, relativePath), "utf8");

    for (const marker of mojibakeMarkers) {
      expect(source).not.toMatch(marker);
    }
  });
});
