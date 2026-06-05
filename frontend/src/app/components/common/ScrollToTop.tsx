import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Reset scroll position on route change (e.g. bid flow → sign up). */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
