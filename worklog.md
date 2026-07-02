---
Task ID: 1
Agent: Main
Task: Fix bugs, add login system with role-based auth, department-specific dashboards

Work Log:
- Examined existing project state: backend complete, frontend modules exist but no auth system
- Created `/api/auth/login` route — validates email+password (demo: aurelian2024), returns user data with token
- Created `/api/auth/me` route — returns current user from token
- Created `/api/auth/logout` route — stateless logout
- Updated Zustand store (`src/lib/store.ts`) with auth state, ROLE_MODULES mapping (which modules each role can access), ROLE_META with 13 roles
- Updated API client (`src/lib/api.ts`) to include auth token from localStorage
- Built professional login page (`src/components/hms/login-page.tsx`) with:
  - Dark luxury theme with animated background effects
  - 12 role cards for Quick Access login (Owner, GM, FOM, HK Mgr, FB Mgr, Finance Mgr, Eng Mgr, Revenue Mgr, HR Mgr, Receptionist, HK Attendant, Waiter)
  - Manual Sign In tab with email/password form
  - Session persistence via localStorage
- Updated AppShell to gate behind authentication — shows LoginPage when not authenticated
- Updated Sidebar with role-based navigation filtering — only shows modules the current role can access
- Updated Topbar with user avatar, name, role label, and sign-out button
- Built 9 role-specific dashboard views:
  - **Owner**: Full command center with all KPIs, revenue charts, channel mix
  - **GM**: Operations overview with occupancy, arrivals/departures, department health
  - **Front Desk**: Arrivals/departures focus, room status board
  - **Housekeeping**: Task counts, room status, task list with assignees
  - **F&B**: Outlet grid, table counts, POS quick access
  - **Finance**: Revenue bar chart, TRevPAR/GOPPAR/CPOR, report quick actions
  - **Engineering**: Ticket list, OOO/OOS room counts
  - **Revenue**: WoW KPI deltas, channel production breakdown
  - **HR**: Staff counts, department staffing breakdown
- Fixed 3 bugs found during browser validation:
  1. MoonStar icon not imported in dashboard.tsx
  2. F&B outlets data shape mismatch (array vs object)
  3. HK task assignee name access (firstName/lastName vs name)
- Fixed HK dashboard to use HK API summary for accurate task counts
- Fixed F&B dashboard to show "Tables Available" instead of "HK Completed"
- Fixed HR dashboard to correctly parse staff API response

Stage Summary:
- Full role-based authentication system with professional login page
- 12 role cards for instant department-specific login
- 9 unique department dashboards with themed banners
- Role-based sidebar navigation filtering
- All 24 browser test steps pass
- Lint clean, no compilation errors
