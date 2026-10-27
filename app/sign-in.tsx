// DEEP-LINK CONTRACT: LEGACY REDIRECT — kept for bookmark/deep-link compat.
// All new auth entry should go through /auth/login directly.
import React from "react";
import { Redirect } from "expo-router";

import { withScreenErrorBoundary } from "../src/shared/ui/ScreenErrorBoundary";

function SignInScreen() {
  return <Redirect href="/auth/login" />;
}

export default withScreenErrorBoundary(SignInScreen, {
  screen: "auth",
  route: "/sign-in",
});
