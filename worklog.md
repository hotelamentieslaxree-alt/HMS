---
Task ID: 2
Agent: Main
Task: Enhance HMS with professional HR module (Attendance, Payroll, Events, Scorecards) + department-specific solutions

Work Log:
- Added 4 new Prisma models: Attendance, PayrollRecord, CompanyEvent, Scorecard
- Added reverse relations to User and Property models
- Pushed schema changes to SQLite database
- Created 4 HR API routes:
  - /api/hr/attendance — CRUD + Excel bulk upload + monthly/weekly/daily views + auto work hours calc
  - /api/hr/payroll — Auto-generate payroll with Indian salary structure (HRA, DA, PF, ESI, PT) + process/pay workflow
  - /api/hr/events — CRUD for company events (festival, training, meeting, celebration, audit)
  - /api/hr/scorecards — Weighted scoring (8 metrics) + auto grade calculation (A+ to D)
  - /api/hr/employees — Employee CRUD with search/filter/add
- Seeded HR data: 32 attendance records, 16 payroll records, 10 events, 16 scorecards
- Built complete 6-tab HR module (staff.tsx):
  - Overview: KPI cards, attendance chart, department distribution, events, top performers
  - Attendance: Monthly/weekly/daily views, mark attendance, bulk upload, summary cards
  - Employees: Directory with search/filter, add/edit/deactivate
  - Payroll: Salary breakdown, generate/process/pay workflow, professional salary slip dialog
  - Events: Calendar-style list with color-coded types, add events
  - Scorecards: Department averages chart, detailed metrics table, add scorecard
- Enhanced HR Dashboard in main dashboard module:
  - Added attendance rate, present count, late/absent, payroll, avg score KPIs
  - Added Top Performers section with grades
  - Added Payroll Summary (Gross/Deductions/Net)
  - Added Upcoming Events list
- Fixed Top Performers name display (userName vs user.firstName)
- Fixed "Present Today" label to "Present (Month)" for accuracy

Stage Summary:
- Full HR management system with attendance tracking, payroll processing, salary slip generation, event management, and performance scorecards
- 6-tab professional HR module with rich data and interactive features
- Indian salary structure with proper deductions (PF 12%, ESI 0.75%, PT ₹200)
- Weighted scorecard system with auto-grading
- All features browser-validated and working
