import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface MandatoryFeesFieldsProps {
  hasResortFee: boolean;
  onHasResortFeeChange: (checked: boolean) => void;
  resortFeeAmount: number;
  onResortFeeAmountChange: (value: number) => void;
  hasMandatoryParking: boolean;
  onHasMandatoryParkingChange: (checked: boolean) => void;
  parkingFeeAmount: number;
  onParkingFeeAmountChange: (value: number) => void;
  compact?: boolean;
}

export function MandatoryFeesFields({
  hasResortFee,
  onHasResortFeeChange,
  resortFeeAmount,
  onResortFeeAmountChange,
  hasMandatoryParking,
  onHasMandatoryParkingChange,
  parkingFeeAmount,
  onParkingFeeAmountChange,
  compact = false,
}: MandatoryFeesFieldsProps) {
  const labelClass = compact ? "text-fg text-sm" : "text-fg";
  const helperClass = compact ? "text-xs text-muted mb-1.5" : "text-sm text-muted mb-1.5";

  return (
    <div className="space-y-4">
      <div>
        <p className={`font-medium ${labelClass}`}>Mandatory fees</p>
        <p className={helperClass}>
          Federal and California law require the total price shown to guests before
          checkout to include any fee that isn&apos;t optional &mdash; only government
          taxes and genuinely optional charges (ones a guest can decline) may be
          collected separately at check-in. See the{" "}
          <a
            href="https://www.ftc.gov/news-events/news/press-releases/2024/12/federal-trade-commission-announces-bipartisan-rule-banning-junk-ticket-hotel-fees"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-gold"
          >
            FTC Junk Fees Rule
          </a>{" "}
          (effective May 12, 2025, nationwide) and, for California properties,{" "}
          <a
            href="https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240SB478"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-gold"
          >
            SB 478
          </a>{" "}
          / AB 537. If this hotel charges a mandatory resort fee or requires
          parking, check the boxes below so it&apos;s folded into the price shown
          to travelers instead of tacked on at check-in.
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={hasResortFee}
            onCheckedChange={(checked) => onHasResortFeeChange(checked === true)}
            className="mt-0.5"
          />
          <span className={`${labelClass} leading-snug`}>
            This hotel charges a mandatory resort fee
          </span>
        </label>
        {hasResortFee && (
          <div>
            <Label htmlFor="mandatoryResortFeeAmount" className={labelClass}>
              Resort fee (per night) *
            </Label>
            <Input
              id="mandatoryResortFeeAmount"
              type="number"
              value={resortFeeAmount || ""}
              onChange={(e) => onResortFeeAmountChange(Number(e.target.value))}
              placeholder="0.00"
              min="0.01"
              step="0.01"
            />
            <p className={helperClass}>
              Added to the total price shown before checkout &mdash; not collected
              separately at check-in.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={hasMandatoryParking}
            onCheckedChange={(checked) =>
              onHasMandatoryParkingChange(checked === true)
            }
            className="mt-0.5"
          />
          <span className={`${labelClass} leading-snug`}>
            Parking at this property is mandatory (guests cannot decline it)
          </span>
        </label>
        {hasMandatoryParking && (
          <div>
            <Label htmlFor="mandatoryParkingFeeAmount" className={labelClass}>
              Mandatory parking fee (per night) *
            </Label>
            <Input
              id="mandatoryParkingFeeAmount"
              type="number"
              value={parkingFeeAmount || ""}
              onChange={(e) => onParkingFeeAmountChange(Number(e.target.value))}
              placeholder="0.00"
              min="0.01"
              step="0.01"
            />
            <p className={helperClass}>
              Added to the total price shown before checkout. If parking is
              optional (guests can decline it or self-park elsewhere), leave this
              unchecked &mdash; optional parking can still be offered and charged
              separately on-site.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
