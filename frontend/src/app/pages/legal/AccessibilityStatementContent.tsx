/** Full legal text — hardcoded from client copy. Do not parse at runtime. */
import { LegalH2, LegalP, LegalUl } from "./LegalTypography";

export function AccessibilityStatementContent() {
  return (
    <>
      <p className="text-muted pb-6 border-b border-line/50">
        Last updated: May 2026
      </p>

      <LegalP>
        Deadline Travel is committed to providing a website experience that is
        accessible and usable for all users, including individuals with
        disabilities.
      </LegalP>

      <LegalP>
        We are actively working toward conformance with the Web Content
        Accessibility Guidelines (WCAG) 2.1 Level AA and strive to follow
        generally recognized accessibility best practices.
      </LegalP>

      <LegalH2>Accessibility features</LegalH2>
      <LegalP>
        Accessibility features currently prioritized on the platform include:
      </LegalP>
      <LegalUl
        items={[
          "Keyboard-accessible navigation",
          "Visible focus indicators for forms and buttons",
          "Semantic form labels and accessible input structures",
          "Mobile-responsive layouts",
          "Improved color contrast for important actions and content",
          "Screen-reader friendly page structures where practical",
          "Accessibility review of key booking and bidding flows",
        ]}
      />

      <LegalP>
        We recognize that accessibility is an ongoing process and are
        continuously working to improve the experience for all visitors. Some
        third-party content or integrations may not be fully under our control,
        but we work with vendors to improve accessibility wherever possible.
      </LegalP>

      <LegalH2>Contact us</LegalH2>
      <LegalP>
        If you experience difficulty accessing any part of the website,
        encounter an accessibility barrier, or have suggestions for
        improvement, please contact us:
      </LegalP>
      <LegalP>
        Email:{" "}
        <a
          href="mailto:deadline@podshare.com"
          className="text-gold hover:text-gold-light underline"
        >
          deadline@podshare.com
        </a>
      </LegalP>
      <LegalP>
        We aim to respond to accessibility inquiries within 5 business days and
        will make reasonable efforts to address concerns and provide assistance
        where possible.
      </LegalP>
    </>
  );
}
