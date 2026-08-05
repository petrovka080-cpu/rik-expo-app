export function buildAndroidRouteDeepLink(input: {
  route: "/request" | "/ai";
  prompt: string;
  context?: string;
  automaticParam: "autoPrepare" | "autoSend";
}): string {
  const url = new URL(`rik:///${input.route.replace(/^\//, "")}`);
  url.searchParams.set("prompt", input.prompt);
  if (input.context) url.searchParams.set("context", input.context);
  url.searchParams.set(input.automaticParam, "1");
  return url.toString();
}

export function escapeAndroidRemoteShellUri(uri: string): string {
  // `adb shell` reconstructs a command for the device shell even when the host
  // process API receives separate arguments. Preserve query separators there.
  return uri.replace(/([&|;<>()$`\\"])/g, "\\$1");
}

export function buildAndroidDeepLinkLaunchArgs(deviceId: string, uri: string, packageName: string): string[] {
  return [
    "-s",
    deviceId,
    "shell",
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    escapeAndroidRemoteShellUri(uri),
    packageName,
  ];
}
