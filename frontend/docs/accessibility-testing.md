# Accessibility testing checklist

Practical manual QA for core booking paths. This is **not** a legal WCAG certification — use it before launch and after major UI changes.

## Tools (optional)

- **Keyboard only** — no mouse; Tab, Shift+Tab, Enter, Space, Escape
- **VoiceOver** (macOS: Cmd+F5) or **NVDA** (Windows)
- **Chrome DevTools → Lighthouse → Accessibility** on: `/`, `/login`, listing detail, `/accessibility`
- **axe DevTools** browser extension (free tier) on the same pages

## Critical paths

### 1. Skip link & landmarks

- [ ] Tab from page load: "Skip to main content" appears and focuses
- [ ] Activating skip link moves focus to `#main-content`
- [ ] Home, listing, auth, checkout, and legal pages have a `<main id="main-content">` landmark

### 2. Marketplace search (`/`)

- [ ] Location field has a visible or screen-reader label
- [ ] Date picker opens with keyboard; selected date is announced
- [ ] Search button has an accessible name
- [ ] All header links reachable by keyboard

### 3. Listing & bid flow

- [ ] Listing hero carousel: prev/next work; pause control stops autoplay (when motion allowed)
- [ ] Photo gallery opens; Escape closes; arrow keys navigate; focus returns sensibly
- [ ] Check-in / check-out date pickers: labels, expanded state, keyboard use
- [ ] Bid amount field labeled; validation errors announced (`role="alert"`)
- [ ] Saved cards behave as a radio group (`aria-checked`)
- [ ] Terms / hotel-fee checkboxes toggled via label click and keyboard
- [ ] Lock-in modal: has title; timer updates politely; confirm disabled until timer ends
- [ ] Payment errors visible and announced

### 4. Auth (`/login`, `/signup`, `/forgot-password`)

- [ ] All fields labeled; errors linked via `aria-describedby`
- [ ] Signup file upload reachable by keyboard (label + hidden input)
- [ ] Submit errors announced

### 5. Checkout

- [ ] Payment errors use `role="alert"`
- [ ] Pay button disabled state clear when Stripe not ready

### 6. Accessibility statement (`/accessibility`)

- [ ] Contact email link works
- [ ] Content accurately describes implemented features (update when scope changes)

## Regression triggers

Re-run this checklist when changing:

- Bid form or payment UI
- Modals / dialogs
- Header / navigation
- Form validation patterns

## Reporting issues

Users can report barriers to **deadline@podshare.com** or via the Contact page. Log internal fixes with date and page affected.
