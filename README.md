# ShiftSync — Multi-Location Staff Scheduling Platform

A full-stack workforce scheduling platform built for Coastal Eats, a fictional restaurant group operating across 4 locations in 2 time zones.

---

## Live Application

| | URL |
|---|---|
| **Frontend** | *(add Vercel URL after deploy)* |
| **API** | *(add Railway URL after deploy)* |
| **API Docs (Swagger)** | `[API URL]/docs` — password: `heyoo!` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 10, TypeScript, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Auth | JWT via httpOnly cookie, argon2 password hashing |
| Real-time | WebSocket gateway (`@nestjs/websockets` + socket.io) |
| Background jobs | Bull + Redis |
| Frontend | Next.js 16, TailwindCSS v4, shadcn/ui |
| Data fetching | TanStack Query v5, Axios |
| Deployment | Railway (backend + Redis), Vercel (frontend), Supabase (DB) |

---

## Logging In

All accounts use the password: **`Password123!`**

| Role | Email | What you see |
|---|---|---|
| **Admin** | `admin@coastal-eats.com` | All 4 locations, corporate oversight, audit logs, fairness alerts |
| **Manager (SF)** | `manager.sf@coastal-eats.com` | Downtown + Mission locations, pending approvals, schedule management |
| **Manager (NYC)** | `manager.nyc@coastal-eats.com` | NYC + Boston locations |
| **Staff (Bartender, SF)** | `sarah@coastal-eats.com` | Personal shifts, swap requests, open shift pickup |
| **Staff (Server, SF)** | `james@coastal-eats.com` | Used in the Regret Swap evaluation scenario |
| **Staff (Cross-TZ)** | `liam@coastal-eats.com` | PST staff certified at both SF and NYC — demonstrates timezone constraint |
| **Staff (Night shift)** | `dmitri@coastal-eats.com` | 5 PM–2 AM availability — demonstrates rest period violation |

A **Demo Role Switcher** bar appears at the bottom of every page after login. Click Admin, Manager, or Staff to switch context instantly without logging out.

---

## Evaluation Scenarios

### Scenario 1 — Sunday Night Chaos
A staff member calls out at 6pm Sunday for a 7pm shift.

1. Log in as **Manager SF**
2. Navigate to **Schedule** → week of May 12 → Sunday column
3. Find the unassigned SERVER shift at 7pm (`shift_dt_sun_server_7pm`)
4. Click the shift → **Assign Staff** modal opens
5. Select any qualified server — if they pass constraints, Confirm Assignment
6. Or: click **Find Coverage** from the Coverage page to create a drop request that staff can pick up

---

### Scenario 2 — The Overtime Trap
A manager builds a schedule without realising an employee would hit 52 hours.

1. Log in as **Manager SF**
2. Navigate to **Schedule** → week of May 12
3. Find `shift_alex_sat_open` (Saturday, SERVER, Downtown)
4. Try to assign **Alex Stewart** — he already has 40h Mon–Fri
5. The constraint engine fires: **WEEKLY_HOURS_APPROACHING_OT** warning showing current 40h → projected 48h
6. The **Analytics → Overtime** tab confirms Alex is at risk

---

### Scenario 3 — The Timezone Tangle
A PST-based staff member is certified at a NYC location. Their 9am–5pm PST availability should block a 10pm NYC shift.

1. Log in as **Manager NYC**
2. Navigate to **Schedule** → week of May 23 → Friday column
3. Find `shift_nyc_fri_late_bar` (10pm NYC, BARTENDER)
4. Try to assign **Liam O'Brien** (PST timezone, 9am–5pm availability)
5. Constraint fires: **UNAVAILABLE** — "shift falls outside 9:00–17:00 window (America/Los_Angeles)"
6. 10pm EST = 7pm PST — outside his availability window

---

### Scenario 4 — The Simultaneous Assignment
Two managers race to assign the same bartender at the same time.

1. Open **two browser tabs**, log in as Manager SF in both
2. In both tabs, navigate to Schedule → find any unassigned bartender shift
3. In Tab 1: open the shift modal and select Sarah Johnson but don't confirm yet
4. In Tab 2: assign Sarah to the same shift and confirm
5. Go back to Tab 1 and confirm — the API response shows "Shift was just filled by another manager" (transaction lock)
6. The WebSocket broadcasts the conflict and Tab 1's schedule grid refreshes automatically

