# Task: Create Performance Scorecard Module

## Summary
Created `/home/z/my-project/src/components/hms/modules/scorecard.tsx` — a standalone Performance Scorecard module (1653 lines) for the ARIA HMS application.

## What was done

### 1. Created ScorecardModule component
- **Overview Tab**: KPI cards (avg score, top performer, A+ achievers, total evaluated), grade distribution bar chart, department averages horizontal bar chart, top 5 performers quick view
- **Scorecards Tab**: Full filterable table with period selector, search, department filter; 8 metric columns + overall score + grade + edit action; Add Scorecard dialog with slider+input for each metric
- **Leaderboard Tab**: Ranked list with medal icons for top 3, score progress bars, grade badges, score differentials
- **Employee Detail Tab**: Back navigation, radar chart for metric breakdown (8 axes normalized to 0-100), trend line chart (6 periods) with grade reference lines, detailed metric cards with progress bars, remarks section
- **Add/Edit Scorecard Dialog**: 8 weighted metrics with dual slider+number input, live preview with calculated overall score and grade, weight legend, remarks field

### 2. Updated app-shell.tsx
- Added `ScorecardModule` import and registered it in `MODULE_COMPONENTS` under the `scorecard` key

### 3. Key design decisions
- Used `ReferenceLine` from recharts for grade boundary markers on trend chart (A+ at 90, A at 80, B+ at 70)
- Radar chart normalizes all metrics to 0-100 scale for consistent visualization
- Live preview in the dialog calculates weighted score using the same formula as the backend
- Color palette: Navy #1B3A6B, Gold #C9952A, Success #16A34A
- Grade colors follow the specified GRADE_COLORS mapping
- Trend data fetched by making sequential API calls for last 6 periods

## Lint Results
- `scorecard.tsx`: 0 errors, 0 warnings
- Pre-existing errors in `attendance.tsx` (not related to this task)
