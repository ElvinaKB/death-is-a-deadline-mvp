import { Outlet } from "react-router-dom";
import { SiteFooter } from "../components/common/SiteFooter";

/** Wraps public student-facing pages with sitewide footer. */
export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Outlet />
      <SiteFooter />
    </div>
  );
}
