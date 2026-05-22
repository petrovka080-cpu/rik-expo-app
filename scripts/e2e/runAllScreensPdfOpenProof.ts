import {
  ALL_SCREENS_ENTERPRISE_GREEN_STATUS,
  writeAllScreensEnterpriseArtifacts,
} from "./allScreensEnterpriseRuntimeAcceptance.shared";

const report = writeAllScreensEnterpriseArtifacts();
console.log(report.matrix.pdf_open_ready ? "GREEN_ALL_SCREENS_PDF_OPEN_READY" : report.matrix.final_status);

if (report.matrix.final_status !== ALL_SCREENS_ENTERPRISE_GREEN_STATUS) {
  process.exitCode = 1;
}
