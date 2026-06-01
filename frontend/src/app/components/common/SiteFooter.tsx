import { Link } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";

const footerLinks = [
  { to: ROUTES.CONTACT, label: "Contact Us" },
  { to: ROUTES.TERMS, label: "Terms of Use" },
  { to: ROUTES.PRIVACY, label: "Privacy Policy" },
  { to: ROUTES.ACCESSIBILITY, label: "Accessibility Statement" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line/60 bg-bg">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-8 text-center">
        <nav
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm"
          aria-label="Footer"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-muted hover:text-gold transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted">
          © {year} Death is a Deadline. All rights reserved to <span className="font-bold text-white">DEADLINE</span>.
        </p>
      </div>
    </footer>
  );
}
