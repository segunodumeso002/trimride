# TrimRide Release Readiness Checklist

Last Updated: 2026-05-25

## Automated Quality Gates
- [PASS] Backend integration tests: 40/40 passing
- [PASS] Frontend tests: 3/3 passing
- [PASS] Frontend lint
- [PASS] Backend syntax checks (`server`, `middleware`, `routes`, `socketService`)

## Backend Critical Workflows
- [PASS] Auth lifecycle (`register`, `login`, `me`) including edge cases
- [PASS] Customer booking lifecycle (`book`, `my-booking`, `my-bookings`)
- [PASS] Barber booking lifecycle (`respond`, `location` events)
- [PASS] Barber dispatch + availability (`dispatch`, `status`)
- [PASS] Payments processing route validation + DB failure handling
- [PENDING] Payment flow hardening before public launch (auth, amount authority, provider confirmation, idempotency)

## Mobile App Readiness
- [PASS] Role-based navigation tests (signed-out, customer, barber)
- [PASS] Centralized runtime endpoint configuration (`development`, `staging`, `production`)
- [PASS] Android Google Maps key externalized via Gradle placeholder
- [PASS] Root Windows dev stack startup automation (`npm run dev:stack`)

## Manual Verification (Pre-Release)
- [PASS] Local live API rehearsal completed (see `LIVE_REHEARSAL_REPORT.md`)
- [PASS] Real-device/manual runbook prepared (see `REAL_DEVICE_RELEASE_TEST_SCRIPT.md`)
- [PENDING] Full two-sided live flow on devices/emulators
  - customer request -> barber receive -> accept/decline -> customer status update
  - live location updates visible in customer tracking screen
- [PENDING] Payment flow tested against real/staging provider setup
- [PENDING] Current payment route replaced or hardened from demo-grade stub to production-safe flow
- [PASS] Android release build (`assembleRelease`) smoke test
- [PENDING] iOS release/archive smoke test (if iOS launch is in scope)
- [PENDING] Real-network test (not localhost/emulator loopback)

## Security/Operations Checks
- [PASS] Hardcoded Android Maps key removed from manifest
- [PASS] Backend endpoints centralized for environment control in mobile app
- [PENDING] Confirm production secrets are injected via secure CI/CD (no local `.env` leakage)
- [PENDING] Add request/exception observability for production monitoring

## Funding-Aware Priorities
- [DO NOW] Finish low-cost manual validation on real devices and real networks.
- [DO NOW] Keep documentation, startup workflow, and regression checks current.
- [LATER WITH FUNDING] Production-grade monitoring, paid notification/infra services, polished UX upgrades, and full payment-provider hardening.

## Go/No-Go Signal
Current status: CONDITIONAL GO

Condition to move to production candidate:
1. Complete all manual verification items.
2. Confirm production secrets and monitoring are configured.
3. Execute one final full regression pass on release branch.
