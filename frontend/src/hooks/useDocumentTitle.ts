import { useEffect } from "react";
import { matchPath, useLocation } from "react-router-dom";
import { ROUTES } from "../config/routes.config";

const SITE_NAME = "Death is a Deadline";

const ROUTE_TITLES: { path: string; title: string }[] = [
  { path: ROUTES.HOME, title: "Marketplace" },
  { path: ROUTES.LOGIN, title: "Sign In" },
  { path: ROUTES.SIGNUP, title: "Create Account" },
  { path: ROUTES.FORGOT_PASSWORD, title: "Reset Password" },
  { path: ROUTES.RESET_PASSWORD, title: "Set New Password" },
  { path: ROUTES.PUBLIC_PLACE_DETAIL, title: "Listing" },
  { path: ROUTES.STUDENT_MY_BIDS, title: "My Bids" },
  { path: ROUTES.STUDENT_CHECKOUT, title: "Checkout" },
  { path: ROUTES.TERMS, title: "Terms of Use" },
  { path: ROUTES.PRIVACY, title: "Privacy Policy" },
  { path: ROUTES.ACCESSIBILITY, title: "Accessibility Statement" },
  { path: ROUTES.CONTACT, title: "Contact Us" },
];

function titleForPath(pathname: string): string {
  for (const { path, title } of ROUTE_TITLES) {
    if (matchPath({ path, end: true }, pathname)) return title;
  }
  return SITE_NAME;
}

export function useDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = titleForPath(pathname);
    document.title =
      page === SITE_NAME ? SITE_NAME : `${page} | ${SITE_NAME}`;
  }, [pathname]);
}
