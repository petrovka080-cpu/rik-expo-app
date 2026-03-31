import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";

const DEFAULT_STDOUT_PATH = "artifacts/expo-dev-client.stdout.log";
const DEFAULT_STDERR_PATH = "artifacts/expo-dev-client.stderr.log";
const DEFAULT_PACKAGE = "com.azisbek_dzhantaev.rikexpoapp";
const EXPO_PACKAGE = "host.exp.exponent";
const DEV_LAUNCHER_LABELS = ["Development Build", "DEVELOPMENT SERVERS"];
const LOGIN_LABEL_FALLBACK_RE = /Войти|Login|Р’РѕР№С‚Рё|Р’С…РѕРґ/i;
const PASSWORD_LABEL_RE = /Пароль|password|РџР°СЂРѕР»СЊ|РїР°СЂРѕР»СЊ/i;
const LOGIN_LABEL_RE = /Р’РѕР№С‚Рё|Login|ГђВ’ГђВѕГђВ№Г‘вЂљГђВё/i;

type AndroidNode = {
  text: string;
  contentDesc: string;
  className: string;
  clickable: boolean;
  enabled: boolean;
  focused: boolean;
  bounds: string;
  hint: string;
  password: boolean;
};

type DumpedAndroidScreen = {
  xmlPath: string;
  pngPath: string;
  xml: string;
};

type RecoverySummary = {
  environmentRecoveryUsed: boolean;
  gmsRecoveryUsed: boolean;
  anrRecoveryUsed: boolean;
  blankSurfaceRecovered: boolean;
  devClientBootstrapRecovered: boolean;
};

export type AndroidPreflightResult = {
  deviceDetected: boolean;
  packageName: string | null;
  reverseProxyReady: boolean;
  appCleared: boolean;
  gmsCleared: boolean;
  devClientReachable: boolean;
};

export type AndroidFailureArtifacts = {
  xmlPath: string | null;
  pngPath: string | null;
  stdoutPath: string;
  stderrPath: string;
  stdoutTail: string;
  stderrTail: string;
};

type AndroidHarnessOptions = {
  projectRoot: string;
  devClientPort: number;
  devClientStdoutPath?: string;
  devClientStderrPath?: string;
};

type LoginParams = {
  packageName: string | null;
  user: { email: string; password: string };
  protectedRoute: string;
  artifactBase: string;
  successPredicate: (xml: string) => boolean;
  renderablePredicate: (xml: string) => boolean;
  loginScreenPredicate?: (xml: string) => boolean;
};

type OpenRouteParams = {
  packageName: string | null;
  routes: string[];
  artifactBase: string;
  predicate: (xml: string) => boolean;
  timeoutMs?: number;
  delayMs?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function tailText(fullPath: string, maxChars = 4000) {
  if (!fs.existsSync(fullPath)) return "";
  const text = fs.readFileSync(fullPath, "utf8");
  return text.slice(Math.max(0, text.length - maxChars));
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "\r")
    .replace(/&#39;/g, "'");
}

function parseBoundsCenter(bounds: string): { x: number; y: number } | null {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  const left = Number(match[1]);
  const top = Number(match[2]);
  const right = Number(match[3]);
  const bottom = Number(match[4]);
  return { x: Math.round((left + right) / 2), y: Math.round((top + bottom) / 2) };
}

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

function escapeAndroidInputText(value: string) {
  return String(value ?? "")
    .replace(/ /g, "%s")
    .replace(/@/g, "\\@")
    .replace(/&/g, "\\&")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\|/g, "\\|")
    .replace(/</g, "\\<")
    .replace(/>/g, "\\>")
    .replace(/;/g, "\\;")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
}

function createRecoveryState(): RecoverySummary {
  return {
    environmentRecoveryUsed: false,
    gmsRecoveryUsed: false,
    anrRecoveryUsed: false,
    blankSurfaceRecovered: false,
    devClientBootstrapRecovered: false,
  };
}

