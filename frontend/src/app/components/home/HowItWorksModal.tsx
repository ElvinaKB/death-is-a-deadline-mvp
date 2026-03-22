import { useState } from "react";
import infoImg from "../../../assets/info.png";
import howItWorksImg from "../../../assets/how-it-works.png";
import { Dialog, DialogContent } from "../ui/dialog";

interface HowItWorksModalProps {
  showOnFirstVisit?: boolean;
}

export function HowItWorksModal({
  showOnFirstVisit = false,
}: HowItWorksModalProps) {
  const [open, setOpen] = useState(() => {
    if (showOnFirstVisit) {
      return localStorage.getItem("infoModalSeen") !== "true";
    }
    return false;
  });

  const onOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val && showOnFirstVisit) {
      localStorage.setItem("infoModalSeen", "true");
    }
  };
  const alreadySeen = localStorage.getItem("infoModalSeen") === "true";
  const image = alreadySeen ? howItWorksImg : infoImg;

  return (
    <>
      <div className="flex items-end justify-end p-2 bg-bg border-b border-line">
        <button
          onClick={() => setOpen(true)}
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
              src={image}
              alt="How It Works - The Grim Keeper explains the bidding process"
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
