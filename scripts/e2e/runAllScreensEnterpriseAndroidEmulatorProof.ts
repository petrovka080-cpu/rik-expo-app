import {
  ALL_SCREENS_ENTERPRISE_GREEN_STATUS,
  writeAllScreensEnterpriseArtifacts,
} from "./allScreensEnterpriseRuntimeAcceptance.shared";

const report = writeAllScreensEnterpriseArtifacts({ probeAndroid: true });
console.log(
  report.android.proof_passed
    ? "GREEN_ALL_SCREENS_ANDROID_EMULATOR_RUNTIME_READY"
    : report.android.blocker ?? report.matrix.final_status,
);

if (report.matrix.final_status !== ALL_SCREENS_ENTERPRISE_GREEN_STATUS) {
  process.exitCode = 1;
}
