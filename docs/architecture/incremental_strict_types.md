# Incremental Strict Types

S-STRICT-1 keeps the global application `tsconfig.json` unchanged while adding a targeted strict check for high-risk helper modules.

Run the targeted check with:

```bash
npx tsc --noEmit --pretty false --project tsconfig.strict.json
```

## Scope Rules

- Add small, well-contained helper modules first.
- Prefer runtime validation, pagination, release-safety, and observability helpers.
- Avoid large UI screens until their nullability and style boundaries can be handled as a separate wave.
- Do not flip global `strict` until the normal full repo check passes safely under that setting.

## Fix Rules

- Prefer `unknown`, narrow type guards, explicit return types, and explicit null checks.
- Do not add broad `any`.
- Do not add `// @ts-ignore`.
- Use `// @ts-expect-error` only in tests that intentionally prove invalid types.

## Deferred Options

`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are intentionally deferred for S-STRICT-1 because enabling them currently pulls unrelated optional-field churn through observability and Supabase client dependencies. They should be introduced in a later strict wave with a dedicated nullability plan.
