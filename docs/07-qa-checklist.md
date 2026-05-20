# QA Checklist — Golden Redesign Branch

Use this before merging `kevin-golden-redesign` → `prod`.

## Bid flow

- [ ] Listing detail: countdown visible in hero and bid panel
- [ ] Steps: Dates → Amount → Review → Payment (authenticated)
- [ ] Unauthenticated: review step redirects to signup with form state saved
- [ ] Terms checkbox required; links open `/terms` and `/privacy`
- [ ] Submit disabled until card complete + terms accepted
- [ ] Accepted bid: charge messaging + success toast
- [ ] Rejected bid: no charge messaging + try again

## Listing page

- [ ] Retail price prominent in hero and bid column
- [ ] Amenities section renders from description
- [ ] Gallery, map, FAQ, related listings use gold styling
- [ ] Mobile: bid panel scrollable; sticky on desktop

## Legal & footer

- [ ] Footer on home and listing pages
- [ ] `/terms`, `/privacy`, `/accessibility` load placeholder copy
- [ ] Cookie banner appears once; dismiss persists

## Analytics (production env vars set)

- [ ] Cookie banner **accepted** (GA4 does not load until consent)
- [ ] `VITE_GA4_MEASUREMENT_ID` set on Vercel preview/production
- [ ] GA4 DebugView: `page_view`, `signup_completed`, `edu_verification_completed`, `bid_submitted`, `accepted_bid`
- [ ] `rejected_bid` only when API returns `REJECTED` on bid create (see `docs/08-client-qa-analytics-and-bids.md`)
- [ ] Clarity session recording
- [ ] Meta Pixel PageView + custom events

## Regression

- [ ] No changes to backend payment APIs
- [ ] Admin/hotel dashboards still load
