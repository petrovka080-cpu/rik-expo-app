import { runAndroidAi50000Phase3Segment } from "./runAndroidAi50000Phase3LiveDomainSampleSmoke";

if (require.main === module) {
  runAndroidAi50000Phase3Segment("request_draft")
    .then((result) => {
      console.log(result.androidPassed ? "GREEN_BUILT_IN_AI_50000_PHASE3_ANDROID_REQUEST_DRAFT_READY" : "BLOCKED_ANDROID_PHASE3_REQUEST_DRAFT_FAILED");
      if (!result.androidPassed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
