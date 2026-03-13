# Audit: Type Suppression & Type Safety

**Criticallity: P0 (CRITICAL)**

В кодовой базе RIK Platform обнаружено массовое и системное подавление ошибок компилятора TypeScript. Это разрушает саму суть использования статической типизации и превращает кодовую базу в "JS с декорациями TS".

## 1. Категория: `as any` и `as unknown as`

**Количество мест:** ~100+ (По всему API и UI)
Типичные файлы:
- `src/lib/supabaseClient.ts`, `src/lib/api/_core.ts`, `src/lib/api/director_reports.ts`
- `src/screens/buyer/buyer.actions.ts`, `src/screens/director/director.metrics.ts`

**Описание проблемы:**
Разработчики не могут предсказать форму ответа от Supabase RPC функций (или не хотят синхронизовать типы), поэтому вручную кастуют ответ через `const data = response as any`.
Если в БД изменится поле (например `buyer_id` на `manager_id`), компилятор промолчит, но в Runtime мы получим "красный экран śmierci".

**Roadmap устранения без смены логики:**
1. Сгенерировать актуальную схему: `npx supabase gen types typescript --local > database.types.ts`
2. Типизировать `supabaseClient` этой схемой.
3. Пройтись по API файлам и заменить `as any` на `Select<Database['public']['Tables']['tableName']['Row']>` (или DTO).

## 2. Категория: `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`

**Количество мест:** ~50+ (Преимущественно в UI компонентах и сложных модалках)
Типичные файлы:
- `src/screens/director/director.reports.ts`
- `src/components/map/MapScreen.tsx`
- `src/components/SingleDatePickerSheet.tsx`

**Описание проблемы:**
`@ts-ignore` используется для протаскивания (prop drilling) несовместимых пропсов в дочерние компоненты (например, передача `null` там, где ожидается `string`), или вызовов отсутствующих методов библиотек (например, Web-specific или Legacy Expo методов). Усугубляется тем, что часть `@ts-ignore` вставляется АВТОМАТИЧЕСКИ перед билдом (см. `audit-build-hacks.md`).

**Roadmap устранения без смены логики:**
1. Включить правило ESLint `@typescript-eslint/ban-ts-comment`.
2. Заменить жесткие игноры на явные тайп-гварды (Type Guards): `if (item !== null) { ... }`.
3. Для чужих библиотек — расширить типы через `declare module`.
