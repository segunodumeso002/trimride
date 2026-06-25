# TrimRide Next Execution Plan (Investor-Demo Safe)

Last Updated: 2026-05-25

## Current Verified State
- Backend tests: 40/40 passing.
- Customer app tests: 3/3 passing.
- Customer app lint: passing.
- Barber app lint: passing.
- Runtime health: backend on 3001, customer Metro on 8081, barber Metro on 8082.
- Critical app-key mismatch issue fixed for TrimRideBarber by pinning Android dev server port to 8082.

## Goal For The Next 7-10 Days
Deliver an investor-safe demo flow with low operational risk and clear proof points.

## Priority 1: Demo Reliability Lock
1. Run the full two-sided flow from REAL_DEVICE_RELEASE_TEST_SCRIPT.
2. Capture evidence for each step: screenshots, timestamps, pass/fail notes.
3. Repeat the full flow at least 3 times in separate sessions.
4. Treat any intermittent failure as blocker before investor demos.

## Priority 2: Payment Risk Containment
1. Keep current payment route labeled as demo/stub in all investor-facing language.
2. For live demos, present payments as cash/manual settlement or test mode.
3. Do not claim production-grade card payments until provider-confirmed flow is complete.

## Priority 3: Operations Readiness
1. Finalize a one-command startup and health ritual before every demo.
2. Keep a backup demo path: recorded flow + fallback script if network fails.
3. Prepare one incident checklist: what to do if login/Metro/backend fails mid-demo.

## Priority 4: Investor Narrative Consistency
Use this structure in every meeting:
- What works today (demonstrable).
- What is intentionally staged (payment hardening, monitoring depth).
- What funding unlocks immediately.

## Demo-Day Checklist (Must Pass)
- [ ] Backend health endpoint returns ok.
- [ ] Metro 8081 and 8082 both running.
- [ ] Customer login success.
- [ ] Barber login success.
- [ ] Customer request visible on barber app.
- [ ] Barber accept updates customer state.
- [ ] Route simulation updates customer tracking.
- [ ] Screenshots captured as evidence.

## No-Loophole Rules
- Do not demo unverified features.
- Do not improvise credentials or environment values during meetings.
- Do not claim production payment readiness before hardening is complete.
- Always test 30-60 minutes before investor meetings.
