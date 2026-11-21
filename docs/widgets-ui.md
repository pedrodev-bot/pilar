# Widgets, UI & Release Announcements

- **Release Notes (`mobile/src/constants/changelog.ts`):** `CHANGELOG` holds bilingual (`pt-BR`, `en-US`) release entries ordered newest-first. `LATEST_RELEASE_VERSION` points to `CHANGELOG[0].version`.
- **Update Detection (`useUIStore`):** `lastSeenVersion` is persisted in `AsyncStorage` under `@pilar:ui_settings`.
- **Startup Popup (`HomeScreen` -> `WhatsNewModal`):** Waits for `useUIStore.persist.hasHydrated()` before comparing `lastSeenVersion !== LATEST_RELEASE_VERSION`, preventing false popups on cold start.
- **Settings Indicator (`settings.tsx`):** Displays an unread `"New"` / `"Novo"` badge on **Release History** until the user dismisses the startup popup or opens the history modal.
- **Overview Balance & Investments (`OverviewWidget.tsx`):** Carries over net cash balance (`income - expense - investment`) from prior months into the selected month, displaying prior/monthly breakdown pills and accumulated investment totals alongside monthly contributions.
- **Month Calendar Grid (`MonthCalendarGrid.tsx`):** Shared 3×4 year-navigable month grid used by `MonthSelectorBar` and `TransactionFilterModal` (which also supports combinable period + transaction-type filters).