export function createAndroidHarness(options: AndroidHarnessOptions) {
  const stdoutPath = options.devClientStdoutPath
    ? path.join(options.projectRoot, options.devClientStdoutPath)
    : path.join(options.projectRoot, DEFAULT_STDOUT_PATH);
  const stderrPath = options.devClientStderrPath
    ? path.join(options.projectRoot, options.devClientStderrPath)
    : path.join(options.projectRoot, DEFAULT_STDERR_PATH);
  const recoveryState = createRecoveryState();

  const adb = (args: string[], encoding: BufferEncoding | "buffer" = "utf8") => {
    const result = spawnSync("adb", args, {
      cwd: options.projectRoot,
      encoding: encoding === "buffer" ? undefined : encoding,
      timeout: 30_000,
    });
    if (result.status !== 0) {
      throw new Error(`adb ${args.join(" ")} failed: ${String(result.stderr ?? result.stdout ?? "").trim()}`);
    }
    return encoding === "buffer" ? (result.stdout as unknown as Buffer) : String(result.stdout ?? "");
  };

  const parseAndroidNodes = (xml: string): AndroidNode[] => {
    const nodes: AndroidNode[] = [];
    const nodeRegex = /<node\b([^>]*?)\/?>/g;
    let match: RegExpExecArray | null = null;
    while ((match = nodeRegex.exec(xml))) {
      const attrs = match[1] ?? "";
      const pick = (name: string) => {
        const attrMatch = attrs.match(new RegExp(`${name}="([^"]*)"`, "i"));
        return decodeXmlEntities(attrMatch?.[1] ?? "");
      };
      nodes.push({
        text: pick("text"),
        contentDesc: pick("content-desc"),
        className: pick("class"),
        clickable: pick("clickable") === "true",
        enabled: pick("enabled") === "true",
        focused: pick("focused") === "true",
        bounds: pick("bounds"),
        hint: pick("hint"),
        password: pick("password") === "true",
      });
    }
    return nodes;
  };

  const dumpAndroidScreen = (name: string): DumpedAndroidScreen => {
    const xmlDevicePath = `/sdcard/${name}.xml`;
    const xmlFallbackDevicePath = "/sdcard/window_dump.xml";
    const xmlArtifactPath = path.join(options.projectRoot, "artifacts", `${name}.xml`);
    const pngDevicePath = `/sdcard/${name}.png`;
    const pngArtifactPath = path.join(options.projectRoot, "artifacts", `${name}.png`);
    fs.mkdirSync(path.dirname(xmlArtifactPath), { recursive: true });
    let lastDumpError: unknown = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        execFileSync("adb", ["shell", "uiautomator", "dump", xmlDevicePath], {
          cwd: options.projectRoot,
          stdio: "pipe",
        });
        execFileSync("adb", ["pull", xmlDevicePath, xmlArtifactPath], {
          cwd: options.projectRoot,
          stdio: "pipe",
        });
        lastDumpError = null;
        break;
      } catch (error) {
        lastDumpError = error;
        try {
          execFileSync("adb", ["shell", "uiautomator", "dump"], {
            cwd: options.projectRoot,
            stdio: "pipe",
          });
          execFileSync("adb", ["pull", xmlFallbackDevicePath, xmlArtifactPath], {
            cwd: options.projectRoot,
            stdio: "pipe",
          });
          lastDumpError = null;
          break;
        } catch (fallbackError) {
          lastDumpError = fallbackError;
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
      }
    }
    if (lastDumpError) throw lastDumpError;
    try {
      const screenshot = adb(["exec-out", "screencap", "-p"], "buffer") as Buffer;
      fs.writeFileSync(pngArtifactPath, screenshot);
    } catch {
      try {
        execFileSync("adb", ["shell", "screencap", "-p", pngDevicePath], { cwd: options.projectRoot, stdio: "pipe" });
        execFileSync("adb", ["pull", pngDevicePath, pngArtifactPath], {
          cwd: options.projectRoot,
          stdio: "pipe",
        });
      } catch {
        fs.writeFileSync(pngArtifactPath, "");
      }
    }
    return {
      xmlPath: path.relative(options.projectRoot, xmlArtifactPath).replace(/\\/g, "/"),
      pngPath: path.relative(options.projectRoot, pngArtifactPath).replace(/\\/g, "/"),
      xml: fs.readFileSync(xmlArtifactPath, "utf8"),
    };
  };

  const tapAndroidBounds = (bounds: string) => {
    const center = parseBoundsCenter(bounds);
    if (!center) return false;
    execFileSync("adb", ["shell", "input", "tap", String(center.x), String(center.y)], {
      cwd: options.projectRoot,
      stdio: "pipe",
    });
    return true;
  };

  const pressAndroidKey = (keyCode: number) => {
    execFileSync("adb", ["shell", "input", "keyevent", String(keyCode)], {
      cwd: options.projectRoot,
      stdio: "pipe",
    });
  };

  const typeAndroidText = (value: string) => {
    const text = String(value ?? "");
    let buffered = "";
    const flushBuffered = () => {
      if (!buffered) return;
      execFileSync("adb", ["shell", "input", "text", escapeAndroidInputText(buffered)], {
        cwd: options.projectRoot,
        stdio: "pipe",
      });
      buffered = "";
    };
    for (const chunk of text) {
      if (chunk === "@") {
        flushBuffered();
        pressAndroidKey(77);
        continue;
      }
      buffered += chunk;
    }
    flushBuffered();
  };
  const replaceAndroidFieldText = async (node: AndroidNode, value: string) => {
    tapAndroidBounds(node.bounds);
    await sleep(250);
    pressAndroidKey(123);
    await sleep(100);
    for (let index = 0; index < Math.max(24, value.length + 8); index += 1) {
      pressAndroidKey(67);
    }
    await sleep(150);
    typeAndroidText(value);
    await sleep(250);
  };

  const ensureAndroidReverseProxy = (port: number) => {
    execFileSync("adb", ["reverse", `tcp:${port}`, `tcp:${port}`], {
      cwd: options.projectRoot,
      stdio: "pipe",
    });
  };

  const detectAndroidPackage = (): string | null => {
    const packages = adb(["shell", "pm", "list", "packages"]);
    if (packages.includes(`package:${DEFAULT_PACKAGE}`)) return DEFAULT_PACKAGE;
    if (packages.includes(`package:${EXPO_PACKAGE}`)) return EXPO_PACKAGE;
    return null;
  };

  const resetAndroidAppState = (packageName: string | null) => {
    if (!packageName) return;
    execFileSync("adb", ["shell", "am", "force-stop", packageName], {
      cwd: options.projectRoot,
      stdio: "pipe",
    });
    execFileSync("adb", ["shell", "pm", "clear", packageName], {
      cwd: options.projectRoot,
      stdio: "pipe",
    });
  };

  const buildAndroidDevClientUrl = (port: number) => `http://127.0.0.1:${port}`;

  const buildAndroidDevClientDeepLink = (port: number) =>
    `exp+rik-expo-app://expo-development-client/?url=${encodeURIComponent(buildAndroidDevClientUrl(port))}`;

  const startAndroidDevClientProject = (
    packageName: string | null,
    port = options.devClientPort,
    startOptions: { stopApp?: boolean } = {},
  ) => {
    const args = ["shell", "am", "start"];
    if (startOptions.stopApp !== false) {
      args.push("-S");
    }
    args.push("-W", "-a", "android.intent.action.VIEW", "-d", buildAndroidDevClientDeepLink(port));
    if (packageName) args.push(packageName);
    execFileSync("adb", args, { cwd: options.projectRoot, stdio: "pipe" });
  };

  const startAndroidRoute = (packageName: string | null, route: string) => {
    const args = ["shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", route];
    if (packageName) args.push(packageName);
    execFileSync("adb", args, { cwd: options.projectRoot, stdio: "pipe" });
  };

  const startAndroidRouteSafe = (packageName: string | null, route: string) => {
    startAndroidRoute(packageName, route);
  };

  const isAndroidDevLauncherHome = (xml: string) => DEV_LAUNCHER_LABELS.every((label) => xml.includes(label));
  const isAndroidLauncherHome = (xml: string) =>
    (/com\.google\.android\.apps\.nexuslauncher|com\.android\.launcher3/i.test(xml) ||
      /content-desc="Home"|Search web and more|All apps/i.test(xml)) &&
    !xml.includes("Email") &&
    !isAndroidDevLauncherHome(xml);
  const isAndroidBlankAppSurface = (xml: string) =>
    !xml.includes("<node") || (!xml.includes("Email") && !xml.includes("TextView") && !xml.includes("Button"));
  const isAndroidGoogleServicesScreen = (xml: string) =>
    /google play services|services keeps stopping|google services/i.test(xml);
  const isAndroidSystemAnrDialog = (xml: string) =>
    /isn't responding|keeps stopping|close app|wait/i.test(xml);
  const isAndroidDevMenuIntroScreen = (xml: string) =>
    xml.includes("This is the developer menu.") || xml.includes("This is the developer menu. It gives you access");
  const isAndroidFullDevMenuScreen = (xml: string) =>
    xml.includes("Connected to:") &&
    xml.includes("Reload") &&
    (xml.includes("Go home") || xml.includes("Performance monitor") || xml.includes("Fast Refresh"));
  const isAndroidDevClientErrorScreen = (xml: string) =>
    xml.includes("There was a problem loading the project.") ||
    xml.includes("This development build encountered the following error.") ||
    (xml.includes("Render Error") && xml.includes("Call Stack")) ||
    xml.includes("ReferenceError: Property 'WeakRef' doesn't exist");
  const isAndroidAppInfoScreen = (xml: string) =>
    /com\.android\.settings/i.test(xml) &&
    /App info/i.test(xml) &&
    (/rik-expo-app/i.test(xml) || /host\.exp\.exponent/i.test(xml)) &&
    /(?:text|content-desc)="Open"/i.test(xml);

  const findAndroidNode = (nodes: AndroidNode[], matcher: (node: AndroidNode) => boolean): AndroidNode | null =>
    nodes.find((node) => matcher(node)) ?? null;

  const findAndroidLoginNode = (nodes: AndroidNode[]) =>
    findAndroidNode(
      nodes,
      (node) =>
        node.clickable &&
        node.enabled &&
        (LOGIN_LABEL_RE.test(`${node.text} ${node.contentDesc}`) ||
          LOGIN_LABEL_FALLBACK_RE.test(`${node.text} ${node.contentDesc}`)),
    );

  const findAndroidDevServerNode = (nodes: AndroidNode[]) =>
    nodes
      .filter((node) => node.enabled && /http:\/\/(?:10\.0\.2\.2|127\.0\.0\.1|localhost):\d+/i.test(node.text))
      .sort((left, right) => {
        const leftPort = Number(left.text.match(/:(\d+)/)?.[1] ?? 0);
        const rightPort = Number(right.text.match(/:(\d+)/)?.[1] ?? 0);
        if (leftPort === options.devClientPort && rightPort !== options.devClientPort) return -1;
        if (rightPort === options.devClientPort && leftPort !== options.devClientPort) return 1;
        return rightPort - leftPort;
      })[0] ?? null;

  const dismissAndroidDevMenuIntro = (xml: string) => {
    const nodes = parseAndroidNodes(xml);
    const closeNode = findAndroidNode(
      nodes,
      (node) => node.enabled && /Close|Continue/i.test(`${node.text} ${node.contentDesc}`),
    );
    if (closeNode && tapAndroidBounds(closeNode.bounds)) return true;
    pressAndroidKey(4);
    return true;
  };

  const dismissAndroidLauncherSearch = (xml: string) => {
    const nodes = parseAndroidNodes(xml);
    const clearNode = findAndroidNode(
      nodes,
      (node) => node.clickable && node.enabled && /clear search box|clear search|close search/i.test(`${node.text} ${node.contentDesc}`),
    );
    if (clearNode && tapAndroidBounds(clearNode.bounds)) {
      return true;
    }
    pressAndroidKey(4);
    return true;
  };

  const openAndroidAppInfoTarget = (xml: string) => {
    const nodes = parseAndroidNodes(xml);
    const openNode = findAndroidNode(
      nodes,
      (node) => node.clickable && node.enabled && /open/i.test(`${node.text} ${node.contentDesc}`),
    );
    if (openNode && tapAndroidBounds(openNode.bounds)) {
      return true;
    }
    pressAndroidKey(66);
    return true;
  };

  const dismissInterruptions = async (screen: DumpedAndroidScreen, label: string): Promise<DumpedAndroidScreen> => {
    let current = screen;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (isAndroidGoogleServicesScreen(current.xml)) {
        recoveryState.environmentRecoveryUsed = true;
        recoveryState.gmsRecoveryUsed = true;
        const nodes = parseAndroidNodes(current.xml);
        const dismissNode = findAndroidNode(
          nodes,
          (node) => node.clickable && node.enabled && /ok|close|dismiss|continue/i.test(`${node.text} ${node.contentDesc}`),
        );
        if (dismissNode) {
          tapAndroidBounds(dismissNode.bounds);
        } else {
          pressAndroidKey(4);
        }
        await sleep(1200);
        current = dumpAndroidScreen(`${label}-gms-${attempt + 1}`);
        continue;
      }

      if (isAndroidSystemAnrDialog(current.xml)) {
        recoveryState.environmentRecoveryUsed = true;
        recoveryState.anrRecoveryUsed = true;
        const nodes = parseAndroidNodes(current.xml);
        const launcherAnr = /pixel launcher isn't responding|launcher isn't responding/i.test(current.xml);
        const waitNode = findAndroidNode(
          nodes,
          (node) => node.clickable && node.enabled && /wait/i.test(`${node.text} ${node.contentDesc}`),
        );
        const closeNode = findAndroidNode(
          nodes,
          (node) => node.clickable && node.enabled && /close app|close/i.test(`${node.text} ${node.contentDesc}`),
        );
        if (launcherAnr && attempt < 2 && waitNode) {
          tapAndroidBounds(waitNode.bounds);
        } else if (launcherAnr && closeNode) {
          tapAndroidBounds(closeNode.bounds);
        } else if (attempt < 2 && waitNode) {
          tapAndroidBounds(waitNode.bounds);
        } else if (closeNode) {
          tapAndroidBounds(closeNode.bounds);
        } else if (waitNode) {
          tapAndroidBounds(waitNode.bounds);
        } else {
          pressAndroidKey(4);
        }
        await sleep(1500);
        current = dumpAndroidScreen(`${label}-anr-${attempt + 1}`);
        continue;
      }

      if (isAndroidDevMenuIntroScreen(current.xml)) {
        recoveryState.environmentRecoveryUsed = true;
        dismissAndroidDevMenuIntro(current.xml);
        await sleep(1200);
        current = dumpAndroidScreen(`${label}-devmenu-${attempt + 1}`);
        continue;
      }

      if (isAndroidFullDevMenuScreen(current.xml)) {
        recoveryState.environmentRecoveryUsed = true;
        pressAndroidKey(4);
        await sleep(1200);
        current = dumpAndroidScreen(`${label}-devmenu-full-${attempt + 1}`);
        continue;
      }

      if (isAndroidAppInfoScreen(current.xml)) {
        recoveryState.environmentRecoveryUsed = true;
        openAndroidAppInfoTarget(current.xml);
        await sleep(1500);
        current = dumpAndroidScreen(`${label}-app-info-${attempt + 1}`);
        continue;
      }

      break;
    }
    return current;
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

  async function warmAndroidDevClientBundle(port = options.devClientPort) {
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

  async function ensureAndroidDevClientServer() {
    if (await isAndroidDevClientServerReachable(options.devClientPort)) {
      return {
        port: options.devClientPort,
        startedByScript: false,
        cleanup: () => undefined,
      };
    }

    fs.mkdirSync(path.dirname(stdoutPath), { recursive: true });
    fs.writeFileSync(stdoutPath, "");
    fs.writeFileSync(stderrPath, "");

    const child = spawn(
      process.execPath,
      [
        path.join(options.projectRoot, "node_modules", "expo", "bin", "cli"),
        "start",
        "--dev-client",
        "--host",
        "localhost",
        "--port",
        String(options.devClientPort),
        "--clear",
      ],
      {
        cwd: options.projectRoot,
        env: {
          ...process.env,
          BROWSER: "none",
          CI: "1",
          EXPO_NO_TELEMETRY: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    child.stdout.on("data", (chunk) => {
      fs.appendFileSync(stdoutPath, chunk);
    });
    child.stderr.on("data", (chunk) => {
      fs.appendFileSync(stderrPath, chunk);
    });

    try {
      await poll(
        "android:dev_client_manifest_ready",
        async () => ((await isAndroidDevClientServerReachable(options.devClientPort)) ? true : null),
        180_000,
        1500,
      );
    } catch (error) {
      if (child.pid) {
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          cwd: options.projectRoot,
          encoding: "utf8",
          timeout: 15_000,
        });
      }
      throw new Error(
        [
          error instanceof Error ? error.message : String(error),
          tailText(stdoutPath) ? `dev-client stdout tail:\n${tailText(stdoutPath)}` : null,
          tailText(stderrPath) ? `dev-client stderr tail:\n${tailText(stderrPath)}` : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
    }

    return {
      port: options.devClientPort,
      startedByScript: true,
      cleanup: () => {
        if (!child.pid) return;
        spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          cwd: options.projectRoot,
          encoding: "utf8",
          timeout: 15_000,
        });
      },
    };
  }

  const runAndroidPreflight = (params: { packageName?: string | null; clearApp?: boolean; clearGms?: boolean } = {}) => {
    const packageName = params.packageName ?? detectAndroidPackage();
    const devices = adb(["devices"]);
    const deviceDetected = devices.includes("\tdevice");
    if (!deviceDetected) {
      return {
        deviceDetected: false,
        packageName,
        reverseProxyReady: false,
        appCleared: false,
        gmsCleared: false,
        devClientReachable: false,
      } satisfies AndroidPreflightResult;
    }

    ensureAndroidReverseProxy(options.devClientPort);
    if (params.clearApp === true) {
      resetAndroidAppState(packageName);
      recoveryState.environmentRecoveryUsed = true;
    }
    if (params.clearGms === true) {
      try {
        execFileSync("adb", ["shell", "pm", "clear", "com.google.android.gms"], {
          cwd: options.projectRoot,
          stdio: "pipe",
        });
        recoveryState.environmentRecoveryUsed = true;
        recoveryState.gmsRecoveryUsed = true;
      } catch {
        // best effort
      }
    }

    const reachabilityResult = spawnSync("curl", ["-fsS", `http://127.0.0.1:${options.devClientPort}/status`], {
      cwd: options.projectRoot,
      encoding: "utf8",
      timeout: 5000,
    });

    return {
      deviceDetected,
      packageName,
      reverseProxyReady: true,
      appCleared: params.clearApp === true,
      gmsCleared: params.clearGms === true,
      devClientReachable: reachabilityResult.status === 0,
    } satisfies AndroidPreflightResult;
  };

  const getDevClientLogPaths = () => ({
    stdoutPath: path.relative(options.projectRoot, stdoutPath).replace(/\\/g, "/"),
    stderrPath: path.relative(options.projectRoot, stderrPath).replace(/\\/g, "/"),
  });

  const getDevClientLogTails = () => ({
    stdoutTail: tailText(stdoutPath),
    stderrTail: tailText(stderrPath),
  });

  const getRecoverySummary = () => ({ ...recoveryState });

  async function ensureRenderableSurface(
    packageName: string | null,
    artifactBase: string,
    renderablePredicate: (xml: string) => boolean,
  ) {
    ensureAndroidReverseProxy(options.devClientPort);
    startAndroidDevClientProject(packageName, options.devClientPort, { stopApp: true });
    let blankSurfaceStreak = 0;

    let screen = await poll(
      "android:dev_client_loaded",
      async () => {
        await sleep(2500);
        const next = dumpAndroidScreen(`${artifactBase}-dev-client-loading`);
        const cleaned = await dismissInterruptions(next, `${artifactBase}-interrupt`);
        if (renderablePredicate(cleaned.xml)) return cleaned;
        if (isAndroidDevLauncherHome(cleaned.xml)) return cleaned;
        if (isAndroidLauncherHome(cleaned.xml)) return cleaned;
        if (isAndroidBlankAppSurface(cleaned.xml)) {
          blankSurfaceStreak += 1;
          if (blankSurfaceStreak >= 3) return cleaned;
          return null;
        }
        blankSurfaceStreak = 0;
        if (isAndroidDevClientErrorScreen(cleaned.xml)) {
          throw new Error(`android dev client error screen: ${cleaned.xml.replace(/\s+/g, " ").slice(0, 2000)}`);
        }
        return null;
      },
      180_000,
      2500,
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      screen = await dismissInterruptions(screen, `${artifactBase}-surface-check-${attempt + 1}`);
      if (isAndroidDevClientErrorScreen(screen.xml)) {
        throw new Error(`android dev client error screen: ${screen.xml.replace(/\s+/g, " ").slice(0, 2000)}`);
      }
      if (renderablePredicate(screen.xml)) return screen;
      if (isAndroidDevLauncherHome(screen.xml)) {
        recoveryState.environmentRecoveryUsed = true;
        recoveryState.devClientBootstrapRecovered = true;
        const serverNode = findAndroidDevServerNode(parseAndroidNodes(screen.xml));
        if (serverNode) {
          tapAndroidBounds(serverNode.bounds);
        } else {
          startAndroidDevClientProject(packageName, options.devClientPort, { stopApp: false });
        }
        await sleep(2500);
        screen = dumpAndroidScreen(`${artifactBase}-dev-launcher-${attempt + 1}`);
        continue;
      }
      if (isAndroidLauncherHome(screen.xml)) {
        recoveryState.environmentRecoveryUsed = true;
        dismissAndroidLauncherSearch(screen.xml);
        await sleep(600);
        startAndroidDevClientProject(packageName, options.devClientPort, { stopApp: true });
        await sleep(2500);
        screen = dumpAndroidScreen(`${artifactBase}-launcher-home-${attempt + 1}`);
        continue;
      }
      if (isAndroidBlankAppSurface(screen.xml)) {
        recoveryState.environmentRecoveryUsed = true;
        recoveryState.blankSurfaceRecovered = true;
        startAndroidDevClientProject(packageName, options.devClientPort, { stopApp: false });
        await sleep(2500);
        screen = dumpAndroidScreen(`${artifactBase}-blank-surface-${attempt + 1}`);
        continue;
      }
    }

    return screen;
  }

  async function openAndroidRoute(
    params: OpenRouteParams & {
      renderablePredicate?: (xml: string) => boolean;
      loginScreenPredicate?: (xml: string) => boolean;
    },
  ) {
    for (let index = 0; index < params.routes.length; index += 1) {
      const route = params.routes[index];
      let blankSurfaceStreak = 0;
      startAndroidRouteSafe(params.packageName, route);
      const routed = await poll(
        `android:route_open:${route}`,
        async () => {
          await sleep(params.delayMs ?? 1200);
          const next = dumpAndroidScreen(`${params.artifactBase}-route-${index + 1}`);
          const cleaned = await dismissInterruptions(next, `${params.artifactBase}-route-interrupt`);
          if (isAndroidLauncherHome(cleaned.xml) || isAndroidDevLauncherHome(cleaned.xml)) {
            recoveryState.environmentRecoveryUsed = true;
            if (isAndroidLauncherHome(cleaned.xml)) {
              dismissAndroidLauncherSearch(cleaned.xml);
              await sleep(600);
            }
            startAndroidDevClientProject(params.packageName, options.devClientPort, {
              stopApp: false,
            });
            return null;
          }
          if (isAndroidDevClientErrorScreen(cleaned.xml)) {
            throw new Error(`android dev client error screen: ${cleaned.xml.replace(/\s+/g, " ").slice(0, 2000)}`);
          }
          if (isAndroidBlankAppSurface(cleaned.xml)) {
            blankSurfaceStreak += 1;
            if (blankSurfaceStreak < 4) {
              startAndroidRouteSafe(params.packageName, route);
              return null;
            }
            recoveryState.environmentRecoveryUsed = true;
            recoveryState.blankSurfaceRecovered = true;
            startAndroidRouteSafe(params.packageName, route);
            return null;
          }
          blankSurfaceStreak = 0;
          return params.predicate(cleaned.xml) ? cleaned : null;
        },
        params.timeoutMs ?? 20_000,
        params.delayMs ?? 1200,
      ).catch(() => null);
      if (routed) return routed;
      const timeoutScreen = await dismissInterruptions(
        dumpAndroidScreen(`${params.artifactBase}-route-timeout`),
        `${params.artifactBase}-route-timeout-interrupt`,
      );
      if (isAndroidDevClientErrorScreen(timeoutScreen.xml)) {
        throw new Error(`android dev client error screen: ${timeoutScreen.xml.replace(/\s+/g, " ").slice(0, 2000)}`);
      }
      if (params.loginScreenPredicate?.(timeoutScreen.xml) || params.renderablePredicate?.(timeoutScreen.xml)) {
        return timeoutScreen;
      }
    }
    throw new Error(`android route did not settle for ${params.routes.join(", ")}`);
  }

  async function loginAndroidWithProtectedRoute(params: LoginParams) {
    let current = await ensureRenderableSurface(params.packageName, params.artifactBase, params.renderablePredicate);
    const isLoginScreen =
      params.loginScreenPredicate ??
      ((xml: string) => xml.includes("Email") && (LOGIN_LABEL_RE.test(xml) || LOGIN_LABEL_FALLBACK_RE.test(xml)));
    const isLoginSubmitPending = (xml: string) =>
      isLoginScreen(xml) &&
      (/android\.widget\.ProgressBar/i.test(xml) ||
        /enabled="false"[^>]*content-desc="(?:Войти|Login)/i.test(xml) ||
        /content-desc="(?:Войти|Login)"[^>]*enabled="false"/i.test(xml));
    const submitLoginAction = async (loginNode: AndroidNode | null) => {
      pressAndroidKey(66);
      await sleep(300);
      if (loginNode) {
        tapAndroidBounds(loginNode.bounds);
        await sleep(300);
      }
    };
    const waitForStableLoginScreen = async (stage: string, timeoutMs = 12_000) =>
      poll(
        `android:${stage}`,
        async () => {
          await sleep(1000);
          const next = dumpAndroidScreen(`${params.artifactBase}-${stage}`);
          const cleaned = await dismissInterruptions(next, `${params.artifactBase}-${stage}-interrupt`);
          if (isAndroidDevClientErrorScreen(cleaned.xml)) {
            throw new Error(`android dev client error screen: ${cleaned.xml.replace(/\s+/g, " ").slice(0, 2000)}`);
          }
          if (isAndroidLauncherHome(cleaned.xml) || isAndroidDevLauncherHome(cleaned.xml)) {
            recoveryState.environmentRecoveryUsed = true;
            if (isAndroidLauncherHome(cleaned.xml)) {
              dismissAndroidLauncherSearch(cleaned.xml);
              await sleep(600);
              startAndroidDevClientProject(params.packageName, options.devClientPort, {
                stopApp: true,
              });
            } else {
              const serverNode = findAndroidDevServerNode(parseAndroidNodes(cleaned.xml));
              if (serverNode) {
                tapAndroidBounds(serverNode.bounds);
                await sleep(1200);
              } else {
                startAndroidDevClientProject(params.packageName, options.devClientPort, {
                  stopApp: false,
                });
              }
            }
            startAndroidRouteSafe(params.packageName, params.protectedRoute);
            return null;
          }
          if (isAndroidBlankAppSurface(cleaned.xml)) {
            recoveryState.environmentRecoveryUsed = true;
            recoveryState.blankSurfaceRecovered = true;
            startAndroidDevClientProject(params.packageName, options.devClientPort, {
              stopApp: false,
            });
            await sleep(1200);
            startAndroidRouteSafe(params.packageName, params.protectedRoute);
            return null;
          }
          return isLoginScreen(cleaned.xml) ? cleaned : null;
        },
        timeoutMs,
        1000,
      );

    const getStableLoginScreen = async (stage: string, timeoutMs = 12_000) => {
      try {
        return await waitForStableLoginScreen(stage, timeoutMs);
      } catch {
        return await dismissInterruptions(
          dumpAndroidScreen(`${params.artifactBase}-${stage}-fallback`),
          `${params.artifactBase}-${stage}-fallback-interrupt`,
        );
      }
    };

    const ensureExactLoginFieldText = async (
      stage: string,
      node: AndroidNode | null,
      expected: string,
      matcher: (candidate: AndroidNode) => boolean,
      maxAttempts = 3,
    ) => {
      if (!node) return { screen: await getStableLoginScreen(`${stage}-missing`), node: null as AndroidNode | null };
      let currentNode: AndroidNode | null = node;
      let screen = await getStableLoginScreen(`${stage}-baseline`);
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const currentValue = String(currentNode?.text ?? "").trim();
        if (currentValue === expected) {
          return { screen, node: currentNode };
        }
        await replaceAndroidFieldText(currentNode, expected);
        screen = await getStableLoginScreen(`${stage}-typed-${attempt + 1}`);
        const typedNodes = parseAndroidNodes(screen.xml);
        currentNode = findAndroidNode(typedNodes, matcher) ?? currentNode;
        if (String(currentNode?.text ?? "").trim() === expected) {
          return { screen, node: currentNode };
        }
      }
      return { screen, node: currentNode };
    };

    if (isLoginScreen(current.xml)) {
      const nodes = parseAndroidNodes(current.xml);
      const editTextNodes = nodes.filter(
        (node) => node.enabled && /android\.widget\.EditText/i.test(node.className),
      );
      const emailNode = findAndroidNode(editTextNodes, (node) => /email/i.test(`${node.text} ${node.hint}`));
      const passwordNode = findAndroidNode(
        editTextNodes,
        (node) =>
          node.enabled &&
          /android\.widget\.EditText/i.test(node.className) &&
          /password|пароль/i.test(`${node.text} ${node.hint}`.toLowerCase()),
      );
      const loginNode = findAndroidLoginNode(nodes);

      if ((!emailNode && editTextNodes.length === 0) || (!passwordNode && editTextNodes.length < 2) || !loginNode) {
        throw new Error("Android login controls were not found");
      }
      const resolvedEmailNode = emailNode ?? editTextNodes[0] ?? null;
      const resolvedPasswordNode =
        passwordNode ??
        findAndroidNode(editTextNodes, (node) => node.password || PASSWORD_LABEL_RE.test(`${node.text} ${node.hint}`)) ??
        editTextNodes.find((node) => node !== resolvedEmailNode) ??
        null;
      if (!resolvedEmailNode || !resolvedPasswordNode) {
        throw new Error("Android login controls were not found");
      }

      const emailSeed = await ensureExactLoginFieldText(
        "email-fill",
        resolvedEmailNode,
        params.user.email,
        (node) =>
          node.enabled &&
          /android\.widget\.EditText/i.test(node.className) &&
          /email/i.test(`${node.text} ${node.hint}`),
      );
      let passwordScreen = emailSeed.screen;
      let passwordNodes = parseAndroidNodes(passwordScreen.xml);
      const refreshedEmailNode =
        findAndroidNode(
          passwordNodes,
          (node) =>
            node.enabled &&
            /android\.widget\.EditText/i.test(node.className) &&
            /email/i.test(`${node.text} ${node.hint}`),
        ) ?? emailSeed.node ?? resolvedEmailNode;
      const refreshedPasswordNode =
        findAndroidNode(
          passwordNodes,
          (node) =>
            node.enabled &&
            /android\.widget\.EditText/i.test(node.className) &&
            (node.password || PASSWORD_LABEL_RE.test(`${node.text} ${node.hint}`)),
        ) ?? resolvedPasswordNode;

      pressAndroidKey(61);
      await sleep(250);
      const passwordFocusScreen = await getStableLoginScreen("password-focus");
      const focusedPasswordNode = findAndroidNode(
        parseAndroidNodes(passwordFocusScreen.xml),
        (node) =>
          node.enabled &&
          node.focused &&
          /android\.widget\.EditText/i.test(node.className) &&
          (node.password || PASSWORD_LABEL_RE.test(`${node.text} ${node.hint}`)),
      );
      if (!focusedPasswordNode) {
        tapAndroidBounds(refreshedPasswordNode.bounds);
        await sleep(400);
      }

      await replaceAndroidFieldText(refreshedPasswordNode, params.user.password);

      const loginScreen = await getStableLoginScreen("password-filled");
      let loginNodes = parseAndroidNodes(loginScreen.xml);
      const refreshedLoginNode = findAndroidLoginNode(loginNodes) ?? loginNode;
      const readyEmailNode =
        findAndroidNode(
          loginNodes,
          (node) =>
            node.enabled &&
            /android\.widget\.EditText/i.test(node.className) &&
            /email/i.test(`${node.text} ${node.hint}`),
        ) ?? refreshedEmailNode;
      const confirmedEmail = await ensureExactLoginFieldText(
        "email-confirm",
        readyEmailNode,
        params.user.email,
        (node) =>
          node.enabled &&
          /android\.widget\.EditText/i.test(node.className) &&
          /email/i.test(`${node.text} ${node.hint}`),
      );
      loginNodes = parseAndroidNodes(confirmedEmail.screen.xml);

      await submitLoginAction(refreshedLoginNode);
      let blankSurfaceStreak = 0;
      let launchSurfaceStreak = 0;

      current = await poll(
        "android:login_complete",
        async () => {
          await sleep(1500);
          const next = dumpAndroidScreen(`${params.artifactBase}-after-login`);
          const cleaned = await dismissInterruptions(next, `${params.artifactBase}-after-login-interrupt`);
          if (isLoginScreen(cleaned.xml)) {
            if (isLoginSubmitPending(cleaned.xml)) {
              return null;
            }
            const retryNodes = parseAndroidNodes(cleaned.xml);
            const retryEmailNode =
              findAndroidNode(
                retryNodes,
                (node) => node.enabled && /android\.widget\.EditText/i.test(node.className) && /email/i.test(`${node.text} ${node.hint}`),
              ) ?? resolvedEmailNode;
            const retryPasswordNode =
              findAndroidNode(
                retryNodes,
                (node) =>
                  node.enabled &&
                  /android\.widget\.EditText/i.test(node.className) &&
                  (node.password || PASSWORD_LABEL_RE.test(`${node.text} ${node.hint}`)),
              ) ?? refreshedPasswordNode;
            const retryLoginNode = findAndroidLoginNode(retryNodes) ?? refreshedLoginNode;
            const emailText = String(retryEmailNode?.text ?? "").trim();
            const passwordText = String(retryPasswordNode?.text ?? "").trim();
            const emailNeedsFill = !emailText || /^email$/i.test(emailText);
            const passwordNeedsFill = !passwordText || PASSWORD_LABEL_RE.test(passwordText);
            if (emailNeedsFill && retryEmailNode) {
              await ensureExactLoginFieldText(
                "retry-email-empty",
                retryEmailNode,
                params.user.email,
                (node) =>
                  node.enabled &&
                  /android\.widget\.EditText/i.test(node.className) &&
                  /email/i.test(`${node.text} ${node.hint}`),
              );
            } else if (retryEmailNode && emailText !== params.user.email) {
              await ensureExactLoginFieldText(
                "retry-email-correct",
                retryEmailNode,
                params.user.email,
                (node) =>
                  node.enabled &&
                  /android\.widget\.EditText/i.test(node.className) &&
                  /email/i.test(`${node.text} ${node.hint}`),
              );
            }
            if (retryPasswordNode) {
              await replaceAndroidFieldText(retryPasswordNode, params.user.password);
            }
            await sleep(250);
            await submitLoginAction(retryLoginNode);
            return null;
          }
          if (isAndroidLauncherHome(cleaned.xml) || isAndroidDevLauncherHome(cleaned.xml)) {
            launchSurfaceStreak += 1;
            recoveryState.environmentRecoveryUsed = true;
            if (isAndroidLauncherHome(cleaned.xml)) {
              dismissAndroidLauncherSearch(cleaned.xml);
              await sleep(600);
              startAndroidDevClientProject(params.packageName, options.devClientPort, {
                stopApp: true,
              });
            } else {
              const serverNode = findAndroidDevServerNode(parseAndroidNodes(cleaned.xml));
              if (serverNode) {
                tapAndroidBounds(serverNode.bounds);
              } else {
                startAndroidDevClientProject(params.packageName, options.devClientPort, {
                  stopApp: false,
                });
              }
            }
            if (launchSurfaceStreak >= 3) {
              return cleaned;
            }
            return null;
          }
          launchSurfaceStreak = 0;
          if (isAndroidDevClientErrorScreen(cleaned.xml)) {
            throw new Error(`android dev client error screen: ${cleaned.xml.replace(/\s+/g, " ").slice(0, 2000)}`);
          }
          if (isAndroidBlankAppSurface(cleaned.xml)) {
            blankSurfaceStreak += 1;
            if (blankSurfaceStreak < 4) {
              startAndroidRouteSafe(params.packageName, params.protectedRoute);
              return null;
            }
            recoveryState.environmentRecoveryUsed = true;
            recoveryState.blankSurfaceRecovered = true;
            startAndroidRouteSafe(params.packageName, params.protectedRoute);
            return null;
          }
          blankSurfaceStreak = 0;
          return cleaned;
        },
        45_000,
        1500,
      );
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (params.successPredicate(current.xml)) return current;
      if (isAndroidLauncherHome(current.xml) || isAndroidDevLauncherHome(current.xml) || isAndroidBlankAppSurface(current.xml)) {
        if (isAndroidLauncherHome(current.xml)) {
          recoveryState.environmentRecoveryUsed = true;
          dismissAndroidLauncherSearch(current.xml);
          await sleep(600);
        }
        current = await ensureRenderableSurface(
          params.packageName,
          `${params.artifactBase}-post-login-${attempt + 1}`,
          params.renderablePredicate,
        );
        continue;
      }
      const tabRoute = params.protectedRoute.split("://")[1] ?? "";
      current = await openAndroidRoute({
        packageName: params.packageName,
        routes: [params.protectedRoute, params.protectedRoute.replace("://", ":///"), `rik:///%28tabs%29/${tabRoute}`],
        artifactBase: params.artifactBase,
        predicate: params.successPredicate,
        renderablePredicate: params.renderablePredicate,
        loginScreenPredicate: isLoginScreen,
        timeoutMs: 30_000,
        delayMs: 1200,
      });
    }

    if (isLoginScreen(current.xml)) {
      throw new Error(`android login did not complete for ${params.protectedRoute}`);
    }
    if (params.successPredicate(current.xml) || params.renderablePredicate(current.xml)) {
      return current;
    }

    throw new Error(`android protected route did not settle into renderable surface for ${params.protectedRoute}`);
  }

  async function prepareAndroidRuntime(params: { clearApp?: boolean; clearGms?: boolean } = {}) {
    const devClient = await ensureAndroidDevClientServer();
    const packageName = detectAndroidPackage();
    const preflight = runAndroidPreflight({
      packageName,
      clearApp: params.clearApp,
      clearGms: params.clearGms,
    });
    await warmAndroidDevClientBundle(options.devClientPort);
    return {
      devClient,
      packageName,
      preflight,
    };
  }

  const captureFailureArtifacts = (artifactBase: string): AndroidFailureArtifacts => {
    let xmlPath: string | null = null;
    let pngPath: string | null = null;
    try {
      const capture = dumpAndroidScreen(artifactBase);
      xmlPath = capture.xmlPath;
      pngPath = capture.pngPath;
    } catch {
      // artifact best effort
    }
    const logPaths = getDevClientLogPaths();
    const logTails = getDevClientLogTails();
    return {
      xmlPath,
      pngPath,
      stdoutPath: logPaths.stdoutPath,
      stderrPath: logPaths.stderrPath,
      stdoutTail: logTails.stdoutTail,
      stderrTail: logTails.stderrTail,
    };
  };

  return {
    adb,
    dumpAndroidScreen,
    parseAndroidNodes,
    tapAndroidBounds,
    pressAndroidKey,
    typeAndroidText,
    startAndroidDevClientProject,
    startAndroidRoute: startAndroidRouteSafe,
    startAndroidRouteSafe,
    ensureAndroidReverseProxy,
    warmAndroidDevClientBundle,
    detectAndroidPackage,
    resetAndroidAppState,
    runAndroidPreflight,
    ensureAndroidDevClientServer,
    loginAndroidWithProtectedRoute,
    openAndroidRoute,
    dismissAndroidInterruptions: dismissInterruptions,
    prepareAndroidRuntime,
    captureFailureArtifacts,
    getRecoverySummary,
    getDevClientLogPaths,
    getDevClientLogTails,
    isAndroidDevLauncherHome,
    isAndroidLauncherHome,
    isAndroidBlankAppSurface,
    isAndroidGoogleServicesScreen,
    isAndroidSystemAnrDialog,
    isAndroidDevMenuIntroScreen,
    isAndroidFullDevMenuScreen,
    isAndroidDevClientErrorScreen,
  };
}
