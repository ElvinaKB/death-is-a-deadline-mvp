import { useState } from "react";
import infoImg from "../../../assets/info.png";
import { Dialog, DialogContent } from "../ui/dialog";

export function HowItWorksModal() {
  const [open, onOpenChange] = useState(false);

  return (
    <>
      <div className="flex items-end justify-end p-2 bg-bg border-b border-line">
        <button
          onClick={() => onOpenChange(true)}
          className="text-sm font-medium text-muted hover:text-fg transition-colors"
        >
          How It Works?
        </button>
      </div>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          isClose={false}
          className="max-w-[90vw] w-[90vw] !p-0 overflow-hidden !bg-transparent !border-none !shadow-none z-[100]"
        >
          <div className="w-full">
            <img
              src={infoImg}
              alt="How It Works - The Grim Keeper explains the bidding process"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
