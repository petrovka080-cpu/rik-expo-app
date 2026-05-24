import { runAndroidAi50000Phase3Segment } from "./runAndroidAi50000Phase3LiveDomainSampleSmoke";

if (require.main === module) {
  runAndroidAi50000Phase3Segment("product_search")
    .then((result) => {
      console.log(result.androidPassed ? "GREEN_BUILT_IN_AI_50000_PHASE3_ANDROID_PRODUCT_SEARCH_READY" : "BLOCKED_ANDROID_PHASE3_PRODUCT_SEARCH_FAILED");
      if (!result.androidPassed) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
