import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../config/routes.config";
import { useAppSelector } from "../../../store/hooks";
import { cn } from "../ui/utils";

interface DeadlineHeaderProps {
  className?: string;
}

export function DeadlineHeader({ className }: DeadlineHeaderProps) {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-gold/20 bg-bg",
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4 md:px-8">
        <Link to={ROUTES.HOME} className="flex flex-col gap-0.5 shrink-0">
          <span className="font-serif text-xl md:text-2xl tracking-[0.2em] text-gold leading-none">
            DEADLINE
          </span>
          <p className="text-xs text-muted tracking-wide">
            LIFE&apos;S SHORT. TRAVEL NOW.
          </p>
        </Link>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-gold hover:text-gold-light transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <div className="flex h-9 min-w-9 items-center justify-center rounded-full border border-gold px-2 text-xs font-medium text-gold">
            {user?.name?.split(" ")[0] ?? "You"}
          </div>
        </div>
      </div>
    </header>
  );
}
