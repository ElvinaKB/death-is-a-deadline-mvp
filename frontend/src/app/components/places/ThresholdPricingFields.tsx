import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const THRESHOLD_WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

export function buildUniformWeekdayMins(minimumBid: number): number[] {
  return Array.from({ length: 7 }, () => minimumBid);
}

interface ThresholdPricingFieldsProps {
  useSameThresholdForAllDays: boolean;
  onUseSameThresholdChange: (checked: boolean) => void;
  minimumBid: number;
  onMinimumBidChange: (value: number) => void;
  minimumBidByDayOfWeek: number[];
  onWeekdayMinimumChange: (dayIndex: number, value: number) => void;
  minimumBidError?: string;
  weekdayErrors?: (string | undefined)[];
  retailPrice?: number;
  compact?: boolean;
}

export function ThresholdPricingFields({
  useSameThresholdForAllDays,
  onUseSameThresholdChange,
  minimumBid,
  onMinimumBidChange,
  minimumBidByDayOfWeek,
  onWeekdayMinimumChange,
  minimumBidError,
  weekdayErrors,
  retailPrice,
  compact = false,
}: ThresholdPricingFieldsProps) {
  const labelClass = compact ? "text-fg text-sm" : "text-fg";
  const helperClass = compact ? "text-xs text-muted mb-1.5" : "text-sm text-muted mb-1.5";

  return (
    <div className="space-y-4">
      <div>
        <p className={`font-medium ${labelClass}`}>Pricing threshold</p>
        <p className={helperClass}>
          Bids below the threshold are automatically rejected. Multi-night stays
          must meet the total minimum across all nights.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={useSameThresholdForAllDays}
          onCheckedChange={(checked) =>
            onUseSameThresholdChange(checked === true)
          }
          className="mt-0.5"
        />
        <span className={`${labelClass} leading-snug`}>
          Use same threshold for all days
        </span>
      </label>

      {useSameThresholdForAllDays ? (
        <div>
          <Label htmlFor="minimumBid" className={labelClass}>
            Minimum bid (per night) *
          </Label>
          <p className={helperClass}>Most hotels use one minimum for all days.</p>
          <Input
            id="minimumBid"
            type="number"
            value={minimumBid || ""}
            onChange={(e) => onMinimumBidChange(Number(e.target.value))}
            placeholder="0.00"
            min="0"
            step="0.01"
            max={retailPrice ? retailPrice - 0.01 : undefined}
          />
          {minimumBidError && (
            <p className="text-xs text-error mt-1">{minimumBidError}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className={helperClass}>
            Set a minimum for each day of the week (Sun–Sat).
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {THRESHOLD_WEEKDAYS.map((day) => (
              <div key={day.value}>
                <Label
                  htmlFor={`threshold-day-${day.value}`}
                  className="text-xs text-muted"
                >
                  {day.label}
                </Label>
                <Input
                  id={`threshold-day-${day.value}`}
                  type="number"
                  value={minimumBidByDayOfWeek[day.value] ?? ""}
                  onChange={(e) =>
                    onWeekdayMinimumChange(day.value, Number(e.target.value))
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  max={retailPrice ? retailPrice - 0.01 : undefined}
                  className="mt-1"
                />
                {weekdayErrors?.[day.value] && (
                  <p className="text-xs text-error mt-1">
                    {weekdayErrors[day.value]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
