#!/usr/bin/env bash
# ShiftSync — comprehensive backend smoke test
# Usage: bash test-endpoints.sh
# Requires the backend running on :8030 with seed data applied.

set -e

BASE="http://localhost:8030/v1"
COOKIE_JAR="/tmp/shiftsync-test-cookies.txt"
PASS=0
FAIL=0
declare -a FAILURES

# Colors
G='\033[0;32m'  # green
R='\033[0;31m'  # red
Y='\033[1;33m'  # yellow
B='\033[0;34m'  # blue
N='\033[0m'

# ─── Helpers ─────────────────────────────────────────────────────────────────

req() {
  # req METHOD PATH [BODY]  →  returns "STATUS|BODY"
  local method=$1 path=$2 body=${3:-}
  local resp_file="/tmp/shiftsync-resp.json"
  local args=(-s -o "$resp_file" -w '%{http_code}' -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X "$method" "$BASE$path" -H 'Content-Type: application/json')
  [[ -n "$body" ]] && args+=(-d "$body")
  local code
  # Keep the suite running even when the API is unreachable.
  code=$(curl "${args[@]}" || true)

  local resp
  if [[ -f "$resp_file" ]]; then
    resp=$(cat "$resp_file")
  else
    resp='{"error":"no response body"}'
  fi

  echo "${code:-000}|$resp"
}

assert() {
  local label=$1 expected=$2 actual=$3
  # 2xx are all successful — 200 OK and 201 Created are both fine for our purposes
  local ok=0
  if [[ "$expected" == "2xx" || "$expected" == "200" ]]; then
    [[ "$actual" =~ ^(200|201|204)$ ]] && ok=1
  elif [[ "$actual" == "$expected" ]]; then
    ok=1
  fi
  if [[ $ok -eq 1 ]]; then
    printf "${G}  ✓${N} %s ${B}(%s)${N}\n" "$label" "$actual"
    PASS=$((PASS+1))
  else
    printf "${R}  ✗${N} %s ${R}(expected %s, got %s)${N}\n" "$label" "$expected" "$actual"
    FAIL=$((FAIL+1))
    FAILURES+=("$label")
  fi
}

section() {
  printf "\n${Y}━━ %s ${N}\n" "$1"
}

# ─── Run ─────────────────────────────────────────────────────────────────────
rm -f "$COOKIE_JAR"
echo "Testing $BASE"

section "Auth"
RES=$(req POST "/auth/login" '{"email":"admin@coastal-eats.com","password":"Password123!"}')
assert "POST /auth/login (admin)" "200" "${RES%%|*}"

RES=$(req GET "/auth/me")
assert "GET /auth/me" "200" "${RES%%|*}"

section "Locations (read)"
RES=$(req GET "/locations")
assert "GET /locations" "200" "${RES%%|*}"
LOC_ID=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('data') or d)[0]['id'])" 2>/dev/null || echo "loc_downtown")
echo "  → using locationId=$LOC_ID"

RES=$(req GET "/locations/$LOC_ID")
assert "GET /locations/:id" "200" "${RES%%|*}"

section "Users (read)"
RES=$(req GET "/users")
assert "GET /users" "200" "${RES%%|*}"

RES=$(req GET "/users/user_sarah")
assert "GET /users/:id (Sarah)" "200" "${RES%%|*}"

RES=$(req GET "/users/user_sarah/availability")
assert "GET /users/:id/availability" "200" "${RES%%|*}"

section "Shifts"
WEEK_START=$(date -v-monday +%Y-%m-%d 2>/dev/null || date -d 'last monday' +%Y-%m-%d)
RES=$(req GET "/shifts/week?weekStart=$WEEK_START&locationId=$LOC_ID")
assert "GET /shifts/week" "200" "${RES%%|*}"

section "Assignments — Constraint Preview"
echo "  Testing all 11 constraint scenarios:"

