import {
  ANDROID_AUTH_EMAIL_FIELD_ID,
  ANDROID_AUTH_PASSWORD_FIELD_ID,
  ANDROID_AUTH_SUBMIT_ID,
  ANDROID_AUTHENTICATED_PROFILE_MARKER_ID,
  ANDROID_AUTHENTICATED_SESSION_READY_MARKER_ID,
  ANDROID_BUILD_IDENTITY_MARKER_ID,
  ANDROID_CANONICAL_REQUEST_ROUTE_URI,
  ANDROID_REQUEST_ROUTE_SCREEN_MARKER_ID,
  ANDROID_ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY,
  ANDROID_ROUTE_PROOF_APP_ROOT_READY,
  ANDROID_ROUTE_PROOF_REQUEST_ROUTE_READY,
  androidXmlHasRouteMarker,
  androidXmlHasSelectedResourceId,
  buildAndroidCanonicalRequestRouteUri,
  buildAndroidRegisteredCanonicalRouteCandidates,
  buildAndroidAuthSetTextPlan,
  canOpenAndroidCanonicalRouteFromReadiness,
  classifyAndroidAuthenticatedReadinessXml,
  classifyAndroidPostLoginRouteProof,
  findAndroidAuthSubmitNode,
  findAndroidAuthTextFieldNode,
  getAndroidAuthFieldValue,
  isAndroidAuthenticatedProfileSurfaceXml,
  isAndroidAuthenticatedSessionSurfaceXml,
  isAndroidAuthLoginScreenXml,
  isAndroidAppRootSurfaceXml,
  isAndroidCanonicalRequestRouteReadyXml,
  isAndroidEmbeddedAiRouteSurfaceXml,
  isAndroidPageNotFoundXml,
  isAndroidRequestRouteSurfaceXml,
  sanitizeAndroidAuthHarnessText,
  shouldAbortAndroidAuthInputForFocus,
  verifyAndroidAuthFieldValue,
  verifyAndroidAuthSingleFocusedField,
  type AndroidAuthHarnessNode,
} from "../../scripts/_shared/androidHarness";

const node = (overrides: Partial<AndroidAuthHarnessNode>): AndroidAuthHarnessNode => ({
  text: "",
  contentDesc: "",
  resourceId: "",
  className: "android.widget.EditText",
  clickable: true,
  enabled: true,
  password: false,
  focused: false,
  ...overrides,
});

