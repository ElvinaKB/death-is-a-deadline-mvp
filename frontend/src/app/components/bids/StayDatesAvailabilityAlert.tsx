import { AlertCircle } from "lucide-react";
import {
  buildStayDatesAlertContent,
  StayNightIssue,
} from "../../../utils/stayDateValidation";

interface StayDatesAvailabilityAlertProps {
  issues: StayNightIssue[];
  allowedDaysOfWeek?: number[];
  className?: string;
}

export function StayDatesAvailabilityAlert({
  issues,
  allowedDaysOfWeek,
  className = "",
}: StayDatesAvailabilityAlertProps) {
  if (issues.length === 0) {
    return null;
  }

  const { title, lines } = buildStayDatesAlertContent(
    issues,
    allowedDaysOfWeek,
  );

  return (
    <div
      className={`glass rounded-lg p-3 border border-warning/50 ${className}`.trim()}
      role="alert"
    >
      <div className="flex gap-2">
        <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
        <div className="text-sm space-y-1">
          <p className="text-warning font-medium">{title}</p>
          {lines.map((line) => (
            <p key={line} className="text-muted text-xs leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