*Technical mechanism: `SELECT ... FOR UPDATE` inside a Prisma transaction acquires a row-level lock on the shift before writing the assignment.*

---

### Scenario 5 — The Fairness Complaint
An employee claims they never get Saturday night shifts.

1. Log in as **Admin**
2. Navigate to **Analytics → Fairness tab**
3. The bar chart immediately shows **Marcus Thompson with 8 premium shifts** (Fri/Sat evenings) vs **Sarah Johnson with 1**
4. Filter by location (Downtown SF) to see the imbalance more clearly
5. Fairness score for Sarah is highlighted as imbalanced

---

### Scenario 6 — The Regret Swap
Staff A requests a swap, then changes their mind before the manager approves.

1. Log in as **James** (`james@coastal-eats.com`)
2. Navigate to **Coverage → My Requests** — there is a PENDING swap with Priya Patel for the Wednesday dinner shift
3. Click **Cancel** — the request is cancelled, Priya is notified, the original assignment is unchanged
4. Alternatively: log in as **Priya** (`priya@coastal-eats.com`), navigate to Coverage, find the pending request and **Accept** it
5. Log in as **Manager SF** → Coverage → Pending Approvals → the accepted swap appears
6. Manager can **Approve** (transfers the shift) or **Reject** (restores original assignment)

---

## Constraint Engine — All 11 Rules

The assignment modal calls `POST /v1/assignments/preview` before confirming any assignment. All violations include the rule name and a human-readable explanation.

| Rule | Type | Trigger |
|---|---|---|
| `DOUBLE_BOOKING` | Hard block | Overlapping shift times for same staff member |
| `REST_PERIOD` | Hard block | < 10h gap between end of one shift and start of next |
| `SKILL_MISMATCH` | Hard block | Staff does not have the required skill |
| `CERT_MISSING` | Hard block | Staff not certified to work at this location |
| `UNAVAILABLE` | Hard block | Shift falls outside staff's recurring availability window (timezone-aware) |
| `AVAILABILITY_EXCEPTION` | Hard block | Staff has a date-specific unavailability exception |
| `DAILY_HOURS_HARD` | Hard block | Assignment would put staff > 12h in a single calendar day |
| `SEVENTH_DAY_BLOCK` | Hard block (overridable) | Staff would work 7th consecutive day — manager override + reason required |
| `DAILY_HOURS_SOFT` | Warning | > 8h in a single day |
| `WEEKLY_HOURS_35` | Warning | Projected weekly hours ≥ 35h |
| `WEEKLY_HOURS_APPROACHING_OT` | Warning | Projected weekly hours ≥ 40h (overtime threshold) |
| `CONSECUTIVE_6TH_DAY` | Warning | Staff would work 6th consecutive calendar day |

When a hard block fires, the system suggests up to 5 qualified alternatives who pass all constraints.

**Constraint demo shifts** (available in the schedule):
- `shift_dt_fri_overlap_bar` → select Marcus Thompson → DOUBLE_BOOKING
- `shift_dmitri_fri_morning` → select Dmitri Volkov → REST_PERIOD (7h gap after Thu 1am)
- `shift_nyc_fri_late_bar` → select Liam O'Brien → UNAVAILABLE (PST outside 9–5)
- `shift_dt_long_14h` → select anyone → DAILY_HOURS_HARD (14h duration)
- `nw_consec_sat_open` → select Priya Patel → CONSECUTIVE_6TH warning (Mon–Fri assigned)
- `nw_consec_sun_open` → select Priya Patel → SEVENTH_DAY_BLOCK

---

## Seed Data

Seed is pre-applied to the hosted database. To re-apply locally:

```bash
cd shiftsync-ps
pnpm db:seed
```

**What's seeded:**
- 4 locations (Downtown SF, Mission SF — PST; Midtown NYC, Boston Back Bay — EST)
- 22 staff across all roles, skills, and certifications
- 2 weeks of shifts (May 12–25) across all 4 locations, including:
  - Published and draft shifts
  - Premium shifts (Fri/Sat evenings) with deliberate fairness imbalance
  - All 6 evaluation scenario setups pre-staged
  - All constraint violation demo shifts clearly annotated
- Seeded swap requests: 1 PENDING (James/Priya), 1 MANAGER_REVIEW (Sarah/Elena)
- 13 pre-seeded notifications (mix of read and unread)
- Historical audit log entries

---

## Architecture Decisions

