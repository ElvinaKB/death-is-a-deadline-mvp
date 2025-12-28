# V1 Requirements – Student Accommodation Bidding Platform

> **Project:** DeathIsADeadline.com  
> **Version:** V1 (Web App)  
> **Delivery Model:** Milestone-based with live demos  
> **Total Timeline:** 1 Month (4 Weeks)

---

## 👥 User Roles

- **Student**
- **Hotel / Property**
- **Admin**

---

# Milestones

## 🔹 Milestone 1: Authentication & Student Verification

**Timeline:** Week 1

### Student Registration & Login

- Student signup & login
- Academic email verification
  - System must detect valid academic domains (`.edu` / accredited institutions)
  - Email confirmation required before student can place bids

### Fallback Verification

- If academic email is not available:
  - Student ID upload (Image / PDF)
  - Lightweight / manual verification via admin

**Deliverable:**

- Fully working authentication flow
- Verified students can access bidding
- Live working demo required

---

## 🔹 Milestone 2: Marketplace + Hotel Rules + Bidding Logic

**Timeline:** Week 2

### Marketplace

- Public marketplace page listing all hotels
- Simple list view (no filters in V1)
- Property detail page with bid option

### Hotel / Property Dashboard

- Admin manually onboards hotels
- Hotel dashboard allows:
  - Set minimum nightly price
  - Manage blackout dates
  - View bids (accepted / rejected)

### Automated Bidding Logic

- If bid ≥ minimum price → auto-accept
- If bid < minimum price → auto-reject
- No counteroffers
- No manual hotel approvals

**Deliverable:**

- Marketplace + bidding system fully functional
- Hotel rules applied correctly
- Live working demo required

---

## 🔹 Milestone 3: Payments + Email Notifications

**Timeline:** Week 3

### Payment Flow

- Stripe pre-authorization triggered only after bid acceptance
- No card hold at bid submission
- Handle payment intent lifecycle

### Email Notifications

- Bid accepted email
- Bid rejected email
- Payment confirmation email

**Deliverable:**

- End-to-end payment flow tested
- Email triggers verified
- Live working demo required

---

## 🔹 Milestone 4: Admin Panel + Deployment

**Timeline:** Week 4

### Admin Panel

- Add / manage hotels
- Review fallback student ID verifications
- View basic platform stats:
  - Total bids
  - Accepted bids
  - Rejected bids
  - Average accepted bid

### Wildcard Subdomain Structure

- Infrastructure support for future subdomains
- Example: `students.hotelname.com`
- Routing setup only (no custom branding in V1)

### Deployment

- Production deployment
- Environment configuration

**Deliverable:**

- Admin panel fully functional
- Application deployed and accessible
- Final live demo required

---

## 🔐 Ownership & Access Requirements

- GitHub repository access from Day 1
- Repository ownership belongs to client
- All code, IP, and deployment owned by client
- Codebase must remain usable if transferred to another developer
