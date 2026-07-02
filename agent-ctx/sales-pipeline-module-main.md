# Task: Sales Pipeline Module — Work Record

## Completed Files

### 1. `/home/z/my-project/src/components/hms/modules/sales.tsx`
- Full "use client" component exporting `SalesModule`
- **4 Tabs**: Pipeline, Leads, Deals, Analytics
- **Pipeline Tab**: Kanban-style columns (New → Contacted → Qualified → Proposal → Negotiation → Won → Lost), lead cards with company/contact/value/probability/source, click-to-move stage buttons, pipeline value summary KPIs, filter by source/assignee
- **Leads Tab**: Full data table with search, source/status filters, Add/Edit dialog, source badges with icons/colors (direct=blue, referral=green, website=purple, linkedin=#0A66C2, expo=orange, cold_call=red, ota_partner=teal), quick actions (Mark Contacted, Send Proposal, Mark Won/Lost)
- **Deals Tab**: Deal list with stage movement, Add Deal dialog with lead association, weighted pipeline value, value distribution bar chart (total vs weighted), stage filter
- **Analytics Tab**: 6 KPIs (Total Pipeline, Won This Month, Win Rate, Avg Deal Size, Sales Cycle, Target Achievement), Pipeline by Stage horizontal bar chart, Monthly Revenue area chart, Win/Loss Analysis pie chart, Sales by Source horizontal bar chart, Top Performers ranked list with progress bars
- Color palette: Navy #1B3A6B, Gold #C9952A, Success #16A34A

### 2. `/home/z/my-project/src/app/api/sales/leads/route.ts`
- GET with filters: status, source, assignedTo, search
- POST to create new leads with validation
- PUT to update leads (status changes auto-set probability for won/lost)
- 15 mock leads with realistic Indian corporate data

### 3. `/home/z/my-project/src/app/api/sales/deals/route.ts`
- GET with stage filter
- POST to create deals
- PUT to update deal stages (auto-set probability for closed_won/closed_lost)
- 12 mock deals across all stages

### 4. Updated `/home/z/my-project/src/components/hms/app-shell.tsx`
- Added `import { SalesModule } from "./modules/sales"`
- Changed `sales: MarketingModule` → `sales: SalesModule`

## Design Decisions
- Used `key` prop pattern on dialogs to reset form state without useEffect+setState (avoids lint error)
- Source badges use custom inline styles matching the specified color scheme
- Pipeline columns use fixed width (260px) with horizontal scroll for responsive behavior
- Charts use recharts with custom ChartTooltip component for consistent styling
- All money values formatted with fmtINR (Indian Rupee format)
- Responsive design with hidden columns on smaller screens