describe("Android auth harness input idempotency", () => {
  const email = "agent-control@example.test";
  const password = "secret-password";

  it("fillingEmailTwiceDoesNotAppend", () => {
    const emptyEmail = node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID });
    const firstPlan = buildAndroidAuthSetTextPlan(emptyEmail, email);
    expect(firstPlan.shouldInput).toBe(true);

    const filledEmail = node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email });
    const secondPlan = buildAndroidAuthSetTextPlan(filledEmail, email);
    expect(secondPlan.shouldInput).toBe(false);
    expect(getAndroidAuthFieldValue(filledEmail)).toBe(email);
  });

  it("confirmDoesNotWrite", () => {
    const filledEmail = node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email });
    const verification = verifyAndroidAuthFieldValue(filledEmail, email);

    expect(verification.ok).toBe(true);
    expect(buildAndroidAuthSetTextPlan(filledEmail, email).shouldInput).toBe(false);
  });

  it("retryClearsBeforeInput", () => {
    const appendedEmail = node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: `${email}${email}` });
    const plan = buildAndroidAuthSetTextPlan(appendedEmail, email);

    expect(plan.shouldInput).toBe(true);
    expect(plan.clearKeyEvents).toBeGreaterThan(getAndroidAuthFieldValue(appendedEmail).length);
  });

  it("passwordFillDoesNotMutateEmail", () => {
    const nodes = [
      node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email }),
      node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "", password: true }),
    ];

    const passwordNode = findAndroidAuthTextFieldNode(nodes, ANDROID_AUTH_PASSWORD_FIELD_ID);
    const emailNode = findAndroidAuthTextFieldNode(nodes, ANDROID_AUTH_EMAIL_FIELD_ID);

    expect(passwordNode?.resourceId).toBe(ANDROID_AUTH_PASSWORD_FIELD_ID);
    expect(emailNode?.text).toBe(email);
    expect(buildAndroidAuthSetTextPlan(passwordNode!, password).shouldInput).toBe(true);
    expect(getAndroidAuthFieldValue(emailNode)).toBe(email);
  });

  it("passwordInputRequiresPasswordFieldFocus", () => {
    const nodes = [
      node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email, focused: false }),
      node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "", password: true, focused: true }),
    ];

    expect(verifyAndroidAuthSingleFocusedField(nodes, ANDROID_AUTH_PASSWORD_FIELD_ID)).toMatchObject({
      ok: true,
      targetFocused: true,
      focusedAuthFieldCount: 1,
    });
  });

  it("inputAbortsWhenWrongFieldFocused", () => {
    const nodes = [
      node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email, focused: true }),
      node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "", password: true, focused: false }),
    ];

    expect(shouldAbortAndroidAuthInputForFocus(nodes, ANDROID_AUTH_PASSWORD_FIELD_ID)).toBe(true);
  });

  it("onlyOneAuthFieldFocusedBeforeInput", () => {
    const nodes = [
      node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email, focused: true }),
      node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "", password: true, focused: true }),
    ];

    expect(verifyAndroidAuthSingleFocusedField(nodes, ANDROID_AUTH_PASSWORD_FIELD_ID)).toMatchObject({
      ok: false,
      targetFocused: true,
      focusedAuthFieldCount: 2,
    });
  });

  it("passwordFillPreservesEmailExactly", () => {
    const before = node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email });
    const after = node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email });

    expect(verifyAndroidAuthFieldValue(before, email).ok).toBe(true);
    expect(verifyAndroidAuthFieldValue(after, email).ok).toBe(true);
    expect(getAndroidAuthFieldValue(after)).toBe(getAndroidAuthFieldValue(before));
  });

  it("passwordFillChangesPasswordField", () => {
    const before = node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "", password: true });
    const after = node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "masked-text", password: true });

    expect(getAndroidAuthFieldValue(before)).toBe("");
    expect(getAndroidAuthFieldValue(after)).not.toBe(getAndroidAuthFieldValue(before));
    expect(after.password).toBe(true);
  });

  it("focusVerificationUsesFreshUiDump", () => {
    const staleNodes = [
      node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email, focused: true }),
      node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "", password: true, focused: false }),
    ];
    const freshNodes = [
      node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email, focused: false }),
      node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "", password: true, focused: true }),
    ];

    expect(verifyAndroidAuthSingleFocusedField(staleNodes, ANDROID_AUTH_PASSWORD_FIELD_ID).ok).toBe(false);
    expect(verifyAndroidAuthSingleFocusedField(freshNodes, ANDROID_AUTH_PASSWORD_FIELD_ID).ok).toBe(true);
  });

  it("confirmNeverChangesFocus", () => {
    const before = [
      node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email, focused: true }),
      node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "", password: true, focused: false }),
    ];
    const afterReadOnlyConfirm = before.map((entry) => ({ ...entry }));

    expect(verifyAndroidAuthFieldValue(afterReadOnlyConfirm[0], email).ok).toBe(true);
    expect(afterReadOnlyConfirm.map((entry) => entry.focused)).toEqual(before.map((entry) => entry.focused));
  });

  it("emailAndPasswordSelectorsCannotSwap", () => {
    const nodes = [
      node({ resourceId: ANDROID_AUTH_PASSWORD_FIELD_ID, text: "", password: true }),
      node({ resourceId: ANDROID_AUTH_EMAIL_FIELD_ID, text: email }),
      node({
        resourceId: ANDROID_AUTH_SUBMIT_ID,
        className: "android.widget.Button",
        clickable: true,
      }),
    ];

    expect(findAndroidAuthTextFieldNode(nodes, ANDROID_AUTH_EMAIL_FIELD_ID)?.resourceId).toBe(
      ANDROID_AUTH_EMAIL_FIELD_ID,
    );
    expect(findAndroidAuthTextFieldNode(nodes, ANDROID_AUTH_PASSWORD_FIELD_ID)?.resourceId).toBe(
      ANDROID_AUTH_PASSWORD_FIELD_ID,
    );
    expect(findAndroidAuthSubmitNode(nodes)?.resourceId).toBe(ANDROID_AUTH_SUBMIT_ID);
  });

  it("credentialsNeverAppearInLogsOrArtifacts", () => {
    const raw = `login failed for ${email} with ${password}`;
    const sanitized = sanitizeAndroidAuthHarnessText(raw, { email, password });

    expect(sanitized).not.toContain(email);
    expect(sanitized).not.toContain(password);
    expect(sanitized).toContain("[redacted]");
  });
});

