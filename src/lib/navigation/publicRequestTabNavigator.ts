type PublicRequestTabNavigationTarget = {
  href: string;
  navigationPathname: "/(tabs)/request" | "/(tabs)/ai";
  params: Record<string, string>;
};

type PublicRequestTabNavigationHandler = (
  target: PublicRequestTabNavigationTarget,
) => boolean;

let publicRequestTabNavigationHandler: PublicRequestTabNavigationHandler | null = null;

export function registerPublicRequestTabNavigationHandler(
  handler: PublicRequestTabNavigationHandler,
): () => void {
  publicRequestTabNavigationHandler = handler;
  return () => {
    if (publicRequestTabNavigationHandler === handler) {
      publicRequestTabNavigationHandler = null;
    }
  };
}

export function navigatePublicRequestTab(
  target: PublicRequestTabNavigationTarget,
): boolean {
  return publicRequestTabNavigationHandler?.(target) === true;
}

export function hasPublicRequestTabNavigationHandler(): boolean {
  return publicRequestTabNavigationHandler != null;
}
