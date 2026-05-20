# Client QA — Analytics & bid accept/reject logic

Answers for pre-merge verification (GA4 custom events + threshold behavior).

---

## 1. Are the GA4 custom events implemented?

**Yes — in the frontend**, via `trackEvent()` in `frontend/src/utils/analytics.ts`, which calls `gtag('event', eventName, params)` when `window.gtag` exists.

| Client event name | GA4 `event` name | Where it fires |
|-------------------|------------------|----------------|
| Bid Submitted | `bid_submitted` | `BidForm.tsx` — after successful `POST /api/bids` |
| Accepted Bid | `accepted_bid` | `BidForm.tsx` — only if API returns `status: ACCEPTED` |
| Rejected Bid | `rejected_bid` | `BidForm.tsx` — only if API returns `status: REJECTED` |
| Signup Completed | `signup_completed` | `SignupPage.tsx` — on signup API success |
| .edu Verification Completed | `edu_verification_completed` | `RedirectPage.tsx` — after Supabase auth redirect, if email ends with `.edu` |

**Important:** Scripts load only **after cookie consent** (`AnalyticsProvider` + `CookieConsentBanner`). If cookies are not accepted, `gtag` is never injected and **no GA4 hits** appear in Network or DebugView.

**Required env (preview/production):** `VITE_GA4_MEASUREMENT_ID` (see `frontend/.env.sample`).

---

## 2. How to verify in Chrome (for screenshots/video)

### A. Cookie consent + env

1. Open the site (preview URL or local with real env vars).
2. Click **Accept** on the cookie banner.
3. Confirm `VITE_GA4_MEASUREMENT_ID` is set on the deployment (Vercel env).

### B. GA4 DebugView (recommended)

1. In GA4: **Admin → DebugView**.
2. Enable debug on the session:
   - Install [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger) extension, **or**
   - Append `?debug_mode=true` to the URL if you add debug config (optional dev enhancement).
3. Perform each action (signup, .edu verify, submit bid).
4. Screenshot events appearing in DebugView with names: `bid_submitted`, `accepted_bid`, etc.

### C. Chrome Network tab

1. Filter: `collect` or `google-analytics.com`.
2. After consent, you should see requests to `https://www.google-analytics.com/g/collect` (GA4).
3. Open a request → **Payload** / query params → look for event name (e.g. `en=bid_submitted` or encoded in `ep.*` params).

**Dev console test:** In local dev, after accepting cookies, run:

```js
window.trackAnalyticsTest?.()
```

This fires `analytics_test` and logs a reminder to check DebugView.

---

## 3. Why `rejected_bid` may not appear in testing

The event is wired, but the **API rarely returns `REJECTED` on bid submit**.

Current backend (`backend/src/controllers/bids.controller.ts` `createBid`):

| Bid amount vs `place.minimumBid` | API result | UI outcome | `rejected_bid` fires? |
|----------------------------------|------------|------------|------------------------|
| `< minimumBid` | **400 error** (bid not created) | Error message, no reject panel | **No** (request fails; only `bid_submitted` not fired) |
| `>= minimumBid` and `autoAcceptAboveMinimum` | **ACCEPTED** | Success / payment flow | No — fires `accepted_bid` |
| `>= minimumBid` and not auto-accept | **PENDING** | “Awaiting review” toast | No |

`REJECTED` is set later by:

- Admin updating a **PENDING** bid (`updateBidStatus`), or
- Payment flow when inventory is exhausted (`payments.controller.ts`).

So the **“NOT ACCEPTED” outcome panel** + `rejected_bid` only show when the create-bid response has `status: REJECTED`. That is **not** the same as “bid below threshold” today (that path is a **400**, not a rejected bid record).

**Copy vs logic:** UI refers to a “hidden threshold”; backend uses the hotel’s **`minimumBid`** field in Postgres (Prisma). There is no separate secret floor above `minimumBid` in code yet.

---

## 4. “I passed with just $1” — real Supabase/DB logic?

**With the real API (preview bypass removed):**

- Acceptance uses **`place.minimumBid`** and **`place.autoAcceptAboveMinimum`** from the database (seed LIVE hotels use minimums like **$28–$95/night** with `autoAcceptAboveMinimum: true`).
- A **$1/night** bid should **fail** with HTTP 400: *“Your bid is very low, try again by increasing it.”* — not accept.
- If acceptance happened at $1, check:
  1. Was testing on **preview bypass / mock API**? (removed from repo; mock accepted when `bidPerNight >= minimumBid` from mock data.)
  2. Was the amount **$1 total** vs **$1/night** (UI bids per night)?
  3. Does that hotel’s `minimumBid` in DB/admin actually equal **1**?
  4. Network tab: confirm `POST /api/bids` response `status` (`ACCEPTED` vs error).

**Not a placeholder accept:** Auto-accept is real DB logic: `bidPerNight >= minimumBid` + `autoAcceptAboveMinimum === true` → `ACCEPTED` on create. It is **not** “always accept.”

**Gap vs product story:** Terms describe a confidential “Floor Base”; implementation is **`minimumBid`** only, and sub-minimum bids are **validation errors**, not instant `REJECTED` bids + `rejected_bid` analytics.

---

## 5. Suggested follow-ups before final merge (optional)

1. **Analytics:** Confirm Vercel preview has `VITE_GA4_MEASUREMENT_ID`; QA with cookies accepted + DebugView screenshots.
2. **Rejected flow:** If instant reject + `rejected_bid` is required, backend should return `REJECTED` (or frontend should fire `rejected_bid` on min-bid 400) — needs a small product/engineering decision.
3. **Threshold:** If “hidden threshold” must differ from `minimumBid`, add server-side comparison and stop exposing `minimumBid` on public place API (currently exposed in `GET /api/places/public/:id`).

---

## 6. Quick test matrix (real backend)

| Action | Expected GA4 event |
|--------|-------------------|
| Accept cookies + load page | `page_view` |
| Complete signup form | `signup_completed` |
| Complete Supabase email verify (`.edu` email) | `edu_verification_completed` |
| Submit bid (any success response) | `bid_submitted` (+ `status` param) |
| Submit bid ≥ `minimumBid` on auto-accept hotel | `accepted_bid` |
| Submit bid & get `REJECTED` in JSON (admin/inventory path) | `rejected_bid` |
| Submit bid &lt; `minimumBid` | API error only — **no** `rejected_bid` today |