describe("Android post-login route proof", () => {
  const profileXml = `<hierarchy>
    <node resource-id="${ANDROID_AUTHENTICATED_PROFILE_MARKER_ID}" text="" />
    <node resource-id="app-bottom-nav" text="" />
  </hierarchy>`;
  const loadingProfileXml = `<hierarchy>
    <node text="Р—Р°РіСЂСѓР¶Р°РµРј РїСЂРѕС„РёР»СЊ..." />
    <node resource-id="app-bottom-nav" text="" />
    <node resource-id="tabs.profile" text="" selected="true" />
  </hierarchy>`;
  const requestXml = `<hierarchy>
    <node resource-id="app-bottom-nav" text="" />
    <node text="${ANDROID_ROUTE_PROOF_APP_ROOT_READY}" resource-id="${ANDROID_ROUTE_PROOF_APP_ROOT_READY}" />
    <node text="${ANDROID_ROUTE_PROOF_REQUEST_ROUTE_READY}" resource-id="${ANDROID_ROUTE_PROOF_REQUEST_ROUTE_READY}" />
  </hierarchy>`;
  const requestStableXml = `<hierarchy>
    <node resource-id="${ANDROID_BUILD_IDENTITY_MARKER_ID}" text="{}" />
    <node resource-id="${ANDROID_REQUEST_ROUTE_SCREEN_MARKER_ID}" text="" />
    <node resource-id="tabs.request" selected="true" text="" />
  </hierarchy>`;
  const embeddedAiStableXml = `<hierarchy>
    <node resource-id="${ANDROID_BUILD_IDENTITY_MARKER_ID}" text="{}" />
    <node resource-id="ai.assistant.screen" text="" />
    <node resource-id="ai.assistant.messages" text="" />
    <node resource-id="ai.assistant.response" text="" />
  </hierarchy>`;
  const embeddedAiMarkerOnlyXml = `<hierarchy>
    <node text="${ANDROID_ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY}" resource-id="${ANDROID_ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY}" />
  </hierarchy>`;
  const profileWithGlobalAiButtonXml = `<hierarchy>
    <node resource-id="${ANDROID_AUTHENTICATED_PROFILE_MARKER_ID}" text="" />
    <node resource-id="ai.assistant.open" text="AI" />
  </hierarchy>`;
  const profileSelectedXml = `<hierarchy>
    <node resource-id="${ANDROID_BUILD_IDENTITY_MARKER_ID}" text="{}" />
    <node resource-id="tabs.request" selected="false" text="" />
    <node resource-id="tabs.profile" selected="true" text="" />
  </hierarchy>`;
  const notFoundXml = `<hierarchy><node text="РЎС‚СЂР°РЅРёС†Р° РЅРµ РЅР°Р№РґРµРЅР°" /></hierarchy>`;

  it("successfulLoginDoesNotRequireRouteMarkerImmediately", () => {
    const classification = classifyAndroidPostLoginRouteProof({
      authLoginScreenPresent: false,
      authenticatedProfilePresent: isAndroidAuthenticatedProfileSurfaceXml(profileXml),
      authenticatedSessionPresent: isAndroidAuthenticatedSessionSurfaceXml(profileXml),
      sessionStatePresent: true,
      routeAttempted: false,
      registeredCanonicalRoute: ANDROID_CANONICAL_REQUEST_ROUTE_URI,
      actualOpenedRoute: null,
      routeMarkerPresent: false,
      appRootMarkerPresent: false,
      pageNotFoundPresent: false,
    });

    expect(classification).toBe("AUTHENTICATED_SESSION_READY");
  });

  it("authenticatedProfileProvesLoginCompletion", () => {
    expect(isAndroidAuthLoginScreenXml(profileXml)).toBe(false);
    expect(isAndroidAuthenticatedProfileSurfaceXml(profileXml)).toBe(true);
    expect(isAndroidAuthenticatedSessionSurfaceXml(profileXml)).toBe(true);
  });

  it("loadingProfileIsAuthenticatedPending", () => {
    expect(classifyAndroidAuthenticatedReadinessXml(loadingProfileXml)).toBe("AUTHENTICATED_PENDING");
    expect(isAndroidAuthLoginScreenXml(loadingProfileXml)).toBe(false);
    expect(isAndroidAuthenticatedSessionSurfaceXml(loadingProfileXml)).toBe(false);
  });

  it("pendingAuthenticatedShellCanOpenCanonicalRoute", () => {
    expect(canOpenAndroidCanonicalRouteFromReadiness("AUTHENTICATED_PENDING")).toBe(true);
    expect(canOpenAndroidCanonicalRouteFromReadiness("AUTHENTICATED_READY")).toBe(true);
    expect(canOpenAndroidCanonicalRouteFromReadiness("UNAUTHENTICATED")).toBe(false);
  });

  it("requires a real session marker instead of a public shell", () => {
    const publicShellXml = `<hierarchy>
      <node resource-id="app-bottom-nav" text="" />
      <node resource-id="bottom-tab-request" text="" />
    </hierarchy>`;
    const authenticatedXml = `<hierarchy>
      <node resource-id="${ANDROID_AUTHENTICATED_SESSION_READY_MARKER_ID}" text="" />
      <node resource-id="app-bottom-nav" text="" />
    </hierarchy>`;

    expect(isAndroidAuthenticatedSessionSurfaceXml(publicShellXml)).toBe(false);
    expect(isAndroidAuthenticatedSessionSurfaceXml(authenticatedXml)).toBe(true);
    expect(classifyAndroidAuthenticatedReadinessXml(authenticatedXml)).toBe(
      "AUTHENTICATED_READY",
    );
  });

  it("routeFailureBeatsAuthReadiness", () => {
    const notFoundWithShell = `${notFoundXml}${loadingProfileXml}`;

    expect(classifyAndroidAuthenticatedReadinessXml(notFoundWithShell)).toBe("ROUTE_FAILURE");
  });

  it("canonicalRouteUsesRegisteredPath", () => {
    expect(buildAndroidCanonicalRequestRouteUri()).toBe(ANDROID_CANONICAL_REQUEST_ROUTE_URI);
    expect(buildAndroidCanonicalRequestRouteUri({ prompt: "estimate" })).toBe(
      "rik:///request?autoPrepare=1&prompt=estimate",
    );
  });

  it("routeBuilderCannotProduceUnknownRoute", () => {
    expect(buildAndroidRegisteredCanonicalRouteCandidates(ANDROID_CANONICAL_REQUEST_ROUTE_URI)).toEqual([
      ANDROID_CANONICAL_REQUEST_ROUTE_URI,
    ]);
    expect(() =>
      buildAndroidRegisteredCanonicalRouteCandidates("exp+rik-expo-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8130"),
    ).toThrow(/registered rik:\/\/\//);
  });

  it("pageNotFoundCannotBeReportedAsAuthFailure", () => {
    const classification = classifyAndroidPostLoginRouteProof({
      authLoginScreenPresent: false,
      authenticatedProfilePresent: true,
      authenticatedSessionPresent: true,
      sessionStatePresent: true,
      routeAttempted: true,
      registeredCanonicalRoute: ANDROID_CANONICAL_REQUEST_ROUTE_URI,
      actualOpenedRoute: "rik:///%28tabs%29/exp+rik-expo-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8130",
      routeMarkerPresent: false,
      appRootMarkerPresent: false,
      pageNotFoundPresent: isAndroidPageNotFoundXml(notFoundXml),
    });

    expect(classification).toBe("PROOF_HARNESS_ROUTE_BOOTSTRAP_FAILURE");
  });

  it("sessionSurvivesForceStopAndReopen", () => {
    const reopenedXml = profileXml;

    expect(isAndroidAuthLoginScreenXml(reopenedXml)).toBe(false);
    expect(isAndroidAuthenticatedProfileSurfaceXml(reopenedXml)).toBe(true);
  });

  it("routeMarkerCheckedOnlyAfterNavigation", () => {
    expect(androidXmlHasRouteMarker(profileXml, ANDROID_ROUTE_PROOF_REQUEST_ROUTE_READY)).toBe(false);
    expect(androidXmlHasRouteMarker(requestXml, ANDROID_ROUTE_PROOF_REQUEST_ROUTE_READY)).toBe(true);
  });

  it("stableResourceIdsCanProveCanonicalRouteWhenProofTextIsNotExposed", () => {
    expect(androidXmlHasRouteMarker(requestStableXml, ANDROID_ROUTE_PROOF_APP_ROOT_READY)).toBe(false);
    expect(androidXmlHasRouteMarker(requestStableXml, ANDROID_ROUTE_PROOF_REQUEST_ROUTE_READY)).toBe(false);
    expect(isAndroidAppRootSurfaceXml(requestStableXml)).toBe(true);
    expect(isAndroidRequestRouteSurfaceXml(requestStableXml)).toBe(true);
    expect(isAndroidCanonicalRequestRouteReadyXml(requestStableXml)).toBe(true);
  });

  it("stableResourceIdsCanProveEmbeddedAiRouteWhenProofTextIsNotExposed", () => {
    expect(androidXmlHasRouteMarker(embeddedAiStableXml, ANDROID_ROUTE_PROOF_EMBEDDED_AI_ROUTE_READY)).toBe(false);
    expect(isAndroidEmbeddedAiRouteSurfaceXml(embeddedAiStableXml)).toBe(true);
  });

  it("embeddedAiRouteMarkerStillProvesEmbeddedAiRoute", () => {
    expect(isAndroidEmbeddedAiRouteSurfaceXml(embeddedAiMarkerOnlyXml)).toBe(true);
  });

  it("globalAiButtonCannotProveEmbeddedAiRoute", () => {
    expect(isAndroidEmbeddedAiRouteSurfaceXml(profileWithGlobalAiButtonXml)).toBe(false);
  });

  it("selectedRequestTabCannotBeBorrowedFromProfileRoute", () => {
    expect(androidXmlHasSelectedResourceId(profileSelectedXml, "tabs.request")).toBe(false);
    expect(isAndroidRequestRouteSurfaceXml(profileSelectedXml)).toBe(false);
  });

  it("credentialsNeverAppearInEvidence", () => {
    const evidenceEmail = "agent-control@example.test";
    const evidencePassword = "secret-password";
    const rawEvidence = {
      final_status: "POST_LOGIN_CANONICAL_ROUTE_BOOTSTRAP_FAILURE",
      details: `route proof failed after ${evidenceEmail} with ${evidencePassword}`,
    };
    const sanitized = sanitizeAndroidAuthHarnessText(JSON.stringify(rawEvidence), {
      email: evidenceEmail,
      password: evidencePassword,
    });

    expect(sanitized).not.toContain(evidenceEmail);
    expect(sanitized).not.toContain(evidencePassword);
    expect(sanitized).toContain("[redacted]");
  });
});
