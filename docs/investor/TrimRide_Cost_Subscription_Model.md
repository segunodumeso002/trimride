# TrimRide Cost and Subscription Model (Planning Draft)

Last Updated: 2026-05-25
Currency: USD (estimates)

## One-Time Costs
- Google Play Developer account: $25 one-time.
- Apple Developer Program: $99/year (if iOS distribution is needed).
- Domain name: $10-$20/year.

## Monthly Core Stack (Lean Pilot)
- Backend hosting (single small instance): $20-$60/month.
- Managed PostgreSQL: $25-$100/month.
- Error monitoring (Sentry or similar): $0-$29/month to start.
- Uptime/health monitoring: $0-$20/month.
- Email notifications/provider (basic): $0-$15/month.
- Object/file storage (if needed): $0-$20/month.
Estimated lean monthly total: $45-$244/month.

## Monthly Growth Stack (Post-Pilot)
- Backend hosting (scaled): $100-$400/month.
- Managed PostgreSQL (higher tier): $100-$500/month.
- Monitoring/logging/APM: $50-$300/month.
- Analytics and product tools: $0-$200/month.
- Messaging/notification add-ons: $20-$200/month.
Estimated growth monthly total: $270-$1,600/month.

## Variable Transaction Costs
- Stripe processing (typical US card baseline): ~2.9% + $0.30 per successful transaction.
- SMS/OTP (if enabled via Twilio-like provider): usage-based.
- Maps usage (Google Maps API): pay-as-you-go after free tier/credit consumption.

## Recommended Purchases First (Order)
1. Reliable backend + managed PostgreSQL.
2. Error monitoring and uptime checks.
3. Domain and basic ops tooling.
4. Payment provider hardening spend.
5. Analytics and growth tooling after pilot retention data.

## Suggested Funding Targets
## Survival Pilot (3-4 months)
- Budget target: $5,000-$15,000.
- Focus: hardening, pilot ops, demo reliability.

## Launch Pilot (6-9 months)
- Budget target: $25,000-$75,000.
- Focus: payment hardening, city pilot, reliability stack, customer acquisition tests.

## Seed Expansion (12 months)
- Budget target: $100,000-$350,000.
- Focus: team buildout, multi-zone growth, deeper platform and operations.

## Notes For Investor Conversations
- Present cost ranges as phased and milestone-based.
- Emphasize that FCM push itself is low-cost/free, while reliability and growth tooling scale with usage.
- Tie each spend bucket to measurable outcomes (activation, completion, repeat rate, retention).
