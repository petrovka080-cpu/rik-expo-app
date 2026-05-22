type CoreMutationIntentInput = {
  scope: string;
  entityId: string | number;
  payload?: unknown;
};

const MAX_PART_LENGTH = 96;
const MAX_ID_LENGTH = 180;

const normalizePart = (value: unknown, fallback: string): string => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_PART_LENGTH);

  return normalized || fallback;
};

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
};

export const hashCoreMutationPayload = (value: unknown): string => {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export const buildCoreMutationIntentId = ({
  scope,
  entityId,
  payload,
}: CoreMutationIntentInput): string => {
  const safeScope = normalizePart(scope, "core-mutation");
  const safeEntity = normalizePart(entityId, "entity");
  const payloadHash = hashCoreMutationPayload(payload ?? safeEntity);

  return `${safeScope}:${safeEntity}:${payloadHash}`.slice(0, MAX_ID_LENGTH);
};

