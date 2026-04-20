# A6.1 PROFILE DUAL WRITE HARDENING PROOF

## Scope

- `src/screens/profile/profile.services.ts`
- `src/screens/profile/profile.services.test.ts`

## Before

`saveProfileDetails` performed:

1. avatar upload when needed
2. `supabase.auth.updateUser({ data: { full_name, city, avatar_url } })`
3. `supabase.from("user_profiles").upsert(...)`

If step 2 succeeded and step 3 failed, editable profile fields could diverge.

## After

`saveProfileDetails` performs:

1. avatar upload when needed
2. `supabase.from("user_profiles").upsert(...)`
3. `supabase.auth.updateUser({ data: { avatar_url } })` only when avatar URL changed

Editable profile fields now have one canonical persistence owner: `user_profiles`.

## Commands And Results

- `npm test -- src/screens/profile/profile.services.test.ts --runInBand`: PASS, 1 suite / 4 tests
- `npm test -- profile --runInBand`: PASS, 10 suites / 27 tests
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `git diff --check`: PASS
- `npm test -- --runInBand`: PASS, 373 passed / 1 skipped suites, 2375 passed / 1 skipped tests
- `npm test`: PASS, 373 passed / 1 skipped suites, 2375 passed / 1 skipped tests

## Regression Shield

- Healthy canonical write persists all editable profile fields to `user_profiles`.
- Saving changed profile fields with unchanged avatar does not call `auth.updateUser`.
- Failed `user_profiles` write does not mutate auth metadata.

## Not Changed

- No profile UI behavior was changed.
- No role/access owner was changed.
- No SQL or schema changes were made.
- No avatar storage owner redesign was attempted.
