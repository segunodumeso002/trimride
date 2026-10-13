# Live API Rehearsal Report

Date: 2026-10-06T13:54:38.932Z
Backend Base URL: http://localhost:3001/api
Duration: 2s

## Overall Result
- Status: PASS
- Passed: 13/13

## Rehearsal Context
- Barber Profile ID: 39
- Barber User ID: 55
- Booking ID: 98
- Customer Email: rehearsal.customer.1791294877094@trimride.app

## Step Results
- [PASS] Environment readiness: JWT_SECRET found
- [PASS] Backend availability: Health check OK — DB: connected
- [PASS] Dispatch returns available barber: Found barber profile 39
- [PASS] Customer registration: Temporary customer account created
- [PASS] Customer token + /auth/me: Authenticated customer profile resolved
- [PASS] Barber token generation: Generated token for barber user 55
- [PASS] Customer booking request: Booking created with id 98
- [PASS] Barber incoming requests visibility: Booking visible to barber
- [PASS] Barber accepts booking: Booking transitioned to confirmed
- [PASS] Customer active booking fetch: Active booking id 98 resolved
- [PASS] Barber location update API: Location update accepted
- [PASS] Payment processing API: Payment persisted and booking marked paid
- [PASS] Customer booking history includes booking: Booking 98 found in history

## Notes
- This rehearsal validates live API behavior against a running local backend and database.
- Mobile UI/device interaction still requires separate manual device-level verification.