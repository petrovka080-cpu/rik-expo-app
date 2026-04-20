# A6.1 PROFILE DUAL WRITE HARDENING NOTES

## Status

GREEN. Targeted profile gates and full release gates passed before commit/push.

## Preflight

- Base started clean after A5.
- `main == origin/main` at `85e5365058a7a4054a29beb1446859a1d7653773`.
- `git diff --stat` was empty before A6.1 edits.
- No repo-context node/eas/adb tails were present before opening A6.1.

## Root Cause

`saveProfileDetails` wrote editable profile fields to auth metadata first and then wrote the same profile fields to `user_profiles`.

Risk class:

- `auth.updateUser({ full_name, city, avatar_url })` could succeed.
- `user_profiles.upsert(...)` could fail.
- The app would then have diverged UI-critical fields between auth metadata and `user_profiles`.

## Canonical Owner Decision

`user_profiles` is the canonical owner for editable UI-critical profile fields:

- `full_name`
- `phone`
- `city`
- `usage_market`
- `usage_build`
- `bio`
- `telegram`
- `whatsapp`
- `position`

Auth metadata is no longer used as a mirror for `full_name` or `city` during profile save.

`avatar_url` remains auth-owned because the current `user_profiles` schema has no avatar URL column. Avatar behavior was not redesigned in this wave.

## Change

- Removed the unconditional auth metadata write for `full_name` and `city`.
- Kept `user_profiles.upsert(...)` as the canonical profile write.
- Kept auth update only for changed `avatar_url`.
- Added focused tests proving:
  - editable profile fields are persisted through `user_profiles`
  - auth metadata is not mutated for editable profile fields
  - auth metadata is not mutated when the canonical `user_profiles` write fails

## Explicitly Unchanged

- Profile UI flow.
- Profile form field semantics.
- Avatar upload implementation.
- Role/access resolution.
- Company/listing flows.
- Supabase table shape and SQL.
- Auth/session logic outside this exact save boundary.

## Production Safety

- No temporary hooks, adapters, VM shims, sleeps, retries, skips, ignores, or suppressions were introduced.
- No broad profile refactor was done.
- No caller contract was widened.
- Existing profile screen and composition tests remain green.
