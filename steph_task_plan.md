### 1. Refactor tasks (pages to edit & components to build)

Focus on a few high‑impact pages, not everything.

#### Page A – Dashboard home / overview page  
(Whatever your main dashboard page is, e.g. `app/(dashboard)/dashboard/page.tsx`)

- **Components**
  - `DashboardHeader` (user greeting, quick stats)
  - `KpiCard` (small metric cards)
  - `RecentActivityList`
  - `EmptyState` (reusable for “no data yet”)
  - `PageLayout` (shared layout wrapper: title, breadcrumbs, actions slot)

#### Page b – One detail page (e.g. job or application details)  

- **Components**
  - `DetailHeader` (title, status badge, actions)
  - `DetailMetaSection` (key/value pairs: created at, owner, etc.)
  - `DetailTabs` (Overview / Activity / Settings)
  - `ActivityTimeline`
  - `SideInfoCard` (reusable for small sidebar sections)

---

### 2. New feature: “User Subscriptions”

Create a dedicated subscriptions area plus reusable building blocks.

#### Page C – Subscriptions page  
New file: e.g. `app/(dashboard)/dashboard/subscriptions/page.tsx`

- **Top‑level components**
  - `SubscriptionsLayout` (page shell + title + description)
  - `CurrentPlanCard` (shows current plan, renewal date, status)
  - `PlansGrid` (list of available plans)
    - `PlanCard` (name, price, features, CTA)
  - `BillingSummary` (next charge, currency, trial info)

- **Interaction components**
  - `ChangePlanModal` (upgrade/downgrade flow)
  - `CancelSubscriptionDialog`
  - `PaymentMethodForm` (card/PM management)
  - `BillingHistoryTable` (invoices / past payments rows)

If you want to stretch them slightly into backend:

- One server/action file: `lib/actions/subscription.action.ts`
  - `getCurrentSubscription`
  - `listPlans`
  - `changePlan`
  - `cancelSubscription`
