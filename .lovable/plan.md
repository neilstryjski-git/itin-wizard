

## Problem Analysis

The `buildTimeline` sorting relies on string comparison of `displayDate` values. If `normalizeDate` fails to convert any date to `YYYY-MM-DD` (returning the original string instead), string comparison breaks ordering. Additionally, the `new Date()` fallback on line 37-39 creates UTC dates for ISO-formatted strings, which `date-fns`'s `format()` then renders in local time — potentially shifting dates by a day for users west of UTC.

## Root Causes

1. **Fragile string-based sorting** — If even one event's date doesn't normalize to `YYYY-MM-DD`, the `localeCompare` sort produces wrong results
2. **UTC timezone trap** — `new Date('2026-03-15')` → UTC midnight → `format()` uses local time → date shifts back one day in western timezones
3. **Missing format coverage** — ISO datetime strings like `2026-03-15T00:00:00.000Z` bypass the ISO regex and hit the buggy fallback

## Plan

### 1. Fix `normalizeDate` in `src/lib/itinerary-utils.ts`
- Add handling for ISO datetime strings (`2026-03-15T...`) — extract just the date part before the `T`
- Fix the `new Date()` fallback to use local date components (`getFullYear/getMonth/getDate`) instead of `date-fns format()` to avoid UTC→local shifts
- Add `"MMMM d, yyyy"` and `"MMM d, yyyy"` to the date-fns format list for free-text dates

### 2. Make `buildTimeline` sort use numeric comparison instead of string comparison
- Convert normalized dates to `Date` objects (using `new Date(year, month-1, day)` from parsed parts) for numeric comparison
- Fall back to `0` timestamp for unparseable dates so they sort to the top (visible) rather than randomly scattered

