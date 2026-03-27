import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";

export type AndroidNode = {
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  bounds: string;
  hint: string;
};

export type AndroidScreen = {
  xmlPath: string;
  pngPath: string;
  xml: string;
};

export type AndroidUserCredentials = {
  email: string;
  password: string;
};

export type AndroidPreflightResult = {
  deviceDetected: boolean;
  reverseConfigured: boolean;
  gmsCleared: boolean;
  appStateCleared: boolean;
  packageName: string | null;
};

export type AndroidRecoverySummary = {
  environmentRecoveryUsed: boolean;
  gmsRecoveryUsed: boolean;
  anrRecoveryUsed: boolean;
  blankSurfaceRecovered: boolean;
  devClientBootstrapRecovered: boolean;
};

export type AndroidFailureArtifacts = AndroidScreen & {
  stdoutPath: string;
  stderrPath: string;
  stdoutTail: string;
  stderrTail: string;
};

type AndroidHarnessOptions = {
  projectRoot?: string;
  devClientPort: number;
  devClientStdoutPath?: string;
  devClientStderrPath?: string;
  defaultPackageCandidates?: string[];
  appLabels?: string[];
};

type StartAndroidIntentOptions = {
  packageName?: string | null;
  forceStop?: boolean;
};

type EnsureAndroidDevClientLoadedOptions = {
  packageName: string | null;
  artifactBase: string;
  readyPredicate?: (xml: string) => boolean;
  timeoutMs?: number;
  delayMs?: number;
};

type LoginAndroidWithProtectedRouteOptions = {
  packageName: string | null;
  user: AndroidUserCredentials;
  protectedRoute: string;
  artifactBase: string;
  successPredicate: (xml: string) => boolean;
  renderablePredicate?: (xml: string) => boolean;
  loginScreenPredicate?: (xml: string) => boolean;
  resetAppStateBeforeLogin?: boolean;
};

type OpenAndroidRouteOptions = {
  packageName: string | null;
  routes: string[];
  artifactBase: string;
  predicate: (xml: string) => boolean;
  timeoutMs?: number;
  delayMs?: number;
};

const DEFAULT_PACKAGE_CANDIDATES = [
  "com.azisbek_dzhantaev.rikexpoapp",
  "host.exp.exponent",
];

const DEFAULT_APP_LABELS = ["rik-expo-app", "RIK Expo App"];

export const ANDROID_LOGIN_LABEL_RE =
  /Р’РѕР№С‚Рё|Р вЂ™Р С•Р в„–РЎвЂљР С‘|Р В РІР‚в„ўР В РЎвЂўР В РІвЂћвЂ“Р РЋРІР‚С™Р В РЎвЂ|Login|ГђвЂ™ГђВѕГђВ№Г‘вЂљГђВё/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function poll<T>(
  label: string,
  fn: () => Promise<T | null> | T | null,
  timeoutMs = 30_000,
  delayMs = 250,
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value != null) return value;
    } catch (error) {
      lastError = error;
    }
    await sleep(delayMs);
  }
  if (lastError) throw lastError;
  throw new Error(`poll timeout: ${label}`);
}

const tailText = (fullPath: string, maxChars = 4000) => {
  if (!fs.existsSync(fullPath)) return "";
  const text = fs.readFileSync(fullPath, "utf8");
  return text.slice(Math.max(0, text.length - maxChars));
};

