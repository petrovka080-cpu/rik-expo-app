export type PdfLocalMaterializationPlan =
  | {
      action: "keep";
      reason: "already_target" | "controlled_cache" | "controlled_document";
      uri: string;
    }
  | {
      action: "copy";
      reason: "volatile_source" | "outside_controlled_storage";
      targetUri: string;
    };

const trimText = (value: unknown) => String(value ?? "").trim();

const ensureTrailingSlash = (value: string) =>
  value && !value.endsWith("/") ? `${value}/` : value;

const isWithinDir = (uri: string, dir: string) => {
  const normalizedDir = ensureTrailingSlash(trimText(dir));
  return Boolean(normalizedDir) && uri.startsWith(normalizedDir);
};

export function isVolatilePdfMaterializationUri(uri: unknown): boolean {
  const value = trimText(uri);
  return value.includes("/Caches/Print/") || value.includes("/T/");
}

export function resolvePdfLocalMaterializationPlan(args: {
  sourceUri: string;
  targetUri: string;
  cacheDir?: string | null;
  documentDir?: string | null;
}): PdfLocalMaterializationPlan {
  const sourceUri = trimText(args.sourceUri);
  const targetUri = trimText(args.targetUri);

  if (sourceUri === targetUri) {
    return {
      action: "keep",
      reason: "already_target",
      uri: sourceUri,
    };
  }

  if (isVolatilePdfMaterializationUri(sourceUri)) {
    return {
      action: "copy",
      reason: "volatile_source",
      targetUri,
    };
  }

  if (isWithinDir(sourceUri, trimText(args.cacheDir))) {
    return {
      action: "keep",
      reason: "controlled_cache",
      uri: sourceUri,
    };
  }

  if (isWithinDir(sourceUri, trimText(args.documentDir))) {
    return {
      action: "keep",
      reason: "controlled_document",
      uri: sourceUri,
    };
  }

  return {
    action: "copy",
    reason: "outside_controlled_storage",
    targetUri,
  };
}
