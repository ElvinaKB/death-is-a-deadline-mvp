import { useState } from "react";
import howItWorksImg from "../../../assets/how-it-works.png";
import { Dialog, DialogContent } from "../ui/dialog";

interface HowItWorksModalProps {
  triggerClassName?: string;
}

export function HowItWorksModal({ triggerClassName }: HowItWorksModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "text-sm font-medium text-muted hover:text-fg transition-colors"
        }
      >
        How It Works?
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          isClose={false}
          className="max-w-[90vw] w-[90vw] !p-0 overflow-hidden !bg-transparent !border-none !shadow-none z-[100]"
        >
          <div className="w-full">
            <img
              src={howItWorksImg}
              alt="How It Works - The Grim Keeper explains the bidding process"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
