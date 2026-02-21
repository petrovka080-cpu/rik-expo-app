import React from "react";
import { Redirect } from "expo-router";

export default function SignInScreen() {
  return <Redirect href="/auth/login" />;
}
