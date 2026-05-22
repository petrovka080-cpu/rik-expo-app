import {
  ALL_SCREENS_ENTERPRISE_GREEN_STATUS,
  writeAllScreensEnterpriseArtifacts,
} from "./allScreensEnterpriseRuntimeAcceptance.shared";

const report = writeAllScreensEnterpriseArtifacts();
console.log(
  report.bottomNav.labels_present && report.bottomNav.marketplace_plus_after_market
    ? "GREEN_ALL_SCREENS_BOTTOM_NAV_READY"
    : report.matrix.final_status,
);

if (report.matrix.final_status !== ALL_SCREENS_ENTERPRISE_GREEN_STATUS) {
  process.exitCode = 1;
}