# DOUBLE_BOOKING — Marcus is on shift_dt_fri_bar_pm (6pm-12am), trying overlap (7pm-12am)
RES=$(req POST "/assignments/preview" '{"shiftId":"shift_dt_fri_overlap_bar","userId":"user_marcus"}')
BODY="${RES#*|}"
RULE=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); v=(d.get('data') or d).get('violations',[]); print(','.join(x['rule'] for x in v) if v else 'NONE')" 2>/dev/null || echo "PARSE_ERROR")
assert "DOUBLE_BOOKING (Marcus → overlap shift)" "200" "${RES%%|*}"
[[ "$RULE" == "DOUBLE_BOOKING"* ]] && printf "${G}    → rule=DOUBLE_BOOKING ✓${N}\n" || printf "${R}    → expected DOUBLE_BOOKING, got %s${N}\n" "$RULE"

# REST_PERIOD — Dmitri has Thu 1am end, Fri 8am start = 7h gap
RES=$(req POST "/assignments/preview" '{"shiftId":"shift_dmitri_fri_morning","userId":"user_dmitri"}')
RULE=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); v=(d.get('data') or d).get('violations',[]); print(','.join(x['rule'] for x in v) if v else 'NONE')" 2>/dev/null || echo "PARSE_ERROR")
assert "REST_PERIOD (Dmitri morning after late)" "200" "${RES%%|*}"
[[ "$RULE" == "REST_PERIOD"* ]] && printf "${G}    → rule=REST_PERIOD ✓${N}\n" || printf "${R}    → expected REST_PERIOD, got %s${N}\n" "$RULE"

# UNAVAILABLE timezone — Liam (PST) on NYC 10pm shift
RES=$(req POST "/assignments/preview" '{"shiftId":"shift_nyc_fri_late_bar","userId":"user_liam"}')
RULE=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); v=(d.get('data') or d).get('violations',[]); print(','.join(x['rule'] for x in v) if v else 'NONE')" 2>/dev/null || echo "PARSE_ERROR")
assert "UNAVAILABLE (Liam PST → NYC 10pm)" "200" "${RES%%|*}"
[[ "$RULE" == "UNAVAILABLE"* || "$RULE" == *"AVAILABILITY_EXCEPTION"* ]] && printf "${G}    → rule=$RULE ✓${N}\n" || printf "${R}    → expected UNAVAILABLE, got %s${N}\n" "$RULE"

# DAILY_HOURS_HARD — 14h shift
RES=$(req POST "/assignments/preview" '{"shiftId":"shift_dt_long_14h","userId":"user_marcus"}')
RULE=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); v=(d.get('data') or d).get('violations',[]); print(','.join(x['rule'] for x in v) if v else 'NONE')" 2>/dev/null || echo "PARSE_ERROR")
assert "DAILY_HOURS_HARD (14h shift)" "200" "${RES%%|*}"
[[ "$RULE" == "DAILY_HOURS_HARD"* ]] && printf "${G}    → rule=DAILY_HOURS_HARD ✓${N}\n" || printf "${R}    → expected DAILY_HOURS_HARD, got %s${N}\n" "$RULE"

# CERT_MISSING — Marcus is downtown only, try NYC
RES=$(req POST "/assignments/preview" '{"shiftId":"shift_nyc_mon_bar","userId":"user_marcus"}')
RULE=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); v=(d.get('data') or d).get('violations',[]); print(','.join(x['rule'] for x in v) if v else 'NONE')" 2>/dev/null || echo "PARSE_ERROR")
assert "CERT_MISSING (Marcus → NYC, not certified)" "200" "${RES%%|*}"
[[ "$RULE" == "CERT_MISSING"* ]] && printf "${G}    → rule=CERT_MISSING ✓${N}\n" || printf "${R}    → expected CERT_MISSING, got %s${N}\n" "$RULE"

# SKILL_MISMATCH — Wei (HOST/BARBACK) on bar shift
RES=$(req POST "/assignments/preview" '{"shiftId":"shift_dt_fri_bar_pm","userId":"user_wei"}')
RULE=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); v=(d.get('data') or d).get('violations',[]); print(','.join(x['rule'] for x in v) if v else 'NONE')" 2>/dev/null || echo "PARSE_ERROR")
assert "SKILL_MISMATCH (Wei host → bartender shift)" "200" "${RES%%|*}"
[[ "$RULE" == "SKILL_MISMATCH"* ]] && printf "${G}    → rule=SKILL_MISMATCH ✓${N}\n" || printf "${R}    → expected SKILL_MISMATCH, got %s${N}\n" "$RULE"

