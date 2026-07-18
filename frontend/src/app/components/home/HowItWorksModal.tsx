import { useState } from "react";
import howItWorksImg from "../../../assets/how-it-works.png";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";

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
          isClose
          className="max-w-none w-screen h-screen !p-0 overflow-hidden !bg-black !border-none !shadow-none !rounded-none z-[100] flex items-center justify-center"
        >
          <DialogTitle className="sr-only">How It Works</DialogTitle>
          <DialogDescription className="sr-only">
            Visual guide explaining the student hotel bidding process.
          </DialogDescription>
          <img
            src={howItWorksImg}
            alt="How It Works - The Grim Keeper explains the bidding process"
            className="h-[85vh] w-auto max-w-[95vw] object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
