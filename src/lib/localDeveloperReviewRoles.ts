export const LOCAL_DEVELOPER_REVIEW_ROLES = [
  "foreman",
  "director",
  "buyer",
  "accountant",
  "warehouse",
  "contractor",
  "security",
  "estimator",
  "engineer",
] as const;

export type LocalDeveloperReviewRole =
  (typeof LOCAL_DEVELOPER_REVIEW_ROLES)[number];

export const LOCAL_DEVELOPER_CONSUMER_ROLE = "consumer" as const;

export type LocalDeveloperConsumerRole =
  typeof LOCAL_DEVELOPER_CONSUMER_ROLE;

export type LocalDeveloperPrincipalRole =
  | LocalDeveloperReviewRole
  | LocalDeveloperConsumerRole;