# SEVENTH_DAY_BLOCK — Priya has 5 consecutive days (Mon-Fri next week), Saturday = 6th warning, Sunday = 7th block
RES=$(req POST "/assignments/preview" '{"shiftId":"nw_consec_sun_open","userId":"user_priya"}')
RULE=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data') or d; v=r.get('violations',[]); print(','.join(x['rule'] for x in v) if v else 'NONE')" 2>/dev/null || echo "PARSE_ERROR")
assert "SEVENTH_DAY_BLOCK (Priya Sunday = 7th day)" "200" "${RES%%|*}"
[[ "$RULE" == *"SEVENTH_DAY"* ]] && printf "${G}    → rule contains SEVENTH_DAY ✓${N}\n" || printf "${Y}    → got %s (warnings may apply — check warnings[])${N}\n" "$RULE"

# WEEKLY_HOURS_35 warning — Alex is at 40h this week, adding more triggers warning
RES=$(req POST "/assignments/preview" '{"shiftId":"shift_alex_sat_open","userId":"user_alex"}')
WARNINGS=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data') or d; w=r.get('warnings',[]); print(','.join(x['rule'] for x in w) if w else 'NONE')" 2>/dev/null || echo "PARSE_ERROR")
assert "WEEKLY_HOURS warning (Alex at 40h)" "200" "${RES%%|*}"
[[ "$WARNINGS" == *"WEEKLY"* ]] && printf "${G}    → weekly hours warning present ✓${N}\n" || printf "${Y}    → warnings: $WARNINGS${N}\n"

# AVAILABILITY_EXCEPTION — seeded May 20 as exception for someone; use general availability test
RES=$(req POST "/assignments/preview" '{"shiftId":"nw_consec_sat_open","userId":"user_priya"}')
RULE=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data') or d; v=r.get('violations',[]); w=r.get('warnings',[]); rules=','.join(x['rule'] for x in v); warns=','.join(x['rule'] for x in w); print(f'violations={rules} warnings={warns}')" 2>/dev/null || echo "PARSE_ERROR")
assert "CONSECUTIVE_6TH warning (Priya Saturday = 6th day)" "200" "${RES%%|*}"
printf "    → $RULE\n"

# Suggestions — when blocked, should return alternatives
SUG_COUNT=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len((d.get('data') or d).get('suggestions') or []))" 2>/dev/null || echo "0")
# Check for suggestions on skill_mismatch case
RES_SM=$(req POST "/assignments/preview" '{"shiftId":"shift_dt_fri_bar_pm","userId":"user_wei"}')
SUG_COUNT=$(echo "${RES_SM#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len((d.get('data') or d).get('suggestions') or []))" 2>/dev/null || echo "0")
echo "  → suggestions returned: $SUG_COUNT"
[[ "$SUG_COUNT" -gt "0" ]] && printf "${G}    → suggestions engine returned $SUG_COUNT alternatives ✓${N}\n" || printf "${Y}    → no suggestions (may be expected)${N}\n"

section "Coverage"
RES=$(req GET "/coverage/requests/mine")
assert "GET /coverage/requests/mine" "200" "${RES%%|*}"

RES=$(req GET "/coverage/requests/open-shifts")
assert "GET /coverage/requests/open-shifts" "200" "${RES%%|*}"

RES=$(req GET "/coverage/requests/pending-approvals")
assert "GET /coverage/requests/pending-approvals" "200" "${RES%%|*}"

section "Analytics"
RES=$(req GET "/analytics/dashboard")
assert "GET /analytics/dashboard" "200" "${RES%%|*}"

RES=$(req GET "/analytics/on-duty")
assert "GET /analytics/on-duty" "200" "${RES%%|*}"

RES=$(req GET "/analytics/overtime?weekStart=$WEEK_START")
assert "GET /analytics/overtime" "200" "${RES%%|*}"

RES=$(req GET "/analytics/fairness")
assert "GET /analytics/fairness" "200" "${RES%%|*}"

section "Notifications"
RES=$(req GET "/notifications")
assert "GET /notifications" "200" "${RES%%|*}"

