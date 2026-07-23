/** Full legal text — hardcoded from client copy. Do not parse at runtime. */
import { LegalH2, LegalP, LegalUl } from "./LegalTypography";
import { ROUTES } from "../../../config/routes.config";
import { Link } from "react-router-dom";

export function AccessibilityStatementContent() {
  return (
    <>
      <p className="text-muted pb-6 border-b border-line/50">
        Last updated: July 2026
      </p>

      <LegalP>
        Deadline Travel is committed to providing a website experience that is
        accessible and usable for all users, including individuals with
        disabilities.
      </LegalP>

      <LegalP>
        We are actively working toward conformance with the Web Content
        Accessibility Guidelines (WCAG) 2.1 Level AA. This is an ongoing effort
        — we have not completed a full-site third-party audit or certification.
        The improvements below reflect practical launch diligence on our core
        booking paths.
      </LegalP>

      <LegalH2>Accessibility features</LegalH2>
      <LegalP>
        As of July 2026, accessibility work on the platform includes:
      </LegalP>
      <LegalUl
        items={[
          "Skip-to-content link on keyboard focus for public pages",
          "Keyboard-accessible navigation on marketplace search, listing detail, bid form, auth, and checkout",
          "Visible focus indicators on buttons and form controls",
          "Semantic form labels with aria-invalid and error announcements on login, signup, contact, and bid flows",
          "Accessible modals (lock-in confirmation, how-it-works, photo gallery) with titles and keyboard support",
          "Saved payment method selection exposed as a radio group for screen readers",
          "Reduced-motion support and pause control on listing photo carousels",
          "Per-page document titles for clearer screen-reader navigation",
          "Mobile-responsive layouts on core student-facing flows",
        ]}
      />

      <LegalP>
        Some third-party content (Stripe payment fields, Mapbox maps, Turnstile
        security widgets) is provided by vendors and may not be fully under our
        control. We choose accessible integrations where possible and monitor
        vendor updates.
      </LegalP>

      <LegalP>
        Admin and hotel operator portals have not yet received the same
        accessibility pass as the public booking flow. A broader site audit is
        planned as the platform scales.
      </LegalP>

      <LegalH2>Known limitations</LegalH2>
      <LegalUl
        items={[
          "Map-based marketplace browsing may be difficult for some assistive technology users — list views are available as an alternative",
          "Stripe-hosted card inputs follow Stripe's accessibility implementation",
          "Not every page on the site has been manually tested with screen readers",
        ]}
      />

      <LegalH2>Contact us</LegalH2>
      <LegalP>
        If you experience difficulty accessing any part of the website,
        encounter an accessibility barrier, or have suggestions for
        improvement, please contact us:
      </LegalP>
      <LegalP>
        Email:{" "}
        <a
          href="mailto:hotels@deadlinetravel.com"
          className="text-gold hover:text-gold-light underline"
        >
          hotels@deadlinetravel.com
        </a>
      </LegalP>
      <LegalP>
        Please include the page URL, a brief description of the issue, and your
        browser or assistive technology if known. We aim to respond within 5
        business days and will make reasonable efforts to address concerns and
        provide assistance where possible.
      </LegalP>
      <LegalP>
        You may also use our{" "}
        <Link to={ROUTES.CONTACT} className="text-gold hover:text-gold-light underline">
          contact form
        </Link>{" "}
        and select a general inquiry.
      </LegalP>
    </>
  );
}
