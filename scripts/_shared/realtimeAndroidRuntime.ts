import { type RuntimeTestUser } from "./testUserDiscipline";
import { createAndroidHarness, type AndroidPreflightResult } from "./androidHarness";
import {
  clearAndroidReactNativeLogcat,
  findAndroidObservabilityEvent,
  parseAndroidObservabilityEvents,
  readAndroidReactNativeLogcat,
  type AndroidObservabilityEvent,
} from "./androidObservability";

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

type DumpedScreen = {
  xmlPath: string;
  pngPath: string;
  xml: string;
};

type PreparedRealtimeAndroidRuntime = {
  packageName: string | null;
  preflight: AndroidPreflightResult;
  screen: DumpedScreen;
  fioConfirmed: boolean;
  cleanup: () => void;
};

function parseBounds(bounds: string) {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) return null;
  return {
    left: Number(match[1]),
    top: Number(match[2]),
    right: Number(match[3]),
    bottom: Number(match[4]),
    width: Number(match[3]) - Number(match[1]),
    height: Number(match[4]) - Number(match[2]),
  };
}

const LOGIN_RE = /Войти|Login|Р’РѕР№С‚Рё/i;
const PASSWORD_RE = /Пароль|password|РџР°СЂРѕР»СЊ/i;
const EMAIL_RE = /email/i;
const FIO_ACTION_RE = /Сохранить|Подтвердить|Continue|РЎРѕС…СЂР°РЅРёС‚СЊ|РџРѕРґС‚РІРµСЂРґРёС‚СЊ/i;

