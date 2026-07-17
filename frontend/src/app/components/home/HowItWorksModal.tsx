import { useState } from "react";
import infoImg from "../../../assets/info.png";
import howItWorksImg from "../../../assets/how-it-works.png";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

interface HowItWorksModalProps {
  showOnFirstVisit?: boolean;
  triggerClassName?: string;
}

export function HowItWorksModal({
  showOnFirstVisit = false,
  triggerClassName,
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          isClose={false}
          className="max-w-[90vw] w-[90vw] !p-0 overflow-hidden !bg-transparent !border-none !shadow-none z-[100]"
          onOpenAutoFocus={(e) => {
            // Let Tab land on the skip link first (WCAG 2.4.1) before trapping into this modal.
            if (showOnFirstVisit) e.preventDefault();
          }}
        >
          <DialogTitle className="sr-only">How It Works</DialogTitle>
          <DialogDescription className="sr-only">
            Visual guide explaining the student hotel bidding process.
          </DialogDescription>
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
