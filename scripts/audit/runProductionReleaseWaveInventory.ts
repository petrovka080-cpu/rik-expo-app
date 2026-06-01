import { writeWaveInventory } from "../release/releaseStateCleanupCore";

const report = writeWaveInventory(process.cwd());

console.log(report.final_status);

if (report.final_status !== "GREEN_WAVES_INVENTORIED") {
  process.exitCode = 1;
}