export function createRealtimeAndroidRuntime(params: { projectRoot: string; devClientPort: number }) {
  const harness = createAndroidHarness({
    projectRoot: params.projectRoot,
    devClientPort: params.devClientPort,
  });

  const isLoginScreen = (xml: string) => xml.includes("Email") && LOGIN_RE.test(xml);

  const readObservabilityEvents = () => parseAndroidObservabilityEvents(readAndroidReactNativeLogcat());

  const waitForObservability = async (
    label: string,
    predicate: (event: AndroidObservabilityEvent, events: AndroidObservabilityEvent[]) => boolean,
    timeoutMs = 45_000,
  ) =>
    poll(
      label,
      async () => {
        const events = readObservabilityEvents();
        return events.some((event) => predicate(event, events)) ? events : null;
      },
      timeoutMs,
      750,
    );

  const settleIdleObservability = async (quietMs = 1_500, maxPasses = 3) => {
    for (let pass = 0; pass < maxPasses; pass += 1) {
      clearAndroidReactNativeLogcat();
      await sleep(quietMs);
      if (readObservabilityEvents().length === 0) {
        clearAndroidReactNativeLogcat();
        return;
      }
    }
    clearAndroidReactNativeLogcat();
  };

  const waitForScreenText = async (label: string, predicate: (xml: string) => boolean, timeoutMs = 30_000) =>
    poll(
      label,
      async () => {
        const screen = harness.dumpAndroidScreen(label.replace(/[^a-z0-9_-]+/gi, "-"));
        return predicate(screen.xml) ? screen : null;
      },
      timeoutMs,
      1_000,
    );

  const replaceField = async (node: AndroidNode, value: string) => {
    harness.tapAndroidBounds(node.bounds);
    await sleep(250);
    harness.pressAndroidKey(123);
    await sleep(100);
    for (let index = 0; index < Math.max(24, value.length + 8); index += 1) {
      harness.pressAndroidKey(67);
    }
    await sleep(150);
    harness.typeAndroidText(value);
    await sleep(250);
  };

  const findFioInput = (nodes: AndroidNode[]) =>
    nodes.find((node) => {
      if (!node.enabled || node.password || !/android\.widget\.EditText/i.test(node.className)) return false;
      const label = `${node.text} ${node.hint}`.trim();
      return !EMAIL_RE.test(label) && !PASSWORD_RE.test(label);
    }) ?? null;

  const findPrimaryAction = (nodes: AndroidNode[]) => {
    const labeled =
      nodes.find(
        (node) => node.clickable && node.enabled && FIO_ACTION_RE.test(`${node.text} ${node.contentDesc}`),
      ) ?? null;
    if (labeled) return labeled;
    return (
      nodes
        .filter((node) => node.clickable && node.enabled)
        .map((node) => ({ node, bounds: parseBounds(node.bounds) }))
        .filter((entry): entry is { node: AndroidNode; bounds: NonNullable<ReturnType<typeof parseBounds>> } => entry.bounds != null)
        .filter((entry) => entry.bounds.top >= 900 && entry.bounds.width >= 360)
        .sort((left, right) => right.bounds.top - left.bounds.top)[0]?.node ?? null
    );
  };

  const maybeConfirmFio = async (
    current: DumpedScreen,
    displayLabel: string,
    artifactBase: string,
  ): Promise<{ screen: DumpedScreen; fioConfirmed: boolean }> => {
    let screen = current;
    if (isLoginScreen(screen.xml)) {
      return { screen, fioConfirmed: false };
    }
    let nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
    let fioInput = findFioInput(nodes);
    if (!fioInput) {
      let lastObservedScreen = screen;
      screen = await poll(
        `android:${artifactBase}:fio_modal`,
        async () => {
          const next = harness.dumpAndroidScreen(`${artifactBase}-fio-scan`);
          lastObservedScreen = next;
          if (isLoginScreen(next.xml)) {
            return next;
          }
          const nextNodes = harness.parseAndroidNodes(next.xml) as AndroidNode[];
          return findFioInput(nextNodes) ? next : null;
        },
        20_000,
        800,
      ).catch(() => lastObservedScreen);
      if (isLoginScreen(screen.xml)) {
        return { screen, fioConfirmed: false };
      }
      nodes = harness.parseAndroidNodes(screen.xml) as AndroidNode[];
      fioInput = findFioInput(nodes);
      if (!fioInput) {
        return { screen, fioConfirmed: false };
      }
    }

    await replaceField(fioInput, displayLabel);
    harness.pressAndroidKey(4);
    await sleep(300);

    let lastConfirmScreen = screen;
    screen = await poll(
      `android:${artifactBase}:fio_confirm_button`,
      async () => {
        const next = harness.dumpAndroidScreen(`${artifactBase}-fio-ready`);
        lastConfirmScreen = next;
        const nextNodes = harness.parseAndroidNodes(next.xml) as AndroidNode[];
        return findPrimaryAction(nextNodes) ? next : null;
      },
      12_000,
      750,
    ).catch(() => lastConfirmScreen);

    const confirmNode = findPrimaryAction(harness.parseAndroidNodes(screen.xml) as AndroidNode[]);
    if (!confirmNode) {
      return { screen, fioConfirmed: false };
    }

    harness.tapAndroidBounds(confirmNode.bounds);
    await sleep(800);

    screen = await poll(
      `android:${artifactBase}:fio_closed`,
      async () => {
        const next = harness.dumpAndroidScreen(`${artifactBase}-fio-closed`);
        const nextNodes = harness.parseAndroidNodes(next.xml) as AndroidNode[];
        return findFioInput(nextNodes) ? null : next;
      },
      20_000,
      1000,
    ).catch(() => harness.dumpAndroidScreen(`${artifactBase}-fio-close-timeout`));

    return { screen, fioConfirmed: true };
  };

  const prepareRoleRuntime = async (params: {
    user: RuntimeTestUser;
    route: string;
    artifactBase: string;
    renderablePredicate?: (xml: string) => boolean;
    successPredicate?: (xml: string) => boolean;
  }): Promise<PreparedRealtimeAndroidRuntime> => {
    const prepared = await harness.prepareAndroidRuntime();
    clearAndroidReactNativeLogcat();
    let screen = await harness.loginAndroidWithProtectedRoute({
      packageName: prepared.packageName,
      user: { email: params.user.email, password: params.user.password },
      protectedRoute: params.route,
      artifactBase: params.artifactBase,
      successPredicate:
        params.successPredicate ??
        ((xml) => !isLoginScreen(xml) && !harness.isAndroidBlankAppSurface(xml) && !harness.isAndroidLauncherHome(xml)),
      renderablePredicate:
        params.renderablePredicate ??
        ((xml) => isLoginScreen(xml) || !harness.isAndroidBlankAppSurface(xml)),
      loginScreenPredicate: isLoginScreen,
    });
    const fio = await maybeConfirmFio(screen, params.user.displayLabel, params.artifactBase);
    screen = fio.screen;
    return {
      packageName: prepared.packageName,
      preflight: prepared.preflight,
      screen,
      fioConfirmed: fio.fioConfirmed,
      cleanup: prepared.devClient.cleanup,
    };
  };

  return {
    harness,
    clearObservability: clearAndroidReactNativeLogcat,
    readObservabilityEvents,
    waitForObservability,
    settleIdleObservability,
    waitForScreenText,
    findObservabilityEvent: findAndroidObservabilityEvent,
    prepareRoleRuntime,
    isLoginScreen,
  };
}
