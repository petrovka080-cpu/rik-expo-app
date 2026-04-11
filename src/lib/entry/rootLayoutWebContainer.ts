export type RootLayoutStyleTarget = {
  style?: {
    height?: string;
    overflow?: string;
  } | null;
};

export type RootLayoutWebDocumentLike = {
  documentElement?: RootLayoutStyleTarget | null;
  body?: RootLayoutStyleTarget | null;
  getElementById?: (id: string) => RootLayoutStyleTarget | null;
};

export type RootLayoutWebContainerStyleResult =
  | { ok: true; rootFound: boolean }
  | {
      ok: false;
      errorClass: string;
      errorMessage: string;
    };

const errorInfo = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return {
      errorClass: error.name || "Error",
      errorMessage: error.message || fallback,
    };
  }
  const message = String(error ?? "").trim();
  return {
    errorClass: "Error",
    errorMessage: message || fallback,
  };
};

const requireStyleTarget = (
  target: RootLayoutStyleTarget | null | undefined,
  label: string,
) => {
  if (!target?.style) {
    throw new Error(`Root layout web container is missing ${label}.style`);
  }
  return target.style;
};

export function applyRootLayoutWebContainerStyle(
  doc: RootLayoutWebDocumentLike,
): RootLayoutWebContainerStyleResult {
  try {
    const htmlStyle = requireStyleTarget(doc.documentElement, "documentElement");
    const bodyStyle = requireStyleTarget(doc.body, "body");

    htmlStyle.height = "100%";
    bodyStyle.height = "100%";
    bodyStyle.overflow = "auto";

    const root = doc.getElementById?.("root") ?? null;
    if (root?.style) {
      root.style.height = "100%";
      root.style.overflow = "auto";
    }

    return { ok: true, rootFound: Boolean(root) };
  } catch (error) {
    return {
      ok: false,
      ...errorInfo(error, "Root layout web container setup failed"),
    };
  }
}