const quoteAndroidShellArg = (value: string) => `'${String(value ?? "").replace(/'/g, `'\\''`)}'`;

export const matchesAndroidLabel = (value: string, labels: readonly string[]) =>
  labels.some((label) => value.includes(label));

export const parseAndroidNodes = (xml: string): AndroidNode[] => {
  const nodes: AndroidNode[] = [];
  const nodeRegex = /<node\b([^>]*?)\/?>/g;
  let match: RegExpExecArray | null = null;
  while ((match = nodeRegex.exec(xml))) {
    const attrs = match[1] ?? "";
    const pick = (name: string) => {
      const attrMatch = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
      return attrMatch?.[1] ?? "";
    };
    nodes.push({
      text: pick("text"),
      contentDesc: pick("content-desc"),
      className: pick("class"),
      clickable: pick("clickable") === "true",
      enabled: pick("enabled") === "true",
      bounds: pick("bounds"),
      hint: pick("hint"),
    });
  }
  return nodes;
};

export const parseBoundsCenter = (bounds: string): { x: number; y: number } | null => {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2) };
};

export const escapeAndroidInputText = (value: string) => String(value ?? "").replace(/ /g, "%s");

export const findAndroidNode = (nodes: AndroidNode[], matcher: (node: AndroidNode) => boolean): AndroidNode | null =>
  nodes.find((node) => matcher(node)) ?? null;

export const findAndroidLabelNode = (
  nodes: AndroidNode[],
  label: string | readonly string[],
  requireClickable = true,
): AndroidNode | null =>
  findAndroidNode(nodes, (node) => {
    const haystack = `${node.contentDesc} ${node.text}`.trim();
    const labels = Array.isArray(label) ? label : [label];
    if (!matchesAndroidLabel(haystack, labels)) return false;
    if (requireClickable && (!node.clickable || !node.enabled)) return false;
    return true;
  });

export const findAndroidLoginNodeSafe = (nodes: AndroidNode[]) =>
  findAndroidNode(
    nodes,
    (node) => node.clickable && node.enabled && ANDROID_LOGIN_LABEL_RE.test(`${node.text} ${node.contentDesc}`),
  );

export const isAndroidLoginScreenSafe = (xml: string) => xml.includes("Email") && ANDROID_LOGIN_LABEL_RE.test(xml);

export const isAndroidDevLauncherHome = (xml: string) =>
  xml.includes("Development Build") || xml.includes("DEVELOPMENT SERVERS");

export const isAndroidDevLauncherErrorScreen = (xml: string) =>
  xml.includes("There was a problem loading the project.")
  || xml.includes("This development build encountered the following error.");

export const isAndroidDevMenuIntroScreen = (xml: string) =>
  xml.includes("This is the developer menu.") || xml.includes("This is the developer menu. It gives you access");

export const isAndroidLauncherHome = (xml: string) =>
  xml.includes("com.google.android.apps.nexuslauncher") || xml.includes("Search web and more");

export const isAndroidGoogleServicesScreen = (xml: string) =>
  xml.includes('package="com.google.android.gms"') || xml.includes("Sign in with ease") || xml.includes("Something went wrong");

export const isAndroidSystemAnrDialog = (xml: string) =>
  xml.includes("isn't responding") || xml.includes("Close app") || xml.includes("Wait");

export const isAndroidBlankAppSurface = (xml: string, packageName: string | null) =>
  !!packageName &&
  xml.includes(`package="${packageName}"`) &&
  !isAndroidLoginScreenSafe(xml) &&
  !/text="[^"]+"/.test(xml) &&
  !/content-desc="[^"]+"/.test(xml);

export function createAndroidHarness(options: AndroidHarnessOptions) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const devClientPort = options.devClientPort;
  const devClientStdoutPath =
    options.devClientStdoutPath ?? path.join(projectRoot, `artifacts/android-dev-client-${devClientPort}.stdout.log`);
  const devClientStderrPath =
    options.devClientStderrPath ?? path.join(projectRoot, `artifacts/android-dev-client-${devClientPort}.stderr.log`);
  const packageCandidates = options.defaultPackageCandidates ?? DEFAULT_PACKAGE_CANDIDATES;
  const appLabels = options.appLabels ?? DEFAULT_APP_LABELS;
  const recovery: AndroidRecoverySummary = {
    environmentRecoveryUsed: false,
    gmsRecoveryUsed: false,
    anrRecoveryUsed: false,
    blankSurfaceRecovered: false,
    devClientBootstrapRecovered: false,
  };

  const adb = (args: string[], encoding: BufferEncoding | "buffer" = "utf8") => {
    const result = spawnSync("adb", args, {
      cwd: projectRoot,
      encoding: encoding === "buffer" ? undefined : encoding,
      timeout: 30_000,
    });
    if (result.status !== 0) {
      throw new Error(`adb ${args.join(" ")} failed: ${String(result.stderr ?? result.stdout ?? "")}`.trim());
    }
    return encoding === "buffer" ? (result.stdout as unknown as Buffer) : String(result.stdout ?? "");
  };

  const buildAndroidDevClientUrl = (port: number) => `http://127.0.0.1:${port}`;
  const buildAndroidDevClientDeepLink = (port: number) =>
    `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(buildAndroidDevClientUrl(port))}`;

  const pressAndroidKey = (keyCode: string | number) => {
    execFileSync("adb", ["shell", "input", "keyevent", String(keyCode)], {
      cwd: projectRoot,
      stdio: "pipe",
    });
  };

  const tapAndroidBounds = (bounds: string) => {
    const center = parseBoundsCenter(bounds);
    if (!center) return false;
    execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
      cwd: projectRoot,
      stdio: "pipe",
    });
    return true;
  };

  const dumpAndroidScreen = (name: string): AndroidScreen => {
    const xmlDevicePath = `/sdcard/${name}.xml`;
    const xmlArtifactPath = path.join(projectRoot, "artifacts", `${name}.xml`);
    const pngDevicePath = `/sdcard/${name}.png`;
    const pngArtifactPath = path.join(projectRoot, "artifacts", `${name}.png`);
    fs.mkdirSync(path.dirname(xmlArtifactPath), { recursive: true });
    try {
      execFileSync("adb", ["shell", "uiautomator", "dump", xmlDevicePath], { cwd: projectRoot, stdio: "pipe" });
      execFileSync("adb", ["pull", xmlDevicePath, xmlArtifactPath], { cwd: projectRoot, stdio: "pipe" });
    } catch {
      execFileSync("adb", ["shell", "uiautomator", "dump"], { cwd: projectRoot, stdio: "pipe" });
      execFileSync("adb", ["pull", "/sdcard/window_dump.xml", xmlArtifactPath], { cwd: projectRoot, stdio: "pipe" });
    }
    try {
      const screenshot = adb(["exec-out", "screencap", "-p"], "buffer") as Buffer;
      fs.writeFileSync(pngArtifactPath, screenshot);
    } catch {
      try {
        execFileSync("adb", ["shell", "screencap", "-p", pngDevicePath], { cwd: projectRoot, stdio: "pipe" });
        execFileSync("adb", ["pull", pngDevicePath, pngArtifactPath], { cwd: projectRoot, stdio: "pipe" });
      } catch {
        fs.writeFileSync(pngArtifactPath, "");
      }
    }
    return {
      xmlPath: `artifacts/${name}.xml`,
      pngPath: `artifacts/${name}.png`,
      xml: fs.readFileSync(xmlArtifactPath, "utf8"),
    };
  };

  const detectAndroidPackage = (): string | null => {
    const packages = adb(["shell", "pm", "list", "packages"]);
    for (const candidate of packageCandidates) {
      if (packages.includes(`package:${candidate}`)) return candidate;
    }
    return null;
  };

  const resetAndroidAppState = (packageName: string | null) => {
    if (!packageName) return;
    execFileSync("adb", ["shell", "am", "force-stop", packageName], { cwd: projectRoot, stdio: "pipe" });
    execFileSync("adb", ["shell", "pm", "clear", packageName], { cwd: projectRoot, stdio: "pipe" });
  };

  const ensureAndroidReverseProxy = (port: number) => {
    execFileSync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`], {
      cwd: projectRoot,
      stdio: "pipe",
    });
  };

  const startAndroidIntentView = (route: string, intentOptions?: StartAndroidIntentOptions) => {
    const packageArg = intentOptions?.packageName ? ` ${quoteAndroidShellArg(intentOptions.packageName)}` : "";
    const forceStopFlag = intentOptions?.forceStop ? "-S " : "";
    execFileSync(
      "adb",
      [
        "shell",
        "sh",
        "-c",
        `am start ${forceStopFlag}-W -a android.intent.action.VIEW -d ${quoteAndroidShellArg(route)}${packageArg}`,
      ],
      { cwd: projectRoot, stdio: "pipe" },
    );
  };

  const startAndroidDevClientProject = (packageName: string | null, port = devClientPort) => {
    const args = [
      "shell",
      "am",
      "start",
      "-S",
      "-W",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      buildAndroidDevClientDeepLink(port),
    ];
    if (packageName) args.push(packageName);
    execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
  };

  const startAndroidRouteSafe = (packageName: string | null, route: string) => {
    const encodedRoute = route.replace(/\(/g, "%28").replace(/\)/g, "%29");
    const candidates = Array.from(new Set([route, encodedRoute]));
    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        if (/[()%\s]/.test(candidate)) {
          startAndroidIntentView(candidate, { packageName });
        } else {
          const args = ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", candidate];
          if (packageName) args.push(packageName);
          execFileSync("adb", args, { cwd: projectRoot, stdio: "pipe" });
        }
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Failed to open Android route: ${route}`);
  };

  const startAndroidRoute = (packageName: string | null, route: string) => {
    startAndroidRouteSafe(packageName, route);
  };

  const launchAndroidPackage = (packageName: string | null) => {
    if (!packageName) return false;
    execFileSync("adb", ["shell", "monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1"], {
      cwd: projectRoot,
      stdio: "pipe",
    });
    return true;
  };

  const findAndroidDevServerNode = (nodes: AndroidNode[], preferredPort: number): AndroidNode | null => {
    const candidates = nodes
      .filter((node) => node.enabled && /http:\/\/(?:10\.0\.2\.2|127\.0\.0\.1|localhost):\d+/i.test(node.text))
      .sort((left, right) => {
        const leftPort = Number(left.text.match(/:(\d+)/)?.[1] ?? 0);
        const rightPort = Number(right.text.match(/:(\d+)/)?.[1] ?? 0);
        if (leftPort === preferredPort && rightPort !== preferredPort) return -1;
        if (rightPort === preferredPort && leftPort !== preferredPort) return 1;
        return rightPort - leftPort;
      });
    return candidates[0] ?? null;
  };

  const dismissAndroidDevMenuIntro = (xml: string) => {
    const nodes = parseAndroidNodes(xml);
    const closeNode = findAndroidNode(nodes, (node) => node.enabled && /Close|Continue/i.test(`${node.text} ${node.contentDesc}`));
    if (closeNode && tapAndroidBounds(closeNode.bounds)) return true;
    pressAndroidKey(4);
    return true;
  };

  const dismissAndroidSystemAnrDialog = (xml: string) => {
    const nodes = parseAndroidNodes(xml);
    const shouldPreferClose = /Process system isn't responding|system isn't responding/i.test(xml);
    if (shouldPreferClose) {
      const closeNode = findAndroidNode(nodes, (node) => node.enabled && /Close app/i.test(`${node.text} ${node.contentDesc}`));
      if (closeNode && tapAndroidBounds(closeNode.bounds)) return true;
    }
    const waitNode = findAndroidNode(nodes, (node) => node.enabled && /Wait/i.test(`${node.text} ${node.contentDesc}`));
    if (waitNode && tapAndroidBounds(waitNode.bounds)) return true;
    const closeNode = findAndroidNode(nodes, (node) => node.enabled && /Close app/i.test(`${node.text} ${node.contentDesc}`));
    if (closeNode && tapAndroidBounds(closeNode.bounds)) return true;
    return false;
  };

  const dismissAndroidGoogleServicesScreen = (xml: string) => {
    const nodes = parseAndroidNodes(xml);
    const actionNode = findAndroidNode(
      nodes,
      (node) =>
        node.enabled &&
        /skip|cancel|close|ok|done|back|РїСЂРѕРїСѓСЃС‚РёС‚СЊ|РѕС‚РјРµРЅР°|Р·Р°РєСЂС‹С‚СЊ|РѕРє/i.test(`${node.text} ${node.contentDesc}`),
    );
    if (actionNode && tapAndroidBounds(actionNode.bounds)) return true;
    pressAndroidKey(4);
    return true;
  };

  const markRecovery = (key: keyof AndroidRecoverySummary) => {
    recovery[key] = true;
    recovery.environmentRecoveryUsed = true;
  };

  const recoverAndroidEnvironment = async (
    screen: AndroidScreen,
    context: {
      packageName: string | null;
      artifactBase: string;
      relaunch: () => void;
      port?: number;
    },
  ) => {
    if (isAndroidDevMenuIntroScreen(screen.xml)) {
      markRecovery("devClientBootstrapRecovered");
      dismissAndroidDevMenuIntro(screen.xml);
      return true;
    }
    if (isAndroidGoogleServicesScreen(screen.xml)) {
      markRecovery("gmsRecoveryUsed");
      dismissAndroidGoogleServicesScreen(screen.xml);
      await sleep(800);
      context.relaunch();
      return true;
    }
    if (isAndroidSystemAnrDialog(screen.xml)) {
      markRecovery("anrRecoveryUsed");
      dismissAndroidSystemAnrDialog(screen.xml);
      await sleep(800);
      context.relaunch();
      return true;
    }
    if (isAndroidLauncherHome(screen.xml)) {
      markRecovery("devClientBootstrapRecovered");
      const appNode = findAndroidLabelNode(parseAndroidNodes(screen.xml), appLabels);
      if (appNode) {
        tapAndroidBounds(appNode.bounds);
      } else {
        launchAndroidPackage(context.packageName);
      }
      await sleep(1200);
      context.relaunch();
      return true;
    }
    if (isAndroidDevLauncherHome(screen.xml)) {
      markRecovery("devClientBootstrapRecovered");
      const serverNode = findAndroidDevServerNode(parseAndroidNodes(screen.xml), context.port ?? devClientPort);
      if (serverNode && tapAndroidBounds(serverNode.bounds)) {
        await sleep(1200);
      } else {
        context.relaunch();
      }
      return true;
    }
    if (isAndroidBlankAppSurface(screen.xml, context.packageName)) {
      markRecovery("blankSurfaceRecovered");
      await sleep(800);
      context.relaunch();
      return true;
    }
    if (screen.xml.includes("Reloading...")) {
      return true;
    }
    if (isAndroidDevLauncherErrorScreen(screen.xml)) {
      throw new Error(`android dev client error screen: ${screen.xml.replace(/\s+/g, " ").slice(0, 1500)}`);
    }
    return false;
  };

  async function isAndroidDevClientServerReachable(port: number) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/status`, {
        method: "GET",
        signal: AbortSignal.timeout(4000),
      });
      return response.status > 0;
    } catch {
      return false;
    }
  }

  async function warmAndroidDevClientBundle(port = devClientPort) {
    const candidates = [
      `http://127.0.0.1:${port}/status`,
      `http://127.0.0.1:${port}/node_modules/expo-router/entry.bundle?platform=android&dev=true&minify=false`,
      `http://127.0.0.1:${port}/index.bundle?platform=android&dev=true&minify=false`,
    ];

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, {
          method: "GET",
          signal: AbortSignal.timeout(180_000),
        });
        if (!response.ok) continue;
        await response.text();
        return;
      } catch {
        continue;
      }
    }
  }

  const runAndroidPreflight = (preflightOptions?: {
    packageName?: string | null;
    clearGooglePlayServices?: boolean;
    clearAppState?: boolean;
  }): AndroidPreflightResult => {
    const devices = adb(["devices"]);
    ensureAndroidReverseProxy(devClientPort);
    let gmsCleared = false;
    let appStateCleared = false;
    if (preflightOptions?.clearGooglePlayServices) {
      execFileSync("adb", ["shell", "pm", "clear", "com.google.android.gms"], {
        cwd: projectRoot,
        stdio: "pipe",
      });
      gmsCleared = true;
      markRecovery("gmsRecoveryUsed");
    }
    if (preflightOptions?.clearAppState && preflightOptions.packageName) {
      resetAndroidAppState(preflightOptions.packageName);
      appStateCleared = true;
      markRecovery("devClientBootstrapRecovered");
    }
    return {
      deviceDetected: devices.includes("\tdevice"),
      reverseConfigured: true,
      gmsCleared,
      appStateCleared,
      packageName: preflightOptions?.packageName ?? null,
    };
  };

  const captureFailureArtifacts = (artifactBase: string): AndroidFailureArtifacts => {
    const screen = dumpAndroidScreen(`${artifactBase}-failure`);
    return {
      ...screen,
      stdoutPath: devClientStdoutPath,
      stderrPath: devClientStderrPath,
      stdoutTail: tailText(devClientStdoutPath),
      stderrTail: tailText(devClientStderrPath),
    };
  };

  async function ensureAndroidDevClientServer() {
    if (await isAndroidDevClientServerReachable(devClientPort)) {
      return {
        port: devClientPort,
        startedByScript: false,
        cleanup: () => undefined,
      };
    }

    fs.mkdirSync(path.dirname(devClientStdoutPath), { recursive: true });
    fs.writeFileSync(devClientStdoutPath, "");
    fs.writeFileSync(devClientStderrPath, "");

    const child = spawn(
      process.execPath,
      [
        path.join(projectRoot, "node_modules", "expo", "bin", "cli"),
        "start",
        "--dev-client",
        "--host",
        "localhost",
        "--non-interactive",
        "--port",
        String(devClientPort),
        "--clear",
      ],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          BROWSER: "none",
          EXPO_NO_TELEMETRY: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    child.stdout.on("data", (chunk) => {
      fs.appendFileSync(devClientStdoutPath, chunk);
    });
    child.stderr.on("data", (chunk) => {
      fs.appendFileSync(devClientStderrPath, chunk);
    });

    try {
      await poll(
        "android:dev_client_manifest_ready",
        async () => ((await isAndroidDevClientServerReachable(devClientPort)) ? true : null),
        180_000,
        1500,
      );
    } catch (error) {
      const stdoutTail = tailText(devClientStdoutPath);
      const stderrTail = tailText(devClientStderrPath);
      if (child.pid) {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: 15_000,
        });
      }
      throw new Error(
        [
          error instanceof Error ? error.message : String(error),
          stdoutTail ? `dev-client stdout tail:\n${stdoutTail}` : null,
          stderrTail ? `dev-client stderr tail:\n${stderrTail}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
    }

    return {
      port: devClientPort,
      startedByScript: true,
      cleanup: () => {
        if (!child.pid) return;
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: 15_000,
        });
      },
    };
  }

  const prepareAndroidRuntime = async (preflightOptions?: {
    clearGooglePlayServices?: boolean;
    clearAppState?: boolean;
  }) => {
    const devices = adb(["devices"]);
    if (!devices.includes("\tdevice")) {
      throw new Error("No Android emulator/device detected");
    }
    const devClient = await ensureAndroidDevClientServer();
    const packageName = detectAndroidPackage();
    const preflight = runAndroidPreflight({
      packageName,
      clearGooglePlayServices: preflightOptions?.clearGooglePlayServices,
      clearAppState: preflightOptions?.clearAppState,
    });
    await warmAndroidDevClientBundle(devClient.port);
    return { devClient, packageName, preflight };
  };

  const defaultReadyPredicate = (xml: string, packageName: string | null) =>
    isAndroidLoginScreenSafe(xml)
    || (!!packageName && xml.includes(`package="${packageName}"`) && !isAndroidBlankAppSurface(xml, packageName));

  const waitForReadySurface = async (
    label: string,
    options: {
      packageName: string | null;
      artifactBase: string;
      readyPredicate: (xml: string) => boolean;
      relaunch: () => void;
      timeoutMs: number;
      delayMs: number;
    },
  ) =>
    poll(
      label,
      async () => {
        await sleep(options.delayMs);
        const screen = dumpAndroidScreen(options.artifactBase);
        if (await recoverAndroidEnvironment(screen, {
          packageName: options.packageName,
          artifactBase: options.artifactBase,
          relaunch: options.relaunch,
          port: devClientPort,
        })) {
          return null;
        }
        return options.readyPredicate(screen.xml) ? screen : null;
      },
      options.timeoutMs,
      options.delayMs,
    );

  const ensureAndroidDevClientLoaded = async ({
    packageName,
    artifactBase,
    readyPredicate,
    timeoutMs = 180_000,
    delayMs = 2500,
  }: EnsureAndroidDevClientLoadedOptions) => {
    ensureAndroidReverseProxy(devClientPort);
    startAndroidDevClientProject(packageName, devClientPort);
    return waitForReadySurface("android:dev_client_loaded", {
      packageName,
      artifactBase,
      readyPredicate: readyPredicate ?? ((xml) => defaultReadyPredicate(xml, packageName)),
      relaunch: () => startAndroidDevClientProject(packageName, devClientPort),
      timeoutMs,
      delayMs,
    });
  };

  const submitAndroidLoginFromNodes = async (nodes: AndroidNode[], user: AndroidUserCredentials) => {
    const emailNode = findAndroidNode(
      nodes,
      (node) =>
        node.enabled &&
        /android\.widget\.EditText/i.test(node.className) &&
        /email/i.test(`${node.text} ${node.hint}`),
    );
    if (!emailNode) throw new Error("Android login email field not found");

    tapAndroidBounds(emailNode.bounds);
    await sleep(350);
    execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.email)], { cwd: projectRoot, stdio: "pipe" });
    await sleep(350);

    const passwordNode =
      findAndroidNode(
        nodes,
        (node) =>
          node.enabled &&
          /android\.widget\.EditText/i.test(node.className) &&
          !/email/i.test(`${node.text} ${node.hint}`),
      ) ?? nodes.find((node) => /android\.widget\.EditText/i.test(node.className) && node !== emailNode) ?? null;
    if (!passwordNode) throw new Error("Android login password field not found");

    tapAndroidBounds(passwordNode.bounds);
    await sleep(350);
    execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(user.password)], { cwd: projectRoot, stdio: "pipe" });
    await sleep(350);

    const loginNode = findAndroidLoginNodeSafe(nodes);
    if (!loginNode) throw new Error("Android login button not found");
    pressAndroidKey(4);
    await sleep(250);
    tapAndroidBounds(loginNode.bounds);
    await sleep(250);
    pressAndroidKey(66);
  };

  const loginAndroidWithProtectedRoute = async ({
    packageName,
    user,
    protectedRoute,
    artifactBase,
    successPredicate,
    renderablePredicate,
    loginScreenPredicate = isAndroidLoginScreenSafe,
    resetAppStateBeforeLogin = true,
  }: LoginAndroidWithProtectedRouteOptions) => {
    if (resetAppStateBeforeLogin) {
      resetAndroidAppState(packageName);
    }

    let current = await ensureAndroidDevClientLoaded({
      packageName,
      artifactBase: `${artifactBase}-dev-client-loading`,
      readyPredicate: (xml) =>
        loginScreenPredicate(xml) || successPredicate(xml) || (renderablePredicate ? renderablePredicate(xml) : false),
    });

    if (!loginScreenPredicate(current.xml) && !successPredicate(current.xml) && !(renderablePredicate?.(current.xml) ?? false)) {
      startAndroidRouteSafe(packageName, protectedRoute);
      current = await waitForReadySurface("android:protected_route_visible", {
        packageName,
        artifactBase: `${artifactBase}-login`,
        readyPredicate: (xml) =>
          loginScreenPredicate(xml) || successPredicate(xml) || (renderablePredicate ? renderablePredicate(xml) : false),
        relaunch: () => startAndroidRouteSafe(packageName, protectedRoute),
        timeoutMs: 60_000,
        delayMs: 1200,
      });
    }

    if (successPredicate(current.xml) || ((renderablePredicate?.(current.xml) ?? false) && !loginScreenPredicate(current.xml))) {
      return current;
    }

    if (!loginScreenPredicate(current.xml)) {
      throw new Error(`Android protected route did not reach login or target surface: ${protectedRoute}`);
    }

    await submitAndroidLoginFromNodes(parseAndroidNodes(current.xml), user);

    let latest = current;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await sleep(1400);
      const screen = dumpAndroidScreen(`${artifactBase}-after-login`);
      latest = screen;
      if (await recoverAndroidEnvironment(screen, {
        packageName,
        artifactBase: `${artifactBase}-after-login`,
        relaunch: () => startAndroidRouteSafe(packageName, protectedRoute),
        port: devClientPort,
      })) {
        continue;
      }
      if (loginScreenPredicate(screen.xml)) {
        const retry = findAndroidLoginNodeSafe(parseAndroidNodes(screen.xml));
        if (retry) {
          pressAndroidKey(4);
          await sleep(250);
          tapAndroidBounds(retry.bounds);
          await sleep(250);
          pressAndroidKey(66);
        }
        continue;
      }
      if (successPredicate(screen.xml) || (renderablePredicate?.(screen.xml) ?? false)) {
        return screen;
      }
      startAndroidRouteSafe(packageName, protectedRoute);
    }

    throw new Error(`Android login never settled on protected route: ${protectedRoute}\n${latest.xml.slice(0, 1500)}`);
  };

  const openAndroidRoute = async ({
    packageName,
    routes,
    artifactBase,
    predicate,
    timeoutMs = 30_000,
    delayMs = 1200,
  }: OpenAndroidRouteOptions) => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      for (const route of routes) {
        startAndroidRouteSafe(packageName, route);
        await sleep(delayMs);
        const screen = await poll(
          `${artifactBase}:${attempt + 1}`,
          async () => {
            const next = dumpAndroidScreen(`${artifactBase}-${attempt + 1}`);
            if (await recoverAndroidEnvironment(next, {
              packageName,
              artifactBase: `${artifactBase}-${attempt + 1}`,
              relaunch: () => startAndroidRouteSafe(packageName, route),
              port: devClientPort,
            })) {
              return null;
            }
            return predicate(next.xml) ? next : null;
          },
          timeoutMs,
          delayMs,
        ).catch(() => null);
        if (screen && predicate(screen.xml)) return screen;
      }
    }
    throw new Error(`Android route did not settle: ${routes.join(", ")}`);
  };

  return {
    adb,
    dumpAndroidScreen,
    parseAndroidNodes,
    tapAndroidBounds,
    pressAndroidKey,
    startAndroidDevClientProject,
    startAndroidRoute,
    startAndroidRouteSafe,
    ensureAndroidReverseProxy,
    warmAndroidDevClientBundle,
    detectAndroidPackage,
    resetAndroidAppState,
    ensureAndroidDevClientServer,
    prepareAndroidRuntime,
    ensureAndroidDevClientLoaded,
    runAndroidPreflight,
    captureFailureArtifacts,
    loginAndroidWithProtectedRoute,
    openAndroidRoute,
    startAndroidIntentView,
    launchAndroidPackage,
    submitAndroidLoginFromNodes,
    findAndroidDevServerNode,
    findAndroidNode,
    findAndroidLabelNode,
    escapeAndroidInputText,
    parseBoundsCenter,
    matchesAndroidLabel,
    isAndroidLoginScreenSafe,
    findAndroidLoginNodeSafe,
    isAndroidDevLauncherHome,
    isAndroidLauncherHome,
    isAndroidBlankAppSurface,
    isAndroidGoogleServicesScreen,
    isAndroidSystemAnrDialog,
    isAndroidDevMenuIntroScreen,
    dismissAndroidDevMenuIntro,
    dismissAndroidGoogleServicesScreen,
    dismissAndroidSystemAnrDialog,
    getDevClientLogPaths: () => ({
      stdoutPath: devClientStdoutPath,
      stderrPath: devClientStderrPath,
    }),
    getDevClientLogTails: () => ({
      stdoutTail: tailText(devClientStdoutPath),
      stderrTail: tailText(devClientStderrPath),
    }),
    getRecoverySummary: () => ({ ...recovery }),
  };
}

export type AndroidHarness = ReturnType<typeof createAndroidHarness>;
