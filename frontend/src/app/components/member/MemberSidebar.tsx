import { Link, useLocation } from "react-router-dom";
import {
  Calendar,
  Heart,
  Bookmark,
  UserRound,
  CreditCard,
  UserPlus,
  Settings,
  HelpCircle,
} from "lucide-react";
import { ROUTES } from "../../../config/routes.config";
import { cn } from "../ui/utils";

const NAV_ITEMS = [
  { title: "Trips", path: ROUTES.STUDENT_MY_BIDS, icon: Calendar },
  { title: "Saved Hotels", path: ROUTES.STUDENT_SAVED_HOTELS, icon: Heart },
  { title: "Wishlist", path: ROUTES.STUDENT_WISHLIST, icon: Bookmark },
  { title: "Profile", path: ROUTES.STUDENT_PROFILE, icon: UserRound },
  { title: "Payment Methods", path: ROUTES.STUDENT_PAYMENT_METHODS, icon: CreditCard },
  { title: "Invite Friends", path: ROUTES.STUDENT_INVITE_FRIENDS, icon: UserPlus },
  { title: "Settings", path: ROUTES.STUDENT_SETTINGS, icon: Settings },
  { title: "Help & Support", path: ROUTES.CONTACT, icon: HelpCircle },
];

export function MemberSidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col justify-between border-r border-line px-3 py-6">
      <nav className="space-y-1" aria-label="Account">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-gold/15 text-gold font-medium"
                  : "text-muted hover:bg-glass hover:text-fg",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="mx-1 mt-8 rounded-xl border border-gold/30 bg-glass-2 p-4">
        <p className="text-xs font-semibold tracking-wide text-gold">
          PRIVATE BIDS. EXCLUSIVE HOTELS. BETTER TRAVEL.
        </p>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          We partner with independent hotels to offer private rates you won&apos;t find
          anywhere else. Thank you for being part of the movement.
        </p>
        <p className="mt-3 font-serif text-sm italic text-gold">Thank you!</p>
      </div>
    </aside>
  );
}
