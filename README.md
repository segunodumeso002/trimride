# Barber Booking App - Uber for Barbers

A scalable mobile application platform connecting customers with nearby barbers, featuring Uber-style request flow, live tracking, queue intelligence, and barber growth tools.

## Project Structure

```
Launch-codes/
├── TrimRideCustomer/     # React Native super app (Customer + Barber roles)
│   └── src/
│       ├── context/        # Role/session state
│       ├── screens/
│       │   ├── customer/   # Request and tracking flow
│       │   ├── barber/     # Online mode, hotzones, growth tools
│       │   └── shared/     # Landing and future roadmap
│       └── theme/          # Shared design tokens
└── BarberBackend/         # Node.js API server
```

## Features

### Customer Role (Super App)
- Find nearby barbers with real-time availability
- Request a barber instantly (Uber-like flow)
- Track barber ETA on map
- View queue status and estimated wait times

### Barber Role (Super App)
- Manage online/offline status
- Access demand hotzones to increase bookings
- Use growth engine tools (referrals, off-peak promos)

### Backend API
- PostgreSQL database with AWS RDS support
- Real-time updates via Socket.io
- JWT authentication
- Payment processing with Stripe
- Location-based matching

## Setup Instructions

### Prerequisites
- Node.js (v24.6.0 installed)
- PostgreSQL (installed locally)
- React Native development environment
- Android Studio for Android development (free)

### Database Setup
1. Create PostgreSQL database:
```sql
CREATE DATABASE barber_app;
```

2. Run schema:
```bash
cd BarberBackend
psql -d barber_app -f models/schema.sql
```

### Backend Setup
```bash
cd BarberBackend
npm install
# Update .env with your database credentials
npm run dev
```

### Mobile Apps Setup
```bash
# Super App (Customer + Barber)
cd TrimRideCustomer
npm install
npx react-native run-android  # or run-ios
```

### Windows Dev Stack Quick Start
From the repo root, you can now start or inspect the local development stack without manually opening three separate commands first.

```powershell
npm run dev:health
npm run dev:stack
```

What `dev:stack` does:
- starts the backend on port `3001`
- starts Customer Metro on port `8081`
- starts Barber Metro on port `8082`
- applies `adb reverse` for `3001`, `8081`, and `8082` to `emulator-5554`
- prints a final health table

Defaults:
- Firebase service account path: `C:\Users\SCHOOL\Downloads\trimride-4a485-firebase-adminsdk-fbsvc-74ec90437c.json`
- Emulator id: `emulator-5554`

If either value changes, run the PowerShell script directly and override the parameters:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1 -FirebaseServiceAccountPath "C:\path\to\service-account.json" -EmulatorId "emulator-5554"
```

## Current Status
- Core two-sided booking flow is implemented and verified locally.
- Customer and barber flows support auth, booking requests, accept/decline, live status updates, and push notifications.
- Backend integration tests are passing.
- Windows local startup is automated with `npm run dev:stack` from the repo root.
- Managed Firebase email/password authentication is supported via backend bridge (see `FIREBASE_AUTH_SETUP.md`).

## Next Steps
1. Complete full manual two-device validation on real Android hardware.
2. Harden production secrets, monitoring, and deployment workflow.
3. Replace the current local/demo payment flow with a real staged provider integration.
4. Run a controlled pilot with a small group of local barbers.
5. Use future funding to raise UX, observability, and production infrastructure toward an Uber-level standard.

## Technology Stack
- **Frontend**: React Native
- **Backend**: Node.js, Express
- **Database**: PostgreSQL (AWS RDS ready)
- **Real-time**: Socket.io
- **Payments**: Stripe
- **Authentication**: JWT