### Ambiguities from the spec — resolved as follows:

| Ambiguity | Decision | Reason |
|---|---|---|
| De-certified staff historical data | Keep assignments, log cert as `REVOKED` in audit. Assignments marked `HISTORICAL_CERT_REVOKED`. | Historical accuracy — deleting would falsify the record |
| Desired hours vs availability | Availability = hard constraint. Desired hours = fairness metric only, never blocks assignment. | They serve different purposes — conflating them creates confusing UX |
| Consecutive days (1h vs 11h) | Any shift on a calendar day (in location timezone) counts as that day worked | Consistent with labour law intent — a rest day means no work regardless of shift length |
| Shift edited after swap approval | Edit cancels the approved swap. All parties notified. Original holder retains the shift until manager re-approves. | The approved swap was contingent on shift details — changes invalidate the agreement |
| Restaurant spanning timezone boundary | Use the IANA timezone of the registered address (county-level). Documented as the chosen approach. | Only one authoritative timezone per location is implementable |

### Concurrency — Simultaneous Assignment

Simultaneous assignment is handled with a PostgreSQL row-level pessimistic lock:

```typescript
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT id FROM shifts WHERE id = ${shiftId} FOR UPDATE`;
  // constraint check inside transaction (race-condition safe)
  // write assignment
  // write audit log
});
// broadcast via WebSocket after commit
```

The second manager's request blocks on the `FOR UPDATE` lock, re-checks headcount inside the transaction, and receives a `ConflictException` if the shift was already filled.

---

## Known Limitations

| Item | Notes |
|---|---|
| **Constraint preview response time** | 7–15s on free Supabase EU (cross-continent latency). Deployed on Railway EU (same region), expect 1–3s. Architecture is correct — optimization opportunity is batching queries. |
| **Email notifications** | Backend is fully wired (Bull + Mailer + Pug templates). Disabled because SMTP not configured for the demo deployment. All notifications work in-app. |
| **Audit log CSV export** | The API supports full filter/pagination. No download button built in the UI. |
| **Drag-and-drop scheduling** | Click-to-assign used instead. Functionally equivalent for this assessment. DnD would add ~8h of build time for no constraint-checking advantage. |
| **Notification preferences persistence** | Saved to localStorage. A `user_preferences` table would be the production pattern. |
| **Schedule edit cutoff (48h)** | Enforced in the backend (`shifts.service.ts`). The frontend shows no visible countdown timer. |

---

## Running Locally

### Prerequisites
- Node.js 22
- pnpm
- Redis (for Bull job queues)
- Supabase account (or swap DATABASE_URL for a local Postgres instance)

### Backend
```bash
cd shiftsync-ps
cp .env.example .env          # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET
pnpm install
pnpm db:push                  # apply schema to your database
pnpm db:seed                  # seed with all scenarios
pnpm start:dev                # runs on :8030
```

### Frontend
```bash
cd shiftsync-web
cp .env.local.example .env.local   # or create with NEXT_PUBLIC_API_URL=http://localhost:8030
pnpm install
pnpm dev                           # runs on :3000
```

### Running the endpoint test suite
```bash
cd shiftsync-ps
bash test-endpoints.sh   # requires backend running on :8030
```

---

## Repository Structure

```
Project-ShiftSync-PS/
├── shiftsync-ps/          # NestJS backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/          # JWT login, httpOnly cookie
│   │   │   ├── assignments/   # SELECT FOR UPDATE, constraint check
│   │   │   ├── scheduling/    # ConstraintService — all 11 rules
│   │   │   ├── coverage/      # Swap/drop state machine
│   │   │   ├── realtime/      # WebSocket gateway
│   │   │   ├── analytics/     # Overtime + fairness
│   │   │   └── ...
│   │   └── common/            # Guards, decorators, interceptors
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts            # All 6 evaluation scenarios pre-staged
│   └── test-endpoints.sh      # Comprehensive API smoke test (38 tests)
│
└── shiftsync-web/         # Next.js frontend
    └── src/
        ├── app/               # App Router pages (12 routes)
        ├── components/
        │   ├── schedule/      # WeekGrid, AssignmentModal, ViolationBanner
        │   └── dashboard/     # AdminDashboard, ManagerDashboard, StaffDashboard
        ├── hooks/             # TanStack Query hooks per domain
        └── lib/               # api.ts (axios+JWT), auth.ts, socket.ts
```
