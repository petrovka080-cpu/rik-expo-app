// DEEP-LINK CONTRACT: LEGACY REDIRECT — kept for bookmark/deep-link compat.
// All new auth entry should go through /auth/login directly.
import React from "react";
import { Redirect } from "expo-router";

export default function SignInScreen() {
  return <Redirect href="/auth/login" />;
}
