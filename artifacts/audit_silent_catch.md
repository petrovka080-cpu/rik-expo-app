# RIK-EXPO - SILENT CATCH REPORT

Выявлены блоки `catch (e) {}` и `catch {}`, где проглатываются ошибки без записи в систему телеметрии/observability. 
Это приводит к потере контекста падений.

## Обнаруженные участки (Глобальный поиск)

1. **`app/_layout.tsx`**
   - Блок восстановления сессии для Web. Ошибка `window.document` настроек подавляется.
   - Потенциальное проглатывание `URL.revokeObjectURL` в специфичных условиях.

2. **`app/(tabs)/buyer.tsx`**
   - Silent catch при выполнении локальных мутаций или инициализации стейта вкладки.

3. **`src/screens/director/DirectorDashboard.tsx`**
   - Проглатывание ошибок рендера графиков или 초기 загрузки Dashboard metrics.

4. **`src/lib/notify.native.ts` & `src/lib/notify.web.ts`**
   - Ошибки системы Push уведомлений (Notifee / Expo Notifications) подавляются, если нет пермишенов, что скрывает баги на iOS.

5. **`src/components/map/MapRenderer.web.tsx`**
   - Ошибка загрузки WebGL контекста проглатывается, вместо fallback интерфейса.

> **Рекомендация:** Заменить на `catch (e) { recordCatchDiscipline({ ... }) }` или убрать `catch`.
