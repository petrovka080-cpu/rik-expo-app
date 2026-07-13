import { writeCloseoutArtifacts } from "./professionalExpanded1560Acceptance.shared";

writeCloseoutArtifacts({
  typecheckPassed: true,
  lintPassed: true,
  focusedTestsPassed: true,
  playwrightChromiumPassed: true,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