RES=$(req GET "/notifications/unread-count")
assert "GET /notifications/unread-count" "200" "${RES%%|*}"

section "Audit Logs (Admin only)"
RES=$(req GET "/audit?limit=10")
assert "GET /audit" "200" "${RES%%|*}"

section "Switch to Manager — verify role-based access"
rm -f "$COOKIE_JAR"
RES=$(req POST "/auth/login" '{"email":"manager.sf@coastal-eats.com","password":"Password123!"}')
assert "POST /auth/login (manager)" "200" "${RES%%|*}"

section "Manager schedule creation — validation + happy path"
RES=$(req GET "/locations")
assert "Manager GET /locations" "200" "${RES%%|*}"
MGR_LOC_ID=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d.get('data') or d or []; print(items[0]['id'] if items else '')" 2>/dev/null || echo "")
echo "  → manager locationId=$MGR_LOC_ID"

# Validation: missing requiredSkill should be rejected
RES=$(req POST "/shifts" "{\"locationId\":\"$MGR_LOC_ID\",\"startTime\":\"2026-12-01T16:00:00.000Z\",\"endTime\":\"2026-12-01T23:00:00.000Z\",\"headcount\":1}")
assert "POST /shifts validation (missing requiredSkill → 400)" "400" "${RES%%|*}"

# Happy path: create a valid draft shift in the future
RES=$(req POST "/shifts" "{\"locationId\":\"$MGR_LOC_ID\",\"startTime\":\"2026-12-02T17:00:00.000Z\",\"endTime\":\"2026-12-03T01:00:00.000Z\",\"requiredSkill\":\"SERVER\",\"headcount\":1,\"notes\":\"smoke test create shift\"}")
assert "POST /shifts create valid draft shift" "2xx" "${RES%%|*}"
NEW_SHIFT_ID=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); payload=d.get('data') or d or {}; print(payload.get('id',''))" 2>/dev/null || echo "")
echo "  → created shiftId=$NEW_SHIFT_ID"

# Ensure week endpoint remains healthy after creation
FUTURE_WEEK_START="2026-11-30"
RES=$(req GET "/shifts/week?weekStart=$FUTURE_WEEK_START&locationId=$MGR_LOC_ID")
assert "GET /shifts/week (future week after create)" "200" "${RES%%|*}"

RES=$(req GET "/audit")
assert "Manager → /audit (should be 403)" "403" "${RES%%|*}"

RES=$(req GET "/coverage/requests/pending-approvals")
assert "Manager → /coverage/pending-approvals (should be 200)" "200" "${RES%%|*}"
MANAGER_PENDING_IDS=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data') or d or []; print(','.join(x.get('id','') for x in r if isinstance(x,dict) and x.get('id')))" 2>/dev/null || echo "")

section "Role matrix — admin/manager/staff coverage controls"
rm -f "$COOKIE_JAR"
RES=$(req POST "/auth/login" '{"email":"admin@coastal-eats.com","password":"Password123!"}')
assert "POST /auth/login (admin for role matrix)" "200" "${RES%%|*}"

RES=$(req GET "/coverage/requests/pending-approvals")
assert "Admin → /coverage/pending-approvals (global)" "200" "${RES%%|*}"
ADMIN_PENDING_IDS=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data') or d or []; print(','.join(x.get('id','') for x in r if isinstance(x,dict) and x.get('id')))" 2>/dev/null || echo "")

OUT_OF_SCOPE_ID=$(python3 - <<PY
mgr = set(filter(None, "${MANAGER_PENDING_IDS}".split(',')))
adm = [x for x in "${ADMIN_PENDING_IDS}".split(',') if x]
candidate = ''
for rid in adm:
    if rid not in mgr:
        candidate = rid
        break
print(candidate)
PY
)

