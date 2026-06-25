# Demo Rehearsal Evidence - 2026-05-25

## Scope
This evidence log combines:
- automated end-to-end API rehearsal
- runtime health checks
- emulator device-level app launch verification

## Environment Snapshot
- Backend health: PASS
- Metro customer (8081): PASS
- Metro barber (8082): PASS
- Database health: connected

## Test Evidence Files
- Rehearsal output report: [LIVE_REHEARSAL_REPORT.md](../../LIVE_REHEARSAL_REPORT.md)
- Customer app screenshot: [evidence_customer_current.png](evidence_customer_current.png)
- Barber app screenshot: [evidence_barber_current.png](evidence_barber_current.png)

## Pass/Fail Summary
| Test Case | Status | Evidence |
|---|---|---|
| Backend health endpoint | PASS | `npm run dev:health` + API `/health` |
| Customer Metro running (8081) | PASS | `packager-status:running` |
| Barber Metro running (8082) | PASS | `packager-status:running` |
| Customer app launches | PASS | `mCurrentFocus=com.barbercustomerapp/.MainActivity` + screenshot |
| Barber app launches | PASS | `mCurrentFocus=com.trimridebarber/.MainActivity` + screenshot |
| Customer auth flow (API) | PASS | `live_rehearsal.js` step pass |
| Barber auth flow (API token path) | PASS | `live_rehearsal.js` step pass |
| Customer creates booking | PASS | Booking id 66 created in rehearsal |
| Barber sees incoming request | PASS | Rehearsal request visibility pass |
| Barber accepts booking | PASS | Rehearsal accept step pass |
| Customer sees active booking | PASS | Rehearsal active booking step pass |
| Barber sends location update | PASS | Rehearsal location step pass |
| Payment route (demo stub) | PASS (stub) | Rehearsal payment step pass |
| Customer booking history update | PASS | Rehearsal history step pass |
| Manual in-app accept/decline flow on devices | PENDING | Runbook execution still required |
| Real-network (non-localhost) full pass | PENDING | Must run before investor meetings |
| Production-grade payment confirmation flow | PENDING | Hardening phase not complete |

## Notes
- This evidence is strong for MVP functionality and live demo readiness.
- Do not position payments as production-grade card processing yet.
- Before investor meetings, run one final quick rehearsal and refresh screenshots the same day.
