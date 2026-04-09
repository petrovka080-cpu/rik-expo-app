import AsyncStorage from "@react-native-async-storage/async-storage";

export type WarehouseBackBreadcrumb = {
  at: string;
  marker: string;
  result: string | null;
  errorStage?: string | null;
  errorClass?: string | null;
  errorMessage?: string | null;
  extra?: Record<string, unknown>;
};

type WarehouseBackBreadcrumbInput = {
  marker: unknown;
  result?: unknown;
  errorStage?: unknown;
  errorClass?: unknown;
  errorMessage?: unknown;
  extra?: Record<string, unknown>;
};

const WAREHOUSE_BACK_BREADCRUMBS_KEY = "rik_warehouse_back_breadcrumbs_v1";
const MAX_BREADCRUMBS = 80;

let writeQueue = Promise.resolve();

function trimText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeEntry(input: WarehouseBackBreadcrumbInput): WarehouseBackBreadcrumb | null {
  const marker = trimText(input.marker);
  if (!marker) return null;

  return {
    at: new Date().toISOString(),
    marker,
    result: trimText(input.result),
    errorStage: trimText(input.errorStage),
    errorClass: trimText(input.errorClass),
    errorMessage: trimText(input.errorMessage),
    extra: input.extra,
  };
}

async function readRawBreadcrumbs(): Promise<WarehouseBackBreadcrumb[]> {
  try {
    const raw = await AsyncStorage.getItem(WAREHOUSE_BACK_BREADCRUMBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object") as WarehouseBackBreadcrumb[];
  } catch {
    return [];
  }
}

async function writeRawBreadcrumbs(items: WarehouseBackBreadcrumb[]) {
  try {
    await AsyncStorage.setItem(WAREHOUSE_BACK_BREADCRUMBS_KEY, JSON.stringify(items.slice(-MAX_BREADCRUMBS)));
  } catch {
    // Warehouse back diagnostics must never destabilize navigation.
  }
}

function enqueueWrite(inputs: WarehouseBackBreadcrumbInput[]) {
  const entries = inputs
    .map(normalizeEntry)
    .filter((entry): entry is WarehouseBackBreadcrumb => entry != null);
  if (!entries.length) return writeQueue;

  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const current = await readRawBreadcrumbs();
      current.push(...entries);
      await writeRawBreadcrumbs(current);
    });

  return writeQueue;
}

export function recordWarehouseBackBreadcrumbs(inputs: WarehouseBackBreadcrumbInput[]) {
  void enqueueWrite(inputs);
}

export async function recordWarehouseBackBreadcrumbsAsync(inputs: WarehouseBackBreadcrumbInput[]) {
  await enqueueWrite(inputs);
}

export async function getWarehouseBackBreadcrumbs() {
  return await readRawBreadcrumbs();
}

export async function clearWarehouseBackBreadcrumbs() {
  try {
    await AsyncStorage.removeItem(WAREHOUSE_BACK_BREADCRUMBS_KEY);
  } catch {
    // Ignore diagnostics cleanup failures.
  }
}

export function buildWarehouseBackBreadcrumbsText(items: WarehouseBackBreadcrumb[]) {
  return items
    .map((item) => {
      const parts = [
        item.at,
        item.marker,
        item.result ?? "unknown-result",
      ];
      if (item.errorStage) parts.push(`stage=${item.errorStage}`);
      if (item.errorClass) parts.push(`class=${item.errorClass}`);
      if (item.errorMessage) parts.push(`error=${item.errorMessage}`);
      if (item.extra?.route) parts.push(`route=${String(item.extra.route)}`);
      if (item.extra?.method) parts.push(`method=${String(item.extra.method)}`);
      if (item.extra?.target) parts.push(`target=${String(item.extra.target)}`);
      if (item.extra?.handler) parts.push(`handler=${String(item.extra.handler)}`);
      return parts.join(" | ");
    })
    .join("\n");
}
