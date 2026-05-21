export const APP_LAYOUT = {
  bottomNavHeightPx: 72,
  safeAreaBottomPx: 0,
  stickyActionHeightPx: 64,
  stickyActionGapPx: 12,
  screenHorizontalPaddingPx: 16,
  pageHorizontalPaddingPx: 16,
  pageBottomExtraPaddingPx: 24,
  scrollBottomPaddingPx: 160,
  headerHeightPx: 56,
  stickySearchHeightPx: 72,
  filterStackGapPx: 12,
  floatingAiButtonOffsetPx: 96,
  floatingAiButtonWithStickyActionOffsetPx: 160,
} as const;

export const APP_LAYOUT_CSS_VARIABLES = {
  bottomNavHeight: "--app-bottom-nav-height",
  safeBottom: "--app-safe-bottom",
  stickyActionBottom: "--app-sticky-action-bottom",
  scrollBottomPadding: "--app-scroll-bottom-padding",
} as const;

export type BottomNavCollisionCheck = {
  route: string;
  primaryActionVisible: boolean;
  primaryActionClickable: boolean;
  primaryActionRect: {
    top: number;
    bottom: number;
  };
  bottomNavRect: {
    top: number;
    bottom: number;
  };
  overlapsBottomNav: boolean;
};

export type LayoutCollisionResult = {
  route: string;
  checkedElement:
    | "primary_action"
    | "sheet_footer"
    | "search_bar"
    | "tabs"
    | "ai_fab"
    | "bottom_nav";
  overlaps: boolean;
  rect: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  overlappedWith?: string;
  passed: boolean;
};

export function createBottomNavCollisionCheck(input: {
  route: string;
  primaryActionRect: { top: number; bottom: number };
  bottomNavRect: { top: number; bottom: number };
  primaryActionVisible: boolean;
  primaryActionClickable: boolean;
}): BottomNavCollisionCheck {
  return {
    route: input.route,
    primaryActionVisible: input.primaryActionVisible,
    primaryActionClickable: input.primaryActionClickable,
    primaryActionRect: input.primaryActionRect,
    bottomNavRect: input.bottomNavRect,
    overlapsBottomNav: input.primaryActionRect.bottom > input.bottomNavRect.top,
  };
}

export function createLayoutCollisionResult(input: Omit<LayoutCollisionResult, "passed">): LayoutCollisionResult {
  return {
    ...input,
    passed: input.overlaps === false,
  };
}
