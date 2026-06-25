# Testing Protocol (Wave-by-Wave)

This is the required test routine after each implementation wave.

## 1) Mandatory Re-check Before New Code

Run these before adding new features:

```bash
npm --prefix BarberCustomerApp run lint
node --check BarberBackend/server.js
node --check BarberBackend/routes/auth.js
node --check BarberBackend/routes/barbers.js
node --check BarberBackend/routes/customers.js
node --check BarberBackend/routes/bookings.js
```

## 2) Mandatory Re-check After New Code

Run these after every wave:

```bash
npm --prefix BarberCustomerApp run lint
npm --prefix BarberCustomerApp test -- --watch=false
node --check BarberBackend/server.js
node --check BarberBackend/middleware/auth.js
node --check BarberBackend/routes/auth.js
node --check BarberBackend/routes/barbers.js
node --check BarberBackend/routes/customers.js
node --check BarberBackend/routes/bookings.js
node --check BarberBackend/services/socketService.js
```

## 3) Manual Integration Test (Android + API)

### Start backend

```bash
cd BarberBackend
npm run dev
```

### Start mobile bundler

```bash
cd BarberCustomerApp
npm start
```

### Run Android app

```bash
cd BarberCustomerApp
npm run android
```

### Validate user flow

1. Open app landing screen.
2. Tap Continue as Customer or Continue as Barber.
3. Register or sign in.
4. Confirm you are redirected into role dashboard.
5. For customer: open request flow and submit booking.
6. Confirm request reaches backend without auth errors.

## 5) Wave 3 Live Flow Test (Socket + Dispatch)

1. Sign in as customer and sign in as barber on two emulator instances (or one emulator + one physical Android).
2. On customer side:
	- Choose a service filter (`fade`, `beard`, `braids`).
	- Confirm dispatch list refreshes and barbers load.
	- Create a request.
3. On barber side:
	- Confirm incoming request appears in the Barber Command inbox.
	- Tap `Accept`.
4. Back on customer side:
	- Confirm booking status updates from `pending` to `confirmed` in tracking screen.
	- Confirm marker/location updates when barber sends location updates.
5. Repeat with `Decline` and confirm customer receives `cancelled` status.

## 6) Wave 4 Smart Dispatch + Notification Test

1. Sign in as customer and create multiple bookings with the same barber, then complete at least one booking.
2. On next customer search, verify dispatch ranking favors repeat barber affinity.
3. During peak hours, verify queue-heavy barbers rank lower compared to off-peak.
4. Create new booking request and verify in-app notification banner appears for barber side.
5. Accept booking on barber side and verify customer receives status notification banner.
6. Tap `Simulate Route` in barber dashboard and verify customer tracking marker updates through multiple points.

## 4) If a Test Fails

1. Stop feature work.
2. Fix failing test/lint/syntax issue.
3. Re-run full protocol.
4. Continue only when all checks pass.
