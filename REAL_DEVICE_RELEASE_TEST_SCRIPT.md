# TrimRide Real-Device Release Test Script

Last Updated: 2026-05-25

## Purpose
This is the manual release test script for the highest-risk production-like flow:

1. Customer signs in
2. Customer requests a barber
3. Barber receives the request
4. Barber accepts or declines
5. Customer sees live status updates
6. Barber sends route/location updates
7. Push notifications and session behavior remain stable

Use this before any public demo, pilot, or release candidate build.

## Recommended Test Setup
- Device A: Customer app
- Device B: Barber app
- Preferred: 2 real Android devices on the same real network as the backend
- Acceptable fallback: 1 real Android device + 1 emulator

## Required Environment
- Backend running and reachable
- Customer app build installed
- Barber app build installed
- Valid Google Maps and Firebase setup already in place
- PostgreSQL running

## Fast Local Startup
From the repo root:

```powershell
npm run dev:stack
```

Verify:
- Backend on `3001`
- Customer Metro on `8081`
- Barber Metro on `8082`

## Test Accounts
Use these currently verified accounts:

### Customer
- Email: `customer@test.com`
- Password: `password123`

### Barber
- Email: `barber.resume.test@trimride.app`
- Password: `password123`

## Pre-Test Reset
Before each full run:
1. Start fresh backend + Metro.
2. Make sure both apps are on the landing/login screen.
3. Confirm barber account is signed out, then sign back in.
4. Confirm customer account is signed out, then sign back in.
5. Confirm barber app has notifications enabled on the device.
6. Confirm device location is enabled for any live tracking checks.

## Test Case 1: Customer Login
### Steps
1. Open the customer app.
2. Sign in with `customer@test.com` / `password123`.
3. Wait for the customer home screen to load.

### Expected Result
- Login succeeds without error.
- Customer home/dashboard loads.
- No crash, red screen, or auth loop.

### Fail If
- Login fails with valid credentials.
- App hangs on loading state.
- Session is created but home screen does not load.

## Test Case 2: Barber Login
### Steps
1. Open the barber app.
2. Sign in with `barber.resume.test@trimride.app` / `password123`.
3. Wait for `Barber Command` screen to load.

### Expected Result
- Login succeeds.
- `Barber Command` screen is visible.
- Online/offline pill is visible.
- Incoming Requests section is visible.

### Fail If
- Login fails.
- App crashes or returns to landing.
- Barber command screen does not render.

## Test Case 3: Barber Goes Online
### Steps
1. On barber app, tap the ONLINE/OFFLINE pill if needed.
2. Set barber to `ONLINE`.

### Expected Result
- UI reflects `ONLINE`.
- No error banner or stuck toggle.

### Optional DB/API Verification
- Confirm `POST /barbers/status` is accepted.

## Test Case 4: Customer Requests Barber
### Steps
1. On customer app, find/select a barber.
2. Open request flow.
3. Confirm `Request {barber name}` screen appears.
4. Tap `Request Now`.

### Expected Result
- Booking request is created.
- Customer navigates to `TrackBarber` screen.
- Tracking screen shows:
  - barber name
  - service
  - ETA
  - queue data
  - booking status badge

### Fail If
- Request button errors.
- Navigation to tracking screen fails.
- Booking status context is missing.

## Test Case 5: Barber Receives Incoming Request
### Steps
1. Keep barber app open on `Barber Command`.
2. Wait for request refresh or tap `Refresh`.

### Expected Result
- New request appears in `Incoming Requests`.
- Request card shows customer name, service, and queue info.
- If push is enabled and app is backgrounded/foregrounded appropriately, notification delivery should also occur.

### Fail If
- Request never appears.
- Barber must restart app to see request.

## Test Case 6A: Barber Accepts Booking
### Steps
1. On barber app, tap `Accept` for the request.

### Expected Result
- Request is accepted successfully.
- Customer status changes from `PENDING` to `CONFIRMED`.
- No duplicate request cards remain.
- Initial barber location is sent.

### Fail If
- Accept button errors.
- Customer does not receive status update.
- Booking remains pending on customer side.

## Test Case 6B: Barber Declines Booking
Run this as a separate pass after the accept flow.

### Steps
1. Create a new customer request.
2. On barber app, tap `Decline`.

### Expected Result
- Customer sees status move to `CANCELLED`.
- Declined request disappears from active workflow.

### Fail If
- Customer remains pending indefinitely.
- Declined request remains active.

## Test Case 7: Live Tracking And Route Simulation
### Steps
1. After accepting, keep the customer app on `TrackBarber`.
2. On barber app, tap `Simulate Route`.

### Expected Result
- Customer map marker moves through multiple points.
- Customer screen remains stable throughout the update sequence.
- Booking status remains correct.

### Fail If
- Marker never moves.
- Customer app crashes or stops updating.
- Simulation hangs permanently.

## Test Case 8: Push Notification Sanity
### Steps
1. Background the barber app.
2. Create a new customer request.
3. Bring the barber app foreground/back as needed and observe notification behavior.

### Expected Result
- Barber receives a request notification when applicable.
- After login/session restore, push token remains usable.

### Fail If
- No notification is received and no in-app request appears.
- Notification arrives but tapping it breaks app flow.

## Test Case 9: Session Restore
### Steps
1. Sign in on both customer and barber apps.
2. Close and reopen the apps.
3. Recheck home/dashboard state.

### Expected Result
- Session restores cleanly if token is valid.
- Invalid session should sign out safely without app crash.

### Fail If
- App loops on restore.
- Stale session causes blank screen or crash.

## Test Case 10: Real-Network Pass
Run this only when backend is reachable over a real LAN or deployed environment.

### Steps
1. Put both devices on the target network.
2. Point app runtime config to that reachable backend.
3. Repeat Test Cases 1 through 8.

### Expected Result
- Flow works without emulator-only loopback assumptions.

## Evidence To Capture
For each full run, capture:
- date/time
- build/app version if known
- devices used
- network used
- screenshots of:
  - customer tracking screen
  - barber command inbox
  - confirmed status
  - live route update
- any backend logs for failed cases

## Pass/Fail Summary Sheet
Use this table during execution:

| Test Case | Result | Notes |
|---|---|---|
| Customer login | PASS / FAIL | |
| Barber login | PASS / FAIL | |
| Barber online toggle | PASS / FAIL | |
| Customer request flow | PASS / FAIL | |
| Barber receives request | PASS / FAIL | |
| Barber accept flow | PASS / FAIL | |
| Barber decline flow | PASS / FAIL | |
| Live route simulation | PASS / FAIL | |
| Push notification sanity | PASS / FAIL | |
| Session restore | PASS / FAIL | |
| Real-network pass | PASS / FAIL | |

## Release Gate
Do not call the mobile flow release-ready until all of these are true:
- Accept flow passes
- Decline flow passes
- Customer tracking updates correctly
- Barber request visibility is reliable
- At least one real push delivery is confirmed
- No crash or broken session restore occurs during the run