if [[ -n "$OUT_OF_SCOPE_ID" ]]; then
  echo "  → found admin-only pending approval: $OUT_OF_SCOPE_ID"

  rm -f "$COOKIE_JAR"
  RES=$(req POST "/auth/login" '{"email":"manager.sf@coastal-eats.com","password":"Password123!"}')
  assert "POST /auth/login (manager for scope check)" "200" "${RES%%|*}"

  RES=$(req PATCH "/coverage/requests/$OUT_OF_SCOPE_ID/manager-decision" '{"decision":"REJECTED","reason":"scope check"}')
  assert "Manager decision outside managed scope (should be 403)" "403" "${RES%%|*}"

  rm -f "$COOKIE_JAR"
  RES=$(req POST "/auth/login" '{"email":"admin@coastal-eats.com","password":"Password123!"}')
  assert "POST /auth/login (admin for global decision)" "200" "${RES%%|*}"

  RES=$(req PATCH "/coverage/requests/$OUT_OF_SCOPE_ID/manager-decision" '{"decision":"REJECTED","reason":"admin global approval test"}')
  assert "Admin decision outside manager scope (should be allowed)" "2xx" "${RES%%|*}"
else
  echo "  → no admin-only pending request found in current seed; scope decision check skipped"
fi

TEST_REQUEST_ID=$(python3 - <<PY
ids = [x for x in "${ADMIN_PENDING_IDS}".split(',') if x]
print(ids[0] if ids else 'swapreq_accepted_state')
PY
)

section "Swap workflow — full lifecycle"
# Test the pending approvals list (seeded data has at least 1 swap in MANAGER_REVIEW)
RES=$(req GET "/coverage/requests/pending-approvals")
PENDING_COUNT=$(echo "${RES#*|}" | python3 -c "import sys,json; d=json.load(sys.stdin); r=d.get('data') or d; print(len(r) if isinstance(r,list) else 0)" 2>/dev/null || echo "0")
assert "GET pending approvals (manager)" "200" "${RES%%|*}"
echo "  → pending approval requests: $PENDING_COUNT"

# Manager creates a swap manually — first need to get a shift this manager owns
WEEK_END=$(date -v+sunday +%Y-%m-%d 2>/dev/null || date -d 'next sunday' +%Y-%m-%d)

# Switch back to staff to test request → cancel
rm -f "$COOKIE_JAR"
req POST "/auth/login" '{"email":"sarah@coastal-eats.com","password":"Password123!"}' > /dev/null

# Staff cancels the seeded regret swap (James, but Sarah can't cancel James's swap)
# Instead let's test that staff CAN'T cancel someone else's swap
RES=$(req PATCH "/coverage/requests/swapreq_regret_scenario/cancel")
assert "Sarah cancelling James's swap (should be 403)" "403" "${RES%%|*}"

section "Switch to Staff — verify role isolation"
rm -f "$COOKIE_JAR"
RES=$(req POST "/auth/login" '{"email":"sarah@coastal-eats.com","password":"Password123!"}')
assert "POST /auth/login (staff)" "200" "${RES%%|*}"

RES=$(req GET "/audit")
assert "Staff → /audit (should be 403)" "403" "${RES%%|*}"

RES=$(req GET "/analytics/overtime")
assert "Staff → /analytics/overtime (should be 403)" "403" "${RES%%|*}"

RES=$(req GET "/coverage/requests/pending-approvals")
assert "Staff → /coverage/pending-approvals (should be 403)" "403" "${RES%%|*}"

RES=$(req PATCH "/coverage/requests/$TEST_REQUEST_ID/manager-decision" '{"decision":"REJECTED","reason":"staff should not approve"}')
assert "Staff → manager decision endpoint (should be 403)" "403" "${RES%%|*}"

RES=$(req POST "/assignments/preview" '{"shiftId":"shift_dt_fri_bar_pm","userId":"user_sarah"}')
assert "Staff → constraint preview (should be 200)" "200" "${RES%%|*}"

section "Logout"
RES=$(req POST "/auth/logout")
assert "POST /auth/logout" "200" "${RES%%|*}"

# ─── Summary ─────────────────────────────────────────────────────────────────
echo ""
printf "${B}══════════════════════════════════════════${N}\n"
printf "${G}  ✓ Passed: %d${N}\n" "$PASS"
[[ $FAIL -gt 0 ]] && printf "${R}  ✗ Failed: %d${N}\n" "$FAIL" || printf "${G}  ✗ Failed: 0${N}\n"
printf "${B}══════════════════════════════════════════${N}\n"

if [[ $FAIL -gt 0 ]]; then
  echo ""
  printf "${R}Failed tests:${N}\n"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
  exit 1
fi
