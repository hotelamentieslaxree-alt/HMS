# Task: Rewrite Staff Module to Staff Directory

## Task ID: staff-directory-rewrite

## Summary
Rewrote `/home/z/my-project/src/components/hms/modules/staff.tsx` from a 6-tab HR-heavy module (with attendance, payroll, events, scorecards) to a clean 3-tab Staff Directory module.

## Changes Made

### Removed
- Overview tab (with attendance/payroll/scorecard KPIs)
- Attendance tab (marking, tracking, calendar)
- Payroll tab (salary processing)
- Events tab (HR events management)
- Scorecards tab (performance reviews)
- All HR-specific color constants (ATTENDANCE_COLORS, PAYROLL_COLORS, EVENT_COLORS, GRADE_COLORS)

### Added
1. **Directory Tab** — Searchable, filterable employee table
   - KPI cards: Total Staff, Active, On Leave, Departments
   - Search bar (name, email, role, department, employee code)
   - Department filter dropdown
   - Status filter dropdown (Active/On Leave/Inactive)
   - Professional table with avatar, name, role, department, email, phone, status
   - Click-to-open employee detail dialog

2. **Departments Tab** — Department-wise grouping
   - Recharts donut/pie chart for department distribution
   - Department summary sidebar with member counts
   - Collapsible department cards with employee grid
   - Color-coded per department
   - Shows department head info

3. **Org Chart Tab** — Simple hierarchy
   - KPI cards: Leadership, Dept Heads, Team Members, Departments
   - Hierarchical levels: Executive → GM → Dept Heads → Team Members
   - Collapsible department sections
   - OrgPersonCard component with rich detail for executives
   - Level headers with accent colors (navy/gold/success)

### Shared Components
- `EmployeeDetailDialog` — Reusable detail popup with avatar, role, department, email, phone, join date, property
- `OrgPersonCard` — Compact org chart person card
- `SkeletonGrid` — Loading skeleton

### Design
- Color palette: Navy (#1B3A6B), Gold (#C9952A), Success (#16A34A)
- Professional MNC-level design with consistent spacing
- Responsive layout (mobile-first with sm/md/lg/xl breakpoints)
- Avatar with initials fallback
- Status badges with semantic colors

## Verification
- Lint: PASSED (no errors)
- Dev server: Running without compilation errors
- Imports: All verified against existing shadcn/ui components and shared helpers
